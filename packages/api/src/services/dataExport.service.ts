import { db } from "@car-health-genius/db";
import { diagnosticEvent } from "@car-health-genius/db/schema/diagnosticEvent";
import { estimate } from "@car-health-genius/db/schema/estimate";
import { feedback } from "@car-health-genius/db/schema/feedback";
import { maintenance } from "@car-health-genius/db/schema/maintenance";
import { repairOutcome } from "@car-health-genius/db/schema/repairOutcome";
import { supportIssue } from "@car-health-genius/db/schema/supportIssue";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { eq, inArray } from "drizzle-orm";

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toIsoNullable(value: Date | string | null): string | null {
  return value === null ? null : toIso(value);
}

export type UserDataExport = {
  exportedAt: string;
  vehicles: Array<Record<string, unknown>>;
  diagnosticEvents: Array<Record<string, unknown>>;
  maintenanceItems: Array<Record<string, unknown>>;
  estimates: Array<Record<string, unknown>>;
  repairOutcomes: Array<Record<string, unknown>>;
  feedback: Array<Record<string, unknown>>;
  supportIssues: Array<Record<string, unknown>>;
};

export async function exportUserData(userId: string): Promise<UserDataExport> {
  const vehicles_ = await db
    .select()
    .from(vehicle)
    .where(eq(vehicle.userId, userId));
  const vehicleIds = vehicles_.map((v) => v.id);

  const diagnosticEvents_ =
    vehicleIds.length === 0
      ? []
      : await db
          .select()
          .from(diagnosticEvent)
          .where(inArray(diagnosticEvent.vehicleId, vehicleIds));

  const maintenanceItems_ =
    vehicleIds.length === 0
      ? []
      : await db
          .select()
          .from(maintenance)
          .where(eq(maintenance.userId, userId));

  const estimates_ = await db
    .select()
    .from(estimate)
    .where(eq(estimate.userId, userId));

  const repairOutcomes_ = await db
    .select()
    .from(repairOutcome)
    .where(eq(repairOutcome.userId, userId));

  const feedback_ = await db
    .select()
    .from(feedback)
    .where(eq(feedback.userId, userId));

  const supportIssues_ = await db
    .select()
    .from(supportIssue)
    .where(eq(supportIssue.userId, userId));

  return {
    exportedAt: new Date().toISOString(),
    vehicles: vehicles_.map((v) => ({
      id: v.id,
      vin: v.vin,
      make: v.make,
      model: v.model,
      modelYear: v.modelYear,
      engine: v.engine,
      mileage: v.mileage,
      countryCode: v.countryCode,
      stateCode: v.stateCode,
      createdAt: toIso(v.createdAt),
    })),
    diagnosticEvents: diagnosticEvents_.map((e) => ({
      id: e.id,
      vehicleId: e.vehicleId,
      dtcCode: e.dtcCode,
      severity: e.severity,
      source: e.source,
      occurredAt: toIso(e.occurredAt),
      capturedAt: toIsoNullable(e.capturedAt),
      createdAt: toIso(e.createdAt),
    })),
    maintenanceItems: maintenanceItems_.map((m) => ({
      id: m.id,
      vehicleId: m.vehicleId,
      serviceType: m.serviceType,
      dueMileage: m.dueMileage,
      dueDate: toIsoNullable(m.dueDate),
      status: m.status,
      lastCompletedAt: toIsoNullable(m.lastCompletedAt),
      notes: m.notes,
      createdAt: toIso(m.createdAt),
    })),
    estimates: estimates_.map((e) => ({
      id: e.id,
      vehicleId: e.vehicleId,
      diagnosticEventId: e.diagnosticEventId,
      laborLowCents: e.laborLowCents,
      laborHighCents: e.laborHighCents,
      partsLowCents: e.partsLowCents,
      partsHighCents: e.partsHighCents,
      createdAt: toIso(e.createdAt),
    })),
    repairOutcomes: repairOutcomes_.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      diagnosticEventId: r.diagnosticEventId,
      outcomeStatus: r.outcomeStatus,
      invoiceAmountCents: r.invoiceAmountCents,
      notes: r.notes,
      createdAt: toIso(r.createdAt),
    })),
    feedback: feedback_.map((f) => ({
      id: f.id,
      diagnosticEventId: f.diagnosticEventId,
      rating: f.rating,
      notes: f.notes,
      outcome: f.outcome,
      createdAt: toIso(f.createdAt),
    })),
    supportIssues: supportIssues_.map((s) => ({
      id: s.id,
      issueSummary: s.issueSummary,
      issueDetails: s.issueDetails,
      status: s.status,
      createdAt: toIso(s.createdAt),
    })),
  };
}
