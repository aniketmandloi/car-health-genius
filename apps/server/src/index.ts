import { createContext } from "@car-health-genius/api/context";
import { appRouter, type AppRouter } from "@car-health-genius/api/routers/index";
import { readActiveTraceContext } from "@car-health-genius/api/services/tracing.service";
import { auth } from "@car-health-genius/auth";
import { env } from "@car-health-genius/env/server";
import { getServerFeatureFlags } from "@car-health-genius/env/server-flags";
import fastifyCors from "@fastify/cors";
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import Fastify from "fastify";

import { initializeOtel } from "./otel";

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

const otel = await initializeOtel();

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

fastify.addHook("onClose", async () => {
  await otel.shutdown();
});

fastify.addHook("onRequest", async (request, reply) => {
  const correlationHeader = request.headers["x-correlation-id"];
  const correlationId = Array.isArray(correlationHeader)
    ? (correlationHeader[0] ?? request.id)
    : (correlationHeader ?? request.id);

  reply.header("x-request-id", request.id);
  reply.header("x-correlation-id", correlationId);

  const traceContext = readActiveTraceContext();
  request.log.info(
    {
      event: "http.request.start",
      requestId: request.id,
      correlationId,
      method: request.method,
      url: request.url,
      ...traceContext,
    },
    "Incoming HTTP request",
  );
});

fastify.addHook("onResponse", async (request, reply) => {
  const correlationHeader = request.headers["x-correlation-id"];
  const correlationId = Array.isArray(correlationHeader)
    ? (correlationHeader[0] ?? request.id)
    : (correlationHeader ?? request.id);

  const traceContext = readActiveTraceContext();
  request.log.info(
    {
      event: "http.request.complete",
      requestId: request.id,
      correlationId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime,
      ...traceContext,
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
      const traceContext = readActiveTraceContext();
      request.log.error(
        {
          event: "auth.request.error",
          requestId: request.id,
          err: error,
          ...traceContext,
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
      const traceContext = readActiveTraceContext();
      fastify.log.error(
        {
          event: "trpc.handler.error",
          requestId: ctx?.requestId,
          correlationId: ctx?.correlationId,
          path,
          type,
          code: error.code,
          err: error,
          ...traceContext,
        },
        "Error in tRPC handler",
      );
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

fastify.get("/", async () => {
  return "OK";
});

const serverHost = "0.0.0.0";
const serverPort = 3000;

fastify.listen({ host: serverHost, port: serverPort }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(
    {
      event: "server.started",
      host: serverHost,
      port: serverPort,
      featureFlags,
      otelEnabled: otel.enabled,
    },
    "Server running",
  );
});
