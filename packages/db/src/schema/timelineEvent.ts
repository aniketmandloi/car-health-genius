import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { obdSession } from "./obdSession";
import { vehicle } from "./vehicle";

export const timelineEvent = pgTable(
  "timeline_event",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicle.id, { onDelete: "cascade" }),
    obdSessionId: integer("obd_session_id").references(() => obdSession.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    eventRefId: integer("event_ref_id"),
    source: text("source").notNull().default("system"),
    payload: jsonb("payload"),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("timeline_event_user_id_idx").on(table.userId),
    index("timeline_event_vehicle_id_idx").on(table.vehicleId),
    index("timeline_event_obd_session_id_idx").on(table.obdSessionId),
    index("timeline_event_event_type_idx").on(table.eventType),
    index("timeline_event_occurred_at_idx").on(table.occurredAt),
  ],
);

export const timelineEventRelations = relations(timelineEvent, ({ one }) => ({
  user: one(user, {
    fields: [timelineEvent.userId],
    references: [user.id],
  }),
  vehicle: one(vehicle, {
    fields: [timelineEvent.vehicleId],
    references: [vehicle.id],
  }),
  obdSession: one(obdSession, {
    fields: [timelineEvent.obdSessionId],
    references: [obdSession.id],
  }),
}));
