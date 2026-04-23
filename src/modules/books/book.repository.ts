import { LoanStatus, PrismaClient } from "@prisma/client";

export class BookRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async findByIsbn(isbn: string) {
        return this.prisma.book.findFirst({ where: { isbn, deletedAt: null } });
    }

    async findById(bookId: string) {
        return this.prisma.book.findFirst({ where: { id: bookId, deletedAt: null } });
    }

    async create(data: {
        isbn: string;
        title: string;
        author: string;
        category?: string;
        publishYear?: number;
        totalCopies: number;
    }) {
        return this.prisma.book.create({ data });
    }

    async update(bookId: string, data: Partial<{ title: string; author: string; category: string; publishYear: number; totalCopies: number }>) {
        return this.prisma.book.update({ where: { id: bookId }, data });
    }

    async softDelete(bookId: string) {
        return this.prisma.book.update({ where: { id: bookId }, data: { deletedAt: new Date() } });
    }

    async countActiveLoans(bookId: string) {
        return this.prisma.loan.count({
            where: {
                bookId,
                deletedAt: null,
                status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] }
            }
        });
    }

    async search(q: string | undefined, page: number, limit: number) {
        const where = {
            deletedAt: null,
            ...(q
                ? {
                    OR: [
                        { title: { contains: q, mode: "insensitive" as const } },
                        { author: { contains: q, mode: "insensitive" as const } },
                        { isbn: q }
                    ]
                }
                : {})
        };

        const [rows, total] = await Promise.all([
            this.prisma.book.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit
            }),
            this.prisma.book.count({ where })
        ]);

        const activeStatuses: LoanStatus[] = [LoanStatus.ACTIVE, LoanStatus.OVERDUE];
        const loanCounts = await this.prisma.loan.groupBy({
            by: ["bookId"],
            where: {
                bookId: { in: rows.map((r) => r.id) },
                status: { in: activeStatuses },
                deletedAt: null
            },
            _count: { _all: true }
        });

        const loanByBookId = new Map(loanCounts.map((x) => [x.bookId, x._count._all]));
        const data = rows.map((book) => ({
            ...book,
            availableCopies: Math.max(0, book.totalCopies - (loanByBookId.get(book.id) ?? 0))
        }));

        return { data, total };
    }
}
