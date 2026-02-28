# Launch Alerts (Sprint 8)

Date: February 28, 2026

## Alert Rules

1. `alert.scan_ingest_failure_rate_high`
   - Condition: ingest failure rate > 1% for 10 minutes.
   - Severity: Sev2.
   - Owner: Backend on-call.
2. `alert.recommendation_ai_failure_spike`
   - Condition: `ai_explanation_failures_total` > 10 in 5 minutes.
   - Severity: Sev2.
   - Owner: AI/Backend on-call.
3. `alert.recommendation_latency_p95_breach`
   - Condition: recommendation p95 > 4s for 10 minutes.
   - Severity: Sev2.
   - Owner: Backend on-call.
4. `alert.timeline_latency_p95_breach`
   - Condition: timeline/history p95 > 500ms for 10 minutes.
   - Severity: Sev3.
   - Owner: Backend on-call.
5. `alert.billing_webhook_failures`
   - Condition: `billing_webhook_failed_total` > 5 in 5 minutes.
   - Severity: Sev1.
   - Owner: Billing/Platform on-call.

## Escalation

1. Sev1: acknowledge in 5 minutes, page primary and secondary.
2. Sev2: acknowledge in 10 minutes, page primary.
3. Sev3: acknowledge in 30 minutes, ticket follow-up required.

## Routing

1. Backend Pager rotation: `backend-primary`, `backend-secondary`.
2. Product escalation: `#incident-command`.
3. Leadership escalation window: Sev1 unresolved for 30 minutes.
