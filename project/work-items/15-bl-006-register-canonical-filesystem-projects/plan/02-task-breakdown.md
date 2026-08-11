# Task Breakdown: BL-006: Register canonical filesystem projects

## Task T-1: Define typed construction and fail-closed opening policy

- **Status:** Completed
- **Complexity:** Large
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-3, AC-7
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-development-standards

### Description
Add `apps/api/src/project-registration.ts` as an in-process boundary. Its asynchronous factory receives an explicit database path, configured home, and allowed-root list. Validate every configuration entry before calling `createProjectLibrary`: require an absolute, existing, readable directory; canonicalize each configured entry exactly once; retain the canonical home and a deduplicated immutable canonical-root set; and accept an empty set as deny-all.

Return either a ready service or an issue-local failure containing only `category: "invalid_opening_policy"` and `field: "configured_home"` or indexed `"allowed_roots[n]"`. Validate in deterministic field/index order, never attach the submitted value, cause, stack, raw Node error, or a partly active service. Keep the narrow filesystem inspector and library factory injectable for deterministic denial and unopened-persistence assertions. Retargeted configuration symlinks affect later service construction only, not the canonical snapshot retained by an existing service.

### Acceptance Criteria
- A complete valid set produces one ready service with one canonical home and deduplicated canonical roots; empty roots produce a ready deny-all service.
- Every configured entry is absolute, canonicalized once, and proven existing, directory, and readable before persistence construction.
- Any invalid home or root returns only the safe typed configuration fields and does not expose registration.
- Mixed valid/invalid roots fail as one construction outcome; no valid subset remains active and persistence is not opened.
- Existing services retain their canonical home/root snapshot after source symlinks retarget.

### Test Coverage
- V-1 covers all-valid, duplicate, empty, symlinked, and retargeted configuration.
- V-2 covers every invalid configuration class, mixed-set all-or-nothing behavior, safe exact keys, unopened persistence, unchanged rows, and controlled unreadability.
- V-3 unit spies prove blank and NUL submitted input are classified before the filesystem inspector.

### Expected Evidence
- Focused Vitest results for configuration and construction suites.
- Inspector/library-factory call traces proving one canonicalization per entry and validation-before-open ordering.
- Exact result-key assertions and before/after database/project snapshots for failures.
- Symlink target A/B evidence showing an existing service remains bound to target A.

## Task T-2: Parse, canonicalize, validate, and enforce submitted paths

- **Status:** Completed
- **Complexity:** Large
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-2, AC-3, AC-4
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-development-standards

### Description
Implement registration input parsing for exactly absolute paths, `~`, and `~/...`. Use trimming only to recognize empty/whitespace-only input; never replace a nonblank submitted value with a trimmed value. Detect NUL before any Node filesystem API. Reject relative paths, `~user`, and every other unsupported form with `unsupported_path_syntax`. Expand supported home notation from the retained canonical configured home, then canonicalize and inspect the target.

Map missing, non-directory, unreadable, and outside-policy targets to distinct issue-local categories such as `path_not_found`, `path_not_directory`, `path_unreadable`, and `outside_opening_policy`. Every invalid registration object contains only `category` and `field: "path"`. Evaluate policy against canonical strings with segment-aware `path.relative` semantics: equality and descendants pass; absolute relative results and `..` segments fail. Do not reuse proof-only errors that contain submitted/canonical values, and expose no write-capable filesystem operation.

### Acceptance Criteria
- Blank yields `path_required`, and NUL yields `unsupported_path_syntax`, before any filesystem call.
- Absolute, `~`, and `~/...` are the only accepted forms; valid whitespace in path segments is preserved.
- Existing readable directories are distinguished from missing, non-directory, and unreadable targets with safe typed results.
- Canonical allowed root/self/descendants pass; traversal, prefix siblings, and escaping symlinks fail.
- Symlinked roots are represented by their canonical construction target.

### Test Coverage
- V-3 exercises every syntax/validation class, safe shape, call ordering, whitespace preservation, and persistence no-change result.
- V-4 exercises root equality, descendants, lexical normalization, traversal, prefix siblings, canonical root symlinks, and target symlink escapes.
- V-5 covers absolute and configured-home success plus display-name inputs.
- V-9 covers real host-permission behavior when supported and deterministic injected denial always.

### Expected Evidence
- Case/category table with exact result object keys and no leaked values/errors.
- Filesystem-inspector spies showing no calls for blank/NUL and read-only calls otherwise.
- Canonical path and `path.relative` assertions for every policy boundary.
- Pre/post serialized project rows proving all rejected inputs are persistence-neutral.

## Task T-3: Orchestrate four-field persistence and canonical equivalence

- **Status:** Completed
- **Complexity:** Large
- **Dependencies:** T-2
- **Acceptance Criteria:** AC-2, AC-5, AC-6
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-development-standards

### Description
After path approval, construct exactly the existing BL-005 `Project` shape. Derive `name` with `path.basename(canonicalPath)` and use the canonical root string when the basename is empty. Generate the candidate stable ID with `randomUUID()` and `createdAt` with integer epoch milliseconds through injectable module-local defaults. Pass only `id`, `name`, `canonicalPath`, and `createdAt` to `ProjectLibrary.create`.

Translate successful persistence into explicit created/existing registration outcomes while preserving the durable four-field winner unchanged. Rely on the existing database unique index and conflict-followed-by-lookup behavior rather than an in-memory duplicate precheck. Own idempotent close for the registration service. Prove close plus construction of a completely fresh registration/persistence service against the same database returns the existing record. Do not add project listing, Fastify startup, routes, web code, workbench behavior, or project close behavior.

### Acceptance Criteria
- Every successful result contains exactly stable ID, display name, canonical path, and created-at.
- Directory basenames, whitespace basenames, and canonical filesystem root fallback are exact.
- Absolute, home-relative, normalized, and symlink expressions return one sequential durable winner.
- Exactly eight concurrent equivalent expressions all fulfill with one identical winner and one complete row.
- Complete registration/library/database close and fresh reopen retain the exact record.

### Test Coverage
- V-5 covers successful absolute/home registration, four keys, display-name rules, close, and fresh reopen.
- V-6 covers all sequential equivalent expressions and one reopened canonical row.
- V-7 covers exactly eight concurrent expressions, winner equality, raw row completeness, and reopen.
- Existing BL-005 persistence tests remain part of V-11 regression validation.

### Expected Evidence
- Exact object-key and value assertions at registration and raw SQLite boundaries.
- Sequential outcome list and one-row durable query.
- Eight fulfilled results with identical ID/name/path/time and one reopened row.
- Generation-one/closed/generation-two markers and idempotent-close assertions.

## Task T-4: Build disposable fixture, non-mutation, and permission evidence helpers

- **Status:** Completed
- **Complexity:** Large
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-7, AC-8, AC-9
- **Related ADRs:** ADR-260808-governed-engineering-harness, ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260806-agent-executable-acceptance-criteria, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description
Add a BL-006 test helper that allocates UUID-scoped fixture roots below `<repository>/test-results/bl-006/fixtures`, records every path, and prepares directories, regular files, symlinks, whitespace segments, prefix siblings, escape targets, and non-directory configuration/input cases. Cleanup restores any changed mode first, removes only the allocated root, and proves absence; unrelated siblings and the permission artifact remain.

Implement a recursive non-mutation manifest sorted by relative path. Record node type, permission mode, nanosecond-capable or highest available stable modification time, regular-file bytes, and symlink target bytes as applicable. Snapshot only after fixture setup and compare after successful, duplicate, concurrent, rejected, and invalid-construction calls.

Add a bounded host-permission probe that creates one disposable directory, sets mode `000`, tests the same readability operation used by production plus directory access, records the finite result, and restores permissions in `finally`. If enforceable, execute unreadable configured-root and unreadable project tests. Otherwise, write a value-safe inspectable skip result without claiming proof. In all environments, inject controlled access-denied responses through the registration filesystem seam and prove configuration/project mapping. Persist the status at `test-results/bl-006/permission-capability.json`.

### Acceptance Criteria
- Every fixture path is unique, repository-disposable, recorded, and removed by targeted cleanup.
- Manifests cover every node and all AC-8 membership, bytes, mtime, and mode properties.
- Probe mode is restored even when an assertion or operation fails.
- Capability evidence says either proved or skipped with the failed probe result; it never reports unsupported host proof as passed.
- Controlled denial always proves unreadable configuration and project mappings.

### Test Coverage
- V-2 uses controlled and, when supported, host unreadable configuration fixtures.
- V-8 compares full manifests around every required registration class.
- V-9 validates fixture allocation/cleanup, probe bounds/restoration, artifact schema, host conditional branch, controlled denial, and unrelated-sibling preservation.

### Expected Evidence
- Before/after manifest hashes plus detailed equality assertions.
- Permission-capability JSON with bounded probe result and proved/skipped status.
- Cleanup trace showing permission restoration before targeted removal and final absence.
- Controlled-denial result objects with safe categories/fields only.

## Task T-5: Implement the finite registration acceptance matrix

- **Status:** Completed
- **Complexity:** Large
- **Dependencies:** T-2, T-3, T-4
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Create focused unit and integration files whose names and describe blocks correspond to configuration, registration validation/policy, persistence/restart, equivalence/concurrency, non-mutation, and fixture/permission capability. Cover every finite case named in AC-9. Reuse the BL-005 unique database lifecycle for each durable case; close all registration and persistence resources before database cleanup. Seed existing rows before rejected construction/registration cases and compare deterministic raw four-field buffers afterward.

Keep service tests in process and bounded. Use real disposable filesystem behavior for ordinary cases, symlink behavior, and host permissions when available; use the narrow injected seam only for call ordering and the mandatory controlled-denial proof. Assert exact discriminated-union keys and values instead of matching messages. Avoid source-string-only claims where runtime behavior can be tested.

### Acceptance Criteria
- Every AC-9 case appears in a finite test table or named scenario.
- Every AC-1 through AC-9 outcome has positive, negative, and cleanup assertions appropriate to its boundary.
- Rejected construction/registration preserves existing rows byte-for-byte and cannot expose a callable service.
- All resources and fixtures close or clean in `finally`, including assertion failures.
- Tests remain Linux-host-honest and do not claim unsupported portability.

### Test Coverage
- V-1 through V-9 collectively form the acceptance matrix.
- `just verify-focused` executes individual files during implementation.
- V-11 reruns the matrix through the named root recipe and package coverage gate.

### Expected Evidence
- Test inventory mapping every AC-9 phrase to a test ID/name.
- Focused test transcripts and API coverage summary above configured thresholds.
- Database row-buffer, filesystem-manifest, symlink-retarget, and cleanup artifacts.
- No route, web, workbench, project-list, or project-close diff.

## Task T-6: Document the boundary and expose named full-gate signals

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-5
- **Acceptance Criteria:** AC-9, AC-10, AC-11
- **Related ADRs:** ADR-260808-governed-engineering-harness, ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-filesystem-path-safety

### Description
Update `docs/README.md` and `apps/api/README.md` with the complete registration contract: construction configuration and safe fields, deny-all, supported syntax, category catalog, canonical/symlink containment, four-field/display-name behavior, duplicate/concurrency winner semantics, close/reopen persistence, permission capability/skip interpretation, non-mutation, disposable cleanup, designated Linux assumptions, and exclusions. Update `.harness/engineering-harness.md` signal/evidence inventory for BL-006 without changing harness command ownership or boot behavior.

Add `verify-project-registration` to the root `justfile`. It runs only the finite BL-006 suites with verbose stable group names. Invoke it from `just verify` so its output visibly reports configuration, registration, persistence, non-mutation, fixture-cleanup, documentation, and permission-capability checks before the complete existing gate finishes. A documentation contract test reads source constants/types, docs, justfile, and harness governance to prevent category, field, command, evidence-path, or scope drift.

### Acceptance Criteria
- Documentation covers every AC-10 topic and explicitly excludes UI/list/workbench and all other Issue #15 non-goals.
- Harness governance identifies BL-006 signals/evidence accurately and still delegates checks to `just verify`.
- The named recipe is finite and each required AC-11 result group is visible in output.
- Documentation tests compare prose tokens to executable category/field/command constants.

### Test Coverage
- V-10 checks docs, API docs, harness governance, source contracts, and root command synchronization.
- V-11 invokes the root recipe as part of full validation and inspects required labels.
- Manual source-to-prose review is recorded as implementation evidence but does not replace V-10.

### Expected Evidence
- Documentation diffs and passing documentation contract test.
- `just --list` entry plus verbose named BL-006 recipe output.
- Topic-to-file matrix covering all AC-10 subjects and exclusions.
- Harness checks remains a wrapper around root `just verify`.

## Task T-7: Run focused and complete repository validation

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-6
- **Acceptance Criteria:** AC-11
- **Related ADRs:** ADR-260808-governed-engineering-harness, ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description
Run focused BL-006 tests while implementing, then execute `just verify` from repository root. Do not lower the 80 percent API coverage thresholds, omit Playwright, or bypass existing persistence/workbench checks. Confirm the named BL-006 group output, generated permission-capability evidence, database and fixture cleanup, formatting, lint, strict type checks, all tests, build, browser tests, and retained BL-004 audit.

Record commands, versions, exit codes, group summaries, coverage, capability status, cleanup inspection, and final Git status in `implementation/00-implementation.md`. Generated fixture/database files must be absent and ignored evidence must not be accidentally tracked.

### Acceptance Criteria
- V-1 through V-10 pass before the final gate.
- `just verify` exits zero and visibly identifies every AC-11 group.
- Existing validation and coverage thresholds remain intact.
- Final filesystem/Git inspection shows no disposable fixture or database artifacts tracked or left outside the intentional capability artifact.

### Test Coverage
- V-11 is the configured complete repository gate.
- Any correction that changes registration behavior reruns its focused test and V-11.
- Cleanup and Git-status inspection follow the gate.

### Expected Evidence
- Focused and full command transcripts with exit code zero.
- Named BL-006 group output and permission-capability artifact contents.
- Coverage/build/Playwright/BL-004 audit summaries.
- Final cleanup and Git-status proof in the implementation record.
