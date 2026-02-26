import { and, desc, eq } from "drizzle-orm";
import { type InferInsertModel } from "drizzle-orm";

import { db } from "../index";
import { diagnosticEvent } from "../schema/diagnosticEvent";
import { recommendation } from "../schema/recommendation";
import { vehicle } from "../schema/vehicle";

type CreateVehicleInput = Pick<
  InferInsertModel<typeof vehicle>,
  "userId" | "vin" | "make" | "model" | "modelYear" | "engine" | "mileage"
>;

type CreateDiagnosticEventInput = Pick<
  InferInsertModel<typeof diagnosticEvent>,
  "vehicleId" | "source" | "dtcCode" | "severity" | "freezeFrame" | "sensorSnapshot"
>;

type CreateRecommendationInput = Pick<
  InferInsertModel<typeof recommendation>,
  "diagnosticEventId" | "recommendationType" | "urgency" | "confidence" | "title" | "details"
>;

export async function createVehicleForUser(input: CreateVehicleInput) {
  const [created] = await db.insert(vehicle).values(input).returning();
  return created;
}

export async function createDiagnosticEventRecord(input: CreateDiagnosticEventInput) {
  const [created] = await db
    .insert(diagnosticEvent)
    .values({
      ...input,
      source: input.source ?? "obd_scan",
      severity: input.severity ?? "unknown",
    })
    .returning();
  return created;
}

export async function createRecommendationRecord(input: CreateRecommendationInput) {
  const [created] = await db
    .insert(recommendation)
    .values({
      ...input,
      confidence: input.confidence ?? 0,
    })
    .returning();
  return created;
}

export async function getVehicleDiagnosticChain(input: { userId: string; vehicleId: number }) {
  return await db
    .select({
      vehicleId: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      modelYear: vehicle.modelYear,
      diagnosticEventId: diagnosticEvent.id,
      dtcCode: diagnosticEvent.dtcCode,
      severity: diagnosticEvent.severity,
      occurredAt: diagnosticEvent.occurredAt,
      recommendationId: recommendation.id,
      recommendationType: recommendation.recommendationType,
      urgency: recommendation.urgency,
      confidence: recommendation.confidence,
      title: recommendation.title,
    })
    .from(vehicle)
    .leftJoin(diagnosticEvent, eq(diagnosticEvent.vehicleId, vehicle.id))
    .leftJoin(recommendation, eq(recommendation.diagnosticEventId, diagnosticEvent.id))
    .where(and(eq(vehicle.userId, input.userId), eq(vehicle.id, input.vehicleId)))
    .orderBy(desc(diagnosticEvent.occurredAt), desc(recommendation.createdAt));
}
