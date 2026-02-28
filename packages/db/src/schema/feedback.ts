import { relations } from "drizzle-orm";
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { diagnosticEvent } from "./diagnosticEvent";
import { recommendation } from "./recommendation";

export const feedback = pgTable(
  "feedback",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recommendationId: integer("recommendation_id").references(() => recommendation.id, {
      onDelete: "set null",
    }),
    diagnosticEventId: integer("diagnostic_event_id").references(() => diagnosticEvent.id, {
      onDelete: "set null",
    }),
    rating: integer("rating").notNull(),
    outcome: text("outcome"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("feedback_user_id_idx").on(table.userId),
    index("feedback_recommendation_id_idx").on(table.recommendationId),
    index("feedback_diagnostic_event_id_idx").on(table.diagnosticEventId),
    uniqueIndex("feedback_user_recommendation_uq").on(table.userId, table.recommendationId),
  ],
);

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(user, {
    fields: [feedback.userId],
    references: [user.id],
  }),
  recommendation: one(recommendation, {
    fields: [feedback.recommendationId],
    references: [recommendation.id],
  }),
  diagnosticEvent: one(diagnosticEvent, {
    fields: [feedback.diagnosticEventId],
    references: [diagnosticEvent.id],
  }),
}));
