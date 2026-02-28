import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertFileExists(path) {
  assert.equal(fs.existsSync(new URL(`../${path}`, import.meta.url)), true, `missing ${path}`);
}

test("sprint-7 schema and migration artifacts exist", () => {
  assertFileExists("packages/db/src/schema/supportIssue.ts");
  assertFileExists("packages/db/src/schema/safetySwitch.ts");
  assertFileExists("packages/db/src/migrations/0007_modern_nebula.sql");

  const schemaIndex = read("packages/db/src/schema/index.ts");
  const journal = read("packages/db/src/migrations/meta/_journal.json");
  const bookingSchema = read("packages/db/src/schema/booking.ts");

  assert.match(schemaIndex, /export \* from "\.\/supportIssue";/);
  assert.match(schemaIndex, /export \* from "\.\/safetySwitch";/);
  assert.match(journal, /"tag"\s*:\s*"0007_modern_nebula"/);
  assert.match(bookingSchema, /alternateWindowStart/);
  assert.match(bookingSchema, /alternateWindowEnd/);
  assert.match(bookingSchema, /partnerRespondedAt/);
  assert.match(bookingSchema, /confirmedAt/);
});

test("support router exposes persisted issue workflow with consent enforcement", () => {
  const supportRouter = read("packages/api/src/routers/support.ts");

  assert.match(supportRouter, /\bcreateIssue:/);
  assert.match(supportRouter, /\blistMyIssues:/);
  assert.match(supportRouter, /\bgetIssue:/);
  assert.match(supportRouter, /SUPPORT_BUNDLE_CONSENT_REQUIRED/);
  assert.match(supportRouter, /includeDiagnosticBundle/);
  assert.match(supportRouter, /consentedToDiagnosticBundle/);
  assert.match(supportRouter, /\.insert\(supportIssue\)/);
});

test("admin router exposes safety switch controls with audit logging", () => {
  const adminRouter = read("packages/api/src/routers/admin.ts");
  const safetySwitchService = read("packages/api/src/services/safetySwitch.service.ts");

  assert.match(adminRouter, /\blistSafetySwitches:/);
  assert.match(adminRouter, /\bsetSafetySwitch:/);
  assert.match(adminRouter, /safety_switch\.set/);
  assert.match(safetySwitchService, /SAFETY_SWITCH_SCOPES/);
  assert.match(safetySwitchService, /requireSafetySwitchEnabled/);
  assert.match(safetySwitchService, /SAFETY_SWITCH_REASON_REQUIRED/);
});

test("diy and estimate routes enforce runtime safety switch checks", () => {
  const recommendationsRouter = read("packages/api/src/routers/recommendations.ts");
  const estimatesRouter = read("packages/api/src/routers/estimates.ts");
  const partnerPortalRouter = read("packages/api/src/routers/partnerPortal.ts");
  const bookingRouter = read("packages/api/src/routers/booking.ts");
  const partnerPage = read("apps/web/src/app/partner/leads/page.tsx");
  const partnerClient = read("apps/web/src/app/partner/leads/leads-client.tsx");

  assert.match(recommendationsRouter, /requireSafetySwitchEnabled\("diy_guides"/);
  assert.match(estimatesRouter, /requireSafetySwitchEnabled\("estimates"/);
  assert.match(partnerPortalRouter, /alternateWindowStart/);
  assert.match(partnerPortalRouter, /alternateWindowEnd/);
  assert.match(partnerPortalRouter, /partnerRespondedAt/);
  assert.match(bookingRouter, /confirmedAt/);
  assert.match(partnerClient, /trpc\.partnerPortal\.listOpenLeads/);
  assert.match(partnerClient, /trpc\.partnerPortal\.respondToLead/);
  assert.match(partnerPage, /Partner Lead Queue/);
});
