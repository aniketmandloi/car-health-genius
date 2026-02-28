export type EstimateDisclosure = {
  geographyBasis: string;
  assumptions: string[];
  exclusions: string[];
};

function toStringList(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function buildEstimateDisclosure(input: {
  region: string;
  assumptions: Record<string, unknown> | null;
  exclusions: Record<string, unknown> | null;
}): EstimateDisclosure {
  const assumptionList = toStringList(input.assumptions);
  const exclusionList = toStringList(input.exclusions);

  return {
    geographyBasis: input.region,
    assumptions: assumptionList.length > 0 ? assumptionList : ["Estimate is based on internal labor and parts models."],
    exclusions:
      exclusionList.length > 0
        ? exclusionList
        : ["Taxes, diagnostic fees, towing, and teardown-discovered damage are excluded."],
  };
}

