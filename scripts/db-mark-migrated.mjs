/**
 * One-time script: marks migration 0007_modern_nebula as applied in drizzle.__drizzle_migrations.
 * Run this when the tables already exist in the DB but the migration journal doesn't know about them.
 *
 * Usage: node scripts/db-mark-migrated.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const requireFromDb = createRequire(new URL("../packages/db/package.json", import.meta.url));
const { neon } = requireFromDb("@neondatabase/serverless");

dotenv.config({ path: "apps/server/.env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is missing in apps/server/.env");
  process.exit(1);
}

const sql = neon(databaseUrl);

const migrationsToMark = [
  {
    tag: "0007_modern_nebula",
    sqlFile: new URL("../packages/db/src/migrations/0007_modern_nebula.sql", import.meta.url),
    folderMillis: 1772279884149,
  },
];

async function run() {
  // Check current state
  const existing = await sql`
    SELECT id, hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at DESC
    LIMIT 5
  `;
  console.log("Current top 5 migration records:");
  console.table(existing);

  const lastCreatedAt = existing[0]?.created_at ?? 0;
  console.log(`\nLast recorded migration created_at: ${lastCreatedAt}`);

  for (const migration of migrationsToMark) {
    if (Number(lastCreatedAt) >= migration.folderMillis) {
      console.log(`\n✅ ${migration.tag} already marked (created_at=${migration.folderMillis} already covered)`);
      continue;
    }

    const content = readFileSync(fileURLToPath(migration.sqlFile), "utf8");
    const hash = createHash("sha256").update(content).digest("hex");

    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${hash}, ${migration.folderMillis})
    `;
    console.log(`\n✅ Marked ${migration.tag} as applied`);
    console.log(`   hash:       ${hash}`);
    console.log(`   created_at: ${migration.folderMillis}`);
  }

  const updated = await sql`
    SELECT id, hash, created_at
    FROM drizzle.__drizzle_migrations
    ORDER BY created_at DESC
    LIMIT 1
  `;
  console.log("\nNew last migration record:");
  console.table(updated);
  console.log("\nDone. Now run: pnpm run db:migrate");
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
