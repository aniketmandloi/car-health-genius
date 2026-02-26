export const FEATURE_FLAG_KEYS = [
  'freeTierEnabled',
  'proPaywallEnabled',
  'aiExplanationsEnabled',
  'partnerPortalEnabled',
  'adminKillSwitchEnabled',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  freeTierEnabled: true,
  proPaywallEnabled: true,
  aiExplanationsEnabled: false,
  partnerPortalEnabled: false,
  adminKillSwitchEnabled: true,
};

export function resolveFeatureFlags(overrides: Partial<FeatureFlags> = {}): FeatureFlags {
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...overrides,
  };
}

export function isFeatureFlagEnabled(flags: FeatureFlags, key: FeatureFlagKey): boolean {
  return flags[key];
}
