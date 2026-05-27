import { Router } from "express";
import passport from "passport";
import { requireAuth } from "../middleware/auth";
import {
  handleGoogleCallback,
  getCurrentUser,
  logout,
} from "../controllers/auth.controller";

export const authRouter = Router();

const FRONTEND_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// ─── Initiate Google OAuth ────────────────────────────────────────────────────
// GET /api/auth/google
authRouter.get(
  "/google",
  passport.authenticate("google", {
    session: false,
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    accessType: "offline",
    prompt: "consent",
  } as Parameters<typeof passport.authenticate>[1]),
);

// ─── Google OAuth Callback ────────────────────────────────────────────────────
// GET /api/auth/google/callback
authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed`,
  }),
  handleGoogleCallback,
);

// ─── Current User ─────────────────────────────────────────────────────────────
// GET /api/auth/me
authRouter.get("/me", requireAuth, getCurrentUser);

// ─── Logout ───────────────────────────────────────────────────────────────────
// POST /api/auth/logout
authRouter.post("/logout", logout);
