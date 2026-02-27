import { env } from './server';

import { resolveFeatureFlags, type FeatureFlags } from './feature-flags';

export function getServerFeatureFlags(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
  return resolveFeatureFlags({
    freeTierEnabled: env.FLAG_FREE_TIER_ENABLED,
    proPaywallEnabled: env.FLAG_PRO_PAYWALL_ENABLED,
    aiExplanationsEnabled: env.FLAG_AI_EXPLANATIONS_ENABLED,
    likelyCausesEnabled: env.FLAG_LIKELY_CAUSES_ENABLED,
    partnerPortalEnabled: env.FLAG_PARTNER_PORTAL_ENABLED,
    adminKillSwitchEnabled: env.FLAG_ADMIN_KILL_SWITCH_ENABLED,
    ...overrides,
  });
}
