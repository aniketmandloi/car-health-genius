import { db } from "@car-health-genius/db";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { recommendation } from "@car-health-genius/db/schema/recommendation";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { env } from "@car-health-genius/env/server";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { requireEntitlement } from "../services/entitlement.service";
import { generateRecommendationForDiagnosticEvent } from "../services/recommendation.service";

const jsonRecordSchema = z.record(z.string(), z.unknown());
const triageClassSchema = z.enum(["safe", "service_soon", "service_now"]);

const recommendationOutputSchema = z.object({
  id: z.number().int().positive(),
  diagnosticEventId: z.number().int().positive(),
  recommendationType: z.string(),
  urgency: z.string(),
  confidence: z.number().int(),
  title: z.string(),
  rationale: z.string(),
  triageClass: triageClassSchema.nullable(),
  details: jsonRecordSchema.nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function readRationale(details: Record<string, unknown> | null): string {
  if (details && typeof details.rationale === "string" && details.rationale.trim().length > 0) {
    return details.rationale;
  }

  return "Rationale unavailable";
}

function readTriageClass(details: Record<string, unknown> | null): z.infer<typeof triageClassSchema> | null {
  if (!details || typeof details.triageClass !== "string") {
    return null;
  }

  const parsed = triageClassSchema.safeParse(details.triageClass);
  return parsed.success ? parsed.data : null;
}

function mapRecommendationRow(row: typeof recommendation.$inferSelect) {
  const details = (row.details as Record<string, unknown> | null) ?? null;

  return {
    id: row.id,
    diagnosticEventId: row.diagnosticEventId,
    recommendationType: row.recommendationType,
    urgency: row.urgency,
    confidence: row.confidence,
    title: row.title,
    rationale: readRationale(details),
    triageClass: readTriageClass(details),
    details,
    isActive: row.isActive,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function getOwnedDiagnosticEvent(userId: string, diagnosticEventId: number) {
  const [ownedDiagnosticEvent] = await db
    .select({
      id: diagnosticEvent.id,
      dtcCode: diagnosticEvent.dtcCode,
      severity: diagnosticEvent.severity,
      freezeFrame: diagnosticEvent.freezeFrame,
      sensorSnapshot: diagnosticEvent.sensorSnapshot,
      occurredAt: diagnosticEvent.occurredAt,
      source: diagnosticEvent.source,
    })
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

  return ownedDiagnosticEvent;
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
      await getOwnedDiagnosticEvent(ctx.session.user.id, input.diagnosticEventId);

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
        rationale: z.string().trim().min(1),
        triageClass: triageClassSchema.optional(),
        details: jsonRecordSchema.optional(),
      }),
    )
    .output(recommendationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await getOwnedDiagnosticEvent(ctx.session.user.id, input.diagnosticEventId);

      const [created] = await db
        .insert(recommendation)
        .values({
          diagnosticEventId: input.diagnosticEventId,
          recommendationType: input.recommendationType,
          urgency: input.urgency,
          confidence: input.confidence,
          title: input.title,
          details: {
            ...(input.details ?? {}),
            rationale: input.rationale,
            triageClass: input.triageClass ?? null,
          },
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

  generateForDiagnosticEvent: protectedProcedure
    .input(
      z.object({
        diagnosticEventId: z.number().int().positive(),
        mode: z.enum(["basic", "pro"]).default("basic"),
      }),
    )
    .output(recommendationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const startedAt = Date.now();
      if (!env.FLAG_AI_EXPLANATIONS_ENABLED) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "AI explanations are currently disabled",
          cause: {
            businessCode: "AI_EXPLANATIONS_DISABLED",
          },
        });
      }

      const ownedEvent = await getOwnedDiagnosticEvent(ctx.session.user.id, input.diagnosticEventId);
      if (input.mode === "pro") {
        await requireEntitlement(ctx.session.user.id, "pro.advanced_diagnostics");
      }

      let generated: Awaited<ReturnType<typeof generateRecommendationForDiagnosticEvent>>;
      try {
        generated = await generateRecommendationForDiagnosticEvent({
          id: ownedEvent.id,
          dtcCode: ownedEvent.dtcCode,
          severity: ownedEvent.severity,
          freezeFrame: ownedEvent.freezeFrame,
          sensorSnapshot: ownedEvent.sensorSnapshot,
          occurredAt: ownedEvent.occurredAt,
          source: ownedEvent.source,
        });
      } catch (error) {
        console.error(
          JSON.stringify({
            level: "error",
            event: "recommendation.generate.failed",
            metric: "ai_explanation_failures_total",
            value: 1,
            requestId: ctx.requestId,
            correlationId: ctx.correlationId,
            diagnosticEventId: ownedEvent.id,
            userId: ctx.session.user.id,
            mode: input.mode,
            error: error instanceof Error ? error.message : "Unknown error",
            durationMs: Date.now() - startedAt,
          }),
        );
        throw error;
      }

      const [created] = await db
        .insert(recommendation)
        .values({
          diagnosticEventId: ownedEvent.id,
          recommendationType: generated.recommendationType,
          urgency: generated.urgency,
          confidence: generated.confidence,
          title: generated.title,
          details: {
            ...generated.details,
            mode: input.mode,
            rationale: generated.rationale,
            triageClass: generated.urgency,
          },
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate recommendation",
        });
      }

      console.info(
        JSON.stringify({
          level: "info",
          event: "recommendation.generate.succeeded",
          metric: "ai_explanation_generated_total",
          value: 1,
          requestId: ctx.requestId,
          correlationId: ctx.correlationId,
          recommendationId: created.id,
          diagnosticEventId: ownedEvent.id,
          userId: ctx.session.user.id,
          mode: input.mode,
          triageClass: generated.urgency,
          durationMs: Date.now() - startedAt,
        }),
      );

      return mapRecommendationRow(created);
    }),
});
