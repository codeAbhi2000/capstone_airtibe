import { RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest } from "../middleware/auth";

const JWT_SECRET = process.env.SESSION_SECRET ?? "change-me-session-secret";
const FRONTEND_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export const handleGoogleCallback: RequestHandler = (req, res) => {
  const user = req.user as { id: string };

  const token = jwt.sign({ sub: user.id }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("draftly_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  res.redirect(`${FRONTEND_URL}/onboarding`);
};

export const getCurrentUser: RequestHandler = (req, res) => {
  res.json({ user: (req as AuthRequest).user });
};

export const logout: RequestHandler = (_req, res) => {
  res.clearCookie("draftly_token", { path: "/" });
  res.json({ message: "Logged out successfully" });
};
