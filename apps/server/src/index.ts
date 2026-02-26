import { createContext } from "@car-health-genius/api/context";
import { appRouter, type AppRouter } from "@car-health-genius/api/routers/index";
import { auth } from "@car-health-genius/auth";
import { env } from "@car-health-genius/env/server";
import { getServerFeatureFlags } from "@car-health-genius/env/server-flags";
import fastifyCors from "@fastify/cors";
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";

const baseCorsConfig = {
  origin: env.CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Request-Id",
    "X-Correlation-Id",
  ],
  credentials: true,
  maxAge: 86400,
};

const fastify = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "request.headers.authorization",
        "request.headers.cookie",
        "headers.authorization",
        "headers.cookie",
        "body.password",
        "body.token",
        "body.accessToken",
        "body.refreshToken",
      ],
      remove: true,
    },
  },
  requestIdHeader: "x-request-id",
  requestIdLogLabel: "requestId",
});

const featureFlags = getServerFeatureFlags();

fastify.register(fastifyCors, baseCorsConfig);

fastify.addHook("onRequest", async (request, reply) => {
  const correlationHeader = request.headers["x-correlation-id"];
  const correlationId = Array.isArray(correlationHeader)
    ? (correlationHeader[0] ?? request.id)
    : (correlationHeader ?? request.id);

  reply.header("x-request-id", request.id);
  reply.header("x-correlation-id", correlationId);

  request.log.info(
    {
      event: "http.request.start",
      requestId: request.id,
      correlationId,
      method: request.method,
      url: request.url,
    },
    "Incoming HTTP request",
  );
});

fastify.addHook("onResponse", async (request, reply) => {
  const correlationHeader = request.headers["x-correlation-id"];
  const correlationId = Array.isArray(correlationHeader)
    ? (correlationHeader[0] ?? request.id)
    : (correlationHeader ?? request.id);

  request.log.info(
    {
      event: "http.request.complete",
      requestId: request.id,
      correlationId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime,
    },
    "Completed HTTP request",
  );
});

fastify.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      const response = await auth.handler(req);
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      request.log.error(
        {
          event: "auth.request.error",
          requestId: request.id,
          err: error,
        },
        "Authentication request failed",
      );
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  },
});

fastify.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
    onError({ path, type, error, ctx }) {
      fastify.log.error(
        {
          event: "trpc.handler.error",
          requestId: ctx?.requestId,
          correlationId: ctx?.correlationId,
          path,
          type,
          code: error.code,
          err: error,
        },
        "Error in tRPC handler",
      );
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

fastify.get("/", async () => {
  return "OK";
});

fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(
    {
      event: "server.started",
      port: 3000,
      featureFlags,
    },
    "Server running on port 3000",
  );
});
