import dotenv from "dotenv";
import { createRequire } from "node:module";

const requireFromDb = createRequire(new URL("../packages/db/package.json", import.meta.url));
const { neon } = requireFromDb("@neondatabase/serverless");

dotenv.config({
  path: "apps/server/.env",
});

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is missing in apps/server/.env");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function run() {
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;

  await sql`
    UPDATE drizzle.__drizzle_migrations
    SET created_at = created_at * 1000
    WHERE created_at < 1000000000000
  `;

  const [{ hasBillingTable = false, hasSprint6Schema = false } = {}] = await sql`
    SELECT
      to_regclass('public.billing_webhook_event') IS NOT NULL AS "hasBillingTable",
      (
        to_regclass('public.diy_guide') IS NOT NULL
        OR EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'partner'
            AND column_name = 'vetting_status'
        )
      ) AS "hasSprint6Schema"
  `;

  let target = null;
  if (hasSprint6Schema) {
    target = {
      createdAt: 1772272731321,
      hash: "baseline_0006_wide_magneto",
    };
  } else if (hasBillingTable) {
    target = {
      createdAt: 1772190000000,
      hash: "baseline_0005_reflective_colleen_wing",
    };
  }

  if (target) {
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      SELECT ${target.hash}, ${target.createdAt}
      WHERE NOT EXISTS (
        SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at >= ${target.createdAt}
      )
    `;
  }

  const rows = await sql`
    SELECT id, hash, created_at, to_timestamp(created_at / 1000.0) AS created_at_ts
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at
  `;
  console.table(rows);
}

run().catch((error) => {
  const source = (error && typeof error === "object" ? (error.sourceError ?? error.cause) : undefined);
  const dnsCause =
    source && typeof source === "object" && "cause" in source && source.cause && typeof source.cause === "object"
      ? source.cause
      : source;
  const dnsCode = dnsCause && typeof dnsCause === "object" && "code" in dnsCause ? dnsCause.code : undefined;
  const dnsHost = dnsCause && typeof dnsCause === "object" && "hostname" in dnsCause ? dnsCause.hostname : undefined;

  if (dnsCode === "ENOTFOUND") {
    console.error(
      `DNS lookup failed for database host${typeof dnsHost === "string" ? ` (${dnsHost})` : ""}. ` +
        "Check DATABASE_URL in apps/server/.env and verify your network/DNS can resolve that host.",
    );
  }
  console.error("Failed to baseline drizzle migrations:", error);
  process.exit(1);
});
