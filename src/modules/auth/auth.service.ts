import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AuthRepository } from "./auth.repository";

export class AuthService {
    private readonly repo: AuthRepository;

    constructor(prisma: PrismaClient) {
        this.repo = new AuthRepository(prisma);
    }

    async login(email: string, password: string) {
        const user = await this.repo.findUserByEmail(email);
        if (!user) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, 401, "Invalid credentials");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, 401, "Invalid credentials");
        }

        const studentProfile = user.role === "STUDENT"
            ? await this.repo.findStudentProfileByUserId(user.id)
            : null;

        const token = jwt.sign(
            {
                sub: user.id,
                role: user.role,
                studentId: studentProfile?.id
            },
            env.JWT_PRIVATE_KEY,
            {
                algorithm: "RS256",
                expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"]
            }
        );

        return {
            access_token: token,
            token_type: "Bearer",
            expires_in: 900
        };
    }
}
