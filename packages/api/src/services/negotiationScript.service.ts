export type NegotiationScriptInput = {
  dtcCode: string;
  severity: string;
  region: string;
  laborLowCents: number;
  laborHighCents: number;
  partsLowCents: number;
  partsHighCents: number;
  exclusions: Record<string, unknown> | null;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function toStringListFromExclusions(value: Record<string, unknown> | null): string[] {
  if (!value) {
    return [];
  }

  return Object.values(value).filter((item): item is string => typeof item === "string");
}

export function buildNegotiationScript(input: NegotiationScriptInput) {
  const totalLow = input.laborLowCents + input.partsLowCents;
  const totalHigh = input.laborHighCents + input.partsHighCents;
  const exclusions = toStringListFromExclusions(input.exclusions);

  return {
    headline: `Shop conversation guide for ${input.dtcCode.toUpperCase()}`,
    keyQuestions: [
      "Can you break down labor and parts separately in the written quote?",
      "Which diagnosis steps confirm the root cause before replacing parts?",
      "Are there OEM and aftermarket options, and how do warranties differ?",
      "Can you confirm what is included versus excluded from this quote?",
    ],
    costAnchors: [
      `Expected total range in ${input.region}: ${formatCurrency(totalLow)} to ${formatCurrency(totalHigh)}`,
      `Labor range: ${formatCurrency(input.laborLowCents)} to ${formatCurrency(input.laborHighCents)}`,
      `Parts range: ${formatCurrency(input.partsLowCents)} to ${formatCurrency(input.partsHighCents)}`,
    ],
    exclusionsReminder: exclusions,
    closingPrompt:
      "Before authorizing repairs, request a final written estimate with taxes/fees and a completion timeline.",
    disclaimer:
      "Guidance only. This script is not legal advice and does not guarantee repair outcome or final pricing.",
    context: {
      severity: input.severity,
      generatedAt: new Date().toISOString(),
    },
  };
}

