import { db } from "@car-health-genius/db";
import { entitlement } from "@car-health-genius/db/schema/entitlement";
import { subscription } from "@car-health-genius/db/schema/subscription";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";

export const PRO_FEATURE_KEYS = [
  "pro.advanced_sensors",
  "pro.advanced_diagnostics",
  "pro.likely_causes",
  "pro.diy_guides",
  "pro.cost_estimates",
  "pro.negotiation_script",
  "pro.maintenance_prediction",
  "pro.health_score",
  "pro.pdf_export",
  "pro.priority_support",
  "support.priority",
] as const;

export type ProFeatureKey = (typeof PRO_FEATURE_KEYS)[number];

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

export type EntitlementSnapshot = {
  userId: string;
  features: ProFeatureKey[];
  sources: Record<ProFeatureKey, "entitlement" | "subscription">;
  plan: string;
  subscriptionStatus: string;
};

function normalizePlanToFeatures(plan: string, status: string): ProFeatureKey[] {
  const normalizedPlan = plan.trim().toLowerCase();
  const normalizedStatus = status.trim().toLowerCase();

  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(normalizedStatus)) {
    return [];
  }

  if (!normalizedPlan.includes("pro")) {
    return [];
  }

  return [...PRO_FEATURE_KEYS];
}

export async function resolveEntitlements(userId: string): Promise<EntitlementSnapshot> {
  const now = new Date();

  const [entitlementRows, latestSubscription] = await Promise.all([
    db
      .select({
        featureKey: entitlement.featureKey,
      })
      .from(entitlement)
      .where(
        and(
          eq(entitlement.userId, userId),
          eq(entitlement.isEnabled, true),
          or(isNull(entitlement.expiresAt), gt(entitlement.expiresAt, now)),
        ),
      ),
    db
      .select({
        plan: subscription.plan,
        status: subscription.status,
      })
      .from(subscription)
      .where(eq(subscription.userId, userId))
      .orderBy(desc(subscription.updatedAt))
      .limit(1)
      .then((rows) => rows[0] ?? { plan: "free", status: "inactive" }),
  ]);

  const byFeature = new Map<ProFeatureKey, "entitlement" | "subscription">();

  for (const row of entitlementRows) {
    if (!PRO_FEATURE_KEYS.includes(row.featureKey as ProFeatureKey)) {
      continue;
    }

    byFeature.set(row.featureKey as ProFeatureKey, "entitlement");
  }

  for (const featureKey of normalizePlanToFeatures(latestSubscription.plan, latestSubscription.status)) {
    if (!byFeature.has(featureKey)) {
      byFeature.set(featureKey, "subscription");
    }
  }

  const features = Array.from(byFeature.keys());
  const sources = Object.fromEntries(byFeature.entries()) as Record<ProFeatureKey, "entitlement" | "subscription">;

  return {
    userId,
    features,
    sources,
    plan: latestSubscription.plan,
    subscriptionStatus: latestSubscription.status,
  };
}

export function hasEntitlement(snapshot: EntitlementSnapshot, featureKey: ProFeatureKey): boolean {
  return snapshot.features.includes(featureKey);
}

export async function requireEntitlement(userId: string, featureKey: ProFeatureKey): Promise<EntitlementSnapshot> {
  const snapshot = await resolveEntitlements(userId);

  if (!hasEntitlement(snapshot, featureKey)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Upgrade to Pro to access this feature",
      cause: {
        businessCode: "PRO_UPGRADE_REQUIRED",
        featureKey,
      },
    });
  }

  return snapshot;
}
