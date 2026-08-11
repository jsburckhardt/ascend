# Implementation Record: BL-010 Start and reuse one project workbench

## Completed tasks

- [x] T-1 persisted lookup and finite runtime contract
- [x] T-2 safe direct launch, loopback collision handling, and bounded readiness
- [x] T-3 in-memory single-flight, reuse, retry, cancellation, and exit eviction
- [x] T-4 application ownership, shutdown ordering, and structured events
- [x] T-5 deterministic fake lifecycle, privacy, integrity, and ownership matrix
- [x] T-6 designated code-server episode and exact residual audit
- [x] T-7 runtime documentation and root validation recipes

## Acceptance evidence

- **AC-1:** `project-runtime-contract.test.ts`, `project-runtime-process.test.ts`, and the designated episode prove the immutable nine-field snapshot, direct argv launch as uid 1000 `vscode`, exact final canonical-path item, PID/start identity, loopback URL/port, and elapsed timing.
- **AC-2:** `findById` uses the unchanged four-field project model. Contract/acceptance tests inspect four project keys, SQLite bytes, events, and zero runtime fields; no migration or runtime persistence was added.
- **AC-3:** `project-runtime-manager.test.ts` issues exactly eight starts, observes one launch, one shared snapshot identity, and health-checked reuse without another launch. The designated episode records the same PID identity and port on reuse.
- **AC-4:** `project-runtime-process.test.ts` proves two collisions then success, three-attempt exhaustion, exact owned termination, and survival of the unrelated listener. Transient non-ready health is polled only inside the finite readiness bound.
- **AC-5:** Process tests prove `GET /healthz/`, HTTP 200 plus `alive` or `expired`, attempt timings, per-attempt cancellation, 1,000 ms request and 15,000 ms overall bounds, status/body mismatch classification, and no fixed startup sleep.
- **AC-6:** Contract/process/manager tests cover unknown project, canonical-path invariant, spawn error, missing executable, early code/signal exit, and address exhaustion as distinct fixed-message `RuntimeFailure` categories.
- **AC-7:** The same catalog plus process/lifecycle tests cover readiness timeout, unexpected status/body, caller cancellation, and manager shutdown distinctly.
- **AC-8:** `RuntimeFailure` deletes stack exposure, accepts only six diagnostic keys and real OS signal names, and tests scan snapshots, diagnostics, messages, events, SQLite bytes, and artifacts for protected sentinels.
- **AC-9:** Contract and lifecycle tests assert allowlisted `runtime.start.requested`, `runtime.start.succeeded`, `runtime.start.failed`, health/exit event shapes with project ID, transition, elapsedMs/classification, and no canonical path or protected data.
- **AC-10:** Eight callers receive the same failure object, in-flight state is atomically evicted, launch cleanup is exact, and eight later retries share one fresh launch.
- **AC-11:** Code and signal post-running exits retain one bounded failure, evict reuse state, create no automatic process, and allow one explicit replacement.
- **AC-12:** Manager tests prove caller-local cancellation while shared startup satisfies another waiter; docs state that only shutdown cancels shared manager work. Late completion after shutdown is cleaned without stale running mutation.
- **AC-13:** Lifecycle tests prove one memoized shutdown promise, rejection of new starts, in-flight cancellation, one bounded exact-owner termination with 2,000 ms TERM and 2,000 ms KILL bounds, and cleanup of a process resolving after shutdown starts.
- **AC-14:** Fake matrix and designated episode compare recursive fixture membership, modes, links, and byte hashes for success/reuse, failure/retry, replacement, and shutdown; all comparisons are unchanged.
- **AC-15:** `just verify-project-runtime` passed 5 files and 28 tests. `fake-matrix.json` names all 25 required deterministic cases and records bounds, failure catalog, manifests, privacy, ownership, and zero union residuals.
- **AC-16:** `just proof-project-runtime` passed against code-server 4.131.0 and BL-001. A full-gate episode observed 512 ms versus 15,000 ms, HTTP 200 `expired`, uid 1000, exact argv/path, loopback listener, reuse, unchanged fixture, unrelated-control survival, and exact cleanup.
- **AC-17:** `docs/project-runtime.md`, root/docs READMEs, harness inventory, justfile, runtime lifecycle core-component, and decision-log records 53-57 document the complete contract, commands, timing result, and every deferred boundary. Documentation contract tests pass.
- **AC-18:** Final `just verify` exited zero; API coverage was 88.59% statements, 80.34% branches, 86.29% functions, and 89.65% lines. The final standalone residual audit reported zero PID identities and zero listeners.

## Documentation impact

- Updated `README.md` and `docs/README.md` for the new internal capability and command discovery.
- Added `docs/project-runtime.md` for interface, configuration/defaults, launch/readiness, failures, cancellation, shutdown, events, validation, designated timing, operations, and deferred scope.
- Updated `.harness/engineering-harness.md` with the BL-010 signal and generated evidence inventory while retaining non-persistent boot.
- Updated `CORE-COMPONENT-260808-runtime-lifecycle-error-handling.md` and `ADR/DECISION-LOG.md` to encode the memory-only ownership, lowercase states, single-flight/reuse, cancellation, bounds, cleanup, and redaction contract established by Plan.
- No HTTP API specification changed because no route was added. No migration note is required because the four-field SQLite schema is unchanged. No deployment procedure changed beyond the documented executable/user prerequisites and validation commands.

## Validation evidence

- T-1: `just verify-focused apps/api/test/project-runtime-contract.test.ts apps/api/test/project-persistence-unit.test.ts` passed 14 tests; later contract run passed 4 tests after hardening.
- T-2: process-focused validation passed 13 tests; designated proof passed 1 real code-server episode.
- T-3: manager-focused validation passed 7 tests.
- T-4: lifecycle/API focused validation passed, with final lifecycle suite at 4 tests.
- T-5/T-7: `just verify-project-runtime` passed 28 tests; documentation-focused validation passed 2 tests.
- T-6/AC-18: designated proof passed, final residual audit returned `status: ok`, and `just verify` exited zero with 59 API files and 339 tests passed plus one deliberately delegated designated skip, the serial designated recipe passed, 7 web files passed, 5 Playwright tests passed with 1 designated presentation skip, builds passed, and both residual audits passed.

## Harness observations

Captured through `harness observe`: DL-268, DL-269, INS-050, DL-270 through DL-278, INS-051 through INS-053, and CONF-055. These retain the focused timeout, unavailable Python alias, net.Server API mismatch, formatting failures, coverage backtracking, transient designated health response, cross-test host-process contention, designated serialization/coverage conflict, and corrected fake-boundary formatting attempts.

Implementation evidence is recorded for Verify; final acceptance remains with Verify.
