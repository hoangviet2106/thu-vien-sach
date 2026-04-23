import { Request } from "express";

export type JwtPayload = {
    sub: string;
    role: "STUDENT" | "LIBRARIAN" | "ADMIN";
    studentId?: string;
};

export type AuthenticatedRequest = Request & {
    auth?: JwtPayload;
    requestId?: string;
};
