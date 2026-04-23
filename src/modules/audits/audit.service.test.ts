import { PrismaClient } from "@prisma/client";
import { AuditService } from "./audit.service";

const auditRepoMock = {
    create: jest.fn()
};

jest.mock("./audit.repository", () => ({
    AuditRepository: jest.fn().mockImplementation(() => auditRepoMock)
}));

describe("AuditService", () => {
    let service: AuditService;

    beforeEach(() => {
        auditRepoMock.create.mockReset();
        service = new AuditService({} as PrismaClient);
    });

    test("SPEC-CLAR-07: logMutation persists action and entity metadata", async () => {
        auditRepoMock.create.mockResolvedValue({ id: "audit-1" });

        await service.logMutation({
            actorUserId: "user-1",
            action: "UPDATE",
            entityType: "Book",
            entityId: "book-1",
            summary: { title: "New" },
            ipAddress: "127.0.0.1"
        });

        expect(auditRepoMock.create).toHaveBeenCalledWith({
            actorUserId: "user-1",
            action: "UPDATE",
            entityType: "Book",
            entityId: "book-1",
            changeSummary: { title: "New" },
            ipAddress: "127.0.0.1"
        });
    });

    test("SPEC-CLAR-07: logMutation defaults nullable fields to null", async () => {
        auditRepoMock.create.mockResolvedValue({ id: "audit-2" });

        await service.logMutation({
            action: "RETURN",
            entityType: "Loan",
            entityId: "loan-1",
            summary: { lateFeeVnd: 0 }
        });

        expect(auditRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({
            actorUserId: null,
            ipAddress: null,
            action: "RETURN",
            entityType: "Loan",
            entityId: "loan-1"
        }));
    });
});
