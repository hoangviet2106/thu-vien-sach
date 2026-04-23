import { LoanStatus, PrismaClient } from "@prisma/client";
import { AuditService } from "../audits/audit.service";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { calculateLateFeeVnd } from "../../shared/utils/fee";
import { LoanRepository } from "./loan.repository";

const MAX_ACTIVE_LOANS = 5;
const DAYS_14_MS = 14 * 24 * 60 * 60 * 1000;

export class LoanService {
    constructor(private readonly prisma: PrismaClient) { }

    async borrowBook(userId: string, bookId: string, actorUserId?: string) {
        return this.prisma.$transaction(async (tx) => {
            const repo = new LoanRepository(tx);
            const audit = new AuditService(tx);

            const student = await repo.findStudentByUserId(userId);
            if (!student) {
                throw new AppError(ERROR_CODES.UNAUTHORIZED, 401, "Student profile not found");
            }
            if (student.accountStatus !== "ACTIVE") {
                throw new AppError(ERROR_CODES.ACCOUNT_SUSPENDED, 403, "Student account is not active");
            }

            const activeLoans = await repo.countStudentActiveLoans(student.id);
            if (activeLoans >= MAX_ACTIVE_LOANS) {
                throw new AppError(ERROR_CODES.MAX_BORROW_LIMIT_REACHED, 409, "Maximum 5 active loans reached");
            }

            const book = await repo.findBookById(bookId);
            if (!book) {
                throw new AppError(ERROR_CODES.BOOK_NOT_FOUND, 404, "Book not found");
            }

            const bookActiveLoans = await repo.countBookActiveLoans(bookId);
            if (book.totalCopies - bookActiveLoans <= 0) {
                throw new AppError(ERROR_CODES.BOOK_NOT_AVAILABLE, 409, "Book has no available copies");
            }

            const borrowedAt = new Date();
            const dueAt = new Date(borrowedAt.getTime() + DAYS_14_MS);
            const loan = await repo.createLoan({
                studentId: student.id,
                bookId,
                borrowedAt,
                dueAt
            });

            await audit.logMutation({
                actorUserId: actorUserId ?? userId,
                action: "BORROW",
                entityType: "Loan",
                entityId: loan.id,
                summary: { studentId: student.id, bookId, dueAt: dueAt.toISOString() }
            });

            return loan;
        });
    }

    async returnBook(loanId: string, actorUserId: string) {
        return this.prisma.$transaction(async (tx) => {
            const repo = new LoanRepository(tx);
            const audit = new AuditService(tx);

            const loan = await repo.findLoanById(loanId);
            if (!loan) {
                throw new AppError(ERROR_CODES.LOAN_NOT_FOUND, 404, "Loan not found");
            }

            if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.OVERDUE) {
                throw new AppError(ERROR_CODES.CONFLICT, 409, "Loan already processed");
            }

            const returnedAt = new Date();
            const lateFee = calculateLateFeeVnd(loan.dueAt, returnedAt);

            const updated = await repo.updateLoan(loan.id, {
                returnedAt,
                finalLateFeeVnd: lateFee,
                status: LoanStatus.RETURNED
            });

            if (lateFee > 0) {
                const student = await repo.incrementStudentOutstandingFee(loan.studentId, lateFee);
                if (student.totalOutstandingFeeVnd > 500000) {
                    await repo.setStudentStatus(student.id, "SUSPENDED");
                }
            }

            await audit.logMutation({
                actorUserId,
                action: "RETURN",
                entityType: "Loan",
                entityId: loan.id,
                summary: { lateFeeVnd: lateFee, returnedAt: returnedAt.toISOString() }
            });

            return updated;
        });
    }

    async renewLoan(loanId: string, actorUserId: string) {
        return this.prisma.$transaction(async (tx) => {
            const repo = new LoanRepository(tx);
            const audit = new AuditService(tx);

            const loan = await repo.findLoanById(loanId);
            if (!loan) {
                throw new AppError(ERROR_CODES.LOAN_NOT_FOUND, 404, "Loan not found");
            }
            if (loan.status !== LoanStatus.ACTIVE) {
                throw new AppError(ERROR_CODES.CONFLICT, 409, "Only active loans can be renewed");
            }
            if (loan.renewalCount >= 1) {
                throw new AppError(ERROR_CODES.CONFLICT, 409, "Loan renewal limit reached");
            }
            if (loan.dueAt < new Date()) {
                throw new AppError(ERROR_CODES.CONFLICT, 409, "Overdue loans cannot be renewed");
            }

            await repo.updateLoan(loan.id, {
                status: LoanStatus.RENEWED
            });

            const renewedDueAt = new Date(loan.dueAt.getTime() + DAYS_14_MS);
            const renewed = await repo.createLoan({
                studentId: loan.studentId,
                bookId: loan.bookId,
                borrowedAt: new Date(),
                dueAt: renewedDueAt,
                renewalCount: 1,
                renewedFromLoanId: loan.id
            });

            await audit.logMutation({
                actorUserId,
                action: "RENEW",
                entityType: "Loan",
                entityId: renewed.id,
                summary: { originalLoanId: loan.id, dueAt: renewedDueAt.toISOString() }
            });

            return renewed;
        });
    }

    async listOverdue() {
        const repo = new LoanRepository(this.prisma);
        const loans = await repo.findOverdueLoans();
        return loans.map((loan) => {
            const fee = calculateLateFeeVnd(loan.dueAt, new Date());
            return {
                ...loan,
                currentLateFeeVnd: fee
            };
        });
    }
}
