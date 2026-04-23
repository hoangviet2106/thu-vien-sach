import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth-jwt.middleware";
import { validate } from "../../middleware/validate.middleware";
import { LoanController } from "./loan.controller";
import { createLoanSchema, loanIdSchema } from "./loan.schemas";

export const loanRouter = Router();
const controller = new LoanController();

loanRouter.post("/", requireAuth, requireRole(["STUDENT", "LIBRARIAN", "ADMIN"]), validate(createLoanSchema), (req, res) => controller.borrow(req, res));
loanRouter.post("/:loanId/return", requireAuth, requireRole(["STUDENT", "LIBRARIAN", "ADMIN"]), validate(loanIdSchema), (req, res) => controller.returnBook(req, res));
loanRouter.post("/:loanId/renew", requireAuth, requireRole(["STUDENT", "LIBRARIAN", "ADMIN"]), validate(loanIdSchema), (req, res) => controller.renew(req, res));
loanRouter.get("/overdue", requireAuth, requireRole(["LIBRARIAN", "ADMIN"]), (req, res) => controller.overdue(req, res));
