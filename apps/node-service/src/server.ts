import app from "./app";
import logger from "./lib/logger";
import {
  connectMessageQueue,
  disconnectMessageQueue,
} from "./lib/message-queue";

const PORT = parseInt(process.env.PORT ?? "5000", 10);

const server = app.listen(PORT, async () => {
  logger.info(
    { port: PORT, url: `http://localhost:${PORT}` },
    "🚀 Draftly API running",
  );

  // Initialize RabbitMQ connection
  try {
    await connectMessageQueue();
    logger.info("✓ RabbitMQ message queue initialized");
  } catch (err) {
    logger.warn(
      { err },
      "⚠ Failed to initialize message queue - draft generation will use HTTP fallback",
    );
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(async () => {
    await disconnectMessageQueue();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  server.close(async () => {
    await disconnectMessageQueue();
    process.exit(0);
  });
});
