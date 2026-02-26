import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

function readBusinessCode(cause: unknown): string | undefined {
  if (!cause || typeof cause !== "object") {
    return undefined;
  }

  const businessCode = (cause as { businessCode?: unknown }).businessCode;
  return typeof businessCode === "string" && businessCode.length > 0 ? businessCode : undefined;
}

export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        businessCode: readBusinessCode(error.cause),
      },
    };
  },
});

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

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userRole !== "admin") {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "rbac.denied",
        metric: "rbac_denied_total",
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
        requiredRole: "admin",
        actualRole: ctx.userRole,
      }),
    );
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin role is required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      userRole: "admin",
    },
  });
});

export const partnerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.partnerMembership) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "rbac.denied",
        metric: "rbac_denied_total",
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
        requiredRole: "partner_member",
        actualRole: ctx.userRole,
      }),
    );
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Partner membership is required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      partnerMembership: ctx.partnerMembership,
    },
  });
});
