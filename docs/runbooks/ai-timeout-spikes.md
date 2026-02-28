# Runbook: AI Timeout Spikes

## Trigger

1. `alert.recommendation_ai_failure_spike` or `alert.recommendation_latency_p95_breach` fired.

## Signals

1. `ai_explanation_failures_total` rising.
2. `ai_explanation_latency_ms` p95 crossing threshold.
3. Increase in fallback/policy block indicators.

## Dashboard Panels

1. `Launch > Recommendation Reliability > ai_explanation_failures_total`.
2. `Launch > Recommendation Reliability > ai_explanation_latency_ms p95`.
3. `Launch > Likely Causes Reliability > likely_causes.generated latency`.

## Triage Steps

1. Confirm whether issue is model/provider latency or internal CPU/DB bottleneck.
2. Check downstream service health and outbound dependency latency.
3. Compare latency by `mode` (basic/pro) and DTC density.
4. Validate fallback path still returns safe recommendation payloads.

## Mitigation

1. Reduce concurrency or tighten timeout to protect API saturation.
2. Route temporarily to deterministic fallback response mode.
3. Disable advanced AI mode behind feature flag if required.

## Escalation

1. Escalate to Sev2 when p95 > 4s for 10 minutes.
2. Escalate to Sev1 when recommendation generation is unavailable for >10 minutes.
