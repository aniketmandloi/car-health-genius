import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";

import { auth } from "@car-health-genius/auth";
import { db } from "@car-health-genius/db";
import { partnerMembership } from "@car-health-genius/db/schema/partnerMembership";
import { fromNodeHeaders } from "better-auth/node";
import { and, eq } from "drizzle-orm";

function readHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readUserRole(user: unknown): string {
  if (!user || typeof user !== "object") {
    return "user";
  }

  const role = (user as { role?: unknown }).role;
  return typeof role === "string" && role.length > 0 ? role : "user";
}

export async function createContext({ req }: CreateFastifyContextOptions) {
  const requestId = req.id;
  const correlationId = readHeaderValue(req.headers["x-correlation-id"]) ?? requestId;
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  const activeMembership = session
    ? await db
        .select({
          partnerId: partnerMembership.partnerId,
          membershipRole: partnerMembership.membershipRole,
        })
        .from(partnerMembership)
        .where(and(eq(partnerMembership.userId, session.user.id), eq(partnerMembership.status, "active")))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null;

  return {
    session,
    requestId,
    correlationId,
    userRole: session ? readUserRole(session.user) : "anonymous",
    partnerMembership: activeMembership,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
