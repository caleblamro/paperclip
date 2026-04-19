import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { subscriptions } from "@paperclipai/db";
import Stripe from "stripe";

export function billingService(db: Db, stripeSecretKey?: string) {
  const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

  return {
    async getSubscription(userId: string) {
      const rows = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId));
      return rows[0] ?? null;
    },

    async getSubscriptionByCustomerId(stripeCustomerId: string) {
      const rows = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeCustomerId, stripeCustomerId));
      return rows[0] ?? null;
    },

    async hasActiveSubscription(userId: string): Promise<boolean> {
      const sub = await this.getSubscription(userId);
      if (!sub) return false;
      return sub.status === "active" || sub.status === "trialing";
    },

    async upsertSubscription(data: {
      userId: string;
      stripeCustomerId: string;
      stripeSubscriptionId: string | null;
      status: string;
      currentPeriodEnd: Date | null;
    }) {
      const now = new Date();
      const existing = await this.getSubscription(data.userId);
      if (existing) {
        await db
          .update(subscriptions)
          .set({
            stripeCustomerId: data.stripeCustomerId,
            stripeSubscriptionId: data.stripeSubscriptionId,
            status: data.status,
            currentPeriodEnd: data.currentPeriodEnd,
            updatedAt: now,
          })
          .where(eq(subscriptions.userId, data.userId));
      } else {
        await db.insert(subscriptions).values({
          userId: data.userId,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: data.stripeSubscriptionId,
          status: data.status,
          currentPeriodEnd: data.currentPeriodEnd,
          createdAt: now,
          updatedAt: now,
        });
      }
    },

    async upsertSubscriptionByCustomerId(data: {
      stripeCustomerId: string;
      stripeSubscriptionId: string;
      status: string;
      currentPeriodEnd: Date | null;
    }) {
      const existing = await this.getSubscriptionByCustomerId(data.stripeCustomerId);
      if (!existing) return;
      const now = new Date();
      await db
        .update(subscriptions)
        .set({
          stripeSubscriptionId: data.stripeSubscriptionId,
          status: data.status,
          currentPeriodEnd: data.currentPeriodEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.stripeCustomerId, data.stripeCustomerId));
    },

    async createCheckoutSession(userId: string, email: string, priceId: string, publicUrl: string) {
      if (!stripe) throw new Error("Stripe is not configured");
      let sub = await this.getSubscription(userId);
      let customerId = sub?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({ email, metadata: { userId } });
        customerId = customer.id;
        await this.upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: null,
          status: "incomplete",
          currentPeriodEnd: null,
        });
      }
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${publicUrl}?billing=success`,
        cancel_url: `${publicUrl}?billing=canceled`,
      });
      return { url: session.url };
    },

    async createPortalSession(userId: string, publicUrl: string) {
      if (!stripe) throw new Error("Stripe is not configured");
      const sub = await this.getSubscription(userId);
      if (!sub?.stripeCustomerId) throw new Error("No subscription found");
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: publicUrl,
      });
      return { url: session.url };
    },

    constructWebhookEvent(payload: string | Buffer, signature: string, webhookSecret: string) {
      if (!stripe) throw new Error("Stripe is not configured");
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    },
  };
}
