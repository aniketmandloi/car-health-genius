import { execSync } from 'node:child_process';

const paths = 'packages/db/src/migrations packages/db/src/migrations/meta';

function run(command, options = {}) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
}

const before = run(`git diff -- ${paths}`);

execSync('pnpm run db:generate', {
  stdio: 'inherit',
});

const after = run(`git diff -- ${paths}`);

if (before !== after) {
  console.error('Migration drift detected: `db:generate` changed migration artifacts.');
  process.exit(1);
}

console.log('Migration drift check passed.');
