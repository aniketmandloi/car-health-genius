import { db } from "@car-health-genius/db";
import { subscription } from "@car-health-genius/db/schema/subscription";
import { env } from "@car-health-genius/env/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { PRO_FEATURE_KEYS, hasEntitlement, resolveEntitlements } from "../services/entitlement.service";

const subscriptionOutputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  provider: z.string(),
  providerSubscriptionId: z.string(),
  plan: z.string(),
  status: z.string(),
  currentPeriodStart: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  cancelAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const checkoutIntentOutputSchema = z.object({
  status: z.literal("pending"),
  plan: z.enum(["monthly", "annual"]),
  productId: z.string(),
  slug: z.literal("pro"),
  successUrl: z.string().url(),
  checkoutPath: z.literal("/api/auth/checkout"),
  checkoutIntentId: z.string(),
});

const entitlementsOutputSchema = z.object({
  userId: z.string(),
  plan: z.string(),
  source: z.enum(["none", "entitlement", "subscription", "entitlement+subscription"]),
  features: z.record(z.string(), z.boolean()),
  resolvedAt: z.string(),
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toIsoNullable(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  return toIso(value);
}

function mapSubscriptionRow(row: typeof subscription.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    providerSubscriptionId: row.providerSubscriptionId,
    plan: row.plan,
    status: row.status,
    currentPeriodStart: toIsoNullable(row.currentPeriodStart),
    currentPeriodEnd: toIsoNullable(row.currentPeriodEnd),
    cancelAt: toIsoNullable(row.cancelAt),
    canceledAt: toIsoNullable(row.canceledAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export const billingRouter = router({
  getEntitlements: protectedProcedure
    .output(entitlementsOutputSchema)
    .query(async ({ ctx }) => resolveEntitlements(ctx.session.user.id)),

  hasFeature: protectedProcedure
    .input(
      z.object({
        featureKey: z.string().trim().min(1),
      }),
    )
    .output(z.object({ featureKey: z.string(), enabled: z.boolean() }))
    .query(async ({ ctx, input }) => ({
      featureKey: input.featureKey,
      enabled: await hasEntitlement(ctx.session.user.id, input.featureKey),
    })),

  listKnownProFeatures: protectedProcedure.output(z.array(z.string())).query(() => [...PRO_FEATURE_KEYS]),

  getSubscription: protectedProcedure
    .output(z.object({ subscription: subscriptionOutputSchema.nullable() }))
    .query(async ({ ctx }) => {
      const [latestSubscription] = await db
        .select()
        .from(subscription)
        .where(eq(subscription.userId, ctx.session.user.id))
        .orderBy(desc(subscription.updatedAt))
        .limit(1);

      return {
        subscription: latestSubscription ? mapSubscriptionRow(latestSubscription) : null,
      };
    }),

  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["monthly", "annual"]),
        successUrl: z.string().url().optional(),
      }),
    )
    .output(checkoutIntentOutputSchema)
    .mutation(async ({ input }) => {
      const productId = input.plan === "monthly" ? env.POLAR_PRODUCT_ID_PRO_MONTHLY : env.POLAR_PRODUCT_ID_PRO_ANNUAL;

      return {
        status: "pending",
        plan: input.plan,
        productId,
        slug: "pro",
        successUrl: input.successUrl ?? env.POLAR_SUCCESS_URL,
        checkoutPath: "/api/auth/checkout",
        checkoutIntentId: crypto.randomUUID(),
      };
    }),
});
