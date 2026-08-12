# Task Breakdown: BL-010: Start and reuse one project workbench

Tasks are dependency ordered. Stable criterion text is preserved in `01-action-plan.md`.

## Task T-1: Define persisted lookup and the runtime contract

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-6, AC-7, AC-8, AC-9
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260810-sqlite-persistence-lifecycle

### Description
- Add `findById` through the existing persistence adapter/repository/library construction so the manager can prove an exact persisted ID/canonical-path pair without adding a migration or runtime field.
- Add a small runtime contract module for `starting`, `running`, and `failed` snapshots. Include project ID, PID plus process-start identity, loopback URL/port, canonical path, `startedAt`, and `elapsedMs`; expose none of the process command or environment.
- Define fixed typed categories for unknown project, canonical-path invariant, spawn error, missing executable, early exit code/signal, address exhaustion, readiness timeout, health status/body, caller cancellation, and manager shutdown. Give each fixed safe corrective/retry copy and a closed finite diagnostic schema.
- Define configuration and constants for executable, expected current non-root OS user, deterministic environment allowlist, three collision attempts, `/healthz` status/body contract, per-request health timeout, 15-second overall readiness, poll interval, and graceful/escalation shutdown bounds.

### Acceptance Criteria
- AC-1 snapshot fields and exclusions are compile-time and runtime validated.
- AC-2 persistence remains the existing four-field metadata model.
- AC-6/AC-7 categories are distinct and have fixed actionable messages.
- AC-8 diagnostics are closed, finite, and sentinel-safe.
- AC-9 events admit only project ID, transition, elapsed time, and bounded classification fields.

### Test Coverage
- Unit-test every snapshot/failure validator, message, diagnostic limit, configuration guard, and event serializer.
- Integration-test known, unknown, and same-ID/different-path lookup against isolated SQLite; inspect schema, row, and raw bytes for runtime sentinels.

### Expected Evidence
- Passing contract and lookup tests; exact exported type/key assertions; four-column SQLite report; bounded failure/event catalog with forbidden-value scan.

## Task T-2: Implement safe launch, loopback ports, and health readiness

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-1, AC-4, AC-5, AC-6, AC-7
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-filesystem-path-safety

### Description
- Create injectable process, port, health, clock, and exact-identity adapters; reuse narrowly applicable `/proc` and group-termination primitives rather than productizing BL-001 file-backed state.
- Verify the executable and current configured user, spawn directly with `detached: true`, an argument array, deterministic environment, canonical `cwd`, and the exact canonical directory once as the final argument.
- Select a loopback port through a bounded provider and guard the unavoidable reservation-to-child-bind race with at most three address-in-use retries. Each retry uses a new candidate and terminates only the failed owned group; unrelated listeners are never closed, rebound, or signaled.
- Poll `GET /healthz` with cancellation, finite per-attempt timeout, 15-second overall deadline, and recorded attempt timing. Accept only HTTP 200 and the documented JSON alive body; classify status and body mismatches distinctly.
- Track PID/start identity before cleanup, distinguish spawn, executable, early code/signal, collision exhaustion, timeout, status, body, cancellation, and shutdown outcomes, and discard child output after bounded internal classification.

### Acceptance Criteria
- AC-1 launch and snapshot evidence proves user, argv/path, loopback, PID identity, URL/port, and timing.
- AC-4 collisions are retried finitely and unrelated listeners survive unchanged.
- AC-5 readiness is health-based, body-aware, timed, and cancellable rather than sleep-based.
- AC-6/AC-7 process and readiness conditions retain their distinct typed outcomes.

### Test Coverage
- Fake-adapter and real loopback-fixture tests for spawn argv/environment, three collisions plus exhaustion, expected health, status/body mismatch, per-attempt timeout, overall timeout, cancellation, early code/signal, missing executable, and exact cleanup.

### Expected Evidence
- Spawn/health call records; collision matrix; readiness attempt timeline; exact PID/listener absence rows; unrelated-listener before/after identity; typed failure snapshots.

## Task T-3: Implement single-flight, reuse, retry, cancellation, and exit eviction

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-3, AC-10, AC-11, AC-12
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-filesystem-path-safety

### Description
- Implement one in-memory manager keyed by persisted project ID with separate in-flight and reusable-running entries and no database/file serialization.
- Join exactly concurrent starts to one shared launch/readiness promise; health-check an exact live running identity before reuse.
- Make `AbortSignal` cancel only its caller wait. The manager-owned shared operation continues and may satisfy other waiters; cancelled waiters cannot mutate later completion.
- On shared failure, settle all participating waiters with the same typed failure object/outcome, clean the exact owned group/listener, atomically evict the in-flight entry, and allow one later start to launch once.
- Subscribe to post-readiness exit, evict the reusable entry, retain one bounded failed/exit diagnostic, and require a later explicit start for replacement without an automatic loop.

### Acceptance Criteria
- AC-3 eight callers observe one spawn/readiness and the same running identity; healthy reuse adds neither spawn nor readiness sequence.
- AC-10 shared failure is identical, fully settled, exactly cleaned, evicted, and retryable.
- AC-11 post-running exit prevents reuse and automatic restart, then permits one replacement.
- AC-12 caller cancellation is local, leaves no duplicate/stale mutation, and preserves manager ownership and later start semantics.

### Test Coverage
- Barrier-controlled tests for exactly eight starts, healthy reuse, one/many caller cancellations, all-waiter cancellation, shared failure identity, failed retry, post-running code/signal exit, no automatic spawn, and stale-completion suppression.

### Expected Evidence
- Deterministic spawn/readiness/health counters; caller result matrix; entry-state trace; failed/replacement PID identities; exact cleanup and zero-auto-retry assertions.

## Task T-4: Integrate manager ownership, shutdown, and lifecycle events

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3
- **Acceptance Criteria:** AC-7, AC-9, AC-10, AC-13
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260808-host-process-environment

### Description
- Construct and decorate exactly one runtime manager at the Fastify application boundary. Add no product HTTP route, browser action, proxy, or navigation.
- Register shutdown before persistence-owner close: reject new starts, abort shared readiness as manager-shutdown, gracefully terminate each exact owned group, escalate after the documented bound, audit PID/listener absence, then permit registration/library/telemetry closure.
- Memoize shutdown so repeated direct calls and repeated server-stop signals join one bounded operation; preserve failure-shaped cleanup results.
- Emit `runtime.start.requested`, `runtime.start.succeeded`, `runtime.start.failed`, and needed health/exit transitions with project ID, from/to state, `elapsedMs`, and bounded classification only.

### Acceptance Criteria
- AC-7 manager shutdown has a distinct actionable failure.
- AC-9 captured lifecycle records have complete allowed fields and no raw canonical path or protected content.
- AC-10 cleanup remains exact even when shared startup fails during application lifecycle.
- AC-13 repeated shutdown is idempotent, bounded, cancellation-aware, exact-owner-only, and leaves unrelated controls alive.

### Test Coverage
- Application construction/close tests, repeated shutdown tests, in-flight start shutdown, cooperative and TERM-ignoring children, unrelated process/listener controls, ordering spies, and structured-event allowlist/denylist assertions.

### Expected Evidence
- One-manager construction counts; shutdown ordering/timing trace; TERM-to-KILL escalation record; exact absence audit; unrelated survival record; captured structured event set.

## Task T-5: Build the complete deterministic fake and safety matrix

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3, T-4
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-filesystem-path-safety; CORE-COMPONENT-260810-sqlite-persistence-lifecycle

### Description
- Extend repository-controlled fake process/health fixtures with deterministic modes for ready, collision, exhaustion, spawn error, missing executable, early code/signal, timeout, status/body mismatch, post-running exit, ignored TERM, and controlled cancellation.
- Build one finite matrix that covers exactly-eight single flight, reuse, every typed failure, caller/shutdown cancellation, failed retry, post-running replacement, bounded diagnostics, redaction sentinels, exact group/listener ownership, idempotent shutdown, and unrelated survival.
- Capture recursive fixture membership and byte hashes before/after successful reuse, failed cleanup/retry, post-exit replacement, and shutdown.
- Inspect SQLite schema/rows/bytes and captured events for all runtime and redaction sentinels.

### Acceptance Criteria
- AC-15 names every required fake case and each has an executed consequence.
- AC-14 all representative manifests are equal.
- AC-2/AC-8/AC-9 minimization and redaction scans are clean.
- AC-3 through AC-13 have deterministic fake evidence independent of designated-host code-server.

### Test Coverage
- Focused Vitest suites grouped by contract, process/readiness, manager, lifecycle/shutdown, minimization, integrity, and residual auditing; no nondeterministic sleeps or unconstrained polling.

### Expected Evidence
- Verbose focused-test output and generated finite matrix JSON containing case names, bounds, result categories, counters, manifest hashes, ownership audits, and sentinel scan totals.

## Task T-6: Add the designated real code-server episode and residual audit

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-1, AC-3, AC-5, AC-14, AC-16
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-filesystem-path-safety

### Description
- Add one bounded designated-host command using code-server 4.131.0, the BL-001 metacharacter fixture, configured `vscode` user, and Linux `/proc` process/listener sensors.
- Start through the product manager, verify `/healthz`, exact canonical final argv item, effective/real uid, loopback-only listener, repeated-start PID/port reuse, and startup elapsed time recorded as observed against—not silently promoted to—the 15-second target.
- Always shut down in `finally`, compare fixture manifests, prove exact owned PID/start identity and listener absence, and separately prove an unrelated control survives.
- Write one bounded episode artifact without command output, environment, secrets, or source/terminal content; end with a union residual audit of every identity/listener created by the episode.

### Acceptance Criteria
- AC-16 contains every required real-host observation and cleanup consequence.
- AC-1/AC-3/AC-5 real behavior agrees with the fake-backed contract.
- AC-14 the designated fixture remains byte-identical.

### Test Coverage
- Designated prerequisite tests and one no-retry episode; artifact-contract and cleanup tests run without fabricating a passing episode when prerequisites fail.

### Expected Evidence
- `test-results/bl-010/project-runtime/episode.json` with host/version, health, argv/user/listener, reuse, elapsed/target comparison, fixture hashes, shutdown, unrelated survival, and zero residuals.

## Task T-7: Document commands, boundaries, and final validation

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-5, T-6
- **Acceptance Criteria:** AC-12, AC-17, AC-18
- **Related ADRs:** ADR-260808-governed-engineering-harness; ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260808-development-standards; CORE-COMPONENT-260808-engineering-harness-delivery-contract; CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
- Add `docs/project-runtime.md` and update `docs/README.md` with interface/ownership, state, executable/user, argument/path safety, loopback/retry, health/readiness, single-flight/reuse, fixed failures/retry, events/redaction, caller-local cancellation, shutdown escalation/cleanup, exact commands, and the observed real elapsed result versus 15 seconds.
- State every deferred boundary exactly: stable route/proxy, Home navigation/Open wiring, multi-project coordination, user Stop/Restart UI, API-restart reconciliation, persisted handles/state, auto-sleep, scheduling, and containers.
- Add root `justfile` recipes for focused runtime validation, designated proof, and residual audit; keep `just verify` authoritative and harness checks delegated to it. Update harness signal/evidence inventory without making boot persistent.
- Run focused then full validation and a final standalone residual audit. Record architecture/documentation evidence in the implementation handoff.

### Acceptance Criteria
- AC-12 documentation matches caller-local cancellation behavior.
- AC-17 all named documentation clauses and exact commands are present and tested.
- AC-18 focused/full commands exit zero and the final residual audit reports no owned PID/listener.

### Test Coverage
- Documentation contract tests; recipe discovery/delegation tests; focused runtime gate; full `just verify`; final bounded residual audit.

### Expected Evidence
- Passing documentation tests; `just --list` entries; zero-exit focused/full transcripts; designated observed timing; final residual JSON; implementation documentation-impact record.
