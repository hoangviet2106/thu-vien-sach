import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth-jwt.middleware";
import { validate } from "../../middleware/validate.middleware";
import { BookController } from "./book.controller";
import { createBookSchema, deleteBookSchema, searchBooksSchema, updateBookSchema } from "./book.schemas";

export const bookRouter = Router();
const controller = new BookController();

bookRouter.get("/", validate(searchBooksSchema), (req, res) => controller.list(req, res));
bookRouter.post("/", requireAuth, requireRole(["LIBRARIAN", "ADMIN"]), validate(createBookSchema), (req, res) => controller.create(req, res));
bookRouter.patch("/:bookId", requireAuth, requireRole(["LIBRARIAN", "ADMIN"]), validate(updateBookSchema), (req, res) => controller.update(req, res));
bookRouter.delete("/:bookId", requireAuth, requireRole(["LIBRARIAN", "ADMIN"]), validate(deleteBookSchema), (req, res) => controller.remove(req, res));
