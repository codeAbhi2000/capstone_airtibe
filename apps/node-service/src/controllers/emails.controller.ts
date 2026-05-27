import { RequestHandler, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

export const listEmails: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const emails = await prisma.emailDraft.findMany({
      where: { userId: authReq.user!.id, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        messageId: true,
        threadId: true,
        subject: true,
        fromEmail: true,
        priority: true,
        createdAt: true,
      },
    });

    res.json({ emails });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getEmail: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const email = await prisma.emailDraft.findFirst({
      where: {
        messageId: req.params.messageId as string,
        userId: authReq.user!.id,
      },
    });

    if (!email) {
      res.status(404).json({ error: "Email not found" });
      return;
    }

    res.json({ email });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};
