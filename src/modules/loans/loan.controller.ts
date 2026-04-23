import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { JwtPayload } from "../../shared/types/auth";
import { LoanService } from "./loan.service";

const service = new LoanService(prisma);

export class LoanController {
    async borrow(req: Request, res: Response): Promise<void> {
        const auth = (req as Request & { auth?: JwtPayload }).auth;
        if (!auth) {
            throw new Error("Authentication missing");
        }
        const loan = await service.borrowBook(auth.sub, req.body.bookId, auth.sub);
        res.status(201).json(loan);
    }

    async returnBook(req: Request, res: Response): Promise<void> {
        const auth = (req as Request & { auth?: JwtPayload }).auth;
        if (!auth) {
            throw new Error("Authentication missing");
        }
        const loan = await service.returnBook(req.params.loanId, auth.sub);
        res.status(200).json(loan);
    }

    async renew(req: Request, res: Response): Promise<void> {
        const auth = (req as Request & { auth?: JwtPayload }).auth;
        if (!auth) {
            throw new Error("Authentication missing");
        }
        const loan = await service.renewLoan(req.params.loanId, auth.sub);
        res.status(200).json(loan);
    }

    async overdue(_req: Request, res: Response): Promise<void> {
        const result = await service.listOverdue();
        res.status(200).json({ data: result });
    }
}
