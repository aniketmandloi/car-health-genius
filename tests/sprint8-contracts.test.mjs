import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assertFileExists(path) {
  assert.equal(fs.existsSync(new URL(`../${path}`, import.meta.url)), true, `missing ${path}`);
}

test("sprint-8 security and performance workflow artifacts exist", () => {
  assertFileExists(".github/workflows/security.yml");
  assertFileExists(".github/workflows/perf.yml");
  assertFileExists(".github/dependency-review-config.yml");
  assertFileExists("scripts/security-audit.mjs");
  assertFileExists("tests/perf/k6/common.js");
  assertFileExists("tests/perf/k6/smoke.js");
  assertFileExists("tests/perf/k6/full.js");

  const securityWorkflow = read(".github/workflows/security.yml");
  const perfWorkflow = read(".github/workflows/perf.yml");

  assert.match(securityWorkflow, /actions\/dependency-review-action@v4/);
  assert.match(securityWorkflow, /github\/codeql-action\/analyze@v4/);
  assert.match(securityWorkflow, /pnpm run security:ci/);
  assert.match(perfWorkflow, /grafana\/setup-k6-action@v1/);
  assert.match(perfWorkflow, /tests\/perf\/k6\/smoke\.js/);
});

test("sprint-8 tracing bootstrap is wired in server and API routers", () => {
  assertFileExists("apps/server/src/otel.ts");

  const serverIndex = read("apps/server/src/index.ts");
  const apiIndex = read("packages/api/src/index.ts");
  const diagnosticsRouter = read("packages/api/src/routers/diagnostics.ts");
  const recommendationsRouter = read("packages/api/src/routers/recommendations.ts");
  const envServer = read("packages/env/src/server.ts");

  assert.match(serverIndex, /initializeOtel/);
  assert.match(serverIndex, /const otel = await initializeOtel\(\)/);
  assert.match(serverIndex, /otelEnabled/);

  assert.match(apiIndex, /readActiveTraceContext/);
  assert.match(apiIndex, /withActiveSpan/);
  assert.match(apiIndex, /"trpc.path"/);
  assert.match(apiIndex, /"trpc.type"/);
  assert.match(apiIndex, /"app.user_role"/);
  assert.match(apiIndex, /\.\.\.traceContext/);

  assert.match(diagnosticsRouter, /withActiveSpan/);
  assert.match(diagnosticsRouter, /"diagnostics\.ingestScan"/);
  assert.match(diagnosticsRouter, /"diagnostics\.timelineByVehicle"/);

  assert.match(recommendationsRouter, /withActiveSpan/);
  assert.match(recommendationsRouter, /"recommendations\.generateForDiagnosticEvent"/);
  assert.match(recommendationsRouter, /"recommendations\.likelyCauses"/);

  assert.match(envServer, /OTEL_ENABLED/);
  assert.match(envServer, /OTEL_SERVICE_NAME/);
  assert.match(envServer, /OTEL_EXPORTER_OTLP_ENDPOINT/);
});

test("sprint-8 launch and runbook documentation is present", () => {
  assertFileExists("docs/security-gates.md");
  assertFileExists("docs/launch-observability.md");
  assertFileExists("docs/alerts-launch.md");
  assertFileExists("docs/performance-baseline.md");
  assertFileExists("docs/runbooks/scan-ingestion-failures.md");
  assertFileExists("docs/runbooks/billing-webhook-failures.md");
  assertFileExists("docs/runbooks/ai-timeout-spikes.md");
  assertFileExists("docs/incidents/severity-matrix.md");
  assertFileExists("docs/incidents/incident-template.md");
  assertFileExists("docs/incidents/tabletop-sprint8.md");
  assertFileExists("docs/launch/go-no-go-checklist.md");
  assertFileExists("docs/launch/evidence-index.md");
  assertFileExists("docs/launch/go-no-go-review.md");
  assertFileExists("docs/launch/release-day-plan.md");
  assertFileExists("docs/launch/sign-off-matrix.md");
  assertFileExists("docs/launch/unresolved-risk-log.md");

  const checklist = read("docs/launch/go-no-go-checklist.md");
  assert.match(checklist, /Gate A/);
  assert.match(checklist, /Gate B/);
  assert.match(checklist, /Gate C/);
  assert.match(checklist, /Gate D/);
});

test("root scripts expose sprint-8 security and performance commands", () => {
  const rootPkg = read("package.json");

  assert.match(rootPkg, /"security:audit"/);
  assert.match(rootPkg, /"security:ci"/);
  assert.match(rootPkg, /"test:perf:smoke"/);
  assert.match(rootPkg, /"test:perf:full"/);
});
