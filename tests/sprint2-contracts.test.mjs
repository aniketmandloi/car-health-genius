import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertFileExists(path) {
  assert.equal(fs.existsSync(new URL(`../${path}`, import.meta.url)), true, `missing ${path}`);
}

test("sprint-2 schema files exist", () => {
  assertFileExists("packages/db/src/schema/adapter.ts");
  assertFileExists("packages/db/src/schema/partnerMembership.ts");
});

test("auth schema has RBAC fields for Better Auth admin plugin", () => {
  const content = read("packages/db/src/schema/auth.ts");
  assert.match(content, /role: text\("role"\)/);
  assert.match(content, /banned: boolean\("banned"\)/);
  assert.match(content, /banReason: text\("ban_reason"\)/);
  assert.match(content, /banExpires: timestamp\("ban_expires"\)/);
  assert.match(content, /impersonatedBy: text\("impersonated_by"\)/);
});

test("api core exposes admin and partner procedures", () => {
  const content = read("packages/api/src/index.ts");
  assert.match(content, /export const adminProcedure/);
  assert.match(content, /export const partnerProcedure/);
  assert.match(content, /errorFormatter/);
  assert.match(content, /businessCode/);
});

test("admin and partner routers use role-scoped procedures", () => {
  const adminContent = read("packages/api/src/routers/admin.ts");
  const partnerContent = read("packages/api/src/routers/partnerPortal.ts");
  assert.match(adminContent, /adminProcedure/);
  assert.doesNotMatch(adminContent, /protectedProcedure/);
  assert.match(partnerContent, /partnerProcedure/);
  assert.doesNotMatch(partnerContent, /actorRole: "partner_pending_rbac"/);
});

test("vehicles router exposes sprint-2 onboarding procedures", () => {
  const content = read("packages/api/src/routers/vehicles.ts");
  assert.match(content, /\bdecodeVin:/);
  assert.match(content, /\bcreateFromVin:/);
  assert.match(content, /UNSUPPORTED_GEOGRAPHY/);
  assert.match(content, /\bdelete:/);
  assert.match(content, /\bgetById:/);
  assert.match(content, /\.output\(/);
  assert.match(content, /vin_decode_requests_total/);
  assert.match(content, /vin_decode_success_total/);
  assert.match(content, /vin_decode_failure_total/);
});

test("diagnostics router exposes compatible adapter listing", () => {
  const content = read("packages/api/src/routers/diagnostics.ts");
  assert.match(content, /\blistCompatibleAdapters:/);
});

test("native adapter abstraction starter files exist", () => {
  assertFileExists("apps/native/src/modules/adapter/types.ts");
  assertFileExists("apps/native/src/modules/adapter/drivers/simulated.ts");
  assertFileExists("apps/native/src/modules/adapter/drivers/blePlx.ts");
  const indexContent = read("apps/native/src/modules/adapter/index.ts");
  assert.match(indexContent, /createAdapterDriver/);
});

test("web sprint-2 pages exist and are linked in header", () => {
  assertFileExists("apps/web/src/app/vehicles/page.tsx");
  assertFileExists("apps/web/src/app/scan/page.tsx");
  const header = read("apps/web/src/components/header.tsx");
  assert.match(header, /\/vehicles/);
  assert.match(header, /\/scan/);
});

test("native scan tab uses adapter abstraction and VIN onboarding", () => {
  const content = read("apps/native/app/(drawer)/(tabs)/two.tsx");
  assert.match(content, /createAdapterDriver/);
  assert.match(content, /trpc\.vehicles\.createFromVin/);
  assert.match(content, /UNSUPPORTED_GEOGRAPHY/);
});
