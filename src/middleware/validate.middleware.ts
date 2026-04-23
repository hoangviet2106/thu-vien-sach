import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";
import { AppError } from "../shared/errors/app-error";
import { ERROR_CODES } from "../shared/errors/error-codes";

export const validate = (schema: AnyZodObject) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse({
            body: req.body,
            params: req.params,
            query: req.query
        });

        if (!result.success) {
            throw new AppError(
                ERROR_CODES.VALIDATION_ERROR,
                400,
                result.error.issues.map((i) => i.message).join("; ")
            );
        }

        next();
    };
};
