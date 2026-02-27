import { appendAuditLog } from "@car-health-genius/db/repositories/auditLog";
import { db } from "@car-health-genius/db";
import { adapter } from "@car-health-genius/db/schema/adapter";
import { analyticsEvent } from "@car-health-genius/db/schema/analyticsEvent";
import { auditLog } from "@car-health-genius/db/schema/auditLog";
import { billingWebhookEvent } from "@car-health-genius/db/schema/billingWebhookEvent";
import { dtcKnowledge } from "@car-health-genius/db/schema/dtcKnowledge";
import { modelTrace } from "@car-health-genius/db/schema/modelTrace";
import { recommendation } from "@car-health-genius/db/schema/recommendation";
import { reviewQueueItem } from "@car-health-genius/db/schema/reviewQueueItem";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
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
const reviewQueueStatusSchema = z.enum(["pending", "in_review", "approved", "rejected", "needs_revision"]);
const reviewResolutionSchema = z.enum(["approved", "rejected", "needs_revision"]);

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

const reviewQueueItemOutputSchema = z.object({
  id: z.number().int().positive(),
  status: reviewQueueStatusSchema,
  triggerReason: z.string(),
  triggerMetadata: jsonRecordSchema.nullable(),
  diagnosticEventId: z.number().int().positive(),
  recommendationId: z.number().int().positive().nullable(),
  modelTraceId: z.number().int().positive().nullable(),
  confidence: z.number().int(),
  urgency: z.string(),
  policyBlocked: z.boolean(),
  claimedByUserId: z.string().nullable(),
  claimedAt: z.string().nullable(),
  resolvedByUserId: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  resolution: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const modelTraceOutputSchema = z.object({
  id: z.number().int().positive(),
  requestId: z.string().nullable(),
  correlationId: z.string().nullable(),
  userId: z.string().nullable(),
  diagnosticEventId: z.number().int().positive().nullable(),
  recommendationId: z.number().int().positive().nullable(),
  modelRegistryId: z.number().int().positive().nullable(),
  promptTemplateId: z.number().int().positive().nullable(),
  generatorType: z.string(),
  inputHash: z.string(),
  outputSummary: z.string().nullable(),
  policyBlocked: z.boolean(),
  policyReasons: jsonRecordSchema.nullable(),
  fallbackApplied: z.boolean(),
  metadata: jsonRecordSchema.nullable(),
  createdAt: z.string(),
});

const monetizationDailyRowSchema = z.object({
  day: z.string(),
  paywallView: z.number().int().nonnegative(),
  upgradeStart: z.number().int().nonnegative(),
  upgradeSuccess: z.number().int().nonnegative(),
  subscriptionChurn: z.number().int().nonnegative(),
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

function mapReviewQueueItemRow(row: typeof reviewQueueItem.$inferSelect) {
  return {
    id: row.id,
    status: reviewQueueStatusSchema.parse(row.status),
    triggerReason: row.triggerReason,
    triggerMetadata: (row.triggerMetadata as Record<string, unknown> | null) ?? null,
    diagnosticEventId: row.diagnosticEventId,
    recommendationId: row.recommendationId,
    modelTraceId: row.modelTraceId,
    confidence: row.confidence,
    urgency: row.urgency,
    policyBlocked: row.policyBlocked,
    claimedByUserId: row.claimedByUserId,
    claimedAt: toIsoNullable(row.claimedAt),
    resolvedByUserId: row.resolvedByUserId,
    resolvedAt: toIsoNullable(row.resolvedAt),
    resolution: row.resolution,
    resolutionNotes: row.resolutionNotes,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapModelTraceRow(row: typeof modelTrace.$inferSelect) {
  return {
    id: row.id,
    requestId: row.requestId,
    correlationId: row.correlationId,
    userId: row.userId,
    diagnosticEventId: row.diagnosticEventId,
    recommendationId: row.recommendationId,
    modelRegistryId: row.modelRegistryId,
    promptTemplateId: row.promptTemplateId,
    generatorType: row.generatorType,
    inputHash: row.inputHash,
    outputSummary: row.outputSummary,
    policyBlocked: row.policyBlocked,
    policyReasons: (row.policyReasons as Record<string, unknown> | null) ?? null,
    fallbackApplied: row.fallbackApplied,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: toIso(row.createdAt),
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

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
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

  listModelTraces: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().positive().max(200).optional(),
          userId: z.string().trim().min(1).optional(),
        })
        .optional(),
    )
    .output(z.array(modelTraceOutputSchema))
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;
      const rows = input?.userId
        ? await db
            .select()
            .from(modelTrace)
            .where(eq(modelTrace.userId, input.userId))
            .orderBy(desc(modelTrace.createdAt))
            .limit(limit)
        : await db.select().from(modelTrace).orderBy(desc(modelTrace.createdAt)).limit(limit);

      return rows.map(mapModelTraceRow);
    }),

  monetizationDailyFunnel: adminProcedure
    .input(
      z
        .object({
          days: z.number().int().positive().max(90).optional(),
        })
        .optional(),
    )
    .output(z.array(monetizationDailyRowSchema))
    .query(async ({ input }) => {
      const days = input?.days ?? 14;
      const end = new Date();
      const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

      const eventNames = ["paywall_view", "upgrade_start", "upgrade_success", "subscription_churn"] as const;
      const rows = await db
        .select({
          eventName: analyticsEvent.eventName,
          occurredAt: analyticsEvent.occurredAt,
        })
        .from(analyticsEvent)
        .where(
          and(
            inArray(analyticsEvent.eventName, [...eventNames]),
            gte(analyticsEvent.occurredAt, start),
            lte(analyticsEvent.occurredAt, end),
          ),
        )
        .orderBy(desc(analyticsEvent.occurredAt));

      const byDay = new Map<
        string,
        {
          paywallView: number;
          upgradeStart: number;
          upgradeSuccess: number;
          subscriptionChurn: number;
        }
      >();

      for (let offset = 0; offset < days; offset += 1) {
        const date = new Date(start.getTime() + offset * 24 * 60 * 60 * 1000);
        byDay.set(dayKey(date), {
          paywallView: 0,
          upgradeStart: 0,
          upgradeSuccess: 0,
          subscriptionChurn: 0,
        });
      }

      for (const row of rows) {
        const occurredAt = row.occurredAt instanceof Date ? row.occurredAt : new Date(row.occurredAt);
        const key = dayKey(occurredAt);
        const bucket = byDay.get(key);
        if (!bucket) {
          continue;
        }

        if (row.eventName === "paywall_view") {
          bucket.paywallView += 1;
          continue;
        }

        if (row.eventName === "upgrade_start") {
          bucket.upgradeStart += 1;
          continue;
        }

        if (row.eventName === "upgrade_success") {
          bucket.upgradeSuccess += 1;
          continue;
        }

        if (row.eventName === "subscription_churn") {
          bucket.subscriptionChurn += 1;
        }
      }

      return Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, bucket]) => ({
          day,
          ...bucket,
        }));
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

  listReviewQueue: adminProcedure
    .input(
      z
        .object({
          status: reviewQueueStatusSchema.optional(),
          limit: z.number().int().positive().max(200).optional(),
        })
        .optional(),
    )
    .output(z.array(reviewQueueItemOutputSchema))
    .query(async ({ input }) => {
      const limit = input?.limit ?? 100;
      const rows = input?.status
        ? await db
            .select()
            .from(reviewQueueItem)
            .where(eq(reviewQueueItem.status, input.status))
            .orderBy(desc(reviewQueueItem.createdAt))
            .limit(limit)
        : await db.select().from(reviewQueueItem).orderBy(desc(reviewQueueItem.createdAt)).limit(limit);

      return rows.map(mapReviewQueueItemRow);
    }),

  claimReviewItem: adminProcedure
    .input(
      z.object({
        itemId: z.number().int().positive(),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .output(reviewQueueItemOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(reviewQueueItem)
        .where(eq(reviewQueueItem.id, input.itemId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review queue item not found",
        });
      }

      if (existing.status !== "pending") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Review queue item is not pending",
        });
      }

      const [updated] = await db
        .update(reviewQueueItem)
        .set({
          status: "in_review",
          claimedByUserId: ctx.session.user.id,
          claimedAt: new Date(),
          resolutionNotes: input.note,
        })
        .where(eq(reviewQueueItem.id, input.itemId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to claim review queue item",
        });
      }

      await appendAuditLog({
        actorUserId: ctx.session.user.id,
        actorRole: ctx.userRole,
        action: "review_queue.claim",
        targetType: "review_queue_item",
        targetId: String(input.itemId),
        changeSet: {
          status: "in_review",
          note: input.note,
        },
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      });

      return mapReviewQueueItemRow(updated);
    }),

  resolveReviewItem: adminProcedure
    .input(
      z.object({
        itemId: z.number().int().positive(),
        resolution: reviewResolutionSchema,
        notes: z.string().trim().min(1).max(1000),
      }),
    )
    .output(reviewQueueItemOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(reviewQueueItem)
        .where(eq(reviewQueueItem.id, input.itemId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review queue item not found",
        });
      }

      if (existing.status === "approved" || existing.status === "rejected" || existing.status === "needs_revision") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Review queue item is already resolved",
        });
      }

      const [updated] = await db
        .update(reviewQueueItem)
        .set({
          status: input.resolution,
          resolvedByUserId: ctx.session.user.id,
          resolvedAt: new Date(),
          resolution: input.resolution,
          resolutionNotes: input.notes,
        })
        .where(eq(reviewQueueItem.id, input.itemId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to resolve review queue item",
        });
      }

      await appendAuditLog({
        actorUserId: ctx.session.user.id,
        actorRole: ctx.userRole,
        action: "review_queue.resolve",
        targetType: "review_queue_item",
        targetId: String(input.itemId),
        changeSet: {
          resolution: input.resolution,
          notes: input.notes,
        },
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
      });

      return mapReviewQueueItemRow(updated);
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
