import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { JwtPayload } from "../../shared/types/auth";
import { StudentService } from "./student.service";

const service = new StudentService(prisma);

export class StudentController {
    async meLoans(req: Request, res: Response): Promise<void> {
        const auth = (req as Request & { auth?: JwtPayload }).auth;
        if (!auth) {
            throw new Error("Authentication missing");
        }
        const loans = await service.getMyLoans(auth.sub);
        res.status(200).json({ data: loans });
    }

    async payFee(req: Request, res: Response): Promise<void> {
        const auth = (req as Request & { auth?: JwtPayload }).auth;
        if (!auth) {
            throw new Error("Authentication missing");
        }
        const result = await service.payFee({
            studentId: req.body.studentId,
            amountVnd: req.body.amountVnd,
            note: req.body.note,
            actorUserId: auth.sub
        });
        res.status(200).json(result);
    }
}
