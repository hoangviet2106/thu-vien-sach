import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth-jwt.middleware";
import { validate } from "../../middleware/validate.middleware";
import { StudentController } from "./student.controller";
import { payFeeSchema } from "./student.schemas";

const controller = new StudentController();
export const studentRouter = Router();

studentRouter.get("/me/loans", requireAuth, requireRole(["STUDENT", "LIBRARIAN", "ADMIN"]), (req, res) => controller.meLoans(req, res));
studentRouter.post("/fees/payments", requireAuth, requireRole(["LIBRARIAN", "ADMIN"]), validate(payFeeSchema), (req, res) => controller.payFee(req, res));
