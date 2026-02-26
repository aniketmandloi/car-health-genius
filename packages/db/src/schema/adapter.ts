import { index, pgTable, serial, text, timestamp, uniqueIndex, boolean, jsonb } from "drizzle-orm/pg-core";

export const adapter = pgTable(
  "adapter",
  {
    id: serial("id").primaryKey(),
    vendor: text("vendor").notNull(),
    model: text("model").notNull(),
    slug: text("slug").notNull(),
    connectionType: text("connection_type").notNull().default("bluetooth"),
    iosSupported: boolean("ios_supported").notNull().default(false),
    androidSupported: boolean("android_supported").notNull().default(false),
    status: text("status").notNull().default("active"),
    firmwareNotes: text("firmware_notes"),
    metadata: jsonb("metadata"),
    lastValidatedAt: timestamp("last_validated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("adapter_slug_uq").on(table.slug),
    index("adapter_status_idx").on(table.status),
    index("adapter_vendor_idx").on(table.vendor),
  ],
);
