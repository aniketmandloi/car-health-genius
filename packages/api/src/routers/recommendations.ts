import { db } from "@car-health-genius/db";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { recommendation } from "@car-health-genius/db/schema/recommendation";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const jsonRecordSchema = z.record(z.string(), z.unknown());

const recommendationOutputSchema = z.object({
  id: z.number().int().positive(),
  diagnosticEventId: z.number().int().positive(),
  recommendationType: z.string(),
  urgency: z.string(),
  confidence: z.number().int(),
  title: z.string(),
  details: jsonRecordSchema.nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapRecommendationRow(row: typeof recommendation.$inferSelect) {
  return {
    id: row.id,
    diagnosticEventId: row.diagnosticEventId,
    recommendationType: row.recommendationType,
    urgency: row.urgency,
    confidence: row.confidence,
    title: row.title,
    details: (row.details as Record<string, unknown> | null) ?? null,
    isActive: row.isActive,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function ensureDiagnosticEventOwnership(userId: string, diagnosticEventId: number) {
  const [ownedDiagnosticEvent] = await db
    .select({ id: diagnosticEvent.id })
    .from(diagnosticEvent)
    .innerJoin(vehicle, eq(diagnosticEvent.vehicleId, vehicle.id))
    .where(and(eq(diagnosticEvent.id, diagnosticEventId), eq(vehicle.userId, userId)))
    .limit(1);

  if (!ownedDiagnosticEvent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Diagnostic event not found",
    });
  }
}

export const recommendationsRouter = router({
  listByDiagnosticEvent: protectedProcedure
    .input(
      z.object({
        diagnosticEventId: z.number().int().positive(),
      }),
    )
    .output(z.array(recommendationOutputSchema))
    .query(async ({ ctx, input }) => {
      await ensureDiagnosticEventOwnership(ctx.session.user.id, input.diagnosticEventId);

      const rows = await db
        .select()
        .from(recommendation)
        .where(eq(recommendation.diagnosticEventId, input.diagnosticEventId))
        .orderBy(desc(recommendation.createdAt));

      return rows.map(mapRecommendationRow);
    }),

  create: protectedProcedure
    .input(
      z.object({
        diagnosticEventId: z.number().int().positive(),
        recommendationType: z.string().trim().min(1),
        urgency: z.string().trim().min(1),
        confidence: z.number().int().min(0).max(100),
        title: z.string().trim().min(1),
        details: jsonRecordSchema.optional(),
      }),
    )
    .output(recommendationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureDiagnosticEventOwnership(ctx.session.user.id, input.diagnosticEventId);

      const [created] = await db
        .insert(recommendation)
        .values({
          diagnosticEventId: input.diagnosticEventId,
          recommendationType: input.recommendationType,
          urgency: input.urgency,
          confidence: input.confidence,
          title: input.title,
          details: input.details,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create recommendation",
        });
      }

      return mapRecommendationRow(created);
    }),
});
