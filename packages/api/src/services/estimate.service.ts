export type EstimateGenerationInput = {
  dtcCode: string;
  severity: string;
  region: string;
};

export type EstimateGenerationOutput = {
  laborLowCents: number;
  laborHighCents: number;
  partsLowCents: number;
  partsHighCents: number;
  assumptions: Record<string, unknown>;
  exclusions: Record<string, unknown>;
};

const REGION_MULTIPLIERS: Record<string, number> = {
  "us-ca-bay-area": 1.3,
  "us-ca-los-angeles": 1.25,
  "us-ny-new-york-city": 1.32,
  "us-il-chicago": 1.12,
  "us-tx-austin": 1.08,
};

const SEVERITY_BASE_RANGES: Record<
  string,
  {
    laborLowCents: number;
    laborHighCents: number;
    partsLowCents: number;
    partsHighCents: number;
  }
> = {
  critical: {
    laborLowCents: 32000,
    laborHighCents: 78000,
    partsLowCents: 22000,
    partsHighCents: 94000,
  },
  high: {
    laborLowCents: 22000,
    laborHighCents: 62000,
    partsLowCents: 15000,
    partsHighCents: 70000,
  },
  medium: {
    laborLowCents: 14000,
    laborHighCents: 42000,
    partsLowCents: 9000,
    partsHighCents: 42000,
  },
  low: {
    laborLowCents: 8000,
    laborHighCents: 26000,
    partsLowCents: 5000,
    partsHighCents: 22000,
  },
  unknown: {
    laborLowCents: 12000,
    laborHighCents: 32000,
    partsLowCents: 7000,
    partsHighCents: 32000,
  },
};

function normalizeSeverity(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : "unknown";
}

function normalizeRegion(value: string): string {
  return value.trim().toLowerCase();
}

function getRegionMultiplier(region: string): number {
  return REGION_MULTIPLIERS[normalizeRegion(region)] ?? 1;
}

function withMultiplier(value: number, multiplier: number): number {
  return Math.round(value * multiplier);
}

export function generateEstimateFromDiagnostic(
  input: EstimateGenerationInput,
): EstimateGenerationOutput {
  const severity = normalizeSeverity(input.severity);
  const base = SEVERITY_BASE_RANGES[severity] ?? SEVERITY_BASE_RANGES.unknown;
  if (!base) {
    throw new Error("Estimate severity baseline is not configured");
  }
  const regionMultiplier = getRegionMultiplier(input.region);

  const laborLowCents = withMultiplier(base.laborLowCents, regionMultiplier);
  const laborHighCents = withMultiplier(base.laborHighCents, regionMultiplier);
  const partsLowCents = withMultiplier(base.partsLowCents, regionMultiplier);
  const partsHighCents = withMultiplier(base.partsHighCents, regionMultiplier);

  return {
    laborLowCents,
    laborHighCents,
    partsLowCents,
    partsHighCents,
    assumptions: {
      dtcCode: input.dtcCode.toUpperCase(),
      severity,
      regionBasis: normalizeRegion(input.region),
      regionMultiplier,
      laborRateModel: "internal_v1",
      partsIndexModel: "internal_v1",
      generatedAt: new Date().toISOString(),
    },
    exclusions: {
      taxes: "Sales and local taxes are excluded.",
      diagnosticFees: "Shop diagnostic fees are excluded unless explicitly included in written quote.",
      towing: "Towing and roadside service are excluded.",
      hiddenDamage: "Additional damage discovered during teardown is excluded.",
    },
  };
}
