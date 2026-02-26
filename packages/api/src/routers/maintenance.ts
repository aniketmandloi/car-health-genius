import { db } from "@car-health-genius/db";
import { maintenance } from "@car-health-genius/db/schema/maintenance";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const maintenanceStatusSchema = z.enum(["scheduled", "completed", "overdue", "dismissed"]);

const maintenanceOutputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  vehicleId: z.number().int().positive(),
  serviceType: z.string(),
  dueMileage: z.number().int().nullable(),
  dueDate: z.string().nullable(),
  status: maintenanceStatusSchema,
  lastCompletedAt: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toIsoNullable(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  return toIso(value);
}

function mapMaintenanceRow(row: typeof maintenance.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    vehicleId: row.vehicleId,
    serviceType: row.serviceType,
    dueMileage: row.dueMileage,
    dueDate: toIsoNullable(row.dueDate),
    status: maintenanceStatusSchema.parse(row.status),
    lastCompletedAt: toIsoNullable(row.lastCompletedAt),
    notes: row.notes,
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

export const maintenanceRouter = router({
  listByVehicle: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
      }),
    )
    .output(z.array(maintenanceOutputSchema))
    .query(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      const rows = await db
        .select()
        .from(maintenance)
        .where(and(eq(maintenance.userId, ctx.session.user.id), eq(maintenance.vehicleId, input.vehicleId)))
        .orderBy(desc(maintenance.createdAt));

      return rows.map(mapMaintenanceRow);
    }),

  createReminder: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
        serviceType: z.string().trim().min(1),
        dueMileage: z.number().int().nonnegative().optional(),
        dueDate: z.coerce.date().optional(),
      }),
    )
    .output(maintenanceOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      const [created] = await db
        .insert(maintenance)
        .values({
          userId: ctx.session.user.id,
          vehicleId: input.vehicleId,
          serviceType: input.serviceType,
          dueMileage: input.dueMileage,
          dueDate: input.dueDate,
          status: "scheduled",
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create maintenance reminder",
        });
      }

      return mapMaintenanceRow(created);
    }),
});
