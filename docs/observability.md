# Observability Baseline

## Structured Log Schema

Every server log event should include:

- `event`
- `requestId`
- `correlationId`
- `method` (HTTP)
- `url` (HTTP)
- `path` (tRPC)
- `type` (tRPC)
- `durationMs`
- `statusCode` (HTTP response logs)

## Redaction Rules

The server logger redacts/removes sensitive fields:

- `authorization` headers
- `cookie` headers
- common auth/payment payload keys (`password`, `token`, `accessToken`, `refreshToken`)

## Dashboard Starting Points

1. HTTP request volume by route.
2. HTTP p95 latency by route.
3. tRPC error rate by procedure (`event=trpc.request.error`).
4. 5xx rate over time.
5. AI explanation metrics:
   - `ai_explanation_requests_total`
   - `ai_explanation_failures_total`
   - `ai_explanation_latency_ms`
6. Billing webhook metrics:
   - `billing_webhook_received_total`
   - `billing_webhook_duplicate_total`
   - `billing_webhook_processed_total`
   - `billing_webhook_failed_total`
   - `billing_webhook_processing_latency_ms`
7. Entitlement metrics:
   - `entitlement_resolve_latency_ms`
   - `entitlement_resolve_cache_hit_total`
   - `entitlement_denied_total`

## Initial Alert Thresholds

1. 5xx rate > 3% over 5 minutes.
2. tRPC error count > 20 in 5 minutes.
3. p95 latency > 1500ms on `/trpc` over 10 minutes.
4. `billing_webhook_failed_total` > 5 in 5 minutes.
5. `ai_explanation_failures_total` > 10 in 5 minutes.
