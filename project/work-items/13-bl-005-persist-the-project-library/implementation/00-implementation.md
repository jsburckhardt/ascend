# Implementation: BL-005 Persist the project library

## Scope

Implemented Issue #13 on `feat/13-persist-project-library` within the Plan boundaries. The change adds local SQLite and Drizzle project persistence, explicit-path migration, typed in-process outcomes, isolated migration and restart proofs, documentation, and executable architecture enforcement. BL-006 filesystem policy and BL-007 HTTP/API/UI behavior remain excluded.

## Completed Tasks

- T-1: Added the closeable explicit-path database factory, resolved application default and override, two committed migrations, migration catalog and runner, CLI, and root `db-migrate` recipe.
- T-2: Added the repository-root disposable database lifecycle, default-path refusal, exact sidecar cleanup, deterministic `0000_project_library` fixture, expected values, and fixture hash.
- T-3: Added the four-field project contract, typed validation and persistence failures, database conflict handling, repository, and closeable `ProjectLibrary`.
- T-4: Added exact schema and index inspection, bounded sentinel scans, close/reopen checks, sequential and eight-way duplicate proofs, and byte-identical no-mutation validation.
- T-5: Added the bounded two-record, two-generation complete in-process restart proof.
- T-6: Added exact absent, current-rerun, and immediately-prior migration-state validation through the production runner and paved command.
- T-7: Updated application, API, harness, and architecture documentation and added documentation and core-component contract tests.
- T-8: Ran focused suites and the complete repository gate without reducing thresholds or skipping existing checks.

All T-1 through T-8 statuses are marked Complete in `plan/02-task-breakdown.md`.

## Acceptance Evidence

### AC-1

- `justfile` exposes `db-migrate database_path`; `apps/api/src/cli/db-migrate.ts` requires exactly one filesystem path, creates its parent, prints one JSON result, and closes in `finally`.
- `apps/api/drizzle/meta/_journal.json` orders `0000_project_library` then `0001_project_canonical_path_unique`.
- `project-migrations-integration.test.ts` passed the absent and current rerun command cases. The explicit disposable evidence run returned:

```json
{"appliedMigrationIds":["0000_project_library","0001_project_canonical_path_unique"],"currentMigrationId":"0001_project_canonical_path_unique"}
{"appliedMigrationIds":[],"currentMigrationId":"0001_project_canonical_path_unique"}
```

### AC-2

- `project-schema-minimization.test.ts` passed `PRAGMA table_info(projects)` with exactly `id`, `name`, `canonical_path`, and `created_at`, and inspected the unique index.
- The same suite and `project-library-contract.test.ts` proved only `id`, `name`, `canonicalPath`, and `createdAt` cross the service boundary and remain unchanged after all handles close and reopen.

### AC-3

- `project-library-restart.test.ts` passed in 180 ms during the final covered run. It created exactly two records, closed generation one twice safely, constructed generation two at the same explicit path, returned each original record once, closed generation two, and proved targeted cleanup.
- No route, Fastify app, network listener, or web file changed.

### AC-4

- Migration `0001_project_canonical_path_unique.sql` adds database-enforced canonical-path uniqueness.
- `project-duplicates.test.ts` passed sequential duplicate disposition and a fresh `Promise.all` of exactly eight same-path calls. Results were one `created`, seven `existing`, one complete raw row, equal winner values, no rejected operation, and one row after reopen.
- Unexpected adapter failures are converted to `ProjectPersistenceError` without exposing the raw cause.

### AC-5

- `project-schema-minimization.test.ts` defines finite source-text, terminal-output, port, PID, handle, environment, credential, and secret sentinels.
- The test passed project-schema, raw-row, and closed main-database byte absence checks. Separate allowed-value databases proved deliberate sentinels occurred only in `name` or `canonical_path`.

### AC-6

- `project-persistence-unit.test.ts` proved validation occurs before adapter access.
- `project-validation-integration.test.ts` passed empty ID, empty and whitespace name, empty canonical path, non-integer, NaN, positive infinity, and negative infinity cases with deterministic codes. Before and after row counts and serialized four-field buffers were byte-identical for every case.
- Source inspection proves the persistence contract imports no filesystem module and performs no realpath, existence, or canonicalization operation.

### AC-7

- `project-migrations-integration.test.ts` covers exactly absent database, current rerun, and a copy of the immediately previous fixture. Results were both IDs, no IDs, and only `0001_project_canonical_path_unique`, respectively; all reached current `0001_project_canonical_path_unique`.
- `apps/api/test/fixtures/db/0000_project_library.sqlite` contains exactly two four-field records at migration `0000_project_library`. Its SHA-256 is `e6d428d655f517d487ff5ac470951809c7f7e9e4485f0757b05cb1b8a02abcda`. Fixture upgrade preserved the ordered raw-row buffer byte-for-byte and left the tracked fixture hash unchanged.

### AC-8

- `project-database-test-helper.ts` anchors unique UUID paths below `<repository>/test-results/bl-005/databases`, records each normalized path, refuses `<repository>/apps/api/ascend.db`, owns close callbacks, and removes only the selected database plus `-wal`, `-shm`, and `-journal`.
- `project-database-test-helper.test.ts` passed uniqueness, containment, refusal-before-mutation, close-before-delete, idempotence, exact allowlist deletion, and unrelated sibling preservation.
- Final inspection found no disposable SQLite database or sidecar below the BL-005 root.

### AC-9

- `docs/README.md` and `apps/api/README.md` document the default, override, explicit command, JSON, IDs, four fields, timestamp representation, outcomes, typed validation, restart proof, fixture, refusal, sidecars, cleanup, no reset, and BL-006/BL-007 exclusions.
- `.harness/engineering-harness.md` now lists migration and persistence consequence signals and evidence while retaining reset as unsupported.
- `project-persistence-documentation.test.ts` and `project-persistence-architecture.test.ts` passed against executable constants and adopted architecture.

### AC-10

- Final `just verify` exited zero. The latest final run reported API coverage of 88.53% statements, 80.58% branches, 86.39% functions, and 89.44% lines; web coverage remained 100% in all dimensions.
- Final package tests passed 180 API tests and one web test. Build passed, Playwright passed three tests with the designated comparison intentionally skipped, and the retained BL-004 audit returned `passed:true`.

## Focused Validation

| Task | Command | Result |
|---|---|---|
| T-1 | `just verify-focused apps/api/test/project-migration-unit.test.ts` | 4 passed |
| T-2 | `just verify-focused apps/api/test/project-database-test-helper.test.ts apps/api/test/project-fixture.test.ts` | 5 passed |
| T-3 | `just verify-focused apps/api/test/project-persistence-unit.test.ts apps/api/test/project-library-contract.test.ts` | 12 passed |
| T-4 | `just verify-focused apps/api/test/project-schema-minimization.test.ts apps/api/test/project-duplicates.test.ts apps/api/test/project-validation-integration.test.ts` | 6 passed |
| T-5 | `just verify-focused apps/api/test/project-library-restart.test.ts` | 1 passed |
| T-6 | `just verify-focused apps/api/test/project-migrations-integration.test.ts apps/api/test/project-fixture.test.ts` | 3 passed |
| T-7 | `just verify-focused apps/api/test/project-persistence-documentation.test.ts apps/api/test/project-persistence-architecture.test.ts` | 2 passed |
| T-8 | `just verify-focused` | 38 files and 181 tests passed |
| T-8 correction | `just verify-focused apps/api/test/project-migrations-integration.test.ts` | 2 passed |

Focused and full validation failures were corrected before task completion. Corrections covered relative file URL handling, formatter normalization, repository-root path independence between focused and recursive package runs, and a quote-style-independent documentation assertion.

## Full Validation

- Command: `just verify`
- Final result: exit 0
- Tool versions: Node.js 22.23.2, pnpm 10.34.5, just 1.42.4
- Gates passed: formatting, lint, strict type checking, covered package tests, builds, Playwright, and retained BL-004 capacity audit
- Configured coverage thresholds remained 80% for statements, branches, functions, and lines.

## Documentation Evidence

- README and configuration: `docs/README.md` and `apps/api/README.md` now describe application default and override behavior.
- Usage and operations: both READMEs document `just db-migrate <database-path>`, exact JSON, migration order, non-reset behavior, fixture upgrade, and cleanup.
- API documentation: `apps/api/README.md` documents the in-process TypeScript persistence contract; no HTTP API or OpenAPI contract changed because BL-007 remains excluded.
- Migration notes: the same READMEs describe fresh, rerun, and immediately-prior upgrade behavior. There is no breaking, data-loss, or reset operation.
- Architecture: `CORE-COMPONENT-260810-sqlite-persistence-lifecycle.md` and `DECISION-LOG.md` record and enforce explicit close ownership, ordered migrations, and default-path-refusing tests. No ADR change was required because the accepted TypeScript monorepo ADR already selected SQLite and Drizzle.
- Harness operations: `.harness/engineering-harness.md` records the new signal, evidence, consequence checks, and remaining reset gap.
- Deployment: no deployment procedure changed; persistence is local and no server route or runtime startup behavior was added.

## Handoff Boundary

The implementation and evidence are prepared for independent Verify evaluation. No GitHub checkbox, issue, push, pull request, or final acceptance action was performed.
