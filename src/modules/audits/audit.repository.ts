import { Prisma, PrismaClient } from "@prisma/client";

export class AuditRepository {
    constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) { }

    async create(entry: {
        actorUserId?: string | null;
        action: string;
        entityType: string;
        entityId: string;
        changeSummary: Prisma.InputJsonValue;
        ipAddress?: string | null;
    }) {
        return this.prisma.auditLog.create({
            data: {
                actorUserId: entry.actorUserId ?? null,
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId,
                changeSummary: entry.changeSummary,
                ipAddress: entry.ipAddress ?? null
            }
        });
    }
}
