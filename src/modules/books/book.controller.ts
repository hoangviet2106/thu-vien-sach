import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { JwtPayload } from "../../shared/types/auth";
import { BookService } from "./book.service";

const service = new BookService(prisma);

export class BookController {
    async list(req: Request, res: Response): Promise<void> {
        const q = req.query.q as string | undefined;
        const page = req.query.page ? Number(req.query.page) : 1;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const result = await service.search(q, page, limit);
        res.status(200).json(result);
    }

    async create(req: Request, res: Response): Promise<void> {
        const auth = (req as Request & { auth?: JwtPayload }).auth;
        const result = await service.create({ ...req.body, actorUserId: auth?.sub });
        res.status(201).json(result);
    }

    async update(req: Request, res: Response): Promise<void> {
        const auth = (req as Request & { auth?: JwtPayload }).auth;
        const result = await service.update(req.params.bookId, req.body, auth?.sub);
        res.status(200).json(result);
    }

    async remove(req: Request, res: Response): Promise<void> {
        const auth = (req as Request & { auth?: JwtPayload }).auth;
        await service.remove(req.params.bookId, auth?.sub);
        res.status(204).send();
    }
}
