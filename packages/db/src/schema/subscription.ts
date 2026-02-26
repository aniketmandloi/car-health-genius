import { relations } from "drizzle-orm";
import { index, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const subscription = pgTable(
  "subscription",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("polar"),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    plan: text("plan").notNull().default("free"),
    status: text("status").notNull().default("inactive"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAt: timestamp("cancel_at"),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("subscription_provider_subscription_id_uq").on(table.providerSubscriptionId),
    index("subscription_user_id_idx").on(table.userId),
    index("subscription_status_idx").on(table.status),
  ],
);

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, {
    fields: [subscription.userId],
    references: [user.id],
  }),
}));
