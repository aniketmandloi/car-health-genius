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
5. AI policy blocked/fallback counts (`ai_policy_blocked_total`, `ai_policy_fallback_total`).
6. Review queue backlog and resolution time (`review_queue_backlog`, `review_queue_resolution_minutes`).
7. Monetization funnel (`paywall_view -> upgrade_start -> upgrade_success -> subscription_churn`).

## Initial Alert Thresholds

1. 5xx rate > 3% over 5 minutes.
2. tRPC error count > 20 in 5 minutes.
3. p95 latency > 1500ms on `/trpc` over 10 minutes.
