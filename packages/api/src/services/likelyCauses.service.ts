type JsonRecord = Record<string, unknown>;

export type LikelyCause = {
  rank: number;
  title: string;
  confidence: number;
  evidence: string[];
};

export type RankLikelyCausesInput = {
  dtcCode: string;
  severity?: string | null;
  freezeFrame?: JsonRecord | null;
  sensorSnapshot?: JsonRecord | null;
};

type CauseTemplate = {
  title: string;
  baseWeight: number;
  evidenceHint: string;
};

const DEFAULT_CAUSES: CauseTemplate[] = [
  {
    title: "Intermittent sensor or harness issue",
    baseWeight: 56,
    evidenceHint: "Common intermittent electrical faults",
  },
  {
    title: "Control module software behavior",
    baseWeight: 52,
    evidenceHint: "Module logic faults can trigger generic DTCs",
  },
  {
    title: "Wear-related component degradation",
    baseWeight: 49,
    evidenceHint: "Mechanical wear can accumulate gradually",
  },
];

const DTC_PREFIX_CAUSES: Record<string, CauseTemplate[]> = {
  P: [
    { title: "Ignition or fuel delivery issue", baseWeight: 75, evidenceHint: "Powertrain faults often map to fuel/spark" },
    { title: "Emissions control malfunction", baseWeight: 69, evidenceHint: "Powertrain DTCs often involve emissions devices" },
    { title: "Air/fuel mixture imbalance", baseWeight: 64, evidenceHint: "Fuel trim or airflow anomalies can trigger imbalance" },
  ],
  B: [
    { title: "Body control module fault", baseWeight: 74, evidenceHint: "Body DTCs often involve BCM signal paths" },
    { title: "Cabin electrical sensor issue", baseWeight: 66, evidenceHint: "Cabin sensors can drift or disconnect" },
    { title: "Battery management anomaly", baseWeight: 61, evidenceHint: "Electrical load and battery behavior can trigger B-codes" },
  ],
  C: [
    { title: "Chassis sensor fault", baseWeight: 75, evidenceHint: "Chassis DTCs often involve wheel/brake sensors" },
    { title: "Brake/traction subsystem signal issue", baseWeight: 67, evidenceHint: "ABS/traction channels commonly surface C-codes" },
    { title: "Steering angle calibration drift", baseWeight: 60, evidenceHint: "Steering calibration faults can trigger intermittent chassis alerts" },
  ],
  U: [
    { title: "Network communication fault", baseWeight: 76, evidenceHint: "U-codes usually indicate network path failures" },
    { title: "Module communication timeout", baseWeight: 68, evidenceHint: "Timeouts are common in intermittent bus disruption" },
    { title: "Intermittent CAN bus signal loss", baseWeight: 63, evidenceHint: "CAN signal instability can trigger communication errors" },
  ],
};

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 8,
  high: 6,
  medium: 3,
  low: 1,
  unknown: 0,
};

function confidenceForScore(score: number): number {
  return Math.max(35, Math.min(95, Math.round(score)));
}

function normalizeDtcCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeSeverity(value: string | null | undefined): string {
  if (!value) {
    return "unknown";
  }

  return value.trim().toLowerCase();
}

function isNonEmptyRecord(value: JsonRecord | null | undefined): boolean {
  return Boolean(value && Object.keys(value).length > 0);
}

function contextBoost(input: {
  hasFreezeFrame: boolean;
  hasSensorSnapshot: boolean;
}): number {
  if (input.hasFreezeFrame && input.hasSensorSnapshot) {
    return 8;
  }

  if (input.hasFreezeFrame || input.hasSensorSnapshot) {
    return 5;
  }

  return 0;
}

export function rankLikelyCauses(input: RankLikelyCausesInput): LikelyCause[] {
  const dtcCode = normalizeDtcCode(input.dtcCode);
  const prefix = dtcCode[0] ?? "";
  const severity = normalizeSeverity(input.severity);
  const causes = DTC_PREFIX_CAUSES[prefix] ?? DEFAULT_CAUSES;

  const hasFreezeFrame = isNonEmptyRecord(input.freezeFrame);
  const hasSensorSnapshot = isNonEmptyRecord(input.sensorSnapshot);
  const contextScore = contextBoost({
    hasFreezeFrame,
    hasSensorSnapshot,
  });
  const severityScore = SEVERITY_WEIGHT[severity] ?? 0;

  const ranked = causes
    .map((cause) => {
      const score = cause.baseWeight + contextScore + severityScore;
      return {
        title: cause.title,
        score,
        confidence: confidenceForScore(score),
        evidence: [
          `DTC code ${dtcCode} (${prefix || "unknown"} family)`,
          `Severity signal: ${severity}`,
          cause.evidenceHint,
          hasFreezeFrame ? "Freeze-frame context available" : "Freeze-frame context unavailable",
          hasSensorSnapshot ? "Sensor snapshot available" : "Sensor snapshot unavailable",
        ],
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.title.localeCompare(b.title);
    })
    .slice(0, 3);

  return ranked.map((cause, index) => ({
    rank: index + 1,
    title: cause.title,
    confidence: cause.confidence,
    evidence: cause.evidence,
  }));
}
