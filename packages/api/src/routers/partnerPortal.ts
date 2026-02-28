import { db } from "@car-health-genius/db";
import { auditLog } from "@car-health-genius/db/schema/auditLog";
import { booking } from "@car-health-genius/db/schema/booking";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { partnerProcedure, router } from "../index";
import { assertBookingTransition, type BookingStatus } from "../services/bookingStateMachine.service";

const leadStatusSchema = z.enum(["requested", "accepted", "alternate", "rejected", "confirmed"]);

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
  status: leadStatusSchema,
  partnerResponseNote: z.string().nullable(),
  partnerRespondedAt: z.string().nullable(),
  requestedAt: z.string(),
  confirmedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
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
    status: leadStatusSchema.parse(row.status),
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

export const partnerPortalRouter = router({
  listOpenLeads: partnerProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(100).optional(),
        })
        .optional(),
    )
    .output(z.array(bookingOutputSchema))
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const rows = await db
        .select()
        .from(booking)
        .where(and(inArray(booking.status, ["requested", "alternate"]), eq(booking.partnerId, ctx.partnerMembership.partnerId)))
        .orderBy(desc(booking.requestedAt))
        .limit(limit);

      return rows.map(mapBookingRow);
    }),

  respondToLead: partnerProcedure
    .input(
      z
        .object({
          bookingId: z.number().int().positive(),
          status: z.enum(["accepted", "alternate", "rejected"]),
          message: z.string().trim().min(1).optional(),
          alternateWindowStart: z.coerce.date().optional(),
          alternateWindowEnd: z.coerce.date().optional(),
        })
        .superRefine((input, ctx) => {
          if (input.status === "alternate") {
            if (!input.alternateWindowStart) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Alternate window start is required when proposing alternate time",
                path: ["alternateWindowStart"],
              });
            }
            if (!input.alternateWindowEnd) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Alternate window end is required when proposing alternate time",
                path: ["alternateWindowEnd"],
              });
            }
            if (
              input.alternateWindowStart &&
              input.alternateWindowEnd &&
              input.alternateWindowEnd <= input.alternateWindowStart
            ) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Alternate window end must be after start",
                path: ["alternateWindowEnd"],
              });
            }
          }
        }),
    )
    .output(bookingOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({
          id: booking.id,
          status: booking.status,
          partnerId: booking.partnerId,
        })
        .from(booking)
        .where(and(eq(booking.id, input.bookingId), eq(booking.partnerId, ctx.partnerMembership.partnerId)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead not found",
        });
      }

      let transition;
      try {
        transition = assertBookingTransition({
          fromStatus: leadStatusSchema.parse(existing.status) as BookingStatus,
          toStatus: input.status,
          actor: "partner",
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
              actor: "partner",
              businessCode,
            }),
          );
        }
        throw error;
      }

      const [updated] = await db.transaction(async (tx) => {
        const [next] = await tx
          .update(booking)
          .set({
            status: input.status,
            partnerResponseNote: input.message,
            alternateWindowStart: input.status === "alternate" ? input.alternateWindowStart ?? null : null,
            alternateWindowEnd: input.status === "alternate" ? input.alternateWindowEnd ?? null : null,
            partnerRespondedAt: new Date(),
            resolvedAt: transition.isTerminal ? new Date() : null,
          })
          .where(and(eq(booking.id, input.bookingId), eq(booking.partnerId, ctx.partnerMembership.partnerId)))
          .returning();

        if (!next) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update lead",
          });
        }

        await tx.insert(auditLog).values({
          actorUserId: ctx.session.user.id,
          actorRole: ctx.userRole,
          action: "partner.lead.respond",
          targetType: "booking",
          targetId: String(input.bookingId),
          changeSet: {
            fromStatus: existing.status,
            status: input.status,
            message: input.message,
            alternateWindowStart: input.alternateWindowStart?.toISOString() ?? null,
            alternateWindowEnd: input.alternateWindowEnd?.toISOString() ?? null,
            actor: "partner",
          },
          requestId: ctx.requestId,
          correlationId: ctx.correlationId,
        });

        return [next];
      });

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update lead",
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
          actor: "partner",
        }),
      );

      return mapBookingRow(updated);
    }),
});
