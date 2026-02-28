import { db } from "@car-health-genius/db";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { feedback } from "@car-health-genius/db/schema/feedback";
import { recommendation } from "@car-health-genius/db/schema/recommendation";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

export type UpsertFeedbackInput = {
  userId: string;
  recommendationId: number;
  rating: number;
  outcome?: string;
  notes?: string;
  diagnosticEventId?: number;
};

async function resolveOwnedRecommendation(userId: string, recommendationId: number) {
  const [ownedRecommendation] = await db
    .select({
      id: recommendation.id,
      diagnosticEventId: recommendation.diagnosticEventId,
    })
    .from(recommendation)
    .innerJoin(diagnosticEvent, eq(recommendation.diagnosticEventId, diagnosticEvent.id))
    .innerJoin(vehicle, eq(diagnosticEvent.vehicleId, vehicle.id))
    .where(and(eq(recommendation.id, recommendationId), eq(vehicle.userId, userId)))
    .limit(1);

  if (!ownedRecommendation) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Recommendation not found",
    });
  }

  return ownedRecommendation;
}

export async function upsertFeedback(input: UpsertFeedbackInput) {
  const ownedRecommendation = await resolveOwnedRecommendation(input.userId, input.recommendationId);
  if (input.diagnosticEventId && input.diagnosticEventId !== ownedRecommendation.diagnosticEventId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Recommendation does not match diagnostic event",
      cause: {
        businessCode: "FEEDBACK_EVENT_MISMATCH",
      },
    });
  }

  const [existing] = await db
    .select({
      id: feedback.id,
    })
    .from(feedback)
    .where(and(eq(feedback.userId, input.userId), eq(feedback.recommendationId, input.recommendationId)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(feedback)
      .set({
        rating: input.rating,
        outcome: input.outcome ?? null,
        notes: input.notes ?? null,
        diagnosticEventId: ownedRecommendation.diagnosticEventId,
      })
      .where(eq(feedback.id, existing.id))
      .returning();

    if (!updated) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update feedback",
      });
    }

    return {
      row: updated,
      operation: "updated" as const,
    };
  }

  const [created] = await db
    .insert(feedback)
    .values({
      userId: input.userId,
      recommendationId: input.recommendationId,
      diagnosticEventId: ownedRecommendation.diagnosticEventId,
      rating: input.rating,
      outcome: input.outcome ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create feedback",
    });
  }

  return {
    row: created,
    operation: "created" as const,
  };
}

