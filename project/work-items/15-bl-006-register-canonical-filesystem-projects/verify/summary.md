# Verification Summary: BL-006 Register canonical filesystem projects

- **Issue:** #15 — BL-006: Register canonical filesystem projects
- **Work item:** `project/work-items/15-bl-006-register-canonical-filesystem-projects`
- **Branch:** `feat/15-register-canonical-filesystem-projects`
- **Verified implementation commit:** `0dcaaeeacd322c6f53c99fcd1751e2211230fb04`
- **Pull request:** https://github.com/jsburckhardt/ascend/pull/16
- **Decision:** Accepted

## Handoff and Diff Review

The branch name and implementation SHA matched the Implement handoff exactly, and the tree was clean before verification. The complete diff from merge base `c2f28d02c13698f34b1d03d2439e8f62eb97536d` was reviewed. Its production, test, command, documentation, harness, and work-item changes remain within Issue #15. The implementation follows the accepted TypeScript/SQLite, filesystem-path-safety, persistence-lifecycle, project-command, and governed-harness contracts; no ADR, core-component, schema, HTTP, UI, runtime, deployment, or migration change is required.

The implementation commit uses Conventional Commit form and contains the required `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer.

## Acceptance Decisions

- **AC-1 — Passed.** Construction tests prove all-valid validation before persistence, one canonicalization per configured expression, canonical-root deduplication, empty-root deny-all, and frozen symlinked home/root snapshots across retargeting.
- **AC-2 — Passed.** Persistence tests prove absolute and configured-home registration, exact four-field records, canonical paths, basename/root display-name rules, idempotent close, and unchanged fresh-service reopen results.
- **AC-3 — Passed.** Construction/path/acceptance tests prove blank and NUL pre-filesystem classification, nonblank whitespace preservation, distinct missing/file/unreadable/syntax/policy categories, exact safe fields, and unchanged persistence.
- **AC-4 — Passed.** Real and controlled filesystem tests prove canonical root/descendant admission and traversal, prefix-sibling, and escaping-symlink rejection with symlinked-root canonical targets.
- **AC-5 — Passed.** Sequential absolute, home-relative, normalized, and symlink expressions return the same four-field winner and one unchanged reopened record.
- **AC-6 — Passed.** Exactly eight concurrent equivalent registrations fulfill with one identical complete record and the same durable winner after reopen.
- **AC-7 — Passed.** Invalid configured homes/roots, mixed roots, and controlled/host unreadability return exact safe configuration outcomes, expose no service, do not open persistence, and preserve rows and project manifests.
- **AC-8 — Passed.** Recursive before/after manifests prove unchanged fixture membership/type, file bytes, symlink targets, nanosecond mtimes, and modes across success, duplicate, concurrency, rejection, and invalid construction.
- **AC-9 — Passed.** The finite 48-test matrix covers the required configuration, syntax, policy, equivalence, persistence, non-mutation, capability, and cleanup cases. The retained ignored capability artifact reported `proved`; access and directory reads were denied, no timeout occurred, modes were restored, and controlled denial passed. No disposable fixture or SQLite file remained.
- **AC-10 — Passed.** `docs/README.md`, `apps/api/README.md`, and `.harness/engineering-harness.md` accurately document construction, configuration, syntax, policy, safe outcomes, identity, concurrency, non-mutation, capability evidence, cleanup, validation, and exclusions. Documentation regression tests passed.
- **AC-11 — Passed.** The independently rerun full gate exited zero and visibly reported configuration, registration, persistence, non-mutation, fixture-cleanup, documentation, and permission-capability results.

## Documentation Review

- **README/application and API:** Passed; committed behavior and in-process boundary are accurate.
- **Configuration and usage:** Passed; explicit `databasePath`, `configuredHome`, `allowedRoots`, deny-all, safe fields, supported syntax, and validation commands are documented.
- **Architecture and operations:** Passed; filesystem/persistence ownership, capability evidence, cleanup, and harness command delegation are documented consistently.
- **API specification, migration, upgrade, deployment, runtime startup:** No impact; this change adds no route/specification, schema migration, environment setting, deployment behavior, startup integration, or upgrade procedure.

## Validation Results

- **`just verify-focused` — Passed:** 6 files, 48 tests.
- **`just verify-project-registration` — Passed:** 6 files, 48 tests; all named groups passed; permission capability `PROVED`; controlled denial passed.
- **`just verify` — Passed:** format, lint, strict typecheck, 228 API tests, 1 web test, configured coverage, API/web builds, 3 Playwright tests with 1 designated comparison skip, and the retained BL-004 audit.
- **Cleanup — Passed:** no BL-006 fixture entries or disposable SQLite files remained; the capability artifact is ignored and inspectable.

## Shipping

The verified feature branch was pushed, pull request #16 was created with every AC status and evidence, and all Issue #15 acceptance checkboxes were updated only after every criterion passed.
