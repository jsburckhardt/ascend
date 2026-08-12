# Implementation Record: BL-010 Start and reuse one project workbench

## Completed tasks

- [x] T-1 persisted lookup and finite runtime contract
- [x] T-2 safe direct launch, loopback collision handling, and bounded readiness
- [x] T-3 in-memory single-flight, shared-failure retry, caller-local cancellation, and exit eviction
- [x] T-4 application ownership, exact shutdown auditing, and structured events
- [x] T-5 executable lifecycle matrix, recursive manifests, privacy, and ownership evidence
- [x] T-6 designated code-server episode and exact residual audit
- [x] T-7 runtime documentation and root validation recipes

## Acceptance evidence

- **AC-1:** Contract/process tests and retained implementation/evidence/episode.json prove the immutable snapshot, direct argv launch as uid 1000 vscode, exact final canonical-path item, PID/start identity, loopback URL/port, and elapsed timing.
- **AC-2:** findById retains the unchanged four-field project model. The executable matrix inspects project keys and database bytes and reports zero runtime-field matches; no migration or runtime persistence was added.
- **AC-3:** The matrix executes exactly eight starts, records one launch and one PID, then records healthy reuse of that PID/port without another launch. The designated episode independently records real PID/port reuse.
- **AC-4:** Executable collision cases invoke the repository process boundary, record two collisions then success and three-attempt exhaustion, and retain the unrelated listener on its exact port.
- **AC-5:** Process tests and executable cases prove GET /healthz/, HTTP 200 plus alive or expired, attempt timing, request/overall bounds, status/body classification, and cancellation without fixed startup sleep.
- **AC-6:** The retained matrix executes unknown project, path invariant, spawn error, missing executable, early code/signal exit, and address exhaustion and records each distinct RuntimeFailure category.
- **AC-7:** The retained matrix also executes readiness timeout, unexpected health status/body, caller cancellation, and manager shutdown and records their distinct categories.
- **AC-8:** Runtime diagnostics remain six-field allowlisted and stack-free. Executed bounded-diagnostic and redaction cases report only actual keys and zero protected-sentinel matches.
- **AC-9:** Contract/lifecycle tests assert allowlisted lifecycle records; the executed redaction case records exact event keys, zero raw-path matches, and zero sentinel matches.
- **AC-10:** The retained failed-attempt-retry execution starts and records failedOwnedPid, process-start identity, and port, returns one identical health-body-unexpected object to eight callers, retains exact PID/group/listener absence, then serves eight retry callers from one fresh PID and one new launch.
- **AC-11:** The retained post-running-exit execution records the exited identity, one launch before explicit retry, an exact absence audit, and a distinct replacement identity with no automatic retry.
- **AC-12:** The retained cancellation execution records one caller-cancelled result while another completes. In the all-caller case both waits cancel caller-locally; the manager-owned shared attempt then reaches its controlled typed failure, records exact PID/group/listener absence, retains a non-running state before retry, and a later explicit retry succeeds on a fresh identity.
- **AC-13:** Manager shutdown returns a memoized result that inventories all three running/in-flight owners. Retained outcomes are graceful, escalated, graceful; every PID/start identity, process group, and listener is absent, the exact unrelated process identity and listener survive unchanged, repeated calls join one result, and no inspectable state or stale completion remains after return.
- **AC-14:** Retained before/after manifests for successful reuse, failed start/retry, post-running exit/replacement, caller cancellation, and manager shutdown include recursive membership, bytes, permissions, sizes, symlink targets, mtime, and ctime. Every executed difference count is zero. The designated episode retains the same complete recursive manifest shape.
- **AC-15:** fake-matrix.json version 2 contains 25 execution records with invocation counts and concrete observations rather than asserted case names or hard-coded result booleans. A contract guard rejects the prior assertion-only shape. The union audits 17 identities with zero residuals.
- **AC-16:** The fresh designated code-server 4.131.0 episode records timing.observedElapsedMs versus the 15,000 ms target, HTTP 200 expired, uid 1000, exact argv/path, listener inode, PID/port reuse, zero manifest differences, one graceful exact manager audit, unrelated-control survival, and zero residuals.
- **AC-17:** docs/project-runtime.md, both README surfaces, and the harness inventory describe the interface, bounds, caller-local cancellation, exact shutdown result, commands, evidence-owned volatile timing, and every deferred boundary. Documentation tests derive the observed value from the retained episode.
- **AC-18:** Focused ownership, executable matrix, designated episode, full gate, and standalone residual commands exit zero. The retained residual audits one exact PID/start identity and listener inode with zero PID or listener residuals.

## Documentation impact

- Updated README.md and docs/README.md for the exact shutdown result and evidence-owned designated timing.
- Updated docs/project-runtime.md for running/in-flight inventory, PID/group/listener audits, graceful/escalated outcomes, stale-completion suppression, and the retained timing source.
- Updated .harness/engineering-harness.md for executable matrix/manifests, exact shutdown audits, and committed evidence copies while preserving non-persistent boot.
- No HTTP API specification changed because no route was added. No configuration default, migration, deployment procedure, or breaking contract changed; the SQLite model remains four-field metadata-only.
- No ADR or core-component change is required: the correction implements the existing memory-only, caller-local cancellation, bounded shutdown, exact ownership, and redaction contracts without deviation.

## Validation evidence

- just verify-focused apps/api/test/project-runtime-manager.test.ts apps/api/test/project-runtime-process.test.ts apps/api/test/project-runtime-lifecycle.test.ts passed 24 tests after cleanup-audit correction.
- just verify-focused apps/api/test/project-runtime-acceptance.test.ts passed 2 non-host tests with the host matrix intentionally skipped; just verify-project-runtime then passed all 3 acceptance tests, including the 25-case executable artifact and assertion-only guard.
- just proof-project-runtime passed the real designated episode and regenerated the retained timing.observedElapsedMs field.
- just verify-project-runtime passed 5 files and 31 tests, including the serialized host-process matrix.
- just verify passed formatting, lint, typecheck, 340 API tests with 2 intentional skips, 139 web tests, the designated episode, residual and harness checks, registration checks, both builds, 5 Playwright tests with 1 intentional skip, and the capacity residual audit. API coverage was 88.51% statements, 80.48% branches, 85.37% functions, and 89.45% lines.
- just proof-project-runtime-residual-audit returned status ok with one retained PID identity and listener inode checked and zero residuals.

## Harness observations

- This correction captured DL-280 through DL-293 and CONF-056 through the real harness observe executable for unavailable tooling, focused/full failures, edit retries, host-process serialization, retained artifact formatting, coverage diagnosis, an empty coverage-pattern search, and five full-validation waits over 30 seconds.

Implementation evidence is recorded for Verify; final acceptance remains with Verify.
