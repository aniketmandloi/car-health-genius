import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const supportIssue = pgTable(
  "support_issue",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    issueSummary: text("issue_summary").notNull(),
    issueDetails: text("issue_details"),
    includeDiagnosticBundle: boolean("include_diagnostic_bundle").notNull().default(false),
    consentedToDiagnosticBundle: boolean("consented_to_diagnostic_bundle").notNull().default(false),
    consentCapturedAt: timestamp("consent_captured_at"),
    diagnosticBundle: jsonb("diagnostic_bundle"),
    priorityTier: text("priority_tier").notNull().default("standard"),
    priorityReason: text("priority_reason").notNull(),
    slaTargetMinutes: integer("sla_target_minutes").notNull(),
    status: text("status").notNull().default("open"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("support_issue_user_id_idx").on(table.userId),
    index("support_issue_status_idx").on(table.status),
    index("support_issue_created_at_idx").on(table.createdAt),
  ],
);

export const supportIssueRelations = relations(supportIssue, ({ one }) => ({
  user: one(user, {
    fields: [supportIssue.userId],
    references: [user.id],
  }),
}));
