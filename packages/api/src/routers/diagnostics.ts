import { db } from "@car-health-genius/db";
import { adapter } from "@car-health-genius/db/schema/adapter";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const jsonRecordSchema = z.record(z.string(), z.unknown());

const diagnosticEventOutputSchema = z.object({
  id: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  source: z.string(),
  dtcCode: z.string(),
  severity: z.string(),
  freezeFrame: jsonRecordSchema.nullable(),
  sensorSnapshot: jsonRecordSchema.nullable(),
  occurredAt: z.string(),
  createdAt: z.string(),
});

const clearCodeOutputSchema = z.object({
  event: diagnosticEventOutputSchema,
  cleared: z.literal(true),
});

const adapterStatusSchema = z.enum(["active", "archived", "deprecated"]);

const adapterOutputSchema = z.object({
  id: z.number().int().positive(),
  vendor: z.string(),
  model: z.string(),
  slug: z.string(),
  connectionType: z.string(),
  iosSupported: z.boolean(),
  androidSupported: z.boolean(),
  status: adapterStatusSchema,
  firmwareNotes: z.string().nullable(),
  metadata: jsonRecordSchema.nullable(),
  lastValidatedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapDiagnosticEventRow(row: typeof diagnosticEvent.$inferSelect) {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    source: row.source,
    dtcCode: row.dtcCode,
    severity: row.severity,
    freezeFrame: (row.freezeFrame as Record<string, unknown> | null) ?? null,
    sensorSnapshot: (row.sensorSnapshot as Record<string, unknown> | null) ?? null,
    occurredAt: toIso(row.occurredAt),
    createdAt: toIso(row.createdAt),
  };
}

function toIsoNullable(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  return toIso(value);
}

function mapAdapterRow(row: typeof adapter.$inferSelect) {
  return {
    id: row.id,
    vendor: row.vendor,
    model: row.model,
    slug: row.slug,
    connectionType: row.connectionType,
    iosSupported: row.iosSupported,
    androidSupported: row.androidSupported,
    status: adapterStatusSchema.parse(row.status),
    firmwareNotes: row.firmwareNotes,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    lastValidatedAt: toIsoNullable(row.lastValidatedAt),
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

export const diagnosticsRouter = router({
  listCompatibleAdapters: protectedProcedure.output(z.array(adapterOutputSchema)).query(async () => {
    const rows = await db
      .select()
      .from(adapter)
      .where(eq(adapter.status, "active"))
      .orderBy(asc(adapter.vendor), asc(adapter.model));

    return rows.map(mapAdapterRow);
  }),

  listByVehicle: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
      }),
    )
    .output(z.array(diagnosticEventOutputSchema))
    .query(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      const rows = await db
        .select()
        .from(diagnosticEvent)
        .where(eq(diagnosticEvent.vehicleId, input.vehicleId))
        .orderBy(desc(diagnosticEvent.occurredAt), desc(diagnosticEvent.createdAt));

      return rows.map(mapDiagnosticEventRow);
    }),

  createEvent: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
        source: z.string().trim().min(1).optional(),
        dtcCode: z.string().trim().min(1).max(16),
        severity: z.string().trim().min(1).optional(),
        freezeFrame: jsonRecordSchema.optional(),
        sensorSnapshot: jsonRecordSchema.optional(),
      }),
    )
    .output(diagnosticEventOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      const [created] = await db
        .insert(diagnosticEvent)
        .values({
          vehicleId: input.vehicleId,
          source: input.source ?? "obd_scan",
          dtcCode: input.dtcCode,
          severity: input.severity ?? "unknown",
          freezeFrame: input.freezeFrame,
          sensorSnapshot: input.sensorSnapshot,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create diagnostic event",
        });
      }

      return mapDiagnosticEventRow(created);
    }),

  clearCode: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
        dtcCode: z.string().trim().min(1).max(16),
      }),
    )
    .output(clearCodeOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      const [created] = await db
        .insert(diagnosticEvent)
        .values({
          vehicleId: input.vehicleId,
          source: "dtc_clear",
          dtcCode: input.dtcCode,
          severity: "cleared",
          freezeFrame: {
            action: "clear_code",
            warningAcknowledged: true,
          },
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to clear diagnostic code",
        });
      }

      return {
        event: mapDiagnosticEventRow(created),
        cleared: true,
      };
    }),
});
