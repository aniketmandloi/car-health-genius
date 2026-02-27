import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertFileExists(path) {
  assert.equal(fs.existsSync(new URL(`../${path}`, import.meta.url)), true, `missing ${path}`);
}

test("sprint-3 schema files exist", () => {
  assertFileExists("packages/db/src/schema/obdSession.ts");
  assertFileExists("packages/db/src/schema/timelineEvent.ts");
  assertFileExists("packages/db/src/schema/recallSnapshot.ts");
});

test("diagnostics router exposes sprint-3 session and timeline procedures", () => {
  const content = read("packages/api/src/routers/diagnostics.ts");
  assert.match(content, /\bstartSession:/);
  assert.match(content, /\bingestScan:/);
  assert.match(content, /\bfinishSession:/);
  assert.match(content, /\btimelineByVehicle:/);
  assert.match(content, /warningAcknowledged:\s*z\.literal\(true\)/);
  assert.match(content, /ingestIdempotencyKey/);
});

test("vehicles router exposes recalls integration procedure", () => {
  const content = read("packages/api/src/routers/vehicles.ts");
  assert.match(content, /\bgetRecalls:/);
  assert.match(content, /getRecallsByVehicle/);
  assert.match(content, /RECALL_RATE_LIMITED/);
  assert.match(content, /RECALLS_UNAVAILABLE/);
});

test("recall service and obd service files exist", () => {
  assertFileExists("packages/api/src/services/recall.service.ts");
  assertFileExists("packages/api/src/services/obd.service.ts");
});

test("native BLE driver and scan upload queue are implemented", () => {
  assertFileExists("apps/native/src/modules/adapter/drivers/blePlx.ts");
  assertFileExists("apps/native/src/modules/adapter/elm327.ts");
  assertFileExists("apps/native/src/modules/scan-upload/queue.ts");

  const bleDriver = read("apps/native/src/modules/adapter/drivers/blePlx.ts");
  assert.match(bleDriver, /PermissionsAndroid/);
  assert.match(bleDriver, /scanForAdapter/);
  assert.match(bleDriver, /sendCommand/);
  assert.match(bleDriver, /parseDtcCodesFromMode03/);
  assert.doesNotMatch(bleDriver, /not wired yet/);
});
