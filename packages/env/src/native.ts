import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const booleanFlag = (defaultValue: boolean) =>
  z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SERVER_URL: z.url(),
    EXPO_PUBLIC_ADAPTER_MODE: z.enum(["simulated", "ble"]).default("simulated"),
    EXPO_PUBLIC_FLAG_FREE_TIER_ENABLED: booleanFlag(true),
    EXPO_PUBLIC_FLAG_PRO_PAYWALL_ENABLED: booleanFlag(true),
    EXPO_PUBLIC_FLAG_AI_EXPLANATIONS_ENABLED: booleanFlag(false),
    EXPO_PUBLIC_FLAG_LIKELY_CAUSES_ENABLED: booleanFlag(false),
    EXPO_PUBLIC_FLAG_PARTNER_PORTAL_ENABLED: booleanFlag(false),
    EXPO_PUBLIC_FLAG_ADMIN_KILL_SWITCH_ENABLED: booleanFlag(true),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
