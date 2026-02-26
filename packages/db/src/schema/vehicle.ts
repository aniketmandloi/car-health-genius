import { relations } from "drizzle-orm";
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { booking } from "./booking";
import { diagnosticEvent } from "./diagnosticEvent";
import { estimate } from "./estimate";
import { maintenance } from "./maintenance";
import { repairOutcome } from "./repairOutcome";

export const vehicle = pgTable(
  "vehicle",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    vin: varchar("vin", { length: 17 }),
    make: text("make").notNull(),
    model: text("model").notNull(),
    modelYear: integer("model_year").notNull(),
    engine: text("engine"),
    mileage: integer("mileage"),
    countryCode: varchar("country_code", { length: 2 }).notNull().default("US"),
    stateCode: varchar("state_code", { length: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("vehicle_user_id_idx").on(table.userId),
    index("vehicle_country_code_idx").on(table.countryCode),
    uniqueIndex("vehicle_user_vin_uq").on(table.userId, table.vin),
  ],
);

export const vehicleRelations = relations(vehicle, ({ many, one }) => ({
  user: one(user, {
    fields: [vehicle.userId],
    references: [user.id],
  }),
  diagnosticEvents: many(diagnosticEvent),
  estimates: many(estimate),
  bookings: many(booking),
  maintenanceItems: many(maintenance),
  repairOutcomes: many(repairOutcome),
}));
