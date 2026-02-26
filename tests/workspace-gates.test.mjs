import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rootPkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const turbo = JSON.parse(fs.readFileSync(new URL('../turbo.json', import.meta.url), 'utf8'));

test('root scripts expose sprint-0 gates', () => {
  assert.equal(typeof rootPkg.scripts.lint, 'string');
  assert.equal(typeof rootPkg.scripts['check-types'], 'string');
  assert.equal(typeof rootPkg.scripts.test, 'string');
  assert.equal(typeof rootPkg.scripts.build, 'string');
});

test('turbo tasks include lint/check-types/test/build', () => {
  const tasks = turbo.tasks ?? {};
  for (const name of ['lint', 'check-types', 'test', 'build']) {
    assert.equal(typeof tasks[name], 'object', `missing turbo task: ${name}`);
  }
});
