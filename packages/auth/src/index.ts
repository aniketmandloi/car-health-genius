import { expo } from "@better-auth/expo";
import { db } from "@car-health-genius/db";
import { analyticsEvent } from "@car-health-genius/db/schema/analyticsEvent";
import * as schema from "@car-health-genius/db/schema/auth";
import { entitlement } from "@car-health-genius/db/schema/entitlement";
import { subscription } from "@car-health-genius/db/schema/subscription";
import { env } from "@car-health-genius/env/server";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { polarClient } from "./lib/payments";

const PRO_FEATURE_KEYS = [
  "pro.advanced_sensors",
  "pro.likely_causes",
  "pro.diy_guides",
  "pro.cost_estimates",
  "pro.negotiation_script",
  "pro.maintenance_prediction",
  "pro.health_score",
  "pro.pdf_export",
  "pro.priority_support",
] as const;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

type SubscriptionWebhookPayload = {
  type: string;
  timestamp: Date;
  data: {
    id: string;
    status: string;
    recurringInterval?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date | null;
    canceledAt?: Date | null;
    cancelAtPeriodEnd?: boolean;
    productId?: string;
    customer: {
      externalId: string | null;
    };
  };
};

function inferPlan(payload: SubscriptionWebhookPayload): string {
  const recurringInterval = payload.data.recurringInterval?.toLowerCase();
  if (recurringInterval === "year") {
    return "pro-annual";
  }

  return "pro-monthly";
}

async function trackChurnEvent(payload: SubscriptionWebhookPayload, userId: string) {
  const churnStatuses = new Set(["canceled", "unpaid", "incomplete_expired"]);
  if (!churnStatuses.has(payload.data.status.toLowerCase())) {
    return;
  }

  await db
    .insert(analyticsEvent)
    .values({
      eventName: "subscription_churn",
      eventKey: `churn:${payload.data.id}:${payload.timestamp.toISOString()}`,
      userId,
      channel: "server",
      source: `polar.${payload.type}`,
      occurredAt: payload.timestamp,
      properties: {
        status: payload.data.status,
        providerSubscriptionId: payload.data.id,
      },
    })
    .onConflictDoNothing({
      target: analyticsEvent.eventKey,
    });
}

async function syncSubscriptionProjection(rawPayload: unknown) {
  const payload = rawPayload as SubscriptionWebhookPayload;
  const userId = payload.data.customer.externalId;

  if (!userId) {
    return;
  }

  const status = payload.data.status.toLowerCase();
  const plan = inferPlan(payload);
  const isEnabled = ACTIVE_SUBSCRIPTION_STATUSES.has(status);

  await db
    .insert(subscription)
    .values({
      userId,
      provider: "polar",
      providerSubscriptionId: payload.data.id,
      plan,
      status,
      currentPeriodStart: payload.data.currentPeriodStart ?? null,
      currentPeriodEnd: payload.data.currentPeriodEnd ?? null,
      cancelAt: payload.data.cancelAtPeriodEnd ? (payload.data.currentPeriodEnd ?? null) : null,
      canceledAt: payload.data.canceledAt ?? null,
    })
    .onConflictDoUpdate({
      target: subscription.providerSubscriptionId,
      set: {
        userId,
        plan,
        status,
        currentPeriodStart: payload.data.currentPeriodStart ?? null,
        currentPeriodEnd: payload.data.currentPeriodEnd ?? null,
        cancelAt: payload.data.cancelAtPeriodEnd ? (payload.data.currentPeriodEnd ?? null) : null,
        canceledAt: payload.data.canceledAt ?? null,
      },
    });

  await Promise.all(
    PRO_FEATURE_KEYS.map((featureKey) =>
      db
        .insert(entitlement)
        .values({
          userId,
          featureKey,
          source: "subscription",
          isEnabled,
          expiresAt: payload.data.currentPeriodEnd ?? null,
          metadata: {
            provider: "polar",
            providerSubscriptionId: payload.data.id,
            status,
            plan,
          },
        })
        .onConflictDoUpdate({
          target: [entitlement.userId, entitlement.featureKey],
          set: {
            source: "subscription",
            isEnabled,
            expiresAt: payload.data.currentPeriodEnd ?? null,
            metadata: {
              provider: "polar",
              providerSubscriptionId: payload.data.id,
              status,
              plan,
            },
          },
        }),
    ),
  );

  await trackChurnEvent(payload, userId);
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [
    env.CORS_ORIGIN,
    "mybettertapp://",
    "car-health-genius://",
    ...(env.NODE_ENV === "development"
      ? ["exp://", "exp://**", "exp://192.168.*.*:*/**", "http://localhost:8081"]
      : []),
  ],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      enableCustomerPortal: true,
      use: [
        checkout({
          products: [
            {
              productId: env.POLAR_PRODUCT_ID_PRO_MONTHLY,
              slug: "pro-monthly",
            },
            {
              productId: env.POLAR_PRODUCT_ID_PRO_ANNUAL,
              slug: "pro-annual",
            },
          ],
          successUrl: env.POLAR_SUCCESS_URL,
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          onSubscriptionCreated: syncSubscriptionProjection,
          onSubscriptionUpdated: syncSubscriptionProjection,
          onSubscriptionActive: syncSubscriptionProjection,
          onSubscriptionCanceled: syncSubscriptionProjection,
          onSubscriptionRevoked: syncSubscriptionProjection,
          onSubscriptionUncanceled: syncSubscriptionProjection,
        }),
      ],
    }),
    expo(),
  ],
});
