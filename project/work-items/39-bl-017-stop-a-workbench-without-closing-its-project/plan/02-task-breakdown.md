# Task Breakdown: BL-017 Stop a Workbench Without Closing Its Project

Revision 5. Tasks are dependency ordered. Every task is implemented inside the boundaries of `ADR-260815-selected-runtime-stop-control`, `ADR-260815-termination-sequencer-boundary`, the amendment to `ADR-260815-public-runtime-state-projection`, and the three updated core-components. A required deviation returns to the Plan stage instead of being absorbed in code. All behavioral decisions, type names, signatures, member sets, status codes, scenario names, and cardinalities are already fixed in `01-action-plan.md`; Implement executes them and does not design.

## Task T-1: Extend the runtime contract with entry states, transition targets, stop vocabulary, and bounds

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260815-termination-sequencer-boundary, ADR-260815-public-runtime-state-projection
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-development-standards

### Description
Extend `apps/api/src/project-runtime-contract.ts` only, with no manager, process, or route behavior:

1. Export `RUNTIME_ENTRY_STATES = ['registered', 'starting', 'running', 'stopping', 'failed']` (frozen, 5 members) and `RuntimeEntryState`. Leave `RUNTIME_STATES` at exactly its three snapshot states and `PUBLIC_RUNTIME_STATES` at exactly four frozen values. `RuntimeSnapshot.state` is unchanged.
2. Change `publicRuntimeState` to accept `RuntimeEntryState | undefined` and return `'Running'` for `'stopping'`, keeping `undefined` and `'registered'` at `'Stopped'`.
3. Export `RUNTIME_LIFECYCLE_TARGETS = ['starting', 'running', 'failed', 'stopping', 'stopped']` (frozen, 5 members) and `RuntimeLifecycleTarget`. Set `RuntimeLifecycleEvent['to']` and `RuntimeLifecycleEvent['from']` to `RuntimeLifecycleTarget`. Add `publicRuntimeStateForLifecycleTarget(to)` mapping `stopped` to `Stopped`, `stopping` to `Running`, and delegating the three snapshot states to `publicRuntimeState`; make `publicRuntimeStateForLifecycleEvent` consume it instead of `publicRuntimeState(to)`.
4. Add `'runtime.stop.requested'` and `'runtime.stop.succeeded'` to `RuntimeLifecycleEvent['event']` (6 total) and add `'runtime.stop.requested': 'Running'` and `'runtime.stop.succeeded': 'Stopped'` to `PUBLIC_STATE_BY_LIFECYCLE_EVENT`.
5. Add `'stop-unconfirmed'` and `'runtime-stopping'` to `RUNTIME_FAILURE_CATEGORIES` (12 to 14) with safe `RUNTIME_FAILURE_MESSAGES` entries that name no path, port, PID, command, or host detail. Add no diagnostics key.
6. Add frozen `RUNTIME_STOP_OUTCOMES = ['stopped', 'already-stopped', 'rejected']` (3) and `RUNTIME_STOP_REJECTION_CATEGORIES = ['not-registered', 'no-managed-runtime', 'start-in-progress', 'failure-retained', 'stop-unconfirmed', 'manager-shutdown']` (6), plus the `RuntimeStopOutcome` union exactly as specified in the action plan, with `release` and `audit` present only on the trusted in-process shape.
7. Add `stopAuditAllowanceMs` to `PROJECT_RUNTIME_DEFAULTS` (1,000) and to `ProjectRuntimeConfig` / `createProjectRuntimeConfig` with the same positive-safe-integer validation as its siblings, and export a pure `runtimeStopOverallBoundMs(config)` returning `gracefulShutdownMs + forceShutdownMs + stopAuditAllowanceMs`.
8. Export `RuntimeStopInvariantError` as a distinct `Error` subclass carrying no protected value, used only by the stop settlement's claim-ownership check.

Introduce no environment variable, flag, persisted field, or diagnostics field. Do not change `RuntimeSnapshot`, `RuntimeFailure` diagnostics filtering, `serializeRuntimeEvent`, `stableProjectRoute`, or `deriveProjectOwnerToken`.

### Files and Surfaces
- `apps/api/src/project-runtime-contract.ts`
- `apps/web/src/runtime-state.ts` (mirror the two new bounded failure categories and add their client-owned `RUNTIME_FAILURE_NOTICES` text, keeping both lists at 14)

### Acceptance Criteria
- AC-1: the stop rejection vocabulary is frozen, exhaustive, contains `no-managed-runtime` as a non-success member, and contains no unbounded or free-text member.
- AC-2: the graceful, force, audit-allowance, and overall bounds are derivable from configuration as positive safe integers and are rejected when non-positive.
- AC-3 and AC-4: `publicRuntimeState` maps `'stopping'` to `'Running'`, keeps `undefined` and `'registered'` at `'Stopped'`, and adds no fifth public value; `stopped` is reachable only as a lifecycle transition target.
- AC-6: every new value is exported for validation and covered by an exhaustiveness assertion.

### Test Coverage
- Unit tests over `publicRuntimeState` for every member of `RUNTIME_ENTRY_STATES` plus `undefined`, asserting exhaustiveness and that `PUBLIC_RUNTIME_STATES` still has exactly four members and `RUNTIME_STATES` exactly three.
- Unit tests over `publicRuntimeStateForLifecycleTarget` for all five targets, including `stopped` to `Stopped`, and a compile-time-plus-runtime assertion that `stopped` is not a member of `RUNTIME_ENTRY_STATES` or `RUNTIME_STATES`.
- Unit tests over `publicRuntimeStateForLifecycleEvent` for all six catalog events and a negative case where a mismatched target throws.
- Unit tests asserting the frozen stop outcome (3) and rejection (6) vocabularies, the 14 failure categories, and a safe message for each new category with zero protected-value matches.
- Unit tests over `createProjectRuntimeConfig` for `stopAuditAllowanceMs`: default, override, and rejection of zero, negative, and non-integer values; and over `runtimeStopOverallBoundMs`.
- Web unit test asserting the API and web failure-category lists are identical at 14 and that every category has notice text.
- Updates to `apps/api/test/runtime-state-contract.test.ts` and `apps/api/test/runtime-state-events.test.ts` so their delivered BL-016 assertions cover the entry-state vocabulary, the transition-target mapping, and all six catalog events instead of asserting a four-event vocabulary that is no longer complete.

### Documentation Impact
None directly; T-13 documents the vocabulary, counts, and bounds.

### Expected Evidence
V-1 contract results: the entry-state and transition-target mapping tables, the frozen vocabularies with member counts, the bound table with defaults and rejections, and a zero-match protected-value scan over every new message and notice string; V-6 event-to-public-state agreement for all six catalog events.

## Task T-2: Introduce the injectable termination sequencer boundary

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-6
- **Related ADRs:** ADR-260815-termination-sequencer-boundary, ADR-260815-selected-runtime-stop-control
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-filesystem-path-safety

### Description
Restructure `apps/api/src/project-runtime-process.ts` so the shipped termination sequence is executable by validation, exactly as specified in the action plan's "Termination sequencer boundary" section:

1. Export `RuntimeTerminationPrimitives` with the seven exact shapes fixed in the action plan, in their two trust classes: the four fallible awaited primitives `readProcessStartTime(pid, signal)`, `readProcessGroupMembers(processGroupId, signal)`, `listenerIsAbsent(port, signal)`, and `delay(milliseconds, signal)` are asynchronous with a required `AbortSignal`; the three trusted synchronous primitives `signalProcessGroup(processGroupId: number, signal: NodeJS.Signals): boolean`, `now(): number`, and `scheduleDeadline(milliseconds, onDeadline): () => void` return no promise, `scheduleDeadline` takes no `AbortSignal`, `signalProcessGroup` reports whether its signal was delivered, and `now()` is a monotonic elapsed-time reading rather than a wall-clock timestamp. Export `defaultRuntimeTerminationPrimitives` implementing the cancellation contract over the delivered `/proc`, `net`, and `process.kill` implementations, over `performance.now()` from `node:perf_hooks` as the monotonic `now()`, and over `setTimeout`: pass `{ signal }` to the `/proc/<pid>/stat` read and rethrow an abort error instead of mapping it to `null`; call `signal.throwIfAborted()` before each entry of the `/proc` directory scan and throw rather than return a partial member list; destroy the loopback socket and throw on abort rather than resolve `true`; resolve `delay` on timer elapse or abort while always clearing the timer; implement `scheduleDeadline` as `const timer = setTimeout(onDeadline, Math.max(0, milliseconds)); return () => { clearTimeout(timer) }`, a native timer owned directly by the sequencer that is cleared on every exit path; implement `signalProcessGroup` as `try { process.kill(-processGroupId, signal); return true } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false; throw error }`, replacing the delivered bare `catch {}` so only the expected target-gone race is tolerated; and implement `now` as `() => performance.now()`. Keep `readProcessStartTime` and `loopbackListenerIsAbsent` exported with unchanged non-abort behavior. Leave `RuntimeProcessDependencies.now`, `fetchRuntimeHealthAdapter`'s elapsed measurement, `launchReadyRuntime`'s identity deadline, and every other delivered `Date.now()` use exactly as they are; only the termination primitive's clock moves.
2. Replace the private `terminateGroup` with the exported `terminateOwnedRuntimeGroup(request)` taking `{ pid, processStartTime, port, gracefulMs, forceMs, auditAllowanceMs, signal?, primitives? }`. It stays the only definition of graceful-then-force sequencing. Express process-group absence as `readProcessGroupMembers(pid).length === 0` and thread primitives through `auditRuntimeResource`.
3. Add `createNodeRuntimeProcessAdapter(primitives = defaultRuntimeTerminationPrimitives)` and keep `nodeRuntimeProcessAdapter` as the production default it produces, still used by `defaultRuntimeProcessDependencies`. Bind the launching `config.stopAuditAllowanceMs` into every `terminate` and `audit` closure the adapter creates.
4. Widen `OwnedRuntimeProcess.terminate` to `(gracefulMs, forceMs, port, signal?)`. Existing call sites keep their arguments; existing fakes remain assignable.
5. Implement the sequencer self-bound exactly as fixed in the action plan: the synchronous entry check that aborts and returns `unconfirmed` when `request.signal?.aborted` is already true, before any audit, identity read, signal, wait, or deadline arming and with no primitive call other than `now()`; one `sequencerController` aborted by the caller's later abort listener, the overall deadline callback, and the sequencer's own `finally`; the overall deadline armed once through `primitives.scheduleDeadline` and never through an awaited primitive; one internal `bounded(deadlineAt, call)` helper that short-circuits on an aborted controller or an elapsed deadline, arms its per-call deadline through the same trusted scheduler, races the call against a call-scoped abort chained to the sequencer controller, detaches the pending promise with an inert settlement handler, and returns an explicit not-completed marker; no awaited primitive call outside `bounded`; `primitives.delay` used only as the poll interval, never as a deadline trigger; propagation of a pre-abandonment primitive rejection; an audit that returns `undefined` when any component did not complete; a retained `lastCompletedAudit`; a non-confirming all-false audit when no audit completed; and release of every scheduler handle and abort listener in `finally` so no timer, listener, or unhandled rejection survives the return.
6. Implement the phase windows and the seven-step sequence exactly as fixed in the action plan: `settlementAllowanceMs = Math.max(1, Math.floor(auditAllowanceMs / 10))` and `preSignalAllowanceMs = auditAllowanceMs - settlementAllowanceMs`; `preSignalDeadlineAt = startedAt + preSignalAllowanceMs` bounding the initial audit and the identity read; the pre-signal gate that returns `unconfirmed` with no signal when that observation did not complete or the allowance elapsed; `gracefulDeadlineAt = sigtermAt + gracefulMs` and `forceDeadlineAt = sigkillAt + forceMs`, each fixed from a `primitives.now()` reading taken in the same synchronous step in which its own `signalProcessGroup` call returned `true`; no window opened without its own confirmed delivered signal; a `false` graceful send that reads `gracefulRefusedAt` in that same step, performs exactly one `bounded(gracefulRefusedAt + gracefulMs, audit)` call and no poll loop, returns `already-absent` only on a completed confirming audit and `unconfirmed` otherwise, and attempts no escalation; a `false` force send that returns `unconfirmed` immediately with no force window; a thrown `signalProcessGroup` error propagated out of the sequencer after `finally` releases every handle and listener, so the manager settles it through the documented termination-fault path; every phase, deadline, and elapsed comparison read only from the monotonic `primitives.now()`; no audit started after `forceDeadlineAt`; the overall deadline `startedAt + gracefulMs + forceMs + auditAllowanceMs` measured on `primitives.now()`; the poll interval `RUNTIME_TERMINATION_POLL_INTERVAL_MS = 20` passed to `primitives.delay` through `bounded` at the current phase deadline; cancellation checks on entry, before every wait, and in the same synchronous step as every signal send; the `attributable` rule that permits a group signal only while the exact root identity has been observed alive from a completed read and the owned group has not since been observed empty; and the fourth outcome `'unconfirmed'`.
7. Add `'unconfirmed'` to `RuntimeTerminationOutcome` and keep `RuntimeResourceAudit` and `RuntimeTerminationAudit` shapes, field names, and `processGroupAbsent` semantics unchanged.

Do not add a second sequencer, a second bounding mechanism, a retry loop, a detached timer that survives the call, a deadline armed from an awaited primitive, a phase deadline computed from sequencer entry rather than from its own delivered signal, a signal primitive that returns nothing or swallows an unexpected `kill` error, a phase window or escalation opened by a refused signal, a poll loop on the refused-graceful-signal path, a wall-clock source for any termination phase or deadline value, a change to any unrelated `Date.now()` use, a fifth termination outcome, a defaulted or partially completed audit, a name- or port-based sweep, or any new environment variable or configuration field. Do not remove the manager-side backstop in favour of this self-bound: both enforcement points ship. Do not change `launchReadyRuntime`'s readiness contract, the port provider, the health adapter, `buildRuntimeArgv`, or the user-data directory lifecycle.

### Files and Surfaces
- `apps/api/src/project-runtime-process.ts`
- `apps/api/src/project-runtime-manager.ts` (only the `terminate` call on the new stop path passes a signal; delivered call sites are unchanged)

### Acceptance Criteria
- AC-1: no signal is sent to a process group whose owning root identity is not currently attributable, every audit reports the exact root identity, owned-group membership, and listener state, and a send the host refuses is never recorded as a delivered signal while an unexpected signalling failure is surfaced as a termination fault.
- AC-2: the full `gracefulMs` elapses on the monotonic termination clock between the confirmed delivered `SIGTERM` and any `SIGKILL` send, so `sigkillAt - sigtermAt >= gracefulMs` on every delivered escalation, and the full `forceMs` window follows the confirmed delivered `SIGKILL`; a refused graceful send opens no window and settles from one bounded settlement audit, a refused force send returns `unconfirmed` at once, and neither is recorded as a delivered signal or an escalation; the sequence settles within `gracefulMs + forceMs + auditAllowanceMs` measured on the injected clock even when any awaited primitive — including the poll `delay` — never settles or ignores its signal, because the deadline is armed by the trusted scheduler and that call is abandoned; pre-signal observation that exceeds its allowance sends no signal and returns `unconfirmed`; a caller signal already aborted on entry settles immediately with no primitive call other than the clock read; and a cancelled, deadline-expired, or abandoned sequence sends no further signal and produces no confirmation.
- AC-6: every branch, bound, and signal is executable through injected primitives with no host process.

### Test Coverage
- Sequencer tests over injected primitives asserting: `already-absent` with zero signals; graceful confirmation with exactly one `SIGTERM` and zero `SIGKILL`; escalation whose recorded signal timestamps satisfy `sigkillAt - sigtermAt >= gracefulMs` on the injected clock and whose settlement is within the overall bound; `unconfirmed` when neither window confirms; settlement at the overall deadline when audits are slow; zero signals after cancellation; and zero signals when the root identity was never observed alive.
- Self-bound tests asserting that a primitive which **never settles** — a listener probe, an owned-group read, an identity read, and the poll `delay`, each exercised separately — still settles the sequencer at its overall deadline on the injected clock with `unconfirmed`, records the abandoned call, sends no signal after the deadline, and derives no absence from the incomplete audit.
- A test using a primitive that **ignores its cancellation signal entirely**, exercised separately for the poll `delay` and for one read, asserting the same settlement, proving the bound depends on no awaited primitive's cooperation and that the deadline is fired by `scheduleDeadline`.
- A test asserting that `terminateOwnedRuntimeGroup` never arms a deadline from `primitives.delay`: an injected primitive set whose `delay` never settles still settles the sequence, and the recorded call log shows the abort originating from the scheduler.
- A test asserting a caller signal that is **already aborted on entry** settles immediately as `unconfirmed` with the non-confirming audit, zero signals, zero waits, and no primitive call other than `now()`, alongside the retained mid-sequence abort case.
- Phase-window tests asserting that pre-signal observation consuming most of `preSignalAllowanceMs` still yields a full `gracefulMs` between the recorded `SIGTERM` and `SIGKILL` and a full `forceMs` after that `SIGKILL`, with settlement still within `gracefulMs + forceMs + auditAllowanceMs`.
- A test asserting pre-signal observation that exceeds `preSignalAllowanceMs`, and pre-signal observation that is abandoned, each return `unconfirmed` with zero signals and no graceful window opened.
- A test asserting the escalation gate refusal path returns `unconfirmed` immediately instead of waiting out a force window that was never opened, and that no audit is started after `forceDeadlineAt`.
- A test asserting the abandoned primitive's later resolution or rejection performs no signal, mutation, audit record, or unhandled rejection after the sequencer returned, and that no scheduler handle or abort listener survives the return.
- A test asserting a sequence in which no audit ever completes returns the non-confirming all-false audit with `unconfirmed` and is never classified as a confirmed release.
- A test asserting a primitive rejection that arrives before the deadline propagates out of the sequencer instead of being swallowed or converted into an absence.
- Deterministic signal-delivery tests: a graceful send whose primitive returns `false` performs exactly one bounded settlement audit, opens no graceful window, records no delivered signal, attempts no escalation, and returns `already-absent` when that audit confirms and `unconfirmed` when it does not or does not complete; a force send whose primitive returns `false` returns `unconfirmed` immediately with no force window, no recorded force signal, and no `escalated` outcome; and a send whose primitive throws an unexpected error propagates that error out of the sequencer with no swallowed failure, no success-shaped audit, no surviving timer, and no surviving abort listener.
- A test asserting `escalated` is unreachable without a `true` force send and `graceful` unreachable without a `true` graceful send, over the full branch matrix of delivered, refused, and faulted sends.
- Tests asserting the production primitives honour their contract: the `/proc` reads and the loopback probe reject on abort rather than reporting absence, the `/proc` directory scan never returns a partial member list, `delay` clears its timer on abort, `signalProcessGroup` returns `true` for a delivered signal, returns `false` for an `ESRCH` target-gone error, and rethrows any other `process.kill` error, and `now()` is bound to the monotonic `performance.now()` rather than `Date.now`.
- A monotonicity test asserting successive production `now()` readings never decrease and that the sequencer's phase and deadline arithmetic reads only `primitives.now()`, so no wall-clock adjustment can move an escalation point; and a regression test asserting `RuntimeProcessDependencies.now`, the health adapter's elapsed measurement, and the launch identity deadline still use their delivered wall clock.
- A test exercising the real production `defaultRuntimeTerminationPrimitives.scheduleDeadline` wiring on real timers: `onDeadline` runs once and no earlier than the requested delay, the returned handle prevents any later invocation, and a cancelled handle leaves no pending timer.
- A test asserting the ordered primitive call log matches the documented sequence, including that every signal is immediately preceded by an identity read.
- Tests asserting `createNodeRuntimeProcessAdapter()` and `nodeRuntimeProcessAdapter` are behaviorally identical and that `defaultRuntimeProcessDependencies.process` is the production default.
- A test asserting the adapter binds `config.stopAuditAllowanceMs` into `terminate` so a caller cannot omit the bound.
- Regression tests asserting the delivered BL-010 termination behavior and audit shape are unchanged for the three existing outcomes.

### Documentation Impact
Feeds the runtime runbook bounds, attribution, and ceiling sections in T-13.

### Expected Evidence
V-2 sequencer rows with the ordered primitive call log, signal counts by kind, the recorded `signalDelivery` classes and `signalFault` flag, the recorded `signalTimeline` proving `sigkillAt - sigtermAt >= gracefulMs` and a full force window after `sigkillAt`, the monotonic clock positions of each delivered signal relative to the declared bounds, the recorded `deadlineSource` of `trusted-scheduler` and `clockSource` of `monotonic`, the refused-graceful, refused-force, and signal-fault branch records, the pre-aborted-entry record, abandoned-call and discarded-audit counts, zero surviving timers and zero unhandled rejections, the settled outcome, and the audit triple; V-10 committed matrix rows 20, 21, 22, and 23.

## Task T-3: Implement the manager-owned selected stop, exact claim, settlement, and invariant

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260815-termination-sequencer-boundary
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-host-process-environment

### Description
Add `stop(input: { readonly projectId: string }): Promise<RuntimeStopOutcome>` to the `ProjectRuntimeManager` interface and implementation in `apps/api/src/project-runtime-manager.ts`, plus the internal `StoppingEntry` variant and the `RegisteredEntry.released` marker, exactly as specified in the action plan's state machine, claim, release, settlement, and invariant rules.

Required shape:
1. Add `readonly released: boolean` to `RegisteredEntry`; `register()` installs `released: false`. Make `ProjectRuntimeEntryState` an alias of the exported `RuntimeEntryState` and let `inspectEntries` report `stopping`.
2. Return `rejected` `manager-shutdown` when `shuttingDown`.
3. `await dependencies.findProjectById(projectId)`; return `rejected` `not-registered` when undefined. Let an infrastructure rejection propagate.
4. In one synchronous section, read `entries.get(projectId)` and dispatch: absent or `registered` with `released: false` to `rejected` `no-managed-runtime` without mutating the map; `registered` with `released: true` to `already-stopped` without mutating the map; `starting` to `rejected` `start-in-progress`; `failed` to `rejected` `failure-retained`; `stopping` to joining `entry.operation`; `running` to the claim.
5. The claim builds the deferred `operation` first, then installs `StoppingEntry` reusing the running entry's exact `generation`, `ready`, `canonicalPath`, and pre-stop `snapshot`, following the existing `StartingEntry` construction shape. No `await` may occur between the entry read and `entries.set`.
6. Emit exactly one `runtime.stop.requested` (`from: 'running'`, `to: 'stopping'`, elapsed from the pre-stop snapshot) at claim time, and track the operation in the existing tracked-task discipline so `shutdown()` can await it.
7. The operation awaits `ready.process.terminate(config.gracefulShutdownMs, config.forceShutdownMs, ready.port, terminationController.signal)` exactly once, raced against `processDependencies.sleep(runtimeStopOverallBoundMs(config), deadlineController.signal)`. Abort the losing timer or termination as specified. Call `recordCleanup` exactly once, and only when a termination audit exists.
8. Confirmed release (`processAbsent && processGroupAbsent && listenerAbsent`, any `release` including `already-absent`): delete that generation's ownership record, install `{ state: 'registered', projectId, canonicalPath, released: true }`, emit exactly one `runtime.stop.succeeded` (`from: 'stopping'`, `to: 'stopped'`), and resolve `{ outcome: 'stopped', projectId, release, audit }`.
9. Unconfirmed release: retain the ownership record, install a `failed` entry with `RuntimeFailure('stop-unconfirmed')` and the pre-stop snapshot, emit exactly one `runtime.health.changed` (`from: 'stopping'`, `to: 'failed'`, classification `stop-unconfirmed`), and resolve `{ outcome: 'rejected', projectId, category: 'stop-unconfirmed', release, audit }`.
10. Termination fault: record no cleanup audit, settle exactly as an unconfirmed release, then reject with the underlying failure. Termination deadline: abort the termination signal, record no cleanup audit, settle exactly as an unconfirmed release, resolve `{ outcome: 'rejected', category: 'stop-unconfirmed' }`, attach a handler to the abandoned termination that records nothing, mutates nothing, and emits nothing while incrementing a `lateTerminationSettlements` counter added to `ProjectRuntimeManagerAudit`.
11. Claim-ownership invariant: before installing any terminal entry, confirm `entries.get(projectId)` is the exact `stopping` object created by this operation. On mismatch install nothing, record no further cleanup, emit nothing, and reject with `RuntimeStopInvariantError`; joined callers receive the same rejection. Every owned settlement emits exactly one terminal event.

Reuse `recordCleanup`, `failEntry`, `ownershipKey`, `emit`, and `freezeSnapshot`. Do not duplicate the sequencer, add a second ownership index, add retry, launch a replacement, mutate persisted metadata, or touch any project directory. Do not change `transitionRunningToFailed`, `reportPublicStates`, `inspect`, `ownsSnapshot`, `lastFailure`, `lastCleanup`, or `register` beyond the `released` marker.

The stop path settles a `stopping` entry, not a `running` entry, so it MUST NOT call `transitionRunningToFailed`: the delivered BL-016 source guard requires exactly one definition and exactly three call sites of that helper (two with `current`, one with `entry`), and adding a fourth call would fail `just verify-runtime-state`. Likewise the existing `validatePublicReportingSource` guard requires `reportPublicStates` to keep exactly one `entries.get(` read, so no stop bookkeeping may be added to the projection.

### Files and Surfaces
- `apps/api/src/project-runtime-manager.ts`

### Acceptance Criteria
- AC-1: success occurs only for the selected project's own claimed generation with a confirmed audit triple; a request that resolves to no manager-owned runtime returns `no-managed-runtime`; every non-resolving request returns a bounded classification within the finite bound and mutates no entry, metadata, peer, control, or fixture.
- AC-2: escalation is attempted only after the graceful period, every accepted stop settles within the overall bound including the fault and deadline paths, and an unconfirmed release returns an explicit non-success without reporting `Stopped`.
- AC-3: after a confirmed stop the entry is `registered` with `released: true`, so the projection reports `Stopped` while persisted metadata is untouched.
- AC-4: a repeated stop of a project released by a confirmed stop returns `already-stopped` without creating or terminating an identity, without a restart, and without mutating the map.
- AC-5: a stop touches only its own key and its own owned process group.
- AC-6: every path is reachable through injectable dependencies with no host process.

### Test Coverage
- Manager tests for each state-machine row, asserting the result, the entry after settlement, the projected public state, the cleanup-audit count, the terminate-call count, and the emitted-event sequence.
- Tests asserting `no-managed-runtime` for an absent entry and for a `registered` entry with `released: false`, and `already-stopped` only after a confirmed stop, each performing zero `terminate`, `audit`, `isAlive`, `health`, `port`, and `launch` calls and leaving `manager.audit!()` counters unchanged.
- A repeated-stop test performing one confirmed stop then three further stops and asserting identical `already-stopped` results, zero further cleanup records, zero events, and `Stopped` after each.
- Tests asserting escalation ordering against the injected sequencer primitives and settlement inside the overall bound.
- Tests asserting an unconfirmed release retains `Failed` with `stop-unconfirmed`, keeps its ownership record, and never reports `Stopped`.
- A test asserting a rejecting `terminate` settles `failed` with `stop-unconfirmed`, emits exactly one `runtime.health.changed`, records zero cleanup audits, retains ownership, rejects with the underlying failure, and leaves no entry in `stopping`.
- A test asserting a never-settling `terminate` settles at the overall bound with `stop-unconfirmed`, aborts the termination signal, increments `lateTerminationSettlements` when the abandoned promise settles, and applies no later mutation, cleanup, or event.
- A unit test of the settlement claim-ownership decision asserting that a mismatched installed entry yields the invariant classification, plus a manager test asserting the invariant path installs nothing, emits nothing, records no extra cleanup, and rejects.
- A test asserting the pre-stop snapshot, PID, port, and internal URL never appear in the returned public projection of the result.

### Documentation Impact
None directly; T-13 documents the operation, state machine, and bounds.

### Expected Evidence
V-3 rows per state-machine case with result, entry-after, public state, cleanup count, and terminate-call count; V-6 ordered event tables with per-path cardinality for every accepted, owned, unowned, and rejected settlement; V-10 committed matrix rows 1 through 12 and 19 and 28.

## Task T-4: Recheck reuse observations and refuse starts during a stop

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-3
- **Acceptance Criteria:** AC-1, AC-2, AC-5, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
In `apps/api/src/project-runtime-manager.ts`:

1. Add `reuseOwnershipFailure(current: RunningEntry): RuntimeFailure | undefined`, defined exactly once, returning `undefined` only when `entries.get(current.projectId)` is the exact `current` object with state `running` and the same `generation`, and otherwise classifying `shuttingDown` to `manager-shutdown`, an installed `failed` entry to that entry's retained failure, and every other mismatch to `RuntimeFailure('runtime-stopping')`.
2. Call it exactly twice in `start`'s running-reuse branch: immediately after `await current.ready.process.isAlive()` and immediately after the awaited health verdict. When it returns a failure, throw that failure immediately, before any snapshot return and before any `transitionRunningToFailed` call. Do not add a third call site, do not change the guarded transition, and do not add cleanup, audit, or event work to this path.
3. Handle a `stopping` entry in `start` by throwing `new RuntimeFailure('runtime-stopping')` before any liveness or health call. Do not reuse the claimed snapshot, cancel the release, wait for it, or launch a replacement.

Make no change to `apps/api/src/workbench-proxy-manager.ts`: the proxy remains a consumer that calls `start` and validates `ownsSnapshot`, and it acquires no stop capability, message, or shutdown-ordering change.

### Files and Surfaces
- `apps/api/src/project-runtime-manager.ts`
- `apps/api/src/workbench-proxy-manager.ts` (verified unchanged)

### Acceptance Criteria
- AC-1: no caller and no proxy request can receive a snapshot whose generation a selected stop has claimed or released, and a superseded reuse observation changes no entry, identity, metadata, peer, or fixture.
- AC-2: the recheck adds no process work and cannot extend a stop past its overall bound.
- AC-5: a peer project's entry, identity, listener, readiness, and public state are unaffected by any reuse or refusal path.
- AC-6: both winner orders are reachable deterministically through injectable dependencies.

### Test Coverage
- Manager tests for a healthy reuse verdict delayed past the stop claim, asserting `runtime-stopping`, zero `terminate`, `audit`, `launch`, and cleanup calls, zero events, and an unchanged `stopping` entry.
- Manager tests for an unhealthy reuse verdict delayed past the stop claim, asserting the winner-consistent failure, zero cleanup records, and zero events.
- Manager tests for a false-liveness observation delayed past the claim with the same assertions.
- Tests for the reverse order, where the verdict settles before the claim, asserting normal reuse or the normal guarded transition and unchanged BL-016 one-winner cleanup and event cardinality.
- Tests for a verdict delayed past a settled stop that installed `registered`, and past a retained `failed` entry, asserting the classified failure in each case.
- A test asserting `start` during `stopping` throws `runtime-stopping` with no `launch`, `terminate`, or `audit` call and no entry mutation, and that a fresh `start` after settlement creates a new generation the settled stop never touches.
- A proxy-path test asserting the proxy surfaces its existing bounded typed failure when `start` throws `runtime-stopping`, and that `ownsSnapshot(preStopSnapshot)` is false after the claim and after settlement.
- A source-guard assertion that `reuseOwnershipFailure` has exactly one definition and exactly two call sites, that no `return current.snapshot` precedes a recheck, and that `workbench-proxy-manager.ts` contains no `stop(`, `terminate(`, or `kill` call.

### Documentation Impact
Feeds the stable-routing and runtime-runbook race sections in T-13.

### Expected Evidence
V-4 rows for both winner orders of each reuse observation, with returned classification, spy counts, event counts, entry-after state, and the proxy outcome; V-10 committed matrix rows 13, 14, 15, 16, 17, and 18.

## Task T-5: Coordinate shutdown with in-flight stops and correct the cleanup re-attempt rule

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-3
- **Acceptance Criteria:** AC-1, AC-2, AC-5, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260815-termination-sequencer-boundary
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
In `apps/api/src/project-runtime-manager.ts`'s `shutdown()`:

1. After awaiting the `starting` operations and before the ownership sweep, await every tracked in-flight stop operation. Awaiting is bounded because each stop settles within its overall bound.
2. Correct the sweep's memoization test: reuse a prior cleanup audit for an ownership record only when it matches that exact `pid:processStartTime:port` key **and** reports `processAbsent && processGroupAbsent && listenerAbsent`. An unconfirmed or missing prior audit must fall through to `record.process.terminate(...)` for that exact record, whose audit is then recorded and used for the aggregate.
3. Leave shutdown's memoization of its own promise, the abort of starting entries, the running-entry termination loop, the audit aggregation, the tracked-task settlement loop, the entry-deletion loop, and the zero-count post-conditions unchanged. A stop already claimed continues to completion and emits its single terminal event even if shutdown begins; the settlement does not consult `shuttingDown`; a stop requested after `shuttingDown` returns `rejected` `manager-shutdown`.

Do not change ownership-key derivation, do not sweep by name or port, and do not add a second cleanup index.

### Files and Surfaces
- `apps/api/src/project-runtime-manager.ts`

### Acceptance Criteria
- AC-1: a retained ownership record left by an unconfirmed release or a termination fault is genuinely re-attempted with exact identity revalidation, and the aggregate shutdown status reports the resulting audit honestly.
- AC-2: shutdown interaction does not extend a stop past its overall bound, never runs a concurrent duplicate cleanup for one exact identity, and produces no further termination or cleanup for a generation whose stop-phase audit confirmed release.
- AC-5: peer ownership records, peer entries, and any later replacement generation are unaffected by the sweep.
- AC-6: all interleavings are reachable deterministically through injectable dependencies.

### Test Coverage
- Shutdown tests for the five per-phase cardinality rows in the action plan, asserting `terminateCallsByPhase` and `cleanupRecordsByPhase` for the stop and shutdown phases and the resulting aggregate status.
- A test asserting an unconfirmed stop's retained ownership record is terminated again by the sweep exactly once because its prior audit does not confirm absence, that the second attempt's audit is what the aggregate reports, and that no third termination or audit occurs for that generation.
- A test asserting a termination fault leaves no prior audit and the sweep terminates that exact record once.
- A test asserting a confirmed stop's ownership record is absent so the sweep performs zero terminations for it.
- A test asserting shutdown during an in-flight stop awaits it, records exactly one stop-phase cleanup audit for the claimed identity and then zero shutdown-phase cleanups when that stop confirmed release or exactly one when it did not, never runs the two cleanups concurrently, emits exactly one terminal stop event, and reports zero entries, zero ownership records, and zero tracked tasks in both the immediate and delayed post-return audits.
- A test asserting a stop requested after `shuttingDown` returns `manager-shutdown` with zero process-spy calls.
- A peer test asserting a peer project's ownership record is terminated exactly once by its own path and is never affected by another project's retained record.

### Documentation Impact
Feeds the runtime runbook shutdown section in T-13.

### Expected Evidence
V-5 rows for each shutdown interleaving with per-phase terminate and cleanup counts, aggregate status, post-return zero audits, and peer comparison digests; V-10 committed matrix rows 24, 25, and 26.

## Task T-6: Serve `POST /api/projects/:id/runtime/stop`

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-3
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging

### Description
Add `apps/api/src/routes/project-runtime-stop.ts` as its own Fastify plugin with its own error handler, register it explicitly in `apps/api/src/app.ts` beside `projectRuntimeStateRoute`, and extend the routes autoload `ignorePattern` so it is not loaded twice.

Implement exactly the action plan's API contract: path-parameter validation, empty-body enforcement with a 1,024-byte `bodyLimit`, the two-key success bodies, the nine bounded error categories with their fixed status codes including `409 runtime_not_managed`, the `500 runtime_stop_failed` mapping for an unexpected rejection and for `RuntimeStopInvariantError`, and the `project.runtime.stop.rejected` / `project.runtime.stop.failed` route log records. Emit no NFR-015 lifecycle event from the route. Never return a partial or empty success-shaped body, and never include a public runtime state, release mode, audit, PID, port, path, or server message in a response.

Do not modify `routes/projects.ts`, `routes/project-runtime-state.ts`, `validateProject`, `PROJECT_FIELDS`, or the workbench route.

### Files and Surfaces
- `apps/api/src/routes/project-runtime-stop.ts` (new)
- `apps/api/src/app.ts` (explicit registration plus `ignorePattern`)

### Acceptance Criteria
- AC-1: a request that resolves to a claimed running generation returns `200 stopped` naming only the selected project; a request that resolves to no managed runtime returns `409 runtime_not_managed`; every non-resolving request returns its bounded category with the documented status and changes nothing.
- AC-2: `stop-unconfirmed` returns its own bounded category and never a success body.
- AC-3: a successful response carries exactly `id` and `outcome` and no runtime state, so Project Home still reads state from the projection endpoint.
- AC-4: a repeated stop of a released project returns `200 already-stopped`.
- AC-6: every branch is exercised by finite in-process Fastify tests.

### Test Coverage
- Route tests for each of the nine rows of the status table, asserting exact status, exact body key set, and bounded category membership.
- Tests asserting an empty body, an absent content type, an empty JSON object, a non-empty JSON body, an oversized body, and a wrong media type each map to the documented outcome.
- Tests asserting a rejecting `stop` and a `RuntimeStopInvariantError` each yield `500 runtime_stop_failed` with the logged record and no success-shaped body.
- A disclosure test scanning every response body and log record across all branches for protected values with zero matches, and asserting no log record uses a name in the NFR-015 catalog.
- Tests asserting `GET /api/projects`, `GET /api/projects/runtime`, `POST /api/projects`, and `DELETE /api/projects/:id` responses are byte-identical to their pre-change behavior for the same fixtures.
- A registration test asserting the route is registered exactly once.

### Documentation Impact
Drives the `apps/api/src/routes/README.md` update in T-13, including the corrected "only exposed runtime shutdown path" and category-count statements.

### Expected Evidence
V-7 rows per branch with status, body key set, category, and log record; V-6 assertion that the route emits no lifecycle event and that its operational records are never validated as lifecycle events; V-10 committed matrix API columns for every scenario.

## Task T-7: Add the web stop transport, strict parser, and client-owned notices

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-6
- **Acceptance Criteria:** AC-1, AC-4, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260812-browser-navigation-shell
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-development-standards

### Description
Add `apps/web/src/runtime-stop.ts` exporting the endpoint builder for a project ID, a frozen nine-member `RUNTIME_STOP_ERROR_CATEGORIES` list matching the route vocabulary, a frozen client-owned `RUNTIME_STOP_NOTICES` map covering all nine, a frozen `RUNTIME_STOP_OUTCOMES` list, a strict `parseRuntimeStopResponse`, and a `stopRuntime` transport with a documented finite request bound. Follow the existing `runtime-state.ts` and `projects.ts` conventions, including `exactKeys` validation.

The parser accepts only the exact success key set with a known outcome, or the exact `{ error: { category } }` shape with a known category; anything else is a transport-shaped failure. Server message text is never surfaced. The transport reports an indeterminate outcome distinctly from a classified rejection so the controller can enter its unknown phase. `runtime_not_managed` is a classified rejection with its own notice, distinct from `project_not_found` and from the `already-stopped` success.

### Files and Surfaces
- `apps/web/src/runtime-stop.ts` (new)

### Acceptance Criteria
- AC-1: only bounded categories and outcomes are accepted; unknown, extra, missing, or duplicated keys are rejected.
- AC-4: `already-stopped` is parsed as a success, not an error.
- AC-6: every branch is covered by finite unit tests without a network.

### Test Coverage
- Parser tests for both success shapes, all nine error categories, an unknown category, extra and missing keys, wrong types, a non-object body, and an unparsable body.
- Transport tests for each status code, an aborted request, a timeout, and a network rejection, asserting classified versus indeterminate results.
- A test asserting every route category has notice text, that `runtime_not_managed` and `project_not_found` render different notices, and that no notice contains a path, port, PID, authority, or server message fragment.

### Documentation Impact
None directly.

### Expected Evidence
V-8 parser and transport tables with input, classification, and rendered notice key, plus a zero-match protected-value scan.

## Task T-8: Add the Project Home Stop control, accessible outcomes, and one post-stop refresh

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-7
- **Acceptance Criteria:** AC-1, AC-3, AC-4, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260815-public-runtime-state-projection, ADR-260812-browser-navigation-shell
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Extend `apps/web/src/use-project-home.ts` with one `stop(projectId)` operation that reuses the existing single-owner discipline (new owner kind `'stop'`) and the existing monotonic `generation` counter, exposes `state.stop` and a monotonic `stopSettlementVersion`, discards superseded or post-unmount settlements, and enters an explicit `unknown` phase for an indeterminate transport outcome. Never assume success and never mutate the rendered project list from a stop result.

Extend `apps/web/src/use-runtime-state.ts` so its single request counter is incremented by both `retry()` and a new `refresh()`, keeping the rule "exactly one request per revision plus exactly one per explicit refresh trigger" with no timer, stream, or health probe.

Extend `apps/web/src/App.tsx` with one Stop control per card as specified in the action plan: accessible name, static non-destructive description, single-shot activation, disabled controls and `aria-busy` while a stop is pending, polite announcements for success and no-op, a `role="alert"` region with the client-owned notice and a Retry control for a rejection, an explicit unknown-phase message with a refresh control, focus returning to that project's Stop control after settlement, and an effect that triggers exactly one runtime-state refresh per settled successful or already-stopped result.

Preserve Open, Close, focus targets, focus versions, announcements, list reconciliation, whole-list runtime unavailability, and navigation semantics exactly.

### Files and Surfaces
- `apps/web/src/use-project-home.ts`
- `apps/web/src/use-runtime-state.ts`
- `apps/web/src/App.tsx`

### Acceptance Criteria
- AC-1: a rejected stop renders only its bounded client-owned notice and changes no rendered project metadata, peer card, or runtime state; `runtime_not_managed` is announced as a rejection, never as a success.
- AC-3: after a successful stop the card's state comes from one fresh projection response and reads `Stopped`, while the project remains rendered with unchanged name and canonical path.
- AC-4: repeated activation is serialized, and an `already-stopped` result is announced as a success.
- AC-6: every phase is reachable in finite component tests with injected transports.

### Test Coverage
- Controller tests for pending, success, no-op, each of the nine rejection categories, indeterminate transport, superseded generation, unmount during flight, and refusal to start while another Home-owned request is active.
- Component tests asserting the control's accessible name, description, disabled states, `aria-busy`, announcements, alert text, Retry and refresh controls, and focus restoration.
- A test asserting exactly one additional runtime-state request per settled successful or already-stopped result and zero additional requests for a rejection, an unknown outcome, or a superseded settlement.
- Regression tests asserting Open navigation, Close dialog behavior, focus ordering, list reconciliation, and whole-list unavailability are unchanged.
- A rendered-DOM disclosure scan across every phase with zero protected-value matches.

### Documentation Impact
Drives the README and documentation-index Home behavior updates in T-13.

### Expected Evidence
V-9 component matrix rows per phase with rendered text, ARIA attributes, control states, announcement text, request counts, and the disclosure scan result.

## Task T-9: Build the BL-017 source guards, scenario catalog, validator, and deterministic serializer

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-4, T-5, T-6, T-8
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260815-termination-sequencer-boundary
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Add `apps/api/src/runtime-stop-evidence.ts` following the `runtime-state-evidence.ts` precedent. It declares the fixed 31-entry `BL017_SCENARIOS` catalog in the action plan's order, the row and matrix interfaces with every field listed in the evidence schema, `validateSelectedStopSource`, `validateRuntimeStopMatrix`, and `serializeRuntimeStopMatrix`.

`validateSelectedStopSource` proves, from `project-runtime-manager.ts`, `project-runtime-process.ts`, and `routes/project-runtime-stop.ts` source text, the structural claims that behavior alone cannot prove: exactly one `stop` definition; exactly one `entries.set` installing a `stopping` entry; no `await`, `.then(`, or `async` between the dispatch entry read and that install; exactly one `terminate(` call on the stop path and exactly one `recordCleanup` call on it; exactly one emit site per stop event name; exactly one settlement claim-ownership recheck guarding both terminal installs; exactly one `reuseOwnershipFailure` definition with exactly two call sites and no `return current.snapshot` before a recheck; exactly one `terminateOwnedRuntimeGroup` definition with no second sequencing implementation and no direct `process.kill`, `Date.now`, or `setTimeout` use inside it; exactly one `bounded` helper definition, every awaited primitive call routed through it, and no bare `await primitives.` in the sequencer; exactly one `sequencerController` construction in the sequencer body and exactly one call-scoped `AbortController` construction inside `bounded`; every deadline armed through `primitives.scheduleDeadline` with exactly two call sites — the overall deadline at entry and the per-call deadline in `bounded` — and no `primitives.delay` call outside `bounded`; a synchronous `request.signal` aborted check on entry that precedes every `bounded`, `signalProcessGroup`, and `scheduleDeadline` call; `gracefulDeadlineAt` and `forceDeadlineAt` each assigned exactly once from a `primitives.now()` reading in the same statement group as their own `signalProcessGroup` call and never from `startedAt`; every `signalProcessGroup` call gated in the same synchronous step by a not-aborted check, its boolean result bound and branched in that same step, and no phase deadline or window assigned on its `false` branch; exactly one `bounded(` call on the refused-graceful-signal path and no `delay` poll on it; no `catch` that discards a `signalProcessGroup` error inside the sequencer; every termination phase, deadline, and elapsed comparison in the sequencer derived only from `primitives.now()`, with no `Date.now`, `new Date`, or `performance.now` read directly in the sequencer body; `defaultRuntimeTerminationPrimitives.now` bound to the monotonic `performance.now` source and never to `Date.now`, while the delivered `RuntimeProcessDependencies.now`, health-adapter, and launch identity `Date.now` uses are still present and unchanged; exactly one shutdown sweep memoization test that requires all three absence booleans; no `runtime.stop.failed` anywhere in `apps/api/src`, `apps/web/src`, or `tests/`; an emitted event-name set that is a subset of the NFR-015 catalog; that `reportPublicStates` still passes the delivered `validatePublicReportingSource` guard including its `transitionRunningToFailed` definition and call-site counts; and that the route response builder references only the allowed key sets.

`validateRuntimeStopMatrix` enforces every rejection rule listed in the action plan's schema section, including `Stopped` only with a complete confirmed audit triple, an unconfirmed release never `Stopped`, an `already-stopped` outcome only for a released project, a `no-managed-runtime` row never recorded as a success, a force signal never before the declared graceful bound, a recorded `signalTimeline` whose graceful window is never shorter than the declared `gracefulMs`, whose force window is never shorter than the declared `forceMs`, and whose pre-signal span never exceeds the declared pre-signal allowance, a `deadlineSource` always `trusted-scheduler`, a `clockSource` always `monotonic` with no `signalTimeline` position recorded as a wall-clock value, no `signalTimeline` window, `sigtermAt`, or `sigkillAt` without the matching `signalDelivery` value `delivered`, no `refused` or `not-attempted` signal recorded as delivered or as an escalation, no `escalated` release mode without a delivered force signal, no `graceful` release mode without a delivered graceful signal, no `already-absent` release mode alongside any delivered signal, no refused graceful signal recording more than one settlement audit or any opened window, no refused force signal recording a force window or an outcome other than `unconfirmed`, no `signalFault` of `raised` settled as anything other than the documented termination fault, no signal, audit, or wait recorded for a termination whose caller signal was already aborted on entry, zero surviving timers and zero unhandled rejections, no signal after cancellation, the sequencer deadline, or an abandoned continuation, no confirmed release derived from an incomplete audit, at most one stop-phase termination and at most one stop-phase cleanup audit per generation, no concurrent stop-phase and shutdown-phase cleanup for one identity, no shutdown-phase termination for a generation whose stop-phase audit confirmed absence, at most one shutdown-phase re-attempt per retained generation, a shutdown phase that never reuses an unconfirmed prior audit, an `invariant-fault` row with zero terminal events and zero extra cleanup records, exact terminal-event counts, zero loser events, an attribution record whose ceiling is present and whose claim does not exceed process-group membership, equal registration and fixture digests, equal peer and control digests, a non-empty pre-declared inventory, `residualCount: 0`, and a zero-match protected-value scan over each serialized row.

`serializeRuntimeStopMatrix` produces the deterministic form defined in the action plan.

### Files and Surfaces
- `apps/api/src/runtime-stop-evidence.ts` (new)

### Acceptance Criteria
- AC-1 through AC-5: each criterion has at least one validator rule that fails when its guarantee is removed.
- AC-6: the catalog, schema, and validator are fixed before any scenario executes, and each guard has a controlled negative fixture.

### Test Coverage
- Unit tests running each source guard over the real sources (accepted) and over one controlled mutated fixture each (rejected): an `await` inserted before the claim install; a duplicated `terminate` call; a second `stopping` install; an emitted `runtime.stop.failed`; a fifth public state literal; a duplicated stop definition; a route body key outside the allowed set; a removed settlement recheck; a removed or third `reuseOwnershipFailure` call site; a second sequencing implementation; a raw `process.kill` inside the sequencer; a bare awaited primitive call outside the `bounded` helper; a second `sequencerController` construction or a third `scheduleDeadline` call site; a deadline armed from `primitives.delay`; a removed entry-time `request.signal` aborted check; a `gracefulDeadlineAt` computed from `startedAt`; a `signalProcessGroup` call not gated by a not-aborted check in the same step; a `signalProcessGroup` call whose boolean result is discarded; a phase deadline assigned on a `false` send branch; a `catch` that swallows a `signalProcessGroup` error; a poll loop added to the refused-graceful-signal path; a `Date.now` read inside the sequencer; a `defaultRuntimeTerminationPrimitives.now` rebound to `Date.now`; and a shutdown memoization test that drops the absence conditions.
- Unit tests running the matrix validator over a valid fixture and over one controlled corruption per rejection rule.
- A determinism test asserting two serializations of the same validated matrix are byte-identical.

### Documentation Impact
None directly.

### Expected Evidence
V-1 and V-10 guard reports with one accepted row and one rejected row per guard and per validator rule; V-6 zero-match repository scan for the prohibited `runtime.stop.failed` lifecycle name and the route-record catalog-membership assertion.

## Task T-10: Execute the 31-scenario matrix with inventory, manifests, and cleanup

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-9
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260815-termination-sequencer-boundary
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260810-sqlite-persistence-lifecycle

### Description
Add `apps/api/test/runtime-stop-matrix.test.ts` (gated by `BL017_ACCEPTANCE=1`, following the BL-016 gating precedent) that executes all 31 catalog scenarios through the injectable termination primitives, process, port, health, clock, and event dependencies plus an in-process Fastify instance and an isolated project database.

For each scenario the test must, in order: declare its bounded four-class inventory before execution; capture the before manifests for every declared fixture with the existing `project-registration-fixture-helper.ts` schema and the registration field digests; execute the scenario; record the runtime, API, and Home-facing observations, the result classification, the ownership/descendant/listener audit triple, the attribution and ceiling record, the sequencer signal ordering classes, the ordered events, per-phase cleanup and terminate counts, peer and control digests, and the elapsed class with `withinDeclaredBound`; capture the after manifests and digests; then tear down only validation-owned temporary resources and record `residualCount`.

Scenarios 20 through 23 drive the shipped `terminateOwnedRuntimeGroup` over recorded primitives so the sequencing, deadline, cancellation, abandonment, and attribution rows are produced by production control flow rather than by a fake's label. Scenario 22 includes a primitive that never settles and one that ignores its cancellation signal, and records `primitiveBounding` with its abandoned-call, discarded-audit, and zero-signals-after-deadline counts. Scenario 27 additionally declares one unrelated control process and one unrelated control listener that Ascend does not own, and asserts their identities and availability are unchanged across the stop before its own separate teardown.

Write the measured monotonic timing to `test-results/bl-017/runtime-stop-timing.json` and assert each measured elapsed against its configured bound. Write the deterministic matrix to `test-results/bl-017/runtime-stop-matrix.json`, assert SHA-256 equality with the committed copy at `project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/implementation/evidence/runtime-stop-matrix.json`, re-read and revalidate the committed copy, and assert byte-identical reserialization.

### Files and Surfaces
- `apps/api/test/runtime-stop-matrix.test.ts` (new)
- `apps/api/test/runtime-stop-fixtures.ts` (new shared scenario harness, if extraction is needed)
- `project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/implementation/evidence/runtime-stop-matrix.json` (new, committed)
- `test-results/bl-017/` (disposable)

### Acceptance Criteria
- AC-1: rows 1, 2, 6, 23, and 27 record the selected-project success with a complete audit triple; rows 3, 4, 5, 7, 9, 10, 11, and 19 record a bounded non-success with unchanged metadata, states, peers, controls, and fixtures.
- AC-2: rows 1, 2, 3, 5, 20, 21, and 22 record the graceful-before-escalation ordering from the shipped sequencer, the successful classifications, the explicit unconfirmed non-successes within the overall bound, and row 22's settlement at the sequencer deadline against a never-settling primitive with zero signals afterwards.
- AC-3: rows 1, 2, 6, and 28 record one registration row with unchanged field digests and `Stopped` observed after that same result.
- AC-4: row 8 records one confirmed stop followed by three `already-stopped` repetitions with zero identities created or terminated and zero restarts; row 7 is recorded as a non-success and never as AC-4 evidence.
- AC-5: row 27 records the peer's unchanged identity, `Running`, and readiness, the unrelated control's unchanged identity and availability, and identical before/after manifests for both projects.
- AC-6: all 31 rows execute deterministically and offline, with inventory, cleanup, digests, and revalidation recorded.

### Test Coverage
This task is the acceptance execution; its own coverage is the 31 scenarios plus the digest-equality, re-read, revalidation, and reserialization assertions.

### Documentation Impact
Supplies the evidence path documented in T-13.

### Expected Evidence
V-10 and V-11: the committed 31-row matrix, its SHA-256, the disposable timing artifact, per-scenario inventory and residual counts, and before/after manifest digest equality for every declared fixture node.

## Task T-11: Add the designated-host stop episode, member closure, and independent residual audit

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-5
- **Acceptance Criteria:** AC-1, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260815-termination-sequencer-boundary, ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
Add `apps/api/test/runtime-stop-designated.test.ts` (gated by `BL017_DESIGNATED=1`, following the BL-010 `project-runtime-designated.test.ts` precedent) executing exactly one bounded real-host scenario: register one disposable fixture project, start one real code-server runtime, record its exact PID, process start time, loopback listener, and the exact owned process-group member closure — every member PID with its own recorded process start time, captured immediately before the stop — request a selected stop through the manager, and assert a `stopped` result whose audit reports the recorded root identity absent, its owned process group absent, and its listener refusing connections, with every recorded member identity absent, the registration row and fixture manifest unchanged, and `Stopped` reported afterwards.

Add `apps/api/src/cli/runtime-stop-residual-audit.ts` following the `project-runtime-residual-audit.ts` precedent: it reads the episode artifact out of process, independently re-probes the retained root identity, every recorded member identity, the owned group, and the listener, and exits non-zero on any residual. Record the attribution ceiling in the artifact so the strongest claim the episode makes is explicit. Both artifacts stay under `test-results/bl-017/` and are never committed.

Do not add a SIGTERM-ignoring or otherwise contrived host process, do not adopt any process Ascend did not launch, and do not attempt real-host escalation, race, or unconfirmed-release proof.

### Files and Surfaces
- `apps/api/test/runtime-stop-designated.test.ts` (new)
- `apps/api/src/cli/runtime-stop-residual-audit.ts` (new)

### Acceptance Criteria
- AC-1: the exact pre-stop root identity, every recorded owned-group member identity, the owned group, and the listener are proven absent against a real Ascend-managed runtime, and the registration and fixture are unchanged.
- AC-6: the episode is finite, bounded, repeatable, and independently re-audited out of process, with its attribution ceiling recorded.

### Test Coverage
- The single designated episode plus the residual-audit CLI, with a unit test covering the CLI's success, member-residual, and root-residual exits against controlled artifacts.

### Documentation Impact
Documented as a designated proof with its commands, disposable artifacts, and ceiling in T-13.

### Expected Evidence
V-12: the disposable episode artifact with the recorded root identity, the member closure, the post-stop audit triple, and the recorded ceiling; the residual-audit exit status and artifact; and the unchanged fixture manifest digest.

## Task T-12: Add the root justfile recipes and wire them into `verify`

- **Status:** Complete
- **Complexity:** Low
- **Dependencies:** T-10, T-11
- **Acceptance Criteria:** AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface

### Description
Add to the root `justfile`, following the existing recipe conventions:

- `verify-runtime-stop` — `BL017_ACCEPTANCE=1 pnpm exec vitest run` over the BL-017 API test files, the BL-017 web test files, and `apps/web/src/App.test.tsx`, with `--reporter=verbose`.
- `proof-runtime-stop` — `BL017_DESIGNATED=1 pnpm exec vitest run apps/api/test/runtime-stop-designated.test.ts --reporter=verbose`.
- `proof-runtime-stop-residual-audit` — `pnpm --filter @ascend/api exec tsx src/cli/runtime-stop-residual-audit.ts`.

Wire `just verify-runtime-stop`, `just proof-runtime-stop`, and `just proof-runtime-stop-residual-audit` into `verify` immediately after `just verify-runtime-state`. Add no standalone runner, verification config, wrapper script, or duplicated raw command outside the `justfile`, and change no existing recipe body. The existing `proof-stop` recipe is BL-001 workbench-proof scope and is left untouched.

### Files and Surfaces
- `justfile`

### Acceptance Criteria
- AC-6: `just verify-focused` and `just verify` remain distinct and present, the three new recipes exist and pass, and `verify` includes each exactly once.

### Test Coverage
- A documentation/command test asserting the three recipes exist in the root `justfile` and that `verify` invokes each exactly once.
- Executing `just verify-runtime-stop`, `just proof-runtime-stop`, and `just proof-runtime-stop-residual-audit`.

### Documentation Impact
The commands are documented in README, the documentation index, the runtime runbook, and the route reference in T-13.

### Expected Evidence
V-13: recipe presence assertions and the passing output of each new recipe.

## Task T-13: Update affected application documentation and documentation tests

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-8, T-10, T-11, T-12
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260815-termination-sequencer-boundary, ADR-260815-public-runtime-state-projection
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260806-project-command-interface

### Description
Execute every row of the action plan's Documentation Scope table: the README section with the bounded outcomes, the `no-managed-runtime` versus `already-stopped` distinction, the corrected 14-category count, and the reworded BL-013 sentence; the documentation-index entry and reconciled BL-016 sentence; the runtime lifecycle and runbook sections with the five entry states, the transition-target vocabulary, the state machine, the claim, the two bound-enforcement points including the trusted deadline scheduler that is independent of every awaited primitive, the primitive cancellation and abandonment contract, the signal-delivery result with its refused and faulted cases, the monotonic termination clock and its separation from the unchanged lifecycle timestamps, the phase windows measured on that clock from their own confirmed delivered signals, the pre-signal observation allowance and its unconfirmed outcome, the pre-aborted caller-signal entry rule, the per-phase cleanup cardinality rule and its intended single shutdown re-attempt, the confirmation rule, attribution and its ceiling, the result vocabulary and exact counts, event cardinality, race outcomes including the reuse recheck, the shutdown re-attempt rule, evidence, and the Restart-only deferral; the API route reference with the strict contract, all nine status rows, and the corrected "only exposed runtime shutdown path" and category-count statements; the stable-routing note; the session-switching reconciliation; and the API package README correction.

Add `apps/api/test/runtime-stop-documentation.test.ts` asserting the BL-017 phrases, commands, envelopes, bounds, counts, attribution ceiling, disclosure limits, and evidence path are present, and update the three existing documentation tests whose phrase expectations assert that Stop is absent.

Record in `implementation/00-implementation.md` the documentation evidence for every category and the explicit no-impact rationale for configuration, migration, and deployment.

### Files and Surfaces
- `README.md`, `docs/README.md`, `docs/project-runtime.md`, `docs/stable-workbench-routing.md`, `docs/session-switching.md`, `apps/api/README.md`, `apps/api/src/routes/README.md`
- `apps/api/test/runtime-stop-documentation.test.ts` (new)
- `apps/api/test/project-runtime-documentation.test.ts`, `apps/api/test/project-runtime-isolation-documentation.test.ts`, `apps/api/test/runtime-state-documentation.test.ts`

### Acceptance Criteria
- AC-1 through AC-5: every documented behavior matches the delivered contract, including the bounded outcomes, the two stop-resolution cases, the bounds, the confirmation rule, the attribution ceiling, metadata retention, and peer/control/fixture safety.
- AC-6: the commands, evidence paths, counts, and proof ceilings are documented and asserted.

### Test Coverage
- The new BL-017 documentation test plus the three updated documentation tests.
- A repository scan asserting no shipped document still claims that no Stop control or endpoint exists, that no document introduces `runtime.stop.failed` as a lifecycle event or a fifth public state, that no document states a stale 12-category count, that no document describes process-group absence as a stronger descendant-attribution proof, that no document describes the graceful deadline as running from the stop request or sequencer entry rather than from the confirmed delivered graceful signal, that no document describes all termination primitives as equally fallible or names an awaited primitive as the deadline source, that no document describes a termination signal as sent without a delivery result or an unconfirmed release as an escalation, and that no document describes a termination phase, window, deadline, or elapsed value as wall-clock time.

### Documentation Impact
This task is the documentation work.

### Expected Evidence
V-13 documentation results: per-file phrase assertions, the reconciliation scan with zero contradictory matches, and the recorded no-impact rationale for configuration, migration, and deployment.

## Task T-14: Retain committed evidence and run targeted regressions plus the full gate

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1 through T-13
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260815-termination-sequencer-boundary
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260505-commit-standards

### Description
Commit the deterministic matrix at the retained evidence path, confirm the disposable and committed copies are byte-identical at a recorded SHA-256, and confirm regeneration leaves the tracked file unmodified.

Run the targeted regressions genuinely affected by this change — `just verify-project-runtime` (contract, process module, sequencer, manager, lifecycle), `just verify-workbench-route` (proxy start path and ownership), `just verify-home-workbench false` (Home cards and navigation), `just verify-project-runtime-isolation` (per-project isolation, termination outcomes, event catalog), and `just verify-runtime-state` (projection, guards, events, transition mapping, retained matrix) — then run `just verify` and record every result and the clean working tree in `implementation/00-implementation.md`.

### Files and Surfaces
- `project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/implementation/00-implementation.md` (new)
- `project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/implementation/evidence/runtime-stop-matrix.json`

### Acceptance Criteria
- AC-1 through AC-5: the committed matrix revalidates after re-read and records the evidence claimed for every criterion.
- AC-6: every prescribed regression and the full `just verify` pass, the evidence digest is recorded, and the tree is clean at handoff.

### Test Coverage
- Re-execution of `just verify-runtime-stop` after the regressions to confirm deterministic regeneration.
- The five targeted regression recipes and `just verify`.

### Documentation Impact
Records the documentation evidence and no-impact rationale produced by T-13.

### Expected Evidence
V-13: the recorded SHA-256, `cmp` byte-identity result, an unmodified tracked evidence file after regeneration, passing output for each regression recipe and `just verify`, and the clean-tree proof.
