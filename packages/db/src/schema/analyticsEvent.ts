import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const analyticsEvent = pgTable(
  "analytics_event",
  {
    id: serial("id").primaryKey(),
    eventName: text("event_name").notNull(),
    eventKey: text("event_key").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    channel: text("channel").notNull().default("server"),
    source: text("source"),
    properties: jsonb("properties"),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("analytics_event_event_key_uq").on(table.eventKey),
    index("analytics_event_event_name_idx").on(table.eventName),
    index("analytics_event_occurred_at_idx").on(table.occurredAt),
    index("analytics_event_user_id_idx").on(table.userId),
  ],
);

export const analyticsEventRelations = relations(analyticsEvent, ({ one }) => ({
  user: one(user, {
    fields: [analyticsEvent.userId],
    references: [user.id],
  }),
}));
