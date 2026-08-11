# Test Plan: BL-005: Persist the project library

## Test V-1: Fresh and current explicit-path migration command

- **Type:** CLI integration
- **Task:** T-1, T-6
- **Acceptance Criteria:** AC-1, AC-7, AC-8
- **Priority:** Critical

### Setup
Allocate and record one unique database path under `<repository>/test-results/bl-005/databases/<uuid>/ascend.db`; assert it and all sidecars are absent and that it is not the normalized developer default. Load the committed migration catalog.

### Steps
1. Run `just db-migrate <explicit-path>` with no database present and parse the single JSON object.
2. Inspect the migration table and current schema through a closeable resource, then close it.
3. Run the identical paved command again and parse its JSON.
4. Register/close any remaining resources; remove only the database, `-wal`, `-shm`, and `-journal`; assert absence.

### Expected Result
The first call creates the database and reports `appliedMigrationIds` exactly as `["0000_project_library", "0001_project_canonical_path_unique"]` with current `0001_project_canonical_path_unique`. The second reports `[]` and the same current ID. Output is finite, ordered, deterministic, and does not include row contents.

### Expected Evidence
- Two captured JSON objects and exit codes.
- Migration-table/schema assertions and recorded disposable path.
- Closed-handle and final file/sidecar absence assertions.

## Test V-2: Immediately previous migration fixture upgrade

- **Type:** Migration compatibility integration
- **Task:** T-1, T-2, T-6
- **Acceptance Criteria:** AC-7, AC-8
- **Priority:** Critical

### Setup
Verify the integrity hash of tracked `apps/api/test/fixtures/db/0000_project_library.sqlite`. Allocate a unique disposable path, copy the fixture there, and read its migration state plus both raw rows ordered by ID into a byte buffer.

### Steps
1. Assert the copied fixture current ID is `0000_project_library` and contains exactly two valid rows with exactly four values each.
2. Run the production migration runner against the copy.
3. Read migration state and the same raw rows after upgrade.
4. Compare the before/after buffers byte-for-byte and recheck the tracked fixture hash.
5. Close and perform exact cleanup.

### Expected Result
Only `0001_project_canonical_path_unique` is applied; it becomes current. Both rows retain byte-identical `id`, `name`, `canonical_path`, and `created_at` serialized values. The tracked fixture is unchanged and cleanup succeeds.

### Expected Evidence
- Fixture hash and pre/post migration IDs.
- Before/after raw-row buffer hashes and equality assertion.
- Applied-ID JSON and cleanup proof.

## Test V-3: Exact schema, reopen values, and bounded sentinel inspection

- **Type:** Persistence integration and data-minimization audit
- **Task:** T-3, T-4
- **Acceptance Criteria:** AC-2, AC-5, AC-8
- **Priority:** Critical

### Setup
Define the finite fixed catalog with one synthetic sentinel each for source text, terminal output, port, PID, handle, environment data, credential, and secret. Allocate separate isolated databases for forbidden-sentinel absence and deliberate allowed-value placement.

### Steps
1. Migrate the absence database; create normal project rows through `ProjectLibrary`.
2. Assert `PRAGMA table_info(projects)` returns only `id`, `name`, `canonical_path`, `created_at`; inspect only project-table indexes for canonical-path uniqueness.
3. Assert create/list object keys and raw rows contain only the same four semantic fields and unchanged values.
4. Close every handle, read the main database bytes, and assert every forbidden sentinel is absent.
5. Reopen and prove values unchanged.
6. In separate databases, deliberately set one sentinel as display name or canonical path; raw-query all columns and prove it occurs only in the selected allowed column.
7. Close and clean every path.

### Expected Result
The project table and persistence contract expose exactly four fields. Normal databases contain none of the finite forbidden sentinels in schema, rows, or closed database bytes. A deliberately allowed sentinel appears only in its chosen allowed column. Close/reopen returns exact values.

### Expected Evidence
- PRAGMA columns/index snapshot and exact object-key assertions.
- Fixed catalog plus row and byte-scan results.
- Raw allowed-column matrix, reopen equality, recorded paths, and cleanup checks.

## Test V-4: Sequential and eight-way canonical-path duplicates

- **Type:** Persistence concurrency integration
- **Task:** T-3, T-4
- **Acceptance Criteria:** AC-4, AC-8
- **Priority:** Critical

### Setup
Create one isolated database for sequential behavior and a fresh second isolated database for concurrency. Migrate both and construct closeable `ProjectLibrary` instances.

### Steps
1. Submit a valid create, then a different valid input with the same canonical path sequentially.
2. Assert the first result is `created`, the second is `existing`, and both carry the exact first durable record.
3. Against the fresh second database, start exactly eight same-canonical-path creates together with `Promise.all`, using distinct non-path input values.
4. Assert no promise rejects; count dispositions; compare every returned project to the winner.
5. Raw-query rows and indexes, then close/reopen to confirm one complete durable row.
6. Close all resources and clean both paths.

### Expected Result
Each case has exactly one row for the canonical path. The concurrent case returns one `created` and seven `existing`; every result contains the same winner. No generic driver error or partial row escapes, and uniqueness is database-enforced.

### Expected Evidence
- Disposition arrays/counts, winner equality, and zero rejected promises.
- Unique-index and one-row raw query before/after reopen.
- Recorded paths and exact cleanup proof.

## Test V-5: Typed validation with no mutation

- **Type:** Contract and persistence integration
- **Task:** T-3, T-4
- **Acceptance Criteria:** AC-6, AC-8
- **Priority:** Critical

### Setup
Create one migrated isolated database with at least two valid existing rows. Define cases for empty ID, empty name, whitespace-only name, empty canonical path, invalid integer timestamp, `NaN`, positive infinity, and negative infinity.

### Steps
1. Before each case, raw-query sorted rows, serialize all four fields deterministically to a buffer, and record count.
2. Call create with the invalid case.
3. Assert the exact typed code: `empty-id`, `blank-name`, `empty-canonical-path`, or `invalid-created-at`.
4. Query and serialize again; compare count and bytes.
5. Assert no filesystem existence/readability/canonicalization call is made.
6. Close and clean the path.

### Expected Result
Every invalid input is rejected before write with its deterministic typed outcome. Existing row count and serialized four-field values remain byte-for-byte identical. No BL-006 filesystem policy is exercised.

### Expected Evidence
- Case-to-code table and pre-write adapter spy/call count.
- Before/after buffer hashes, byte equality, and row counts for each case.
- Cleanup assertions.

## Test V-6: Complete in-process project-library restart

- **Type:** Bounded restart integration
- **Task:** T-3, T-5
- **Acceptance Criteria:** AC-3, AC-8
- **Priority:** Critical

### Setup
Allocate one recorded explicit disposable path and enforce a finite Vitest timeout. Do not construct Fastify, bind a port, or import web code.

### Steps
1. Construct generation-one `ProjectLibrary`, migrate through its startup path, and create exactly two distinct records.
2. List and retain their exact four-field values.
3. Close generation one, including service, repository ownership, Drizzle/libSQL resource, and repeated idempotent close.
4. Construct generation two from scratch against the same path.
5. List through the same service method and compare against generation one.
6. Close generation two and prove targeted cleanup.

### Expected Result
After all first-generation resources close, fresh instances return exactly the two original records once each and no others. The test remains wholly in process and bounded; cleanup proves no database or sidecars remain.

### Expected Evidence
- Named restart test duration and two generation markers.
- Exact pre/post record arrays and occurrence counts.
- Resource-close and path-cleanup assertions.

## Test V-7: Database test isolation, refusal, and exact cleanup

- **Type:** Safety contract integration
- **Task:** T-2, T-4, T-5, T-6
- **Acceptance Criteria:** AC-8
- **Priority:** Critical

### Setup
Resolve the repository root, disposable root, and documented developer/default database path. Place an unrelated sibling sentinel under the disposable root and prepare representative selected-path sidecars.

### Steps
1. Allocate several test contexts and assert every recorded path is unique, normalized, and contained below `test-results/bl-005/databases`.
2. Ask the test boundary to use the normalized default path and assert refusal before create/open/migrate; verify default state is unchanged.
3. Open resources and create selected database sidecars, register all handles, then invoke cleanup.
4. Assert registered closes occurred before removal, repeated close is safe, selected database and allowlisted sidecars are absent, and the unrelated sibling remains.
5. Run these lifecycle assertions through each BL-005 persistence, migration, and restart suite.

### Expected Result
No BL-005 test can target the default database. Every test records a unique disposable path, closes all handles, removes only its database and SQLite sidecars, proves absence, and preserves unrelated files.

### Expected Evidence
- Recorded path set and containment checks.
- Typed refusal result with before/after default-path stat.
- Close-order trace and exact before/after filesystem listing.

## Test V-8: Persistence documentation contract

- **Type:** Documentation regression and review
- **Task:** T-7
- **Acceptance Criteria:** AC-9
- **Priority:** High

### Setup
Load `docs/README.md`, `apps/api/README.md`, `.harness/engineering-harness.md`, `justfile`, migration journal, schema, fixture metadata, and persistence result types.

### Steps
1. Assert docs name the resolved default and `ASCEND_DATABASE_URL` override plus `just db-migrate <database-path>`.
2. Assert both exact migration IDs and representative first/rerun JSON outputs are documented.
3. Assert all four physical and semantic fields, timestamp form, `created`/`existing`, validation outcomes, restart proof, fixture, disposable root, refusal, sidecars, and cleanup are present.
4. Compare documented values against source/journal constants.
5. Assert scope text defers BL-006 path policy and BL-007 HTTP/API/UI behavior.
6. Review harness governance to ensure migration/fixture/consequence support is listed without falsely claiming reset support.

### Expected Result
All AC-9 topics are accurate and synchronized with executable constants. Documentation describes only BL-005 behavior and harness capability.

### Expected Evidence
- Passing documentation contract test.
- Topic-to-file review matrix and source-constant comparisons.

## Test V-9: Configured full repository validation

- **Type:** Full regression gate
- **Task:** T-8
- **Acceptance Criteria:** AC-10
- **Priority:** Critical

### Setup
Complete V-1 through V-8, close all resources, remove disposable BL-005 files through targeted helpers, and inspect Git status for accidental databases or sidecars.

### Steps
1. Run focused persistence, migration, restart, safety, and documentation tests with `just verify-focused`.
2. Run `just verify` from repository root without modifying configured thresholds or recipes.
3. Inspect the final status and retain relevant command summaries in the implementation record.

### Expected Result
Formatting, linting, strict type checks, all unit/integration tests with 80 percent coverage thresholds, build, Playwright, and retained BL-004 audit all pass. No disposable SQLite artifact is tracked or left by BL-005 tests.

### Expected Evidence
- Focused and full command transcripts with exit code zero.
- Coverage/build/E2E/audit summaries and final artifact-status proof.
