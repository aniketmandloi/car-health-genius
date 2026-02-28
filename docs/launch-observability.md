# Launch Observability Spec (Sprint 8)

Date: February 28, 2026

## Scope

Critical pipeline: `diagnostics.ingestScan -> recommendations.generateForDiagnosticEvent`.

## Trace Requirements

1. Service name: `car-health-genius-server`.
2. Span coverage:
   - `diagnostics.ingestScan`
   - `diagnostics.timelineByVehicle`
   - `recommendations.generateForDiagnosticEvent`
   - `recommendations.likelyCauses`
3. Correlation fields required in logs:
   - `requestId`
   - `correlationId`
   - `traceId`
   - `spanId`

## Dashboard Panels

1. **Pipeline Throughput and Errors**
   - `trpc.request` count by path.
   - `trpc.request.error` count by path and `businessCode`.
2. **Ingest Reliability**
   - `scan.ingested` inserted count trend.
   - Ingest failure rate (derived from request error logs for `diagnostics.ingestScan`).
3. **Recommendation Reliability**
   - `ai_explanation_generated_total`.
   - `ai_explanation_failures_total`.
   - `ai_explanation_latency_ms` p50/p95/p99.
4. **Likely Causes Reliability**
   - `likely_causes_requests_total`.
   - `likely_causes.generated` latency p95.
5. **Billing and Entitlement Health**
   - `billing_webhook_processed_total`.
   - `billing_webhook_failed_total`.
   - `entitlement_denied_total` by entitlement key.

## SLO/NFR Mapping

1. `NFR-003`: ingest success >= 99%.
2. `NFR-004`: diagnostic history query p95 < 500 ms.
3. `NFR-005`: recommendation generation p95 < 4.0 s.

## Ownership

1. Platform pod owns dashboards and data source wiring.
2. Incident commander validates panel links in each runbook before launch sign-off.
