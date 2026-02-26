import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredSchemaFiles = [
  'packages/db/src/schema/vehicle.ts',
  'packages/db/src/schema/diagnosticEvent.ts',
  'packages/db/src/schema/recommendation.ts',
  'packages/db/src/migrations/0000_mushy_loa.sql',
];

test('sprint-0 schema kickoff files exist', () => {
  for (const filePath of requiredSchemaFiles) {
    assert.equal(fs.existsSync(new URL(`../${filePath}`, import.meta.url)), true, `missing ${filePath}`);
  }
});
