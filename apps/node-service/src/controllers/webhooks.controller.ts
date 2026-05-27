import { Request, RequestHandler, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import Stripe from "stripe";

// Initialize Stripe if secret is present
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, {
      apiVersion: "2025-02-18-preview" as any,
    })
  : null;

export const createUpgradeSession: RequestHandler = async (req, res) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user!.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Dev mode auto-upgrade fallback if Stripe is not configured
    if (!stripe) {
      console.log("Stripe Secret Key not configured. Dev mode auto-upgrade activated.");
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          plan: "paid",
          billingPeriodStart: new Date(),
        },
      });

      const frontendUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      res.json({
        checkoutUrl: `${frontendUrl}/settings?upgrade=success&mock=true`,
        user: updatedUser,
      });
      return;
    }

    // Create real Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || "price_mock",
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: process.env.STRIPE_SUCCESS_URL || "http://localhost:3000/settings?upgrade=success",
      cancel_url: process.env.STRIPE_CANCEL_URL || "http://localhost:3000/settings?upgrade=cancelled",
      customer_email: user.email,
      metadata: {
        userId: user.id,
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err: any) {
    console.log("Error creating upgrade checkout session:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleStripeWebhook: RequestHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event: any;

  try {
    // Real Stripe Signature Verification
    if (stripe && process.env.STRIPE_WEBHOOK_SECRET && sig) {
      const rawBody = (req as any).rawBody || req.body;
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // Direct parsing for dev local environment
      console.log("Skipping Stripe signature verification in development mode.");
      event = req.body;
    }
  } catch (err: any) {
    console.log("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const session = event.data?.object as any;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const userId = session.metadata?.userId;
        const stripeCustomerId = session.customer as string;
        const stripeSubId = session.subscription as string;

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: "paid",
              stripeCustomerId,
              stripeSubId,
              billingPeriodStart: new Date(),
            },
          });
          console.log(`Stripe Webhook: User ${userId} upgraded to Premium.`);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const stripeCustomerId = session.customer as string;
        const stripeSubId = session.id as string;
        const status = session.status;

        if (stripeCustomerId) {
          if (status === "active") {
            await prisma.user.update({
              where: { stripeCustomerId },
              data: {
                plan: "paid",
                stripeSubId,
              },
            });
            console.log(`Stripe Sync: Customer ${stripeCustomerId} updated to Paid plan.`);
          } else {
            await prisma.user.update({
              where: { stripeCustomerId },
              data: {
                plan: "free",
                stripeSubId: null,
              },
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeCustomerId = session.customer as string;
        if (stripeCustomerId) {
          await prisma.user.update({
            where: { stripeCustomerId },
            data: {
              plan: "free",
              stripeSubId: null,
            },
          });
          console.log(`Stripe Webhook Downgrade: Customer ${stripeCustomerId} reverted to Free plan.`);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    console.log("Error handling Stripe event:", err);
    res.status(500).json({ error: "Webhook event handler failed" });
  }
};

