import { env } from './web';

import { resolveFeatureFlags, type FeatureFlags } from './feature-flags';

export function getWebFeatureFlags(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
  return resolveFeatureFlags({
    freeTierEnabled: env.NEXT_PUBLIC_FLAG_FREE_TIER_ENABLED,
    proPaywallEnabled: env.NEXT_PUBLIC_FLAG_PRO_PAYWALL_ENABLED,
    aiExplanationsEnabled: env.NEXT_PUBLIC_FLAG_AI_EXPLANATIONS_ENABLED,
    partnerPortalEnabled: env.NEXT_PUBLIC_FLAG_PARTNER_PORTAL_ENABLED,
    adminKillSwitchEnabled: env.NEXT_PUBLIC_FLAG_ADMIN_KILL_SWITCH_ENABLED,
    ...overrides,
  });
}
