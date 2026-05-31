import amqp from "amqplib";
import { createLogger } from "./logger";

const log = createLogger("message-queue");

let connection: any = null;
let channel: amqp.Channel | null = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE_NAME = "email.topic";
const QUEUE_NAME = "draft-queue";
const ROUTING_KEY = "email.draft";

interface DraftMessage {
  userId: string;
  messageId: string;
  threadId: string;
  subject: string;
  fromEmail: string;
  body: string;
  priority: "high" | "medium" | "low";
  sentAt: string;
}

/**
 * Initialize RabbitMQ connection and declare exchange/queue
 */
export async function connectMessageQueue(): Promise<void> {
  if (connection) {
    log.info("Message queue already connected");
    return;
  }

  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection?.createChannel();
    const activeChannel = channel;
    if (!activeChannel) {
      throw new Error("RabbitMQ channel was not created");
    }

    log.info("Connected to RabbitMQ");

    // Declare exchange (topic type for flexible routing)
    await activeChannel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    log.info({ exchange: EXCHANGE_NAME }, "Exchange declared");

    // Declare queue
    await activeChannel.assertQueue(QUEUE_NAME, { 
        
        durable: true,
    arguments: {
        "x-dead-letter-exchange": "email.dlx",
        "x-dead-letter-routing-key": "email.draft.dead",
    },
     });
    log.info({ queue: QUEUE_NAME }, "Queue declared");

    // Bind queue to exchange
    await activeChannel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
    log.info(
      { queue: QUEUE_NAME, exchange: EXCHANGE_NAME, key: ROUTING_KEY },
      "Queue bound to exchange",
    );

    // Set prefetch to process one message at a time
    await activeChannel.prefetch(1);

    // Handle connection errors
    connection.on("error", (err: unknown) => {
      log.error({ err }, "RabbitMQ connection error");
      connection = null;
      channel = null;
    });

    connection.on("close", () => {
      log.warn("RabbitMQ connection closed");
      connection = null;
      channel = null;
    });
  } catch (err) {
    log.error({ err }, "Failed to connect to RabbitMQ");
    throw err;
  }
}

/**
 * Publish a draft generation message to the queue
 */
export async function publishDraftMessage(
  message: DraftMessage,
): Promise<void> {
  if (!channel) {
    throw new Error(
      "Message queue not connected. Call connectMessageQueue() first.",
    );
  }

  try {
    const payload = JSON.stringify(message);
    const published = channel.publish(
      EXCHANGE_NAME,
      ROUTING_KEY,
      Buffer.from(payload),
      {
        persistent: true,
        contentType: "application/json",
        timestamp: Date.now(),
      },
    );

    if (!published) {
      throw new Error("Failed to publish message to queue");
    }

    log.info(
      {
        userId: message.userId,
        messageId: message.messageId,
      },
      "Draft message published",
    );
  } catch (err) {
    log.error({ err, message }, "Failed to publish draft message");
    throw err;
  }
}

/**
 * Gracefully close RabbitMQ connection
 */
export async function disconnectMessageQueue(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      log.info("Channel closed");
    }
    if (connection) {
      await connection.close();
      log.info("Connection closed");
    }
  } catch (err) {
    log.error({ err }, "Error closing message queue");
  }
  connection = null;
  channel = null;
}

/**
 * Health check for message queue connection
 */
export function isMessageQueueConnected(): boolean {
  return connection !== null && channel !== null;
}
