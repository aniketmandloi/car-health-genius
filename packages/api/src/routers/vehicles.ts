import { db } from "@car-health-genius/db";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const vehicleInputSchema = z.object({
  vin: z.string().trim().length(17).optional(),
  make: z.string().trim().min(1),
  model: z.string().trim().min(1),
  modelYear: z.number().int().min(1980),
  engine: z.string().trim().min(1).optional(),
  mileage: z.number().int().nonnegative().optional(),
});

const vehicleOutputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  vin: z.string().nullable(),
  make: z.string(),
  model: z.string(),
  modelYear: z.number().int(),
  engine: z.string().nullable(),
  mileage: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapVehicleRow(row: typeof vehicle.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    vin: row.vin,
    make: row.make,
    model: row.model,
    modelYear: row.modelYear,
    engine: row.engine,
    mileage: row.mileage,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export const vehiclesRouter = router({
  list: protectedProcedure.output(z.array(vehicleOutputSchema)).query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(vehicle)
      .where(eq(vehicle.userId, ctx.session.user.id))
      .orderBy(desc(vehicle.createdAt));

    return rows.map(mapVehicleRow);
  }),

  create: protectedProcedure
    .input(vehicleInputSchema)
    .output(vehicleOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(vehicle)
        .values({
          userId: ctx.session.user.id,
          vin: input.vin,
          make: input.make,
          model: input.model,
          modelYear: input.modelYear,
          engine: input.engine,
          mileage: input.mileage,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create vehicle",
        });
      }

      return mapVehicleRow(created);
    }),

  updateMileage: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
        mileage: z.number().int().nonnegative(),
      }),
    )
    .output(vehicleOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(vehicle)
        .set({
          mileage: input.mileage,
        })
        .where(and(eq(vehicle.id, input.vehicleId), eq(vehicle.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vehicle not found",
        });
      }

      return mapVehicleRow(updated);
    }),
});
