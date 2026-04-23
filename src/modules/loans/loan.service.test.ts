import { LoanStatus, PrismaClient } from "@prisma/client";
import { LoanService } from "./loan.service";

const loanRepoMock = {
    findStudentByUserId: jest.fn(),
    countStudentActiveLoans: jest.fn(),
    findBookById: jest.fn(),
    countBookActiveLoans: jest.fn(),
    createLoan: jest.fn(),
    findLoanById: jest.fn(),
    updateLoan: jest.fn(),
    incrementStudentOutstandingFee: jest.fn(),
    setStudentStatus: jest.fn(),
    findOverdueLoans: jest.fn()
};

const auditMock = {
    logMutation: jest.fn()
};

jest.mock("./loan.repository", () => ({
    LoanRepository: jest.fn().mockImplementation(() => loanRepoMock)
}));

jest.mock("../audits/audit.service", () => ({
    AuditService: jest.fn().mockImplementation(() => auditMock)
}));

describe("LoanService", () => {
    let service: LoanService;
    let prisma: PrismaClient;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-04-23T08:00:00.000Z"));

        Object.values(loanRepoMock).forEach((fn) => fn.mockReset());
        auditMock.logMutation.mockReset();

        prisma = {
            $transaction: jest.fn().mockImplementation(async (cb) => cb({}))
        } as unknown as PrismaClient;

        service = new LoanService(prisma);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("SPEC-FR003: student cannot borrow more than 5 books", async () => {
        loanRepoMock.findStudentByUserId.mockResolvedValue({ id: "stu-1", accountStatus: "ACTIVE" });
        loanRepoMock.countStudentActiveLoans.mockResolvedValue(5);

        await expect(service.borrowBook("user-1", "book-1")).rejects.toMatchObject({
            statusCode: 409,
            errorCode: "MAX_BORROW_LIMIT_REACHED"
        });
    });

    test("SPEC-FR002: borrow rejects when student profile does not exist", async () => {
        loanRepoMock.findStudentByUserId.mockResolvedValue(null);

        await expect(service.borrowBook("user-x", "book-1")).rejects.toMatchObject({
            statusCode: 401,
            errorCode: "UNAUTHORIZED"
        });
    });

    test("SPEC-CLAR-03: borrow rejects when student account is suspended", async () => {
        loanRepoMock.findStudentByUserId.mockResolvedValue({ id: "stu-1", accountStatus: "SUSPENDED" });

        await expect(service.borrowBook("user-1", "book-1")).rejects.toMatchObject({
            statusCode: 403,
            errorCode: "ACCOUNT_SUSPENDED"
        });
    });

    test("SPEC-FR004: borrow assigns due date exactly 14 days", async () => {
        loanRepoMock.findStudentByUserId.mockResolvedValue({ id: "stu-1", accountStatus: "ACTIVE" });
        loanRepoMock.countStudentActiveLoans.mockResolvedValue(1);
        loanRepoMock.findBookById.mockResolvedValue({ id: "book-1", totalCopies: 5 });
        loanRepoMock.countBookActiveLoans.mockResolvedValue(2);
        loanRepoMock.createLoan.mockResolvedValue({ id: "loan-1", status: LoanStatus.ACTIVE });

        await service.borrowBook("user-1", "book-1", "actor-1");

        expect(loanRepoMock.createLoan).toHaveBeenCalledTimes(1);
        const payload = loanRepoMock.createLoan.mock.calls[0][0];
        expect(payload.borrowedAt.toISOString()).toBe("2026-04-23T08:00:00.000Z");
        expect(payload.dueAt.toISOString()).toBe("2026-05-07T08:00:00.000Z");
        expect(auditMock.logMutation).toHaveBeenCalledWith(expect.objectContaining({ action: "BORROW", actorUserId: "actor-1" }));
    });

    test("SPEC-FR002: borrow is rejected when no copies are available", async () => {
        loanRepoMock.findStudentByUserId.mockResolvedValue({ id: "stu-1", accountStatus: "ACTIVE" });
        loanRepoMock.countStudentActiveLoans.mockResolvedValue(4);
        loanRepoMock.findBookById.mockResolvedValue({ id: "book-1", totalCopies: 2 });
        loanRepoMock.countBookActiveLoans.mockResolvedValue(2);

        await expect(service.borrowBook("user-1", "book-1")).rejects.toMatchObject({
            statusCode: 409,
            errorCode: "BOOK_NOT_AVAILABLE"
        });
    });

    test("SPEC-FR020: borrow rejects when book does not exist", async () => {
        loanRepoMock.findStudentByUserId.mockResolvedValue({ id: "stu-1", accountStatus: "ACTIVE" });
        loanRepoMock.countStudentActiveLoans.mockResolvedValue(1);
        loanRepoMock.findBookById.mockResolvedValue(null);

        await expect(service.borrowBook("user-1", "book-404")).rejects.toMatchObject({
            statusCode: 404,
            errorCode: "BOOK_NOT_FOUND"
        });
    });

    test("SPEC-CLAR-01: return calculates 5,000 VND per overdue day", async () => {
        loanRepoMock.findLoanById.mockResolvedValue({
            id: "loan-1",
            studentId: "stu-1",
            status: LoanStatus.ACTIVE,
            dueAt: new Date("2026-04-22T00:00:00.000Z")
        });
        loanRepoMock.updateLoan.mockResolvedValue({ id: "loan-1", status: LoanStatus.RETURNED, finalLateFeeVnd: 5000 });
        loanRepoMock.incrementStudentOutstandingFee.mockResolvedValue({ id: "stu-1", totalOutstandingFeeVnd: 15000 });

        const result = await service.returnBook("loan-1", "actor-1");

        expect(result).toMatchObject({ id: "loan-1", status: LoanStatus.RETURNED, finalLateFeeVnd: 5000 });
        expect(loanRepoMock.incrementStudentOutstandingFee).toHaveBeenCalledWith("stu-1", 5000);
        expect(auditMock.logMutation).toHaveBeenCalledWith(expect.objectContaining({ action: "RETURN", actorUserId: "actor-1" }));
    });

    test("SPEC-FR008: return caps late fee at 500,000 VND", async () => {
        loanRepoMock.findLoanById.mockResolvedValue({
            id: "loan-1",
            studentId: "stu-1",
            status: LoanStatus.ACTIVE,
            dueAt: new Date("2026-01-01T00:00:00.000Z")
        });
        loanRepoMock.updateLoan.mockResolvedValue({ id: "loan-1", status: LoanStatus.RETURNED, finalLateFeeVnd: 500000 });
        loanRepoMock.incrementStudentOutstandingFee.mockResolvedValue({ id: "stu-1", totalOutstandingFeeVnd: 600000 });

        await service.returnBook("loan-1", "actor-1");

        expect(loanRepoMock.incrementStudentOutstandingFee).toHaveBeenCalledWith("stu-1", 500000);
        expect(loanRepoMock.setStudentStatus).toHaveBeenCalledWith("stu-1", "SUSPENDED");
    });

    test("SPEC-FR005: return rejects missing loan", async () => {
        loanRepoMock.findLoanById.mockResolvedValue(null);

        await expect(service.returnBook("loan-missing", "actor-1")).rejects.toMatchObject({
            statusCode: 404,
            errorCode: "LOAN_NOT_FOUND"
        });
    });

    test("SPEC-CLAR-09: return rejects already processed loan", async () => {
        loanRepoMock.findLoanById.mockResolvedValue({
            id: "loan-1",
            studentId: "stu-1",
            status: LoanStatus.RETURNED,
            dueAt: new Date("2026-04-22T00:00:00.000Z")
        });

        await expect(service.returnBook("loan-1", "actor-1")).rejects.toMatchObject({
            statusCode: 409,
            errorCode: "CONFLICT"
        });
    });

    test("SPEC-CLAR-03: renewal allowed once and extends due date by 14 days", async () => {
        loanRepoMock.findLoanById.mockResolvedValue({
            id: "loan-1",
            studentId: "stu-1",
            bookId: "book-1",
            status: LoanStatus.ACTIVE,
            renewalCount: 0,
            dueAt: new Date("2026-04-30T08:00:00.000Z")
        });
        loanRepoMock.updateLoan.mockResolvedValue({});
        loanRepoMock.createLoan.mockResolvedValue({ id: "loan-2", status: LoanStatus.ACTIVE });

        const renewed = await service.renewLoan("loan-1", "actor-1");

        expect(renewed).toMatchObject({ id: "loan-2", status: LoanStatus.ACTIVE });
        expect(loanRepoMock.updateLoan).toHaveBeenCalledWith("loan-1", { status: LoanStatus.RENEWED });
        expect(loanRepoMock.createLoan).toHaveBeenCalledWith(expect.objectContaining({
            studentId: "stu-1",
            bookId: "book-1",
            renewalCount: 1,
            renewedFromLoanId: "loan-1",
            dueAt: new Date("2026-05-14T08:00:00.000Z")
        }));
        expect(auditMock.logMutation).toHaveBeenCalledWith(expect.objectContaining({ action: "RENEW" }));
    });

    test("SPEC-CLAR-03: renewal is rejected after one renewal", async () => {
        loanRepoMock.findLoanById.mockResolvedValue({
            id: "loan-1",
            status: LoanStatus.ACTIVE,
            renewalCount: 1,
            dueAt: new Date("2026-04-30T08:00:00.000Z")
        });

        await expect(service.renewLoan("loan-1", "actor-1")).rejects.toMatchObject({
            statusCode: 409,
            errorCode: "CONFLICT"
        });
    });

    test("SPEC-CLAR-03: renewal is rejected for overdue loan", async () => {
        loanRepoMock.findLoanById.mockResolvedValue({
            id: "loan-1",
            status: LoanStatus.ACTIVE,
            renewalCount: 0,
            dueAt: new Date("2026-04-20T08:00:00.000Z")
        });

        await expect(service.renewLoan("loan-1", "actor-1")).rejects.toMatchObject({
            statusCode: 409,
            errorCode: "CONFLICT"
        });
    });

    test("SPEC-FR018: listOverdue returns current late fees for each overdue loan", async () => {
        loanRepoMock.findOverdueLoans.mockResolvedValue([
            {
                id: "loan-1",
                dueAt: new Date("2026-04-22T00:00:00.000Z"),
                status: LoanStatus.OVERDUE
            }
        ]);

        const overdue = await service.listOverdue();

        expect(overdue).toHaveLength(1);
        expect(overdue[0]).toMatchObject({ id: "loan-1", currentLateFeeVnd: 5000 });
    });

    test("SPEC-CLAR-09: concurrent return first wins and second returns 409", async () => {
        let currentStatus: LoanStatus = LoanStatus.ACTIVE;

        loanRepoMock.findLoanById.mockImplementation(async () => ({
            id: "loan-1",
            studentId: "stu-1",
            status: currentStatus,
            dueAt: new Date("2026-04-23T00:00:00.000Z")
        }));

        loanRepoMock.updateLoan.mockImplementation(async () => {
            currentStatus = LoanStatus.RETURNED;
            return { id: "loan-1", status: LoanStatus.RETURNED, finalLateFeeVnd: 0 };
        });

        const first = await service.returnBook("loan-1", "actor-1");
        expect(first).toMatchObject({ status: LoanStatus.RETURNED });

        await expect(service.returnBook("loan-1", "actor-2")).rejects.toMatchObject({
            statusCode: 409,
            errorCode: "CONFLICT"
        });
    });
});
