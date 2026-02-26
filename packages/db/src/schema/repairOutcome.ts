import { relations } from "drizzle-orm";
import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { diagnosticEvent } from "./diagnosticEvent";
import { estimate } from "./estimate";
import { vehicle } from "./vehicle";

export const repairOutcome = pgTable(
  "repair_outcome",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicle.id, { onDelete: "cascade" }),
    diagnosticEventId: integer("diagnostic_event_id")
      .notNull()
      .references(() => diagnosticEvent.id, { onDelete: "cascade" }),
    estimateId: integer("estimate_id").references(() => estimate.id, { onDelete: "set null" }),
    invoiceAmountCents: integer("invoice_amount_cents"),
    outcomeStatus: text("outcome_status").notNull(),
    performedAt: timestamp("performed_at"),
    shopName: text("shop_name"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("repair_outcome_user_id_idx").on(table.userId),
    index("repair_outcome_vehicle_id_idx").on(table.vehicleId),
    index("repair_outcome_diagnostic_event_id_idx").on(table.diagnosticEventId),
    index("repair_outcome_outcome_status_idx").on(table.outcomeStatus),
  ],
);

export const repairOutcomeRelations = relations(repairOutcome, ({ one }) => ({
  user: one(user, {
    fields: [repairOutcome.userId],
    references: [user.id],
  }),
  vehicle: one(vehicle, {
    fields: [repairOutcome.vehicleId],
    references: [vehicle.id],
  }),
  diagnosticEvent: one(diagnosticEvent, {
    fields: [repairOutcome.diagnosticEventId],
    references: [diagnosticEvent.id],
  }),
  estimate: one(estimate, {
    fields: [repairOutcome.estimateId],
    references: [estimate.id],
  }),
}));
