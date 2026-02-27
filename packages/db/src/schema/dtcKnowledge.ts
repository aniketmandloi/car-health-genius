import { boolean, index, jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const dtcKnowledge = pgTable(
  "dtc_knowledge",
  {
    id: serial("id").primaryKey(),
    dtcCode: varchar("dtc_code", { length: 16 }).notNull(),
    category: text("category").notNull().default("powertrain"),
    defaultSeverityClass: text("default_severity_class").notNull().default("service_soon"),
    driveability: text("driveability").notNull().default("drivable"),
    summaryTemplate: text("summary_template").notNull(),
    rationaleTemplate: text("rationale_template"),
    safetyCritical: boolean("safety_critical").notNull().default(false),
    diyAllowed: boolean("diy_allowed").notNull().default(false),
    source: text("source").notNull().default("internal_seed"),
    sourceVersion: text("source_version").notNull().default("v1"),
    effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
    effectiveTo: timestamp("effective_to"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    uniqueIndex("dtc_knowledge_dtc_code_uq").on(table.dtcCode),
    index("dtc_knowledge_default_severity_idx").on(table.defaultSeverityClass),
    index("dtc_knowledge_safety_critical_idx").on(table.safetyCritical),
  ],
);
