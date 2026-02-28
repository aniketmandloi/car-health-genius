import dotenv from "dotenv";
import { createRequire } from "node:module";

const requireFromDb = createRequire(new URL("../packages/db/package.json", import.meta.url));
const { neon } = requireFromDb("@neondatabase/serverless");

dotenv.config({
  path: "apps/server/.env",
});

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required in apps/server/.env");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const query = `
INSERT INTO "partner" (
  "display_name",
  "slug",
  "status",
  "vetting_status",
  "launch_metro",
  "state",
  "phone",
  "website",
  "availability",
  "accepts_leads",
  "service_area",
  "pricing_policy_flags",
  "data_freshness_at",
  "metadata"
)
VALUES
  (
    'Bay Auto Care',
    'bay-auto-care',
    'active',
    'approved',
    'us-ca-bay-area',
    'CA',
    '+1-415-555-0120',
    'https://example.com/bay-auto-care',
    'same_day',
    true,
    '{"type":"radius","center":{"lat":37.7749,"lng":-122.4194},"radiusMiles":18}'::jsonb,
    '{"written_estimates":true,"flat_diagnostic_fee":true,"oem_parts_available":true}'::jsonb,
    now(),
    '{"source":"seed_script","seedVersion":"sprint6-v1"}'::jsonb
  ),
  (
    'Mission Street Garage',
    'mission-street-garage',
    'active',
    'approved',
    'us-ca-bay-area',
    'CA',
    '+1-510-555-0188',
    'https://example.com/mission-street-garage',
    'next_day',
    true,
    '{"type":"postal_set","postalCodes":["94103","94107","94110","94607","94612"]}'::jsonb,
    '{"written_estimates":true,"flat_diagnostic_fee":false,"oem_parts_available":false}'::jsonb,
    now(),
    '{"source":"seed_script","seedVersion":"sprint6-v1"}'::jsonb
  ),
  (
    'East Bay Hybrid Service',
    'east-bay-hybrid-service',
    'active',
    'approved',
    'us-ca-bay-area',
    'CA',
    '+1-510-555-0166',
    'https://example.com/east-bay-hybrid-service',
    'same_week',
    true,
    '{"type":"radius","center":{"lat":37.8044,"lng":-122.2711},"radiusMiles":25}'::jsonb,
    '{"written_estimates":true,"flat_diagnostic_fee":true,"oem_parts_available":true}'::jsonb,
    now(),
    '{"source":"seed_script","seedVersion":"sprint6-v1"}'::jsonb
  )
ON CONFLICT ("slug") DO UPDATE SET
  "display_name" = EXCLUDED."display_name",
  "status" = EXCLUDED."status",
  "vetting_status" = EXCLUDED."vetting_status",
  "launch_metro" = EXCLUDED."launch_metro",
  "state" = EXCLUDED."state",
  "phone" = EXCLUDED."phone",
  "website" = EXCLUDED."website",
  "availability" = EXCLUDED."availability",
  "accepts_leads" = EXCLUDED."accepts_leads",
  "service_area" = EXCLUDED."service_area",
  "pricing_policy_flags" = EXCLUDED."pricing_policy_flags",
  "data_freshness_at" = EXCLUDED."data_freshness_at",
  "metadata" = EXCLUDED."metadata",
  "updated_at" = now();
`;

function printDnsHintIfNeeded(error) {
  const source = error && typeof error === "object" ? (error.sourceError ?? error.cause) : undefined;
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
}

try {
  await sql.query(query);
  console.log("Sprint 6 partner seed completed.");
} catch (error) {
  printDnsHintIfNeeded(error);
  console.error("Failed to seed Sprint 6 partners:", error);
  process.exit(1);
}
