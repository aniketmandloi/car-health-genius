import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { booking } from "./booking";
import { estimate } from "./estimate";
import { feedback } from "./feedback";
import { obdSession } from "./obdSession";
import { recommendation } from "./recommendation";
import { repairOutcome } from "./repairOutcome";
import { vehicle } from "./vehicle";

export const diagnosticEvent = pgTable(
  "diagnostic_event",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicle.id, { onDelete: "cascade" }),
    obdSessionId: integer("obd_session_id").references(() => obdSession.id, {
      onDelete: "set null",
    }),
    source: text("source").notNull().default("obd_scan"),
    dtcCode: varchar("dtc_code", { length: 16 }).notNull(),
    severity: text("severity").notNull().default("unknown"),
    ingestIdempotencyKey: varchar("ingest_idempotency_key", { length: 80 }),
    freezeFrame: jsonb("freeze_frame"),
    sensorSnapshot: jsonb("sensor_snapshot"),
    capturedAt: timestamp("captured_at"),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
    ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("diagnostic_event_vehicle_id_idx").on(table.vehicleId),
    index("diagnostic_event_obd_session_id_idx").on(table.obdSessionId),
    index("diagnostic_event_dtc_code_idx").on(table.dtcCode),
    uniqueIndex("diagnostic_event_ingest_idempotency_key_uq").on(table.ingestIdempotencyKey),
  ],
);

export const diagnosticEventRelations = relations(diagnosticEvent, ({ many, one }) => ({
  vehicle: one(vehicle, {
    fields: [diagnosticEvent.vehicleId],
    references: [vehicle.id],
  }),
  obdSession: one(obdSession, {
    fields: [diagnosticEvent.obdSessionId],
    references: [obdSession.id],
  }),
  recommendations: many(recommendation),
  estimates: many(estimate),
  bookings: many(booking),
  feedbackItems: many(feedback),
  repairOutcomes: many(repairOutcome),
}));
