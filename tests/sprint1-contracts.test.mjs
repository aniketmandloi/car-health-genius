import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const requiredRouterFiles = [
  'packages/api/src/routers/vehicles.ts',
  'packages/api/src/routers/diagnostics.ts',
  'packages/api/src/routers/recommendations.ts',
  'packages/api/src/routers/estimates.ts',
  'packages/api/src/routers/booking.ts',
  'packages/api/src/routers/maintenance.ts',
  'packages/api/src/routers/billing.ts',
  'packages/api/src/routers/admin.ts',
  'packages/api/src/routers/partnerPortal.ts',
];

test('sprint-1 router files exist', () => {
  for (const filePath of requiredRouterFiles) {
    assert.equal(fs.existsSync(new URL(`../${filePath}`, import.meta.url)), true, `missing ${filePath}`);
  }
});

test('appRouter registers sprint-1 routers', () => {
  const indexContent = read('packages/api/src/routers/index.ts');
  assert.match(indexContent, /\bkickoff:/, 'kickoff router should remain for compatibility');
  for (const routerKey of [
    'vehicles',
    'diagnostics',
    'recommendations',
    'estimates',
    'booking',
    'maintenance',
    'billing',
    'admin',
    'partnerPortal',
  ]) {
    assert.match(indexContent, new RegExp(`\\b${routerKey}:`), `router key not registered: ${routerKey}`);
  }
});

test('router procedures enforce auth + output contracts', () => {
  for (const filePath of requiredRouterFiles) {
    const content = read(filePath);
    if (filePath.endsWith('admin.ts')) {
      assert.match(content, /(adminProcedure|protectedProcedure)/, `missing adminProcedure in ${filePath}`);
    } else if (filePath.endsWith('partnerPortal.ts')) {
      assert.match(content, /(partnerProcedure|protectedProcedure)/, `missing partnerProcedure in ${filePath}`);
    } else {
      assert.match(content, /protectedProcedure/, `missing protectedProcedure in ${filePath}`);
    }
    assert.match(content, /\.output\(/, `missing output validator in ${filePath}`);
    assert.doesNotMatch(content, /not_implemented/, `placeholder response remains in ${filePath}`);
    if (filePath.endsWith('admin.ts') || filePath.endsWith('partnerPortal.ts')) {
      assert.doesNotMatch(content, /publicProcedure/, `publicProcedure is not allowed in ${filePath}`);
    }
  }
});

test('audit log repository stays append-only', () => {
  const content = read('packages/db/src/repositories/auditLog.ts');
  assert.match(content, /db\.insert\(auditLog\)/);
  assert.doesNotMatch(content, /db\.update\(/);
  assert.doesNotMatch(content, /db\.delete\(/);
});
