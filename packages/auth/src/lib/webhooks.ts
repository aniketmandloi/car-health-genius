import { db } from "@car-health-genius/db";
import { billingWebhookEvent } from "@car-health-genius/db/schema/billingWebhookEvent";
import { entitlement } from "@car-health-genius/db/schema/entitlement";
import { subscription } from "@car-health-genius/db/schema/subscription";
import { env } from "@car-health-genius/env/server";

const PRO_FEATURE_KEYS = [
  "pro.advanced_diagnostics",
  "pro.likely_causes",
  "pro.diy_guides",
  "pro.cost_estimates",
  "pro.negotiation_script",
  "pro.maintenance_prediction",
  "pro.health_score",
  "pro.pdf_export",
  "support.priority",
] as const;

type WebhookPayload = {
  type: string;
  timestamp: Date | string;
  data: unknown;
};

type SubscriptionProjection = {
  userId: string;
  providerSubscriptionId: string;
  status: string;
  plan: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAt: Date | null;
  canceledAt: Date | null;
};

function logMetric(metric: string, value: number, metadata: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      level: "info",
      event: "metric",
      metric,
      value,
      ...metadata,
    }),
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(source: Record<string, unknown> | null, key: string): string | null {
  if (!source) {
    return null;
  }

  const value = source[key];
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readBoolean(source: Record<string, unknown> | null, key: string): boolean | null {
  if (!source) {
    return null;
  }

  const value = source[key];
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }

  return null;
}

function readDate(source: Record<string, unknown> | null, key: string): Date | null {
  if (!source) {
    return null;
  }

  const value = source[key];
  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function sanitizePayloadForStorage(payload: WebhookPayload): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(payload, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }

      return value;
    }),
  ) as Record<string, unknown>;
}

function buildProviderEventKey(payload: WebhookPayload): string {
  const data = asRecord(payload.data);
  const dataId = readString(data, "id");
  const customer = asRecord(data?.customer);
  const customerId = readString(customer, "id");
  const externalId = readString(customer, "externalId") ?? readString(data, "externalId");

  return [payload.type, toIso(payload.timestamp), dataId ?? "none", customerId ?? "none", externalId ?? "none"].join(":");
}

function mapPlanFromProductId(productId: string | null): string {
  if (productId === env.POLAR_PRODUCT_ID_PRO_ANNUAL) {
    return "annual";
  }

  if (productId === env.POLAR_PRODUCT_ID_PRO_MONTHLY) {
    return "monthly";
  }

  return "pro";
}

function isProStatus(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

function resolveSubscriptionProjection(payload: WebhookPayload): SubscriptionProjection | null {
  const data = asRecord(payload.data);
  if (!data) {
    return null;
  }

  const customer = asRecord(data.customer);
  const userId = readString(customer, "externalId") ?? readString(data, "externalId");
  const providerSubscriptionId = readString(data, "id");
  if (!userId || !providerSubscriptionId) {
    return null;
  }

  const status = (readString(data, "status") ?? "inactive").toLowerCase();
  const productId = readString(data, "productId");
  const currentPeriodStart = readDate(data, "currentPeriodStart");
  const currentPeriodEnd = readDate(data, "currentPeriodEnd");
  const cancelAtPeriodEnd = readBoolean(data, "cancelAtPeriodEnd") ?? false;
  const canceledAt = readDate(data, "canceledAt");

  return {
    userId,
    providerSubscriptionId,
    status,
    plan: mapPlanFromProductId(productId),
    currentPeriodStart,
    currentPeriodEnd,
    cancelAt: cancelAtPeriodEnd ? currentPeriodEnd : null,
    canceledAt,
  };
}

function resolveFromCustomerState(payload: WebhookPayload): SubscriptionProjection | null {
  const data = asRecord(payload.data);
  if (!data) {
    return null;
  }

  const userId = readString(data, "externalId");
  const activeSubscriptions = Array.isArray(data.activeSubscriptions)
    ? data.activeSubscriptions.filter((entry): entry is Record<string, unknown> => Boolean(asRecord(entry)))
    : [];

  if (!userId) {
    return null;
  }

  if (activeSubscriptions.length === 0) {
    return {
      userId,
      providerSubscriptionId: `customer-state:${userId}`,
      status: "canceled",
      plan: "free",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAt: null,
      canceledAt: new Date(),
    };
  }

  const first = asRecord(activeSubscriptions[0]);
  if (!first) {
    return null;
  }

  const providerSubscriptionId = readString(first, "id");
  if (!providerSubscriptionId) {
    return null;
  }

  return {
    userId,
    providerSubscriptionId,
    status: (readString(first, "status") ?? "active").toLowerCase(),
    plan: mapPlanFromProductId(readString(first, "productId")),
    currentPeriodStart: readDate(first, "currentPeriodStart"),
    currentPeriodEnd: readDate(first, "currentPeriodEnd"),
    cancelAt: (readBoolean(first, "cancelAtPeriodEnd") ?? false) ? readDate(first, "currentPeriodEnd") : null,
    canceledAt: readDate(first, "canceledAt"),
  };
}

async function upsertSubscription(database: any, projection: SubscriptionProjection) {
  await database
    .insert(subscription)
    .values({
      userId: projection.userId,
      provider: "polar",
      providerSubscriptionId: projection.providerSubscriptionId,
      plan: projection.plan,
      status: projection.status,
      currentPeriodStart: projection.currentPeriodStart,
      currentPeriodEnd: projection.currentPeriodEnd,
      cancelAt: projection.cancelAt,
      canceledAt: projection.canceledAt,
    })
    .onConflictDoUpdate({
      target: subscription.providerSubscriptionId,
      set: {
        userId: projection.userId,
        plan: projection.plan,
        status: projection.status,
        currentPeriodStart: projection.currentPeriodStart,
        currentPeriodEnd: projection.currentPeriodEnd,
        cancelAt: projection.cancelAt,
        canceledAt: projection.canceledAt,
      },
    });
}

async function syncProEntitlements(
  database: any,
  userId: string,
  enabled: boolean,
  projection: SubscriptionProjection,
  eventType: string,
) {
  const expiresAt = enabled ? projection.currentPeriodEnd : new Date();
  const metadata = {
    provider: "polar",
    providerSubscriptionId: projection.providerSubscriptionId,
    status: projection.status,
    eventType,
    syncedAt: new Date().toISOString(),
  };

  for (const featureKey of PRO_FEATURE_KEYS) {
    await database
      .insert(entitlement)
      .values({
        userId,
        featureKey,
        source: "subscription",
        isEnabled: enabled,
        grantedAt: new Date(),
        expiresAt,
        metadata,
      })
      .onConflictDoUpdate({
        target: [entitlement.userId, entitlement.featureKey],
        set: {
          source: "subscription",
          isEnabled: enabled,
          expiresAt,
          metadata,
        },
      });
  }
}

async function projectPayload(payload: WebhookPayload) {
  const projection =
    payload.type === "customer.state_changed" ? resolveFromCustomerState(payload) : resolveSubscriptionProjection(payload);

  if (!projection) {
    return;
  }

  await db.transaction(async (tx) => {
    await upsertSubscription(tx, projection);
    await syncProEntitlements(tx, projection.userId, isProStatus(projection.status), projection, payload.type);
  });
}

export async function handlePolarWebhookPayload(rawPayload: unknown): Promise<void> {
  const startedAt = Date.now();
  const payload = rawPayload as WebhookPayload;
  if (!payload || typeof payload.type !== "string" || payload.data === undefined || payload.timestamp === undefined) {
    return;
  }

  const providerEventKey = buildProviderEventKey(payload);
  const sanitizedPayload = sanitizePayloadForStorage(payload);

  const [receipt] = await db
    .insert(billingWebhookEvent)
    .values({
      provider: "polar",
      eventType: payload.type,
      providerEventKey,
      status: "received",
      payload: sanitizedPayload,
    })
    .onConflictDoNothing({
      target: billingWebhookEvent.providerEventKey,
    })
    .returning({
      id: billingWebhookEvent.id,
    });

  if (!receipt) {
    logMetric("billing_webhook_duplicate_total", 1, {
      provider: "polar",
      eventType: payload.type,
      providerEventKey,
    });
    return;
  }

  logMetric("billing_webhook_received_total", 1, {
    provider: "polar",
    eventType: payload.type,
    providerEventKey,
  });

  try {
    await projectPayload(payload);
    await db
      .insert(billingWebhookEvent)
      .values({
        provider: "polar",
        eventType: payload.type,
        providerEventKey,
        status: "processed",
        payload: sanitizedPayload,
        processedAt: new Date(),
        errorMessage: null,
      })
      .onConflictDoUpdate({
        target: billingWebhookEvent.providerEventKey,
        set: {
          status: "processed",
          payload: sanitizedPayload,
          processedAt: new Date(),
          errorMessage: null,
        },
      });

    logMetric("billing_webhook_processed_total", 1, {
      provider: "polar",
      eventType: payload.type,
      providerEventKey,
    });
    logMetric("billing_webhook_processing_latency_ms", Date.now() - startedAt, {
      provider: "polar",
      eventType: payload.type,
      providerEventKey,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.slice(0, 512) : "Unknown webhook processing error";
    await db
      .insert(billingWebhookEvent)
      .values({
        provider: "polar",
        eventType: payload.type,
        providerEventKey,
        status: "failed",
        payload: sanitizedPayload,
        processedAt: new Date(),
        errorMessage,
      })
      .onConflictDoUpdate({
        target: billingWebhookEvent.providerEventKey,
        set: {
          status: "failed",
          payload: sanitizedPayload,
          processedAt: new Date(),
          errorMessage,
        },
      });

    logMetric("billing_webhook_failed_total", 1, {
      provider: "polar",
      eventType: payload.type,
      providerEventKey,
      errorMessage,
    });
    logMetric("billing_webhook_processing_latency_ms", Date.now() - startedAt, {
      provider: "polar",
      eventType: payload.type,
      providerEventKey,
      status: "failed",
    });
    throw error;
  }
}
