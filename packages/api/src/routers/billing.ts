import { db } from "@car-health-genius/db";
import { subscription } from "@car-health-genius/db/schema/subscription";
import { polarClient } from "@car-health-genius/auth/lib/payments";
import { env } from "@car-health-genius/env/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import {
  MONETIZATION_EVENTS,
  trackAnalyticsEvent,
} from "../services/analytics.service";
import {
  PRO_FEATURE_KEYS,
  resolveEntitlements,
} from "../services/entitlement.service";
import { computeSavingsSummary } from "../services/savings.service";
import { resolveSupportPriority } from "../services/supportPriority.service";

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
  checkoutUrl: z.string().url(),
});

const entitlementOutputSchema = z.object({
  featureKey: z.string(),
  source: z.enum(["entitlement", "subscription"]),
});

const supportPriorityOutputSchema = z.object({
  priorityTier: z.enum(["priority", "standard"]),
  priorityReason: z.string(),
  slaTargetMinutes: z.number().int().positive(),
});

const analyticsTrackOutputSchema = z.object({
  recorded: z.boolean(),
  eventKey: z.string(),
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

function productIdForPlan(plan: "monthly" | "annual") {
  return plan === "annual"
    ? env.POLAR_PRODUCT_ID_PRO_ANNUAL
    : env.POLAR_PRODUCT_ID_PRO_MONTHLY;
}

export const billingRouter = router({
  hasFeature: protectedProcedure
    .input(
      z.object({
        featureKey: z.string().trim().min(1),
      }),
    )
    .output(
      z.object({
        featureKey: z.string(),
        enabled: z.boolean(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const snapshot = await resolveEntitlements(ctx.session.user.id);
      return {
        featureKey: input.featureKey,
        enabled: snapshot.features.includes(
          input.featureKey as (typeof snapshot.features)[number],
        ),
      };
    }),

  listKnownProFeatures: protectedProcedure
    .output(z.array(z.string()))
    .query(() => [...PRO_FEATURE_KEYS]),

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
        subscription: latestSubscription
          ? mapSubscriptionRow(latestSubscription)
          : null,
      };
    }),

  getEntitlements: protectedProcedure
    .output(
      z.object({
        plan: z.string(),
        subscriptionStatus: z.string(),
        features: z.array(entitlementOutputSchema),
      }),
    )
    .query(async ({ ctx }) => {
      const snapshot = await resolveEntitlements(ctx.session.user.id);
      return {
        plan: snapshot.plan,
        subscriptionStatus: snapshot.subscriptionStatus,
        features: snapshot.features.map((featureKey) => ({
          featureKey,
          source: snapshot.sources[featureKey],
        })),
      };
    }),

  getSupportPriority: protectedProcedure
    .output(supportPriorityOutputSchema)
    .query(async ({ ctx }) => {
      return resolveSupportPriority(ctx.session.user.id);
    }),

  getSavingsSummary: protectedProcedure
    .output(
      z.object({
        totalEstimatedRangeLowCents: z.number().int().nonnegative(),
        totalEstimatedRangeHighCents: z.number().int().nonnegative(),
        totalActualCents: z.number().int().nonnegative(),
        estimatedSavingsLowCents: z.number().int().nonnegative(),
        estimatedSavingsHighCents: z.number().int().nonnegative(),
        outcomeCount: z.number().int().nonnegative(),
        estimateCount: z.number().int().nonnegative(),
        confidenceNote: z.string(),
        disclaimer: z.string(),
      }),
    )
    .query(async ({ ctx }) => {
      return computeSavingsSummary(ctx.session.user.id);
    }),

  trackPaywallView: protectedProcedure
    .input(
      z.object({
        channel: z.enum(["web", "native"]),
        source: z.string().trim().min(1),
        eventKey: z.string().trim().min(8).max(120).optional(),
      }),
    )
    .output(analyticsTrackOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const tracked = await trackAnalyticsEvent({
        eventName: MONETIZATION_EVENTS.PAYWALL_VIEW,
        userId: ctx.session.user.id,
        channel: input.channel,
        source: input.source,
        eventKey: input.eventKey,
      });

      return {
        recorded: tracked.inserted,
        eventKey: tracked.eventKey,
      };
    }),

  trackUpgradeSuccess: protectedProcedure
    .input(
      z.object({
        channel: z.enum(["web", "native"]),
        source: z.string().trim().min(1),
        plan: z.enum(["monthly", "annual"]),
        eventKey: z.string().trim().min(8).max(120).optional(),
      }),
    )
    .output(analyticsTrackOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const tracked = await trackAnalyticsEvent({
        eventName: MONETIZATION_EVENTS.UPGRADE_SUCCESS,
        userId: ctx.session.user.id,
        channel: input.channel,
        source: input.source,
        eventKey: input.eventKey,
        properties: {
          plan: input.plan,
        },
      });

      return {
        recorded: tracked.inserted,
        eventKey: tracked.eventKey,
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
    .mutation(async ({ ctx, input }) => {
      const productId = productIdForPlan(input.plan);
      const successUrl = input.successUrl ?? env.POLAR_SUCCESS_URL;

      const checkout = await polarClient.checkouts.create({
        products: [productId],
        successUrl,
      });

      await trackAnalyticsEvent({
        eventName: MONETIZATION_EVENTS.UPGRADE_START,
        userId: ctx.session.user.id,
        channel: "server",
        source: "billing.createCheckoutSession",
        properties: { plan: input.plan, productId },
      });

      return { checkoutUrl: checkout.url };
    }),
});
