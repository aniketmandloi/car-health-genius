import { db } from "@car-health-genius/db";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { maintenance } from "@car-health-genius/db/schema/maintenance";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { and, desc, eq } from "drizzle-orm";

export type VehicleHealthScore = {
  vehicleId: number;
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  factors: Array<{
    name: string;
    impact: "positive" | "negative" | "neutral";
    detail: string;
  }>;
  summary: string;
};

export async function computeVehicleHealthScore(
  userId: string,
  vehicleId: number,
): Promise<VehicleHealthScore | null> {
  const [ownedVehicle] = await db
    .select()
    .from(vehicle)
    .where(and(eq(vehicle.id, vehicleId), eq(vehicle.userId, userId)))
    .limit(1);

  if (!ownedVehicle) return null;

  const factors: VehicleHealthScore["factors"] = [];
  let score = 100;

  // Factor 1: Vehicle age
  const currentYear = new Date().getFullYear();
  const age = currentYear - ownedVehicle.modelYear;
  if (age <= 3) {
    factors.push({
      name: "Vehicle Age",
      impact: "positive",
      detail: `${age} year old vehicle — relatively new`,
    });
  } else if (age <= 7) {
    score -= 5;
    factors.push({
      name: "Vehicle Age",
      impact: "neutral",
      detail: `${age} years old — moderate age`,
    });
  } else if (age <= 12) {
    score -= 15;
    factors.push({
      name: "Vehicle Age",
      impact: "negative",
      detail: `${age} years old — increased maintenance risk`,
    });
  } else {
    score -= 25;
    factors.push({
      name: "Vehicle Age",
      impact: "negative",
      detail: `${age} years old — higher failure probability`,
    });
  }

  // Factor 2: Recent diagnostic events
  const recentEvents = await db
    .select({ severity: diagnosticEvent.severity })
    .from(diagnosticEvent)
    .where(eq(diagnosticEvent.vehicleId, vehicleId))
    .orderBy(desc(diagnosticEvent.occurredAt))
    .limit(10);

  const criticalCount = recentEvents.filter(
    (e) => e.severity === "critical",
  ).length;
  const highCount = recentEvents.filter((e) => e.severity === "high").length;
  const totalEvents = recentEvents.length;

  if (totalEvents === 0) {
    factors.push({
      name: "Diagnostic History",
      impact: "positive",
      detail: "No recent fault codes detected",
    });
  } else if (criticalCount > 0) {
    score -= criticalCount * 20;
    factors.push({
      name: "Active Fault Codes",
      impact: "negative",
      detail: `${criticalCount} critical code(s) detected — immediate service recommended`,
    });
  } else if (highCount > 0) {
    score -= highCount * 10;
    factors.push({
      name: "Active Fault Codes",
      impact: "negative",
      detail: `${highCount} high-severity code(s) — service soon`,
    });
  } else {
    score -= totalEvents * 3;
    factors.push({
      name: "Active Fault Codes",
      impact: "neutral",
      detail: `${totalEvents} low/medium severity code(s) detected`,
    });
  }

  // Factor 3: Maintenance status
  const maintenanceItems = await db
    .select({ status: maintenance.status })
    .from(maintenance)
    .where(
      and(eq(maintenance.userId, userId), eq(maintenance.vehicleId, vehicleId)),
    );

  const overdueCount = maintenanceItems.filter(
    (m) => m.status === "overdue",
  ).length;
  const scheduledCount = maintenanceItems.filter(
    (m) => m.status === "scheduled",
  ).length;
  const completedCount = maintenanceItems.filter(
    (m) => m.status === "completed",
  ).length;

  if (overdueCount > 0) {
    score -= overdueCount * 10;
    factors.push({
      name: "Maintenance Status",
      impact: "negative",
      detail: `${overdueCount} overdue maintenance item(s)`,
    });
  } else if (scheduledCount > 0) {
    factors.push({
      name: "Maintenance Status",
      impact: "neutral",
      detail: `${scheduledCount} upcoming maintenance item(s) scheduled`,
    });
  } else if (completedCount > 0) {
    factors.push({
      name: "Maintenance Status",
      impact: "positive",
      detail: "All tracked maintenance is up to date",
    });
  }

  // Factor 4: Mileage
  if (ownedVehicle.mileage !== null) {
    if (ownedVehicle.mileage > 150000) {
      score -= 15;
      factors.push({
        name: "Mileage",
        impact: "negative",
        detail: `${ownedVehicle.mileage.toLocaleString()} mi — high mileage, monitor wear items`,
      });
    } else if (ownedVehicle.mileage > 75000) {
      score -= 5;
      factors.push({
        name: "Mileage",
        impact: "neutral",
        detail: `${ownedVehicle.mileage.toLocaleString()} mi — moderate mileage`,
      });
    } else {
      factors.push({
        name: "Mileage",
        impact: "positive",
        detail: `${ownedVehicle.mileage.toLocaleString()} mi — low mileage`,
      });
    }
  }

  score = Math.max(0, Math.min(100, score));

  const grade: VehicleHealthScore["grade"] =
    score >= 90
      ? "A"
      : score >= 75
        ? "B"
        : score >= 60
          ? "C"
          : score >= 45
            ? "D"
            : "F";

  const summary =
    grade === "A"
      ? "Excellent condition — no immediate concerns."
      : grade === "B"
        ? "Good condition — minor issues to monitor."
        : grade === "C"
          ? "Fair condition — service recommended soon."
          : grade === "D"
            ? "Poor condition — service needed."
            : "Critical condition — immediate service required.";

  return { vehicleId, score, grade, factors, summary };
}
