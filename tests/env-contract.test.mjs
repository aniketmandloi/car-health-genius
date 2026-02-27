import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function readFile(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function assertKeysPresent(content, keys, filePath) {
  for (const key of keys) {
    assert.match(content, new RegExp(`^${key}=`, 'm'), `missing ${key} in ${filePath}`);
  }
}

test('server env example includes required keys', () => {
  const filePath = 'apps/server/.env.example';
  const content = readFile(filePath);
  assertKeysPresent(
    content,
    [
      'NODE_ENV',
      'LOG_LEVEL',
      'CORS_ORIGIN',
      'DATABASE_URL',
      'BETTER_AUTH_SECRET',
      'BETTER_AUTH_URL',
      'POLAR_ACCESS_TOKEN',
      'POLAR_ENV',
      'POLAR_WEBHOOK_SECRET',
      'POLAR_PRODUCT_ID_PRO_MONTHLY',
      'POLAR_PRODUCT_ID_PRO_ANNUAL',
      'POLAR_SUCCESS_URL',
      'NHTSA_VPIC_BASE_URL',
      'NHTSA_VPIC_TIMEOUT_MS',
      'NHTSA_RECALL_BASE_URL',
      'NHTSA_RECALL_TIMEOUT_MS',
      'NHTSA_RECALL_CACHE_TTL_MINUTES',
      'NHTSA_RECALL_RATE_LIMIT_PER_MINUTE',
      'FLAG_FREE_TIER_ENABLED',
      'FLAG_PRO_PAYWALL_ENABLED',
      'FLAG_AI_EXPLANATIONS_ENABLED',
      'FLAG_LIKELY_CAUSES_ENABLED',
      'FLAG_PARTNER_PORTAL_ENABLED',
      'FLAG_ADMIN_KILL_SWITCH_ENABLED',
    ],
    filePath,
  );
});

test('web env example includes required keys', () => {
  const filePath = 'apps/web/.env.example';
  const content = readFile(filePath);
  assertKeysPresent(
    content,
    [
      'NEXT_PUBLIC_SERVER_URL',
      'NEXT_PUBLIC_FLAG_FREE_TIER_ENABLED',
      'NEXT_PUBLIC_FLAG_PRO_PAYWALL_ENABLED',
      'NEXT_PUBLIC_FLAG_AI_EXPLANATIONS_ENABLED',
      'NEXT_PUBLIC_FLAG_LIKELY_CAUSES_ENABLED',
      'NEXT_PUBLIC_FLAG_PARTNER_PORTAL_ENABLED',
      'NEXT_PUBLIC_FLAG_ADMIN_KILL_SWITCH_ENABLED',
    ],
    filePath,
  );
});

test('native env example includes required keys', () => {
  const filePath = 'apps/native/.env.example';
  const content = readFile(filePath);
  assertKeysPresent(
    content,
    [
      'EXPO_PUBLIC_SERVER_URL',
      'EXPO_PUBLIC_ADAPTER_MODE',
      'EXPO_PUBLIC_FLAG_FREE_TIER_ENABLED',
      'EXPO_PUBLIC_FLAG_PRO_PAYWALL_ENABLED',
      'EXPO_PUBLIC_FLAG_AI_EXPLANATIONS_ENABLED',
      'EXPO_PUBLIC_FLAG_LIKELY_CAUSES_ENABLED',
      'EXPO_PUBLIC_FLAG_PARTNER_PORTAL_ENABLED',
      'EXPO_PUBLIC_FLAG_ADMIN_KILL_SWITCH_ENABLED',
    ],
    filePath,
  );
});
