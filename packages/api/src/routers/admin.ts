import { appendAuditLog } from "@car-health-genius/db/repositories/auditLog";
import { db } from "@car-health-genius/db";
import { adapter } from "@car-health-genius/db/schema/adapter";
import { auditLog } from "@car-health-genius/db/schema/auditLog";
import { recommendation } from "@car-health-genius/db/schema/recommendation";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, router } from "../index";

const jsonRecordSchema = z.record(z.string(), z.unknown());

const auditLogOutputSchema = z.object({
  id: z.number().int().positive(),
  actorUserId: z.string().nullable(),
  actorRole: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  changeSet: jsonRecordSchema.nullable(),
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
  details: jsonRecordSchema.nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const adapterStatusSchema = z.enum(["active", "archived", "deprecated"]);

const adapterOutputSchema = z.object({
  id: z.number().int().positive(),
  vendor: z.string(),
  model: z.string(),
  slug: z.string(),
  connectionType: z.string(),
  iosSupported: z.boolean(),
  androidSupported: z.boolean(),
  status: adapterStatusSchema,
  firmwareNotes: z.string().nullable(),
  metadata: jsonRecordSchema.nullable(),
  lastValidatedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const adapterCreateInputSchema = z.object({
  vendor: z.string().trim().min(1),
  model: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9-]+$/),
  connectionType: z.string().trim().min(1).optional(),
  iosSupported: z.boolean().optional(),
  androidSupported: z.boolean().optional(),
  status: adapterStatusSchema.optional(),
  firmwareNotes: z.string().trim().min(1).optional(),
  metadata: jsonRecordSchema.optional(),
  lastValidatedAt: z.coerce.date().optional(),
});

const adapterUpdateInputSchema = z
  .object({
    adapterId: z.number().int().positive(),
    vendor: z.string().trim().min(1).optional(),
    model: z.string().trim().min(1).optional(),
    slug: z
      .string()
      .trim()
      .min(2)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    connectionType: z.string().trim().min(1).optional(),
    iosSupported: z.boolean().optional(),
    androidSupported: z.boolean().optional(),
    status: adapterStatusSchema.optional(),
    firmwareNotes: z.string().trim().min(1).optional(),
    metadata: jsonRecordSchema.optional(),
    lastValidatedAt: z.coerce.date().nullable().optional(),
  })
  .refine(
    (input) =>
      input.vendor !== undefined ||
      input.model !== undefined ||
      input.slug !== undefined ||
      input.connectionType !== undefined ||
      input.iosSupported !== undefined ||
      input.androidSupported !== undefined ||
      input.status !== undefined ||
      input.firmwareNotes !== undefined ||
      input.metadata !== undefined ||
      input.lastValidatedAt !== undefined,
    {
      message: "At least one field is required for update",
      path: ["adapterId"],
    },
  );

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toIsoNullable(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  return toIso(value);
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

function mapAdapterRow(row: typeof adapter.$inferSelect) {
  return {
    id: row.id,
    vendor: row.vendor,
    model: row.model,
    slug: row.slug,
    connectionType: row.connectionType,
    iosSupported: row.iosSupported,
    androidSupported: row.androidSupported,
    status: adapterStatusSchema.parse(row.status),
    firmwareNotes: row.firmwareNotes,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    lastValidatedAt: toIsoNullable(row.lastValidatedAt),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export const adminRouter = router({
  listAuditLogs: adminProcedure
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

  setRecommendationFlag: adminProcedure
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
        actorRole: ctx.userRole,
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

  listAdapters: adminProcedure.output(z.array(adapterOutputSchema)).query(async () => {
    const rows = await db.select().from(adapter).orderBy(adapter.vendor, adapter.model);
    return rows.map(mapAdapterRow);
  }),

  createAdapter: adminProcedure
    .input(adapterCreateInputSchema)
    .output(adapterOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(adapter)
        .values({
          vendor: input.vendor,
          model: input.model,
          slug: input.slug,
          connectionType: input.connectionType ?? "bluetooth",
          iosSupported: input.iosSupported ?? false,
          androidSupported: input.androidSupported ?? false,
          status: input.status ?? "active",
          firmwareNotes: input.firmwareNotes,
          metadata: input.metadata,
          lastValidatedAt: input.lastValidatedAt,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create adapter",
        });
      }

      await appendAuditLog({
        actorUserId: ctx.session.user.id,
        actorRole: ctx.userRole,
        action: "adapter.create",
        targetType: "adapter",
        targetId: String(created.id),
        changeSet: {
          vendor: created.vendor,
          model: created.model,
          slug: created.slug,
          status: created.status,
        },
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      });

      return mapAdapterRow(created);
    }),

  updateAdapter: adminProcedure
    .input(adapterUpdateInputSchema)
    .output(adapterOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(adapter)
        .set({
          vendor: input.vendor,
          model: input.model,
          slug: input.slug,
          connectionType: input.connectionType,
          iosSupported: input.iosSupported,
          androidSupported: input.androidSupported,
          status: input.status,
          firmwareNotes: input.firmwareNotes,
          metadata: input.metadata,
          lastValidatedAt: input.lastValidatedAt,
        })
        .where(eq(adapter.id, input.adapterId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Adapter not found",
        });
      }

      await appendAuditLog({
        actorUserId: ctx.session.user.id,
        actorRole: ctx.userRole,
        action: "adapter.update",
        targetType: "adapter",
        targetId: String(input.adapterId),
        changeSet: {
          vendor: input.vendor,
          model: input.model,
          slug: input.slug,
          connectionType: input.connectionType,
          iosSupported: input.iosSupported,
          androidSupported: input.androidSupported,
          status: input.status,
          firmwareNotes: input.firmwareNotes,
          metadata: input.metadata,
          lastValidatedAt: input.lastValidatedAt?.toISOString() ?? null,
        },
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      });

      return mapAdapterRow(updated);
    }),

  archiveAdapter: adminProcedure
    .input(
      z.object({
        adapterId: z.number().int().positive(),
        reason: z.string().trim().min(1),
      }),
    )
    .output(adapterOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(adapter)
        .set({
          status: "archived",
        })
        .where(eq(adapter.id, input.adapterId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Adapter not found",
        });
      }

      await appendAuditLog({
        actorUserId: ctx.session.user.id,
        actorRole: ctx.userRole,
        action: "adapter.archive",
        targetType: "adapter",
        targetId: String(input.adapterId),
        changeSet: {
          reason: input.reason,
          status: "archived",
        },
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      });

      return mapAdapterRow(updated);
    }),
});
