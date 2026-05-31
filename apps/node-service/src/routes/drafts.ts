import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  listDrafts,
  getDraft,
  updateDraft,
  generateDraft,
  rewriteDraft,
  approveDraft,
  editDraft,
  rejectDraft,
  sendDraft,
} from "../controllers/drafts.controller";

export const draftsRouter = Router();

draftsRouter.use(requireAuth);

draftsRouter.get("/", listDrafts);
draftsRouter.post("/generate", generateDraft);
draftsRouter.get("/:id", getDraft);
draftsRouter.patch("/:id", updateDraft);
draftsRouter.patch("/:id/rewrite", rewriteDraft);
draftsRouter.patch("/:id/approve", approveDraft);
draftsRouter.patch("/:id/edit", editDraft);
draftsRouter.patch("/:id/reject", rejectDraft);
draftsRouter.post("/:id/send", sendDraft);
