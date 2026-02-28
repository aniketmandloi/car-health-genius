import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const booleanFlag = (defaultValue: boolean) =>
  z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    POLAR_ACCESS_TOKEN: z.string().min(1),
    POLAR_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_WEBHOOK_SECRET: z.string().min(1),
    POLAR_PRODUCT_ID_PRO_MONTHLY: z.string().min(1),
    POLAR_PRODUCT_ID_PRO_ANNUAL: z.string().min(1),
    POLAR_SUCCESS_URL: z.url(),
    NHTSA_VPIC_BASE_URL: z.url().default("https://vpic.nhtsa.dot.gov/api"),
    NHTSA_VPIC_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    NHTSA_RECALL_BASE_URL: z.url().default("https://api.nhtsa.gov/recalls"),
    NHTSA_RECALL_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    NHTSA_RECALL_CACHE_TTL_MINUTES: z.coerce.number().int().positive().default(720),
    NHTSA_RECALL_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(30),
    CORS_ORIGIN: z.url(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    OTEL_ENABLED: booleanFlag(false),
    OTEL_SERVICE_NAME: z.string().trim().min(1).default("car-health-genius-server"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
    FLAG_FREE_TIER_ENABLED: booleanFlag(true),
    FLAG_PRO_PAYWALL_ENABLED: booleanFlag(true),
    FLAG_AI_EXPLANATIONS_ENABLED: booleanFlag(false),
    FLAG_LIKELY_CAUSES_ENABLED: booleanFlag(false),
    FLAG_PARTNER_PORTAL_ENABLED: booleanFlag(false),
    FLAG_ADMIN_KILL_SWITCH_ENABLED: booleanFlag(true),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
