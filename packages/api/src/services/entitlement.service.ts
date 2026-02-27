import { db } from "@car-health-genius/db";
import { entitlement } from "@car-health-genius/db/schema/entitlement";
import { subscription } from "@car-health-genius/db/schema/subscription";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";

export const PRO_FEATURE_KEYS = [
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

type CachedValue = {
  expiresAtMs: number;
  value: ResolvedEntitlements;
};

const entitlementCache = new Map<string, CachedValue>();
const cacheTtlMs = 15_000;

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

export type ResolvedEntitlements = {
  userId: string;
  plan: string;
  source: "none" | "entitlement" | "subscription" | "entitlement+subscription";
  features: Record<string, boolean>;
  resolvedAt: string;
};

function isSubscriptionEntitledStatus(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

function hasUnexpiredPeriodEnd(value: Date | string | null): boolean {
  if (value === null) {
    return true;
  }

  const periodEnd = value instanceof Date ? value : new Date(value);
  return periodEnd.getTime() > Date.now();
}

export function invalidateEntitlementCache(userId: string) {
  entitlementCache.delete(userId);
}

export async function resolveEntitlements(
  userId: string,
  options: {
    skipCache?: boolean;
  } = {},
): Promise<ResolvedEntitlements> {
  const startedAt = Date.now();
  const now = Date.now();
  const cached = entitlementCache.get(userId);
  if (!options.skipCache && cached && cached.expiresAtMs > now) {
    logMetric("entitlement_resolve_cache_hit_total", 1, { userId });
    return cached.value;
  }

  const nowDate = new Date();
  const [explicitRows, latestSubscription] = await Promise.all([
    db
      .select({
        featureKey: entitlement.featureKey,
      })
      .from(entitlement)
      .where(
        and(
          eq(entitlement.userId, userId),
          eq(entitlement.isEnabled, true),
          or(gt(entitlement.expiresAt, nowDate), isNull(entitlement.expiresAt)),
        ),
      ),
    db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, userId))
      .orderBy(desc(subscription.updatedAt))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const features: Record<string, boolean> = {};
  for (const key of PRO_FEATURE_KEYS) {
    features[key] = false;
  }

  for (const row of explicitRows) {
    features[row.featureKey] = true;
  }

  const subscriptionGrantsPro =
    latestSubscription !== null &&
    isSubscriptionEntitledStatus(latestSubscription.status) &&
    hasUnexpiredPeriodEnd(latestSubscription.currentPeriodEnd);

  if (subscriptionGrantsPro) {
    for (const key of PRO_FEATURE_KEYS) {
      features[key] = true;
    }
  }

  const source: ResolvedEntitlements["source"] =
    explicitRows.length > 0 && subscriptionGrantsPro
      ? "entitlement+subscription"
      : explicitRows.length > 0
        ? "entitlement"
        : subscriptionGrantsPro
          ? "subscription"
          : "none";

  const resolved: ResolvedEntitlements = {
    userId,
    plan: subscriptionGrantsPro ? latestSubscription?.plan ?? "pro" : "free",
    source,
    features,
    resolvedAt: new Date().toISOString(),
  };

  entitlementCache.set(userId, {
    expiresAtMs: now + cacheTtlMs,
    value: resolved,
  });

  logMetric("entitlement_resolve_latency_ms", Date.now() - startedAt, {
    userId,
    source,
    plan: resolved.plan,
    featureCount: Object.keys(resolved.features).length,
  });

  return resolved;
}

export async function hasEntitlement(
  userId: string,
  featureKey: string,
  options: {
    skipCache?: boolean;
  } = {},
): Promise<boolean> {
  const resolved = await resolveEntitlements(userId, options);
  return resolved.features[featureKey] === true;
}

export async function requireEntitlement(
  userId: string,
  featureKey: string,
  options: {
    skipCache?: boolean;
  } = {},
): Promise<void> {
  const permitted = await hasEntitlement(userId, featureKey, options);
  if (permitted) {
    return;
  }

  logMetric("entitlement_denied_total", 1, {
    userId,
    featureKey,
  });

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "This feature requires Pro access",
    cause: {
      businessCode: "PRO_UPGRADE_REQUIRED",
      featureKey,
    },
  });
}
