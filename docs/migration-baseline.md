# Migration Baseline Repair (Drizzle + Postgres)

Use this when `pnpm run db:migrate` tries to replay old migrations against
already-existing tables (for example: `relation "billing_webhook_event" already exists`).

## Why this happens

If schema was created with `db:push`, tables may exist while
`drizzle.__drizzle_migrations` is empty/missing.

## One-time repair

Preferred command:

```bash
pnpm run db:baseline
```

This command creates/repairs `drizzle.__drizzle_migrations` and inserts a safe
baseline marker based on existing schema state.

Manual SQL alternative:

1. Ensure Drizzle migration ledger exists:

```sql
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id serial PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
```

2. If your DB already contains Sprint 5 schema but not Sprint 6 schema, insert
baseline marker at migration `0005`:

```sql
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT 'baseline_0005_reflective_colleen_wing', 1772190000000
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at >= 1772190000000
);
```

3. Run migrations again:

```bash
pnpm run db:migrate
```

## If Sprint 6 schema already exists too

Use `1772272731321` (migration `0006_wide_magneto`) for the baseline marker
instead of `1772190000000`.
