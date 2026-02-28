# Performance Baseline (Sprint 8)

Date: February 28, 2026

## Goal

Track NFR launch thresholds with repeatable k6 runs.

## Required Secrets for CI Runs

1. `PERF_INGEST_URL`
2. `PERF_HISTORY_URL`
3. `PERF_RECOMMEND_URL`
4. `PERF_AUTH_HEADER`
5. `PERF_INGEST_BODY`
6. `PERF_RECOMMEND_BODY`

## Commands

1. Smoke: `pnpm run test:perf:smoke`
2. Full: `pnpm run test:perf:full`

## CI Rollout Mode

1. Repository variable `PERF_SMOKE_BLOCKING` controls enforcement mode.
2. `PERF_SMOKE_BLOCKING != true`: perf workflow is non-blocking (warn mode).
3. `PERF_SMOKE_BLOCKING = true`: perf workflow becomes release-blocking.

## Thresholds

1. Ingest success check rate > 99%.
2. History endpoint p95 < 500ms.
3. Recommendation endpoint p95 < 4000ms.

## Baseline Table

| Run Date | Profile | History p95 (ms) | Recommendation p95 (ms) | Ingest Check Rate | Result |
| --- | --- | --- | --- | --- | --- |
| TBD | smoke | TBD | TBD | TBD | TBD |
| TBD | full | TBD | TBD | TBD | TBD |

## Follow-up Actions

1. If p95 breaches threshold twice in a row, create P0 perf ticket.
2. Attach run artifacts in launch evidence index.
