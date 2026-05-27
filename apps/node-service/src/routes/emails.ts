import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { listEmails, getEmail } from "../controllers/emails.controller";

export const emailsRouter = Router();

emailsRouter.use(requireAuth);

emailsRouter.get("/", listEmails);
emailsRouter.get("/:messageId", getEmail);
