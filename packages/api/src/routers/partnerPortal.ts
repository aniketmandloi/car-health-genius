import { appendAuditLog } from "@car-health-genius/db/repositories/auditLog";
import { db } from "@car-health-genius/db";
import { booking } from "@car-health-genius/db/schema/booking";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

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
  status: leadStatusSchema,
  partnerResponseNote: z.string().nullable(),
  requestedAt: z.string(),
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
    status: leadStatusSchema.parse(row.status),
    partnerResponseNote: row.partnerResponseNote,
    requestedAt: toIso(row.requestedAt),
    resolvedAt: toIsoNullable(row.resolvedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export const partnerPortalRouter = router({
  listOpenLeads: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(100).optional(),
        })
        .optional(),
    )
    .output(z.array(bookingOutputSchema))
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const rows = await db
        .select()
        .from(booking)
        .where(inArray(booking.status, ["requested", "alternate"]))
        .orderBy(desc(booking.requestedAt))
        .limit(limit);

      return rows.map(mapBookingRow);
    }),

  respondToLead: protectedProcedure
    .input(
      z.object({
        bookingId: z.number().int().positive(),
        status: z.enum(["accepted", "alternate", "rejected", "confirmed"]),
        message: z.string().trim().min(1).optional(),
      }),
    )
    .output(bookingOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db.select({ id: booking.id }).from(booking).where(eq(booking.id, input.bookingId)).limit(1);

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
          partnerResponseNote: input.message,
          resolvedAt: input.status === "confirmed" || input.status === "rejected" ? new Date() : null,
        })
        .where(and(eq(booking.id, input.bookingId)))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update lead",
        });
      }

      await appendAuditLog({
        actorUserId: ctx.session.user.id,
        actorRole: "partner_pending_rbac",
        action: "partner.lead.respond",
        targetType: "booking",
        targetId: String(input.bookingId),
        changeSet: {
          status: input.status,
          message: input.message,
        },
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      });

      return mapBookingRow(updated);
    }),
});
