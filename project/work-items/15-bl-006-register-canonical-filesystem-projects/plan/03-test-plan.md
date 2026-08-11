# Test Plan: BL-006: Register canonical filesystem projects

## Test V-1: Valid configuration, deduplication, deny-all, and frozen symlink snapshots

- **Type:** Unit and filesystem integration
- **Task:** T-1, T-5
- **Acceptance Criteria:** AC-1, AC-9
- **Priority:** Critical

### Setup
Allocate a disposable configured home, two allowed roots, canonical duplicate expressions, a symlinked root, and a symlinked home. Use a filesystem-inspector spy around the production operations and an isolated BL-005 database path. Prepare alternate symlink targets before constructing the service.

### Steps
1. Construct with all-valid home/roots and assert each configured entry is canonicalized exactly once before the library opens.
2. Supply literal and symlink expressions resolving to the same root; inspect the retained policy through observable registration outcomes and prove one canonical root behavior.
3. Construct with `allowedRoots: []`; prove construction succeeds and a valid directory registration receives the outside-policy category.
4. Construct through root/home symlinks targeting A, then retarget both links to B without reconstructing.
5. Prove the existing service still expands `~` to home A and applies root A, while a fresh service observes B.
6. Close services, clean database/fixture paths, and assert absence.

### Expected Result
Complete valid configuration produces a ready service. Canonical root duplicates behave as one policy root; empty roots deny every registration without invalidating construction. Every configured entry has one canonicalization call. Retargeting does not change an existing service canonical home/root snapshot.

### Expected Evidence
- Ordered inspector and library-open trace.
- Canonicalization call counts and duplicate-root assertions.
- Deny-all safe result.
- A/B retarget matrix for existing versus fresh services.
- Resource-close and cleanup assertions.

## Test V-2: Invalid configuration fails closed without persistence or project mutation

- **Type:** Construction safety integration
- **Task:** T-1, T-4, T-5
- **Acceptance Criteria:** AC-7, AC-9
- **Priority:** Critical

### Setup
Create an existing database containing known four-field rows and snapshot them. Prepare relative, missing, regular-file, and controlled-unreadable configured-home/root cases plus a mixed list with valid roots before and after one invalid root. Snapshot representative project fixture content. Inject a library-factory spy and deterministic access denial.

### Steps
1. Attempt construction for each invalid configured-home case; assert exact `{ category: "invalid_opening_policy", field: "configured_home" }` keys.
2. Attempt each invalid root index; assert the exact indexed `allowed_roots[n]` field and deterministic first-invalid ordering.
3. Attempt the mixed valid/invalid set and prove no ready service or valid-root subset can be used.
4. Assert the persistence factory was never called for every invalid configuration.
5. Reopen the pre-existing database independently and compare row count plus serialized rows byte-for-byte.
6. Compare project fixture manifests and clean all resources.

### Expected Result
Every invalid home/root fails the entire construction with only category and safe field. No configured value, raw error, cause, stack, service, database migration/open, row change, or project-content change occurs.

### Expected Evidence
- Invalid-case-to-field table and exact object-key assertions.
- Zero library-factory calls.
- Equal pre/post row buffers and fixture manifests.
- Cleanup proof.

## Test V-3: Submitted syntax, whitespace, typed failures, and pre-filesystem ordering

- **Type:** Contract unit and filesystem integration
- **Task:** T-1, T-2, T-5
- **Acceptance Criteria:** AC-3, AC-9
- **Priority:** Critical

### Setup
Construct a valid service over a disposable allowed tree containing directories with ordinary, leading-space, trailing-space, and internal-space path segments. Seed known durable rows. Prepare inputs for empty string, whitespace-only variants, NUL, relative path, `~user`, other unsupported forms, missing target, regular file, controlled unreadable target, outside-policy target, valid absolute path, `~`, and `~/...`.

### Steps
1. Submit blank/whitespace-only values and assert `path_required`, `field: "path"`, and zero filesystem calls.
2. Submit NUL and assert `unsupported_path_syntax`, the same safe field, and zero filesystem calls.
3. Exercise every other unsupported form and every missing/file/unreadable/outside class; assert one distinct exact category per applicable class.
4. Assert every failure object has only `category` and `field`, serializes without submitted/configured values, and is not an `Error` with stack/cause.
5. Register whitespace-containing absolute and home-relative directories; compare canonical path/name byte-for-byte with actual names.
6. Around each rejected case, compare durable row count and sorted four-field serialization.

### Expected Result
Classification order and categories are deterministic and safe. Nonblank valid input is never globally trimmed. All failures leave persistence unchanged, and blank/NUL never reach filesystem APIs.

### Expected Evidence
- Complete input/category/call-count matrix.
- Exact result-key and leakage-negative assertions.
- Whitespace-preserving canonical path/display-name values.
- Equal before/after durable row buffers.

## Test V-4: Canonical path-segment opening policy

- **Type:** Filesystem policy integration
- **Task:** T-2, T-5
- **Acceptance Criteria:** AC-4, AC-9
- **Priority:** Critical

### Setup
Create an allowed root, child and nested child, a prefix sibling such as `root-sibling`, an outside directory, a lexical traversal expression, a symlink inside the root to outside, and an allowed-root symlink to the original root. Construct services using literal and symlinked root configuration.

### Steps
1. Register the canonical root itself, one child, and one nested descendant.
2. Submit a normalized expression that stays inside and assert the same canonical target.
3. Submit prefix sibling and lexical traversal expressions that resolve outside.
4. Submit the inside symlink whose canonical target is outside.
5. Construct using the symlinked allowed root and prove its canonical target and descendants pass.
6. Record `path.relative` boundary values, then close and clean.

### Expected Result
Root equality and descendants pass. Prefix similarity never counts as containment. Traversal and escaping symlinks return the outside-policy category. A symlinked configured root is evaluated as its canonical target.

### Expected Evidence
- Pass/fail policy matrix with canonical targets.
- Relative-segment values for root, descendant, prefix sibling, traversal, and escape.
- Safe category/field assertions and one-row-per-approved-target queries.
- Cleanup proof.

## Test V-5: Successful registration, display names, close, and fresh reopen

- **Type:** In-process registration and persistence integration
- **Task:** T-2, T-3, T-5
- **Acceptance Criteria:** AC-2, AC-9
- **Priority:** Critical

### Setup
Allocate one explicit database path and an allowed tree under the configured home. Include a normal directory, a whitespace-basename directory, and, where represented by the configured POSIX fixture, canonical `/` for the root fallback case using a non-mutating test seam or safely readable root. Inject deterministic UUID/time values for first-create shape assertions.

### Steps
1. Register a valid absolute directory and assert a created result containing exactly four project keys.
2. Register valid `~` and `~/...` targets and verify expansion from the configured canonical home.
3. Assert normal/whitespace basename and canonical-root fallback display-name behavior.
4. Close the complete registration and persistence service idempotently.
5. Construct a fresh service against the same database/configuration and register the original directory.
6. Assert an existing result with all four values unchanged; inspect the durable row independently, then close and clean.

### Expected Result
Supported paths register exactly one four-field project with canonical path and exact display-name rule. Complete close/reopen returns the unchanged durable record, with no extra persisted field.

### Expected Evidence
- Exact result keys, deterministic first ID/time, canonical paths, and display names.
- Generation-one/closed/generation-two trace.
- Existing-result equality and raw one-row query.
- Database/fixture cleanup assertions.

## Test V-6: Sequential canonical equivalence

- **Type:** Registration duplicate integration
- **Task:** T-3, T-5
- **Acceptance Criteria:** AC-5, AC-9
- **Priority:** Critical

### Setup
Create one allowed canonical directory addressable by an absolute path, supported configured-home path, lexical normalized expression, and a symlink expression. Use one fresh registration service/database.

### Steps
1. Register the absolute expression and retain its complete project record.
2. Register the home-relative, normalized, and symlink expressions sequentially.
3. Assert every later result is existing and every four-field project equals the first result.
4. Query the project table and assert exactly one row for the canonical path.
5. Close/reopen and confirm that same one row, then clean.

### Expected Result
All four expressions collapse to one canonical identity. One created record and subsequent existing outcomes all carry the same stable ID, name, canonical path, and created-at.

### Expected Evidence
- Expression-to-canonical-path/outcome table.
- Four-field equality assertions.
- Raw and reopened one-row query.
- Cleanup proof.

## Test V-7: Exactly eight concurrent equivalent registrations

- **Type:** Registration concurrency integration
- **Task:** T-3, T-5
- **Acceptance Criteria:** AC-6, AC-9
- **Priority:** Critical

### Setup
Create a fresh database/service and one allowed directory with eight supported absolute, home-relative, normalized, or symlinked expressions that all canonicalize to it. Use controlled UUID/time factories that can issue distinct candidates while leaving SQLite to select the winner.

### Steps
1. Start exactly eight `register` calls together with `Promise.all`.
2. Assert all eight promises fulfill and no generic persistence error escapes.
3. Identify the created durable winner and compare every returned four-field project to it.
4. Raw-query the table for the canonical path; assert one row with all four non-null complete values.
5. Close/reopen, assert the same row, compare project fixture manifest, and clean.

### Expected Result
All eight calls return exactly one identical project record. Persistence contains one complete row and no partial record before or after reopen.

### Expected Evidence
- Count of eight fulfilled calls and disposition counts.
- Eight-way four-field equality output.
- Raw/reopened one-row result with complete values.
- Non-mutation and cleanup assertions.

## Test V-8: Project-content non-mutation across every outcome class

- **Type:** Filesystem safety regression
- **Task:** T-4, T-5
- **Acceptance Criteria:** AC-8, AC-9
- **Priority:** Critical

### Setup
Build a fixture tree containing nested directories, empty and nonempty regular files, a symlink, whitespace names, and varied permission modes. Complete fixture setup, then create a full recursive manifest with relative membership/type, bytes or link target, highest stable mtime precision, and mode. Keep database artifacts outside the project tree.

### Steps
1. Snapshot before one successful registration and compare after.
2. Repeat around sequential duplicate registration.
3. Repeat around exactly eight concurrent registration.
4. Repeat around each representative rejected registration category.
5. Repeat around invalid configuration construction referencing the fixture where applicable.
6. Assert the service source/runtime seam exposes no project-content create/delete/copy/move/rename/truncate/write operation.
7. Clean only allocated fixture/database roots and prove absence.

### Expected Result
Every before/after manifest is identical in membership, node type, bytes/link targets, modification timestamps, and modes. Registration performs inspection and metadata persistence only.

### Expected Evidence
- Per-scenario manifest hashes and detailed equality assertions.
- Negative write-operation spy/call record.
- Database-outside-project assertion.
- Targeted cleanup trace.

## Test V-9: Disposable cleanup and capability-aware unreadability

- **Type:** Test-harness safety and capability integration
- **Task:** T-2, T-4, T-5
- **Acceptance Criteria:** AC-3, AC-7, AC-9
- **Priority:** Critical

### Setup
Resolve the BL-006 disposable fixture root and permission artifact path. Place an unrelated sibling sentinel. Prepare a bounded mode-based probe, unreadable configured root/project fixtures, and controlled filesystem-inspector denial cases. Define the artifact schema with probe operation/results, status `proved` or `skipped`, and no configured/project path values.

### Steps
1. Allocate several contexts and assert unique recorded containment below `test-results/bl-006/fixtures`.
2. Run the bounded probe: chmod one disposable directory to `000`, execute production readability plus directory-access checks, and restore the original mode in `finally`.
3. If denial is enforceable, prove unreadable root maps to safe `invalid_opening_policy` and unreadable project maps to safe `path_unreadable`.
4. Otherwise, write `skipped` plus the finite failed probe result and assert no host-permission test is reported passed.
5. In every environment, inject controlled access denial and assert both typed mappings.
6. Write/read the capability artifact, clean allocated roots, assert absence and mode restoration, and prove the unrelated sibling plus artifact remain.

### Expected Result
Validation truthfully reports host capability. Controlled denial always passes. No fixture is stranded or left mode `000`; cleanup is targeted and inspectable.

### Expected Evidence
- `test-results/bl-006/permission-capability.json` contents.
- Host branch result and mandatory controlled-denial result.
- Mode restoration trace, recorded paths, fixture absence, and sibling preservation.
- Safe exact outcome objects.

## Test V-10: Registration documentation contract

- **Type:** Documentation regression and review
- **Task:** T-6
- **Acceptance Criteria:** AC-10
- **Priority:** High

### Setup
Load `docs/README.md`, `apps/api/README.md`, `.harness/engineering-harness.md`, `justfile`, registration source types/constants, filesystem-path-safety component, and permission artifact schema/path constants.

### Steps
1. Assert docs explain configured home, allowed roots, validation/canonicalization once, deduplication, deny-all, and all-or-nothing safe configuration fields.
2. Assert docs list exact supported syntax, typed categories/safe `path` field, whitespace behavior, canonical segment/symlink policy, and display-name rule.
3. Assert docs describe four-field created/existing equality, sequential/concurrent winner behavior, close/reopen durability, permission proved/skipped handling, non-mutation, and disposable cleanup.
4. Assert docs explicitly exclude UI, listing, workbench, scanning, clone/import, Git requirements, project close, HTTP/network, and native picker behavior.
5. Compare documented category/field/recipe/evidence tokens with executable constants and root command text.
6. Verify harness governance lists the new signal/evidence while retaining `just verify` delegation.

### Expected Result
All AC-10 subjects are accurate, synchronized, discoverable, and bounded to Issue #15.

### Expected Evidence
- Passing documentation contract test.
- Topic-to-file/source-constant matrix.
- Source-to-prose review notes in the implementation record.

## Test V-11: Named registration gate and complete repository validation

- **Type:** Full regression gate
- **Task:** T-6, T-7
- **Acceptance Criteria:** AC-11
- **Priority:** Critical

### Setup
Complete V-1 through V-10, close all services/databases, clean all disposable fixture roots, retain only the intentional permission-capability artifact, and inspect Git status. Keep all existing coverage thresholds and root recipes enabled.

### Steps
1. Run `just verify-project-registration` and capture its finite verbose result groups.
2. Assert output identifies configuration, registration, persistence, non-mutation, fixture-cleanup, documentation, and permission-capability as passing or, only for host-permission proof, explicitly skipped while controlled denial passes.
3. Run `just verify` from repository root.
4. Confirm formatting, lint, strict type checks, API/web tests and coverage, builds, Playwright, existing BL-005 persistence tests, and retained BL-004 audit all pass.
5. Inspect capability evidence, fixture/database absence, and final Git status; record summaries in the implementation artifact.

### Expected Result
Both commands exit zero. The complete gate visibly includes every required BL-006 result group and all pre-existing repository gates without reduced thresholds or hidden host-permission claims.

### Expected Evidence
- Named and full command transcripts with exit code zero.
- Required-group output checklist.
- API coverage, build, Playwright, persistence regression, and BL-004 audit summaries.
- Permission artifact, cleanup inspection, and final Git-status proof.
