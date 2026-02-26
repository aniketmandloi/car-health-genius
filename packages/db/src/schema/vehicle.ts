import { index, integer, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";

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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("vehicle_user_id_idx").on(table.userId),
    uniqueIndex("vehicle_user_vin_uq").on(table.userId, table.vin),
  ],
);
