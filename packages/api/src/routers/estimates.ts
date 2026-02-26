import { db } from "@car-health-genius/db";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { estimate } from "@car-health-genius/db/schema/estimate";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

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
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapEstimateRow(row: typeof estimate.$inferSelect) {
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
    assumptions: (row.assumptions as Record<string, unknown> | null) ?? null,
    exclusions: (row.exclusions as Record<string, unknown> | null) ?? null,
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

export const estimatesRouter = router({
  listByVehicle: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
      }),
    )
    .output(z.array(estimateOutputSchema))
    .query(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      const rows = await db
        .select()
        .from(estimate)
        .where(and(eq(estimate.userId, ctx.session.user.id), eq(estimate.vehicleId, input.vehicleId)))
        .orderBy(desc(estimate.createdAt));

      return rows.map(mapEstimateRow);
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
});
