import { db } from "@car-health-genius/db";
import { feedback } from "@car-health-genius/db/schema/feedback";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { upsertFeedback } from "../services/feedback.service";

const feedbackOutputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  recommendationId: z.number().int().positive().nullable(),
  diagnosticEventId: z.number().int().positive().nullable(),
  rating: z.number().int().min(1).max(5),
  outcome: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  operation: z.enum(["created", "updated"]),
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapFeedbackRow(row: typeof feedback.$inferSelect, operation: "created" | "updated") {
  return {
    id: row.id,
    userId: row.userId,
    recommendationId: row.recommendationId,
    diagnosticEventId: row.diagnosticEventId,
    rating: row.rating,
    outcome: row.outcome,
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    operation,
  };
}

const feedbackListItemSchema = feedbackOutputSchema.omit({
  operation: true,
});

export const feedbackRouter = router({
  listByDiagnosticEvent: protectedProcedure
    .input(
      z.object({
        diagnosticEventId: z.number().int().positive(),
      }),
    )
    .output(z.array(feedbackListItemSchema))
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select()
        .from(feedback)
        .where(and(eq(feedback.userId, ctx.session.user.id), eq(feedback.diagnosticEventId, input.diagnosticEventId)))
        .orderBy(desc(feedback.createdAt));

      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        recommendationId: row.recommendationId,
        diagnosticEventId: row.diagnosticEventId,
        rating: row.rating,
        outcome: row.outcome,
        notes: row.notes,
        createdAt: toIso(row.createdAt),
      }));
    }),

  createOrUpdate: protectedProcedure
    .input(
      z.object({
        recommendationId: z.number().int().positive(),
        diagnosticEventId: z.number().int().positive().optional(),
        rating: z.number().int().min(1).max(5),
        outcome: z.string().trim().min(1).max(120).optional(),
        notes: z.string().trim().max(1500).optional(),
      }),
    )
    .output(feedbackOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await upsertFeedback({
        userId: ctx.session.user.id,
        recommendationId: input.recommendationId,
        diagnosticEventId: input.diagnosticEventId,
        rating: input.rating,
        outcome: input.outcome,
        notes: input.notes,
      });

      const eventName =
        result.operation === "created" ? "recommendation_feedback_submitted" : "recommendation_feedback_updated";

      console.info(
        JSON.stringify({
          level: "info",
          event: eventName,
          metric: "recommendation_feedback_events_total",
          value: 1,
          requestId: ctx.requestId,
          correlationId: ctx.correlationId,
          userId: ctx.session.user.id,
          recommendationId: input.recommendationId,
          diagnosticEventId: result.row.diagnosticEventId,
          rating: input.rating,
          operation: result.operation,
        }),
      );

      return mapFeedbackRow(result.row, result.operation);
    }),
});

