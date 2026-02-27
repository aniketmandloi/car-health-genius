import { db } from "@car-health-genius/db";
import { reviewQueueItem } from "@car-health-genius/db/schema/reviewQueueItem";

const HIGH_IMPACT_URGENCY = new Set(["service_now", "do_not_drive", "critical"]);

type JsonRecord = Record<string, unknown>;

export type ReviewTriggerInput = {
  diagnosticEventId: number;
  recommendationId?: number;
  modelTraceId?: number;
  confidence: number;
  urgency: string;
  policyBlocked: boolean;
  metadata?: JsonRecord;
};

export type ReviewTriggerDecision = {
  shouldQueue: boolean;
  reason: string;
};

function normalizeUrgency(urgency: string): string {
  return urgency.trim().toLowerCase().replace(/\s+/g, "_");
}

export function evaluateReviewTrigger(input: ReviewTriggerInput): ReviewTriggerDecision {
  if (input.policyBlocked) {
    return {
      shouldQueue: true,
      reason: "policy_blocked",
    };
  }

  if (input.confidence < 45) {
    return {
      shouldQueue: true,
      reason: "low_confidence",
    };
  }

  if (HIGH_IMPACT_URGENCY.has(normalizeUrgency(input.urgency)) && input.confidence < 70) {
    return {
      shouldQueue: true,
      reason: "high_impact_low_confidence",
    };
  }

  return {
    shouldQueue: false,
    reason: "none",
  };
}

export async function enqueueReviewQueueItem(input: ReviewTriggerInput) {
  const decision = evaluateReviewTrigger(input);

  if (!decision.shouldQueue) {
    return null;
  }

  const [created] = await db
    .insert(reviewQueueItem)
    .values({
      status: "pending",
      triggerReason: decision.reason,
      triggerMetadata: input.metadata,
      diagnosticEventId: input.diagnosticEventId,
      recommendationId: input.recommendationId,
      modelTraceId: input.modelTraceId,
      confidence: input.confidence,
      urgency: input.urgency,
      policyBlocked: input.policyBlocked,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to enqueue review queue item");
  }

  return created;
}
