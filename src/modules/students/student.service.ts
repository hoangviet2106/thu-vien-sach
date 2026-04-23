import { PrismaClient } from "@prisma/client";
import { AuditService } from "../audits/audit.service";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { calculateLateFeeVnd } from "../../shared/utils/fee";
import { StudentRepository } from "./student.repository";

export class StudentService {
    constructor(private readonly prisma: PrismaClient) { }

    async autoSuspendAtRiskStudents(): Promise<number> {
        return this.prisma.$transaction(async (tx) => {
            const repo = new StudentRepository(tx);
            const audit = new AuditService(tx);
            const students = await repo.listActiveStudents();
            let suspended = 0;

            for (const student of students) {
                const longOverdueCount = await repo.countLongOverdueLoans(student.id, 30);
                if (student.totalOutstandingFeeVnd > 500000 || longOverdueCount >= 2) {
                    await repo.setStudentStatus(student.id, "SUSPENDED");
                    await audit.logMutation({
                        action: "AUTO_SUSPEND",
                        entityType: "StudentProfile",
                        entityId: student.id,
                        summary: {
                            accountStatus: "SUSPENDED",
                            reason: student.totalOutstandingFeeVnd > 500000 ? "FEE_OVER_500K" : "LONG_OVERDUE_2_PLUS"
                        }
                    });
                    suspended += 1;
                }
            }

            return suspended;
        });
    }

    async getMyLoans(userId: string) {
        const repo = new StudentRepository(this.prisma);
        const student = await repo.findProfileByUserId(userId);
        if (!student) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, 401, "Student profile not found");
        }

        const loans = await repo.listLoansByStudentId(student.id);
        return loans.map((loan) => ({
            ...loan,
            currentLateFeeVnd: loan.returnedAt ? loan.finalLateFeeVnd : calculateLateFeeVnd(loan.dueAt, new Date())
        }));
    }

    async payFee(input: { studentId: string; amountVnd: number; note?: string; actorUserId: string }) {
        return this.prisma.$transaction(async (tx) => {
            const repo = new StudentRepository(tx);
            const audit = new AuditService(tx);

            const updated = await repo.decrementOutstandingFee(input.studentId, input.amountVnd);
            if (!updated) {
                throw new AppError(ERROR_CODES.CONFLICT, 404, "Student not found");
            }

            const payment = await repo.createFeePayment({
                studentId: input.studentId,
                recordedByUserId: input.actorUserId,
                amountVnd: input.amountVnd,
                note: input.note
            });

            if (updated.totalOutstandingFeeVnd === 0) {
                const overdue = await repo.countOverdueLoans(input.studentId);
                if (overdue === 0) {
                    await repo.setStudentStatus(input.studentId, "ACTIVE");
                }
            }

            await audit.logMutation({
                actorUserId: input.actorUserId,
                action: "PAY_FEE",
                entityType: "StudentProfile",
                entityId: input.studentId,
                summary: { amountVnd: input.amountVnd, note: input.note ?? null }
            });

            return { payment, outstandingFeeVnd: updated.totalOutstandingFeeVnd };
        });
    }

    async autoRecoverSuspendedStudents(): Promise<number> {
        return this.prisma.$transaction(async (tx) => {
            const repo = new StudentRepository(tx);
            const audit = new AuditService(tx);
            const students = await repo.listSuspendedStudents();
            let recovered = 0;

            for (const student of students) {
                const overdueCount = await repo.countOverdueLoans(student.id);
                if (student.totalOutstandingFeeVnd === 0 && overdueCount === 0) {
                    await repo.setStudentStatus(student.id, "ACTIVE");
                    await audit.logMutation({
                        action: "AUTO_RECOVER",
                        entityType: "StudentProfile",
                        entityId: student.id,
                        summary: { accountStatus: "ACTIVE" }
                    });
                    recovered += 1;
                }
            }

            return recovered;
        });
    }
}
