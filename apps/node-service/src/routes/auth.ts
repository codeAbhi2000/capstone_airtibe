import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { decrypt } from "../lib/crypto";
import { requireAuth } from "../middleware/auth";
import {
  handleGoogleCallback,
  getCurrentUser,
  logout,
} from "../controllers/auth.controller";
import { setupGmailWatch } from "../services/gmail.service";

export const authRouter = Router();

const FRONTEND_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const JWT_SECRET = process.env.SESSION_SECRET ?? "change-me-session-secret";

// ─── Initiate Google OAuth ────────────────────────────────────────────────────
// GET /api/auth/google
authRouter.get(
  "/google",
  async (req, res, next) => {
    let token = req.cookies?.["draftly_token"];

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
        if (payload?.sub) {
          const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {id: true, onboardingComplete: true, encryptedTokens: true },
          });

          if (user) {
            let hasRefreshToken = false;
            if (user.encryptedTokens) {
              try {
                const decrypted = JSON.parse(decrypt(user.encryptedTokens));
                if (decrypted && decrypted.refreshToken) {
                  hasRefreshToken = true;
                }
              } catch (e) {
                console.error("Failed to decrypt tokens on /google check:", e);
              }
            }

            if (hasRefreshToken) {
              const redirectTo = user.onboardingComplete
                ? `${FRONTEND_URL}/dashboard`
                : `${FRONTEND_URL}/onboarding`;
              setupGmailWatch(user?.id).catch((err) => {
                console.log("Error setting up Gmail watch:", err);
              });
              return res.redirect(redirectTo);
            }
          }
        }
      } catch (err) {
        // Token expired/invalid - continue to normal Google login flow
      }
    }
    next();
  },
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
