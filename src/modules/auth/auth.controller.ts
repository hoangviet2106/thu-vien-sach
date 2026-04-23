import { Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { AuthService } from "./auth.service";

const service = new AuthService(prisma);

export class AuthController {
    async login(req: Request, res: Response): Promise<void> {
        const { email, password } = req.body as { email: string; password: string };
        const result = await service.login(email, password);
        res.status(200).json(result);
    }
}
