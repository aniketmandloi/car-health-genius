import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { adapter } from "./adapter";
import { user } from "./auth";
import { diagnosticEvent } from "./diagnosticEvent";
import { timelineEvent } from "./timelineEvent";
import { vehicle } from "./vehicle";

export const obdSession = pgTable(
  "obd_session",
  {
    id: serial("id").primaryKey(),
    sessionKey: text("session_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicle.id, { onDelete: "cascade" }),
    adapterId: integer("adapter_id").references(() => adapter.id, { onDelete: "set null" }),
    adapterSlug: text("adapter_slug"),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("obd_session_session_key_uq").on(table.sessionKey),
    index("obd_session_user_id_idx").on(table.userId),
    index("obd_session_vehicle_id_idx").on(table.vehicleId),
    index("obd_session_status_idx").on(table.status),
    index("obd_session_started_at_idx").on(table.startedAt),
  ],
);

export const obdSessionRelations = relations(obdSession, ({ many, one }) => ({
  user: one(user, {
    fields: [obdSession.userId],
    references: [user.id],
  }),
  vehicle: one(vehicle, {
    fields: [obdSession.vehicleId],
    references: [vehicle.id],
  }),
  adapter: one(adapter, {
    fields: [obdSession.adapterId],
    references: [adapter.id],
  }),
  diagnosticEvents: many(diagnosticEvent),
  timelineEvents: many(timelineEvent),
}));
