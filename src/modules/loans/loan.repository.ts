import { LoanStatus, Prisma, PrismaClient } from "@prisma/client";

export class LoanRepository {
    constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) { }

    async findStudentByUserId(userId: string) {
        return this.prisma.studentProfile.findFirst({
            where: { userId, deletedAt: null },
            include: { user: true }
        });
    }

    async findBookById(bookId: string) {
        return this.prisma.book.findFirst({ where: { id: bookId, deletedAt: null } });
    }

    async countStudentActiveLoans(studentId: string) {
        return this.prisma.loan.count({
            where: {
                studentId,
                deletedAt: null,
                status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] }
            }
        });
    }

    async countBookActiveLoans(bookId: string) {
        return this.prisma.loan.count({
            where: {
                bookId,
                deletedAt: null,
                status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] }
            }
        });
    }

    async createLoan(data: {
        studentId: string;
        bookId: string;
        borrowedAt: Date;
        dueAt: Date;
        renewalCount?: number;
        renewedFromLoanId?: string;
    }) {
        return this.prisma.loan.create({
            data: {
                studentId: data.studentId,
                bookId: data.bookId,
                borrowedAt: data.borrowedAt,
                dueAt: data.dueAt,
                renewalCount: data.renewalCount ?? 0,
                renewedFromLoanId: data.renewedFromLoanId,
                status: LoanStatus.ACTIVE
            }
        });
    }

    async findLoanById(loanId: string) {
        return this.prisma.loan.findFirst({
            where: { id: loanId, deletedAt: null },
            include: { student: true, book: true }
        });
    }

    async updateLoan(loanId: string, data: Prisma.LoanUpdateInput) {
        return this.prisma.loan.update({ where: { id: loanId }, data });
    }

    async incrementStudentOutstandingFee(studentId: string, amount: number) {
        return this.prisma.studentProfile.update({
            where: { id: studentId },
            data: {
                totalOutstandingFeeVnd: {
                    increment: amount
                }
            }
        });
    }

    async setStudentStatus(studentId: string, status: "ACTIVE" | "SUSPENDED" | "INACTIVE") {
        return this.prisma.studentProfile.update({ where: { id: studentId }, data: { accountStatus: status } });
    }

    async findOverdueLoans() {
        return this.prisma.loan.findMany({
            where: {
                deletedAt: null,
                returnedAt: null,
                dueAt: { lt: new Date() },
                status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] }
            },
            include: { student: true, book: true }
        });
    }
}
