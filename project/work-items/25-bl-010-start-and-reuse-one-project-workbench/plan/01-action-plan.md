# Action Plan: BL-010: Start and reuse one project workbench

## Feature
- **ID:** 25
- **Research Brief:** project/work-items/25-bl-010-start-and-reuse-one-project-workbench/research/00-research.md

## ADRs Created
- None. Existing accepted ADRs already select the host-native code-server, TypeScript/Fastify, SQLite metadata, and full-page presentation boundaries.

## Core-Components Created
- None.
- **Updated global artifact:** `CORE-COMPONENT-260808-runtime-lifecycle-error-handling` now resolves memory-only ownership, lowercase lifecycle vocabulary, single-flight/reuse, caller-only cancellation, bounded readiness/collision handling, exact cleanup, and shutdown semantics. Decision-log records 53-57 register the enforceable changes.

## Acceptance Criteria
- **AC-1:** A documented runtime-manager interface accepts a persisted project ID and canonical path, starts one code-server process as the configured non-root user, passes the exact canonical directory as one argument-vector item, binds only to loopback on a manager-selected available port, and returns a typed snapshot containing project ID, `starting`, `running`, or `failed` state, PID identity, internal URL and port, canonical path, `startedAt`, and `elapsedMs`; command, environment, credentials, and secrets are absent from the snapshot.
- **AC-2:** For this ticket, runtime process handles, PID identities, ports, and `starting`/`running`/`failed` state exist only in runtime-manager memory and project persistence remains metadata-only. Finite sentinel checks of the repository SQLite schema, project rows, database bytes, and captured structured events show that these runtime values are not persisted or logged wholesale.
- **AC-3:** Exactly eight concurrent start calls for one project before readiness invoke one spawn and one readiness sequence, and all eight resolve to snapshots identifying the same running process and port; subsequent starts while that process remains alive and passes the documented health check return the same PID identity and port without another spawn.
- **AC-4:** Port acquisition has no unprotected check-then-bind outcome: binding is delegated safely or address-in-use causes no more than a documented finite number of retries. A controlled collision leaves an unrelated listener alive on its original address, and exhaustion returns the documented address-in-use failure without killing, closing, or rebinding that listener.
- **AC-5:** Readiness uses a documented health request to the started code-server rather than a fixed sleep, accepts only the documented expected status and body, records each attempt timing, and enforces documented finite per-attempt and overall timeouts plus cancellation.
- **AC-6:** Unknown project, invalid persisted canonical-path invariant, spawn error, missing executable, early exit with code or signal, and address-in-use exhaustion each produce a distinct typed failure whose documented safe message identifies the failure category and a corrective or retry action.
- **AC-7:** Readiness timeout, unexpected health status, unexpected health body, caller cancellation, and manager shutdown each produce a distinct typed failure whose documented safe message identifies the failure category and a corrective or retry action.
- **AC-8:** Every failure retains only documented finite diagnostic fields and limits sufficient to distinguish its category, including exit code or signal when applicable; snapshots, diagnostics, messages, and events expose no command, environment, credentials, secrets, source or terminal content, command output, stack, raw internal error, or redaction sentinel.
- **AC-9:** Structured startup success and failure events contain project ID, state transition, `elapsedMs`, and a bounded failure classification when applicable. They exclude source or terminal content, command output, command and environment data, credentials, and secrets; a canonical path classified as sensitive by the documented logging policy is absent in raw form.
- **AC-10:** Every failed shared start settles all callers still participating in that attempt with the same typed failure, atomically removes or replaces its in-flight entry, terminates only an owned process group when one was started, records bounded evidence that its exact PID identity and listener are absent, and permits one later retry to create exactly one fresh runtime.
- **AC-11:** If an owned process exits after reaching `running`, it is removed from reusable-running state, one bounded failed/exit diagnostic is retained, and the next start creates one replacement runtime; no automatic retry loop starts.
- **AC-12:** The interface documentation defines whether caller cancellation ends only that caller wait or the shared start attempt. Finite cancellation evidence matches the documented choice and proves no duplicate process, owned orphan process or listener, stale completion mutation, or effect on a later retry.
- **AC-13:** Manager shutdown is bounded and idempotent, rejects or cancels in-flight starts with the manager-shutdown failure, gracefully stops every runtime process it owns, escalates only after a documented finite timeout, and confirms each exact owned PID identity and listener is absent while leaving an unrelated process and listener alive.
- **AC-14:** Bounded before-and-after manifests for disposable project fixtures show unchanged directory membership and file bytes after representative successful start and reuse, failed start cleanup and retry, post-running exit replacement, and manager shutdown scenarios.
- **AC-15:** Finite repository-controlled fake process and health fixtures cover exactly-eight-call single-flight concurrency, healthy reuse, port collision and unrelated-listener survival, every typed failure, caller and shutdown cancellation, early and post-running exits, failed-attempt retry, bounded diagnostics, redaction sentinels, exact process ownership, idempotent shutdown, and project-file integrity.
- **AC-16:** One designated real code-server validation, using the repository-provided BL-001 fixture and documented designated-host prerequisites, proves the expected health response, exact canonical-path argument item, configured process user, loopback-only listener, same PID identity and port on repeated start, and observed startup elapsed time compared with the 15-second target, then shuts down the manager and records fixture integrity plus exact owned PID/listener absence.
- **AC-17:** Documentation records the runtime-manager interface and ownership boundary, `starting`/`running`/`failed` state, configured executable and user, argument/path safety, loopback port ownership and retry bound, health contract and readiness bounds, single-flight and reuse behavior, typed failures and retry behavior, event fields and redaction, caller-cancellation ownership, shutdown escalation and cleanup bounds, exact validation commands, the real-host observed elapsed time versus the 15-second target, and all deferred boundaries named in the Problem.
- **AC-18:** Repository-configured focused and full validation commands exit zero, and a final bounded residual audit records that no PID identity or listener created by the validation remains.

## Acceptance Coverage

| AC | Implementation tasks | Tests / validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1, T-2 | V-1, V-2, V-6 | Exported interface/type assertions plus fake and real argv, user, listener, PID, URL, port, path, and timing records |
| AC-2 | T-1, T-5 | V-1, V-5 | Four-column schema/row inspection, database-byte scan, event scan, and no-runtime-persistence report |
| AC-3 | T-3, T-5 | V-3, V-6 | Eight-call counters showing one spawn/readiness sequence and one reused PID/port |
| AC-4 | T-2, T-5 | V-2 | Controlled collision/exhaustion matrix and unrelated-listener before/after identity |
| AC-5 | T-2, T-5 | V-2, V-6 | Health request attempt timings, status/body verdicts, cancellation, and finite timeout results |
| AC-6 | T-1, T-2, T-5 | V-1, V-2 | Typed failure table for unknown project, path invariant, spawn, executable, exit code/signal, and port exhaustion |
| AC-7 | T-1, T-2, T-4, T-5 | V-1, V-2, V-4 | Typed health/cancellation/shutdown failure table with fixed corrective messages |
| AC-8 | T-1, T-5 | V-1, V-5 | Diagnostic schema/limit assertions and forbidden-sentinel scans over snapshots, failures, events, and artifacts |
| AC-9 | T-1, T-4, T-5 | V-1, V-4, V-5 | Captured success/failure events with project/state/timing/classification and raw-path/secret absence |
| AC-10 | T-3, T-5 | V-3, V-4, V-5 | Shared-failure identity, settled-call count, atomic eviction, exact cleanup audit, and one-spawn retry |
| AC-11 | T-3, T-5 | V-3, V-5 | Post-running exit diagnostic, reusable-state eviction, zero automatic spawns, and replacement identity |
| AC-12 | T-3, T-5, T-7 | V-3, V-7 | Caller-only cancellation contract and finite stale-completion/orphan/duplicate/retry assertions |
| AC-13 | T-4, T-5 | V-4, V-5 | Repeated shutdown promise/result, in-flight shutdown failures, TERM/KILL timing, owned absence, and unrelated survival |
| AC-14 | T-5, T-6 | V-5, V-6 | Before/after fixture manifests for success, reuse, failure/retry, post-exit replacement, and shutdown |
| AC-15 | T-5 | V-1, V-2, V-3, V-4, V-5 | Repository-controlled fake fixture matrix covering every named behavior and exact-resource audit |
| AC-16 | T-6 | V-6 | Designated-host episode JSON with health, argv, uid/user, loopback listener, reuse, timing target comparison, integrity, and cleanup |
| AC-17 | T-7 | V-7 | Documentation contract assertions for interface, bounds, failures, events, validation, result, and every deferred boundary |
| AC-18 | T-7 | V-8 | Zero exits from focused/full recipes and final residual manifest with no validation-owned PID/listener |

**Coverage proof:** AC-1 through AC-18 each has at least one dependency-ordered implementation task, one finite test or validation entry, and one inspectable evidence consequence. No criterion is unmapped.

## Implementation Tasks
1. **T-1 — Define the persisted-project lookup and runtime contract (AC-1, AC-2, AC-6, AC-7, AC-8, AC-9).** Add ID lookup without schema expansion; define immutable snapshots, fixed failure categories/messages, finite diagnostics, executable/user/environment configuration, health/retry/shutdown limits, and safe event fields.
2. **T-2 — Implement direct process launch, guarded loopback-port selection, and bounded health readiness (AC-1, AC-4, AC-5, AC-6, AC-7).** Adapt only reusable proof primitives; do not turn the BL-001 proof state/log files into product state.
3. **T-3 — Implement the in-memory one-project manager state machine (AC-3, AC-10, AC-11, AC-12).** Key by persisted project ID, single-flight starts, health-check reuse, settle shared failures, evict exits, permit explicit retry, and make cancellation caller-local.
4. **T-4 — Integrate lifecycle ownership, shutdown, and structured events (AC-7, AC-9, AC-10, AC-13).** Construct one manager at the API application boundary and shut it down before persistence owners close; add no route or UI behavior.
5. **T-5 — Build deterministic fake lifecycle fixtures and the complete safety matrix (AC-2 through AC-15).** Cover concurrency, every failure, cancellation, collisions, ownership, retries, exits, redaction, persistence minimization, manifests, and shutdown.
6. **T-6 — Add one designated real code-server episode and residual audit (AC-1, AC-3, AC-5, AC-14, AC-16).** Reuse the BL-001 fixture and Linux `/proc` sensors, retain bounded evidence, and clean only exact owned resources.
7. **T-7 — Document and expose repository validation commands (AC-12, AC-17, AC-18).** Add the runtime runbook, README/harness signal and evidence updates, focused/designated/full recipes, observed 15-second comparison, deferred boundaries, and final residual audit.

## Scope Guard
- Keep stable proxy routes, Project Home Open wiring/navigation, multi-project coordination, user Stop/Restart UI, API-restart reconciliation, persisted runtime handles/state, auto-sleep, scheduling, containers, and broad lifecycle reconciliation out of Issue #25.
- Do not modify the selected full-page presentation decision or make harness boot persistent.
- Prefer a small in-process manager and injectable Node boundaries over a framework, daemon, queue, scheduler, or general process registry.
