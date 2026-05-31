// src/services/draft.service.ts

import { shouldSkip } from "../lib/email-filter";
import { getMessageId } from "../lib/getMessageId";
import { getGmailClient } from "../lib/gmail-client";
import { prisma } from "../lib/prisma";
import { createLogger } from "../lib/logger";
import { publishDraftMessage } from "../lib/message-queue";
import { fetchIncomingEmail } from "./gmail.service";
import { triageEmailForDraftGeneration } from "./triage.service";

const log = createLogger("draft.service");

export interface EmailDetails {
  subject: string;
  body: string;
  fromEmail: string;
  senderName?: string;
}

/**
 * Calls the Python AI service to generate a customized draft reply.
 * Falls back to an intelligent template-based reply if the AI service is unreachable or key is missing.
 */
export async function generateAIDraftCall(
  userId: string,
  email: EmailDetails,
  tone: string = "friendly",
  instruction?: string,
): Promise<string> {
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";

  if (process.env.AI_SERVICE_URL) {
    try {
      log.info(
        { aiServiceUrl, userId },
        "Calling Python AI service for draft generation",
      );
      const response = await fetch(`${aiServiceUrl}/draft/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          emailBody: email.body,
          emailSubject: email.subject,
          senderName: email.senderName || email.fromEmail,
          tone,
          instruction,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          draftText: string;
          draft?: string;
        };
        const draftText = data.draftText || data.draft;
        if (draftText) {
          return draftText.trim();
        }
      }
      log.warn(
        "AI service returned a non-ok response, using fallback draft generator",
      );
    } catch (err) {
      log.warn(
        { err },
        "Error contacting Python AI service, using fallback draft generator",
      );
    }
  }

  // High-Quality Custom Fallback Draft Generator
  log.info("Generating fallback draft reply based on tone and instruction");
  const cleanSender =
    email.senderName || email.fromEmail.split("<")[0].trim() || "there";

  let greeting = `Hi ${cleanSender},`;
  if (tone === "formal") {
    greeting = `Dear ${cleanSender},`;
  }

  let bodyText = "";
  if (instruction) {
    bodyText = `Thank you for your message regarding "${email.subject}". \n\nConcerning your point about: "${instruction}", I wanted to confirm that we are fully aligned on this approach and will move forward accordingly.`;
  } else {
    bodyText = `Thank you for your email regarding "${email.subject}". I have received it and will look into it shortly.`;
  }

  let closing = "\n\nBest regards,";
  if (tone === "friendly") {
    closing = "\n\nThanks and warm regards,";
  } else if (tone === "concise") {
    closing = "\n\nBest,";
  }

  return `${greeting}\n\n${bodyText}${closing}`;
}

export async function draftingHandler(
  emailId: string,
  historyId: string,
): Promise<void> {
  // 1. Validate inputs early
  if (!emailId || !historyId) {
    throw new Error(
      `Invalid inputs: emailId=${emailId}, historyId=${historyId}`,
    );
  }

  // 2. Idempotency check — skip if already processed
  const alreadyProcessed = await prisma.processedHistory.findUnique({
    where: { historyId },
  });
  if (alreadyProcessed) {
    log.info({ historyId }, "Duplicate event, skipping");
    return;
  }

  // 3. Graceful user lookup — no non-null assertions
  const user = await prisma.user.findUnique({
    where: { email: emailId },
    select: { id: true,draftsUsedMonth: true,plan: true },
  });

  if (!user?.id) {
    throw new Error(`User not found for email: ${emailId}`);
  }

  if (user.draftsUsedMonth >= (process.env.MX_DRAFT_PER_MONTH ? parseInt(process.env.MX_DRAFT_PER_MONTH) : 10) && user.plan !== "paid") {
    log.info({ userId: user.id, draftsUsedMonth: user.draftsUsedMonth }, "User has reached monthly draft limit, skipping draft generation");
    return;
  }


  // 4. Reuse cached/pooled Gmail client
  const gmail = await getGmailClient(user.id); // implement LRU cache inside

  // 5. Parallelize independent lookups
  const messageId = await getMessageId(emailId, historyId, gmail);

  if (!messageId) {
    log.warn({ emailId, historyId }, "No messageId found, skipping");
    return;
  }

  const message = await fetchIncomingEmail(gmail, messageId);

  if (!message) {
    log.warn({ messageId }, "Could not fetch email, skipping");
    console.log(message);
    return;
  }

  const existingDraft = await prisma.emailDraft.findFirst({
    where: { userId: user.id, messageId },
    select: { id: true, status: true },
  });

  if (existingDraft) {
    log.info(
      { userId: user.id, messageId, draftId: existingDraft.id },
      "Draft already exists for message, skipping duplicate queue publish",
    );
    await prisma.processedHistory
      .create({
        data: { userId: user.id, historyId },
      })
      .catch(() => undefined);
    return;
  }

  log.info(
    { userId: user.id, emailId, messageId },
    "Fetched email details for draft generation filtering started",
  );
  // 6. Filter check
  const skip = shouldSkip({
    sender: message.fromEmail,
    subject: message.subject,
    body: message.body,
  });
  if (skip.skip) {
    log.info({ reason: skip.reason }, "Skipping draft generation");
    return;
  }

  const {needReply , reason,priority} = await triageEmailForDraftGeneration(message.subject, message.body, message.fromEmail);

  if (!needReply) {
    log.info(
      { userId: user.id, messageId,reason,priority },
      "Triage determined no reply needed, skipping draft generation",
    );
    return;
  }

  // 7. Mark history as processed to ensure idempotency
  await prisma.processedHistory.create({
    data: { userId: user.id, historyId },
  });


  // 8. Enqueue to message queue for async processing
  try {
    await publishDraftMessage({
      userId: user.id,
      messageId,
      threadId: message.threadId,
      subject: message.subject,
      fromEmail: message.fromEmail,
      body: message.body,
      priority: priority  || "medium",
      sentAt: new Date().toISOString(),
    });
    log.info({ userId: user.id, messageId }, "Draft job enqueued to RabbitMQ");
  } catch (err) {
    log.warn(
      { err, userId: user.id, messageId },
      "Failed to enqueue draft job, will try sync fallback",
    );
  }
}
