import { db } from "@car-health-genius/db";
import { maintenance } from "@car-health-genius/db/schema/maintenance";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { and, eq } from "drizzle-orm";

export type MaintenancePrediction = {
  serviceType: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
  estimatedDueMileage: number | null;
  estimatedDueDate: string | null; // ISO string
  priority: "soon" | "upcoming" | "monitor";
  rationale: string;
};

type ServiceInterval = {
  serviceType: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
  priority: "soon" | "upcoming" | "monitor";
  rationale: string;
};

const STANDARD_INTERVALS: ServiceInterval[] = [
  {
    serviceType: "Oil Change",
    intervalMiles: 7500,
    intervalMonths: 6,
    priority: "soon",
    rationale:
      "Regular oil changes prevent engine wear and extend engine life.",
  },
  {
    serviceType: "Tire Rotation",
    intervalMiles: 7500,
    intervalMonths: 6,
    priority: "upcoming",
    rationale: "Even tire wear improves handling and extends tire lifespan.",
  },
  {
    serviceType: "Air Filter Replacement",
    intervalMiles: 20000,
    intervalMonths: 12,
    priority: "upcoming",
    rationale:
      "A clean air filter maintains engine efficiency and fuel economy.",
  },
  {
    serviceType: "Cabin Air Filter Replacement",
    intervalMiles: 20000,
    intervalMonths: 12,
    priority: "monitor",
    rationale: "Keeps interior air clean and maintains HVAC performance.",
  },
  {
    serviceType: "Brake Inspection",
    intervalMiles: 25000,
    intervalMonths: 24,
    priority: "soon",
    rationale: "Brake wear inspection ensures safe stopping distances.",
  },
  {
    serviceType: "Transmission Fluid Service",
    intervalMiles: 45000,
    intervalMonths: 36,
    priority: "upcoming",
    rationale: "Prevents transmission wear and costly repairs.",
  },
  {
    serviceType: "Coolant Flush",
    intervalMiles: 30000,
    intervalMonths: 24,
    priority: "upcoming",
    rationale:
      "Maintains proper cooling system performance and prevents corrosion.",
  },
  {
    serviceType: "Spark Plug Replacement",
    intervalMiles: 60000,
    intervalMonths: 48,
    priority: "upcoming",
    rationale:
      "Worn spark plugs reduce fuel efficiency and engine performance.",
  },
  {
    serviceType: "Battery Inspection",
    intervalMiles: null,
    intervalMonths: 24,
    priority: "monitor",
    rationale: "Battery testing helps avoid unexpected starting failures.",
  },
  {
    serviceType: "Serpentine Belt Inspection",
    intervalMiles: 60000,
    intervalMonths: 48,
    priority: "monitor",
    rationale:
      "Belt failure can cause sudden engine shutdown and accessory loss.",
  },
];

export async function computeMaintenancePredictions(
  userId: string,
  vehicleId: number,
): Promise<MaintenancePrediction[]> {
  const [ownedVehicle] = await db
    .select()
    .from(vehicle)
    .where(and(eq(vehicle.id, vehicleId), eq(vehicle.userId, userId)))
    .limit(1);

  if (!ownedVehicle) return [];

  // Get existing maintenance items to avoid suggesting already scheduled/completed ones
  const existingItems = await db
    .select({
      serviceType: maintenance.serviceType,
      status: maintenance.status,
    })
    .from(maintenance)
    .where(
      and(eq(maintenance.userId, userId), eq(maintenance.vehicleId, vehicleId)),
    );

  const activeServiceTypes = new Set(
    existingItems
      .filter((m) => m.status === "scheduled" || m.status === "overdue")
      .map((m) => m.serviceType.toLowerCase()),
  );

  const currentMileage = ownedVehicle.mileage ?? 0;
  const currentYear = new Date().getFullYear();
  const vehicleAgeYears = currentYear - ownedVehicle.modelYear;

  const predictions: MaintenancePrediction[] = [];

  for (const interval of STANDARD_INTERVALS) {
    // Skip if this service type is already actively scheduled
    if (activeServiceTypes.has(interval.serviceType.toLowerCase())) {
      continue;
    }

    let estimatedDueMileage: number | null = null;
    let estimatedDueDate: string | null = null;

    if (interval.intervalMiles !== null && currentMileage > 0) {
      // Round up to the next interval based on current mileage
      const nextIntervalMileage =
        Math.ceil(currentMileage / interval.intervalMiles) *
        interval.intervalMiles;
      estimatedDueMileage = nextIntervalMileage;
    }

    if (interval.intervalMonths !== null) {
      // Base the due date on vehicle age and interval
      const monthsSinceFirstService = vehicleAgeYears * 12;
      const monthsUntilDue =
        interval.intervalMonths -
        (monthsSinceFirstService % interval.intervalMonths);
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + monthsUntilDue);
      estimatedDueDate = dueDate.toISOString();
    }

    // Adjust priority for older vehicles: escalate monitor → upcoming, upcoming → soon
    let priority = interval.priority;
    if (vehicleAgeYears > 7 && priority === "monitor") {
      priority = "upcoming";
    } else if (vehicleAgeYears > 12 && priority === "upcoming") {
      priority = "soon";
    }

    predictions.push({
      serviceType: interval.serviceType,
      intervalMiles: interval.intervalMiles,
      intervalMonths: interval.intervalMonths,
      estimatedDueMileage,
      estimatedDueDate,
      priority,
      rationale: interval.rationale,
    });
  }

  // Sort: soon first, then upcoming, then monitor
  const priorityOrder = { soon: 0, upcoming: 1, monitor: 2 };
  predictions.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );

  return predictions;
}
