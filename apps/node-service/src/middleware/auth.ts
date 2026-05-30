import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    onboardingComplete: boolean;
  };
}

const JWT_SECRET = process.env.SESSION_SECRET ?? "change-me-session-secret";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Re-issues a fresh JWT and sets it as an HttpOnly cookie on the response. */
function refreshToken(res: Response, userId: string): void {
  const fresh = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("draftly_token", fresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Verifies the JWT from the HttpOnly cookie or Authorization Bearer header.
 * Attaches the full user record to req.user on success.
 */
export const requireAuth: RequestHandler = async (
  req,
  res,
  next,
): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    // 1. Try cookie first
    let token: string | undefined = authReq.cookies?.["draftly_token"];

    // 2. Fall back to Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // 3. Verify JWT
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    if (!payload?.sub) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    // 4. Load user from DB
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        onboardingComplete: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    authReq.user = user;
    next();
  } catch (err) {
    // ── Token Expired: attempt silent refresh ─────────────────────────────
    if (err instanceof TokenExpiredError) {
      try {
        // Decode without verification to extract the subject
        const decoded = jwt.decode(authReq.cookies?.["draftly_token"] ?? "") as {
          sub?: string;
        } | null;

        if (!decoded?.sub) {
          res.status(401).json({ error: "Invalid token" });
          return;
        }

        const user = await prisma.user.findUnique({
          where: { id: decoded.sub },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            onboardingComplete: true,
          },
        });

        if (!user) {
          res.status(401).json({ error: "User not found" });
          return;
        }

        // Reissue a fresh token and continue the request
        refreshToken(res, user.id);
        authReq.user = user;
        next();
        return;
      } catch {
        res.status(401).json({ error: "Token refresh failed" });
        return;
      }
    }

    res.status(401).json({ error: "Invalid or expired token" });
  }
};
