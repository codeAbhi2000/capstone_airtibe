import { DraftStatus, Priority } from "../generated/prisma/client";
import { RequestHandler } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { PLAN_LIMITS } from "@draftly/shared";
import { generateAIDraftCall } from "../services/draft.service";
import { fetchIncomingEmail, sendReplyEmail } from "../services/gmail.service";
import { getGmailClient } from "../lib/gmail-client";
import { createLogger } from "../lib/logger";

const log = createLogger("drafts.controller");

export const listDrafts: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const {
      status,
      priority,
      limit = "20",
      offset = "0",
    } = req.query as {
      status?: DraftStatus;
      priority?: Priority;
      limit?: string;
      offset?: string;
    };

    const drafts = await prisma.emailDraft.findMany({
      where: {
        userId: authReq.user!.id,
        ...(status && { status }),
        ...(priority && { priority }),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(parseInt(limit), 100),
      skip: parseInt(offset),
      select: {
        id: true,
        messageId: true,
        threadId: true,
        subject: true,
        fromEmail: true,
        status: true,
        priority: true,
        aiDraft: true,
        finalDraft: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ drafts });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDraft: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const draft = await prisma.emailDraft.findFirst({
      where: { id: req.params.id as string, userId: authReq.user!.id },
    });

    if (!draft) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }

    res.json({ draft });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateDraft: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const { status, finalDraft } = req.body as {
    status?: DraftStatus;
    finalDraft?: string;
  };

  try {
    const existing = await prisma.emailDraft.findFirst({
      where: { id: req.params.id as string, userId: authReq.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }

    const draft = await prisma.emailDraft.update({
      where: { id: req.params.id as string },
      data: {
        ...(status && { status }),
        ...(finalDraft !== undefined && { finalDraft }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: authReq.user!.id,
        draftId: draft.id,
        action: status ?? "edited",
        gmailMessageId: draft.messageId,
      },
    });

    res.json({ draft });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const generateDraft: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const { messageId, tone, additionalInstruction } = req.body as {
    messageId: string;
    tone?: string;
    additionalInstruction?: string;
  };

  try {
    if (!messageId) {
      res.status(400).json({ error: "messageId is required" });
      return;
    }

    // 1. Verify and enforce free plan limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, draftsUsedMonth: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const limits = PLAN_LIMITS[user.plan as "free" | "paid"];
    if (limits.draftsPerMonth !== null && user.draftsUsedMonth >= limits.draftsPerMonth) {
      res.status(403).json({
        code: "DRAFT_LIMIT_REACHED",
        message: `You have reached your free plan limit of ${limits.draftsPerMonth} drafts. Please upgrade.`,
        upgradeUrl: "/upgrade",
      });
      return;
    }

    // 2. Fetch original incoming email details from Gmail
    const gmailClient = await getGmailClient(userId);
    const emailDetails = await fetchIncomingEmail(gmailClient, messageId);

    if (!emailDetails) {
      res.status(422).json({ error: "Email is a notification or system message and cannot be drafted" });
      return;
    }

    // 3. Call AI / OpenRouter Service to generate reply (with fallback)
    const finalTone = tone || "friendly";
    const aiDraftText = await generateAIDraftCall(userId, emailDetails, finalTone, additionalInstruction);

    // 4. Save to Database
    const draft = await prisma.emailDraft.create({
      data: {
        userId,
        messageId,
        threadId: emailDetails.threadId,
        subject: emailDetails.subject,
        fromEmail: emailDetails.fromEmail,
        status: DraftStatus.pending,
        priority: Priority.medium,
        aiDraft: aiDraftText,
        finalDraft: aiDraftText,
      },
    });

    // 5. Increment draft usage count
    await prisma.user.update({
      where: { id: userId },
      data: { draftsUsedMonth: { increment: 1 } },
    });

    // 6. Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        draftId: draft.id,
        action: "generated",
        gmailMessageId: messageId,
        metadata: { tone: finalTone, additionalInstruction },
      },
    });

    res.status(201).json({ draft });
  } catch (err: any) {
    log.error({ err }, "Error generating draft");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const approveDraft: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const existing = await prisma.emailDraft.findFirst({
      where: { id: req.params.id as string, userId: authReq.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }

    const draft = await prisma.emailDraft.update({
      where: { id: req.params.id as string },
      data: { status: DraftStatus.approved },
    });

    await prisma.auditLog.create({
      data: {
        userId: authReq.user!.id,
        draftId: draft.id,
        action: "approved",
        gmailMessageId: draft.messageId,
      },
    });

    res.json({ draft });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editDraft: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const { finalDraft } = req.body as {
    finalDraft: string;
  };

  try {
    if (finalDraft === undefined) {
      res.status(400).json({ error: "finalDraft content is required" });
      return;
    }

    const existing = await prisma.emailDraft.findFirst({
      where: { id: req.params.id as string, userId: authReq.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }

    const draft = await prisma.emailDraft.update({
      where: { id: req.params.id as string },
      data: {
        finalDraft,
        status: DraftStatus.edited,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: authReq.user!.id,
        draftId: draft.id,
        action: "edited",
        gmailMessageId: draft.messageId,
      },
    });

    res.json({ draft });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const rejectDraft: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const existing = await prisma.emailDraft.findFirst({
      where: { id: req.params.id as string, userId: authReq.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }

    const draft = await prisma.emailDraft.update({
      where: { id: req.params.id as string },
      data: { status: DraftStatus.rejected },
    });

    await prisma.auditLog.create({
      data: {
        userId: authReq.user!.id,
        draftId: draft.id,
        action: "rejected",
        gmailMessageId: draft.messageId,
      },
    });

    res.json({ draft });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendDraft: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  try {
    const draft = await prisma.emailDraft.findFirst({
      where: { id: req.params.id as string, userId },
    });

    if (!draft) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }

    if (draft.status === DraftStatus.sent) {
      res.status(400).json({ error: "Draft has already been sent" });
      return;
    }

    const emailContent = draft.finalDraft || draft.aiDraft || "";
    if (!emailContent) {
      res.status(400).json({ error: "Draft content is empty" });
      return;
    }

    // Send reply email via Gmail API
    await sendReplyEmail(
      userId,
      draft.fromEmail || "",
      draft.subject || "Reply",
      emailContent,
      draft.messageId,
      draft.threadId
    );

    // Update draft status in DB
    const updatedDraft = await prisma.emailDraft.update({
      where: { id: req.params.id as string },
      data: { status: DraftStatus.sent },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId,
        draftId: updatedDraft.id,
        action: "sent",
        gmailMessageId: updatedDraft.messageId,
      },
    });

    res.json({ success: true, draft: updatedDraft });
  } catch (err: any) {
    log.error({ err }, "Error sending draft email");
    res.status(500).json({ error: "Failed to send email" });
  }
};

