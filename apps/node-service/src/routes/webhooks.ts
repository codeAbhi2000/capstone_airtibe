import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { handleStripeWebhook, createUpgradeSession } from "../controllers/webhooks.controller";

export const webhooksRouter = Router();

webhooksRouter.post("/stripe", handleStripeWebhook);
webhooksRouter.post("/upgrade", requireAuth, createUpgradeSession);

