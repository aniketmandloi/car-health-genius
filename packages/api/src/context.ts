import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";

import { auth } from "@car-health-genius/auth";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return { session };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
