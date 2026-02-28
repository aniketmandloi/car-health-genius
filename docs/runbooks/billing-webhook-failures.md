# Runbook: Billing Webhook Failures

## Trigger

1. `alert.billing_webhook_failures` fired.

## Signals

1. `billing_webhook_failed_total` spike.
2. Lag between provider events and entitlement updates.

## Dashboard Panels

1. `Launch > Billing and Entitlement Health > billing_webhook_failed_total`.
2. `Launch > Billing and Entitlement Health > entitlement_denied_total by key`.

## Triage Steps

1. Check auth/webhook endpoint status and error distribution.
2. Validate webhook signature verification behavior.
3. Confirm DB writes to `billing_webhook_event` and subscription projection.
4. Check duplicate event handling and retry behavior.

## Mitigation

1. Replay failed provider events where safe.
2. Temporarily switch to manual entitlement override for premium users if needed.
3. Patch parsing/signature mismatch and redeploy.

## Escalation

1. Escalate to Sev1 if subscription activation is delayed >30 minutes for new purchases.
2. Involve finance/support when customer impact is confirmed.
