import { z } from "zod";

export const payFeeSchema = z.object({
    body: z.object({
        studentId: z.string().uuid(),
        amountVnd: z.number().int().positive(),
        note: z.string().max(500).optional()
    }),
    params: z.object({}),
    query: z.object({})
});
