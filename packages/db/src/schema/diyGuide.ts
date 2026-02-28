import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const diyGuide = pgTable(
  "diy_guide",
  {
    id: serial("id").primaryKey(),
    dtcCode: varchar("dtc_code", { length: 16 }).notNull(),
    title: text("title").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    difficulty: text("difficulty").notNull(),
    tools: jsonb("tools").notNull(),
    parts: jsonb("parts").notNull(),
    safetyWarnings: jsonb("safety_warnings").notNull(),
    steps: jsonb("steps").notNull(),
    reviewStatus: text("review_status").notNull().default("draft"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("diy_guide_dtc_code_idx").on(table.dtcCode),
    index("diy_guide_review_status_idx").on(table.reviewStatus),
    index("diy_guide_active_idx").on(table.isActive),
  ],
);
