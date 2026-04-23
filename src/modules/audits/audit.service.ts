import { Prisma, PrismaClient } from "@prisma/client";
import { AuditRepository } from "./audit.repository";

export class AuditService {
    constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) { }

    async logMutation(input: {
        actorUserId?: string | null;
        action: string;
        entityType: string;
        entityId: string;
        summary: Prisma.InputJsonValue;
        ipAddress?: string | null;
    }): Promise<void> {
        const repo = new AuditRepository(this.prisma);
        await repo.create({
            actorUserId: input.actorUserId ?? null,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId,
            changeSummary: input.summary,
            ipAddress: input.ipAddress ?? null
        });
    }
}
