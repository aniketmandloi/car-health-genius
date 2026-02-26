import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const booleanFlag = (defaultValue: boolean) =>
  z
    .enum(["true", "false"])
    .default(defaultValue ? "true" : "false")
    .transform((value) => value === "true");

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SERVER_URL: z.url(),
    NEXT_PUBLIC_FLAG_FREE_TIER_ENABLED: booleanFlag(true),
    NEXT_PUBLIC_FLAG_PRO_PAYWALL_ENABLED: booleanFlag(true),
    NEXT_PUBLIC_FLAG_AI_EXPLANATIONS_ENABLED: booleanFlag(false),
    NEXT_PUBLIC_FLAG_PARTNER_PORTAL_ENABLED: booleanFlag(false),
    NEXT_PUBLIC_FLAG_ADMIN_KILL_SWITCH_ENABLED: booleanFlag(true),
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_FLAG_FREE_TIER_ENABLED: process.env.NEXT_PUBLIC_FLAG_FREE_TIER_ENABLED,
    NEXT_PUBLIC_FLAG_PRO_PAYWALL_ENABLED: process.env.NEXT_PUBLIC_FLAG_PRO_PAYWALL_ENABLED,
    NEXT_PUBLIC_FLAG_AI_EXPLANATIONS_ENABLED: process.env.NEXT_PUBLIC_FLAG_AI_EXPLANATIONS_ENABLED,
    NEXT_PUBLIC_FLAG_PARTNER_PORTAL_ENABLED: process.env.NEXT_PUBLIC_FLAG_PARTNER_PORTAL_ENABLED,
    NEXT_PUBLIC_FLAG_ADMIN_KILL_SWITCH_ENABLED: process.env.NEXT_PUBLIC_FLAG_ADMIN_KILL_SWITCH_ENABLED,
  },
  emptyStringAsUndefined: true,
});
