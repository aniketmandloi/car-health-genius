import { relations } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const entitlement = pgTable(
  "entitlement",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    source: text("source").notNull().default("subscription"),
    isEnabled: boolean("is_enabled").notNull().default(false),
    grantedAt: timestamp("granted_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("entitlement_user_feature_key_uq").on(table.userId, table.featureKey),
    index("entitlement_user_id_idx").on(table.userId),
    index("entitlement_feature_key_idx").on(table.featureKey),
    index("entitlement_expires_at_idx").on(table.expiresAt),
  ],
);

export const entitlementRelations = relations(entitlement, ({ one }) => ({
  user: one(user, {
    fields: [entitlement.userId],
    references: [user.id],
  }),
}));
