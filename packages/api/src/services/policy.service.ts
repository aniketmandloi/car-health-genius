import { findBlockedClaimMatches } from "./policy-rules";

const HIGH_URGENCY_VALUES = new Set(["service_now", "do_not_drive", "urgent", "critical"]);
const SEEK_SERVICE_DIRECTIVE = "Seek professional service as soon as possible.";
const DEFAULT_LIMITATION = "Guidance is probabilistic and should be verified by a professional inspection.";

type JsonRecord = Record<string, unknown>;

export type PolicyInput = {
  title: string;
  details?: JsonRecord | undefined;
  urgency: string;
  confidence: number;
};

export type PolicyResult = {
  blocked: boolean;
  blockedReasons: string[];
  sanitizedTitle: string;
  sanitizedDetails: JsonRecord;
  fallbackApplied: boolean;
  directiveInjected: boolean;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean);
}

function normalizeUrgency(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "_");
}

function includesServiceDirective(nextSteps: string[]): boolean {
  return nextSteps.some((step) => step.toLowerCase().includes("seek professional service"));
}

function toSafeDetails(details?: JsonRecord): JsonRecord {
  if (!details) {
    return {};
  }

  return {
    ...details,
  };
}

export function applyRecommendationPolicy(input: PolicyInput): PolicyResult {
  const safeDetails = toSafeDetails(input.details);
  const summary = asString(safeDetails.summary);
  const rationale = asString(safeDetails.rationale);
  const limitations = asStringArray(safeDetails.limitations);
  const nextSteps = asStringArray(safeDetails.nextSteps);

  const contentToCheck = [input.title, summary, rationale, ...nextSteps].filter((entry): entry is string => Boolean(entry));
  const blockedMatches = contentToCheck.flatMap((entry) => findBlockedClaimMatches(entry));
  const blockedReasons = Array.from(new Set(blockedMatches.map((match) => match.label)));

  const isHighUrgency = HIGH_URGENCY_VALUES.has(normalizeUrgency(input.urgency));
  let directiveInjected = false;

  if (isHighUrgency && !includesServiceDirective(nextSteps)) {
    nextSteps.unshift(SEEK_SERVICE_DIRECTIVE);
    directiveInjected = true;
  }

  const normalizedLimitations = limitations.length > 0 ? limitations : [DEFAULT_LIMITATION];
  if (!normalizedLimitations.some((entry) => entry.toLowerCase().includes("confidence"))) {
    normalizedLimitations.push(`Confidence score: ${Math.max(0, Math.min(100, input.confidence))} of 100.`);
  }

  if (blockedReasons.length > 0) {
    return {
      blocked: true,
      blockedReasons,
      sanitizedTitle: "Further inspection recommended",
      sanitizedDetails: {
        ...safeDetails,
        summary: "This guidance was adjusted to remove unsupported claims.",
        rationale: "Use verified diagnostics and consult a qualified technician before major repairs.",
        limitations: normalizedLimitations,
        nextSteps: nextSteps.length > 0 ? nextSteps : [SEEK_SERVICE_DIRECTIVE],
      },
      fallbackApplied: true,
      directiveInjected,
    };
  }

  return {
    blocked: false,
    blockedReasons: [],
    sanitizedTitle: input.title,
    sanitizedDetails: {
      ...safeDetails,
      limitations: normalizedLimitations,
      nextSteps,
    },
    fallbackApplied: false,
    directiveInjected,
  };
}
