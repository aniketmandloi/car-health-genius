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
INSERT INTO "dtc_knowledge" (
  "dtc_code",
  "category",
  "default_severity_class",
  "driveability",
  "summary_template",
  "rationale_template",
  "safety_critical",
  "diy_allowed",
  "source",
  "source_version"
)
VALUES
  ('P0117', 'powertrain', 'service_now', 'do_not_drive', 'Engine coolant temperature sensor indicates dangerously low signal.', 'Cooling system sensor anomalies can indicate overheating risk or wiring fault and should be inspected immediately.', true, false, 'seed_script', 'v1'),
  ('P0171', 'powertrain', 'service_soon', 'limited', 'Fuel system is running too lean on bank 1.', 'A lean mixture can worsen drivability and emissions; service soon to avoid catalyst stress.', false, false, 'seed_script', 'v1'),
  ('P0300', 'powertrain', 'service_soon', 'limited', 'Random or multiple cylinder misfire detected.', 'Persistent misfires can damage the catalytic converter and reduce safe drivability.', false, false, 'seed_script', 'v1'),
  ('P0420', 'powertrain', 'service_soon', 'drivable', 'Catalyst system efficiency is below threshold.', 'Catalyst efficiency faults are often non-immediate but should be diagnosed before further emissions degradation.', false, false, 'seed_script', 'v1'),
  ('U0100', 'network', 'service_now', 'limited', 'Lost communication with ECM/PCM control module.', 'Control-module communication loss can impact core powertrain behavior and should be treated as urgent.', true, false, 'seed_script', 'v1')
ON CONFLICT ("dtc_code") DO UPDATE SET
  "category" = EXCLUDED."category",
  "default_severity_class" = EXCLUDED."default_severity_class",
  "driveability" = EXCLUDED."driveability",
  "summary_template" = EXCLUDED."summary_template",
  "rationale_template" = EXCLUDED."rationale_template",
  "safety_critical" = EXCLUDED."safety_critical",
  "diy_allowed" = EXCLUDED."diy_allowed",
  "source" = EXCLUDED."source",
  "source_version" = EXCLUDED."source_version";
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
  console.log("DTC knowledge seed completed.");
} catch (error) {
  printDnsHintIfNeeded(error);
  console.error("Failed to seed DTC knowledge:", error);
  process.exit(1);
}
