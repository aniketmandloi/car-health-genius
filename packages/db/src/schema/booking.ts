import { relations } from "drizzle-orm";
import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { diagnosticEvent } from "./diagnosticEvent";
import { partner } from "./partner";
import { vehicle } from "./vehicle";

export const booking = pgTable(
  "booking",
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
    partnerId: integer("partner_id").references(() => partner.id, { onDelete: "set null" }),
    issueSummary: text("issue_summary").notNull(),
    preferredWindowStart: timestamp("preferred_window_start").notNull(),
    preferredWindowEnd: timestamp("preferred_window_end").notNull(),
    status: text("status").notNull().default("requested"),
    partnerResponseNote: text("partner_response_note"),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("booking_user_id_idx").on(table.userId),
    index("booking_vehicle_id_idx").on(table.vehicleId),
    index("booking_partner_id_idx").on(table.partnerId),
    index("booking_status_idx").on(table.status),
    index("booking_preferred_window_start_idx").on(table.preferredWindowStart),
  ],
);

export const bookingRelations = relations(booking, ({ one }) => ({
  user: one(user, {
    fields: [booking.userId],
    references: [user.id],
  }),
  vehicle: one(vehicle, {
    fields: [booking.vehicleId],
    references: [vehicle.id],
  }),
  diagnosticEvent: one(diagnosticEvent, {
    fields: [booking.diagnosticEventId],
    references: [diagnosticEvent.id],
  }),
  partner: one(partner, {
    fields: [booking.partnerId],
    references: [partner.id],
  }),
}));
