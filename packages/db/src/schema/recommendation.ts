import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { diagnosticEvent } from "./diagnosticEvent";

export const recommendation = pgTable(
  "recommendation",
  {
    id: serial("id").primaryKey(),
    diagnosticEventId: integer("diagnostic_event_id")
      .notNull()
      .references(() => diagnosticEvent.id, { onDelete: "cascade" }),
    recommendationType: text("recommendation_type").notNull(),
    urgency: text("urgency").notNull(),
    confidence: integer("confidence").notNull().default(0),
    title: text("title").notNull(),
    details: jsonb("details"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("recommendation_diagnostic_event_id_idx").on(table.diagnosticEventId)],
);
