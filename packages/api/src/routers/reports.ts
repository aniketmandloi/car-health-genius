import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { requireEntitlement } from "../services/entitlement.service";
import { buildVehicleHealthReport } from "../services/pdfReport.service";

const vehicleReportOutputSchema = z.object({
  generatedAt: z.string(),
  vehicle: z.object({
    id: z.number().int().positive(),
    make: z.string(),
    model: z.string(),
    modelYear: z.number().int(),
    vin: z.string().nullable(),
    mileage: z.number().int().nullable(),
    engine: z.string().nullable(),
  }),
  recentEvents: z.array(
    z.object({
      id: z.number().int().positive(),
      dtcCode: z.string(),
      severity: z.string(),
      occurredAt: z.string(),
      source: z.string(),
    }),
  ),
  activeRecommendations: z.array(
    z.object({
      id: z.number().int().positive(),
      diagnosticEventId: z.number().int().positive(),
      title: z.string(),
      urgency: z.string(),
      confidence: z.number().int(),
      recommendationType: z.string(),
    }),
  ),
  latestEstimates: z.array(
    z.object({
      id: z.number().int().positive(),
      diagnosticEventId: z.number().int().nonnegative().nullable(),
      region: z.string(),
      totalLowCents: z.number().int(),
      totalHighCents: z.number().int(),
    }),
  ),
  maintenanceItems: z.array(
    z.object({
      id: z.number().int().positive(),
      serviceType: z.string(),
      status: z.string(),
      dueDate: z.string().nullable(),
      dueMileage: z.number().int().nullable(),
    }),
  ),
  disclaimer: z.string(),
});

export const reportsRouter = router({
  generateVehicleHealthReport: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
      }),
    )
    .output(vehicleReportOutputSchema)
    .query(async ({ ctx, input }) => {
      await requireEntitlement(ctx.session.user.id, "pro.pdf_export");

      const report = await buildVehicleHealthReport(
        ctx.session.user.id,
        input.vehicleId,
      );

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vehicle not found",
        });
      }

      return report;
    }),
});
