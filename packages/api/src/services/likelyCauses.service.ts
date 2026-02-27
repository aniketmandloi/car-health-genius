type JsonRecord = Record<string, unknown>;

export type LikelyCause = {
  rank: number;
  title: string;
  confidence: number;
  evidence: string[];
};

export type RankLikelyCausesInput = {
  dtcCode: string;
  freezeFrame?: JsonRecord | null;
  sensorSnapshot?: JsonRecord | null;
};

const DEFAULT_CAUSES = [
  "Intermittent sensor or harness issue",
  "Control module software behavior",
  "Wear-related component degradation",
];

const DTC_PREFIX_CAUSES: Record<string, string[]> = {
  P: ["Ignition or fuel delivery issue", "Emissions control malfunction", "Air/fuel mixture imbalance"],
  B: ["Body control module fault", "Cabin electrical sensor issue", "Battery management anomaly"],
  C: ["Chassis sensor fault", "Brake/traction subsystem signal issue", "Steering angle calibration drift"],
  U: ["Network communication fault", "Module communication timeout", "Intermittent CAN bus signal loss"],
};

function confidenceForRank(rank: number, hasContext: boolean): number {
  const base = hasContext ? 78 : 68;
  return Math.max(35, base - rank * 11);
}

function normalizeDtcCode(value: string): string {
  return value.trim().toUpperCase();
}

export function rankLikelyCauses(input: RankLikelyCausesInput): LikelyCause[] {
  const dtcCode = normalizeDtcCode(input.dtcCode);
  const prefix = dtcCode[0] ?? "";
  const causes = DTC_PREFIX_CAUSES[prefix] ?? DEFAULT_CAUSES;

  const hasFreezeFrame = Boolean(input.freezeFrame && Object.keys(input.freezeFrame).length > 0);
  const hasSensorSnapshot = Boolean(input.sensorSnapshot && Object.keys(input.sensorSnapshot).length > 0);
  const hasContext = hasFreezeFrame || hasSensorSnapshot;

  return causes.slice(0, 3).map((title, index) => ({
    rank: index + 1,
    title,
    confidence: confidenceForRank(index, hasContext),
    evidence: [
      `DTC code ${dtcCode}`,
      hasFreezeFrame ? "Freeze-frame context available" : "No freeze-frame context",
      hasSensorSnapshot ? "Sensor snapshot available" : "No live sensor snapshot",
    ],
  }));
}
