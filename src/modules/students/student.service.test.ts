import { LoanStatus, PrismaClient } from "@prisma/client";
import { StudentService } from "./student.service";

const studentRepoMock = {
    findProfileByUserId: jest.fn(),
    listLoansByStudentId: jest.fn(),
    decrementOutstandingFee: jest.fn(),
    createFeePayment: jest.fn(),
    setStudentStatus: jest.fn(),
    listSuspendedStudents: jest.fn(),
    listActiveStudents: jest.fn(),
    countLongOverdueLoans: jest.fn(),
    countOverdueLoans: jest.fn()
};

const auditMock = {
    logMutation: jest.fn()
};

jest.mock("./student.repository", () => ({
    StudentRepository: jest.fn().mockImplementation(() => studentRepoMock)
}));

jest.mock("../audits/audit.service", () => ({
    AuditService: jest.fn().mockImplementation(() => auditMock)
}));

describe("StudentService", () => {
    let service: StudentService;
    let prisma: PrismaClient;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-05-10T08:00:00.000Z"));

        Object.values(studentRepoMock).forEach((fn) => fn.mockReset());
        auditMock.logMutation.mockReset();

        prisma = {
            $transaction: jest.fn().mockImplementation(async (cb) => cb({}))
        } as unknown as PrismaClient;

        service = new StudentService(prisma);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("SPEC-FR019: getMyLoans returns loans with computed late fees", async () => {
        studentRepoMock.findProfileByUserId.mockResolvedValue({ id: "stu-1" });
        studentRepoMock.listLoansByStudentId.mockResolvedValue([
            {
                id: "loan-active",
                status: LoanStatus.ACTIVE,
                dueAt: new Date("2026-05-09T00:00:00.000Z"),
                returnedAt: null,
                finalLateFeeVnd: null
            },
            {
                id: "loan-returned",
                status: LoanStatus.RETURNED,
                dueAt: new Date("2026-05-01T00:00:00.000Z"),
                returnedAt: new Date("2026-05-03T00:00:00.000Z"),
                finalLateFeeVnd: 10000
            }
        ]);

        const loans = await service.getMyLoans("user-1");

        expect(loans).toHaveLength(2);
        expect(loans[0]).toMatchObject({ id: "loan-active", currentLateFeeVnd: 5000 });
        expect(loans[1]).toMatchObject({ id: "loan-returned", currentLateFeeVnd: 10000 });
    });

    test("SPEC-FR020: getMyLoans rejects when student profile is missing", async () => {
        studentRepoMock.findProfileByUserId.mockResolvedValue(null);

        await expect(service.getMyLoans("user-404")).rejects.toMatchObject({
            statusCode: 401,
            errorCode: "UNAUTHORIZED"
        });
    });

    test("SPEC-CLAR-02: payFee records payment and auto-resumes when fees are zero and no overdue books", async () => {
        studentRepoMock.decrementOutstandingFee.mockResolvedValue({ id: "stu-1", totalOutstandingFeeVnd: 0 });
        studentRepoMock.createFeePayment.mockResolvedValue({ id: "pay-1", amountVnd: 500000 });
        studentRepoMock.countOverdueLoans.mockResolvedValue(0);

        const result = await service.payFee({
            studentId: "stu-1",
            amountVnd: 500000,
            note: "Full settlement",
            actorUserId: "lib-1"
        });

        expect(result).toEqual({ payment: { id: "pay-1", amountVnd: 500000 }, outstandingFeeVnd: 0 });
        expect(studentRepoMock.setStudentStatus).toHaveBeenCalledWith("stu-1", "ACTIVE");
        expect(auditMock.logMutation).toHaveBeenCalledWith(expect.objectContaining({ action: "PAY_FEE", actorUserId: "lib-1" }));
    });

    test("SPEC-CLAR-06: payFee does not auto-resume if overdue books still exist", async () => {
        studentRepoMock.decrementOutstandingFee.mockResolvedValue({ id: "stu-1", totalOutstandingFeeVnd: 0 });
        studentRepoMock.createFeePayment.mockResolvedValue({ id: "pay-2", amountVnd: 20000 });
        studentRepoMock.countOverdueLoans.mockResolvedValue(2);

        await service.payFee({
            studentId: "stu-1",
            amountVnd: 20000,
            actorUserId: "lib-1"
        });

        expect(studentRepoMock.setStudentStatus).not.toHaveBeenCalled();
    });

    test("SPEC-FR020: payFee returns not found when student does not exist", async () => {
        studentRepoMock.decrementOutstandingFee.mockResolvedValue(null);

        await expect(service.payFee({
            studentId: "missing",
            amountVnd: 10000,
            actorUserId: "lib-1"
        })).rejects.toMatchObject({
            statusCode: 404,
            errorCode: "CONFLICT"
        });
    });

    test("SPEC-CLAR-06: autoRecoverSuspendedStudents resumes only fully eligible students", async () => {
        studentRepoMock.listSuspendedStudents.mockResolvedValue([
            { id: "stu-ok", totalOutstandingFeeVnd: 0 },
            { id: "stu-fee", totalOutstandingFeeVnd: 1000 },
            { id: "stu-overdue", totalOutstandingFeeVnd: 0 }
        ]);

        studentRepoMock.countOverdueLoans
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(1);

        const recovered = await service.autoRecoverSuspendedStudents();

        expect(recovered).toBe(1);
        expect(studentRepoMock.setStudentStatus).toHaveBeenCalledTimes(1);
        expect(studentRepoMock.setStudentStatus).toHaveBeenCalledWith("stu-ok", "ACTIVE");
        expect(auditMock.logMutation).toHaveBeenCalledWith(expect.objectContaining({
            action: "AUTO_RECOVER",
            entityId: "stu-ok"
        }));
    });

    test("SPEC-CLAR-06: auto-suspend student when total fees exceed 500,000 VND", async () => {
        studentRepoMock.listActiveStudents.mockResolvedValue([
            { id: "stu-fee", totalOutstandingFeeVnd: 600000 }
        ]);
        studentRepoMock.countLongOverdueLoans.mockResolvedValue(0);

        const suspended = await service.autoSuspendAtRiskStudents();

        expect(suspended).toBe(1);
        expect(studentRepoMock.setStudentStatus).toHaveBeenCalledWith("stu-fee", "SUSPENDED");
        expect(auditMock.logMutation).toHaveBeenCalledWith(expect.objectContaining({
            action: "AUTO_SUSPEND",
            entityId: "stu-fee"
        }));
    });

    test("SPEC-CLAR-06: auto-suspend student with 2+ loans overdue more than 30 days", async () => {
        studentRepoMock.listActiveStudents.mockResolvedValue([
            { id: "stu-overdue", totalOutstandingFeeVnd: 0 }
        ]);
        studentRepoMock.countLongOverdueLoans.mockResolvedValue(2);

        const suspended = await service.autoSuspendAtRiskStudents();

        expect(suspended).toBe(1);
        expect(studentRepoMock.setStudentStatus).toHaveBeenCalledWith("stu-overdue", "SUSPENDED");
    });
});
