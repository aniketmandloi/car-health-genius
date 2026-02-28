import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertFileExists(path) {
  assert.equal(fs.existsSync(new URL(`../${path}`, import.meta.url)), true, `missing ${path}`);
}

test("sprint-6 schema, migration, and service files exist", () => {
  assertFileExists("packages/db/src/schema/diyGuide.ts");
  assert.equal(
    /"tag"\s*:\s*"0006_/.test(
      read("packages/db/src/migrations/meta/_journal.json"),
    ),
    true,
    "missing sprint-6 migration journal entry",
  );
  assertFileExists("packages/api/src/services/bookingStateMachine.service.ts");
  assertFileExists("packages/api/src/services/feedback.service.ts");
  assertFileExists("packages/api/src/services/diyGuide.service.ts");
  assertFileExists("packages/api/src/services/estimate.service.ts");
  assertFileExists("packages/api/src/services/estimateDisclosure.service.ts");
  assertFileExists("packages/api/src/services/partner.service.ts");
  assertFileExists("packages/api/src/services/negotiationScript.service.ts");
  assertFileExists("scripts/seed-diy-guides.mjs");
  assertFileExists("scripts/seed-partners-sprint6.mjs");
});

test("app router exposes feedback and sprint-6 surfaces", () => {
  const routerIndex = read("packages/api/src/routers/index.ts");
  const feedbackRouter = read("packages/api/src/routers/feedback.ts");
  const recommendationRouter = read("packages/api/src/routers/recommendations.ts");
  const estimatesRouter = read("packages/api/src/routers/estimates.ts");

  assert.match(routerIndex, /\bfeedback:\s*feedbackRouter/);
  assert.match(feedbackRouter, /\bcreateOrUpdate:/);
  assert.match(feedbackRouter, /\blistByDiagnosticEvent:/);
  assert.match(recommendationRouter, /\bdiyGuide:/);
  assert.match(recommendationRouter, /requireEntitlement\(ctx\.session\.user\.id, "pro\.diy_guides"\)/);
  assert.match(estimatesRouter, /\bgenerateForDiagnosticEvent:/);
  assert.match(estimatesRouter, /\bnegotiationScript:/);
  assert.match(estimatesRouter, /buildEstimateDisclosure/);
  assert.match(estimatesRouter, /listByVehicle[\s\S]*?requireEntitlement\(ctx\.session\.user\.id, "pro\.cost_estimates"\)/);
  assert.match(estimatesRouter, /listByDiagnosticEvent[\s\S]*?requireEntitlement\(ctx\.session\.user\.id, "pro\.cost_estimates"\)/);
  assert.match(estimatesRouter, /create[\s\S]*?requireEntitlement\(ctx\.session\.user\.id, "pro\.cost_estimates"\)/);
  assert.match(estimatesRouter, /requireEntitlement\(ctx\.session\.user\.id, "pro\.cost_estimates"\)/);
  assert.match(estimatesRouter, /requireEntitlement\(ctx\.session\.user\.id, "pro\.negotiation_script"\)/);
});

test("booking routers enforce state machine transitions", () => {
  const bookingRouter = read("packages/api/src/routers/booking.ts");
  const partnerRouter = read("packages/api/src/routers/partnerPortal.ts");
  const packageJson = read("package.json");

  assert.match(bookingRouter, /\blistPartners:/);
  assert.match(bookingRouter, /assertBookingTransition/);
  assert.match(bookingRouter, /booking_invalid_transition_total/);
  assert.match(bookingRouter, /booking_requested_to_confirmed_hours/);
  assert.match(bookingRouter, /listBookablePartners/);
  assert.match(bookingRouter, /\bpartnerId:\s*z\.number\(\)\.int\(\)\.positive\(\)/);
  assert.match(partnerRouter, /assertBookingTransition/);
  assert.match(partnerRouter, /booking_invalid_transition_total/);
  assert.doesNotMatch(partnerRouter, /status:\s*z\.enum\(\["accepted", "alternate", "rejected", "confirmed"\]\)/);
  assert.match(packageJson, /"db:baseline":/);
  assert.match(packageJson, /"seed:diy-guides":/);
  assert.match(packageJson, /"seed:partners-sprint6":/);
});

test("web and native results screens wire sprint-6 pro value and feedback flows", () => {
  const webResults = read("apps/web/src/app/results/[diagnosticEventId]/results-detail.tsx");
  const nativeResults = read("apps/native/app/results/[diagnosticEventId].tsx");

  assert.match(webResults, /trpc\.feedback\.createOrUpdate/);
  assert.match(webResults, /trpc\.recommendations\.diyGuide/);
  assert.match(webResults, /trpc\.estimates\.generateForDiagnosticEvent/);
  assert.match(webResults, /trpc\.estimates\.negotiationScript/);

  assert.match(nativeResults, /trpc\.feedback\.createOrUpdate/);
  assert.match(nativeResults, /trpc\.recommendations\.diyGuide/);
  assert.match(nativeResults, /trpc\.estimates\.generateForDiagnosticEvent/);
  assert.match(nativeResults, /trpc\.estimates\.negotiationScript/);
});
