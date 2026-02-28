import { db } from "@car-health-genius/db";
import { diyGuide } from "@car-health-genius/db/schema/diyGuide";
import { and, eq } from "drizzle-orm";

export type DiyGuideResponse = {
  id: number;
  dtcCode: string;
  title: string;
  estimatedMinutes: number;
  difficulty: string;
  tools: string[];
  parts: string[];
  safetyWarnings: string[];
  steps: string[];
  reviewStatus: string;
  updatedAt: string;
};

function normalizeDtcCode(value: string): string {
  return value.trim().toUpperCase();
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export async function findApprovedDiyGuideByDtcCode(dtcCode: string): Promise<DiyGuideResponse | null> {
  const normalizedDtcCode = normalizeDtcCode(dtcCode);
  const [guide] = await db
    .select()
    .from(diyGuide)
    .where(and(eq(diyGuide.dtcCode, normalizedDtcCode), eq(diyGuide.reviewStatus, "approved"), eq(diyGuide.isActive, true)))
    .limit(1);

  if (!guide) {
    return null;
  }

  return {
    id: guide.id,
    dtcCode: guide.dtcCode,
    title: guide.title,
    estimatedMinutes: guide.estimatedMinutes,
    difficulty: guide.difficulty,
    tools: toStringList(guide.tools),
    parts: toStringList(guide.parts),
    safetyWarnings: toStringList(guide.safetyWarnings),
    steps: toStringList(guide.steps),
    reviewStatus: guide.reviewStatus,
    updatedAt: toIso(guide.updatedAt),
  };
}

