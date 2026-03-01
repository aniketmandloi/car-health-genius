import { db } from "@car-health-genius/db";
import { estimate } from "@car-health-genius/db/schema/estimate";
import { repairOutcome } from "@car-health-genius/db/schema/repairOutcome";
import { vehicle } from "@car-health-genius/db/schema/vehicle";
import { and, eq, isNotNull } from "drizzle-orm";

export type SavingsSummary = {
  totalEstimatedRangeLowCents: number;
  totalEstimatedRangeHighCents: number;
  totalActualCents: number;
  estimatedSavingsLowCents: number;
  estimatedSavingsHighCents: number;
  outcomeCount: number;
  estimateCount: number;
  confidenceNote: string;
  disclaimer: string;
};

export async function computeSavingsSummary(
  userId: string,
): Promise<SavingsSummary> {
  // Get all vehicles for this user
  const userVehicles = await db
    .select({ id: vehicle.id })
    .from(vehicle)
    .where(eq(vehicle.userId, userId));

  const vehicleIds = userVehicles.map((v) => v.id);

  if (vehicleIds.length === 0) {
    return emptySummary();
  }

  // Get all repair outcomes with invoice amounts for this user
  const outcomes = await db
    .select({
      id: repairOutcome.id,
      invoiceAmountCents: repairOutcome.invoiceAmountCents,
      estimateId: repairOutcome.estimateId,
    })
    .from(repairOutcome)
    .where(
      and(
        eq(repairOutcome.userId, userId),
        isNotNull(repairOutcome.invoiceAmountCents),
        isNotNull(repairOutcome.estimateId),
      ),
    );

  if (outcomes.length === 0) {
    // No closed-loop data - return estimate-only summary
    const estimates = await db
      .select({
        laborLowCents: estimate.laborLowCents,
        laborHighCents: estimate.laborHighCents,
        partsLowCents: estimate.partsLowCents,
        partsHighCents: estimate.partsHighCents,
      })
      .from(estimate)
      .where(eq(estimate.userId, userId));

    const totalLow = estimates.reduce(
      (sum, e) => sum + e.laborLowCents + e.partsLowCents,
      0,
    );
    const totalHigh = estimates.reduce(
      (sum, e) => sum + e.laborHighCents + e.partsHighCents,
      0,
    );

    return {
      totalEstimatedRangeLowCents: totalLow,
      totalEstimatedRangeHighCents: totalHigh,
      totalActualCents: 0,
      estimatedSavingsLowCents: 0,
      estimatedSavingsHighCents: 0,
      outcomeCount: 0,
      estimateCount: estimates.length,
      confidenceNote:
        "No repair outcomes recorded yet. Record outcomes after repairs to see savings tracking.",
      disclaimer:
        "Savings estimates are for informational purposes only and based on estimate ranges. " +
        "Actual savings may vary based on repair outcomes, geography, and market conditions.",
    };
  }

  // Get matched estimates for the outcomes
  const estimateIds = outcomes
    .map((o) => o.estimateId)
    .filter((id): id is number => id !== null);

  const matchedEstimates =
    estimateIds.length === 0
      ? []
      : await db
          .select({
            id: estimate.id,
            laborLowCents: estimate.laborLowCents,
            laborHighCents: estimate.laborHighCents,
            partsLowCents: estimate.partsLowCents,
            partsHighCents: estimate.partsHighCents,
          })
          .from(estimate)
          .where(eq(estimate.userId, userId));

  const estimateMap = new Map(matchedEstimates.map((e) => [e.id, e]));

  let totalEstimateLow = 0;
  let totalEstimateHigh = 0;
  let totalActual = 0;

  for (const outcome of outcomes) {
    if (outcome.estimateId === null || outcome.invoiceAmountCents === null)
      continue;

    const est = estimateMap.get(outcome.estimateId);
    if (!est) continue;

    totalEstimateLow += est.laborLowCents + est.partsLowCents;
    totalEstimateHigh += est.laborHighCents + est.partsHighCents;
    totalActual += outcome.invoiceAmountCents;
  }

  const savingsLow = Math.max(0, totalEstimateLow - totalActual);
  const savingsHigh = Math.max(0, totalEstimateHigh - totalActual);

  return {
    totalEstimatedRangeLowCents: totalEstimateLow,
    totalEstimatedRangeHighCents: totalEstimateHigh,
    totalActualCents: totalActual,
    estimatedSavingsLowCents: savingsLow,
    estimatedSavingsHighCents: savingsHigh,
    outcomeCount: outcomes.length,
    estimateCount: matchedEstimates.length,
    confidenceNote:
      outcomes.length < 3
        ? "Low confidence: fewer than 3 repair outcomes recorded. More data improves accuracy."
        : "Moderate confidence based on recorded repair outcomes.",
    disclaimer:
      "Savings estimates are for informational purposes only and based on estimate ranges vs. actual invoice amounts. " +
      "Results may not reflect all repair costs or savings. Always consult a licensed mechanic.",
  };
}

function emptySummary(): SavingsSummary {
  return {
    totalEstimatedRangeLowCents: 0,
    totalEstimatedRangeHighCents: 0,
    totalActualCents: 0,
    estimatedSavingsLowCents: 0,
    estimatedSavingsHighCents: 0,
    outcomeCount: 0,
    estimateCount: 0,
    confidenceNote: "No vehicles or estimates found.",
    disclaimer: "Savings estimates are for informational purposes only.",
  };
}
