import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { bookRouter } from "./modules/books/book.routes";
import { loanRouter } from "./modules/loans/loan.routes";
import { studentRouter } from "./modules/students/student.routes";

export function buildApp() {
    const app = express();
    app.use(express.json());
    app.use(requestIdMiddleware);

    app.get(`${env.API_PREFIX}/health`, (_req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.use(`${env.API_PREFIX}/auth`, authRouter);
    app.use(`${env.API_PREFIX}/books`, bookRouter);
    app.use(`${env.API_PREFIX}/loans`, loanRouter);
    app.use(`${env.API_PREFIX}/students`, studentRouter);

    app.use(errorHandler);
    return app;
}
