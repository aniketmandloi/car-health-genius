import { appendAuditLog } from "@car-health-genius/db/repositories/auditLog";
import { db } from "@car-health-genius/db";
import { auditLog } from "@car-health-genius/db/schema/auditLog";
import { recommendation } from "@car-health-genius/db/schema/recommendation";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const auditLogOutputSchema = z.object({
  id: z.number().int().positive(),
  actorUserId: z.string().nullable(),
  actorRole: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  changeSet: z.record(z.string(), z.unknown()).nullable(),
  requestId: z.string().nullable(),
  correlationId: z.string().nullable(),
  createdAt: z.string(),
});

const recommendationOutputSchema = z.object({
  id: z.number().int().positive(),
  diagnosticEventId: z.number().int().positive(),
  recommendationType: z.string(),
  urgency: z.string(),
  confidence: z.number().int(),
  title: z.string(),
  details: z.record(z.string(), z.unknown()).nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapAuditLogRow(row: typeof auditLog.$inferSelect) {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    actorRole: row.actorRole,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    changeSet: (row.changeSet as Record<string, unknown> | null) ?? null,
    requestId: row.requestId,
    correlationId: row.correlationId,
    createdAt: toIso(row.createdAt),
  };
}

function mapRecommendationRow(row: typeof recommendation.$inferSelect) {
  return {
    id: row.id,
    diagnosticEventId: row.diagnosticEventId,
    recommendationType: row.recommendationType,
    urgency: row.urgency,
    confidence: row.confidence,
    title: row.title,
    details: (row.details as Record<string, unknown> | null) ?? null,
    isActive: row.isActive,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export const adminRouter = router({
  listAuditLogs: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(100).optional(),
        })
        .optional(),
    )
    .output(z.array(auditLogOutputSchema))
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const rows = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);

      return rows.map(mapAuditLogRow);
    }),

  setRecommendationFlag: protectedProcedure
    .input(
      z.object({
        recommendationId: z.number().int().positive(),
        enabled: z.boolean(),
        reason: z.string().trim().min(1),
      }),
    )
    .output(recommendationOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(recommendation)
        .set({
          isActive: input.enabled,
        })
        .where(eq(recommendation.id, input.recommendationId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recommendation not found",
        });
      }

      await appendAuditLog({
        actorUserId: ctx.session.user.id,
        actorRole: "admin_pending_rbac",
        action: "recommendation.flag.set",
        targetType: "recommendation",
        targetId: String(input.recommendationId),
        changeSet: {
          enabled: input.enabled,
          reason: input.reason,
        },
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      });

      return mapRecommendationRow(updated);
    }),
});
