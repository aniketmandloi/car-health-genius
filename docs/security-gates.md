# Security Gates (Sprint 8)

Date: February 28, 2026

## CI Security Controls

1. Dependency review (`actions/dependency-review-action`) on PRs when `DEPENDENCY_REVIEW_ENABLED=true`.
2. CodeQL static analysis (`github/codeql-action`) on PR, main, and weekly schedule.
3. Dependency audit (`pnpm audit --prod --audit-level=critical`) in security workflow.

## Repository Prerequisite

1. If dependency graph is not enabled for the repo, keep `DEPENDENCY_REVIEW_ENABLED` unset/`false` to avoid CI failure.
2. After enabling dependency graph in repository security settings, set `DEPENDENCY_REVIEW_ENABLED=true` to enforce dependency review checks.

## Blocking Policy

1. Any critical dependency vulnerability in runtime scope blocks merge/release.
2. Any unresolved critical CodeQL finding blocks release gate C.
3. Waivers require:
   - issue reference,
   - owner,
   - explicit expiry date,
   - compensating control note.

## Triage SLA

1. Critical: 24 hours.
2. High: 3 business days.
3. Medium: next sprint planning.
4. Low: backlog.

## Evidence Required for Gate C

1. Latest successful `Security` workflow run URL.
2. Artifact/export of dependency audit output.
3. CodeQL results snapshot.
4. Active waiver list (must be empty for critical severity).
