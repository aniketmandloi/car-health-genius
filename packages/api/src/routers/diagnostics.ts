import { randomUUID } from "node:crypto";

import { db } from "@car-health-genius/db";
import { adapter } from "@car-health-genius/db/schema/adapter";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { obdSession } from "@car-health-genius/db/schema/obdSession";
import { timelineEvent } from "@car-health-genius/db/schema/timelineEvent";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import {
  buildIngestIdempotencyKey,
  ingestScanInputSchema,
  normalizeIngestScanInput,
  type IngestScanInput,
} from "../services/obd.service";
import { withActiveSpan } from "../services/tracing.service";

const jsonRecordSchema = z.record(z.string(), z.unknown());

const diagnosticEventOutputSchema = z.object({
  id: z.number().int().positive(),
  vehicleId: z.number().int().positive(),
  obdSessionId: z.number().int().positive().nullable(),
  source: z.string(),
  dtcCode: z.string(),
  severity: z.string(),
  ingestIdempotencyKey: z.string().nullable(),
  freezeFrame: jsonRecordSchema.nullable(),
  sensorSnapshot: jsonRecordSchema.nullable(),
  capturedAt: z.string().nullable(),
  occurredAt: z.string(),
  ingestedAt: z.string(),
  createdAt: z.string(),
});

const clearCodeOutputSchema = z.object({
  event: diagnosticEventOutputSchema,
  cleared: z.literal(true),
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

const obdSessionStatusSchema = z.enum(["active", "completed", "failed", "cancelled"]);

const obdSessionOutputSchema = z.object({
  id: z.number().int().positive(),
  sessionKey: z.string(),
  userId: z.string(),
  vehicleId: z.number().int().positive(),
  adapterId: z.number().int().positive().nullable(),
  adapterSlug: z.string().nullable(),
  status: obdSessionStatusSchema,
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  metadata: jsonRecordSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const timelineEventOutputSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string(),
  vehicleId: z.number().int().positive(),
  obdSessionId: z.number().int().positive().nullable(),
  eventType: z.string(),
  eventRefId: z.number().int().positive().nullable(),
  source: z.string(),
  payload: jsonRecordSchema.nullable(),
  occurredAt: z.string(),
  createdAt: z.string(),
});

const ingestScanOutputSchema = z.object({
  session: obdSessionOutputSchema,
  events: z.array(diagnosticEventOutputSchema),
  deduplicated: z.boolean(),
  insertedCount: z.number().int().nonnegative(),
});

const timelineByVehicleOutputSchema = z.object({
  events: z.array(timelineEventOutputSchema),
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

function mapDiagnosticEventRow(row: typeof diagnosticEvent.$inferSelect) {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    obdSessionId: row.obdSessionId,
    source: row.source,
    dtcCode: row.dtcCode,
    severity: row.severity,
    ingestIdempotencyKey: row.ingestIdempotencyKey,
    freezeFrame: (row.freezeFrame as Record<string, unknown> | null) ?? null,
    sensorSnapshot: (row.sensorSnapshot as Record<string, unknown> | null) ?? null,
    capturedAt: toIsoNullable(row.capturedAt),
    occurredAt: toIso(row.occurredAt),
    ingestedAt: toIso(row.ingestedAt),
    createdAt: toIso(row.createdAt),
  };
}

function mapObdSessionRow(row: typeof obdSession.$inferSelect) {
  return {
    id: row.id,
    sessionKey: row.sessionKey,
    userId: row.userId,
    vehicleId: row.vehicleId,
    adapterId: row.adapterId,
    adapterSlug: row.adapterSlug,
    status: obdSessionStatusSchema.parse(row.status),
    startedAt: toIso(row.startedAt),
    endedAt: toIsoNullable(row.endedAt),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function mapTimelineEventRow(row: typeof timelineEvent.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    vehicleId: row.vehicleId,
    obdSessionId: row.obdSessionId,
    eventType: row.eventType,
    eventRefId: row.eventRefId,
    source: row.source,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    occurredAt: toIso(row.occurredAt),
    createdAt: toIso(row.createdAt),
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

function isUniqueIngestViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const dbError = error as { code?: string; constraint?: string; detail?: string };
  if (dbError.code !== "23505") {
    return false;
  }

  return (
    dbError.constraint === "diagnostic_event_ingest_idempotency_key_uq" ||
    (typeof dbError.detail === "string" && dbError.detail.includes("diagnostic_event_ingest_idempotency_key_uq"))
  );
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

async function getOwnedSession(userId: string, sessionId: number) {
  const [session] = await db
    .select()
    .from(obdSession)
    .where(and(eq(obdSession.id, sessionId), eq(obdSession.userId, userId)))
    .limit(1);

  if (!session) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "OBD session not found",
    });
  }

  return session;
}

async function insertIngestEventWithIdempotency(args: {
  session: typeof obdSession.$inferSelect;
  input: IngestScanInput;
  index: number;
}) {
  const reading = args.input.dtcReadings[args.index];
  if (!reading) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid scan reading",
    });
  }

  const ingestKey = buildIngestIdempotencyKey(args.input.uploadId, args.index);

  try {
    const [created] = await db
      .insert(diagnosticEvent)
      .values({
        vehicleId: args.session.vehicleId,
        obdSessionId: args.session.id,
        source: args.input.source ?? "obd_scan",
        dtcCode: reading.dtcCode,
        severity: reading.severity ?? "unknown",
        ingestIdempotencyKey: ingestKey,
        freezeFrame: reading.freezeFrame,
        sensorSnapshot: reading.sensorSnapshot,
        capturedAt: args.input.capturedAt ?? reading.occurredAt,
        occurredAt: reading.occurredAt ?? args.input.capturedAt ?? new Date(),
      })
      .returning();

    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to persist scan event",
      });
    }

    return {
      row: created,
      inserted: true,
    };
  } catch (error) {
    if (!isUniqueIngestViolation(error)) {
      throw error;
    }

    const [existing] = await db
      .select()
      .from(diagnosticEvent)
      .where(eq(diagnosticEvent.ingestIdempotencyKey, ingestKey))
      .limit(1);

    if (!existing) {
      throw error;
    }

    return {
      row: existing,
      inserted: false,
    };
  }
}

export const diagnosticsRouter = router({
  listCompatibleAdapters: protectedProcedure.output(z.array(adapterOutputSchema)).query(async () => {
    const rows = await db
      .select()
      .from(adapter)
      .where(eq(adapter.status, "active"))
      .orderBy(asc(adapter.vendor), asc(adapter.model));

    return rows.map(mapAdapterRow);
  }),

  startSession: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
        sessionKey: z.string().trim().min(8).max(100).optional(),
        adapterSlug: z.string().trim().min(1).optional(),
        metadata: jsonRecordSchema.optional(),
      }),
    )
    .output(obdSessionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      let resolvedAdapterId: number | null = null;
      if (input.adapterSlug) {
        const [knownAdapter] = await db
          .select({
            id: adapter.id,
          })
          .from(adapter)
          .where(and(eq(adapter.slug, input.adapterSlug), eq(adapter.status, "active")))
          .limit(1);

        if (!knownAdapter) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Adapter is not in the active compatibility list",
            cause: {
              businessCode: "ADAPTER_NOT_COMPATIBLE",
            },
          });
        }

        resolvedAdapterId = knownAdapter.id;
      }

      const sessionKey = input.sessionKey ?? randomUUID();
      const [existing] = await db
        .select()
        .from(obdSession)
        .where(eq(obdSession.sessionKey, sessionKey))
        .limit(1);

      if (existing) {
        if (existing.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Session key already exists",
          });
        }

        return mapObdSessionRow(existing);
      }

      const [created] = await db
        .insert(obdSession)
        .values({
          sessionKey,
          userId: ctx.session.user.id,
          vehicleId: input.vehicleId,
          adapterId: resolvedAdapterId,
          adapterSlug: input.adapterSlug,
          status: "active",
          metadata: input.metadata,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start OBD session",
        });
      }

      return mapObdSessionRow(created);
    }),

  finishSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.number().int().positive(),
        status: z.enum(["completed", "failed", "cancelled"]).default("completed"),
      }),
    )
    .output(obdSessionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const ownedSession = await getOwnedSession(ctx.session.user.id, input.sessionId);
      if (ownedSession.endedAt) {
        return mapObdSessionRow(ownedSession);
      }

      const [updated] = await db
        .update(obdSession)
        .set({
          status: input.status,
          endedAt: new Date(),
        })
        .where(and(eq(obdSession.id, input.sessionId), eq(obdSession.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to finish OBD session",
        });
      }

      return mapObdSessionRow(updated);
    }),

  ingestScan: protectedProcedure
    .input(ingestScanInputSchema)
    .output(ingestScanOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return withActiveSpan(
        "diagnostics.ingestScan",
        {
          "app.request_id": ctx.requestId,
          "app.correlation_id": ctx.correlationId,
          "app.user_id": ctx.session.user.id,
          "app.session_id": input.sessionId,
          "app.readings_count": input.dtcReadings.length,
        },
        async () => {
          const ownedSession = await getOwnedSession(ctx.session.user.id, input.sessionId);
          if (ownedSession.status !== "active") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "OBD session is not active",
              cause: {
                businessCode: "OBD_SESSION_CLOSED",
                sessionStatus: ownedSession.status,
              },
            });
          }

          const normalizedInput = normalizeIngestScanInput(input);
          const createdOrExistingRows: typeof diagnosticEvent.$inferSelect[] = [];
          let insertedCount = 0;

          for (let index = 0; index < normalizedInput.dtcReadings.length; index += 1) {
            const result = await insertIngestEventWithIdempotency({
              session: ownedSession,
              input: normalizedInput,
              index,
            });
            createdOrExistingRows.push(result.row);
            if (result.inserted) {
              insertedCount += 1;
            }
          }

          const deduplicated = insertedCount === 0;

          if (!deduplicated) {
            await db.insert(timelineEvent).values({
              userId: ctx.session.user.id,
              vehicleId: ownedSession.vehicleId,
              obdSessionId: ownedSession.id,
              eventType: "scan.ingested",
              eventRefId: createdOrExistingRows[0]?.id,
              source: "obd_upload",
              occurredAt: normalizedInput.capturedAt ?? new Date(),
              payload: {
                uploadId: normalizedInput.uploadId,
                readingCount: normalizedInput.dtcReadings.length,
                insertedCount,
              },
            });
          }

          return {
            session: mapObdSessionRow(ownedSession),
            events: createdOrExistingRows.map(mapDiagnosticEventRow),
            deduplicated,
            insertedCount,
          };
        },
      );
    }),

  listByVehicle: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
      }),
    )
    .output(z.array(diagnosticEventOutputSchema))
    .query(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      const rows = await db
        .select()
        .from(diagnosticEvent)
        .where(eq(diagnosticEvent.vehicleId, input.vehicleId))
        .orderBy(desc(diagnosticEvent.occurredAt), desc(diagnosticEvent.createdAt));

      return rows.map(mapDiagnosticEventRow);
    }),

  timelineByVehicle: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
        limit: z.number().int().positive().max(500).optional(),
      }),
    )
    .output(timelineByVehicleOutputSchema)
    .query(async ({ ctx, input }) => {
      return withActiveSpan(
        "diagnostics.timelineByVehicle",
        {
          "app.request_id": ctx.requestId,
          "app.correlation_id": ctx.correlationId,
          "app.user_id": ctx.session.user.id,
          "app.vehicle_id": input.vehicleId,
          "app.limit": input.limit ?? 200,
        },
        async () => {
          await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);
          const limit = input.limit ?? 200;

          const rows = await db
            .select()
            .from(timelineEvent)
            .where(and(eq(timelineEvent.vehicleId, input.vehicleId), eq(timelineEvent.userId, ctx.session.user.id)))
            .orderBy(asc(timelineEvent.occurredAt), asc(timelineEvent.id))
            .limit(limit);

          return {
            events: rows.map(mapTimelineEventRow),
          };
        },
      );
    }),

  createEvent: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
        sessionId: z.number().int().positive().optional(),
        source: z.string().trim().min(1).optional(),
        dtcCode: z.string().trim().min(1).max(16),
        severity: z.string().trim().min(1).optional(),
        freezeFrame: jsonRecordSchema.optional(),
        sensorSnapshot: jsonRecordSchema.optional(),
      }),
    )
    .output(diagnosticEventOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      if (input.sessionId) {
        const session = await getOwnedSession(ctx.session.user.id, input.sessionId);
        if (session.vehicleId !== input.vehicleId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Session does not belong to the selected vehicle",
          });
        }
      }

      const [created] = await db
        .insert(diagnosticEvent)
        .values({
          vehicleId: input.vehicleId,
          obdSessionId: input.sessionId,
          source: input.source ?? "obd_scan",
          dtcCode: input.dtcCode.trim().toUpperCase(),
          severity: input.severity ?? "unknown",
          freezeFrame: input.freezeFrame,
          sensorSnapshot: input.sensorSnapshot,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create diagnostic event",
        });
      }

      await db.insert(timelineEvent).values({
        userId: ctx.session.user.id,
        vehicleId: input.vehicleId,
        obdSessionId: input.sessionId,
        eventType: "scan.event.created",
        eventRefId: created.id,
        source: input.source ?? "obd_scan",
        occurredAt: created.occurredAt,
        payload: {
          dtcCode: created.dtcCode,
          severity: created.severity,
        },
      });

      return mapDiagnosticEventRow(created);
    }),

  clearCode: protectedProcedure
    .input(
      z.object({
        vehicleId: z.number().int().positive(),
        sessionId: z.number().int().positive().optional(),
        dtcCode: z.string().trim().min(1).max(16),
        warningAcknowledged: z.literal(true),
      }),
    )
    .output(clearCodeOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await ensureVehicleOwnership(ctx.session.user.id, input.vehicleId);

      if (input.sessionId) {
        const session = await getOwnedSession(ctx.session.user.id, input.sessionId);
        if (session.vehicleId !== input.vehicleId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Session does not belong to the selected vehicle",
          });
        }
      }

      const [created] = await db
        .insert(diagnosticEvent)
        .values({
          vehicleId: input.vehicleId,
          obdSessionId: input.sessionId,
          source: "dtc_clear",
          dtcCode: input.dtcCode.trim().toUpperCase(),
          severity: "cleared",
          freezeFrame: {
            action: "clear_code",
            warningAcknowledged: input.warningAcknowledged,
          },
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to clear diagnostic code",
        });
      }

      await db.insert(timelineEvent).values({
        userId: ctx.session.user.id,
        vehicleId: input.vehicleId,
        obdSessionId: input.sessionId,
        eventType: "dtc.cleared",
        eventRefId: created.id,
        source: "dtc_clear",
        occurredAt: created.occurredAt,
        payload: {
          dtcCode: created.dtcCode,
        },
      });

      return {
        event: mapDiagnosticEventRow(created),
        cleared: true,
      };
    }),
});
