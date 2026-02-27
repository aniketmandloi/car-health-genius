import { db } from "@car-health-genius/db";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { RecallServiceError, getRecallsByVehicle } from "../services/recall.service";
import { decodeVin } from "../services/vin.service";

const jsonRecordSchema = z.record(z.string(), z.unknown());

const vinSchema = z
  .string()
  .trim()
  .length(17)
  .regex(/^[A-HJ-NPR-Z0-9]{17}$/)
  .transform((value) => value.toUpperCase());

const countryCodeSchema = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase());

const stateCodeSchema = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase());

const vehicleInputSchema = z.object({
  vin: vinSchema.optional(),
  make: z.string().trim().min(1),
  model: z.string().trim().min(1),
  modelYear: z.number().int().min(1980),
  engine: z.string().trim().min(1).optional(),
  mileage: z.number().int().nonnegative().optional(),
  countryCode: countryCodeSchema.default("US"),
  stateCode: stateCodeSchema.optional(),
});

const vehicleUpdateSchema = z
  .object({
    vehicleId: z.number().int().positive(),
    vin: vinSchema.optional(),
    make: z.string().trim().min(1).optional(),
    model: z.string().trim().min(1).optional(),
    modelYear: z.number().int().min(1980).optional(),
    engine: z.string().trim().min(1).optional(),
    mileage: z.number().int().nonnegative().optional(),
    countryCode: countryCodeSchema.optional(),
    stateCode: stateCodeSchema.nullable().optional(),
  })
  .refine(
    (input) =>
      input.vin !== undefined ||
      input.make !== undefined ||
      input.model !== undefined ||
      input.modelYear !== undefined ||
      input.engine !== undefined ||
      input.mileage !== undefined ||
      input.countryCode !== undefined ||
      input.stateCode !== undefined,
    {
      message: "At least one update field is required",
      path: ["vehicleId"],
    },
  );

const vehicleOutputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  vin: z.string().nullable(),
  make: z.string(),
  model: z.string(),
  modelYear: z.number().int(),
  engine: z.string().nullable(),
  mileage: z.number().int().nullable(),
  countryCode: z.string().length(2),
  stateCode: z.string().length(2).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const vinDecodeSuccessSchema = z.object({
  ok: z.literal(true),
  source: z.literal("nhtsa_vpic"),
  retrievedAt: z.string(),
  vin: z.string(),
  decoded: z.object({
    make: z.string().optional(),
    model: z.string().optional(),
    modelYear: z.number().int().optional(),
    engine: z.string().optional(),
  }),
  warning: z.string().nullable(),
});

const vinDecodeFailureSchema = z.object({
  ok: z.literal(false),
  source: z.literal("nhtsa_vpic"),
  retrievedAt: z.string(),
  vin: z.string(),
  errorCode: z.enum([
    "VIN_DECODE_INVALID_INPUT",
    "VIN_DECODE_TIMEOUT",
    "VIN_DECODE_UNAVAILABLE",
    "VIN_DECODE_NOT_FOUND",
  ]),
  message: z.string(),
  manualFallback: z.literal(true),
});

const vinDecodeResultSchema = z.discriminatedUnion("ok", [vinDecodeSuccessSchema, vinDecodeFailureSchema]);

const createFromVinOutputSchema = z.discriminatedUnion("created", [
  z.object({
    created: z.literal(true),
    decode: vinDecodeSuccessSchema,
    vehicle: vehicleOutputSchema,
  }),
  z.object({
    created: z.literal(false),
    decode: vinDecodeFailureSchema,
    requiresManualInput: z.literal(true),
  }),
]);

const recallLookupOutputSchema = z.object({
  source: z.literal("nhtsa_recalls"),
  retrievedAt: z.string(),
  cacheExpiresAt: z.string(),
  cached: z.boolean(),
  stale: z.boolean(),
  vehicleId: z.number().int().positive(),
  records: z.array(jsonRecordSchema),
});

function logVinDecodeResult(result: z.infer<typeof vinDecodeResultSchema>, requestId: string, correlationId: string) {
  console.info(
    JSON.stringify({
      level: "info",
      event: "metric.counter",
      metric: "vin_decode_requests_total",
      value: 1,
      requestId,
      correlationId,
    }),
  );

  console.info(
    JSON.stringify({
      level: "info",
      event: "metric.counter",
      metric: result.ok ? "vin_decode_success_total" : "vin_decode_failure_total",
      value: 1,
      requestId,
      correlationId,
      errorCode: result.ok ? null : result.errorCode,
    }),
  );

  console.info(
    JSON.stringify({
      level: "info",
      event: "vin.decode",
      requestId,
      correlationId,
      vin: result.vin,
      source: result.source,
      ok: result.ok,
      errorCode: result.ok ? null : result.errorCode,
      retrievedAt: result.retrievedAt,
    }),
  );
}

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
    countryCode: row.countryCode,
    stateCode: row.stateCode,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function isUniqueVinViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const dbError = error as { code?: string; constraint?: string; detail?: string };
  if (dbError.code !== "23505") {
    return false;
  }

  return (
    dbError.constraint === "vehicle_user_vin_uq" ||
    (typeof dbError.detail === "string" && dbError.detail.includes("vehicle_user_vin_uq"))
  );
}

function assertUSOnly(countryCode: string) {
  if (countryCode !== "US") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Car Health Genius is currently available only in the United States",
      cause: {
        businessCode: "UNSUPPORTED_GEOGRAPHY",
        countryCode,
      },
    });
  }
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

export const vehiclesRouter = router({
  list: protectedProcedure.output(z.array(vehicleOutputSchema)).query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(vehicle)
      .where(eq(vehicle.userId, ctx.session.user.id))
      .orderBy(desc(vehicle.createdAt));

    return rows.map(mapVehicleRow);
  }),

  getById: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
      }),
    )
    .output(vehicleOutputSchema)
    .query(async ({ ctx, input }) => {
      const [foundVehicle] = await db
        .select()
        .from(vehicle)
        .where(and(eq(vehicle.id, input.vehicleId), eq(vehicle.userId, ctx.session.user.id)))
        .limit(1);

      if (!foundVehicle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vehicle not found",
        });
      }

      return mapVehicleRow(foundVehicle);
    }),

  getRecalls: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
      }),
    )
    .output(recallLookupOutputSchema)
    .query(async ({ ctx, input }) => {
      const [ownedVehicle] = await db
        .select({
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          modelYear: vehicle.modelYear,
        })
        .from(vehicle)
        .where(and(eq(vehicle.id, input.vehicleId), eq(vehicle.userId, ctx.session.user.id)))
        .limit(1);

      if (!ownedVehicle) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vehicle not found",
        });
      }

      try {
        const recalls = await getRecallsByVehicle({
          make: ownedVehicle.make,
          model: ownedVehicle.model,
          modelYear: ownedVehicle.modelYear,
        });

        console.info(
          JSON.stringify({
            level: "info",
            event: "recall.lookup",
            metric: "recall_fetch_total",
            requestId: ctx.requestId,
            correlationId: ctx.correlationId,
            vehicleId: ownedVehicle.id,
            cached: recalls.cached,
            stale: recalls.stale,
            recordCount: recalls.records.length,
          }),
        );

        return {
          ...recalls,
          vehicleId: ownedVehicle.id,
        };
      } catch (error) {
        if (error instanceof RecallServiceError && error.code === "RECALL_RATE_LIMITED") {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Recall lookup is temporarily rate limited. Please retry shortly.",
            cause: {
              businessCode: "RECALL_RATE_LIMITED",
            },
          });
        }

        console.error(
          JSON.stringify({
            level: "error",
            event: "recall.lookup.error",
            metric: "recall_fetch_failure_total",
            requestId: ctx.requestId,
            correlationId: ctx.correlationId,
            vehicleId: ownedVehicle.id,
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        );

        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "Recall provider is currently unavailable",
          cause: {
            businessCode: "RECALLS_UNAVAILABLE",
          },
        });
      }
    }),

  decodeVin: protectedProcedure
    .input(
      z.object({
        vin: vinSchema,
      }),
    )
    .output(vinDecodeResultSchema)
    .query(async ({ ctx, input }) => {
      const result = await decodeVin(input.vin);
      logVinDecodeResult(result, ctx.requestId, ctx.correlationId);
      return result;
    }),

  create: protectedProcedure
    .input(vehicleInputSchema)
    .output(vehicleOutputSchema)
    .mutation(async ({ ctx, input }) => {
      assertUSOnly(input.countryCode);

      try {
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
            countryCode: input.countryCode,
            stateCode: input.stateCode,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create vehicle",
          });
        }

        return mapVehicleRow(created);
      } catch (error) {
        if (isUniqueVinViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Vehicle VIN already exists for this user",
          });
        }
        throw error;
      }
    }),

  createFromVin: protectedProcedure
    .input(
      z.object({
        vin: vinSchema,
        mileage: z.number().int().nonnegative().optional(),
        countryCode: countryCodeSchema.default("US"),
        stateCode: stateCodeSchema.optional(),
      }),
    )
    .output(createFromVinOutputSchema)
    .mutation(async ({ ctx, input }) => {
      assertUSOnly(input.countryCode);

      const decodeResult = await decodeVin(input.vin);
      logVinDecodeResult(decodeResult, ctx.requestId, ctx.correlationId);
      if (!decodeResult.ok) {
        return {
          created: false,
          decode: decodeResult,
          requiresManualInput: true,
        };
      }

      const make = decodeResult.decoded.make;
      const model = decodeResult.decoded.model;
      const modelYear = decodeResult.decoded.modelYear;

      if (!make || !model || !modelYear) {
        return {
          created: false,
          decode: {
            ok: false,
            source: decodeResult.source,
            retrievedAt: decodeResult.retrievedAt,
            vin: decodeResult.vin,
            errorCode: "VIN_DECODE_NOT_FOUND",
            message: "VIN decode returned incomplete metadata",
            manualFallback: true,
          },
          requiresManualInput: true,
        };
      }

      try {
        const [created] = await db
          .insert(vehicle)
          .values({
            userId: ctx.session.user.id,
            vin: decodeResult.vin,
            make,
            model,
            modelYear,
            engine: decodeResult.decoded.engine,
            mileage: input.mileage,
            countryCode: input.countryCode,
            stateCode: input.stateCode,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create vehicle from VIN",
          });
        }

        return {
          created: true,
          decode: decodeResult,
          vehicle: mapVehicleRow(created),
        };
      } catch (error) {
        if (isUniqueVinViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Vehicle VIN already exists for this user",
          });
        }
        throw error;
      }
    }),

  update: protectedProcedure
    .input(vehicleUpdateSchema)
    .output(vehicleOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      if (input.countryCode !== undefined) {
        assertUSOnly(input.countryCode);
      }

      try {
        const [updated] = await db
          .update(vehicle)
          .set({
            vin: input.vin,
            make: input.make,
            model: input.model,
            modelYear: input.modelYear,
            engine: input.engine,
            mileage: input.mileage,
            countryCode: input.countryCode,
            stateCode: input.stateCode,
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
      } catch (error) {
        if (isUniqueVinViolation(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Vehicle VIN already exists for this user",
          });
        }
        throw error;
      }
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

  delete: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
      }),
    )
    .output(
      z.object({
        deleted: z.literal(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await db
        .delete(vehicle)
        .where(and(eq(vehicle.id, input.vehicleId), eq(vehicle.userId, ctx.session.user.id)))
        .returning({ id: vehicle.id });

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vehicle not found",
        });
      }

      return {
        deleted: true,
      };
    }),
});
