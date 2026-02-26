import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";

import { auth } from "@car-health-genius/auth";
import { fromNodeHeaders } from "better-auth/node";

function readHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function createContext({ req }: CreateFastifyContextOptions) {
  const requestId = req.id;
  const correlationId = readHeaderValue(req.headers["x-correlation-id"]) ?? requestId;
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  return {
    session,
    requestId,
    correlationId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
