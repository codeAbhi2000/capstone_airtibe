import { RequestHandler } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { fetchSentEmails } from "../services/gmail.service";
import { APP_CONFIG } from "../config/appConfig";
import { createLogger } from "../lib/logger";

const log = createLogger("users.controller");

const DEFAULT_STYLE_PROFILE = {
  formalityScore: 68,
  avgWords: 82,
  commonOpeners: ["Hi", "Hey", "Thanks for reaching out"],
  commonClosers: ["Best", "Thanks", "Cheers"],
  traits: ["Warm but professional", "Concise paragraphs", "Uses bullet points"],
};

export const getUserProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const user = await prisma.user.findUnique({
      where: { id: authReq.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
        onboardingComplete: true,
        onboardingAt: true,
        preferences: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateUserProfile: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const { preferences, onboardingComplete } = req.body as {
    preferences?: Record<string, unknown>;
    onboardingComplete?: boolean;
  };

  try {
    const user = await prisma.user.update({
      where: { id: authReq.user!.id },
      data: {
        ...(preferences !== undefined && { preferences: preferences as any }),
        ...(onboardingComplete === true && {
          onboardingComplete: true,
          onboardingAt: new Date(),
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
        onboardingComplete: true,
        preferences: true,
      },
    });

    res.json({ user });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserUsage: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const user = await prisma.user.findUnique({
      where: { id: authReq.user!.id },
      select: {
        plan: true,
        draftsUsedMonth: true,
        billingPeriodStart: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const planName = user.plan as "free" | "paid";
    const limits = APP_CONFIG.plans[planName];
    const draftsLimit = limits.draftsPerMonth;

    const billingPeriodStart = user.billingPeriodStart;
    const billingPeriodEnd = new Date(billingPeriodStart);
    billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

    res.json({
      plan: user.plan,
      draftsUsedMonth: user.draftsUsedMonth,
      draftsLimit,
      billingPeriodStart: billingPeriodStart.toISOString(),
      billingPeriodEnd: billingPeriodEnd.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateUserPreferences: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const { preferences } = req.body as {
    preferences?: Record<string, unknown>;
  };

  try {
    if (!preferences) {
      res.status(400).json({ error: "Preferences are required" });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: authReq.user!.id },
      select: { preferences: true },
    });

    const currentPreferences =
      (currentUser?.preferences as Record<string, unknown>) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
    };

    const user = await prisma.user.update({
      where: { id: authReq.user!.id },
      data: {
        preferences: updatedPreferences as any,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
        onboardingComplete: true,
        preferences: true,
      },
    });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const completeOnboarding: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const { preferences } = req.body as {
    preferences?: Record<string, unknown>;
  };

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: authReq.user!.id },
      select: { preferences: true },
    });

    const currentPreferences =
      (currentUser?.preferences as Record<string, unknown>) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...(preferences && preferences),
    };
    const styleProfile = updatedPreferences.styleProfile as
      | Record<string, unknown>
      | undefined;

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: authReq.user!.id },
        data: {
          onboardingComplete: true,
          onboardingAt: new Date(),
          preferences: updatedPreferences as any,
          profileReviewedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          plan: true,
          onboardingComplete: true,
          onboardingAt: true,
          profileReviewedAt: true,
          preferences: true,
        },
      });

      if (styleProfile && Object.keys(styleProfile).length > 0) {
        await tx.userStyle.upsert({
          where: { userId: authReq.user!.id },
          create: {
            userId: authReq.user!.id,
            styleProfile: styleProfile as any,
            emailCount: APP_CONFIG.onboarding.sentEmailsToAnalyze,
            promptVersion: "onboarding-review-v1",
          },
          update: {
            styleProfile: styleProfile as any,
            emailCount: APP_CONFIG.onboarding.sentEmailsToAnalyze,
            promptVersion: "onboarding-review-v1",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: authReq.user!.id,
          action: "onboarding_completed",
          metadata: {
            hasStyleProfile: Boolean(styleProfile),
          },
        },
      });

      return updatedUser;
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const analyseSentEmails: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user!.id;
    log.info({ userId }, "Starting analysis of sent emails");

    let sentEmails: Array<{ body: string }> = [];
    try {
      sentEmails = await fetchSentEmails(
        userId,
        APP_CONFIG.onboarding.sentEmailsToAnalyze,
      );
    } catch (err) {
      log.warn(
        { err },
        "Could not fetch sent emails from Gmail, using fallback",
      );
    }

    log.info({ count: sentEmails.length }, "Fetched sent emails");

    let styleProfile = null;

    // Call Python AI Service for analysis if available
    if (process.env.AI_SERVICE_URL && sentEmails.length > 0) {
      try {
        log.info(
          { url: `${process.env.AI_SERVICE_URL}/analyse-style`, userId },
          "Delegating to AI-Service for style analysis",
        );
        // Map sentEmails to required format: { subject, toEmail, body }
        const formattedEmails = sentEmails.filter((email: any) => email.body?.trim()).map((email: any) => ({
          subject: email.subject || "(No subject)",
          toEmail: email.toEmail || "recipient@example.com",
          body: email.body || "",
        }));

        const aiRes = await fetch(
          `${process.env.AI_SERVICE_URL}/analyse-style`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              emails: formattedEmails,
            }),
          },
        );
        if (aiRes.ok) {
          const data = await aiRes.json();
          styleProfile = data.styleProfile || data;
        } else {
          log.warn(
            { status: aiRes.status },
            "AI service returned non-OK status",
          );
        }
      } catch (err) {
        log.warn(
          { err },
          "Error calling AI service for style analysis, falling back to heuristics",
        );
      }
    }


    res.status(200).json(styleProfile);
  } catch (err) {
    log.error({ err }, "Error during style analysis");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateUserPrefe : RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const { preferences } = req.body as {
    preferences?: Record<string, unknown>;
  };

  try {
    if (!preferences) {
      res.status(400).json({ error: "Preferences are required" });
      return;
    }
    const currentUser = await prisma.user.findUnique({
      where: { id: authReq.user!.id },
      select: { preferences: true },
    }); 
    const currentPreferences =       (currentUser?.preferences as Record<string, unknown>) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences,
    };
    const user = await prisma.user.update({
      where: { id: authReq.user!.id },
      data: {
        preferences: updatedPreferences as any,
      }
    });

    res.status(200).json({ success: true});
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
