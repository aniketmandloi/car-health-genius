import { db } from "@car-health-genius/db";
import { partner } from "@car-health-genius/db/schema/partner";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";

export type PartnerListItem = {
  id: number;
  displayName: string;
  slug: string;
  launchMetro: string;
  state: string | null;
  status: string;
  vettingStatus: string;
  acceptsLeads: boolean;
  availability: string | null;
  pricingPolicyFlags: Record<string, unknown> | null;
  serviceArea: Record<string, unknown> | null;
  dataFreshnessAt: string | null;
  updatedAt: string;
};

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toIsoNullable(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }
  return toIso(value);
}

function mapPartnerRow(row: typeof partner.$inferSelect): PartnerListItem {
  return {
    id: row.id,
    displayName: row.displayName,
    slug: row.slug,
    launchMetro: row.launchMetro,
    state: row.state,
    status: row.status,
    vettingStatus: row.vettingStatus,
    acceptsLeads: row.acceptsLeads,
    availability: row.availability,
    pricingPolicyFlags: (row.pricingPolicyFlags as Record<string, unknown> | null) ?? null,
    serviceArea: (row.serviceArea as Record<string, unknown> | null) ?? null,
    dataFreshnessAt: toIsoNullable(row.dataFreshnessAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export async function listBookablePartners(input?: {
  launchMetro?: string;
  limit?: number;
}): Promise<PartnerListItem[]> {
  const limit = Math.max(1, Math.min(input?.limit ?? 50, 100));
  const whereClause = input?.launchMetro
    ? and(
        eq(partner.status, "active"),
        eq(partner.acceptsLeads, true),
        eq(partner.vettingStatus, "approved"),
        eq(partner.launchMetro, input.launchMetro),
      )
    : and(eq(partner.status, "active"), eq(partner.acceptsLeads, true), eq(partner.vettingStatus, "approved"));

  const rows = await db.select().from(partner).where(whereClause).orderBy(asc(partner.displayName)).limit(limit);
  return rows.map(mapPartnerRow);
}

export async function assertBookablePartner(partnerId: number): Promise<PartnerListItem> {
  const [found] = await db.select().from(partner).where(eq(partner.id, partnerId)).limit(1);
  if (!found) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Partner not found",
    });
  }

  const mapped = mapPartnerRow(found);
  if (mapped.status !== "active" || !mapped.acceptsLeads || mapped.vettingStatus !== "approved") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Partner is not available for booking",
      cause: {
        businessCode: "PARTNER_NOT_BOOKABLE",
      },
    });
  }

  return mapped;
}

