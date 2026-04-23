import { z } from "zod";

export const createBookSchema = z.object({
    body: z.object({
        isbn: z.string().min(10),
        title: z.string().min(1).max(255),
        author: z.string().min(1).max(255),
        category: z.string().optional(),
        publishYear: z.number().int().optional(),
        totalCopies: z.number().int().min(1)
    }),
    params: z.object({}),
    query: z.object({})
});

export const updateBookSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255).optional(),
        author: z.string().min(1).max(255).optional(),
        category: z.string().optional(),
        publishYear: z.number().int().optional(),
        totalCopies: z.number().int().min(1).optional()
    }),
    params: z.object({
        bookId: z.string().uuid()
    }),
    query: z.object({})
});

export const deleteBookSchema = z.object({
    body: z.object({}),
    params: z.object({
        bookId: z.string().uuid()
    }),
    query: z.object({})
});

export const searchBooksSchema = z.object({
    body: z.object({}),
    params: z.object({}),
    query: z.object({
        q: z.string().optional(),
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional()
    })
});
