import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getUserProfile,
  updateUserProfile,
  getUserUsage,
  updateUserPreferences,
  completeOnboarding,
  analyseSentEmails,
} from "../controllers/users.controller";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, getUserProfile);
usersRouter.patch("/me", requireAuth, updateUserProfile);
usersRouter.get("/me/usage", requireAuth, getUserUsage);
usersRouter.patch("/me/preferences", requireAuth, updateUserPreferences);
usersRouter.get("/me/onboarding/analyse", requireAuth, analyseSentEmails);
usersRouter.post("/me/onboarding/analyse", requireAuth, analyseSentEmails);
usersRouter.post("/me/onboarding/complete", requireAuth, completeOnboarding);

