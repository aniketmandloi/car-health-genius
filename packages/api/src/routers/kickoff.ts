import {
  createDiagnosticEventRecord,
  createRecommendationRecord,
  createVehicleForUser,
  getVehicleDiagnosticChain,
} from "@car-health-genius/db/repositories/kickoff";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const kickoffRouter = router({
  createVehicle: protectedProcedure
    .input(
      z.object({
        vin: z.string().trim().length(17).optional(),
        make: z.string().trim().min(1),
        model: z.string().trim().min(1),
        modelYear: z.number().int().min(1980),
        engine: z.string().trim().min(1).optional(),
        mileage: z.number().int().nonnegative().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await createVehicleForUser({
        userId: ctx.session.user.id,
        ...input,
      });
    }),

  createDiagnosticEvent: protectedProcedure
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
    .mutation(async ({ input }) => {
      return await createDiagnosticEventRecord(input);
    }),

  createRecommendation: protectedProcedure
    .input(
      z.object({
        diagnosticEventId: z.number().int().positive(),
        recommendationType: z.string().trim().min(1),
        urgency: z.string().trim().min(1),
        confidence: z.number().int().min(0).max(100).optional(),
        title: z.string().trim().min(1),
        details: jsonRecordSchema.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await createRecommendationRecord(input);
    }),

  getVehicleChain: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await getVehicleDiagnosticChain({
        userId: ctx.session.user.id,
        vehicleId: input.vehicleId,
      });
    }),
});
