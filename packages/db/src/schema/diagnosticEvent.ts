import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { booking } from "./booking";
import { estimate } from "./estimate";
import { feedback } from "./feedback";
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
    source: text("source").notNull().default("obd_scan"),
    dtcCode: varchar("dtc_code", { length: 16 }).notNull(),
    severity: text("severity").notNull().default("unknown"),
    freezeFrame: jsonb("freeze_frame"),
    sensorSnapshot: jsonb("sensor_snapshot"),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("diagnostic_event_vehicle_id_idx").on(table.vehicleId),
    index("diagnostic_event_dtc_code_idx").on(table.dtcCode),
  ],
);

export const diagnosticEventRelations = relations(diagnosticEvent, ({ many, one }) => ({
  vehicle: one(vehicle, {
    fields: [diagnosticEvent.vehicleId],
    references: [vehicle.id],
  }),
  recommendations: many(recommendation),
  estimates: many(estimate),
  bookings: many(booking),
  feedbackItems: many(feedback),
  repairOutcomes: many(repairOutcome),
}));
