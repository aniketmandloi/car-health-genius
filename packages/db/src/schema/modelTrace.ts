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
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { diagnosticEvent } from "./diagnosticEvent";
import { modelRegistry } from "./modelRegistry";
import { promptTemplate } from "./promptTemplate";
import { recommendation } from "./recommendation";

export const modelTrace = pgTable(
  "model_trace",
  {
    id: serial("id").primaryKey(),
    requestId: text("request_id"),
    correlationId: text("correlation_id"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    diagnosticEventId: integer("diagnostic_event_id").references(() => diagnosticEvent.id, {
      onDelete: "set null",
    }),
    recommendationId: integer("recommendation_id").references(() => recommendation.id, {
      onDelete: "set null",
    }),
    modelRegistryId: integer("model_registry_id").references(() => modelRegistry.id, {
      onDelete: "set null",
    }),
    promptTemplateId: integer("prompt_template_id").references(() => promptTemplate.id, {
      onDelete: "set null",
    }),
    generatorType: text("generator_type").notNull().default("rules"),
    inputHash: varchar("input_hash", { length: 128 }).notNull(),
    outputSummary: text("output_summary"),
    policyBlocked: boolean("policy_blocked").notNull().default(false),
    policyReasons: jsonb("policy_reasons"),
    fallbackApplied: boolean("fallback_applied").notNull().default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("model_trace_created_at_idx").on(table.createdAt),
    index("model_trace_user_id_idx").on(table.userId),
    index("model_trace_request_id_idx").on(table.requestId),
    index("model_trace_diagnostic_event_id_idx").on(table.diagnosticEventId),
    index("model_trace_recommendation_id_idx").on(table.recommendationId),
  ],
);

export const modelTraceRelations = relations(modelTrace, ({ one }) => ({
  user: one(user, {
    fields: [modelTrace.userId],
    references: [user.id],
  }),
  diagnosticEvent: one(diagnosticEvent, {
    fields: [modelTrace.diagnosticEventId],
    references: [diagnosticEvent.id],
  }),
  recommendation: one(recommendation, {
    fields: [modelTrace.recommendationId],
    references: [recommendation.id],
  }),
  model: one(modelRegistry, {
    fields: [modelTrace.modelRegistryId],
    references: [modelRegistry.id],
  }),
  template: one(promptTemplate, {
    fields: [modelTrace.promptTemplateId],
    references: [promptTemplate.id],
  }),
}));
