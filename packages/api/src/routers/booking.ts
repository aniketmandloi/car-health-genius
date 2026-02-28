import { db } from "@car-health-genius/db";
import { appendAuditLog } from "@car-health-genius/db/repositories/auditLog";
import { auditLog } from "@car-health-genius/db/schema/auditLog";
import { booking } from "@car-health-genius/db/schema/booking";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { assertBookingTransition, type BookingStatus } from "../services/bookingStateMachine.service";
import { assertBookablePartner, listBookablePartners } from "../services/partner.service";

const bookingStatusSchema = z.enum(["requested", "accepted", "alternate", "rejected", "confirmed"]);
const jsonRecordSchema = z.record(z.string(), z.unknown());

const bookingOutputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  vehicleId: z.number().int().positive(),
  diagnosticEventId: z.number().int().positive().nullable(),
  partnerId: z.number().int().positive().nullable(),
  issueSummary: z.string(),
  preferredWindowStart: z.string(),
  preferredWindowEnd: z.string(),
  alternateWindowStart: z.string().nullable(),
  alternateWindowEnd: z.string().nullable(),
  status: bookingStatusSchema,
  partnerResponseNote: z.string().nullable(),
  partnerRespondedAt: z.string().nullable(),
  requestedAt: z.string(),
  confirmedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const partnerStatusSchema = z.string().min(1);
const partnerVettingSchema = z.string().min(1);

const partnerListItemSchema = z.object({
  id: z.number().int().positive(),
  displayName: z.string(),
  slug: z.string(),
  launchMetro: z.string(),
  state: z.string().nullable(),
  status: partnerStatusSchema,
  vettingStatus: partnerVettingSchema,
  acceptsLeads: z.boolean(),
  availability: z.string().nullable(),
  pricingPolicyFlags: jsonRecordSchema.nullable(),
  serviceArea: jsonRecordSchema.nullable(),
  dataFreshnessAt: z.string().nullable(),
  updatedAt: z.string(),
});

const createLeadInputSchema = z
  .object({
    vehicleId: z.number().int().positive(),
    partnerId: z.number().int().positive(),
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
    alternateWindowStart: toIsoNullable(row.alternateWindowStart),
    alternateWindowEnd: toIsoNullable(row.alternateWindowEnd),
    status: bookingStatusSchema.parse(row.status),
    partnerResponseNote: row.partnerResponseNote,
    partnerRespondedAt: toIsoNullable(row.partnerRespondedAt),
    requestedAt: toIso(row.requestedAt),
    confirmedAt: toIsoNullable(row.confirmedAt),
    resolvedAt: toIsoNullable(row.resolvedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function readBusinessCodeFromError(error: unknown): string | undefined {
  if (!(error instanceof TRPCError)) {
    return undefined;
  }

  if (!error.cause || typeof error.cause !== "object") {
    return undefined;
  }

  const businessCode = (error.cause as { businessCode?: unknown }).businessCode;
  return typeof businessCode === "string" ? businessCode : undefined;
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
  listPartners: protectedProcedure
    .input(
      z
        .object({
          launchMetro: z.string().trim().min(1),
          limit: z.number().int().positive().max(100).optional(),
        })
        .optional(),
    )
    .output(z.array(partnerListItemSchema))
    .query(async ({ input }) => {
      const rows = await listBookablePartners({
        launchMetro: input?.launchMetro,
        limit: input?.limit,
      });
      return rows.map((row) => ({
        ...row,
        status: partnerStatusSchema.parse(row.status),
        vettingStatus: partnerVettingSchema.parse(row.vettingStatus),
      }));
    }),

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
      await assertBookablePartner(input.partnerId);

      if (input.diagnosticEventId) {
        await ensureDiagnosticEventMatchesVehicle(input.diagnosticEventId, input.vehicleId);
      }

      const [created] = await db
        .insert(booking)
        .values({
          userId: ctx.session.user.id,
          vehicleId: input.vehicleId,
          partnerId: input.partnerId,
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

      await appendAuditLog({
        actorUserId: ctx.session.user.id,
        actorRole: ctx.userRole,
        action: "booking.create_lead",
        targetType: "booking",
        targetId: String(created.id),
        changeSet: {
          status: created.status,
          partnerId: created.partnerId,
        },
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      });

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
        .select({
          id: booking.id,
          status: booking.status,
          partnerId: booking.partnerId,
          userId: booking.userId,
          requestedAt: booking.requestedAt,
          confirmedAt: booking.confirmedAt,
        })
        .from(booking)
        .where(and(eq(booking.id, input.bookingId), eq(booking.userId, ctx.session.user.id)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      let transition;
      try {
        transition = assertBookingTransition({
          fromStatus: bookingStatusSchema.parse(existing.status) as BookingStatus,
          toStatus: input.status,
          actor: "customer",
        });
      } catch (error) {
        const businessCode = readBusinessCodeFromError(error);
        if (businessCode === "INVALID_BOOKING_STATE_TRANSITION" || businessCode === "BOOKING_NOOP_TRANSITION") {
          console.info(
            JSON.stringify({
              level: "warn",
              event: "booking.transition.invalid",
              metric: "booking_invalid_transition_total",
              value: 1,
              requestId: ctx.requestId,
              correlationId: ctx.correlationId,
              userId: ctx.session.user.id,
              bookingId: input.bookingId,
              fromStatus: existing.status,
              toStatus: input.status,
              actor: "customer",
              businessCode,
            }),
          );
        }
        throw error;
      }

      if ((transition.toStatus === "confirmed" || transition.toStatus === "accepted" || transition.toStatus === "alternate") && existing.partnerId === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Booking cannot be advanced without a partner assignment",
          cause: {
            businessCode: "BOOKING_PARTNER_REQUIRED",
          },
        });
      }

      const [updated] = await db.transaction(async (tx) => {
        const [next] = await tx
          .update(booking)
          .set({
            status: input.status,
            partnerResponseNote: input.partnerResponseNote,
            confirmedAt: input.status === "confirmed" ? new Date() : existing.confirmedAt,
            resolvedAt: transition.isTerminal ? new Date() : null,
          })
          .where(eq(booking.id, input.bookingId))
          .returning();

        if (!next) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update booking status",
          });
        }

        await tx.insert(auditLog).values({
          actorUserId: ctx.session.user.id,
          actorRole: ctx.userRole,
          action: "booking.status.update",
          targetType: "booking",
          targetId: String(input.bookingId),
          changeSet: {
            fromStatus: existing.status,
            toStatus: input.status,
            actor: "customer",
          },
          requestId: ctx.requestId,
          correlationId: ctx.correlationId,
        });

        return [next];
      });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update booking status",
        });
      }

      console.info(
        JSON.stringify({
          level: "info",
          event: "booking.transition",
          metric: "booking_transition_total",
          value: 1,
          requestId: ctx.requestId,
          correlationId: ctx.correlationId,
          userId: ctx.session.user.id,
          bookingId: input.bookingId,
          fromStatus: existing.status,
          toStatus: input.status,
          actor: "customer",
        }),
      );

      if (input.status === "confirmed") {
        const requestedAtMs = new Date(toIso(existing.requestedAt)).getTime();
        const confirmedAtMs = Date.now();
        if (!Number.isNaN(requestedAtMs)) {
          const requestedToConfirmedHours = Math.max(
            0,
            Number(((confirmedAtMs - requestedAtMs) / (1000 * 60 * 60)).toFixed(2)),
          );
          console.info(
            JSON.stringify({
              level: "info",
              event: "booking.requested_to_confirmed",
              metric: "booking_requested_to_confirmed_hours",
              value: requestedToConfirmedHours,
              requestId: ctx.requestId,
              correlationId: ctx.correlationId,
              userId: ctx.session.user.id,
              bookingId: input.bookingId,
            }),
          );
        }
      }

      return mapBookingRow(updated);
    }),
});
