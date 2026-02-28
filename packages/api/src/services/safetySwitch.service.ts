import { db } from "@car-health-genius/db";
import { safetySwitch } from "@car-health-genius/db/schema/safetySwitch";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";

export const SAFETY_SWITCH_SCOPES = ["diy_guides", "estimates"] as const;
export type SafetySwitchScope = (typeof SAFETY_SWITCH_SCOPES)[number];

export type SafetySwitchState = {
  scope: SafetySwitchScope;
  enabled: boolean;
  reason: string | null;
  changedByUserId: string | null;
  effectiveAt: string;
  expiresAt: string | null;
  updatedAt: string;
};

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  expiresAtMs: number;
  value: SafetySwitchState;
};

const scopeCache = new Map<SafetySwitchScope, CacheEntry>();

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toIsoNullable(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  return toIso(value);
}

function mapRow(row: typeof safetySwitch.$inferSelect): SafetySwitchState {
  const nowMs = Date.now();
  const expiresAtMs =
    row.expiresAt instanceof Date
      ? row.expiresAt.getTime()
      : row.expiresAt
        ? new Date(row.expiresAt).getTime()
        : null;
  const isExpired = expiresAtMs !== null && !Number.isNaN(expiresAtMs) && expiresAtMs <= nowMs;

  return {
    scope: row.scope as SafetySwitchScope,
    enabled: isExpired ? true : row.enabled,
    reason: isExpired ? "Switch expired" : row.reason,
    changedByUserId: row.changedByUserId,
    effectiveAt: toIso(row.effectiveAt),
    expiresAt: toIsoNullable(row.expiresAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function defaultState(scope: SafetySwitchScope): SafetySwitchState {
  const now = new Date().toISOString();
  return {
    scope,
    enabled: true,
    reason: null,
    changedByUserId: null,
    effectiveAt: now,
    expiresAt: null,
    updatedAt: now,
  };
}

function setCache(scope: SafetySwitchScope, value: SafetySwitchState) {
  scopeCache.set(scope, {
    expiresAtMs: Date.now() + CACHE_TTL_MS,
    value,
  });
}

function getCached(scope: SafetySwitchScope): SafetySwitchState | null {
  const cached = scopeCache.get(scope);
  if (!cached) {
    return null;
  }
  if (cached.expiresAtMs <= Date.now()) {
    scopeCache.delete(scope);
    return null;
  }
  return cached.value;
}

export function clearSafetySwitchCache() {
  scopeCache.clear();
}

export async function listSafetySwitches(): Promise<SafetySwitchState[]> {
  const rows = await db.select().from(safetySwitch).orderBy(asc(safetySwitch.scope));
  const mappedRows = rows.map(mapRow);

  for (const row of mappedRows) {
    setCache(row.scope, row);
  }

  return mappedRows;
}

export async function resolveSafetySwitch(scope: SafetySwitchScope): Promise<SafetySwitchState> {
  const cached = getCached(scope);
  if (cached) {
    return cached;
  }

  const [row] = await db.select().from(safetySwitch).where(eq(safetySwitch.scope, scope)).limit(1);
  const resolved = row ? mapRow(row) : defaultState(scope);
  setCache(scope, resolved);
  return resolved;
}

export async function upsertSafetySwitch(input: {
  scope: SafetySwitchScope;
  enabled: boolean;
  reason?: string;
  changedByUserId?: string;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}): Promise<SafetySwitchState> {
  const reason = input.reason?.trim();

  if (!input.enabled && (!reason || reason.length === 0)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A reason is required when disabling a safety switch",
      cause: {
        businessCode: "SAFETY_SWITCH_REASON_REQUIRED",
        scope: input.scope,
      },
    });
  }

  const [upserted] = await db
    .insert(safetySwitch)
    .values({
      scope: input.scope,
      enabled: input.enabled,
      reason: reason ?? null,
      changedByUserId: input.changedByUserId,
      effectiveAt: new Date(),
      expiresAt: input.expiresAt ?? null,
      metadata: input.metadata,
    })
    .onConflictDoUpdate({
      target: safetySwitch.scope,
      set: {
        enabled: input.enabled,
        reason: reason ?? null,
        changedByUserId: input.changedByUserId,
        effectiveAt: new Date(),
        expiresAt: input.expiresAt ?? null,
        metadata: input.metadata,
      },
    })
    .returning();

  if (!upserted) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update safety switch",
    });
  }

  const state = mapRow(upserted);
  setCache(state.scope, state);
  return state;
}

export async function requireSafetySwitchEnabled(
  scope: SafetySwitchScope,
  options: {
    message?: string;
  } = {},
): Promise<SafetySwitchState> {
  const state = await resolveSafetySwitch(scope);
  if (!state.enabled) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: options.message ?? "This feature is temporarily unavailable",
      cause: {
        businessCode: "FEATURE_DISABLED",
        featureScope: scope,
      },
    });
  }
  return state;
}
