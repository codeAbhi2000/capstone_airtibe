import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "./lib/prisma";
import { encrypt, decrypt } from "./lib/crypto";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { emailsRouter } from "./routes/emails";
import { draftsRouter } from "./routes/drafts";
import { webhooksRouter } from "./routes/webhooks";
import pinoHttp from "pino-http";
import logger from "./lib/logger";
import dotenv from "dotenv";

dotenv.config();

// ─── Passport Google Strategy ─────────────────────────────────────────────────

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.NODE_SERVICE_URL}/api/auth/google/callback`,
    },
    async (_accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value ?? `${profile.id}@google.com`;
        const name = profile.displayName ?? null;
        const image = profile.photos?.[0]?.value ?? null;

        // Build token payload to encrypt at rest
        const tokenPayload = JSON.stringify({
          accessToken: _accessToken,
          refreshToken: refreshToken ?? null,
        });
        const encryptedTokens = encrypt(tokenPayload);

        const user = await prisma.user.upsert({
          where: { googleId: profile.id },
          create: {
            googleId: profile.id,
            email,
            name,
            image,
            encryptedTokens,
          },
          update: {
            email,
            name,
            image,
            encryptedTokens,
          },
        });

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    },
  ),
);

// Passport serialize/deserialize (used only during the OAuth redirect cycle)
passport.serializeUser((user: Express.User, done) => {
  done(null, (user as { id: string }).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express();

const FRONTEND_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      if (req.originalUrl && req.originalUrl.includes("/webhooks/stripe")) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => (req as any).url === "/health" } }));
app.use(passport.initialize());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/emails", emailsRouter);
app.use("/api/drafts", draftsRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/webhooks", webhooksRouter);


app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

export default app;
