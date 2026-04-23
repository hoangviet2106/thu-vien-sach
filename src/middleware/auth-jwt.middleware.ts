import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../shared/errors/app-error";
import { ERROR_CODES } from "../shared/errors/error-codes";
import { JwtPayload } from "../shared/types/auth";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.header("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError(ERROR_CODES.UNAUTHORIZED, 401, "Missing bearer token");
    }

    const token = authHeader.replace("Bearer ", "").trim();
    try {
        const decoded = jwt.verify(token, env.JWT_PUBLIC_KEY, {
            algorithms: ["RS256"]
        }) as JwtPayload;
        (req as Request & { auth?: JwtPayload }).auth = decoded;
        next();
    } catch {
        throw new AppError(ERROR_CODES.UNAUTHORIZED, 401, "Invalid or expired token");
    }
}

export function requireRole(roles: Array<"STUDENT" | "LIBRARIAN" | "ADMIN">) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const auth = (req as Request & { auth?: JwtPayload }).auth;
        if (!auth) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, 401, "Authentication required");
        }
        if (!roles.includes(auth.role)) {
            throw new AppError(ERROR_CODES.FORBIDDEN, 403, "Insufficient permissions");
        }
        next();
    };
}
