import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { AuthController } from "./auth.controller";
import { loginSchema } from "./auth.schemas";

const controller = new AuthController();
export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), (req, res) => controller.login(req, res));
