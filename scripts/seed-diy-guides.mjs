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

const deleteQuery = `
DELETE FROM "diy_guide" WHERE "dtc_code" IN ('P0171', 'P0300', 'U0100');
`;

const insertQuery = `
INSERT INTO "diy_guide" (
  "dtc_code",
  "title",
  "estimated_minutes",
  "difficulty",
  "tools",
  "parts",
  "safety_warnings",
  "steps",
  "review_status",
  "is_active"
)
VALUES
  (
    'P0171',
    'Inspect intake leaks and MAF contamination',
    60,
    'intermediate',
    '["OBD-II scanner","Socket set","MAF cleaner","Nitrile gloves"]'::jsonb,
    '["Intake hose clamp","Replacement vacuum line (if cracked)"]'::jsonb,
    '["Allow engine to cool before touching intake components.","Wear eye protection while using cleaner."]'::jsonb,
    '["Read freeze-frame values and confirm lean condition.","Inspect intake boot and vacuum lines for cracks.","Clean MAF sensor per manufacturer guidance.","Clear code and run a short drive cycle."]'::jsonb,
    'approved',
    true
  ),
  (
    'P0300',
    'Basic misfire triage for ignition and fuel checks',
    75,
    'intermediate',
    '["OBD-II scanner","Spark plug socket","Torque wrench","Insulated pliers"]'::jsonb,
    '["Spark plug set (if required)","Ignition coil (if failed)"]'::jsonb,
    '["Do not touch ignition components with engine running.","Disable ignition before coil removal."]'::jsonb,
    '["Scan and note misfire counters by cylinder.","Inspect spark plugs for fouling or gap issues.","Swap suspect ignition coil to compare misfire movement.","Re-check codes and confirm stable idle."]'::jsonb,
    'approved',
    true
  ),
  (
    'U0100',
    'Verify power/ground before network module replacement',
    45,
    'advanced',
    '["Multimeter","Fuse puller","Wiring diagram","Battery terminal brush"]'::jsonb,
    '["Replacement fuse (if blown)","Ground strap (if corroded)"]'::jsonb,
    '["Disconnect battery negative terminal before wiring work.","Avoid probing sealed connectors aggressively."]'::jsonb,
    '["Check battery voltage and charging baseline.","Inspect ECM/PCM related fuses and grounds.","Confirm CAN wiring continuity at accessible points.","If communication remains lost, escalate to professional diagnosis."]'::jsonb,
    'approved',
    true
  );
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
  await sql.query(deleteQuery);
  await sql.query(insertQuery);
  console.log("DIY guide seed completed.");
} catch (error) {
  printDnsHintIfNeeded(error);
  console.error("Failed to seed DIY guides:", error);
  process.exit(1);
}
