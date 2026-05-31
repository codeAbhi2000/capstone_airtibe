import { DraftStatus, Priority } from "../generated/prisma/client";
import { RequestHandler } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { APP_CONFIG } from "../config/appConfig";
import { generateAIDraftCall } from "../services/draft.service";
import {
  createThreadedGmailDraft,
  fetchIncomingEmail,
  sendReplyEmail,
} from "../services/gmail.service";
import { getGmailClient } from "../lib/gmail-client";
import { createLogger } from "../lib/logger";

const log = createLogger("drafts.controller");

function isDraftLocked(status: DraftStatus) {
  return status === DraftStatus.approved || status === DraftStatus.sent;
}

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
      take: Math.min(parseInt(limit) * 2, 200),
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

    const uniqueDrafts =
      status === DraftStatus.pending
        ? uniqueByMessageId(drafts).slice(0, Math.min(parseInt(limit), 100))
        : drafts.slice(0, Math.min(parseInt(limit), 100));

    res.json({ drafts: uniqueDrafts });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

function uniqueByMessageId<T extends { messageId: string }>(drafts: T[]) {
  const seen = new Set<string>();
  return drafts.filter((draft) => {
    if (seen.has(draft.messageId)) return false;
    seen.add(draft.messageId);
    return true;
  });
}

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

    if (isDraftLocked(existing.status)) {
      res.status(409).json({ error: "Approved or sent drafts cannot be changed" });
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

    const existingDraft = await prisma.emailDraft.findFirst({
      where: { userId, messageId },
      orderBy: { createdAt: "desc" },
    });

    if (existingDraft) {
      await prisma.auditLog.create({
        data: {
          userId,
          draftId: existingDraft.id,
          action: "generate_duplicate_skipped",
          gmailMessageId: messageId,
          metadata: { tone, additionalInstruction },
        },
      });
      res.status(200).json({ draft: existingDraft, duplicate: true });
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

    const limits = APP_CONFIG.plans[user.plan as "free" | "paid"];
    if (
      limits.draftsPerMonth !== null &&
      user.draftsUsedMonth >= limits.draftsPerMonth
    ) {
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
      res
        .status(422)
        .json({
          error:
            "Email is a notification or system message and cannot be drafted",
        });
      return;
    }

    // 3. Call AI / OpenRouter Service to generate reply (with fallback)
    const finalTone = tone || "friendly";
    const aiDraftText = await generateAIDraftCall(
      userId,
      emailDetails,
      finalTone,
      additionalInstruction,
    );

    const draft = await prisma.$transaction(async (tx) => {
      const createdDraft = await tx.emailDraft.create({
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
          suggestedEdits: [],
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { draftsUsedMonth: { increment: 1 } },
      });

      await tx.auditLog.create({
        data: {
          userId,
          draftId: createdDraft.id,
          action: "generated",
          gmailMessageId: messageId,
          metadata: { tone: finalTone, additionalInstruction },
        },
      });

      return createdDraft;
    });

    res.status(201).json({ draft });
  } catch (err: any) {
    log.error({ err }, "Error generating draft");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const approveDraft: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  try {
    const existing = await prisma.emailDraft.findFirst({
      where: { id: req.params.id as string, userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }

    if (existing.status === DraftStatus.approved) {
      res.json({ draft: existing, alreadyApproved: true });
      return;
    }

    if (existing.status === DraftStatus.sent) {
      res.status(409).json({ error: "Sent drafts cannot be approved again" });
      return;
    }

    const emailContent = existing.finalDraft || existing.aiDraft || "";
    if (!emailContent.trim()) {
      res.status(400).json({ error: "Draft content is empty" });
      return;
    }

    const gmailDraft = await createThreadedGmailDraft(userId, {
      to: existing.fromEmail || "",
      subject: existing.subject || "Reply",
      body: emailContent,
      threadId: existing.threadId,
      messageId: existing.messageId,
    });

    const draft = await prisma.emailDraft.update({
      where: { id: req.params.id as string },
      data: {
        finalDraft: emailContent,
        status: DraftStatus.approved,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        draftId: draft.id,
        action: "approved",
        gmailMessageId: draft.messageId,
        metadata: {
          gmailDraftId: gmailDraft.id,
          gmailDraftMessageId: gmailDraft.message?.id,
          gmailDraftThreadId: gmailDraft.message?.threadId,
        },
      },
    });

    res.json({ draft, gmailDraft });
  } catch (err) {
    log.error({ err }, "Error approving draft and creating Gmail draft");
    res.status(500).json({ error: "Failed to create Gmail draft" });
  }
};

export const rewriteDraft: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;
  const { instruction, finalDraft } = req.body as {
    instruction?: string;
    finalDraft?: string;
  };

  try {
    if (!instruction?.trim()) {
      res.status(400).json({ error: "instruction is required" });
      return;
    }

    const existing = await prisma.emailDraft.findFirst({
      where: { id: req.params.id as string, userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Draft not found" });
      return;
    }

    if (isDraftLocked(existing.status)) {
      res.status(409).json({ error: "Approved or sent drafts cannot be rewritten" });
      return;
    }

    if (finalDraft !== undefined) {
      await prisma.emailDraft.update({
        where: { id: existing.id },
        data: {
          aiDraft: finalDraft,
          finalDraft,
          status: DraftStatus.edited,
        },
      });
    }

    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const aiRes = await fetch(`${aiServiceUrl}/drafts/${existing.id}/rewrite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text().catch(() => "");
      log.warn(
        { status: aiRes.status, body, draftId: existing.id },
        "AI rewrite service returned non-OK status",
      );
      res.status(502).json({ error: "AI rewrite failed" });
      return;
    }

    const aiDraft = (await aiRes.json()) as {
      aiDraft?: string;
      rewriteCount?: number;
      promptVersion?: string;
    };

    const rewrittenText = aiDraft.aiDraft;
    if (!rewrittenText?.trim()) {
      res.status(502).json({ error: "AI rewrite returned empty draft" });
      return;
    }

    const draft = await prisma.emailDraft.update({
      where: { id: existing.id },
      data: {
        finalDraft: rewrittenText,
        status: DraftStatus.pending,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        draftId: draft.id,
        action: "rewritten",
        gmailMessageId: draft.messageId,
        metadata: {
          instruction,
          rewriteCount: aiDraft.rewriteCount,
          promptVersion: aiDraft.promptVersion,
        },
      },
    });

    res.json({ draft });
  } catch (err) {
    log.error({ err }, "Error rewriting draft");
    res.status(500).json({ error: "Failed to rewrite draft" });
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

    if (isDraftLocked(existing.status)) {
      res.status(409).json({ error: "Approved or sent drafts cannot be edited" });
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

    if (isDraftLocked(existing.status)) {
      res.status(409).json({ error: "Approved or sent drafts cannot be rejected" });
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

    if (draft.status === DraftStatus.approved) {
      res.status(409).json({
        error: "Approved drafts are already saved in Gmail Drafts and cannot be sent from Draftly",
      });
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
      draft.threadId,
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
