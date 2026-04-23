import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
    (req as Request & { requestId?: string }).requestId = randomUUID();
    next();
}
