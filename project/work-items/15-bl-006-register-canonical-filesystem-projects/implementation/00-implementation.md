# Implementation: BL-006 Register canonical filesystem projects

## Scope

Implemented the Issue #15 in-process, API-neutral registration boundary over BL-005 persistence. No Fastify route, browser/UI, list product behavior, project-close behavior, BL-007/BL-008 behavior, or workbench behavior was added.

## Completed Tasks

- T-1 — Completed typed construction and fail-closed opening-policy validation.
- T-2 — Completed submitted-path syntax, canonical filesystem validation, and segment-boundary policy checks.
- T-3 — Completed four-field persistence orchestration, display names, equivalence, concurrency, close, and restart behavior.
- T-4 — Completed repository-disposable fixtures, recursive non-mutation manifests, exact cleanup, and bounded permission-capability evidence.
- T-5 — Completed the finite AC-1 through AC-9 unit/integration matrix.
- T-6 — Completed application/API/harness documentation and the named registration gate.
- T-7 — Completed focused and complete repository validation.

## Acceptance Evidence

- **AC-1:** project-registration-construction.test.ts proves deterministic configured-home/root validation before library construction, one canonicalization per supplied entry, canonical-root deduplication behavior, empty-root deny-all, and exact safe failures. project-registration-acceptance.test.ts proves symlinked home/root target A remains frozen after links retarget to B while a fresh service observes B.
- **AC-2:** project-registration-persistence.test.ts proves absolute and configured-home registration, exact four-key Project values, whitespace basename, canonical-root display fallback, idempotent close, fresh service reconstruction, and unchanged existing durable values.
- **AC-3:** project-registration-construction.test.ts proves blank and NUL classification before inspector calls. project-registration-paths.test.ts covers exact category/field-only results for unsupported, missing, file, unreadable, and outside targets and byte-preserved leading/trailing path whitespace. project-registration-acceptance.test.ts compares ProjectLibrary rows after every rejected real-filesystem case.
- **AC-4:** project-registration-paths.test.ts and project-registration-acceptance.test.ts prove root/self/descendant admission plus prefix-sibling, lexical traversal, and canonical symlink-escape rejection using canonical segment boundaries; symlinked configured roots resolve to canonical targets.
- **AC-5:** project-registration-persistence.test.ts submits absolute, supported home-relative, normalized, and symlink expressions sequentially, receives one equal four-field winner, then proves the same record after fresh reopen.
- **AC-6:** project-registration-persistence.test.ts starts exactly eight equivalent registrations with Promise.all, proves eight identical complete four-field results, one SQLite winner, and fresh-reopen equality.
- **AC-7:** project-registration-construction.test.ts covers relative, missing, file, and controlled-unreadable home/root entries, indexed mixed-set failure, exact two-key safe outcomes, and zero persistence-factory calls. project-registration-acceptance.test.ts proves invalid construction preserves durable rows and project manifests.
- **AC-8:** project-registration-acceptance.test.ts compares recursive manifests after success, sequential duplicate, exactly eight concurrent calls, rejected calls, and invalid construction. Entries include relative membership/type, regular-file bytes, symlink targets, nanosecond mtimes, and permission modes; the filesystem seam exposes only canonicalize, directory inspection, and readability operations.
- **AC-9:** the six finite BL-006 test files cover configuration, syntax, policy, persistence/restart, equivalence/concurrency, non-mutation, disposable cleanup, documentation, and permissions. test-results/bl-006/permission-capability.json records status proved with both bounded mode-000 operations denied, no timeout, exact mode restoration, and mandatory controlled-denial mappings. Post-suite inspection found no allocated BL-006 fixture entries or Issue #15 registration database directories.
- **AC-10:** docs/README.md and apps/api/README.md document construction, deny-all/all-or-nothing policy, syntax/categories/safe fields, whitespace, canonical boundaries/symlinks, display names, duplicates/concurrency/restart, non-mutation, capability-aware permission evidence, cleanup, and exclusions. .harness/engineering-harness.md records the named signal and evidence. project-registration-documentation.test.ts synchronizes source constants, docs, justfile, and harness ownership.
- **AC-11:** just verify exited zero after formatting, lint, strict type checks, package tests/coverage, the named 48-test BL-006 gate, builds, Playwright, and retained BL-004 audit. Output reported configuration, registration, persistence, non-mutation, fixture-cleanup, and documentation PASS; permission-capability PROVED with controlled-denial PASS. API aggregate coverage was 88.96% statements, 80.53% branches, 88.06% functions, and 89.74% lines; project-registration.ts measured 98.64% statements, 96.42% branches, 100% functions, and 98.59% lines. Playwright reported 3 passed and 1 designated comparison skipped; the BL-004 audit reported passed with absent active guard/resources and unchanged fixture integrity.

## Documentation Evidence

- **README/application behavior:** docs/README.md now explains supported registration workflows, safety semantics, evidence, cleanup, and exclusions.
- **API/application boundary:** apps/api/README.md now documents the in-process construction and result contract while explicitly stating that no HTTP/network contract was added.
- **Configuration instructions:** the same docs record explicit databasePath/configuredHome/allowedRoots construction, validation, frozen canonical snapshots, and empty-root behavior. No environment option or default changed.
- **Usage and validation:** both docs identify just verify-project-registration and its evidence location.
- **Architecture/harness explanation:** .harness/engineering-harness.md now inventories the BL-006 signal and generated evidence while preserving harness checks delegation to just verify. Existing ADR and core-component contracts did not require revision because the implementation remains within their accepted boundaries.
- **Migration/operations:** no schema, data, API, deployment, or runtime-procedure migration was introduced; BL-005 migrations and operational database command are unchanged.

## Validation Evidence

### Focused

- T-1: just verify-focused project-registration-construction.test.ts — 15 passed.
- T-2: just verify-focused project-registration-paths.test.ts — 19 passed after correcting one test-only leakage assertion.
- T-3: just verify-focused project-registration-persistence.test.ts — 4 passed.
- T-4: just verify-focused project-registration-fixtures.test.ts — 4 passed after making manifest membership order-independent.
- T-5: just verify-focused across construction, paths, persistence, fixtures, and acceptance — 46 passed after assigning unique candidates to fresh test services; later affected-suite runs remained green.
- T-6: just verify-focused project-registration-documentation.test.ts — 2 passed; just verify-project-registration — 6 files and 48 tests passed with all named signals.
- T-7/corrections: affected focused suites passed after formatting, repository-root evidence anchoring, exact registration-database cleanup, and indexed field-type narrowing.

### Full

- just verify — exited 0.
- Format, lint, strict typecheck, package tests and coverage, named BL-006 gate, API/web builds, Playwright, and proof-workbench-capacity-audit all passed as configured.
- Host permission artifact status: proved; controlled configured-root and project denial checks passed.
- Cleanup inspection: no allocated BL-006 fixture entries and no Issue #15 registration database directories remained; the intentional capability artifact remained ignored and inspectable.

These are implementation-stage observations and evidence. Final acceptance remains owned by Verify.
