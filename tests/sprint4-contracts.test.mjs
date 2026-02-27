import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertFileExists(path) {
  assert.equal(fs.existsSync(new URL(`../${path}`, import.meta.url)), true, `missing ${path}`);
}

test("sprint-4 schema and service files exist", () => {
  assertFileExists("packages/db/src/schema/dtcKnowledge.ts");
  assertFileExists("packages/db/src/schema/billingWebhookEvent.ts");
  assertFileExists("packages/api/src/services/triage.service.ts");
  assertFileExists("packages/api/src/services/recommendation.service.ts");
  assertFileExists("packages/api/src/services/entitlement.service.ts");
  assertFileExists("packages/auth/src/lib/webhooks.ts");
  assertFileExists("scripts/seed-dtc-knowledge.mjs");
});

test("recommendations router exposes generated recommendation flow", () => {
  const content = read("packages/api/src/routers/recommendations.ts");
  assert.match(content, /\bgenerateForDiagnosticEvent:/);
  assert.match(content, /FLAG_AI_EXPLANATIONS_ENABLED/);
  assert.match(content, /requireEntitlement/);
  assert.match(content, /rationale/);
  assert.match(content, /triageClass/);
});

test("billing router exposes entitlement procedures", () => {
  const content = read("packages/api/src/routers/billing.ts");
  assert.match(content, /\bgetEntitlements:/);
  assert.match(content, /\bhasFeature:/);
  assert.match(content, /\blistKnownProFeatures:/);
  assert.match(content, /POLAR_PRODUCT_ID_PRO_MONTHLY/);
  assert.match(content, /POLAR_PRODUCT_ID_PRO_ANNUAL/);
});

test("auth integration includes Polar webhook handling", () => {
  const content = read("packages/auth/src/index.ts");
  assert.match(content, /webhooks\(/);
  assert.match(content, /POLAR_WEBHOOK_SECRET/);
  assert.match(content, /handlePolarWebhookPayload/);
  assert.match(content, /POLAR_PRODUCT_ID_PRO_MONTHLY/);
  assert.match(content, /POLAR_PRODUCT_ID_PRO_ANNUAL/);
});

test("admin router exposes sprint-4 DTC knowledge and webhook monitoring procedures", () => {
  const content = read("packages/api/src/routers/admin.ts");
  assert.match(content, /\blistDtcKnowledge:/);
  assert.match(content, /\bupsertDtcKnowledge:/);
  assert.match(content, /\blistBillingWebhookEvents:/);
  assert.match(content, /dtc_knowledge\.upsert/);
});

test("server env contract includes sprint-4 billing keys", () => {
  const content = read("packages/env/src/server.ts");
  assert.match(content, /POLAR_ENV/);
  assert.match(content, /POLAR_WEBHOOK_SECRET/);
  assert.match(content, /POLAR_PRODUCT_ID_PRO_MONTHLY/);
  assert.match(content, /POLAR_PRODUCT_ID_PRO_ANNUAL/);
});
