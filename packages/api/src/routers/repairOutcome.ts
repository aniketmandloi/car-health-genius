import { db } from "@car-health-genius/db";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { repairOutcome } from "@car-health-genius/db/schema/repairOutcome";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const outcomeStatusSchema = z.enum([
  "repaired",
  "partially_repaired",
  "deferred",
  "not_repaired",
  "still_investigating",
]);

const repairOutcomeOutputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  vehicleId: z.number().int().positive(),
  diagnosticEventId: z.number().int().positive(),
  estimateId: z.number().int().positive().nullable(),
  invoiceAmountCents: z.number().int().nullable(),
  outcomeStatus: z.string(),
  performedAt: z.string().nullable(),
  shopName: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toIsoNullable(value: Date | string | null): string | null {
  if (value === null) return null;
  return toIso(value);
}

function mapRow(row: typeof repairOutcome.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    vehicleId: row.vehicleId,
    diagnosticEventId: row.diagnosticEventId,
    estimateId: row.estimateId,
    invoiceAmountCents: row.invoiceAmountCents,
    outcomeStatus: row.outcomeStatus,
    performedAt: toIsoNullable(row.performedAt),
    shopName: row.shopName,
    notes: row.notes,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function ensureDiagnosticEventOwnership(
  userId: string,
  diagnosticEventId: number,
) {
  const [event] = await db
    .select({ id: diagnosticEvent.id, vehicleId: diagnosticEvent.vehicleId })
    .from(diagnosticEvent)
    .innerJoin(vehicle, eq(diagnosticEvent.vehicleId, vehicle.id))
    .where(
      and(
        eq(diagnosticEvent.id, diagnosticEventId),
        eq(vehicle.userId, userId),
      ),
    )
    .limit(1);

  if (!event) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Diagnostic event not found",
    });
  }

  return event;
}

export const repairOutcomeRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        diagnosticEventId: z.number().int().positive(),
        estimateId: z.number().int().positive().optional(),
        outcomeStatus: outcomeStatusSchema,
        invoiceAmountCents: z.number().int().nonnegative().optional(),
        shopName: z.string().trim().max(200).optional(),
        notes: z.string().trim().max(2000).optional(),
        performedAt: z.coerce.date().optional(),
      }),
    )
    .output(repairOutcomeOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const event = await ensureDiagnosticEventOwnership(
        ctx.session.user.id,
        input.diagnosticEventId,
      );

      const [created] = await db
        .insert(repairOutcome)
        .values({
          userId: ctx.session.user.id,
          vehicleId: event.vehicleId,
          diagnosticEventId: input.diagnosticEventId,
          estimateId: input.estimateId ?? null,
          outcomeStatus: input.outcomeStatus,
          invoiceAmountCents: input.invoiceAmountCents ?? null,
          shopName: input.shopName ?? null,
          notes: input.notes ?? null,
          performedAt: input.performedAt ?? null,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record repair outcome",
        });
      }

      return mapRow(created);
    }),

  listByVehicle: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
      }),
    )
    .output(z.array(repairOutcomeOutputSchema))
    .query(async ({ ctx, input }) => {
      const [ownedVehicle] = await db
        .select({ id: vehicle.id })
        .from(vehicle)
        .where(
          and(
            eq(vehicle.id, input.vehicleId),
            eq(vehicle.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (!ownedVehicle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vehicle not found",
        });
      }

      const rows = await db
        .select()
        .from(repairOutcome)
        .where(
          and(
            eq(repairOutcome.userId, ctx.session.user.id),
            eq(repairOutcome.vehicleId, input.vehicleId),
          ),
        )
        .orderBy(desc(repairOutcome.createdAt));

      return rows.map(mapRow);
    }),

  getByDiagnosticEvent: protectedProcedure
    .input(
      z.object({
        diagnosticEventId: z.number().int().positive(),
      }),
    )
    .output(z.array(repairOutcomeOutputSchema))
    .query(async ({ ctx, input }) => {
      await ensureDiagnosticEventOwnership(
        ctx.session.user.id,
        input.diagnosticEventId,
      );

      const rows = await db
        .select()
        .from(repairOutcome)
        .where(
          and(
            eq(repairOutcome.userId, ctx.session.user.id),
            eq(repairOutcome.diagnosticEventId, input.diagnosticEventId),
          ),
        )
        .orderBy(desc(repairOutcome.createdAt));

      return rows.map(mapRow);
    }),
});
