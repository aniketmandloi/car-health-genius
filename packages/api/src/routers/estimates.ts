import { db } from "@car-health-genius/db";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { estimate } from "@car-health-genius/db/schema/estimate";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { requireEntitlement } from "../services/entitlement.service";
import { buildEstimateDisclosure } from "../services/estimateDisclosure.service";
import { generateEstimateFromDiagnostic } from "../services/estimate.service";
import { buildNegotiationScript } from "../services/negotiationScript.service";
import { requireSafetySwitchEnabled } from "../services/safetySwitch.service";

const jsonRecordSchema = z.record(z.string(), z.unknown());

const estimateOutputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  vehicleId: z.number().int().positive(),
  diagnosticEventId: z.number().int().positive().nullable(),
  laborLowCents: z.number().int().nonnegative(),
  laborHighCents: z.number().int().nonnegative(),
  partsLowCents: z.number().int().nonnegative(),
  partsHighCents: z.number().int().nonnegative(),
  currency: z.string(),
  region: z.string(),
  assumptions: jsonRecordSchema.nullable(),
  exclusions: jsonRecordSchema.nullable(),
  disclosure: z
    .object({
      geographyBasis: z.string(),
      assumptions: z.array(z.string()),
      exclusions: z.array(z.string()),
    })
    .nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const negotiationScriptOutputSchema = z.object({
  estimateId: z.number().int().positive(),
  headline: z.string(),
  keyQuestions: z.array(z.string()),
  costAnchors: z.array(z.string()),
  exclusionsReminder: z.array(z.string()),
  closingPrompt: z.string(),
  disclaimer: z.string(),
  context: jsonRecordSchema,
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapEstimateRow(row: typeof estimate.$inferSelect) {
  const assumptions = (row.assumptions as Record<string, unknown> | null) ?? null;
  const exclusions = (row.exclusions as Record<string, unknown> | null) ?? null;
  const disclosure = buildEstimateDisclosure({
    region: row.region,
    assumptions,
    exclusions,
  });

  return {
    id: row.id,
    userId: row.userId,
    vehicleId: row.vehicleId,
    diagnosticEventId: row.diagnosticEventId,
    laborLowCents: row.laborLowCents,
    laborHighCents: row.laborHighCents,
    partsLowCents: row.partsLowCents,
    partsHighCents: row.partsHighCents,
    currency: row.currency,
    region: row.region,
    assumptions,
    exclusions,
    disclosure,
    isActive: row.isActive,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function ensureVehicleOwnership(userId: string, vehicleId: number) {
  const [ownedVehicle] = await db
    .select({ id: vehicle.id })
    .from(vehicle)
    .where(and(eq(vehicle.id, vehicleId), eq(vehicle.userId, userId)))
    .limit(1);

  if (!ownedVehicle) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Vehicle not found",
    });
  }
}

async function ensureDiagnosticEventMatchesVehicle(diagnosticEventId: number, vehicleId: number) {
  const [event] = await db
    .select({ id: diagnosticEvent.id })
    .from(diagnosticEvent)
    .where(and(eq(diagnosticEvent.id, diagnosticEventId), eq(diagnosticEvent.vehicleId, vehicleId)))
    .limit(1);

  if (!event) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Diagnostic event does not belong to vehicle",
    });
  }
}

async function getOwnedDiagnosticEvent(userId: string, diagnosticEventId: number) {
  const [ownedDiagnosticEvent] = await db
    .select({
      id: diagnosticEvent.id,
      dtcCode: diagnosticEvent.dtcCode,
      severity: diagnosticEvent.severity,
      vehicleId: diagnosticEvent.vehicleId,
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

export const estimatesRouter = router({
  listByVehicle: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
      }),
    )
    .output(z.array(estimateOutputSchema))
    .query(async ({ ctx, input }) => {
      await requireSafetySwitchEnabled("estimates", {
        message: "Estimates are temporarily unavailable",
      });
      await requireEntitlement(ctx.session.user.id, "pro.cost_estimates");
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      const rows = await db
        .select()
        .from(estimate)
        .where(and(eq(estimate.userId, ctx.session.user.id), eq(estimate.vehicleId, input.vehicleId)))
        .orderBy(desc(estimate.createdAt));

      return rows.map(mapEstimateRow);
    }),

  listByDiagnosticEvent: protectedProcedure
    .input(
      z.object({
        diagnosticEventId: z.number().int().positive(),
      }),
    )
    .output(z.array(estimateOutputSchema))
    .query(async ({ ctx, input }) => {
      await requireSafetySwitchEnabled("estimates", {
        message: "Estimates are temporarily unavailable",
      });
      await requireEntitlement(ctx.session.user.id, "pro.cost_estimates");
      const ownedDiagnosticEvent = await getOwnedDiagnosticEvent(ctx.session.user.id, input.diagnosticEventId);
      const rows = await db
        .select()
        .from(estimate)
        .where(and(eq(estimate.userId, ctx.session.user.id), eq(estimate.diagnosticEventId, ownedDiagnosticEvent.id)))
        .orderBy(desc(estimate.createdAt));

      return rows.map(mapEstimateRow);
    }),

  generateForDiagnosticEvent: protectedProcedure
    .input(
      z.object({
        diagnosticEventId: z.number().int().positive(),
        region: z.string().trim().min(1),
        currency: z.string().trim().length(3).optional(),
      }),
    )
    .output(estimateOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await requireSafetySwitchEnabled("estimates", {
        message: "Estimates are temporarily unavailable",
      });
      await requireEntitlement(ctx.session.user.id, "pro.cost_estimates");
      const ownedDiagnosticEvent = await getOwnedDiagnosticEvent(ctx.session.user.id, input.diagnosticEventId);

      const generated = generateEstimateFromDiagnostic({
        dtcCode: ownedDiagnosticEvent.dtcCode,
        severity: ownedDiagnosticEvent.severity,
        region: input.region,
      });

      const [created] = await db
        .insert(estimate)
        .values({
          userId: ctx.session.user.id,
          vehicleId: ownedDiagnosticEvent.vehicleId,
          diagnosticEventId: ownedDiagnosticEvent.id,
          laborLowCents: generated.laborLowCents,
          laborHighCents: generated.laborHighCents,
          partsLowCents: generated.partsLowCents,
          partsHighCents: generated.partsHighCents,
          currency: input.currency ?? "USD",
          region: input.region,
          assumptions: generated.assumptions,
          exclusions: generated.exclusions,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate estimate",
        });
      }

      console.info(
        JSON.stringify({
          level: "info",
          event: "estimate_generated",
          metric: "estimate_generated_total",
          value: 1,
          requestId: ctx.requestId,
          correlationId: ctx.correlationId,
          userId: ctx.session.user.id,
          diagnosticEventId: ownedDiagnosticEvent.id,
          estimateId: created.id,
          region: created.region,
        }),
      );

      return mapEstimateRow(created);
    }),

  create: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
        diagnosticEventId: z.number().int().positive().optional(),
        laborLowCents: z.number().int().nonnegative(),
        laborHighCents: z.number().int().nonnegative(),
        partsLowCents: z.number().int().nonnegative(),
        partsHighCents: z.number().int().nonnegative(),
        currency: z.string().trim().length(3).optional(),
        region: z.string().trim().min(1),
        assumptions: jsonRecordSchema.optional(),
        exclusions: jsonRecordSchema.optional(),
      }),
    )
    .output(estimateOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await requireSafetySwitchEnabled("estimates", {
        message: "Estimates are temporarily unavailable",
      });
      await requireEntitlement(ctx.session.user.id, "pro.cost_estimates");
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      if (input.diagnosticEventId) {
        await ensureDiagnosticEventMatchesVehicle(input.diagnosticEventId, input.vehicleId);
      }

      const [created] = await db
        .insert(estimate)
        .values({
          userId: ctx.session.user.id,
          vehicleId: input.vehicleId,
          diagnosticEventId: input.diagnosticEventId,
          laborLowCents: input.laborLowCents,
          laborHighCents: input.laborHighCents,
          partsLowCents: input.partsLowCents,
          partsHighCents: input.partsHighCents,
          currency: input.currency ?? "USD",
          region: input.region,
          assumptions: input.assumptions,
          exclusions: input.exclusions,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create estimate",
        });
      }

      return mapEstimateRow(created);
    }),

  negotiationScript: protectedProcedure
    .input(
      z.object({
        estimateId: z.number().int().positive(),
      }),
    )
    .output(negotiationScriptOutputSchema)
    .query(async ({ ctx, input }) => {
      await requireSafetySwitchEnabled("estimates", {
        message: "Estimates are temporarily unavailable",
      });
      await requireEntitlement(ctx.session.user.id, "pro.negotiation_script");

      const [ownedEstimate] = await db
        .select()
        .from(estimate)
        .where(and(eq(estimate.id, input.estimateId), eq(estimate.userId, ctx.session.user.id)))
        .limit(1);

      if (!ownedEstimate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Estimate not found",
        });
      }

      const [linkedDiagnosticEvent] =
        ownedEstimate.diagnosticEventId === null
          ? [null]
          : await db
              .select({
                dtcCode: diagnosticEvent.dtcCode,
                severity: diagnosticEvent.severity,
              })
              .from(diagnosticEvent)
              .where(eq(diagnosticEvent.id, ownedEstimate.diagnosticEventId))
              .limit(1);

      const script = buildNegotiationScript({
        dtcCode: linkedDiagnosticEvent?.dtcCode ?? "unknown",
        severity: linkedDiagnosticEvent?.severity ?? "unknown",
        region: ownedEstimate.region,
        laborLowCents: ownedEstimate.laborLowCents,
        laborHighCents: ownedEstimate.laborHighCents,
        partsLowCents: ownedEstimate.partsLowCents,
        partsHighCents: ownedEstimate.partsHighCents,
        exclusions: (ownedEstimate.exclusions as Record<string, unknown> | null) ?? null,
      });

      return {
        estimateId: ownedEstimate.id,
        headline: script.headline,
        keyQuestions: script.keyQuestions,
        costAnchors: script.costAnchors,
        exclusionsReminder: script.exclusionsReminder,
        closingPrompt: script.closingPrompt,
        disclaimer: script.disclaimer,
        context: script.context,
      };
    }),
});
