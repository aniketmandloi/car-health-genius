import { env } from "@car-health-genius/env/server";
import { db } from "@car-health-genius/db";
import { recallSnapshot } from "@car-health-genius/db/schema/recallSnapshot";
import { and, desc, eq, gt } from "drizzle-orm";

export type RecallServiceErrorCode = "RECALL_RATE_LIMITED" | "RECALL_PROVIDER_UNAVAILABLE";

export class RecallServiceError extends Error {
  code: RecallServiceErrorCode;

  constructor(code: RecallServiceErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type RecallRecord = Record<string, unknown>;

export type RecallLookupResult = {
  source: "nhtsa_recalls";
  retrievedAt: string;
  cacheExpiresAt: string;
  cached: boolean;
  stale: boolean;
  records: RecallRecord[];
};

type RecallLookupParams = {
  make: string;
  model: string;
  modelYear: number;
};

let rateLimitWindowStartedAt = Date.now();
let recallRequestsInWindow = 0;

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

function buildCacheKey(params: RecallLookupParams): string {
  return `${normalizeTerm(params.make)}:${normalizeTerm(params.model)}:${params.modelYear}`;
}

function parseRecords(payload: unknown): RecallRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter((entry): entry is RecallRecord => Boolean(entry && typeof entry === "object"));
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const asRecord = payload as Record<string, unknown>;
  const lowerCaseResults = asRecord.results;
  if (Array.isArray(lowerCaseResults)) {
    return lowerCaseResults.filter((entry): entry is RecallRecord => Boolean(entry && typeof entry === "object"));
  }

  const upperCaseResults = asRecord.Results;
  if (Array.isArray(upperCaseResults)) {
    return upperCaseResults.filter((entry): entry is RecallRecord => Boolean(entry && typeof entry === "object"));
  }

  return [];
}

function mapSnapshotRow(row: typeof recallSnapshot.$inferSelect, options: { cached: boolean; stale: boolean }): RecallLookupResult {
  return {
    source: "nhtsa_recalls",
    retrievedAt: toIso(row.retrievedAt),
    cacheExpiresAt: toIso(row.expiresAt),
    cached: options.cached,
    stale: options.stale,
    records: parseRecords(row.payload),
  };
}

function enforceRateLimit() {
  const now = Date.now();
  if (now - rateLimitWindowStartedAt >= 60_000) {
    rateLimitWindowStartedAt = now;
    recallRequestsInWindow = 0;
  }

  if (recallRequestsInWindow >= env.NHTSA_RECALL_RATE_LIMIT_PER_MINUTE) {
    throw new RecallServiceError("RECALL_RATE_LIMITED", "Recall provider rate limit guard was exceeded");
  }

  recallRequestsInWindow += 1;
}

function buildRecallsUrl(params: RecallLookupParams): URL {
  const url = new URL(env.NHTSA_RECALL_BASE_URL);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/recallsByVehicle`;
  url.searchParams.set("make", params.make);
  url.searchParams.set("model", params.model);
  url.searchParams.set("modelYear", String(params.modelYear));
  return url;
}

async function fetchProviderRecords(params: RecallLookupParams): Promise<RecallRecord[]> {
  const timeoutMs = env.NHTSA_RECALL_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildRecallsUrl(params), {
      method: "GET",
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new RecallServiceError(
        "RECALL_PROVIDER_UNAVAILABLE",
        `Recall provider request failed with status ${response.status}`,
      );
    }

    const payload = (await response.json()) as unknown;
    return parseRecords(payload);
  } catch (error) {
    if (error instanceof RecallServiceError) {
      throw error;
    }

    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    throw new RecallServiceError(
      "RECALL_PROVIDER_UNAVAILABLE",
      isTimeout ? `Recall provider timed out after ${timeoutMs}ms` : "Recall provider request failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRecallsByVehicle(params: RecallLookupParams): Promise<RecallLookupResult> {
  const cacheKey = buildCacheKey(params);
  const now = new Date();

  const [freshSnapshot] = await db
    .select()
    .from(recallSnapshot)
    .where(and(eq(recallSnapshot.cacheKey, cacheKey), gt(recallSnapshot.expiresAt, now)))
    .limit(1);

  if (freshSnapshot) {
    return mapSnapshotRow(freshSnapshot, {
      cached: true,
      stale: false,
    });
  }

  try {
    enforceRateLimit();
    const records = await fetchProviderRecords(params);
    const ttlMs = env.NHTSA_RECALL_CACHE_TTL_MINUTES * 60_000;
    const retrievedAt = new Date();
    const expiresAt = new Date(retrievedAt.getTime() + ttlMs);

    const [upserted] = await db
      .insert(recallSnapshot)
      .values({
        cacheKey,
        make: params.make,
        model: params.model,
        modelYear: params.modelYear,
        source: "nhtsa_recalls",
        status: "success",
        payload: records,
        retrievedAt,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: recallSnapshot.cacheKey,
        set: {
          source: "nhtsa_recalls",
          status: "success",
          payload: records,
          retrievedAt,
          expiresAt,
        },
      })
      .returning();

    if (!upserted) {
      throw new RecallServiceError("RECALL_PROVIDER_UNAVAILABLE", "Failed to persist recall snapshot");
    }

    return mapSnapshotRow(upserted, {
      cached: false,
      stale: false,
    });
  } catch (error) {
    const [latestSnapshot] = await db
      .select()
      .from(recallSnapshot)
      .where(eq(recallSnapshot.cacheKey, cacheKey))
      .orderBy(desc(recallSnapshot.retrievedAt))
      .limit(1);

    if (latestSnapshot) {
      return mapSnapshotRow(latestSnapshot, {
        cached: true,
        stale: true,
      });
    }

    if (error instanceof RecallServiceError) {
      throw error;
    }

    throw new RecallServiceError("RECALL_PROVIDER_UNAVAILABLE", "Recall lookup failed");
  }
}
