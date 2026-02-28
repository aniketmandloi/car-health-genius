import { relations } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const safetySwitch = pgTable(
  "safety_switch",
  {
    id: serial("id").primaryKey(),
    scope: text("scope").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    reason: text("reason"),
    changedByUserId: text("changed_by_user_id").references(() => user.id, { onDelete: "set null" }),
    effectiveAt: timestamp("effective_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("safety_switch_scope_uq").on(table.scope),
    index("safety_switch_enabled_idx").on(table.enabled),
    index("safety_switch_effective_at_idx").on(table.effectiveAt),
  ],
);

export const safetySwitchRelations = relations(safetySwitch, ({ one }) => ({
  changedByUser: one(user, {
    fields: [safetySwitch.changedByUserId],
    references: [user.id],
  }),
}));
