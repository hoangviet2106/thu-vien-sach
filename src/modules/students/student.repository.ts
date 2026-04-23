import { LoanStatus, Prisma, PrismaClient } from "@prisma/client";

export class StudentRepository {
    constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) { }

    async findProfileByUserId(userId: string) {
        return this.prisma.studentProfile.findFirst({ where: { userId, deletedAt: null } });
    }

    async listLoansByStudentId(studentId: string) {
        return this.prisma.loan.findMany({
            where: { studentId, deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: { book: true }
        });
    }

    async decrementOutstandingFee(studentId: string, amountVnd: number) {
        const profile = await this.prisma.studentProfile.findUnique({ where: { id: studentId } });
        if (!profile) {
            return null;
        }

        const nextValue = Math.max(0, profile.totalOutstandingFeeVnd - amountVnd);
        return this.prisma.studentProfile.update({
            where: { id: studentId },
            data: { totalOutstandingFeeVnd: nextValue }
        });
    }

    async createFeePayment(data: {
        studentId: string;
        recordedByUserId: string;
        amountVnd: number;
        note?: string;
    }) {
        return this.prisma.feePayment.create({ data });
    }

    async setStudentStatus(studentId: string, status: "ACTIVE" | "SUSPENDED" | "INACTIVE") {
        return this.prisma.studentProfile.update({ where: { id: studentId }, data: { accountStatus: status } });
    }

    async listSuspendedStudents() {
        return this.prisma.studentProfile.findMany({ where: { accountStatus: "SUSPENDED", deletedAt: null } });
    }

    async listActiveStudents() {
        return this.prisma.studentProfile.findMany({ where: { accountStatus: "ACTIVE", deletedAt: null } });
    }

    async countLongOverdueLoans(studentId: string, days: number) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return this.prisma.loan.count({
            where: {
                studentId,
                deletedAt: null,
                returnedAt: null,
                dueAt: { lt: cutoff },
                status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] }
            }
        });
    }

    async countOverdueLoans(studentId: string) {
        return this.prisma.loan.count({
            where: {
                studentId,
                deletedAt: null,
                returnedAt: null,
                dueAt: { lt: new Date() },
                status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] }
            }
        });
    }
}
