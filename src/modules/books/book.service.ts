import { PrismaClient } from "@prisma/client";
import { AuditService } from "../audits/audit.service";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { normalizeIsbn } from "../../shared/utils/isbn";
import { BookRepository } from "./book.repository";

export class BookService {
    private readonly repo: BookRepository;
    private readonly audit: AuditService;

    constructor(private readonly prisma: PrismaClient) {
        this.repo = new BookRepository(prisma);
        this.audit = new AuditService(prisma);
    }

    async create(input: {
        isbn: string;
        title: string;
        author: string;
        category?: string;
        publishYear?: number;
        totalCopies: number;
        actorUserId?: string;
    }) {
        const normalized = normalizeIsbn(input.isbn);
        if (!/^\d{13}$/.test(normalized)) {
            throw new AppError(ERROR_CODES.VALIDATION_ERROR, 400, "ISBN must be 13 digits");
        }

        const existing = await this.repo.findByIsbn(normalized);
        if (existing) {
            throw new AppError(ERROR_CODES.DUPLICATE_ISBN, 409, "ISBN already exists");
        }

        const book = await this.repo.create({
            isbn: normalized,
            title: input.title,
            author: input.author,
            category: input.category,
            publishYear: input.publishYear,
            totalCopies: input.totalCopies
        });

        await this.audit.logMutation({
            actorUserId: input.actorUserId,
            action: "CREATE",
            entityType: "Book",
            entityId: book.id,
            summary: { isbn: book.isbn, title: book.title }
        });

        return { ...book, availableCopies: book.totalCopies };
    }

    async update(bookId: string, data: Partial<{ title: string; author: string; category: string; publishYear: number; totalCopies: number }>, actorUserId?: string) {
        const book = await this.repo.findById(bookId);
        if (!book) {
            throw new AppError(ERROR_CODES.BOOK_NOT_FOUND, 404, "Book not found");
        }

        if (typeof data.totalCopies === "number") {
            const activeLoans = await this.repo.countActiveLoans(bookId);
            if (data.totalCopies < activeLoans) {
                throw new AppError(ERROR_CODES.CONFLICT, 409, "totalCopies cannot be less than active loans");
            }
        }

        const updated = await this.repo.update(bookId, data);
        const activeLoans = await this.repo.countActiveLoans(bookId);

        await this.audit.logMutation({
            actorUserId,
            action: "UPDATE",
            entityType: "Book",
            entityId: bookId,
            summary: data
        });

        return { ...updated, availableCopies: Math.max(0, updated.totalCopies - activeLoans) };
    }

    async remove(bookId: string, actorUserId?: string): Promise<void> {
        const book = await this.repo.findById(bookId);
        if (!book) {
            throw new AppError(ERROR_CODES.BOOK_NOT_FOUND, 404, "Book not found");
        }

        const activeLoans = await this.repo.countActiveLoans(bookId);
        if (activeLoans > 0) {
            throw new AppError(ERROR_CODES.CONFLICT, 409, "Cannot delete book with active loans");
        }

        await this.repo.softDelete(bookId);
        await this.audit.logMutation({
            actorUserId,
            action: "SOFT_DELETE",
            entityType: "Book",
            entityId: bookId,
            summary: { deletedAt: new Date().toISOString() }
        });
    }

    async search(q?: string, page = 1, limit = 20) {
        const normalized = q ? normalizeIsbn(q) : undefined;
        const query = normalized && /^\d{13}$/.test(normalized) ? normalized : q;
        const result = await this.repo.search(query, page, limit);
        return {
            data: result.data,
            page,
            limit,
            total: result.total
        };
    }
}
