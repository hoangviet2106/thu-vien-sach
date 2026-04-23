import { PrismaClient } from "@prisma/client";
import { BookService } from "./book.service";

const bookRepoMock = {
    findByIsbn: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    countActiveLoans: jest.fn(),
    search: jest.fn()
};

const auditMock = {
    logMutation: jest.fn()
};

jest.mock("./book.repository", () => ({
    BookRepository: jest.fn().mockImplementation(() => bookRepoMock)
}));

jest.mock("../audits/audit.service", () => ({
    AuditService: jest.fn().mockImplementation(() => auditMock)
}));

describe("BookService", () => {
    let service: BookService;

    beforeEach(() => {
        Object.values(bookRepoMock).forEach((fn) => fn.mockReset());
        auditMock.logMutation.mockReset();
        service = new BookService({} as PrismaClient);
    });

    test("SPEC-FR010: create rejects ISBN that is not 13 digits", async () => {
        await expect(service.create({
            isbn: "978-0-13-110362-X",
            title: "Clean Code",
            author: "Robert C. Martin",
            totalCopies: 5
        })).rejects.toMatchObject({
            statusCode: 400,
            errorCode: "VALIDATION_ERROR"
        });
    });

    test("SPEC-FR010: create normalizes ISBN and returns available copies", async () => {
        bookRepoMock.findByIsbn.mockResolvedValue(null);
        bookRepoMock.create.mockResolvedValue({
            id: "book-1",
            isbn: "9780131103627",
            title: "The C Programming Language",
            author: "Kernighan",
            totalCopies: 5
        });

        const created = await service.create({
            isbn: "978-0-13-110362-7",
            title: "The C Programming Language",
            author: "Kernighan",
            totalCopies: 5,
            actorUserId: "lib-1"
        });

        expect(bookRepoMock.findByIsbn).toHaveBeenCalledWith("9780131103627");
        expect(bookRepoMock.create).toHaveBeenCalledWith(expect.objectContaining({ isbn: "9780131103627" }));
        expect(created).toMatchObject({ availableCopies: 5 });
        expect(auditMock.logMutation).toHaveBeenCalledWith(expect.objectContaining({ action: "CREATE", actorUserId: "lib-1" }));
    });

    test("SPEC-FR010: create rejects duplicate ISBN", async () => {
        bookRepoMock.findByIsbn.mockResolvedValue({ id: "existing-book" });

        await expect(service.create({
            isbn: "9780131103627",
            title: "Duplicate",
            author: "Author",
            totalCopies: 1
        })).rejects.toMatchObject({
            statusCode: 409,
            errorCode: "DUPLICATE_ISBN"
        });
    });

    test("SPEC-FR011: update rejects totalCopies lower than active loans", async () => {
        bookRepoMock.findById.mockResolvedValue({ id: "book-1" });
        bookRepoMock.countActiveLoans.mockResolvedValue(3);

        await expect(service.update("book-1", { totalCopies: 2 }, "lib-1")).rejects.toMatchObject({
            statusCode: 409,
            errorCode: "CONFLICT"
        });
    });

    test("SPEC-FR011: update rejects when book is not found", async () => {
        bookRepoMock.findById.mockResolvedValue(null);

        await expect(service.update("book-missing", { title: "Nope" }, "lib-1")).rejects.toMatchObject({
            statusCode: 404,
            errorCode: "BOOK_NOT_FOUND"
        });
    });

    test("SPEC-FR011: update recalculates available copies from aggregate active loans", async () => {
        bookRepoMock.findById.mockResolvedValue({ id: "book-1" });
        bookRepoMock.countActiveLoans.mockResolvedValueOnce(2).mockResolvedValueOnce(2);
        bookRepoMock.update.mockResolvedValue({
            id: "book-1",
            title: "Updated",
            author: "Author",
            totalCopies: 5
        });

        const updated = await service.update("book-1", { title: "Updated", totalCopies: 5 }, "lib-1");

        expect(updated).toMatchObject({
            id: "book-1",
            totalCopies: 5,
            availableCopies: 3
        });
        expect(auditMock.logMutation).toHaveBeenCalledWith(expect.objectContaining({ action: "UPDATE" }));
    });

    test("SPEC-FR012: remove rejects when book has active loans", async () => {
        bookRepoMock.findById.mockResolvedValue({ id: "book-1" });
        bookRepoMock.countActiveLoans.mockResolvedValue(1);

        await expect(service.remove("book-1", "lib-1")).rejects.toMatchObject({
            statusCode: 409,
            errorCode: "CONFLICT"
        });
    });

    test("SPEC-FR012: remove rejects when book is not found", async () => {
        bookRepoMock.findById.mockResolvedValue(null);

        await expect(service.remove("book-missing", "lib-1")).rejects.toMatchObject({
            statusCode: 404,
            errorCode: "BOOK_NOT_FOUND"
        });
    });

    test("SPEC-FR012: remove performs soft delete when no active loans", async () => {
        bookRepoMock.findById.mockResolvedValue({ id: "book-1" });
        bookRepoMock.countActiveLoans.mockResolvedValue(0);
        bookRepoMock.softDelete.mockResolvedValue(undefined);

        await service.remove("book-1", "lib-1");

        expect(bookRepoMock.softDelete).toHaveBeenCalledWith("book-1");
        expect(auditMock.logMutation).toHaveBeenCalledWith(expect.objectContaining({ action: "SOFT_DELETE" }));
    });

    test("SPEC-FR013: search passes title keyword query", async () => {
        bookRepoMock.search.mockResolvedValue({ data: [], total: 0 });

        await service.search("operating systems", 2, 10);

        expect(bookRepoMock.search).toHaveBeenCalledWith("operating systems", 2, 10);
    });

    test("SPEC-FR014: search passes author query case-insensitively through repository", async () => {
        bookRepoMock.search.mockResolvedValue({ data: [], total: 0 });

        await service.search("ORWELL", 1, 20);

        expect(bookRepoMock.search).toHaveBeenCalledWith("ORWELL", 1, 20);
    });

    test("SPEC-FR015: search normalizes ISBN query and preserves aggregate availability payload", async () => {
        bookRepoMock.search.mockResolvedValue({
            data: [
                {
                    id: "book-1",
                    title: "1984",
                    author: "George Orwell",
                    isbn: "9780451524935",
                    totalCopies: 5,
                    availableCopies: 2
                }
            ],
            total: 1
        });

        const result = await service.search("978-0-451-52493-5", 1, 20);

        expect(bookRepoMock.search).toHaveBeenCalledWith("9780451524935", 1, 20);
        expect(result.data[0]).toMatchObject({ totalCopies: 5, availableCopies: 2 });
        expect(result).toMatchObject({ page: 1, limit: 20, total: 1 });
    });

    test("SPEC-FR016: search without query returns paginated aggregate availability results", async () => {
        bookRepoMock.search.mockResolvedValue({ data: [], total: 0 });

        const result = await service.search(undefined, 1, 20);

        expect(bookRepoMock.search).toHaveBeenCalledWith(undefined, 1, 20);
        expect(result).toEqual({ data: [], page: 1, limit: 20, total: 0 });
    });
});
