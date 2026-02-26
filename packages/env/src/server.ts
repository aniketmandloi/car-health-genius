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
    POLAR_SUCCESS_URL: z.url(),
    NHTSA_VPIC_BASE_URL: z.url().default("https://vpic.nhtsa.dot.gov/api"),
    NHTSA_VPIC_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    CORS_ORIGIN: z.url(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    FLAG_FREE_TIER_ENABLED: booleanFlag(true),
    FLAG_PRO_PAYWALL_ENABLED: booleanFlag(true),
    FLAG_AI_EXPLANATIONS_ENABLED: booleanFlag(false),
    FLAG_PARTNER_PORTAL_ENABLED: booleanFlag(false),
    FLAG_ADMIN_KILL_SWITCH_ENABLED: booleanFlag(true),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
