import { spawnSync } from "node:child_process";

function runAudit() {
  const result = spawnSync("pnpm", ["audit", "--prod", "--audit-level=critical"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (typeof result.status === "number") {
    process.exit(result.status);
  }

  process.exit(1);
}

runAudit();
