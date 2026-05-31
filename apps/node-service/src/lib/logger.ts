import pino from "pino";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const isProduction = process.env.NODE_ENV === "production";
const logToFile = process.env.LOG_TO_FILE !== "false";
const logDir = process.env.LOG_DIR ?? "/var/log/draftly/node-service";
const logRetentionDays = parseInt(process.env.LOG_RETENTION_DAYS ?? "14", 10);
const pruneIntervalMs = parseInt(
  process.env.LOG_PRUNE_INTERVAL_MS ?? String(6 * 60 * 60 * 1000),
  10,
);

const redactConfig = {
  paths: [
    "accessToken",
    "refreshToken",
    "token",
    "draftly_token",
    "authorization",
    "headers.authorization",
    "cookie",
    "headers.cookie",
    "encryptedTokens",
    "password",
    "secret",
    "clientSecret",
    "GOOGLE_CLIENT_SECRET",
    "SESSION_SECRET",
    "ENCRYPTION_KEY",
    "OPENROUTER_API_KEY",
    "STRIPE_SECRET_KEY",
    "*.accessToken",
    "*.refreshToken",
    "*.token",
    "*.authorization",
    "*.cookie",
    "*.encryptedTokens",
    "*.password",
    "*.secret",
    "*.clientSecret",
  ],
  censor: "[secure]",
};

function currentLogPath() {
  const date = new Date().toISOString().slice(0, 10);
  return join(logDir, `node-service-${date}.log`);
}

function pruneOldLogs() {
  if (!existsSync(logDir)) return;

  const cutoff = Date.now() - logRetentionDays * 24 * 60 * 60 * 1000;
  for (const file of readdirSync(logDir)) {
    if (!file.endsWith(".log")) continue;
    const path = join(logDir, file);
    if (statSync(path).mtimeMs < cutoff) {
      unlinkSync(path);
    }
  }
}

function fileDestination() {
  mkdirSync(logDir, { recursive: true });
  pruneOldLogs();
  setInterval(pruneOldLogs, pruneIntervalMs).unref();
  return pino.destination({ dest: currentLogPath(), mkdir: true, sync: false });
}

const logger = logToFile
  ? pino(
      {
        level: process.env.LOG_LEVEL ?? "info",
        redact: redactConfig,
        base: {
          service: "node-service",
        },
      },
      fileDestination(),
    )
  : pino({
      level: process.env.LOG_LEVEL ?? "info",
      redact: redactConfig,
      transport: isProduction
        ? undefined
        : {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss.l",
              ignore: "pid,hostname",
            },
          },
      base: {
        service: "node-service",
      },
    });

/**
 * Create a child logger scoped to a specific module.
 * Usage: `const log = createLogger("gmail.service");`
 */
export function createLogger(module: string) {
  return logger.child({ module });
}

export default logger;
