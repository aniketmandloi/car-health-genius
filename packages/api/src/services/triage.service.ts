import { db } from "@car-health-genius/db";
import { dtcKnowledge } from "@car-health-genius/db/schema/dtcKnowledge";
import { eq } from "drizzle-orm";

export type TriageClass = "safe" | "service_soon" | "service_now";
export type DriveabilityClass = "drivable" | "limited" | "do_not_drive";

export type TriageInput = {
  dtcCode: string;
  severityHint?: string | null;
  freezeFrame?: Record<string, unknown> | null;
  sensorSnapshot?: Record<string, unknown> | null;
};

export type TriageDecision = {
  dtcCode: string;
  triageClass: TriageClass;
  driveability: DriveabilityClass;
  diyEligible: boolean;
  confidence: number;
  reason: string;
  knowledgeRef: {
    matched: boolean;
    id: number | null;
    source: string | null;
    sourceVersion: string | null;
  };
  policyDecision: {
    severityHintClass: TriageClass | null;
    sensorEscalation: boolean;
    sensorReason: string | null;
    safetyCritical: boolean;
  };
};

function normalizeDtcCode(input: string): string {
  return input.trim().toUpperCase();
}

function triageRank(value: TriageClass): number {
  switch (value) {
    case "safe":
      return 0;
    case "service_soon":
      return 1;
    case "service_now":
      return 2;
  }
}

function chooseMoreSevere(left: TriageClass, right: TriageClass): TriageClass {
  return triageRank(left) >= triageRank(right) ? left : right;
}

function normalizeTriageClass(value: string | null | undefined): TriageClass {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "safe") {
    return "safe";
  }

  if (normalized === "service_now" || normalized === "service now" || normalized === "urgent") {
    return "service_now";
  }

  return "service_soon";
}

function normalizeDriveability(value: string | null | undefined): DriveabilityClass {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "do_not_drive" || normalized === "do not drive") {
    return "do_not_drive";
  }

  if (normalized === "limited") {
    return "limited";
  }

  return "drivable";
}

function parseSeverityHint(value: string | null | undefined): TriageClass | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }

  if (
    normalized.includes("critical") ||
    normalized.includes("high") ||
    normalized.includes("severe") ||
    normalized.includes("urgent")
  ) {
    return "service_now";
  }

  if (normalized.includes("low") || normalized.includes("minor")) {
    return "safe";
  }

  return "service_soon";
}

function readNumericValue(
  source: Record<string, unknown> | null | undefined,
  candidates: string[],
): number | null {
  if (!source) {
    return null;
  }

  for (const key of candidates) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function readBooleanValue(
  source: Record<string, unknown> | null | undefined,
  candidates: string[],
): boolean | null {
  if (!source) {
    return null;
  }

  for (const key of candidates) {
    const value = source[key];
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
      }

      if (normalized === "false" || normalized === "0" || normalized === "no") {
        return false;
      }
    }

    if (typeof value === "number") {
      if (value === 1) {
        return true;
      }

      if (value === 0) {
        return false;
      }
    }
  }

  return null;
}

function readSensorEscalation(
  sensorSnapshot: Record<string, unknown> | null | undefined,
): {
  escalate: boolean;
  reason: string | null;
} {
  const coolantTempC = readNumericValue(sensorSnapshot, ["coolantTempC", "coolant_temp_c", "engineCoolantTempC"]);
  if (coolantTempC !== null && coolantTempC >= 115) {
    return {
      escalate: true,
      reason: "coolant temperature exceeded safe threshold",
    };
  }

  const oilPressurePsi = readNumericValue(sensorSnapshot, ["oilPressurePsi", "oil_pressure_psi"]);
  if (oilPressurePsi !== null && oilPressurePsi > 0 && oilPressurePsi < 10) {
    return {
      escalate: true,
      reason: "oil pressure is critically low",
    };
  }

  const batteryVoltage = readNumericValue(sensorSnapshot, ["batteryVoltage", "battery_voltage"]);
  if (batteryVoltage !== null && batteryVoltage < 11) {
    return {
      escalate: true,
      reason: "battery voltage indicates potential charging-system failure",
    };
  }

  const brakeFluidLow = readBooleanValue(sensorSnapshot, ["brakeFluidLow", "brake_fluid_low"]);
  if (brakeFluidLow === true) {
    return {
      escalate: true,
      reason: "brake fluid low indicator is active",
    };
  }

  return {
    escalate: false,
    reason: null,
  };
}

function buildUnknownFallback(input: TriageInput): TriageDecision {
  const dtcCode = normalizeDtcCode(input.dtcCode);
  const severityHintClass = parseSeverityHint(input.severityHint);
  const sensorEscalation = readSensorEscalation(input.sensorSnapshot);
  const fromHint = severityHintClass ?? "service_soon";
  const triageClass = sensorEscalation.escalate ? chooseMoreSevere(fromHint, "service_now") : fromHint;

  const driveability: DriveabilityClass =
    triageClass === "service_now" ? "limited" : triageClass === "service_soon" ? "limited" : "drivable";

  return {
    dtcCode,
    triageClass,
    driveability,
    diyEligible: triageClass === "safe",
    confidence: 35,
    reason: sensorEscalation.reason
      ? `Unknown DTC with sensor escalation: ${sensorEscalation.reason}`
      : "Unknown DTC fallback policy applied",
    knowledgeRef: {
      matched: false,
      id: null,
      source: null,
      sourceVersion: null,
    },
    policyDecision: {
      severityHintClass,
      sensorEscalation: sensorEscalation.escalate,
      sensorReason: sensorEscalation.reason,
      safetyCritical: false,
    },
  };
}

export async function resolveTriageDecision(input: TriageInput): Promise<TriageDecision> {
  const normalizedDtcCode = normalizeDtcCode(input.dtcCode);
  if (normalizedDtcCode.length === 0) {
    return buildUnknownFallback(input);
  }

  const [knowledge] = await db
    .select()
    .from(dtcKnowledge)
    .where(eq(dtcKnowledge.dtcCode, normalizedDtcCode))
    .limit(1);

  if (!knowledge) {
    return buildUnknownFallback({
      ...input,
      dtcCode: normalizedDtcCode,
    });
  }

  const severityHintClass = parseSeverityHint(input.severityHint);
  const sensorEscalation = readSensorEscalation(input.sensorSnapshot);
  const baseClass = normalizeTriageClass(knowledge.defaultSeverityClass);

  let triageClass = severityHintClass ? chooseMoreSevere(baseClass, severityHintClass) : baseClass;
  let driveability = normalizeDriveability(knowledge.driveability);
  let reason = knowledge.summaryTemplate;

  if (knowledge.safetyCritical) {
    triageClass = "service_now";
    driveability = "do_not_drive";
    reason = `${knowledge.summaryTemplate} (safety critical)`;
  } else if (sensorEscalation.escalate) {
    triageClass = chooseMoreSevere(triageClass, "service_now");
    if (driveability === "drivable") {
      driveability = "limited";
    }
    reason = `${knowledge.summaryTemplate} (sensor escalation: ${sensorEscalation.reason})`;
  }

  const diyEligible = knowledge.diyAllowed && triageClass === "safe" && !knowledge.safetyCritical;
  const confidence = triageClass === baseClass ? 88 : 76;

  return {
    dtcCode: normalizedDtcCode,
    triageClass,
    driveability,
    diyEligible,
    confidence,
    reason,
    knowledgeRef: {
      matched: true,
      id: knowledge.id,
      source: knowledge.source,
      sourceVersion: knowledge.sourceVersion,
    },
    policyDecision: {
      severityHintClass,
      sensorEscalation: sensorEscalation.escalate,
      sensorReason: sensorEscalation.reason,
      safetyCritical: knowledge.safetyCritical,
    },
  };
}
