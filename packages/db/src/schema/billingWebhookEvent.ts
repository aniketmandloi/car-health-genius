import { index, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const billingWebhookEvent = pgTable(
  "billing_webhook_event",
  {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull().default("polar"),
    eventType: text("event_type").notNull(),
    providerEventKey: text("provider_event_key").notNull(),
    status: text("status").notNull().default("received"),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    uniqueIndex("billing_webhook_event_provider_event_key_uq").on(table.providerEventKey),
    index("billing_webhook_event_provider_event_type_idx").on(table.provider, table.eventType),
    index("billing_webhook_event_status_idx").on(table.status),
    index("billing_webhook_event_received_at_idx").on(table.receivedAt),
  ],
);
