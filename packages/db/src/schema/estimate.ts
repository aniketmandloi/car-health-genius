import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { diagnosticEvent } from "./diagnosticEvent";
import { vehicle } from "./vehicle";

export const estimate = pgTable(
  "estimate",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicle.id, { onDelete: "cascade" }),
    diagnosticEventId: integer("diagnostic_event_id").references(() => diagnosticEvent.id, {
      onDelete: "set null",
    }),
    laborLowCents: integer("labor_low_cents").notNull(),
    laborHighCents: integer("labor_high_cents").notNull(),
    partsLowCents: integer("parts_low_cents").notNull(),
    partsHighCents: integer("parts_high_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    region: text("region").notNull(),
    assumptions: jsonb("assumptions"),
    exclusions: jsonb("exclusions"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("estimate_user_id_idx").on(table.userId),
    index("estimate_vehicle_id_idx").on(table.vehicleId),
    index("estimate_diagnostic_event_id_idx").on(table.diagnosticEventId),
    index("estimate_created_at_idx").on(table.createdAt),
  ],
);

export const estimateRelations = relations(estimate, ({ one }) => ({
  user: one(user, {
    fields: [estimate.userId],
    references: [user.id],
  }),
  vehicle: one(vehicle, {
    fields: [estimate.vehicleId],
    references: [vehicle.id],
  }),
  diagnosticEvent: one(diagnosticEvent, {
    fields: [estimate.diagnosticEventId],
    references: [diagnosticEvent.id],
  }),
}));
