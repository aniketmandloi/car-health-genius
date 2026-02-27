import { index, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const modelRegistry = pgTable(
  "model_registry",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(),
    modelId: text("model_id").notNull(),
    modelVersion: text("model_version").notNull(),
    status: text("status").notNull().default("active"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("model_registry_provider_model_version_uq").on(table.provider, table.modelId, table.modelVersion),
    index("model_registry_status_idx").on(table.status),
  ],
);
