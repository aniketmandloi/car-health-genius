# Runbook: Scan Ingestion Failures

## Trigger

1. `alert.scan_ingest_failure_rate_high` fired.

## Signals

1. Spike in `trpc.request.error` for path `diagnostics.ingestScan`.
2. Drop in `scan.ingested` inserted count.

## Dashboard Panels

1. `Launch > Pipeline Throughput and Errors > trpc.request.error by path`.
2. `Launch > Ingest Reliability > scan.ingested inserted count trend`.

## Triage Steps

1. Confirm if failures are global or adapter-specific.
2. Inspect latest errors grouped by `businessCode`.
3. Validate DB health and migration state.
4. Validate idempotency conflicts and upload payload format.

## Mitigation

1. If adapter-specific, disable affected adapter in compatibility list.
2. If payload regression, roll back client release or hotfix parser.
3. If DB issue, fail over or throttle ingest traffic.

## Escalation

1. Escalate to Sev1 if ingest success remains <95% for 15 minutes.
2. Notify product/support with ETA and impacted versions.
