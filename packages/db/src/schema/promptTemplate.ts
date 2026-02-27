import { index, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const promptTemplate = pgTable(
  "prompt_template",
  {
    id: serial("id").primaryKey(),
    templateKey: text("template_key").notNull(),
    templateVersion: text("template_version").notNull(),
    templateHash: text("template_hash").notNull(),
    templateBody: text("template_body"),
    status: text("status").notNull().default("active"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("prompt_template_key_version_uq").on(table.templateKey, table.templateVersion),
    index("prompt_template_status_idx").on(table.status),
  ],
);
