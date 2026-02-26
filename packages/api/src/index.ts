import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

const instrumentedProcedure = t.procedure.use(async ({ ctx, path, type, next }) => {
  const startedAt = Date.now();

  try {
    const result = await next();
    console.info(
      JSON.stringify({
        level: "info",
        event: "trpc.request",
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
        path,
        type,
        durationMs: Date.now() - startedAt,
      }),
    );

    return result;
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "trpc.request.error",
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
        path,
        type,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    throw error;
  }
});

export const publicProcedure = instrumentedProcedure;

export const protectedProcedure = instrumentedProcedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});
