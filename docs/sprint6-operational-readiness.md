# Sprint 6 Operational Readiness

Date: February 28, 2026

## Dashboard Widgets

1. `likely_causes_requests_total` and p95 latency from `likely_causes.generated` duration.
2. `estimate_generated_total` and estimate generation error rate.
3. Booking funnel counts by status transition:
   - `requested -> accepted|alternate|rejected`
   - `accepted|alternate -> confirmed`
4. Feedback volume from `recommendation_feedback_submitted` and `recommendation_feedback_updated`.

## Alert Suggestions

1. `booking_invalid_transition_total` spike over baseline in 15-minute window.
2. Estimate generation failure rate > 5% over 10 minutes.
3. Likely-causes p95 latency > 2 seconds over 15 minutes.
4. Feedback mutation failure-rate > 3% over 15 minutes.

## Incident Runbook

1. Booking transition incident:
   - Query recent `booking.transition.invalid` logs and group by `businessCode`.
   - Validate client payload against allowed transition matrix.
   - Confirm partner assignment exists before `accepted|alternate|confirmed`.
2. Partner data quality incident:
   - Check `partner.status`, `vetting_status`, `accepts_leads`, `data_freshness_at`.
   - Set `accepts_leads=false` for affected partner rows.
3. Pro entitlement incident:
   - Verify user entitlement rows for `pro.likely_causes`, `pro.diy_guides`, `pro.cost_estimates`, `pro.negotiation_script`.
   - Confirm billing webhook ingestion health in `billing_webhook_event`.
