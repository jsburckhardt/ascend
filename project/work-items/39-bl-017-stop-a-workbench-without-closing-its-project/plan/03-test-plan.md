# Test Plan: BL-017 Stop a Workbench Without Closing Its Project

Revision 5. All validation is finite, offline, repository-local, deterministic, and free of manual steps, except the single designated-host episode in V-12, which is bounded, automated, and independently re-audited. Manager-level behavior is driven through the existing injectable process, port, health, clock, cancellation, and event dependencies. Termination sequencing, its bounds, its phase windows measured on the monotonic termination clock from their own confirmed delivered signals, its signal-delivery result with its refused and faulted cases, its trusted-scheduler deadline, its cancellation including an already-aborted caller signal, its abandonment of a primitive that outlives its deadline, and its attribution rule are driven through the shipped `terminateOwnedRuntimeGroup` over injected termination primitives, so AC-2 is proved by production control flow and never by a fake's returned label. The real production `scheduleDeadline` wiring is exercised on real timers as well, and the real production `signalProcessGroup` and monotonic `now()` bindings are asserted directly, so the deadline mechanism, the delivery contract, and the clock proved are the ones shipped. The root `justfile` is the only command source; no standalone runner or verification config is added.

Every criterion AC-1 through AC-6 is enumerated below with its success, failure, race, mutation, documentation, regression, and full-gate cases and the observable evidence each produces. Where behavior alone cannot prove a structural claim — synchronous ownership claims, call-site cardinality, single-definition rules, and race rules — an independently checkable source-contract guard is required alongside the behavioral test.

## Test V-1: Stop vocabulary, transition-target mapping, bounds, and source-contract guards

- **Type:** Unit and source contract
- **Task:** T-1, T-9
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-6
- **Priority:** High

### Setup
`apps/api/test/runtime-stop-contract.test.ts` imports the extended runtime contract, `validateSelectedStopSource`, and the delivered `validatePublicReportingSource`, and reads `apps/api/src/project-runtime-manager.ts`, `apps/api/src/project-runtime-process.ts`, and `apps/api/src/routes/project-runtime-stop.ts` as text.

### Steps
1. Map every member of `RUNTIME_ENTRY_STATES` plus `undefined` through `publicRuntimeState`; assert exhaustiveness, that `PUBLIC_RUNTIME_STATES` still has exactly four members, that `RUNTIME_STATES` still has exactly three, and that `'stopping'` maps to `'Running'`.
2. Map every member of `RUNTIME_LIFECYCLE_TARGETS` through `publicRuntimeStateForLifecycleTarget`; assert `stopped` maps to `Stopped`, `stopping` maps to `Running`, and that `stopped` is a member of neither `RUNTIME_ENTRY_STATES` nor `RUNTIME_STATES`.
3. Assert `publicRuntimeStateForLifecycleEvent` agrees for all six catalog events, including the two stop events, and throws for a mismatched target.
4. Assert `RUNTIME_STOP_OUTCOMES` (3), `RUNTIME_STOP_REJECTION_CATEGORIES` (6 including `no-managed-runtime`), `RUNTIME_FAILURE_CATEGORIES` (14), and `RuntimeTerminationOutcome` (4 including `unconfirmed`) are frozen and exhaustive, that `RuntimeTerminationPrimitives` has exactly seven members split four fallible awaited and three trusted synchronous, that `signalProcessGroup` is declared to return `boolean` and `now()` to return a monotonic reading, and that each new category has safe message and notice text.
5. Assert `createProjectRuntimeConfig` defaults, accepts an override, and rejects zero, negative, and non-integer `stopAuditAllowanceMs`; assert `runtimeStopOverallBoundMs` equals the sum of the three bounds; and assert the derived `settlementAllowanceMs = Math.max(1, Math.floor(auditAllowanceMs / 10))` and `preSignalAllowanceMs = auditAllowanceMs - settlementAllowanceMs` for the default allowance, for allowance `1`, and for one override, with `preSignalAllowanceMs + gracefulMs + forceMs + settlementAllowanceMs` equal to the overall bound in every case.
6. Run `validateSelectedStopSource` over the real sources and assert acceptance for every structural claim listed in T-9, including the single sequencer definition, the single `bounded` helper with every awaited primitive call routed through it, the single `sequencerController` construction plus the single call-scoped controller inside `bounded`, the two `scheduleDeadline` call sites as the only deadline arming with no `primitives.delay` call outside `bounded`, the synchronous entry check on `request.signal`, the single assignment of `gracefulDeadlineAt` and `forceDeadlineAt` from a `primitives.now()` reading in the same statement group as their own signal send, the not-aborted gate in the same synchronous step as every signal send, the bound-and-branched boolean result of every `signalProcessGroup` call with no deadline or window assigned on its `false` branch and no `catch` discarding its error, the single `bounded` call and absent poll loop on the refused-graceful-signal path, the absence of any direct `Date.now`, `new Date`, or `performance.now` read inside the sequencer body, the production `now` binding to the monotonic source rather than `Date.now`, and the still unchanged delivered `Date.now` uses in `RuntimeProcessDependencies.now`, the health adapter, and the launch identity deadline, the single settlement recheck, the two reuse rechecks, and the shutdown memoization test that requires all three absence booleans.
7. Run every guard over its one controlled mutated fixture and assert each is rejected with its specific violation code.
8. Re-run `validatePublicReportingSource` and assert the projection remains synchronous, dependency free, and single pass, and that the delivered BL-016 guard still counts exactly one `transitionRunningToFailed` definition and exactly three call sites, proving neither the stop path nor the reuse recheck rerouted the guarded `running` to `failed` transition.

### Expected Result
The stop vocabulary is bounded and exhaustive, transition targets are mapped without becoming entry or snapshot states, bounds are positive and derivable, the allowance split reconstructs the unchanged overall bound, every event agrees with the public state its target maps to, the claim is provably synchronous with exactly one stop-phase termination and at most one stop-phase cleanup audit per stop, no non-catalog event exists, and every guard fails when its guarantee is removed.

### Expected Evidence
The entry-state and transition-target mapping tables, frozen vocabulary member counts, the event-to-public-state table, the bound table with rejections, and a guard report with one accepted row and one rejected row per guard.

## Test V-2: Termination sequencer bounds, cancellation, and attribution through injected primitives

- **Type:** Unit (production control flow over injected primitives)
- **Task:** T-2
- **Acceptance Criteria:** AC-1, AC-2, AC-6
- **Priority:** High

### Setup
`apps/api/test/runtime-stop-sequencer.test.ts` constructs recording `RuntimeTerminationPrimitives` over a controlled monotonic clock and a scripted process/group/listener state machine whose individual awaited primitives can be made to return promptly, return slowly, never settle at all, ignore their cancellation signal, or reject, whose `signalProcessGroup` can be made to report a delivered signal, report the target-gone refusal, or throw an unexpected error, and whose `scheduleDeadline` is driven by that same controlled clock. It calls the shipped `terminateOwnedRuntimeGroup` directly and through `createNodeRuntimeProcessAdapter(primitives)`, and separately exercises the real production `defaultRuntimeTerminationPrimitives.scheduleDeadline` on real timers together with the real production `signalProcessGroup` and monotonic `now` bindings.

### Steps
1. Script an already-absent target; assert `already-absent`, zero signals, and one audit.
2. Script a target that releases inside the graceful window; assert exactly one `SIGTERM`, zero `SIGKILL`, outcome `graceful`, and a confirmed audit triple.
3. Script a target that releases only after escalation; assert both sends were reported delivered, that the recorded signal positions satisfy `sigkillAt - sigtermAt >= gracefulMs` on the injected monotonic clock, that no force signal precedes that point, that the force window available after `sigkillAt` is the full `forceMs`, and that the outcome is `escalated` within the overall bound.
4. Script pre-signal observation that legitimately consumes most of `preSignalAllowanceMs` before the identity read completes; assert the graceful opportunity is still a full `gracefulMs` between the recorded `SIGTERM` and `SIGKILL`, the force window is still a full `forceMs` after `SIGKILL`, and settlement is still no later than `gracefulMs + forceMs + auditAllowanceMs` from entry.
5. Script pre-signal observation that exceeds `preSignalAllowanceMs`, and separately one that is abandoned before completing; assert each returns `unconfirmed` with zero signals, no graceful window opened, and no time taken from the graceful period.
6. Script a target that never releases; assert outcome `unconfirmed`, an unconfirmed audit triple, and settlement no later than `gracefulMs + forceMs + auditAllowanceMs` on the injected clock.
7. Script slow audit primitives; assert settlement at the overall deadline with the last completed audit and no unbounded wait.
8. Script an awaited primitive that **never settles at all** — the listener probe, then separately the owned-group read, then separately the identity read, then separately the poll `delay`; assert the sequencer still settles at its deadline on the injected clock with `unconfirmed`, records the abandoned call, sends zero signals after the deadline, and derives no absence from the incomplete audit.
9. Script a `delay` that **never settles**, and separately a `delay` that **ignores its cancellation signal entirely**, and assert the sequencer still settles at its overall deadline; assert the recorded abort source is the trusted `scheduleDeadline` callback, proving the deadline is not armed from the primitive it must interrupt and that the self-bound requires no cooperation from any awaited primitive.
10. Repeat step 9 for one read primitive that ignores its cancellation signal, asserting the same settlement.
11. Settle each abandoned primitive — by resolution and by rejection — after the sequencer has returned; assert zero signals, zero recorded audits, zero mutations, no unhandled rejection, and no surviving scheduler handle or abort listener.
12. Script a run in which no audit ever completes before the deadline; assert the returned non-confirming audit has all three absence booleans false with outcome `unconfirmed` and is never classified as a confirmed release.
13. Script a primitive that rejects before its call is abandoned; assert the rejection propagates out of the sequencer instead of being swallowed, defaulted, or converted into an absence.
14. Call the sequencer with a caller `AbortSignal` that is **already aborted on entry**; assert it settles immediately as `unconfirmed` with the non-confirming audit, zero signals, zero waits, and no primitive call other than `now()`, proving the entry check rather than a newly added listener is what makes an already-cancelled termination safe.
15. Abort the caller signal mid-sequence; assert zero further signals, prompt settlement, and the last completed audit.
16. Script a target whose root identity was never observed alive with a non-empty owned group; assert zero signals and an unconfirmed outcome.
17. Script a target whose owned group is observed empty after a live-root observation; assert no later signal is sent to that group, and that the refused escalation gate returns `unconfirmed` immediately rather than waiting out a force window that was never opened.
18. Assert no audit is started after `forceDeadlineAt`.
19. Assert the ordered primitive call log matches the documented sequence, that every awaited primitive call carries a sequencer-derived signal and a phase deadline, that `scheduleDeadline` is the only deadline mechanism used, and that every signal call is immediately preceded by an identity read.
20. Assert `createNodeRuntimeProcessAdapter()` equals `nodeRuntimeProcessAdapter` behaviorally, that `defaultRuntimeProcessDependencies.process` is that production default, and that the adapter binds `config.stopAuditAllowanceMs` into `terminate` so no caller can omit the bound.
21. Assert the production `defaultRuntimeTerminationPrimitives` honour the contract: the `/proc` reads and the loopback probe reject on abort instead of reporting absence, the `/proc` directory scan never returns a partial member list, and `delay` resolves on abort with its timer cleared.
22. Exercise the real production `scheduleDeadline` on real timers: assert `onDeadline` runs exactly once and no earlier than the requested delay, that the returned handle prevents any later invocation, and that a cancelled handle leaves no pending timer behind.
23. Script a graceful send whose primitive returns `false`; assert exactly one bounded settlement audit and no poll loop, zero opened windows, zero recorded delivered signals, zero escalation attempts, `already-absent` when that audit completes and confirms all three absences, `unconfirmed` when it does not confirm or does not complete, and settlement strictly inside the overall bound.
24. Script a force send whose primitive returns `false` after a delivered graceful signal; assert `unconfirmed` returned immediately, no `forceDeadlineAt` fixed, no force window recorded, no `escalated` outcome, and the recorded `signalDelivery` of `delivered` for graceful and `refused` for force.
25. Script a graceful send and separately a force send whose primitive throws an unexpected error; assert the error propagates out of the sequencer rather than being swallowed or converted into a refusal or an absence, that no success-shaped audit is returned, and that no scheduler handle, abort listener, or unhandled rejection survives the throw.
26. Assert the real production `defaultRuntimeTerminationPrimitives` signal and clock bindings: `signalProcessGroup` returns `true` for a delivered signal, returns `false` for an `ESRCH` target-gone error, and rethrows every other `process.kill` error; `now()` is the monotonic `performance.now()` source rather than `Date.now`, successive readings never decrease, and the delivered `RuntimeProcessDependencies.now`, health-adapter elapsed, and launch identity-deadline wall-clock uses are unchanged.

### Expected Result
The shipped sequencer offers the full graceful opportunity measured on its monotonic clock from the `SIGTERM` its signal primitive confirmed delivered, and the full force window measured the same way from the confirmed delivered `SIGKILL`, opens no window and records no escalation for a send the host refused, surfaces an unexpected signalling failure as a propagated termination fault, escalates only after that whole graceful period, keeps all pre-signal observation inside the audit allowance and reports an unconfirmed release rather than shortening a window, settles inside the declared overall bound in every branch — including when any awaited primitive, the poll `delay` included, never settles or ignores its signal, because the deadline is armed by a trusted synchronous scheduler and the pending call is abandoned — settles immediately for a caller signal already aborted on entry, signals nothing after cancellation, abandonment, or the deadline, never turns an incomplete observation into a confirmation, never signals a group it cannot attribute, and leaves no timer, listener, or unhandled rejection behind.

### Expected Evidence
Per-branch rows with the ordered primitive call log, signal counts by kind, the recorded `signalDelivery` classes and `signalFault` flag, the `signalTimeline` recording `sigtermAt`, `sigkillAt`, the graceful window between them, the force window after `sigkillAt`, and the pre-signal span as monotonic elapsed values against the declared bounds, the recorded `deadlineSource` of `trusted-scheduler` for every bounded abandonment and `clockSource` of `monotonic` for every row, the refused-graceful, refused-force, and signal-fault branch records, the pre-aborted-entry record with its zero primitive calls, abandoned-call and discarded-audit counts, post-return settlement effects of every abandoned call with zero surviving timers and zero unhandled rejections, the settled outcome, the audit triple, and the adapter-equivalence, production-primitive, and production-scheduler contract assertions.

## Test V-3: Manager stop state machine, settlement, and invariant

- **Type:** Integration (in-process, fake dependencies)
- **Task:** T-3
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Priority:** High

### Setup
`apps/api/test/runtime-stop-manager.test.ts` uses the existing deferred fake-runtime harness with a controllable readiness gate, a controllable `terminate` result (graceful, escalated, already-absent, unconfirmed, rejecting, and never-settling), an injected `sleep`, a fake clock, spies on `terminate`, `audit`, `isAlive`, `health`, `ports`, and `launch`, and a recorded event stream.

### Steps
1. Stop an unregistered ID; assert `rejected` `not-registered`, an unchanged entry map, zero process-spy calls, and zero events.
2. Stop a persisted project with no entry, and one with a `registered` entry whose `released` is false; assert `rejected` `no-managed-runtime` for both, an unmutated map, zero identities created or terminated, zero events, and `Stopped`.
3. Stop a `running` entry to a confirmed release, then stop three more times; assert `already-stopped` each time within the declared bound, zero further cleanup records, zero events, zero restarts, and `Stopped` after each repetition.
4. Stop while an entry is `starting`; assert `rejected` `start-in-progress`, then assert the held start still resolves to `Running`.
5. Stop while an entry is `failed`; assert `rejected` `failure-retained` with the original category and `Failed` retained.
6. Stop a `running` entry whose termination releases inside the graceful window; assert `stopped` with `release: 'graceful'`, exactly one stop-phase `terminate` call, exactly one stop-phase cleanup audit, a `registered` entry with `released: true`, a removed ownership record, `Stopped`, and events `runtime.stop.requested` then `runtime.stop.succeeded`.
7. Repeat with escalation and with an exact generation that exited naturally; assert `escalated` and `already-absent` are both confirmed successes with a complete audit triple.
8. Repeat with a termination that never confirms; assert `rejected` `stop-unconfirmed`, exactly one stop-phase cleanup audit, a retained ownership record, a `failed` entry carrying `stop-unconfirmed`, public `Failed`, never `Stopped`, and events `runtime.stop.requested` then one `runtime.health.changed`.
9. Make `terminate` reject; assert the entry settles `failed` with `stop-unconfirmed`, exactly one `runtime.health.changed`, zero stop-phase cleanup audits, a retained ownership record, a rejection carrying the underlying failure, and no entry left in `stopping`.
10. Make `terminate` never settle; assert settlement at the overall bound with `stop-unconfirmed`, an aborted termination signal, zero stop-phase cleanup audits, `lateTerminationSettlements` incremented when the abandoned promise settles, and no later mutation, cleanup, or event.
11. Exercise the settlement claim-ownership decision with a mismatched installed entry; assert the invariant classification, that no entry is installed, no event is emitted, no further cleanup is recorded, and the operation and every joined caller reject.
12. Assert the returned public projection of every result contains no PID, process start time, port, internal URL, canonical path, stable route, owner token, or message text.

### Expected Result
Every state-machine row settles with its documented classification, entry, public state, cleanup count, and event sequence; a request that resolves to no managed runtime is a bounded non-success while a repeated stop of a released project is a stable successful no-op; an unconfirmed release, a fault, and a deadline are never reported `Stopped`; and no unowned settlement announces anything.

### Expected Evidence
Per-row records of result, entry after settlement, public state, `terminate` and cleanup counts, ordered events, elapsed class against the declared bounds, the late-settlement counter, and the disclosure scan result.

## Test V-4: Reuse-observation recheck, concurrency, single flight, and race settlement

- **Type:** Integration (in-process, controllable ordering)
- **Task:** T-3, T-4, T-9
- **Acceptance Criteria:** AC-1, AC-2, AC-5, AC-6
- **Priority:** High

### Setup
The same harness with an ordering controller that can resolve reuse-health verdicts, `isAlive` results, process-exit settlement, and termination completion in either order, plus a two-project fixture A and B.

### Steps
1. Issue two and then five concurrent stops for one project; assert one claim, one stop-phase `terminate` call, at most one stop-phase cleanup audit, exactly one `runtime.stop.requested`, exactly one terminal event, and identical settled results for every caller.
2. Hold a healthy reuse-health verdict, claim a stop, then release the verdict; assert the reusing caller receives `runtime-stopping`, never the pre-stop snapshot, with zero `terminate`, `audit`, `launch`, and cleanup calls and zero events.
3. Repeat with an unhealthy verdict released after the claim; assert the winner-consistent failure, zero cleanup records, and zero events from the loser.
4. Repeat with a false-liveness observation released after the claim; assert the same invariants.
5. Repeat each of steps 2 through 4 in the reverse order, with the verdict settling before the claim; assert normal reuse or the normal guarded transition, and unchanged BL-016 one-winner cleanup and event cardinality.
6. Release a delayed verdict after the stop has fully settled into `registered`, and after a retained `failed` entry; assert `runtime-stopping` and the retained failure respectively.
7. Race stop against reuse-health failure, post-readiness exit settlement, and observed false liveness in both win orders; assert exactly one terminal transition with exactly one stop-phase cleanup audit, that the loser mutates, terminates, audits, and emits nothing, that a losing stop returns `rejected` `failure-retained`, and that a stop that wins the exit race records `already-absent` as a confirmed success.
8. Delay each losing contender's settlement past the winner's transition and repeat; assert the public state, retained category, cleanup count, and event count are unchanged across repeated reports.
9. Perform every interleaving above on project B and assert project A's entry object, snapshot identity, public state, failure category, cleanup audit, ownership record, and event count are unchanged.

### Expected Result
Concurrent stops join one release; no awaited reuse observation can return a snapshot whose generation a stop claimed or released; every stop-versus-terminal-transition race settles as exactly one terminal outcome with exactly one stop-phase cleanup audit and one terminal event regardless of ordering or delayed settlement; no peer project is affected.

### Expected Evidence
Per-race rows with win order, claim outcome, returned classification, terminate and cleanup counts, terminal event count, loser spy counts, post-settlement report stability, and A/B comparison digests.

## Test V-5: Start refusal, replacement isolation, proxy acquisition, shutdown coordination, and cleanup re-attempt

- **Type:** Integration (in-process, fake dependencies plus in-process Fastify)
- **Task:** T-4, T-5
- **Acceptance Criteria:** AC-1, AC-2, AC-5, AC-6
- **Priority:** High

### Setup
The same harness plus a workbench proxy manager built over the same runtime manager and an isolated project database.

### Steps
1. Claim a stop, then call `start` for the same project; assert `RuntimeFailure('runtime-stopping')`, zero `launch`, `terminate`, and `audit` calls, and an unchanged `stopping` entry.
2. Let the stop settle successfully, start a replacement, and assert a new generation exists, that the settled stop performs no further `terminate` or `audit`, and that the replacement's identity is untouched — including after a deadline-abandoned termination later settles.
3. Drive a proxy request during `stopping`; assert the proxy surfaces its existing bounded typed failure and performs no termination.
4. After the claim and after settlement assert `ownsSnapshot(preStopSnapshot)` is false and that forwarding for the released generation is rejected by the existing ownership check.
5. Begin a stop, call `shutdown()` while it is in flight, and assert shutdown awaits it, that the stop phase records exactly one cleanup audit for the claimed identity and the shutdown phase then records zero when that stop confirmed release or exactly one when it did not, that the two cleanups never run concurrently, that exactly one terminal stop event was emitted, and that the immediate and delayed post-return audits report zero entries, zero ownership records, and zero tracked tasks.
6. Complete an unconfirmed stop, then shut down; assert the sweep re-attempts termination for that exact retained ownership record exactly once because its prior audit does not confirm absence, that per-phase counts are 1/1 then 1/1 and are recorded as the intended second phase rather than a duplicate, that no third termination or audit occurs for that generation, and that the aggregate status reflects the second audit.
7. Complete a termination fault, then shut down; assert the sweep terminates that exact record once with no prior audit, per-phase counts 0/0 then 1/1, and an honest aggregate status.
8. Complete a confirmed stop, then shut down; assert zero shutdown-phase terminations and zero shutdown-phase cleanup audits for that identity because its ownership record was deleted, so nothing repeats after a confirmed release.
9. Call `stop` after `shuttingDown` is set and assert `rejected` `manager-shutdown` with zero process-spy calls.
10. Assert a peer project's ownership record is terminated exactly once by its own path and is unaffected by another project's retained record; assert by source scan that `workbench-proxy-manager.ts` contains no stop, terminate, or kill call.

### Expected Result
A start during stop is refused without side effects, a replacement generation is never touched by a settled or abandoned stop, the proxy remains a pure consumer, and shutdown awaits in-flight stops and genuinely re-attempts exactly once every retained ownership record whose audit does not confirm absence, without ever running a concurrent duplicate cleanup or repeating after a confirmed release.

### Expected Evidence
Rows for start refusal, replacement isolation, proxy refusal, ownership rejection, and each shutdown interleaving, with per-phase terminate and cleanup counts, aggregate status, spy counts, event counts, and the post-return zero-count audits.

## Test V-6: NFR-015 stop event semantics and cardinality

- **Type:** Unit and integration
- **Task:** T-1, T-3, T-9
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-6
- **Priority:** High

### Setup
`apps/api/test/runtime-stop-events.test.ts` records safe serialized events through the manager's `recordEvent` dependency across every V-3, V-4, and V-5 scenario.

### Steps
1. Assert the emitted event-name set is a subset of the `PRD.md` NFR-015 catalog and that `runtime.stop.failed` is emitted nowhere and appears nowhere in `apps/api/src`, `apps/web/src`, `tests/`, or shipped documentation as a lifecycle event.
2. Assert an accepted stop emits exactly one `runtime.stop.requested` with `from: 'running'`, `to: 'stopping'`, and public `Running`.
3. Assert a confirmed release emits exactly one `runtime.stop.succeeded` with `from: 'stopping'`, `to: 'stopped'`, and public `Stopped`, and that the state reported immediately after emission is `Stopped`.
4. Assert an unconfirmed release, a termination fault, and a termination deadline each emit exactly one `runtime.health.changed` with `from: 'stopping'`, `to: 'failed'`, classification `stop-unconfirmed`, and public `Failed`, and that no `runtime.stop.succeeded` is emitted on those paths.
5. Assert an unowned settlement emits exactly zero terminal events after its single `runtime.stop.requested`.
6. Assert zero events for `not-registered`, `no-managed-runtime`, `already-stopped`, `start-in-progress`, `failure-retained`, `manager-shutdown`, a joined concurrent caller, a superseded reuse observation, and every race loser.
7. Assert every emitted event carries the deterministic opaque project token and no raw project ID, canonical path, port, authority, or diagnostic.
8. Assert the route emits no lifecycle event, that its `project.runtime.stop.rejected` and `project.runtime.stop.failed` records carry only a bounded category, and that neither record name appears in the NFR-015 catalog or is validated as a lifecycle event.

### Expected Result
Each accepted and owned stop produces exactly one requested event and exactly one terminal event that agrees with the reported public state; no other path produces a lifecycle event; no non-catalog lifecycle name exists; route operational records stay clearly operational.

### Expected Evidence
Per-scenario ordered event tables with mapped public states and cardinality counts, a zero-match repository scan for the prohibited lifecycle name, and the route record table with its catalog-membership assertion.

## Test V-7: Stop route contract

- **Type:** Integration (Fastify app)
- **Task:** T-6
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-6
- **Priority:** High

### Setup
`apps/api/test/runtime-stop-route.test.ts` builds the application with an isolated database and a manager stub that can return each `RuntimeStopOutcome`, reject with an arbitrary fault, and reject with `RuntimeStopInvariantError`.

### Steps
1. Exercise every one of the nine rows of the status table and assert exact status, exact response key set, and bounded category membership, including `409 runtime_not_managed`.
2. Assert the success bodies contain exactly `id` and `outcome` and carry no runtime state, release mode, audit, or protected value.
3. Exercise an absent body, an absent content type, an empty JSON object, a non-empty JSON body, an oversized body, and a wrong media type; assert the documented outcome for each.
4. Exercise an empty, missing, and undecodable `:id` and assert `400 invalid_project_id`.
5. Make `stop` reject with a generic fault and with `RuntimeStopInvariantError`; assert `500 runtime_stop_failed`, the logged record, and no success-shaped body for both.
6. Scan every response body and log record across all branches for protected values and assert zero matches.
7. Assert `GET /api/projects`, `GET /api/projects/runtime`, `POST /api/projects`, and `DELETE /api/projects/:id` responses are unchanged for the same fixtures, and that the stop route is registered exactly once.
8. After a successful stop, request `GET /api/projects/runtime` and assert the selected project reports `Stopped` while every other row is unchanged.

### Expected Result
The route exposes exactly the documented strict request and bounded result contract, never returns a partial or success-shaped fallback, discloses nothing protected, and leaves every sibling route unchanged.

### Expected Evidence
Per-branch rows with status, body key set, category, and log record; the sibling-route comparison; the post-stop projection response.

## Test V-8: Web stop transport and client-owned notices

- **Type:** Unit (web)
- **Task:** T-7
- **Acceptance Criteria:** AC-1, AC-4, AC-6
- **Priority:** Medium

### Setup
`apps/web/test/runtime-stop-client.test.ts` with a stubbed fetch.

### Steps
1. Parse both success shapes and all nine bounded error categories; assert acceptance and classification.
2. Parse an unknown category, extra keys, missing keys, wrong types, a non-object body, and an unparsable body; assert rejection.
3. Exercise every status code, an aborted request, a timeout, and a network rejection; assert classified rejections are distinguished from indeterminate outcomes.
4. Assert `already-stopped` is treated as a success and `runtime_not_managed` as a classified rejection with its own notice, distinct from `project_not_found`.
5. Assert every route category has notice text and that no notice or rendered string contains a path, port, PID, authority, or server message fragment.

### Expected Result
Only the exact bounded contract is accepted, indeterminate outcomes are distinguishable, and rendered text is entirely client owned.

### Expected Evidence
Parser and transport tables with input, classification, and notice key, plus a zero-match protected-value scan.

## Test V-9: Project Home stop interaction and accessibility

- **Type:** Component and controller (web)
- **Task:** T-8
- **Acceptance Criteria:** AC-1, AC-3, AC-4, AC-6
- **Priority:** High

### Setup
`apps/web/test/use-project-home-stop.test.tsx` and `apps/web/src/runtime-stop-component-matrix.test.tsx` with injected list, runtime-state, and stop transports.

### Steps
1. Activate Stop and assert exactly one request, the pending phase, `aria-busy` on the affected card, every Stop control disabled, and the polite announcement.
2. Settle success and assert the success announcement, restored focus on that project's Stop control, exactly one additional runtime-state request, and the card rendering `Stopped` from that projection response.
3. Settle `already-stopped` and assert the no-op announcement and the same single refresh.
4. Settle each of the nine rejection categories and assert a `role="alert"` region with only the client-owned notice, a Retry control, zero additional runtime-state requests, and unchanged rendered metadata for every card; assert `runtime_not_managed` is announced as a rejection and never as a success.
5. Settle an indeterminate transport outcome and assert the explicit unknown phase, its refresh control, and that success is never assumed.
6. Supersede a settlement by advancing the generation, and unmount during flight; assert the settlement is discarded and never applied.
7. Attempt a second stop and a Close while a stop is pending; assert both are refused by the single-owner discipline.
8. Assert Open navigation, the Close dialog and its focus trap, focus targets and versions, list reconciliation, and whole-list runtime unavailability are unchanged.
9. Scan the rendered DOM across every phase for protected values and assert zero matches.

### Expected Result
Stop is accessible, serialized, non-optimistic, and reconciled; state is only ever rendered from the projection; existing Open, Close, focus, and navigation semantics are preserved.

### Expected Evidence
Component matrix rows per phase with rendered text, ARIA attributes, control states, announcements, request counts, focus target, and the disclosure scan result.

## Test V-10: Deterministic scenario matrix, mutation rejection, and retained evidence

- **Type:** Acceptance (gated by `BL017_ACCEPTANCE=1`)
- **Task:** T-9, T-10
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Priority:** High

### Setup
`apps/api/test/runtime-stop-matrix.test.ts` with the injectable dependency harness, the injected termination primitives, an in-process Fastify instance, an isolated project database, disposable fixtures, and the fixed 31-scenario catalog.

### Steps
1. Assert the catalog, schema version, and validator are fixed before execution and that scenario order and IDs match `BL017_SCENARIOS`.
2. Execute all 31 scenarios, recording for each the pre-declared four-class inventory, runtime and API and Home-facing observations, result classification, ownership and descendant and listener audit triple, attribution and ceiling record, sequencer signal ordering classes, the `signalTimeline` and `primitiveBounding` records, ordered events, per-phase cleanup and terminate counts, peer and control digests, registration field digests, fixture manifest digests, elapsed class with `withinDeclaredBound`, and `residualCount` after teardown.
3. Write the measured monotonic timing to `test-results/bl-017/runtime-stop-timing.json` and assert each measured elapsed is within its configured bound.
4. Validate the matrix and assert acceptance.
5. Apply one controlled corruption per validator rule — a `Stopped` state with an incomplete audit triple; an unconfirmed release reported `Stopped`; an `already-stopped` outcome for an unreleased project; a `no-managed-runtime` row recorded as a success; a force signal recorded before the graceful bound; a `signalTimeline` whose graceful window between the recorded `SIGTERM` and `SIGKILL` is shorter than the declared `gracefulMs`; a `signalTimeline` whose force window after `SIGKILL` is shorter than the declared `forceMs`; a `signalTimeline` whose pre-signal span exceeds the declared pre-signal allowance; a `deadlineSource` other than `trusted-scheduler`; a `clockSource` other than `monotonic`; a `signalTimeline` position recorded as a wall-clock value; a `signalTimeline` window or signal position without the matching `signalDelivery` value `delivered`; a `refused` signal recorded as delivered or as an escalation; an `escalated` release mode without a delivered force signal; a `graceful` release mode without a delivered graceful signal; an `already-absent` release mode alongside a delivered signal; a refused graceful signal recording a second settlement audit or an opened window; a refused force signal recording a force window or an outcome other than `unconfirmed`; a `signalFault` of `raised` settled as anything but the documented termination fault; a row recording a signal, an audit, or a wait for a termination whose caller signal was already aborted on entry; a non-zero `timersSurvivingReturn`; a non-zero `unhandledRejections`; a signal recorded after cancellation, after the sequencer deadline, or from an abandoned primitive continuation; a confirmed release derived from an audit whose components did not all complete; two stop-phase terminations or two stop-phase cleanup audits for one generation; concurrent stop-phase and shutdown-phase cleanup for one identity; a shutdown-phase termination for a generation whose stop-phase audit confirmed absence; a second shutdown-phase re-attempt for one retained generation; a shutdown phase reusing an unconfirmed prior audit; an `invariant-fault` row carrying a terminal event; a non-catalog event name; a wrong terminal-event count; a non-zero loser event count; an attribution record missing its ceiling or overclaiming descendants; a changed registration digest; a changed fixture digest; a changed peer or control digest; an empty inventory; a non-zero residual count; a duplicate execution ID; a reordered scenario; and a protected value — and assert each is rejected with its specific violation code.
6. Write the deterministic matrix to `test-results/bl-017/runtime-stop-matrix.json`, assert SHA-256 equality with the committed copy, re-read and revalidate the committed copy, and assert byte-identical reserialization.

### Expected Result
All 31 scenarios execute deterministically and offline, the validator rejects every controlled corruption, and the disposable and committed artifacts are byte-identical and revalidate after re-read.

### Expected Evidence
The committed `runtime-stop-matrix.json` with its SHA-256, the disposable timing artifact, the mutation-rejection table, and the reserialization equality result.

## Test V-11: Registration retention, filesystem safety, and resource ownership

- **Type:** Acceptance (gated by `BL017_ACCEPTANCE=1`)
- **Task:** T-10
- **Acceptance Criteria:** AC-1, AC-3, AC-4, AC-5, AC-6
- **Priority:** High

### Setup
The same matrix harness with the existing `project-registration-fixture-helper.ts` manifest schema fixed before execution, two disposable project fixtures, one declared unrelated control process, and one declared unrelated control listener.

### Steps
1. Capture before manifests for every declared fixture node and digests of the four persisted registration fields for both projects.
2. Execute the success, escalation, unconfirmed, fault, deadline, no-managed-runtime, repeated, rejected, race, reuse-recheck, isolation, and shutdown scenarios.
3. After each scenario assert the selected project remains registered exactly once with unchanged stable ID, display name, canonical path, and created-at value, and that the public state observed after that same result matches the documented expectation.
4. For the two-ready-runtime scenario assert the peer retains its pre-stop runtime identity, `Running`, and a successful readiness observation, and that the declared unrelated control process and listener retain their identities and availability.
5. Capture after manifests and assert identical relative tree membership, content digests, permission modes, and recorded timestamps for every node of both fixtures.
6. Classify every inventory item as product-registration-during-scenario or validation-owned-temporary; assert product registrations survive the scenario and that final teardown leaves `residualCount: 0` for validation-owned temporary resources, including the unrelated control's separate teardown.

### Expected Result
No stop outcome — success, no-op, no-managed-runtime, rejection, unconfirmed release, fault, deadline, race, or shutdown — changes registration metadata, project files, peer runtimes, or unrelated controls, and validation leaves no residual behind.

### Expected Evidence
Before/after registration digest pairs, before/after manifest digest pairs per fixture node, peer and control identity and availability records, and the inventory classification and residual-count table.

## Test V-12: Designated-host stop episode, member closure, and independent residual audit

- **Type:** Designated host proof (gated by `BL017_DESIGNATED=1`) plus an out-of-process CLI audit
- **Task:** T-11
- **Acceptance Criteria:** AC-1, AC-6
- **Priority:** Medium

### Setup
`apps/api/test/runtime-stop-designated.test.ts` with one disposable fixture project, the production process adapter, and `apps/api/src/cli/runtime-stop-residual-audit.ts`.

### Steps
1. Register one disposable project and start one real Ascend-managed code-server runtime.
2. Record its exact PID, process start time, loopback listener, and the exact owned process-group member closure — every member PID with its own process start time — captured immediately before the stop, to `test-results/bl-017/designated-episode.json`, together with the recorded attribution ceiling.
3. Request a selected stop through the manager and assert a `stopped` result whose audit reports the recorded root identity absent, its owned process group absent, and its listener refusing connections, within the documented overall bound.
4. Assert every recorded member identity is absent after the stop.
5. Assert the registration row and the fixture manifest are unchanged and that the projection reports `Stopped`.
6. Run `just proof-runtime-stop-residual-audit` and assert it independently re-probes the retained root identity, every recorded member identity, the owned group, and the listener out of process and exits zero.
7. Unit-test the CLI's success, member-residual, and root-residual exits against controlled artifacts.

### Expected Result
A real selected stop leaves its exact root identity, every process-group member recorded immediately before the stop, its owned group, and its listener absent, with the registration and project files untouched, confirmed by an independent out-of-process audit.

### Expected Evidence
The disposable episode artifact with the recorded root identity, the member closure, the post-stop audit triple, and the recorded ceiling; the residual-audit artifact and exit status; the unchanged fixture manifest digest; and the CLI unit-test results.

**Proof ceilings.** AC-2's graceful bound, escalation point, force window, audit allowance, cancellation, signal-delivery branching, and abandonment of a primitive that never settles or ignores its signal are proved by executing the shipped sequencer over injected termination primitives, not by a fake's returned label; the injected clock proves the phase arithmetic deterministically but cannot prove the production binding is monotonic, so that binding is proved separately by the source and contract guard and by the direct production-primitive assertions; a fake `terminate` may order manager-level races but is never AC-2 sequencing evidence. Manager-level race ordering, join behavior, shutdown interleaving, idempotency, and the deadline backstop are proved with injectable dependencies, because deterministically producing a real host race with a fixed winner is neither repeatable nor bounded and adopting a contrived host process is outside Issue #39. Owned-descendant attribution is bounded by process-group membership of the exact owned root identity; a descendant that leaves the owned group before the audit samples it is unattributable by any bounded local mechanism, and BL-017 neither adopts nor terminates unattributable processes. Exhaustive host-process proof is explicitly not required.

## Test V-13: Documentation, targeted regressions, and the full gate

- **Type:** Documentation contract, regression, and full validation
- **Task:** T-12, T-13, T-14
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Priority:** High

### Setup
`apps/api/test/runtime-stop-documentation.test.ts` plus the three updated documentation tests, and the root `justfile`.

### Steps
1. Assert README, the documentation index, the runtime runbook, the API route reference, the stable-routing note, the session-switching note, and the API package README contain the BL-017 behavior, bounded outcomes, the `no-managed-runtime` versus `already-stopped` distinction, bounds and their two enforcement points including the trusted deadline scheduler that is independent of every awaited primitive, the graceful window measured on the monotonic termination clock from the confirmed delivered graceful signal and the force window measured the same way from the confirmed delivered force signal, the signal-delivery result with its refused and faulted cases, the pre-signal observation allowance and its unconfirmed outcome, the confirmation rule, the attribution ceiling, event cardinality, disclosure limits, commands, and the evidence path.
2. Assert the corrected statements: the 14-category count, "only exposed runtime shutdown path", the BL-013 "no public Stop" sentence, the BL-016 "no Stop control" sentence, the "user Stop or Restart UI" deferral, and the BL-020 stop/restart attribution.
3. Scan shipped documentation and assert no document still claims that no Stop control or endpoint exists, that none introduces `runtime.stop.failed` as a lifecycle event, that none introduces a fifth public state, that none states a stale 12-category count, that none describes process-group absence as a stronger descendant-attribution proof, that none describes the graceful deadline as running from the stop request or from sequencer entry rather than from the confirmed delivered graceful signal, that none describes all termination primitives as equally fallible or names an awaited primitive as the deadline source, that none describes a termination signal as sent without a delivery result or an unconfirmed release as an escalation, and that none describes a termination phase, window, deadline, or elapsed value as wall-clock time.
4. Assert the three new recipes exist in the root `justfile` and that `verify` invokes each exactly once.
5. Run `just verify-runtime-stop`, `just proof-runtime-stop`, and `just proof-runtime-stop-residual-audit`.
6. Run the targeted regressions genuinely affected by this change: `just verify-project-runtime`, `just verify-workbench-route`, `just verify-home-workbench false`, `just verify-project-runtime-isolation`, and `just verify-runtime-state`.
7. Run `just verify`.
8. Re-run `just verify-runtime-stop` and assert the committed evidence file is unmodified in the working tree.
9. Record the evidence SHA-256, the `cmp` byte-identity result, every command result, the configuration, migration, and deployment no-impact rationale, and the clean working tree.

### Expected Result
Documentation matches the delivered contract with no contradictory legacy claim, the new recipes are wired into `verify`, every prescribed regression passes, `just verify` passes, and regeneration leaves the tracked evidence byte-identical.

### Expected Evidence
Per-file documentation phrase assertions, the reconciliation scan result, recipe presence assertions, passing output for each new recipe and each regression, passing `just verify` output, the recorded evidence digest and byte-identity result, and the clean-tree proof.
