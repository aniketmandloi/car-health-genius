import { db } from "@car-health-genius/db";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { recommendation } from "@car-health-genius/db/schema/recommendation";
import { supportIssue } from "@car-health-genius/db/schema/supportIssue";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { resolveSupportPriority } from "../services/supportPriority.service";

const jsonRecordSchema = z.record(z.string(), z.unknown());
const supportPriorityTierSchema = z.enum(["priority", "standard"]);

const supportPayloadOutputSchema = z.object({
  issueSummary: z.string(),
  issueDetails: z.string().nullable(),
  includeDiagnosticBundle: z.boolean(),
  requesterUserId: z.string(),
  priorityTier: supportPriorityTierSchema,
  priorityReason: z.string(),
  slaTargetMinutes: z.number().int().positive(),
  generatedAt: z.string(),
});

const supportIssueStatusSchema = z.enum(["open", "in_progress", "resolved", "closed"]);

const supportIssueOutputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  issueSummary: z.string(),
  issueDetails: z.string().nullable(),
  includeDiagnosticBundle: z.boolean(),
  consentedToDiagnosticBundle: z.boolean(),
  consentCapturedAt: z.string().nullable(),
  diagnosticBundle: jsonRecordSchema.nullable(),
  priorityTier: supportPriorityTierSchema,
  priorityReason: z.string(),
  slaTargetMinutes: z.number().int().positive(),
  status: supportIssueStatusSchema,
  metadata: jsonRecordSchema.nullable(),
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

function mapSupportIssueRow(row: typeof supportIssue.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    issueSummary: row.issueSummary,
    issueDetails: row.issueDetails,
    includeDiagnosticBundle: row.includeDiagnosticBundle,
    consentedToDiagnosticBundle: row.consentedToDiagnosticBundle,
    consentCapturedAt: toIsoNullable(row.consentCapturedAt),
    diagnosticBundle: (row.diagnosticBundle as Record<string, unknown> | null) ?? null,
    priorityTier: supportPriorityTierSchema.parse(row.priorityTier),
    priorityReason: row.priorityReason,
    slaTargetMinutes: row.slaTargetMinutes,
    status: supportIssueStatusSchema.parse(row.status),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function buildDiagnosticBundle(userId: string) {
  const recentEvents = await db
    .select({
      id: diagnosticEvent.id,
      vehicleId: diagnosticEvent.vehicleId,
      dtcCode: diagnosticEvent.dtcCode,
      severity: diagnosticEvent.severity,
      source: diagnosticEvent.source,
      occurredAt: diagnosticEvent.occurredAt,
    })
    .from(diagnosticEvent)
    .innerJoin(vehicle, eq(diagnosticEvent.vehicleId, vehicle.id))
    .where(eq(vehicle.userId, userId))
    .orderBy(desc(diagnosticEvent.occurredAt), desc(diagnosticEvent.createdAt))
    .limit(10);

  const eventIds = recentEvents.map((event) => event.id);
  const recentRecommendations =
    eventIds.length === 0
      ? []
      : await db
          .select({
            id: recommendation.id,
            diagnosticEventId: recommendation.diagnosticEventId,
            recommendationType: recommendation.recommendationType,
            urgency: recommendation.urgency,
            confidence: recommendation.confidence,
            title: recommendation.title,
            isActive: recommendation.isActive,
            createdAt: recommendation.createdAt,
          })
          .from(recommendation)
          .where(inArray(recommendation.diagnosticEventId, eventIds))
          .orderBy(desc(recommendation.createdAt))
          .limit(20);

  return {
    capturedAt: new Date().toISOString(),
    events: recentEvents.map((event) => ({
      ...event,
      occurredAt: toIso(event.occurredAt),
    })),
    recommendations: recentRecommendations.map((row) => ({
      ...row,
      createdAt: toIso(row.createdAt),
    })),
  } as Record<string, unknown>;
}

export const supportRouter = router({
  buildPayload: protectedProcedure
    .input(
      z.object({
        issueSummary: z.string().trim().min(1).max(240),
        issueDetails: z.string().trim().max(4000).optional(),
        includeDiagnosticBundle: z.boolean().default(false),
      }),
    )
    .output(supportPayloadOutputSchema)
    .query(async ({ ctx, input }) => {
      const priority = await resolveSupportPriority(ctx.session.user.id);

      return {
        issueSummary: input.issueSummary,
        issueDetails: input.issueDetails ?? null,
        includeDiagnosticBundle: input.includeDiagnosticBundle,
        requesterUserId: ctx.session.user.id,
        priorityTier: priority.priorityTier,
        priorityReason: priority.priorityReason,
        slaTargetMinutes: priority.slaTargetMinutes,
        generatedAt: new Date().toISOString(),
      };
    }),

  createIssue: protectedProcedure
    .input(
      z.object({
        issueSummary: z.string().trim().min(1).max(240),
        issueDetails: z.string().trim().max(4000).optional(),
        includeDiagnosticBundle: z.boolean().default(false),
        consentDiagnosticBundle: z.boolean().default(false),
      }),
    )
    .output(supportIssueOutputSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.includeDiagnosticBundle && !input.consentDiagnosticBundle) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must explicitly consent before attaching diagnostic data",
          cause: {
            businessCode: "SUPPORT_BUNDLE_CONSENT_REQUIRED",
          },
        });
      }

      const priority = await resolveSupportPriority(ctx.session.user.id);
      const diagnosticBundle = input.includeDiagnosticBundle
        ? await buildDiagnosticBundle(ctx.session.user.id)
        : null;

      const [created] = await db
        .insert(supportIssue)
        .values({
          userId: ctx.session.user.id,
          issueSummary: input.issueSummary,
          issueDetails: input.issueDetails ?? null,
          includeDiagnosticBundle: input.includeDiagnosticBundle,
          consentedToDiagnosticBundle: input.includeDiagnosticBundle,
          consentCapturedAt: input.includeDiagnosticBundle ? new Date() : null,
          diagnosticBundle,
          priorityTier: priority.priorityTier,
          priorityReason: priority.priorityReason,
          slaTargetMinutes: priority.slaTargetMinutes,
          status: "open",
          metadata: {
            requestId: ctx.requestId,
            correlationId: ctx.correlationId,
          },
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create support issue",
        });
      }

      return mapSupportIssueRow(created);
    }),

  listMyIssues: protectedProcedure
    .output(z.array(supportIssueOutputSchema))
    .query(async ({ ctx }) => {
      const rows = await db
        .select()
        .from(supportIssue)
        .where(eq(supportIssue.userId, ctx.session.user.id))
        .orderBy(desc(supportIssue.createdAt));

      return rows.map(mapSupportIssueRow);
    }),

  getIssue: protectedProcedure
    .input(
      z.object({
        issueId: z.number().int().positive(),
      }),
    )
    .output(supportIssueOutputSchema)
    .query(async ({ ctx, input }) => {
      const [ownedIssue] = await db
        .select()
        .from(supportIssue)
        .where(and(eq(supportIssue.id, input.issueId), eq(supportIssue.userId, ctx.session.user.id)))
        .limit(1);

      if (!ownedIssue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Support issue not found",
        });
      }

      return mapSupportIssueRow(ownedIssue);
    }),
});
