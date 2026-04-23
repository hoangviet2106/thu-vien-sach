import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "./auth.service";

const authRepoMock = {
    findUserByEmail: jest.fn(),
    findStudentProfileByUserId: jest.fn()
};

jest.mock("./auth.repository", () => ({
    AuthRepository: jest.fn().mockImplementation(() => authRepoMock)
}));

jest.mock("bcrypt", () => ({
    __esModule: true,
    default: {
        compare: jest.fn()
    }
}));

jest.mock("jsonwebtoken", () => ({
    __esModule: true,
    default: {
        sign: jest.fn(),
        verify: jest.fn()
    }
}));

describe("AuthService", () => {
    let service: AuthService;
    const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;
    const jwtMock = jwt as jest.Mocked<typeof jwt>;

    beforeEach(() => {
        authRepoMock.findUserByEmail.mockReset();
        authRepoMock.findStudentProfileByUserId.mockReset();
        bcryptMock.compare.mockReset();
        jwtMock.sign.mockReset();
        jwtMock.verify.mockReset();

        service = new AuthService({} as PrismaClient);
    });

    test("SPEC-FR020: login rejects unknown email", async () => {
        authRepoMock.findUserByEmail.mockResolvedValue(null);

        await expect(service.login("missing@example.edu", "pw")).rejects.toMatchObject({
            statusCode: 401,
            errorCode: "UNAUTHORIZED"
        });
    });

    test("SPEC-FR020: login rejects invalid password", async () => {
        authRepoMock.findUserByEmail.mockResolvedValue({
            id: "user-1",
            role: "STUDENT",
            passwordHash: "hash"
        });
        bcryptMock.compare.mockResolvedValue(false as never);

        await expect(service.login("student@example.edu", "wrong")).rejects.toMatchObject({
            statusCode: 401,
            errorCode: "UNAUTHORIZED"
        });
    });

    test("SPEC-FR002: login generates RS256 JWT for student including studentId", async () => {
        authRepoMock.findUserByEmail.mockResolvedValue({
            id: "user-1",
            role: "STUDENT",
            passwordHash: "hash"
        });
        bcryptMock.compare.mockResolvedValue(true as never);
        authRepoMock.findStudentProfileByUserId.mockResolvedValue({ id: "stu-1" });
        jwtMock.sign.mockReturnValue("signed-token" as never);

        const response = await service.login("student@example.edu", "correct");

        expect(jwtMock.sign).toHaveBeenCalledWith(
            expect.objectContaining({ sub: "user-1", role: "STUDENT", studentId: "stu-1" }),
            expect.any(String),
            expect.objectContaining({ algorithm: "RS256", expiresIn: expect.any(String) })
        );
        expect(response).toEqual({
            access_token: "signed-token",
            token_type: "Bearer",
            expires_in: 900
        });
    });

    test("SPEC-FR002: login token payload for non-student role omits studentId", async () => {
        authRepoMock.findUserByEmail.mockResolvedValue({
            id: "admin-1",
            role: "ADMIN",
            passwordHash: "hash"
        });
        bcryptMock.compare.mockResolvedValue(true as never);
        jwtMock.sign.mockReturnValue("admin-token" as never);

        await service.login("admin@example.edu", "correct");

        expect(authRepoMock.findStudentProfileByUserId).not.toHaveBeenCalled();
        expect(jwtMock.sign).toHaveBeenCalledWith(
            expect.objectContaining({ sub: "admin-1", role: "ADMIN", studentId: undefined }),
            expect.any(String),
            expect.objectContaining({ algorithm: "RS256" })
        );
    });

    test("SPEC-FR019: generated access token value can be passed to verifier", async () => {
        authRepoMock.findUserByEmail.mockResolvedValue({
            id: "user-verify",
            role: "STUDENT",
            passwordHash: "hash"
        });
        bcryptMock.compare.mockResolvedValue(true as never);
        authRepoMock.findStudentProfileByUserId.mockResolvedValue({ id: "stu-verify" });
        jwtMock.sign.mockReturnValue("token-for-verify" as never);
        jwtMock.verify.mockReturnValue({ sub: "user-verify" } as never);

        const response = await service.login("verify@example.edu", "correct");
        const decoded = jwtMock.verify(response.access_token, "public-key");

        expect(response.access_token).toBe("token-for-verify");
        expect(decoded).toMatchObject({ sub: "user-verify" });
        expect(jwtMock.verify).toHaveBeenCalledWith("token-for-verify", "public-key");
    });
});
