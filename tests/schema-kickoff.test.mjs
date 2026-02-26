import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredSchemaFiles = [
  'packages/db/src/schema/vehicle.ts',
  'packages/db/src/schema/diagnosticEvent.ts',
  'packages/db/src/schema/recommendation.ts',
  'packages/db/src/schema/estimate.ts',
  'packages/db/src/schema/booking.ts',
  'packages/db/src/schema/partner.ts',
  'packages/db/src/schema/maintenance.ts',
  'packages/db/src/schema/subscription.ts',
  'packages/db/src/schema/entitlement.ts',
  'packages/db/src/schema/feedback.ts',
  'packages/db/src/schema/repairOutcome.ts',
  'packages/db/src/schema/auditLog.ts',
  'packages/db/src/migrations/0000_mushy_loa.sql',
  'packages/db/src/migrations/0001_petite_mantis.sql',
];

test('sprint-1 domain schema files exist', () => {
  for (const filePath of requiredSchemaFiles) {
    assert.equal(fs.existsSync(new URL(`../${filePath}`, import.meta.url)), true, `missing ${filePath}`);
  }
});
