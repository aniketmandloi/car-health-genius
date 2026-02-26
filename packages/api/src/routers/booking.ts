import { db } from "@car-health-genius/db";
import { booking } from "@car-health-genius/db/schema/booking";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const bookingStatusSchema = z.enum(["requested", "accepted", "alternate", "rejected", "confirmed"]);

const bookingOutputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  vehicleId: z.number().int().positive(),
  diagnosticEventId: z.number().int().positive().nullable(),
  partnerId: z.number().int().positive().nullable(),
  issueSummary: z.string(),
  preferredWindowStart: z.string(),
  preferredWindowEnd: z.string(),
  status: bookingStatusSchema,
  partnerResponseNote: z.string().nullable(),
  requestedAt: z.string(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const createLeadInputSchema = z
  .object({
    vehicleId: z.number().int().positive(),
    diagnosticEventId: z.number().int().positive().optional(),
    issueSummary: z.string().trim().min(1),
    preferredWindowStart: z.coerce.date(),
    preferredWindowEnd: z.coerce.date(),
  })
  .refine((input) => input.preferredWindowEnd > input.preferredWindowStart, {
    message: "Preferred window end must be after start",
    path: ["preferredWindowEnd"],
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

function mapBookingRow(row: typeof booking.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    vehicleId: row.vehicleId,
    diagnosticEventId: row.diagnosticEventId,
    partnerId: row.partnerId,
    issueSummary: row.issueSummary,
    preferredWindowStart: toIso(row.preferredWindowStart),
    preferredWindowEnd: toIso(row.preferredWindowEnd),
    status: bookingStatusSchema.parse(row.status),
    partnerResponseNote: row.partnerResponseNote,
    requestedAt: toIso(row.requestedAt),
    resolvedAt: toIsoNullable(row.resolvedAt),
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

export const bookingRouter = router({
  listMine: protectedProcedure.output(z.array(bookingOutputSchema)).query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(booking)
      .where(eq(booking.userId, ctx.session.user.id))
      .orderBy(desc(booking.requestedAt));

    return rows.map(mapBookingRow);
  }),

  createLead: protectedProcedure
    .input(createLeadInputSchema)
    .output(bookingOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      if (input.diagnosticEventId) {
        await ensureDiagnosticEventMatchesVehicle(input.diagnosticEventId, input.vehicleId);
      }

      const [created] = await db
        .insert(booking)
        .values({
          userId: ctx.session.user.id,
          vehicleId: input.vehicleId,
          diagnosticEventId: input.diagnosticEventId,
          issueSummary: input.issueSummary,
          preferredWindowStart: input.preferredWindowStart,
          preferredWindowEnd: input.preferredWindowEnd,
          status: "requested",
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create booking lead",
        });
      }

      return mapBookingRow(created);
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        bookingId: z.number().int().positive(),
        status: bookingStatusSchema,
        partnerResponseNote: z.string().trim().min(1).optional(),
      }),
    )
    .output(bookingOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: booking.id })
        .from(booking)
        .where(and(eq(booking.id, input.bookingId), eq(booking.userId, ctx.session.user.id)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      const [updated] = await db
        .update(booking)
        .set({
          status: input.status,
          partnerResponseNote: input.partnerResponseNote,
          resolvedAt: input.status === "confirmed" || input.status === "rejected" ? new Date() : null,
        })
        .where(eq(booking.id, input.bookingId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update booking status",
        });
      }

      return mapBookingRow(updated);
    }),
});
