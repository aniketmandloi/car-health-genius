import { env } from './native';

import { resolveFeatureFlags, type FeatureFlags } from './feature-flags';

export function getNativeFeatureFlags(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
  return resolveFeatureFlags({
    freeTierEnabled: env.EXPO_PUBLIC_FLAG_FREE_TIER_ENABLED,
    proPaywallEnabled: env.EXPO_PUBLIC_FLAG_PRO_PAYWALL_ENABLED,
    aiExplanationsEnabled: env.EXPO_PUBLIC_FLAG_AI_EXPLANATIONS_ENABLED,
    partnerPortalEnabled: env.EXPO_PUBLIC_FLAG_PARTNER_PORTAL_ENABLED,
    adminKillSwitchEnabled: env.EXPO_PUBLIC_FLAG_ADMIN_KILL_SWITCH_ENABLED,
    ...overrides,
  });
}
