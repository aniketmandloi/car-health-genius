import { db } from "@car-health-genius/db";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { estimate } from "@car-health-genius/db/schema/estimate";
import { maintenance } from "@car-health-genius/db/schema/maintenance";
import { recommendation } from "@car-health-genius/db/schema/recommendation";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { and, desc, eq } from "drizzle-orm";

export type VehicleHealthReport = {
  generatedAt: string;
  vehicle: {
    id: number;
    make: string;
    model: string;
    modelYear: number;
    vin: string | null;
    mileage: number | null;
    engine: string | null;
  };
  recentEvents: Array<{
    id: number;
    dtcCode: string;
    severity: string;
    occurredAt: string;
    source: string;
  }>;
  activeRecommendations: Array<{
    id: number;
    diagnosticEventId: number;
    title: string;
    urgency: string;
    confidence: number;
    recommendationType: string;
  }>;
  latestEstimates: Array<{
    id: number;
    diagnosticEventId: number | null;
    region: string;
    totalLowCents: number;
    totalHighCents: number;
  }>;
  maintenanceItems: Array<{
    id: number;
    serviceType: string;
    status: string;
    dueDate: string | null;
    dueMileage: number | null;
  }>;
  disclaimer: string;
};

export async function buildVehicleHealthReport(
  userId: string,
  vehicleId: number,
): Promise<VehicleHealthReport | null> {
  const [ownedVehicle] = await db
    .select()
    .from(vehicle)
    .where(and(eq(vehicle.id, vehicleId), eq(vehicle.userId, userId)))
    .limit(1);

  if (!ownedVehicle) {
    return null;
  }

  const recentEvents = await db
    .select({
      id: diagnosticEvent.id,
      dtcCode: diagnosticEvent.dtcCode,
      severity: diagnosticEvent.severity,
      occurredAt: diagnosticEvent.occurredAt,
      source: diagnosticEvent.source,
    })
    .from(diagnosticEvent)
    .where(eq(diagnosticEvent.vehicleId, vehicleId))
    .orderBy(desc(diagnosticEvent.occurredAt))
    .limit(20);

  const eventIds = recentEvents.map((e) => e.id);

  const activeRecommendations =
    eventIds.length === 0
      ? []
      : await db
          .select({
            id: recommendation.id,
            diagnosticEventId: recommendation.diagnosticEventId,
            title: recommendation.title,
            urgency: recommendation.urgency,
            confidence: recommendation.confidence,
            recommendationType: recommendation.recommendationType,
          })
          .from(recommendation)
          .where(and(eq(recommendation.isActive, true)))
          .orderBy(desc(recommendation.createdAt))
          .limit(20);

  const latestEstimates =
    eventIds.length === 0
      ? []
      : await db
          .select({
            id: estimate.id,
            diagnosticEventId: estimate.diagnosticEventId,
            region: estimate.region,
            laborLowCents: estimate.laborLowCents,
            laborHighCents: estimate.laborHighCents,
            partsLowCents: estimate.partsLowCents,
            partsHighCents: estimate.partsHighCents,
          })
          .from(estimate)
          .orderBy(desc(estimate.createdAt))
          .limit(10);

  const maintenanceItems = await db
    .select({
      id: maintenance.id,
      serviceType: maintenance.serviceType,
      status: maintenance.status,
      dueDate: maintenance.dueDate,
      dueMileage: maintenance.dueMileage,
    })
    .from(maintenance)
    .where(
      and(eq(maintenance.userId, userId), eq(maintenance.vehicleId, vehicleId)),
    )
    .orderBy(desc(maintenance.createdAt))
    .limit(20);

  return {
    generatedAt: new Date().toISOString(),
    vehicle: {
      id: ownedVehicle.id,
      make: ownedVehicle.make,
      model: ownedVehicle.model,
      modelYear: ownedVehicle.modelYear,
      vin: ownedVehicle.vin,
      mileage: ownedVehicle.mileage,
      engine: ownedVehicle.engine,
    },
    recentEvents: recentEvents.map((e) => ({
      id: e.id,
      dtcCode: e.dtcCode,
      severity: e.severity,
      occurredAt:
        e.occurredAt instanceof Date
          ? e.occurredAt.toISOString()
          : String(e.occurredAt),
      source: e.source,
    })),
    activeRecommendations: activeRecommendations.map((r) => ({
      id: r.id,
      diagnosticEventId: r.diagnosticEventId,
      title: r.title,
      urgency: r.urgency,
      confidence: r.confidence,
      recommendationType: r.recommendationType,
    })),
    latestEstimates: latestEstimates.map((e) => ({
      id: e.id,
      diagnosticEventId: e.diagnosticEventId,
      region: e.region,
      totalLowCents: e.laborLowCents + e.partsLowCents,
      totalHighCents: e.laborHighCents + e.partsHighCents,
    })),
    maintenanceItems: maintenanceItems.map((m) => ({
      id: m.id,
      serviceType: m.serviceType,
      status: m.status,
      dueDate: m.dueDate instanceof Date ? m.dueDate.toISOString() : m.dueDate,
      dueMileage: m.dueMileage,
    })),
    disclaimer:
      "Car Health Genius provides AI-generated diagnostic information for educational purposes only. " +
      "This report is not a substitute for professional mechanical inspection or repair advice. " +
      "Cost estimates are approximate and may vary based on location, parts, and labor rates. " +
      "Always consult a licensed mechanic before making vehicle repairs.",
  };
}
