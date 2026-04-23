import { z } from "zod";

export const createLoanSchema = z.object({
    body: z.object({
        bookId: z.string().uuid()
    }),
    params: z.object({}),
    query: z.object({})
});

export const loanIdSchema = z.object({
    body: z.object({}),
    params: z.object({
        loanId: z.string().uuid()
    }),
    query: z.object({})
});
