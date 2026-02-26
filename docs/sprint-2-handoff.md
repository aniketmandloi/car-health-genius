# Sprint 2 Handoff (Post Sprint 1)

Date: February 26, 2026

## Completed in Sprint 1

1. Domain schema expansion for E1-S2 and E1-S3 is implemented with migrations.
2. Core schema relations for vehicle/diagnostic/recommendation are implemented.
3. Domain router set for E1-S4 is registered and DB-backed skeleton procedures are live.
4. Migration drift CI gate is added.

## Open Decisions for Sprint 2

1. RBAC model finalization (`E1-S5`):
   - Define role source of truth (`user.role` vs dedicated role table vs external auth claims).
   - Define admin/partner authorization middleware and audit requirements.
2. Billing integration contract:
   - Replace checkout intent stub in `billing.createCheckoutSession` with Polar-backed flow.
   - Decide webhook ownership package and retry policy.
3. Partner routing model:
   - Define partner identity linkage (`partnerId` mapping from authenticated account).
   - Restrict `partnerPortal` leads to the authenticated partner.
4. Booking state machine enforcement:
   - Add transition guards to prevent invalid state jumps.
   - Decide when `resolvedAt` should be immutable.
5. Domain deprecation path:
   - Decide timeline for deprecating/removing `todo` and `kickoff` routers once production flows migrate.

## Risks to Watch in Sprint 2

1. Authorization gaps remain because `admin` and `partnerPortal` are protected but not role-scoped yet.
2. Pricing/checkout routes are scaffolded but do not call external billing provider yet.
3. Migration apply validation requires environment DB connectivity and should be part of staging deploy checks.
