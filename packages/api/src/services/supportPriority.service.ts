import { resolveEntitlements } from "./entitlement.service";

export type SupportPrioritySnapshot = {
  priorityTier: "priority" | "standard";
  priorityReason: string;
  slaTargetMinutes: number;
};

export async function resolveSupportPriority(userId: string): Promise<SupportPrioritySnapshot> {
  const entitlementSnapshot = await resolveEntitlements(userId);
  const hasPrioritySupport = entitlementSnapshot.features.includes("pro.priority_support");

  if (!hasPrioritySupport) {
    return {
      priorityTier: "standard",
      priorityReason: "No Pro priority support entitlement",
      slaTargetMinutes: 240,
    };
  }

  return {
    priorityTier: "priority",
    priorityReason: "Active Pro entitlement",
    slaTargetMinutes: 60,
  };
}
