# Action Plan: BL-005: Persist the project library

## Feature
- **ID:** 13
- **Research Brief:** `project/work-items/13-bl-005-persist-the-project-library/research/00-research.md`

## ADRs Created
- None. `ADR-260808-typescript-monorepo` already accepts local SQLite with Drizzle ORM; BL-005 does not select a new persistence technology.

## Core-Components Created
- [`CORE-COMPONENT-260810-sqlite-persistence-lifecycle`](../../../architecture/core-components/CORE-COMPONENT-260810-sqlite-persistence-lifecycle.md) — establishes explicit close ownership, committed ordered migrations, and isolated database-test lifecycle. A shared component is warranted because the same lifecycle crosses the migration CLI, repository, in-process service, future metadata stores, and test harness; the project field contract remains issue-local.

## Acceptance Criteria

- **AC-1:** A paved repository command accepts an explicit database path, creates the database when no file exists, applies every migration committed in the repository, reports the finite ordered set of applied migration IDs and the current migration ID, and on rerun reports zero newly applied migrations while retaining the same current migration ID.
- **AC-2:** Inspection limited to the project table proves it has exactly these persisted project columns and no others: stable project ID, display name, canonical path, and created-at timestamp. The persistence contract creates and lists exactly those fields and returns their values unchanged after all database handles close and reopen.
- **AC-3:** A bounded restart test creates exactly two project records, closes all database, persistence, and in-process application-service resources, constructs fresh instances against the same explicit database path, and proves exactly those two records reappear once each through the same in-process boundary. No HTTP route, network server, or UI is required.
- **AC-4:** Canonical path has a database-enforced unique constraint. A sequential duplicate-create case and a fresh case of eight concurrent same-path create attempts each leave exactly one durable row for that path. Every persistence operation deterministically returns either the created record or that same existing record with an explicit duplicate/existing disposition; no generic database error escapes and no partial row is retained. This disposition is a persistence outcome only and does not define BL-007 HTTP behavior.
- **AC-5:** A finite repository-defined set of synthetic sentinels representing source text, terminal output, ports, PIDs, handles, environment data, credentials, and secrets is used for bounded schema, row, and database-byte inspection. The project table contains only the four allowed columns and their values, and those sentinels are absent from database bytes; when one sentinel is deliberately supplied as an allowed display-name or canonical-path value, row inspection proves it appears only in that allowed column. This is a check of the fixed sentinel set, not an exhaustive claim about all possible data.
- **AC-6:** Empty stable ID, empty or whitespace-only display name, empty canonical path, and invalid or non-finite created-at input are rejected before write with typed deterministic validation outcomes defined by the persistence contract. Each case leaves the row count and the serialized values of all four fields in existing rows byte-for-byte unchanged. Filesystem existence and canonicalization policy are explicitly deferred to BL-006 and are not validated here.
- **AC-7:** Migration validation covers exactly these starting states: no database, a current database rerun, and one committed repository fixture representing the immediately previous committed migration ID and containing two valid project records. Upgrade from the fixture applies only pending migrations, preserves the serialized values of all four allowed fields in both records byte-for-byte, and reaches the current migration ID.
- **AC-8:** Every BL-005 persistence, migration, and restart test creates and records a unique database path under the repository-defined disposable directory, closes all handles, removes only that database and its SQLite sidecars, and proves cleanup. The test boundary refuses to run when pointed at the developer/default database location documented by this issue.
- **AC-9:** Documentation records the default database location, explicit override, paved migration/init command, migration IDs and output, exact four-column schema, duplicate/existing persistence disposition, restart proof, prior-version fixture, test isolation and refusal behavior, and cleanup.
- **AC-10:** The configured full repository validation passes.

## Acceptance Coverage

| AC ID | Implementation Tasks | Tests or Validation | Expected Evidence |
|---|---|---|---|
| AC-1 | T-1, T-6 | V-1 | Tracked migration journal and SQL; captured first and second `just db-migrate` JSON results showing ordered IDs, then `[]`, with the same current ID |
| AC-2 | T-1, T-3, T-4 | V-3 | `PRAGMA table_info(projects)` result with only `id`, `name`, `canonical_path`, `created_at`; raw before/after rows and typed service results |
| AC-3 | T-3, T-5 | V-6 | Bounded Vitest result showing two creates, complete close, fresh construction, and exactly two one-time records through `ProjectLibrary` |
| AC-4 | T-3, T-4 | V-4 | Unique-index inspection; sequential and eight-way result dispositions; one-row raw query; no rejected generic error or partial row |
| AC-5 | T-4 | V-3 | Fixed sentinel catalog, schema/row scans, closed database-byte scans, and allowed-column-only assertions |
| AC-6 | T-3, T-4 | V-5 | Typed validation-code table plus identical pre/post row count and serialized raw-row buffers for each invalid input |
| AC-7 | T-1, T-2, T-6 | V-1, V-2 | Committed `0000_project_library` fixture with two rows; migration output applying only `0001_project_canonical_path_unique`; byte-identical raw values and current ID |
| AC-8 | T-2, T-4, T-5, T-6 | V-1 through V-7 | Per-test recorded paths under `test-results/bl-005/databases`, default-path refusal result, closed resources, exact database/sidecar deletion, and absence checks |
| AC-9 | T-7 | V-8 | Documentation contract test and review of `docs/README.md`, `apps/api/README.md`, and `.harness/engineering-harness.md` |
| AC-10 | T-8 | V-9 | Successful `just verify` transcript, coverage summary, build, Playwright, and retained BL-004 audit result |

Coverage is complete: every AC ID maps to implementation work, at least one validation entry, and concrete expected evidence.

## Implementation Tasks

1. **T-1 — Establish closeable SQLite resources and committed migrations (AC-1, AC-2, AC-7).** Replace import-time global database construction with an explicit filesystem-path factory, define `apps/api/ascend.db` as the resolved developer default, retain `ASCEND_DATABASE_URL` as the documented application override, commit Drizzle migrations `0000_project_library` and `0001_project_canonical_path_unique`, and add the JSON-producing `just db-migrate <database-path>` path. The final physical `projects` columns are exactly `id`, `name`, `canonical_path`, and `created_at`; the timestamp is a finite safe integer in Unix epoch milliseconds so SQLite serialization round-trips unchanged.
2. **T-2 — Build isolated database test lifecycle and prior fixture (AC-7, AC-8).** Add a BL-005 helper that allocates and records unique paths under `test-results/bl-005/databases`, rejects the normalized default path, owns all close callbacks, deletes only the selected file plus `-wal`, `-shm`, and `-journal`, and proves absence. Commit a copyable `.sqlite` fixture at migration `0000_project_library` with exactly two valid projects and expected raw values.
3. **T-3 — Implement the project repository and in-process service (AC-2, AC-3, AC-4, AC-6).** Expose `ProjectLibrary` through construction with create, list, and idempotent close. Use an issue-local `Project` contract with only `id`, `name`, `canonicalPath`, and integer `createdAt`; return `created`, `existing`, or typed validation outcomes. Use database conflict handling on canonical path and select the winning row, wrap unexpected driver failures in a typed persistence error, and perform no filesystem checks or path transformations.
4. **T-4 — Prove schema, data minimization, duplicates, and validation (AC-2, AC-4, AC-5, AC-6, AC-8).** Add isolated integration tests for raw schema/index inspection, close/reopen equality, fixed sentinel scans, sequential duplicates, eight concurrent attempts against a fresh database, and pre-write validation with byte-identical raw-row snapshots.
5. **T-5 — Add the bounded complete-restart proof (AC-3, AC-8).** Create exactly two records through one `ProjectLibrary`, close service/repository/client resources, create an entirely fresh library at the recorded path, list exactly those records once each, close again, and prove targeted cleanup. Do not register Fastify routes or change web code.
6. **T-6 — Validate fresh, current, and prior migration states (AC-1, AC-7, AC-8).** Exercise the paved explicit-path command on no database and rerun it, then copy and upgrade the committed previous-version fixture. Assert exact ordered IDs and raw four-field preservation before cleanup.
7. **T-7 — Document database operation and close the harness gap (AC-9).** Update API and application docs plus harness governance with the default and override, command syntax and exact JSON shape, both migration IDs, schema, persistence outcomes, restart proof, fixture, disposable location, refusal, sidecars, and cleanup. Keep BL-006 path policy and BL-007 API/UI behavior explicitly deferred.
8. **T-8 — Run focused and full repository gates (AC-10).** Run focused persistence suites during implementation, then `just verify`; retain command results and coverage in the implementation record.
