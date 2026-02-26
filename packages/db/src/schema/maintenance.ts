import { relations } from "drizzle-orm";
import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { vehicle } from "./vehicle";

export const maintenance = pgTable(
  "maintenance",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => vehicle.id, { onDelete: "cascade" }),
    serviceType: text("service_type").notNull(),
    dueMileage: integer("due_mileage"),
    dueDate: timestamp("due_date"),
    status: text("status").notNull().default("scheduled"),
    lastCompletedAt: timestamp("last_completed_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("maintenance_user_id_idx").on(table.userId),
    index("maintenance_vehicle_id_idx").on(table.vehicleId),
    index("maintenance_status_idx").on(table.status),
    index("maintenance_due_date_idx").on(table.dueDate),
  ],
);

export const maintenanceRelations = relations(maintenance, ({ one }) => ({
  user: one(user, {
    fields: [maintenance.userId],
    references: [user.id],
  }),
  vehicle: one(vehicle, {
    fields: [maintenance.vehicleId],
    references: [vehicle.id],
  }),
}));
