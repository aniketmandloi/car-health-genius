# Release-Day Plan

Date: TBD

## Timeline

1. T-60m: final gate review and approval confirmation.
2. T-30m: deploy preparation and comms draft.
3. T-0: release execution window opens.
4. T+15m: first health check and alert sweep.
5. T+60m: stabilization check and decision to close window.

## Roles

1. Release commander.
2. Backend operator.
3. Web/native operator.
4. Support liaison.

## Rollback Triggers

1. Sev1 issue affecting core scan/recommendation flow.
2. Billing entitlement failures above agreed threshold.
3. Security regression identified during release window.

## Rollback Steps

1. Revert deployment.
2. Validate service health and customer impact.
3. Publish status update and incident timeline.
