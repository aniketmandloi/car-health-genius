import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const recallSnapshot = pgTable(
  "recall_snapshot",
  {
    id: serial("id").primaryKey(),
    cacheKey: text("cache_key").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    modelYear: integer("model_year").notNull(),
    source: text("source").notNull().default("nhtsa_recalls"),
    status: text("status").notNull().default("success"),
    payload: jsonb("payload").notNull(),
    retrievedAt: timestamp("retrieved_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("recall_snapshot_cache_key_uq").on(table.cacheKey),
    index("recall_snapshot_lookup_idx").on(table.make, table.model, table.modelYear),
    index("recall_snapshot_expires_at_idx").on(table.expiresAt),
  ],
);
