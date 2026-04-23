import { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";
import { AppError } from "../shared/errors/app-error";
import { ERROR_CODES } from "../shared/errors/error-codes";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error_code: err.errorCode,
            message: err.message
        });
        return;
    }

    logger.error({ err }, "Unhandled error");
    res.status(500).json({
        error_code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: "An unexpected error occurred"
    });
}
