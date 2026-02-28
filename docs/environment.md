# Environment Setup

## Variable Classification

| Variable | Class | Notes |
|---|---|---|
| `DATABASE_URL` | secret | DB credential, server-only |
| `BETTER_AUTH_SECRET` | secret | auth signing secret, server-only |
| `POLAR_ACCESS_TOKEN` | secret | payment provider API credential |
| `POLAR_WEBHOOK_SECRET` | secret | webhook signature validation secret |
| `BETTER_AUTH_URL` | internal non-secret | service base URL |
| `POLAR_ENV` | internal non-secret | Polar API environment (`sandbox` or `production`) |
| `POLAR_PRODUCT_ID_PRO_MONTHLY` | internal non-secret | Polar Pro monthly product ID |
| `POLAR_PRODUCT_ID_PRO_ANNUAL` | internal non-secret | Polar Pro annual product ID |
| `POLAR_SUCCESS_URL` | internal non-secret | post-checkout redirect |
| `NHTSA_VPIC_BASE_URL` | internal non-secret | VIN provider base URL |
| `NHTSA_VPIC_TIMEOUT_MS` | internal non-secret | VIN provider timeout in milliseconds |
| `NHTSA_RECALL_BASE_URL` | internal non-secret | Recall provider base URL |
| `NHTSA_RECALL_TIMEOUT_MS` | internal non-secret | Recall provider timeout in milliseconds |
| `NHTSA_RECALL_CACHE_TTL_MINUTES` | internal non-secret | Recall cache freshness window in minutes |
| `NHTSA_RECALL_RATE_LIMIT_PER_MINUTE` | internal non-secret | Server-side recall request guardrail per minute |
| `CORS_ORIGIN` | internal non-secret | allowed web origin |
| `LOG_LEVEL` | internal non-secret | runtime logging verbosity |
| `OTEL_ENABLED` | internal non-secret | toggles OpenTelemetry tracing bootstrap |
| `OTEL_SERVICE_NAME` | internal non-secret | OpenTelemetry service.name resource attribute |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | internal non-secret | OTLP HTTP traces endpoint (optional) |
| `FLAG_*` server vars | internal non-secret | backend feature controls |
| `NEXT_PUBLIC_*` vars | public client-exposed | shipped in web bundle |
| `EXPO_PUBLIC_*` vars | public client-exposed | shipped in native app config |

## Server (`apps/server/.env`)

Required variables:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `POLAR_ACCESS_TOKEN`
- `POLAR_ENV`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_PRODUCT_ID_PRO_MONTHLY`
- `POLAR_PRODUCT_ID_PRO_ANNUAL`
- `POLAR_SUCCESS_URL`
- `NHTSA_VPIC_BASE_URL`
- `NHTSA_VPIC_TIMEOUT_MS`
- `NHTSA_RECALL_BASE_URL`
- `NHTSA_RECALL_TIMEOUT_MS`
- `NHTSA_RECALL_CACHE_TTL_MINUTES`
- `NHTSA_RECALL_RATE_LIMIT_PER_MINUTE`
- `CORS_ORIGIN`
- `LOG_LEVEL`
- `OTEL_ENABLED`
- `OTEL_SERVICE_NAME`
- `OTEL_EXPORTER_OTLP_ENDPOINT` (optional)
- `FLAG_FREE_TIER_ENABLED`
- `FLAG_PRO_PAYWALL_ENABLED`
- `FLAG_AI_EXPLANATIONS_ENABLED`
- `FLAG_LIKELY_CAUSES_ENABLED`
- `FLAG_PARTNER_PORTAL_ENABLED`
- `FLAG_ADMIN_KILL_SWITCH_ENABLED`
- `NODE_ENV`

## Web (`apps/web/.env`)

Required variables:

- `NEXT_PUBLIC_SERVER_URL`
- `NEXT_PUBLIC_FLAG_FREE_TIER_ENABLED`
- `NEXT_PUBLIC_FLAG_PRO_PAYWALL_ENABLED`
- `NEXT_PUBLIC_FLAG_AI_EXPLANATIONS_ENABLED`
- `NEXT_PUBLIC_FLAG_LIKELY_CAUSES_ENABLED`
- `NEXT_PUBLIC_FLAG_PARTNER_PORTAL_ENABLED`
- `NEXT_PUBLIC_FLAG_ADMIN_KILL_SWITCH_ENABLED`

## Native (`apps/native/.env`)

Required variables:

- `EXPO_PUBLIC_SERVER_URL`
- `EXPO_PUBLIC_ADAPTER_MODE`
- `EXPO_PUBLIC_FLAG_FREE_TIER_ENABLED`
- `EXPO_PUBLIC_FLAG_PRO_PAYWALL_ENABLED`
- `EXPO_PUBLIC_FLAG_AI_EXPLANATIONS_ENABLED`
- `EXPO_PUBLIC_FLAG_LIKELY_CAUSES_ENABLED`
- `EXPO_PUBLIC_FLAG_PARTNER_PORTAL_ENABLED`
- `EXPO_PUBLIC_FLAG_ADMIN_KILL_SWITCH_ENABLED`

## Secrets Policy

- Never commit `.env` files.
- Rotate `BETTER_AUTH_SECRET` and `POLAR_ACCESS_TOKEN` on a regular schedule.
- Use separate credentials per environment (`dev`, `staging`, `prod`).
