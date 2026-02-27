import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { diagnosticEvent } from "./diagnosticEvent";
import { modelTrace } from "./modelTrace";
import { recommendation } from "./recommendation";

export const reviewQueueItem = pgTable(
  "review_queue_item",
  {
    id: serial("id").primaryKey(),
    status: text("status").notNull().default("pending"),
    triggerReason: text("trigger_reason").notNull(),
    triggerMetadata: jsonb("trigger_metadata"),
    diagnosticEventId: integer("diagnostic_event_id")
      .notNull()
      .references(() => diagnosticEvent.id, { onDelete: "cascade" }),
    recommendationId: integer("recommendation_id").references(() => recommendation.id, {
      onDelete: "set null",
    }),
    modelTraceId: integer("model_trace_id").references(() => modelTrace.id, {
      onDelete: "set null",
    }),
    confidence: integer("confidence").notNull().default(0),
    urgency: text("urgency").notNull().default("unknown"),
    policyBlocked: boolean("policy_blocked").notNull().default(false),
    claimedByUserId: text("claimed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    claimedAt: timestamp("claimed_at"),
    resolvedByUserId: text("resolved_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at"),
    resolution: text("resolution"),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("review_queue_item_status_idx").on(table.status),
    index("review_queue_item_created_at_idx").on(table.createdAt),
    index("review_queue_item_claimed_by_user_id_idx").on(table.claimedByUserId),
    index("review_queue_item_diagnostic_event_id_idx").on(table.diagnosticEventId),
  ],
);

export const reviewQueueItemRelations = relations(reviewQueueItem, ({ one }) => ({
  diagnosticEvent: one(diagnosticEvent, {
    fields: [reviewQueueItem.diagnosticEventId],
    references: [diagnosticEvent.id],
  }),
  recommendation: one(recommendation, {
    fields: [reviewQueueItem.recommendationId],
    references: [recommendation.id],
  }),
  modelTrace: one(modelTrace, {
    fields: [reviewQueueItem.modelTraceId],
    references: [modelTrace.id],
  }),
  claimedBy: one(user, {
    fields: [reviewQueueItem.claimedByUserId],
    references: [user.id],
  }),
  resolvedBy: one(user, {
    fields: [reviewQueueItem.resolvedByUserId],
    references: [user.id],
  }),
}));
