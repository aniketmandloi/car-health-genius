import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";
import { readActiveTraceContext, withActiveSpan } from "./services/tracing.service";

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
  return withActiveSpan(
    "trpc.request",
    {
      "trpc.path": path,
      "trpc.type": type,
      "app.request_id": ctx.requestId,
      "app.correlation_id": ctx.correlationId,
      "app.user_role": ctx.userRole,
    },
    async () => {
      try {
        const result = await next();
        const traceContext = readActiveTraceContext();
        console.info(
          JSON.stringify({
            level: "info",
            event: "trpc.request",
            requestId: ctx.requestId,
            correlationId: ctx.correlationId,
            path,
            type,
            userRole: ctx.userRole,
            durationMs: Date.now() - startedAt,
            ...traceContext,
          }),
        );

        return result;
      } catch (error) {
        const traceContext = readActiveTraceContext();
        console.error(
          JSON.stringify({
            level: "error",
            event: "trpc.request.error",
            requestId: ctx.requestId,
            correlationId: ctx.correlationId,
            path,
            type,
            userRole: ctx.userRole,
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : "Unknown error",
            ...traceContext,
          }),
        );
        throw error;
      }
    },
  );
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
    const traceContext = readActiveTraceContext();
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "rbac.denied",
        metric: "rbac_denied_total",
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
        requiredRole: "admin",
        actualRole: ctx.userRole,
        ...traceContext,
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
    const traceContext = readActiveTraceContext();
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "rbac.denied",
        metric: "rbac_denied_total",
        requestId: ctx.requestId,
        correlationId: ctx.correlationId,
        requiredRole: "partner_member",
        actualRole: ctx.userRole,
        ...traceContext,
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
