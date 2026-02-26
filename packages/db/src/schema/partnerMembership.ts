import { relations } from "drizzle-orm";
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { partner } from "./partner";

export const partnerMembership = pgTable(
  "partner_membership",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    partnerId: integer("partner_id")
      .notNull()
      .references(() => partner.id, { onDelete: "cascade" }),
    membershipRole: text("membership_role").notNull().default("agent"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("partner_membership_user_partner_uq").on(table.userId, table.partnerId),
    index("partner_membership_user_id_idx").on(table.userId),
    index("partner_membership_partner_id_idx").on(table.partnerId),
    index("partner_membership_status_idx").on(table.status),
  ],
);

export const partnerMembershipRelations = relations(partnerMembership, ({ one }) => ({
  user: one(user, {
    fields: [partnerMembership.userId],
    references: [user.id],
  }),
  partner: one(partner, {
    fields: [partnerMembership.partnerId],
    references: [partner.id],
  }),
}));
