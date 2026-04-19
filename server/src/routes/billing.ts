import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { billingService } from "../services/billing.js";
import { unauthorized, badRequest, forbidden } from "../errors.js";
import { assertBoard } from "./authz.js";
import { logger } from "../middleware/logger.js";

interface BillingRouteOpts {
  stripeSecretKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  stripePriceId: string | undefined;
  publicUrl: string | undefined;
}

export function billingRoutes(db: Db, opts: BillingRouteOpts) {
  const router = Router();
  const billing = billingService(db, opts.stripeSecretKey);

  router.get("/status", async (req, res) => {
    assertBoard(req);
    if (!req.actor.userId) throw unauthorized();
    const sub = await billing.getSubscription(req.actor.userId);
    res.json({
      active: sub ? sub.status === "active" || sub.status === "trialing" : false,
      status: sub?.status ?? null,
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
      stripeCustomerId: sub?.stripeCustomerId ?? null,
    });
  });

  router.post("/checkout", async (req, res) => {
    assertBoard(req);
    if (!req.actor.userId) throw unauthorized();
    if (!opts.stripeSecretKey || !opts.stripePriceId) {
      throw badRequest("Stripe billing is not configured");
    }
    const publicUrl = opts.publicUrl || "http://localhost:3100";
    const result = await billing.createCheckoutSession(
      req.actor.userId,
      req.actor.userEmail ?? "",
      opts.stripePriceId,
      publicUrl,
    );
    res.json(result);
  });

  router.post("/portal", async (req, res) => {
    assertBoard(req);
    if (!req.actor.userId) throw unauthorized();
    const publicUrl = opts.publicUrl || "http://localhost:3100";
    const result = await billing.createPortalSession(req.actor.userId, publicUrl);
    res.json(result);
  });

  router.post("/webhook", async (req, res) => {
    if (!opts.stripeWebhookSecret || !opts.stripeSecretKey) {
      res.status(400).json({ error: "Stripe webhooks not configured" });
      return;
    }
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      res.status(400).json({ error: "Missing request body" });
      return;
    }

    let event;
    try {
      event = billing.constructWebhookEvent(rawBody, signature, opts.stripeWebhookSecret);
    } catch (err) {
      logger.warn(`Stripe webhook signature verification failed: ${err}`);
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.customer && session.subscription) {
          const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await billing.upsertSubscriptionByCustomerId({
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status: "active",
            currentPeriodEnd: null,
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as unknown as Record<string, unknown>;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : (subscription.customer as { id: string }).id;
        const periodEnd = subscription.current_period_end as number | undefined;
        await billing.upsertSubscriptionByCustomerId({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id as string,
          status: subscription.status as string,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : ((invoice.customer as { id?: string })?.id ?? null);
        const sub = invoice.subscription;
        const subId = typeof sub === "string" ? sub : ((sub as { id?: string })?.id ?? "");
        if (customerId) {
          await billing.upsertSubscriptionByCustomerId({
            stripeCustomerId: customerId,
            stripeSubscriptionId: subId,
            status: "past_due",
            currentPeriodEnd: null,
          });
        }
        break;
      }
      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  });

  return router;
}
