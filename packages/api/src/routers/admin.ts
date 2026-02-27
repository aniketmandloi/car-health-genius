import { appendAuditLog } from "@car-health-genius/db/repositories/auditLog";
import { db } from "@car-health-genius/db";
import { adapter } from "@car-health-genius/db/schema/adapter";
import { auditLog } from "@car-health-genius/db/schema/auditLog";
import { billingWebhookEvent } from "@car-health-genius/db/schema/billingWebhookEvent";
import { dtcKnowledge } from "@car-health-genius/db/schema/dtcKnowledge";
import { recommendation } from "@car-health-genius/db/schema/recommendation";
import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
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

const dtcKnowledgeOutputSchema = z.object({
  id: z.number().int().positive(),
  dtcCode: z.string(),
  category: z.string(),
  defaultSeverityClass: z.enum(["safe", "service_soon", "service_now"]),
  driveability: z.enum(["drivable", "limited", "do_not_drive"]),
  summaryTemplate: z.string(),
  rationaleTemplate: z.string().nullable(),
  safetyCritical: z.boolean(),
  diyAllowed: z.boolean(),
  source: z.string(),
  sourceVersion: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  metadata: jsonRecordSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const billingWebhookEventOutputSchema = z.object({
  id: z.number().int().positive(),
  provider: z.string(),
  eventType: z.string(),
  providerEventKey: z.string(),
  status: z.string(),
  payload: jsonRecordSchema,
  receivedAt: z.string(),
  processedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
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

const dtcSeverityClassSchema = z.enum(["safe", "service_soon", "service_now"]);
const driveabilitySchema = z.enum(["drivable", "limited", "do_not_drive"]);

const dtcKnowledgeUpsertInputSchema = z.object({
  dtcCode: z
    .string()
    .trim()
    .min(3)
    .max(16)
    .regex(/^[A-Za-z0-9-]+$/)
    .transform((value) => value.toUpperCase()),
  category: z.string().trim().min(1).default("powertrain"),
  defaultSeverityClass: dtcSeverityClassSchema,
  driveability: driveabilitySchema,
  summaryTemplate: z.string().trim().min(1),
  rationaleTemplate: z.string().trim().min(1).optional(),
  safetyCritical: z.boolean().default(false),
  diyAllowed: z.boolean().default(false),
  source: z.string().trim().min(1).default("admin"),
  sourceVersion: z.string().trim().min(1).default("v1"),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().nullable().optional(),
  metadata: jsonRecordSchema.optional(),
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

function mapDtcKnowledgeRow(row: typeof dtcKnowledge.$inferSelect) {
  return {
    id: row.id,
    dtcCode: row.dtcCode,
    category: row.category,
    defaultSeverityClass: dtcSeverityClassSchema.parse(row.defaultSeverityClass),
    driveability: driveabilitySchema.parse(row.driveability),
    summaryTemplate: row.summaryTemplate,
    rationaleTemplate: row.rationaleTemplate,
    safetyCritical: row.safetyCritical,
    diyAllowed: row.diyAllowed,
    source: row.source,
    sourceVersion: row.sourceVersion,
    effectiveFrom: toIso(row.effectiveFrom),
    effectiveTo: toIsoNullable(row.effectiveTo),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapBillingWebhookEventRow(row: typeof billingWebhookEvent.$inferSelect) {
  return {
    id: row.id,
    provider: row.provider,
    eventType: row.eventType,
    providerEventKey: row.providerEventKey,
    status: row.status,
    payload: (row.payload as Record<string, unknown>) ?? {},
    receivedAt: toIso(row.receivedAt),
    processedAt: toIsoNullable(row.processedAt),
    errorMessage: row.errorMessage,
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

  listDtcKnowledge: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(500).optional(),
        })
        .optional(),
    )
    .output(z.array(dtcKnowledgeOutputSchema))
    .query(async ({ input }) => {
      const limit = input?.limit ?? 200;
      const rows = await db.select().from(dtcKnowledge).orderBy(asc(dtcKnowledge.dtcCode)).limit(limit);
      return rows.map(mapDtcKnowledgeRow);
    }),

  upsertDtcKnowledge: adminProcedure
    .input(dtcKnowledgeUpsertInputSchema)
    .output(dtcKnowledgeOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [upserted] = await db
        .insert(dtcKnowledge)
        .values({
          dtcCode: input.dtcCode,
          category: input.category,
          defaultSeverityClass: input.defaultSeverityClass,
          driveability: input.driveability,
          summaryTemplate: input.summaryTemplate,
          rationaleTemplate: input.rationaleTemplate,
          safetyCritical: input.safetyCritical,
          diyAllowed: input.diyAllowed,
          source: input.source,
          sourceVersion: input.sourceVersion,
          effectiveFrom: input.effectiveFrom ?? new Date(),
          effectiveTo: input.effectiveTo ?? null,
          metadata: input.metadata,
        })
        .onConflictDoUpdate({
          target: dtcKnowledge.dtcCode,
          set: {
            category: input.category,
            defaultSeverityClass: input.defaultSeverityClass,
            driveability: input.driveability,
            summaryTemplate: input.summaryTemplate,
            rationaleTemplate: input.rationaleTemplate,
            safetyCritical: input.safetyCritical,
            diyAllowed: input.diyAllowed,
            source: input.source,
            sourceVersion: input.sourceVersion,
            effectiveFrom: input.effectiveFrom ?? new Date(),
            effectiveTo: input.effectiveTo ?? null,
            metadata: input.metadata,
          },
        })
        .returning();

      if (!upserted) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upsert DTC knowledge entry",
        });
      }

      await appendAuditLog({
        actorUserId: ctx.session.user.id,
        actorRole: ctx.userRole,
        action: "dtc_knowledge.upsert",
        targetType: "dtc_knowledge",
        targetId: upserted.dtcCode,
        changeSet: {
          category: upserted.category,
          defaultSeverityClass: upserted.defaultSeverityClass,
          driveability: upserted.driveability,
          safetyCritical: upserted.safetyCritical,
          diyAllowed: upserted.diyAllowed,
          source: upserted.source,
          sourceVersion: upserted.sourceVersion,
        },
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      });

      return mapDtcKnowledgeRow(upserted);
    }),

  listBillingWebhookEvents: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(200).optional(),
          status: z.enum(["processed", "failed", "received"]).optional(),
        })
        .optional(),
    )
    .output(z.array(billingWebhookEventOutputSchema))
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;

      const rows =
        input?.status !== undefined
          ? await db
              .select()
              .from(billingWebhookEvent)
              .where(eq(billingWebhookEvent.status, input.status))
              .orderBy(desc(billingWebhookEvent.receivedAt))
              .limit(limit)
          : await db.select().from(billingWebhookEvent).orderBy(desc(billingWebhookEvent.receivedAt)).limit(limit);

      return rows.map(mapBillingWebhookEventRow);
    }),
});
