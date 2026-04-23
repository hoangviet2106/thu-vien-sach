import { LoanStatus, PrismaClient } from "@prisma/client";
import { AuditService } from "../audits/audit.service";
import { calculateLateFeeVnd } from "../../shared/utils/fee";

export class LoanOverdueJob {
    constructor(private readonly prisma: PrismaClient) { }

    async run(): Promise<{ updatedLoans: number }> {
        const overdueLoans = await this.prisma.loan.findMany({
            where: {
                deletedAt: null,
                returnedAt: null,
                dueAt: { lt: new Date() },
                status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] }
            }
        });

        let updatedLoans = 0;

        for (const loan of overdueLoans) {
            await this.prisma.$transaction(async (tx) => {
                const fee = calculateLateFeeVnd(loan.dueAt, new Date());
                await tx.loan.update({
                    where: { id: loan.id },
                    data: {
                        status: LoanStatus.OVERDUE,
                        finalLateFeeVnd: fee
                    }
                });

                const audit = new AuditService(tx);
                await audit.logMutation({
                    action: "UPDATE",
                    entityType: "Loan",
                    entityId: loan.id,
                    summary: { status: "OVERDUE", finalLateFeeVnd: fee }
                });
            });

            updatedLoans += 1;
        }

        return { updatedLoans };
    }
}
