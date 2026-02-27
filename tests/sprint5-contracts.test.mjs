import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertFileExists(path) {
  assert.equal(fs.existsSync(new URL(`../${path}`, import.meta.url)), true, `missing ${path}`);
}

test("sprint-5 schema files exist", () => {
  assertFileExists("packages/db/src/schema/modelRegistry.ts");
  assertFileExists("packages/db/src/schema/promptTemplate.ts");
  assertFileExists("packages/db/src/schema/modelTrace.ts");
  assertFileExists("packages/db/src/schema/reviewQueueItem.ts");
  assertFileExists("packages/db/src/schema/analyticsEvent.ts");
});

test("recommendations router exposes policy, trace, and likely causes flow", () => {
  const content = read("packages/api/src/routers/recommendations.ts");
  assert.match(content, /applyRecommendationPolicy/);
  assert.match(content, /recordModelTrace/);
  assert.match(content, /enqueueReviewQueueItem/);
  assert.match(content, /\blikelyCauses:/);
  assert.match(content, /requireEntitlement\(ctx\.session\.user\.id, "pro\.likely_causes"\)/);
});

test("admin router exposes review queue operations", () => {
  const content = read("packages/api/src/routers/admin.ts");
  assert.match(content, /\blistReviewQueue:/);
  assert.match(content, /\bclaimReviewItem:/);
  assert.match(content, /\bresolveReviewItem:/);
  assert.match(content, /\blistModelTraces:/);
  assert.match(content, /\bmonetizationDailyFunnel:/);
  assert.match(content, /review_queue\.claim/);
  assert.match(content, /review_queue\.resolve/);
});

test("billing router exposes entitlement, support priority, and monetization events", () => {
  const content = read("packages/api/src/routers/billing.ts");
  assert.match(content, /\bgetEntitlements:/);
  assert.match(content, /\bgetSupportPriority:/);
  assert.match(content, /\btrackPaywallView:/);
  assert.match(content, /\btrackUpgradeSuccess:/);
  assert.match(content, /MONETIZATION_EVENTS\.UPGRADE_START/);
  assert.match(content, /checkoutSlug/);
});

test("support router exposes priority-enriched support payload contract", () => {
  const supportRouter = read("packages/api/src/routers/support.ts");
  const appRouter = read("packages/api/src/routers/index.ts");
  assert.match(supportRouter, /\bbuildPayload:/);
  assert.match(supportRouter, /resolveSupportPriority/);
  assert.match(supportRouter, /priorityTier/);
  assert.match(appRouter, /\bsupport:\s*supportRouter/);
});

test("auth polar integration uses env product IDs and webhook handlers", () => {
  const content = read("packages/auth/src/index.ts");
  assert.match(content, /webhooks\(\{/);
  assert.match(content, /POLAR_WEBHOOK_SECRET/);
  assert.match(content, /POLAR_PRODUCT_ID_PRO_MONTHLY/);
  assert.match(content, /POLAR_PRODUCT_ID_PRO_ANNUAL/);
  assert.match(content, /onSubscriptionUpdated/);
});

test("web and native pricing/paywall surfaces exist", () => {
  assertFileExists("apps/web/src/app/pricing/page.tsx");
  assertFileExists("apps/native/app/(tabs)/pricing.tsx");

  const webPricing = read("apps/web/src/app/pricing/page.tsx");
  const nativePricing = read("apps/native/app/(tabs)/pricing.tsx");
  const nativeTabs = read("apps/native/app/(tabs)/_layout.tsx");

  assert.match(webPricing, /billing\.trackPaywallView/);
  assert.match(webPricing, /authClient\.checkout/);
  assert.match(nativePricing, /billing\.trackPaywallView/);
  assert.match(nativePricing, /\/api\/auth\/checkout/);
  assert.match(nativeTabs, /name="pricing"/);
});

test("likely causes feature flag is wired across env packages", () => {
  const serverEnv = read("packages/env/src/server.ts");
  const webEnv = read("packages/env/src/web.ts");
  const nativeEnv = read("packages/env/src/native.ts");
  const flags = read("packages/env/src/feature-flags.ts");

  assert.match(serverEnv, /FLAG_LIKELY_CAUSES_ENABLED/);
  assert.match(webEnv, /NEXT_PUBLIC_FLAG_LIKELY_CAUSES_ENABLED/);
  assert.match(nativeEnv, /EXPO_PUBLIC_FLAG_LIKELY_CAUSES_ENABLED/);
  assert.match(flags, /likelyCausesEnabled/);
});
