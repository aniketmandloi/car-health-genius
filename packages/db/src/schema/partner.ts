import { relations } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { partnerMembership } from "./partnerMembership";

export const partner = pgTable(
  "partner",
  {
    id: serial("id").primaryKey(),
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("active"),
    vettingStatus: text("vetting_status").notNull().default("pending"),
    launchMetro: text("launch_metro").notNull(),
    state: text("state"),
    phone: text("phone"),
    website: text("website"),
    availability: text("availability").notNull().default("unknown"),
    acceptsLeads: boolean("accepts_leads").notNull().default(true),
    serviceArea: jsonb("service_area"),
    pricingPolicyFlags: jsonb("pricing_policy_flags"),
    dataFreshnessAt: timestamp("data_freshness_at"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("partner_slug_uq").on(table.slug),
    index("partner_launch_metro_idx").on(table.launchMetro),
    index("partner_status_idx").on(table.status),
  ],
);

export const partnerRelations = relations(partner, ({ many }) => ({
  memberships: many(partnerMembership),
}));
