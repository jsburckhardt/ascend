# Task Breakdown: BL-018 Restart a Running or Failed Workbench

**Revision 6.** Tasks are dependency ordered. Every task is implemented inside the boundaries of `ADR-260815-explicit-workbench-restart-control`, `ADR-260815-per-project-lifecycle-activation`, the amendments to `ADR-260815-public-runtime-state-projection`, `ADR-260815-selected-runtime-stop-control`, and `ADR-260815-termination-sequencer-boundary`, and the four updated core-components. A required deviation returns to the Plan stage instead of being absorbed in code. All behavioral decisions, type names, signatures, member sets, status codes, scenario names, bounds, and cardinalities are already fixed in `01-action-plan.md`; Implement executes them and does not design.

**Revision 2 changes (historical record; counts stated here are those of revision 2 and are superseded by the revision 4 and revision 5 paragraphs below).** Independent validation returned NEEDS ATTENTION on revision 1. Six defects are repaired in these tasks and marked **[R2]**: T-1 gains the `restart-deadline-exceeded` category, the `RuntimeDeadlineScheduler` boundary, the corrected replacement and overall bounds, and 17-member vocabularies; T-2 steps 6 and 10 no longer use `processDependencies.sleep` and now arm both deadlines with the trusted `scheduleDeadline` primitive, record `gateConfirmed`, settle the overall deadline phase-aware, and never claim an unaudited replacement absent; T-3 and T-5 pick up the delivered `runtime-stop-evidence.ts` route-category guard; T-4 makes `WORKBENCH_FAILURE_TABLE` exhaustive at 28 rows and replaces the false "regenerate the committed BL-011 matrix" instruction with the real surfaces; T-6 raises the transport bound above the manager bound; T-9 executes 51 scenarios; T-12 carries the corrected counts.

**Revision 3 changes (historical record; counts stated here are those of revision 3 and are superseded by the revision 4 and revision 5 paragraphs below).** A narrowed independent recheck of revision 2 confirmed the six repairs held but found a CRITICAL late-ownership race and two related defects. Revision 3 repairs all three and marks every change **[R3]**. The architecture is fully decided in `01-action-plan.md` under *Pending replacement admission and quarantine*; these tasks execute it.

- **Defect 1 (CRITICAL) — a launch may materialise ownership after the deadline and after a retry installed a successor.** `launchReadyRuntime` calls `onOwned` only after the awaited `process.launch()` resolves, so a real process can exist with no manager record. Revision 2 then classified the retained failure from the ownership index alone (`no-record` -> `already-absent` -> gate passes), letting a second Restart install a healthy successor while the abandoned launch could still materialise a second live generation. Repaired by the new **T-14** (pending replacement admission created before every launch, four-value prior-resource class, gate resolution), by T-2 steps 8 and 10, and by T-3 step 4.
- **Defect 2 (HIGH) — reusing `start`'s `onOwned`/`onCleanup` unconditionally registers ownership and overwrites the project-keyed `lastCleanup`.** Repaired by T-14's restart-scoped wrappers and exact-identity quarantine indexes, and by T-2 step 8's wiring change.
- **Defect 3 (MEDIUM/HIGH) — shutdown could await an abandoned never-settling launch.** Repaired by T-14's detached `void launchPromise.then(...)` continuation, which is added to no task set, and by T-3 step 4's bounded sweep and honest `unresolvedAdmissions` reporting.

Downstream tasks pick the model up: T-1 adds the new types, phases, audit states, and the two release-phase bound variants; T-6 raises the transport bound to 85,000 ms; T-8 adds six source-guard codes, mutation class M-7, the widened evidence vocabularies, and the scenario catalog; T-9 executes the matrix; T-10 states the episode/residual-audit proof split; T-12 documents the model and the new bounds; T-13 re-runs the full gate.

**Revision 4 changes (historical record; counts stated here are those of revision 4 and are superseded by the revision 5 paragraph below).** Final narrowed validation of revision 3 confirmed its three repairs held but rejected the plan for two collision-cleanup defects. Both are repaired here and marked **[R4]**. Every rule, key derivation, phase, cardinality, bound, and count is fixed in `01-action-plan.md` under *Identity-keyed replacement cleanup*; these tasks execute it and design nothing.

- **Defect 1 — confirming collision cleanups left stale ownership records.** `launchReadyRuntime` calls `onOwned` per attempt and, on collision, terminates, calls `onCleanup`, and continues. Revision 3's `restartOnCleanup` only wrote the project-keyed `recordCleanup`, so a three-attempt eventual success left three ownership records where AC-11, V-3, and V-5 guarantee one, and revision 3 masked it by declaring a failed entry's prior resources plural. Repaired by **T-14 step 5** (identity-keyed installed branch that deletes exactly the matching record on a confirming triple) with the singular prior handle and the exactly-one release termination restored in **T-2 step 6**.
- **Defect 2 — a non-confirming collision cleanup was discarded.** The audit triple was thrown away and the attempt loop continued, so a later restart could claim residual-free over an unaudited residual. Repaired by the same wrapper in **T-14 step 5**: the exact identity moves into quarantine as `audited-unconfirmed` with its audit, and the wrapper synchronously aborts the phase with `new RuntimeFailure('restart-replacement-unconfirmed')`, which the delivered attempt loop observes at its next signal check before any port acquisition or spawn. **T-2 steps 7 and 9** carry the gate condition and the settlement; **T-1 step 5** publishes the one new failure category; **T-4** carries the mechanical 29-row table; **T-6** mirrors the web vocabulary at 18; **T-8** adds two guard codes, mutation class M-8, the five-value evidence unions, and the 64-scenario catalog; **T-9** executes 64 scenarios; **T-12** documents it. No new task is required and no task is renumbered.


**Revision 5 changes.** Independent adjudication of revision 4 confirmed its two repairs held but rejected the Plan for three findings. All are repaired here and marked **[R5]**. **No task is added, removed, renumbered, or re-scoped, and no acceptance criterion, validation, bound, scenario count, or public vocabulary count changes.**

- **Finding 1 (CRITICAL) — the evidence schema was uninhabitable.** `residualCount` was a required scalar whose only permitted value was rejected on the very rows it existed for. **T-8** now declares it `number | null` under a total residual-claim predicate, adds the separate harness-owned `teardownResidualCount`, and reconciles M-4, M-7, and M-8; **T-9** records both fields; **T-12** documents the encoding; **T-13**'s AC-17 statement names the `null` encoding instead of implying a zero.
- **Finding 2 (HIGH) — operative revision-3 counts survived.** **T-4** and **T-12** carried `'28-failure'` and a `14 -> 17` literal correction; both are corrected to `'29-failure'` and `14 -> 18`, and the BL-011 paragraph now says six rows produce six executions.
- **Finding 3 (MEDIUM) — the non-collision propagation claim was false.** The delivered `catch` at `apps/api/src/project-runtime-process.ts:876-888` rethrows an existing `RuntimeFailure` before it reads `input.signal.aborted`, so only a mid-loop collision and a non-`RuntimeFailure` error carry the wrapper's typed reason out of `launchReadyRuntime`. **T-14 step 5** and **T-2 steps 8 and 9** now state the truth branch by branch, add the restart-owned `replacementBlockReason`, and add the manager's settlement reason selector; **T-8** adds the sixteenth violation code and the M-8 precedence rules; **T-9** and the test plan add scenario 62's readiness-timeout branch. `launchReadyRuntime` is still changed in no way.


**Revision 6 changes.** Independent Verify of the implementation at commit `e4e8dc1a6da7035a984e628bce2127397805b954` accepted AC-1 through AC-5, AC-7 through AC-20, and the canonical `just verify` gate, and failed **AC-6** on one defect. The repair is marked **[R6]**. **No task is added, removed, renumbered, or re-scoped; no acceptance criterion, validation, bound, scenario count, public vocabulary count, ADR, core-component, or decision-log entry changes; and no architecture artifact is created or amended.** The authoritative rule already exists in `ADR-260815-per-project-lifecycle-activation` and is quoted, not rewritten.

- **Defect (AC-6) — T-7 step 3 narrowed a global admission condition to a per-project one, and V-12 never covered the cross-project case.** The ADR requires "no open close dialog" globally, and `01-action-plan.md` restated it correctly, but step 3 said "no `close` state for that project". Implement executed the narrowed rule: `apps/web/src/use-project-home.ts` guards `value.close?.id === projectId`, so a programmatic `restart('a')` is admitted while the Close confirmation for project B is open, creating an owner, mutating the restart lane, and issuing a real transport request. Every sibling admission in the delivered controller (`submit`, `openClose`, `stop`) already guards `value.close !== undefined`. Repaired by **T-7 step 3** (one guard expression) and proved in both directions by **V-12**; **T-13** re-runs the gate.
- **[R6] Two stale operative instructions reconciled with no code change.** T-7 step 13 and V-12 step 10 assert that a pending restart never disables the selected card's Open, Stop, and Close controls, but the delivered, tested, documented, and Verify-accepted behaviour disables exactly those three for the pending project while leaving every peer card enabled — which the ADR's own honesty rule requires, because the controller genuinely refuses `stop(P)` and `openClose(P)` while a restart owner is registered for P. Both steps now state the delivered rule. **No `disabled` expression changes**; an implementer must not treat this as work.
- **[R6] No documentation work follows.** No shipped sentence becomes stale: the delivered documentation states Restart eligibility by authoritative state, the per-project pending rule, and peer availability, and never enumerates the controller's admission preconditions. T-12 stands as delivered and Implement records that rationale.


## Task T-1: Extend the runtime contract with the restart entry state, transition target, categories, vocabulary, and bounds

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-7, AC-8, AC-9, AC-12
- **Related ADRs:** ADR-260815-explicit-workbench-restart-control, ADR-260815-public-runtime-state-projection, ADR-260815-selected-runtime-stop-control
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-development-standards

### Description
Extend `apps/api/src/project-runtime-contract.ts` only, with no manager, process, or route behavior:

1. Extend `RUNTIME_ENTRY_STATES` to `['registered', 'starting', 'running', 'stopping', 'restarting', 'failed']` (frozen, **6** members). Leave `RUNTIME_STATES` at exactly three snapshot states and `PUBLIC_RUNTIME_STATES` at exactly four frozen values. `RuntimeSnapshot` is unchanged.
2. Extend `publicRuntimeState` so `'restarting'` returns `'Starting'`, keeping `undefined` and `'registered'` at `'Stopped'`, `'stopping'` at `'Running'`, and the switch exhaustive.
3. Extend `RUNTIME_LIFECYCLE_TARGETS` to `['starting', 'running', 'failed', 'stopping', 'stopped', 'restarting']` (frozen, **6** members) and map `'restarting'` to `'Starting'` in `publicRuntimeStateForLifecycleTarget`.
4. Extend `RuntimeLifecycleEvent['event']` with `'runtime.restart.requested'`, `'runtime.restart.succeeded'`, and `'runtime.restart.failed'` (**9** total) and add `'runtime.restart.requested': 'Starting'`, `'runtime.restart.succeeded': 'Running'`, `'runtime.restart.failed': 'Failed'` to `PUBLIC_STATE_BY_LIFECYCLE_EVENT`.
5. **[R2][R4]** Add `'restart-release-unconfirmed'`, `'restart-deadline-exceeded'`, `'runtime-restarting'`, and **[R4]** `'restart-replacement-unconfirmed'` to `RUNTIME_FAILURE_CATEGORIES` (14 to **18**), appended in that order after the delivered members, with safe `RUNTIME_FAILURE_MESSAGES` entries naming no path, port, PID, command, or host detail. Add no diagnostics key. `restart-deadline-exceeded` exists because an overall deadline reached after a confirmed release must be reported honestly; without it the delivered `abortFailure` would fabricate `manager-shutdown` for a healthy manager. **[R4]** `restart-replacement-unconfirmed` exists because a replacement attempt whose cleanup audit completed without confirming all three absences is neither an unconfirmed release (`restart-release-unconfirmed` promises no replacement was launched) nor a selected stop (`stop-unconfirmed`); it is the typed reason the restart wrapper aborts its own phase with, so `abortFailure` carries it verbatim into the launch failure, the retained category, the terminal event classification, and the public projection.
6. Add frozen `RUNTIME_RESTART_OUTCOMES = ['restarted', 'rejected']` (**2**) and `RUNTIME_RESTART_REJECTION_CATEGORIES = ['not-registered', 'no-managed-runtime', 'start-in-progress', 'stop-in-progress', 'release-unconfirmed', 'replacement-failed', 'manager-shutdown']` (**7**), plus the `RuntimeRestartOutcome` union exactly as specified in the action plan, with `priorIdentity`, `replacementIdentity`, `release`, `audit`, and `replacementAudit` present only on the trusted in-process shape.
7. Add `'restart-in-progress'` to `RUNTIME_STOP_REJECTION_CATEGORIES` (6 to **7**). Leave `RUNTIME_STOP_OUTCOMES` at 3.
8. **[R2]** Add `restartSettlementAllowanceMs` (default **1,000**) to `PROJECT_RUNTIME_DEFAULTS`, `ProjectRuntimeConfig`, and `createProjectRuntimeConfig` with the same positive-safe-integer validation as its siblings. Export two pure bound functions beside the delivered `runtimeStopOverallBoundMs`:
   - `runtimeReplacementBoundMs(config)` returning `config.collisionAttempts * (config.readinessTimeoutMs + runtimeStopOverallBoundMs(config))` — **60,000 ms** at defaults (`3 x (15,000 + 5,000)`).
   - **[R3]** `restartQuarantineReleaseBoundMs(config)` returning `config.collisionAttempts * runtimeStopOverallBoundMs(config)` — **15,000 ms** at defaults. It bounds reclaiming up to `collisionAttempts` quarantined identities, which is the most one abandoned launch can create **[R4]** and remains the most a project can hold once a blocked replacement's single quarantined identity is included.
   - **[R3]** `runtimeRestartReleaseBoundMs(config)` returning `runtimeStopOverallBoundMs(config) + restartQuarantineReleaseBoundMs(config)` — **20,000 ms** at defaults. This is the release-phase bound used only when a pending admission must be resolved.
   - **[R3][R4]** `runtimeRestartOverallBoundMs(config, requiresQuarantineResolution: boolean)` returning `(requiresQuarantineResolution ? runtimeRestartReleaseBoundMs(config) : runtimeStopOverallBoundMs(config)) + runtimeReplacementBoundMs(config) + config.restartSettlementAllowanceMs` — **66,000 ms** when nothing must be resolved and **81,000 ms** when an admission or a quarantine record must be. **[R4]** `requiresQuarantineResolution` is the only permitted non-config input and replaces revision 3's `hasPendingAdmission` parameter name; no bound value changes; both functions stay pure. **81,000 ms is the caller-visible ceiling** every other bound is compared against.

   Revision 1 declared the replacement phase bounded by `readinessTimeoutMs` and the overall bound 21,000 ms. That was false for the shipped control flow: `launchReadyRuntime` iterates `config.collisionAttempts` (default 3) attempts, each with its own full `readinessTimeoutMs` readiness window, and runs an uncancellable `owned.terminate(gracefulShutdownMs, forceShutdownMs, port)` cleanup between attempts and on failure. Both bounds are declared allowances over configuration, not guarantees the launch path enforces; the enforced guarantee is the caller-visible one from step 10 of T-2.
8a. **[R3]** Add the admission and quarantine types, exactly as fixed in the action plan and with no behavior:
   - `export const RESTART_ADMISSION_PHASES = Object.freeze(['launch-pending', 'materialized-quarantined', 'absent-confirmed', 'audited-absent'] as const)` (**4**) and `export type RestartAdmissionPhase = (typeof RESTART_ADMISSION_PHASES)[number]`.
   - `export const RESTART_QUARANTINE_AUDIT_STATES = Object.freeze(['unaudited', 'reclaiming', 'audited-absent', 'audited-unconfirmed'] as const)` (**4**) and its `RestartQuarantineAuditState` union.
   - `export interface RuntimeUnresolvedAdmission { readonly projectToken: string; readonly admissionId: string; readonly phase: RestartAdmissionPhase }` — three opaque members and nothing else.

   These are internal lifecycle vocabularies. Add no member to `PUBLIC_RUNTIME_STATES`, `RUNTIME_STATES`, `RUNTIME_ENTRY_STATES`, `RUNTIME_FAILURE_CATEGORIES`, `RUNTIME_RESTART_OUTCOMES`, `RUNTIME_RESTART_REJECTION_CATEGORIES`, `RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES`, or `WORKBENCH_FAILURE_TABLE`; every public count fixed by revision 2 stays exactly as it is.
9. Export `RuntimeRestartInvariantError` as a distinct `Error` subclass carrying no protected value, with `delete this.stack`, used only by the restart settlement's claim-ownership check and the route's identity assertion.
10. **[R2]** In `apps/api/src/project-runtime-process.ts` only, extract the trusted synchronous scheduling surface so the manager can arm a deadline without touching a fallible promise:
   - Declare `export interface RuntimeDeadlineScheduler { readonly now: () => number; readonly scheduleDeadline: (delayMs: number, onDeadline: () => void) => () => void; }` with exactly the delivered member shapes.
   - Change `RuntimeTerminationPrimitives` to `extends RuntimeDeadlineScheduler` and delete its now-inherited `now` and `scheduleDeadline` declarations. Its member set stays at **7** and every delivered implementation and injection site is structurally unchanged.
   - Export `export const defaultRuntimeDeadlineScheduler: RuntimeDeadlineScheduler = defaultRuntimeTerminationPrimitives;` reusing the delivered object, so the default `now` remains `performance.now()` and the default `scheduleDeadline` remains native `setTimeout` returning a `clearTimeout` canceller.

   Change no delivered function body, no `RuntimeProcessDependencies` member, and no termination-sequencer behavior. This is a pure type extraction plus one alias export.

Introduce no environment variable, flag, persisted field, or diagnostics field. Do not change `RuntimeSnapshot`, `RuntimeFailure` diagnostics filtering, `serializeRuntimeEvent`, `stableProjectRoute`, `deriveProjectOwnerToken`, `runtimeStopOverallBoundMs`, or any stop type other than the rejection vocabulary.

### Files and Surfaces
- `apps/api/src/project-runtime-contract.ts`
- **[R2]** `apps/api/src/project-runtime-process.ts` — the `RuntimeDeadlineScheduler` extraction and `defaultRuntimeDeadlineScheduler` alias only
- **[R2][R4]** `apps/web/src/runtime-state.ts` — mirror the **four** new bounded failure categories and add their client-owned `RUNTIME_FAILURE_NOTICES` text, keeping both lists at **18**

### Acceptance Criteria
- AC-1, AC-2: the restart outcome and rejection vocabularies are frozen, exhaustive, and contain no unbounded or free-text member; `runtimeRestartOverallBoundMs` is derivable from configuration as a positive safe integer.
- AC-3: `publicRuntimeState('restarting') === 'Starting'`; `PUBLIC_RUNTIME_STATES` still has exactly four members; no fifth public value exists.
- AC-7: all nine lifecycle event names map to a public state and the agreement check rejects a mismatch.
- **[R2]** AC-8, AC-9: `restart-release-unconfirmed` and `restart-deadline-exceeded` exist as bounded actionable categories with safe message text; the underlying launch categories including `address-in-use-exhausted` remain available for replacement failures; `runtimeReplacementBoundMs` and `runtimeRestartOverallBoundMs` are positive safe integers derived only from `ProjectRuntimeConfig`; and `RuntimeDeadlineScheduler` names a synchronous trusted surface with no promise-returning member.
- **[R3]** AC-8, AC-9, AC-12: `restartQuarantineReleaseBoundMs`, `runtimeRestartReleaseBoundMs`, and both variants of `runtimeRestartOverallBoundMs` are positive safe integers; `RESTART_ADMISSION_PHASES` and `RESTART_QUARANTINE_AUDIT_STATES` are frozen four-member vocabularies; `RuntimeUnresolvedAdmission` carries only opaque tokens and no path, PID, port, or authority; and no public vocabulary count changes.
- AC-12: `stop-in-progress` and `start-in-progress` exist as bounded restart rejection categories, and `restart-in-progress` exists as a bounded stop rejection category.

### Test Coverage
- Unit tests over `publicRuntimeState` for all six entry states plus `undefined`, asserting exhaustiveness and that `PUBLIC_RUNTIME_STATES` has exactly four and `RUNTIME_STATES` exactly three members.
- Unit tests over `publicRuntimeStateForLifecycleTarget` for all six targets, including `restarting -> Starting`, plus a runtime assertion that `restarting` is not a member of `RUNTIME_STATES`.
- Unit tests over `publicRuntimeStateForLifecycleEvent` for all nine catalog events and a negative case where a mismatched target throws.
- **[R2][R4]** Unit tests asserting frozen restart outcome (2), restart rejection (7), stop rejection (7), and failure-category (**18**) vocabularies, with a safe message for each new category and zero protected-value matches.
- **[R2]** Unit tests over `createProjectRuntimeConfig` for `restartSettlementAllowanceMs`: default, override, and rejection of zero, negative, and non-integer values.
- **[R2]** Unit tests over `runtimeReplacementBoundMs` asserting **60,000 ms** at defaults, the exact `collisionAttempts x (readinessTimeoutMs + runtimeStopOverallBoundMs)` relation, and that raising `collisionAttempts` raises the bound proportionally; and over `runtimeRestartOverallBoundMs` asserting **66,000 ms** at defaults and the exact three-term sum.
- **[R3]** Unit tests asserting `restartQuarantineReleaseBoundMs` = **15,000 ms**, `runtimeRestartReleaseBoundMs` = **20,000 ms**, `runtimeRestartOverallBoundMs(config, false)` = **66,000 ms**, and `runtimeRestartOverallBoundMs(config, true)` = **81,000 ms** at defaults, each with its exact term-by-term relation, plus a monotonicity test that raising `collisionAttempts` or `gracefulShutdownMs` raises both variants and never inverts their order.
- **[R3]** Unit tests asserting both new vocabularies are frozen with exactly four members in the fixed order, that `RESTART_ADMISSION_PHASES` and `RESTART_QUARANTINE_AUDIT_STATES` share no member with `PUBLIC_RUNTIME_STATES`, `RUNTIME_ENTRY_STATES`, or `RUNTIME_FAILURE_CATEGORIES`, and that every public vocabulary count from revision 2 **[R4]** (18 failure categories, 2 restart outcomes, 7 restart rejections, 10 restart route errors, 10 stop route errors, 9 events, 6 entry states, 6 lifecycle targets, 4 public states, 29 workbench rows) matches this revision exactly.
- **[R2]** A type-level and runtime test asserting `defaultRuntimeDeadlineScheduler` is assignable to `RuntimeDeadlineScheduler`, that `defaultRuntimeTerminationPrimitives` still satisfies `RuntimeTerminationPrimitives` with all seven members, and that `scheduleDeadline` returns a callable canceller that prevents `onDeadline` from running.
- **[R2][R4]** Web unit test asserting the API and web failure-category lists are identical at **18** and that every category has notice text.
- **[R2]** Updates to the delivered hard-coded vocabulary-count assertions so they cover 6 entry states, 6 transition targets, 9 events, **[R4] 18** failure categories, and 7 stop rejection categories, at exactly: `apps/api/test/runtime-state-contract.test.ts`, `apps/api/test/runtime-state-events.test.ts`, `apps/api/test/runtime-stop-contract.test.ts:74` (14 to **18**), and `apps/api/test/project-runtime-contract.test.ts:55` (14 to **18**).

### Documentation Impact
None directly; T-12 documents the vocabulary, counts, and bounds.

### Expected Evidence
**[R2][R4]** V-1 contract results: the entry-state and transition-target mapping tables, the frozen vocabularies with member counts (**18** failure categories), the bound table with `runtimeReplacementBoundMs` 60,000 ms and `runtimeRestartOverallBoundMs` 66,000 ms plus their rejections, the `RuntimeDeadlineScheduler` assignability result, and a zero-match protected-value scan over every new message and notice string; V-9 event-to-public-state agreement for all nine catalog events.

## Task T-2: Implement the manager-owned restart operation, claim, gate, phases, and settlements

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-5, AC-7, AC-8, AC-9, AC-10, AC-11, AC-13
- **Related ADRs:** ADR-260815-explicit-workbench-restart-control, ADR-260815-termination-sequencer-boundary, ADR-260815-public-runtime-state-projection
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-filesystem-path-safety

### Description
Add `restart(input: { readonly projectId: string }): Promise<RuntimeRestartOutcome>` to `ProjectRuntimeManager` in `apps/api/src/project-runtime-manager.ts`:

1. Add the `RestartingEntry` interface with exactly the members fixed in the action plan and add it to the `ProjectRuntimeEntry` union.
2. Add a `restartTasks: Set<Promise<RuntimeRestartOutcome>>` alongside `stopTasks`, with the same add/settle/delete discipline, and expose its size in `audit()` as `restartTasks`. Add `lateReplacementSettlements` to `audit()` alongside `lateTerminationSettlements`.
2a. **[R2]** Add an optional `deadlineScheduler?: RuntimeDeadlineScheduler` to `ProjectRuntimeManagerDependencies` and resolve it once at manager construction as `const deadlineScheduler = dependencies.deadlineScheduler ?? defaultRuntimeDeadlineScheduler;`, exactly as the delivered manager resolves its other optional dependencies. This is the manager's only scheduling authority for restart. `processDependencies.sleep` is a fallible injected promise: an injected implementation may never settle, may ignore its signal, or may reject, so racing a deadline against it cannot bound anything. `deadlineScheduler.scheduleDeadline` is the trusted synchronous primitive — the default is native `setTimeout`/`clearTimeout` and no injected work runs before the callback fires.
3. Guard order, exactly as `stop` does: reject `manager-shutdown` when `shuttingDown`; `await findProjectById`; reject `not-registered` when absent; re-check `shuttingDown`.
4. Run one synchronous section that reads the installed entry and dispatches by the eligibility table: absent, `registered` released or not -> `no-managed-runtime`; `starting` -> `start-in-progress`; `stopping` -> `stop-in-progress`; `restarting` -> return `current.operation`; `running` or `failed` -> install the `restarting` entry. No `await` between the read and the install.
5. On acceptance emit exactly one `runtime.restart.requested` with `from` = `running` or `failed`, `to` = `restarting`, and `elapsedMs: 0`.
6. **[R2][R4] Release phase.** Resolve the prior owned resources: `ready` for a `running` entry; **[R4]** the **single** ownership record registered under the failed entry's generation for a `failed` entry — singular by construction for every generation a restart created, because T-14 step 5's identity-keyed cleanup deletes or quarantines each launch attempt's exact record before the next attempt begins; otherwise none. Terminate exactly one live handle; a second prior-generation termination is a defect, not a retry. Do **not** sweep the project's other ownership records: a generation created by the delivered `start()` path may carry a stale collided-attempt record that `start`'s project-keyed cleanup never deleted, and that record is neither a live handle nor this operation's to terminate — the action plan's *Proof ceilings* section records it, and the manager shutdown sweep still covers it. With a resolved handle, call `terminate(config.gracefulShutdownMs, config.forceShutdownMs, port, phaseSignal)` and race it against the **release backstop**, which is armed like this and nowhere else:

   ```
   const cancelRelease = deadlineScheduler.scheduleDeadline(
     requiresQuarantineResolution ? runtimeRestartReleaseBoundMs(config) : runtimeStopOverallBoundMs(config),
     () => { phaseController.abort(new RuntimeFailure('restart-release-unconfirmed')); },
   );
   try {
     await Promise.race([terminatePromise, abortedPromise(phaseSignal)]);
   } finally {
     cancelRelease();
   }
   ```

   `abortedPromise(signal)` is a local helper that resolves on the signal's `abort` event (and immediately when already aborted) and holds no timer of its own. **Do not** call `processDependencies.sleep`, `dependencies.sleep`, or any primitive `delay` anywhere in the restart body; the source guard in T-8 rejects it. When the backstop fires, the caller settles `release-unconfirmed` immediately, the still-running `terminate` promise is abandoned, and whatever it later resolves or rejects is counted in `lateTerminationSettlements` and applied to nothing. With no handle, record `already-absent` with `signalDelivery: not-attempted` and a completed no-op confirmation — **[R3]** but only when `pendingAdmissions.has(projectId)` is false **[R4]** and no quarantine record for that project is in a state other than `audited-absent`. When an admission is unresolved the prior-resource class is `pending-admission`; when none is but a quarantine record is uncleared the class is `quarantined-residual`; in both cases the release phase additionally resolves the admission and reclaims every quarantine record for that project exactly as T-14 specifies before the gate may be considered.

   **[R3][R4]** `requiresQuarantineResolution = pendingAdmissions.has(projectId) || projectHasUnclearedQuarantine(projectId)` is read **once**, synchronously, in the same acceptance step that installs the `restarting` entry, and is the only non-config input to either bound function. `projectHasUnclearedQuarantine` scans `quarantinedOwnership.values()` for that `projectId` and returns true for any record whose `auditState` is not `audited-absent`; the index holds at most `collisionAttempts` records per project, so the scan is bounded. Both deadline arms still exist exactly once per restart, so the restart holds exactly **two** `scheduleDeadline` handles regardless of variant.

   This is the whole of defect 1's repair on the release side: the bound now holds even when the injected `terminate` never settles and ignores `phaseSignal`, which revision 1's `sleep` race did not guarantee. The delivered selected-stop caller backstop keeps its `sleep` race unchanged — BL-018 neither repairs nor inherits it, and no BL-018 surface may describe it as trusted-scheduler armed.
7. **[R2] Gate.** Proceed only when the release audit reports `processAbsent && processGroupAbsent && listenerAbsent`. **[R3]** When the prior-resource class is `pending-admission`, the gate additionally requires the admission to have resolved inside the release bound to `absent-confirmed`, `audited-absent`, or a fully reclaimed `materialized-quarantined` whose every quarantined identity reports all three absences; an unresolved admission never passes and settles `release-unconfirmed`, per T-14. **[R4]** The gate additionally requires that **every** quarantine record for that project is `audited-absent`, whatever created it — a late callback, a detached continuation, or an installed replacement attempt blocked by a non-confirming cleanup. Any record still `unaudited`, `reclaiming`, or `audited-unconfirmed` when the release bound expires settles `release-unconfirmed` with `replacementLaunches: 0`. Record `admissionResolution` and its `resolutionOrder: 'before-gate'` in the same step, before `gateConfirmed` is set. Record the cleanup audit through `recordCleanup`. This gate is the only authorisation for the replacement phase; no port acquisition, process creation, or launch scheduling may appear before it in the control flow. In the same synchronous step that passes the gate, set a plain `let gateConfirmed = false;` declared at the top of the restart body to `true`. `gateConfirmed` is the **only** input to the deadline settlement branch in step 10; the settlement never infers a phase from elapsed time, from a timer identity, or from whether a launch promise exists.
8. **[R2] Replacement phase.** Call the same `launch` used by `start`, with the same `config` object the manager already holds — not a derived or narrowed one — and the same `canonicalPath`, `ownerToken`, and `dependencies`, under `phaseSignal`. **[R3]** The `onOwned` and `onCleanup` arguments are **not** `start`'s callbacks: they are the restart-scoped `restartOnOwned(admission)` and `restartOnCleanup(admission)` wrappers from T-14. **[R4][R5]** `restartOnCleanup` is identity-keyed on both branches and may abort `phaseController` with `new RuntimeFailure('restart-replacement-unconfirmed')`. **Revision 4 claimed the delivered attempt loop then throws that typed reason. It does not, on every branch.** Read `apps/api/src/project-runtime-process.ts` exactly: a collision on an attempt *before the last* ends at the next iteration's loop head `:794` and does carry the wrapper's reason; a collision on the *last* configured attempt falls out of the `for` loop and throws `address-in-use-exhausted` at `:890`; and a readiness, health, or early-exit failure ends in the `catch` at `:876`, whose rethrow at `:883-888` returns an already-typed `RuntimeFailure` **before** it ever reads `input.signal.aborted`, so it rejects with `readiness-timeout`, `health-status-unexpected`, `health-body-unexpected`, `early-exit-code`, or `early-exit-signal`. Only a non-`RuntimeFailure` error reaches `abortFailure(input.signal)` at `:886`. Blocking still holds on every branch — the loop head throws before `ports.acquire()`, or the rethrow exits the function — but the **reason** does not propagate on every branch, so this step's `catch` MUST NOT classify from the caught launch error alone. Implement the **settlement reason selector** of step 9 instead. Change nothing inside `launchReadyRuntime`. **[R3]** In the same synchronous step immediately *before* this call, and on no other path, create the pending replacement admission with `createPendingAdmission(projectId, restartGeneration, canonicalPath, ownerToken)` from T-14; there is no control path that reaches `launch` without an admission already in `pendingAdmissions`, and the T-8 source guard rejects one. Passing the manager's own `config` keeps `collisionAttempts` at its configured value, which is why `address-in-use-exhausted` stays reachable from a restart exactly as it is from `start`; the T-8 source guard rejects any other `config` argument at this call site. Race the launch against `abortedPromise(phaseSignal)` so an aborted phase settles the caller without waiting for the launch. After the launch resolves, re-check `shuttingDown` and `phaseSignal.aborted`; when either holds, terminate and audit the replacement, count `lateReplacementSettlements`, and settle as a failure rather than installing it.

   When the launch is abandoned rather than resolved — the overall deadline fired and the launch is still in flight — the restart claims no absence: no cleanup audit, **[R5]** `residualCount: null` rather than any number, and no statement in any evidence row, notice, event, or document that the replacement left nothing behind. **[R3]** Which honest state it records depends on whether ownership was ever reported:
   - `admission.ownedReported === true` — `replacementAuditState: 'unaudited-retained'`; **keep** the replacement's ownership record so the manager shutdown sweep terminates and audits that identity.
   - `admission.ownedReported === false` — `replacementAuditState: 'admission-unresolved'`; there is no handle to retain, so retain the **admission** instead, set `pendingAdmissionId` on the retained `failed` entry, and let T-14's detached continuation resolve it. Record `replacementOwnershipRecords: 0` and assert **no** zero-residual claim anywhere.

   Only a completed replacement cleanup audit reporting all three absences may record `replacementAuditState: 'audited-absent'` and remove the record.

   **[R3]** In both abandoned cases, attach T-14's detached `void launchPromise.then(...)` continuation exactly once and add the launch promise to **no** set: not `completionTasks`, not `backgroundTasks`, not `restartTasks`, not `stopTasks`.
9. **Settlement.** Re-check that `entries.get(projectId)` is the exact `restarting` object; a mismatch throws `RuntimeRestartInvariantError` with no install, no emission, and no additional cleanup. Then install exactly one terminal entry and emit exactly one terminal event, per the settlement table in the action plan. On success remove the prior generation's ownership record and register the replacement's; on `release-unconfirmed` retain the prior record; on `replacement-failed` remove the prior record and remove the replacement's record only when its cleanup audit confirms all three absences. **[R4][R5]** When the phase was aborted by a non-confirming replacement cleanup, install `failed` carrying `restart-replacement-unconfirmed`, record `replacementAuditState: 'quarantined-unconfirmed'`, leave the quarantine record in place, and claim no absence and no zero residual for it — the row records `residualCount: null`, never `0`.

    **[R5] Settlement reason selector — the mechanism that makes the previous sentence true on every launch branch.** Declare `let replacementBlockReason: RuntimeFailure | undefined` at the top of the restart body alongside `settled` and `gateConfirmed`. `restartOnCleanup`'s non-confirming branch assigns it the *same instance* it then passes to `phaseController.abort(...)`, in that order, in one synchronous step. At settlement of the replacement phase, choose the two classification axes in exactly this way and in no other:

    - **Retained failure category.** If `phaseSignal.aborted && phaseSignal.reason instanceof RuntimeFailure`, the retained category is exactly `phaseSignal.reason.category`; the caught launch error is not consulted for classification at all. Otherwise the retained category is the caught launch error's own category, exactly as the delivered path derives it. A caught value that is neither of those is an infrastructure fault and propagates unchanged. Write no `catch (error: unknown)` that swallows, no category string comparison, and no default branch that invents a category.
    - **`replacementAuditState`.** In this fixed total order: `quarantined-unconfirmed` when `replacementBlockReason !== undefined`; else `admission-unresolved` when the launch never settled and `admission.ownedReported === false`; else `unaudited-retained` when ownership was reported and no completed confirming audit exists; else `audited-absent` when every attempt's audit confirmed all three absences; else `none`.

    `AbortController.abort` keeps the first reason and ignores later ones, so `phaseSignal.reason` is itself the tiebreak between the wrapper and the overall deadline and no ordering is inferred from timing. If the deadline aborted first, the retained category is `restart-deadline-exceeded` while `replacementAuditState` is still `quarantined-unconfirmed`, because the operation does hold the quarantine record it created. Record `replacementAttempts.settlementReasonSource` (`phase-abort`, `launch-error`, or `none`) and `replacementAttempts.launchRejectionCategory` (the category the launch promise actually rejected with, or `null`) so nothing about the launch's own report is discarded and the precedence is provable from the artifact. The T-8 guard `restart-settlement-reason-precedence-missing` rejects a settlement branch that reads the caught launch error before `phaseSignal.reason`. **[R4]** Write exactly one project-keyed `recordCleanup(projectId, ...)` per executed phase — the prior audit in the release phase and the decisive replacement audit here — and copy `replacementAttemptAudits` into the trusted result before discarding it with the operation; the wrappers never call `recordCleanup`. **[R4]** On success assert `ownership` holds exactly one record for this project: the replacement's.
10. **[R2] Overall deadline.** Arm exactly one restart-owned overall deadline at acceptance, before the release phase begins, with the trusted scheduler:

    ```
    const cancelOverall = deadlineScheduler.scheduleDeadline(
      runtimeRestartOverallBoundMs(config, requiresQuarantineResolution),
      () => { phaseController.abort(new RuntimeFailure('restart-deadline-exceeded')); },
    );
    ```

    and cancel it in the operation's `finally`, on every exit path including the invariant-error path. The abort reason must be exactly that `RuntimeFailure` instance. This is load-bearing: `launchReadyRuntime`'s `abortFailure(signal)` returns `signal.reason` when it is a `RuntimeFailure` and otherwise fabricates `manager-shutdown`, so an untyped abort would make a healthy manager report itself shut down through the launch failure, the terminal event classification, the public `failureCategory`, the Home notice, and the retained evidence row at once.

    Settle the deadline strictly by `gateConfirmed`:
    - `gateConfirmed === false` — settle exactly as any unconfirmed release: result `rejected` / `release-unconfirmed`, entry `failed` carrying `restart-release-unconfirmed`, prior ownership record **retained**, zero launches, zero identities created. A pre-gate deadline is indistinguishable from any other unconfirmed release in result, retained category, ownership, events, and evidence, which is what AC-8 requires.
    - `gateConfirmed === true` — settle result `rejected` / `replacement-failed` with retained failure category `restart-deadline-exceeded`, entry `failed`, prior ownership record removed, replacement record and admission handled per step 8. Reusing the existing `replacement-failed` operation category keeps `RUNTIME_RESTART_REJECTION_CATEGORIES` at **7** and the delivered route mapping `replacement-failed -> runtime_replacement_failed -> 500` unchanged; the retained `restart-deadline-exceeded` category is what distinguishes a deadline from a spawn-class or readiness-class failure, exactly as `spawn-error` distinguishes those from each other. The retained entry is immediately eligible for another explicit Restart and is swept by manager shutdown through the ordinary retained-ownership path.

    Both deadlines share one `phaseController`; `phaseSignal.reason` therefore always carries the typed cause, and the restart holds no other timer.

    **[R3] Amended post-settlement rule.** Revision 2 stated that nothing settling after a deadline may register or remove ownership or record cleanup at all. That is too strong to implement safely — a blanket no-op leaks a real process — so it is replaced by the constrained rule the ADR, the core-component, the source guards, and the validator now state identically: **after settlement, nothing may install or mutate an entry, mutate a successor, register or remove a current-operation ownership record, write the project-keyed current cleanup, emit a lifecycle event, or become routable; exact late-resource quarantine and quarantine cleanup keyed by admission plus identity are permitted and required.** T-14 owns the wrappers and indexes that make that rule mechanical. Set the plain `let settled = true;` in the settlement step **before any await**, because it is the wrappers' only synchronous guard input alongside the exact-entry identity check.
11. Add `restart` to the `ProjectRuntimeManager` interface and to the returned object.

The restart must not call `stop()` or `start()`, must not install a `registered` entry, and must not emit any stop, start, or health event. **[R2]** It must not introduce a capitalised single-word quoted literal into `project-runtime-manager.ts` — the delivered BL-017 `validateStateLiterals` guard scans the whole file with `/'([A-Z][a-z]+)'/` and allows only the four public states; every restart literal (`'restarting'`, `'restart-release-unconfirmed'`, `'restart-deadline-exceeded'`) is lowercase and passes. It must not add a second `const stop = async (`, a second non-`readonly` `state: 'stopping',`, or a second `event: 'runtime.stop.requested'` or `event: 'runtime.stop.succeeded'` literal, which the delivered `validateManagerSource` counts across the whole file.

### Files and Surfaces
- `apps/api/src/project-runtime-manager.ts`
- `apps/api/src/project-runtime-contract.ts` (types only, from T-1)
- **[R2]** `apps/api/src/project-runtime-process.ts` (import only — `RuntimeDeadlineScheduler` and `defaultRuntimeDeadlineScheduler` from T-1 step 10; no behavior change in this module from T-2)

### Acceptance Criteria
- AC-1: the gate precedes every replacement launch; the success path produces one replacement whose identity tuple differs in pid and process start time for the same project, canonical path, stable route, and owner token.
- **[R3][R4]** AC-2: a `failed` entry is accepted for all **five** prior-resource classes (`live-record`, `absent-record`, `no-record`, `pending-admission`, `quarantined-residual`) and settles `Running` with no retained failure category on success; the `pending-admission` and `quarantined-residual` classes settle per the gate-resolution tables in T-14.
- AC-3: the entry is `restarting` from acceptance to settlement; no `registered` entry is installed; `running` is installed only after `launch` resolves ready.
- AC-5: no code path in `restart` touches the project directory, the registration, or the persisted record.
- AC-7: exactly one requested and one terminal event per accepted restart; zero events from joined callers and from a lost claim.
- **[R2]** AC-8: an unconfirmed release settles `failed` with `restart-release-unconfirmed`, retains ownership, and launches nothing — including when the injected `terminate` never settles and ignores cancellation, and including when the overall deadline fires with `gateConfirmed: false`.
- **[R2]** AC-9: a failed replacement terminates and audits the replacement, retains the underlying launch category, and leaves nothing behind when the audit completes; when the launch is abandoned at the overall deadline the caller still settles within `runtimeRestartOverallBoundMs` as `replacement-failed` / `restart-deadline-exceeded` with `replacementAuditState: 'unaudited-retained'`, the ownership record retained and no absence claimed; a healthy manager never reports `manager-shutdown` for a deadline.
- AC-10: concurrent callers receive the same operation promise; exactly one release and one launch occur.
- AC-11: three sequential restarts each install exactly one running entry and one ownership record. **[R4]** A replacement whose launch needed two collision retries also leaves exactly one ownership record, because each confirming cleanup deleted its own exact identity, so the next restart of that project resolves exactly one live prior handle and performs exactly one release termination.
- AC-13: no restart path reads or writes another project's entry, ownership record, or cleanup outcome.
- **[R3]** AC-1, AC-2: the admission is created in the same synchronous step immediately before `launch`, so no launch can exist without a record describing it; a project holding an unresolved admission is classified `pending-admission` and never `no-record`.

### Test Coverage
- V-2 manager state-machine tests for every row of the eligibility table and every row of the settlement table, using the delivered injectable `launch`, `processDependencies`, `now`, and `recordEvent` boundaries.
- V-2 gate-ordering test asserting zero launch invocations and zero port acquisitions before a confirmed audit triple, including a case where the audit is incomplete.
- V-3 join test with eight concurrent callers asserting one accepted operation, one terminate call, one launch call, and eight identical results.
- V-3 sequential test with three successful restarts asserting three distinct identities and one entry and one ownership record after each.
- **[R2]** V-4 release-failure tests for unconfirmed, faulted, and deadline-abandoned releases, plus two direct fallible-primitive tests: (a) an injected `terminate` returning a promise that **never settles** and never observes its signal, and (b) an injected `terminate` that ignores cancellation and resolves a confirmed audit **after** the backstop fired. Both use a recording `RuntimeDeadlineScheduler` whose `scheduleDeadline` is fired synchronously by the test, and both assert the public operation settles `release-unconfirmed`, `replacementLaunches: 0`, the prior record retained, the deadline handle cancelled, and — after firing the late settlement — zero additional entry mutations, zero emitted events, zero installs, and an incremented `lateTerminationSettlements`.
- **[R2]** V-5 replacement-failure tests for spawn-class and readiness-class failures, the post-deadline late-launch path, an injected `launch` that **never settles and ignores cancellation** (asserting the public operation still settles at `runtimeRestartOverallBoundMs` as `replacement-failed` / `restart-deadline-exceeded` with `replacementAuditState: 'unaudited-retained'`, the ownership record retained, **[R5]** `residualCount: null`, and a subsequent shutdown sweep terminating and auditing that identity), a post-gate deadline asserting the abort reason is exactly `RuntimeFailure('restart-deadline-exceeded')` and that no result, event, projection, notice, or evidence row anywhere reports `manager-shutdown`, a pre-gate deadline asserting the settlement is byte-identical to an ordinary unconfirmed release, and a collision-retry test whose first two attempts collide and third succeeds plus a variant whose every attempt collides reaching `address-in-use-exhausted`, both settling inside `runtimeReplacementBoundMs`.
- V-8 projection tests asserting the state series across both phase boundaries.
- V-9 event tests asserting cardinality, ordering, and the absence of stop, start, and health events from the restart path.
- **[R5]** V-5 settlement-selector tests: a readiness-timeout replacement whose cleanup audit is non-confirming settles with retained category `restart-replacement-unconfirmed` and `replacementAuditState: 'quarantined-unconfirmed'` even though the launch promise rejected with `readiness-timeout`; a last-attempt collision with a non-confirming cleanup does the same even though the launch rejected with `address-in-use-exhausted`; a replacement failure with a **confirming** cleanup still classifies from the launch error, so the selector narrows nothing it should not; and a deadline that aborted before the wrapper retains `restart-deadline-exceeded` while still recording `quarantined-unconfirmed` and `residualCount: null`.
- **[R3]** V-16 tests asserting: `launch` is never called without a prior `pendingAdmissions.set` for that project in the same synchronous step; the `onOwned`/`onCleanup` arguments at that call site are the T-14 wrappers; **[R4]** `requiresQuarantineResolution` is read exactly once per restart; the arming variant matches the read (66,000 / 5,000 versus 81,000 / 20,000); and exactly two `scheduleDeadline` calls occur per restart in both variants.

### Documentation Impact
T-12 documents the operation, the eligibility table, the gate, the settlements, and the bounds in `docs/project-runtime.md`.

### Expected Evidence
**[R3]** V-2, V-3, V-4, V-5, V-16 results plus matrix rows 1-9, 20-27, 43, 45-50, and 52-54 carrying `admission.createdBeforeLaunch: true`, `admission.resolutionOrder`, `admission.phaseAtSettlement`, and `gate.spawnsBeforeGate: 0` and `gate.gateConfirmed`, `deadlines.releaseArm` and `deadlines.overallArm` each `{ source: 'trusted-scheduler', declaredMs, cancelled: true }` with `fired` and `abortReasonCategory`, `replacementAuditState`, the identity pair with `distinctIdentity: true`, per-phase terminate and cleanup counts, `lateTerminationSettlements` and `lateReplacementSettlements`, and the ordered event tables.

## Task T-14: Implement the pending replacement admission, identity-keyed restart-scoped callback wrappers, quarantine indexes, and the detached late-settlement continuation **[R3][R4]**

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-1, AC-2, AC-8, AC-9, AC-12, AC-14, AC-17
- **Related ADRs:** ADR-260815-explicit-workbench-restart-control, ADR-260815-termination-sequencer-boundary
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging

### Description
This task exists solely to close the critical late-ownership race, its two companions, and **[R4]** the two collision-cleanup defects. Every type, field, key, phase, transition, permitted mutation, bound, and cardinality is already fixed in `01-action-plan.md` under *Pending replacement admission and quarantine* and *Identity-keyed replacement cleanup*; implement exactly that, in `apps/api/src/project-runtime-manager.ts` only.

1. **Admission record.** Add the `PendingReplacementAdmission` interface with exactly the ten fields fixed in the action plan (`projectId`, `restartGeneration`, `admissionId`, `canonicalPath`, `ownerToken`, `admittedAt`, `phase`, `ownedReported`, `resolution`, `resolvedPhase`) and `pendingAdmissions: Map<string, PendingReplacementAdmission>` keyed by stable project ID, with **at most one admission per project**. `admissionId` is `deriveProjectOwnerToken(projectId) + ':a' + <per-manager monotonic counter>` — an opaque token carrying no path, PID, or port. `admittedAt` is `deadlineScheduler.now()`, read in the same synchronous step as creation, never `Date.now()`.
2. **Creation before launch.** `createPendingAdmission(...)` is synchronous, sets `phase: 'launch-pending'` and `ownedReported: false`, creates `resolution` with its resolver captured, and is called immediately before `launch` in T-2 step 8 and nowhere else. Throw `RuntimeRestartInvariantError` if an admission for that project already exists; the gate resolution in step 6 below guarantees it cannot.
3. **Entry and inspection fields.** Add `pendingAdmissionId?: string` to `FailedEntry` and `pendingAdmissionId?: string` plus `pendingAdmissionPhase?: RestartAdmissionPhase` to `ProjectRuntimeEntryInspection`. The entry stays frozen; the mutable phase lives only in the map, so a retained failure references its admission by opaque token and never carries mutable state.
4. **Quarantine indexes.** Add `quarantinedOwnership: Map<string, QuarantinedOwnership>` and `quarantineCleanups: Map<string, RuntimeTerminationAudit>`, both keyed by `restartQuarantineKey(admissionId, record) = admissionId + '|' + ownershipKey(record)`. Keying by the delivered project-keyed shape is prohibited: that is exactly how a late cleanup would overwrite `lastCleanup(projectId)`. `QuarantinedOwnership extends RuntimeOwnershipRecord` with `projectId`, `restartGeneration`, `admissionId`, and `auditState: RestartQuarantineAuditState`. Expose `pendingAdmissions`, `quarantinedOwnershipRecords`, `quarantineCleanupRecords`, and `admissionResolutions` in `audit()` (12 members to **16**).
5. **Restart-scoped callback wrappers.** Implement `restartOnOwned(admission)` and `restartOnCleanup(admission)`. Each computes one synchronous guard `const installed = !settled && entries.get(admission.projectId) === restartingEntry`, then:
   - `onOwned`, installed — `registerOwnership(projectId, restartGeneration, record)`; set `admission.ownedReported = true`.
   - `onOwned`, late — `quarantineOwnership(admission, record)` with `auditState: 'unaudited'`; set `admission.ownedReported = true`. **Never** `registerOwnership`.
   - `onCleanup`, installed — **[R4] identity-keyed, never project-keyed.** Derive `const key = auditIdentityKey(audit)` where `auditIdentityKey(audit) = [audit.pid, audit.processStartTime, audit.port].join(':')`, which is byte-identical to `ownershipKey(record)` and is exactly the derivation the delivered shutdown sweep performs at `project-runtime-manager.ts:799-805`. Store the exact audit in the restart-owned `replacementAttemptAudits.set(key, audit)`. Then:
     - **confirming triple** (`processAbsent && processGroupAbsent && listenerAbsent`) — `ownership.delete(key)` guarded by `ownership.get(key)?.generation === restartGeneration`, exactly as the delivered confirmed-stop path guards its delete at `project-runtime-manager.ts:484-487`. Delete nothing else. The attempt loop continues normally.
     - **any other triple** — the same guarded `ownership.delete(key)`, then `quarantineOwnership(admission, { process, port })` for that exact identity with `auditState: 'audited-unconfirmed'` and `recordQuarantineCleanup(admission, audit)` under `restartQuarantineKey(admissionId, key)`, then synchronously assign that same `RuntimeFailure` instance to the restart-owned `replacementBlockReason` and pass it to `phaseController.abort(...)`, in that order. The identity **moves**; it is never in both indexes. **[R5]** The launch ends on every branch — a mid-loop collision at the next loop-head `if (input.signal.aborted) throw abortFailure(input.signal)` before `ports.acquire()` and before `process.launch(`, a last-attempt collision by the `for` loop's own exhaustion, and a readiness, health, or early-exit failure by the `catch`'s own rethrow — so no further port, process, or listener is created and no change inside `launchReadyRuntime` is required. **[R5]** But the launch only *rejects with* this typed reason on the mid-loop-collision branch and on the non-`RuntimeFailure` branch, because the rethrow at `project-runtime-process.ts:883-888` returns an already-typed `RuntimeFailure` before it reads `input.signal.aborted`. That is why `replacementBlockReason` exists and why T-2 step 9's settlement reason selector, not the launch primitive, decides the retained category and the replacement audit state.
     Never call `recordCleanup(` from this wrapper on either branch; the restart body writes exactly one project-keyed cleanup per phase.
   - `onCleanup`, late — `recordQuarantineCleanup(admission, audit)` under the exact key **[R4]** derived by the same `auditIdentityKey(audit)`, setting that record's `auditState` to `audited-absent` when the audit reports process, owned-group, and listener absence and `audited-unconfirmed` otherwise. **Never** `recordCleanup`.

   A late path may write only `quarantinedOwnership`, `quarantineCleanups`, the admission's `phase`/`resolvedPhase`/`ownedReported`, its resolver, and `lateReplacementSettlements`. It must never write `entries`, `ownership`, `cleanupOutcomes`, any successor snapshot or route, any lifecycle event, or any task set. A blanket no-op is explicitly rejected: it would leak a real process with no record of it.
6. **Retry release and gate resolution.** **[R4]** Classify by ignorance first: an unresolved admission makes the class `pending-admission`; otherwise an uncleared quarantine record makes it `quarantined-residual`; otherwise the delivered three classes apply, and `no-record` requires both to be absent. In the release phase, when `pendingAdmissions.has(projectId)`, classify the prior resources `pending-admission`, perform the ordinary release work for every record under the prior generation, and additionally `await admission.resolution` raced against the same single release backstop and no other timer. Then apply the fixed table: `absent-confirmed` passes and deletes the admission once; `audited-absent` passes, deletes each quarantine record and then the admission, each once; `materialized-quarantined` claims every `audited-unconfirmed` record with a synchronous compare-and-set to `reclaiming`, terminates and audits it once, and passes only when every quarantined identity reports all three absences; anything unresolved inside the bound settles `rejected` / `release-unconfirmed` with `replacementLaunches: 0` and `identitiesCreated: 0`, retains `restart-release-unconfirmed`, keeps the admission, and re-references it from the newly retained `failed` entry. Acceptance is never gated — only the replacement is.

   **[R4] Quarantined-residual reclamation.** Whether or not an admission exists, the release phase reclaims **every** quarantine record for that project inside the same single release backstop: an `audited-absent` record is reused and deleted once with no further termination, exactly as the delivered shutdown sweep reuses a confirming prior audit; an `audited-unconfirmed` record is claimed by the synchronous compare-and-set to `reclaiming`, terminated and audited exactly once, and deleted only when that audit reports all three absences; an `unaudited` record belongs to an in-flight continuation that already owns its one termination and is never terminated here. Quarantine records are found by scanning `quarantinedOwnership.values()` for that `projectId`, which the record already carries; no entry field, inspection field, or index is added. The gate passes only when every record for that project is `audited-absent`; otherwise the settlement is `rejected` / `release-unconfirmed` with the records retained for the next attempt or for shutdown.
7. **Detached late-settlement continuation.** When a restart settles with its launch in flight, attach exactly one `void launchPromise.then(onLateLaunchResolved, onLateLaunchRejected)` and add the promise to no set. On resolve: quarantine the exact identity if the wrapper did not already, call `ready.process.terminate(config.gracefulShutdownMs, config.forceShutdownMs, port)` with **no** caller signal because the sequencer is self-bounded, record that audit as a quarantine cleanup, increment `lateReplacementSettlements`, and set the admission to `audited-absent` when the triple confirms and `materialized-quarantined` otherwise. On reject with `ownedReported === false`: set `absent-confirmed` with `createdProcessCount: 0`. On reject with `ownedReported === true`: set `audited-absent` when every quarantined identity carries a confirming exact audit, else `materialized-quarantined`. Resolve `admission.resolution` exactly once on every path.
8. **Cardinality.** One admission per accepted restart that reaches its replacement phase; a joined caller creates none. Exactly one deletion per admission, by exactly one of three authorities and never twice: **[R4]** the owning restart's own settlement when its launch settled before settlement, a later restart's gate phase, or the shutdown sweep. Never by the continuation. Per quarantined identity: exactly one termination attempt from the path that quarantined it — the continuation for a late identity, **[R4]** or `launchReadyRuntime`'s own cleanup termination for an installed replacement attempt, which is the audit the wrapper reads — plus at most one re-attempt claimed by the compare-and-set from `audited-unconfirmed` to `reclaiming`, and exactly one deletion only after a confirming three-absence audit. **[R4]** Per replacement phase: at most `collisionAttempts` identity-keyed cleanup audits, at most one of them non-confirming, at most one quarantine record created, and exactly one project-keyed cleanup record written by the restart body.

Introduce no timer, interval, background loop, or scheduler that retries a quarantined identity on its own; reclamation happens only inside a restart's release phase or the shutdown sweep. **[R4]** A restart never reclaims a quarantine record its own replacement phase created; it blocks, settles, and leaves it to the next restart or shutdown. Introduce no persisted admission or quarantine record, no environment variable, no public state, and no route, event, or browser exposure of any admission or quarantine value. Change no behavior inside `launchReadyRuntime`.

### Files and Surfaces
- `apps/api/src/project-runtime-manager.ts`
- `apps/api/src/project-runtime-contract.ts` (types only, from T-1 step 8a)

### Acceptance Criteria
- AC-1: a second Restart cannot pass its gate or install a successor while an unresolved predecessor admission exists; when the predecessor materialises late it is terminated and its process, owned-group, and listener absences are all confirmed before the gate passes.
- AC-2: an admission that resolves `absent-confirmed` lets the retry record `already-absent`, pass its gate, and install exactly one replacement.
- AC-8: an admission that never resolves inside the release bound settles `rejected` / `release-unconfirmed`, launches nothing, and re-references the admission from the retained `failed` entry.
- AC-9: an abandoned launch that never reported ownership settles `replacement-failed` / `restart-deadline-exceeded` with `replacementAuditState: 'admission-unresolved'` and no zero-residual claim anywhere.
- AC-12: the launch promise is in no drained set, so shutdown cannot await it.
- AC-14: a late `onOwned` writes only quarantine and never `ownership`; a late `onCleanup` writes only quarantine and never `lastCleanup(projectId)`; neither mutates an entry, a successor, or the event stream.
- **[R4][R5]** AC-9, AC-11, AC-17: a confirming installed cleanup deletes exactly its own identity under its own generation and nothing else; a non-confirming installed cleanup quarantines that exact identity as `audited-unconfirmed`, records `replacementBlockReason`, and blocks the launch with no further port acquisition or spawn **on every branch — mid-loop collision, last-attempt collision, readiness, health, and early exit — with the retained category supplied by the settlement reason selector rather than by the launch error**; a three-attempt success leaves exactly one ownership record; and no attempt's audit overwrites another's.
- AC-17: each quarantined identity records one continuation termination, at most one claimed re-attempt, zero concurrent attempts, and exactly one deletion backed by a confirming triple.

### Test Coverage
- V-16 admission-lifecycle tests: creation strictly precedes `launch`; at most one admission per project; a joined caller creates none; a successful restart deletes its admission in the same settlement step that installs the `running` entry.
- V-16 gate-resolution tests for all four rows of the resolution table, asserting `admissionResolution`, `resolutionOrder: 'before-gate'`, `spawnsBeforeGate: 0`, and the exact deletion count in each.
- V-16 wrapper tests: late `onOwned` leaves `ownership.size` unchanged and grows the quarantine index by one with `auditState: 'unaudited'`; late `onCleanup` leaves `lastCleanup(projectId)` returning a successor's audit; both record zero entry mutations and zero emitted events.
- **[R5]** V-16 settlement-selector tests: `replacementBlockReason` is assigned exactly once, with the same instance passed to `phaseController.abort`, and strictly before the abort call; the settlement reads `phaseSignal.reason` before the caught launch error on every replacement-phase exit; and the four delivered launch branches — mid-loop collision, last-attempt collision, readiness/health/early-exit, and non-`RuntimeFailure` — all end with zero further `ports.acquire` and `process.launch` calls while only the first and last carry the wrapper's reason out of `launchReadyRuntime`.
- **[R4]** V-16 identity-keyed installed-cleanup tests: a confirming collision cleanup deletes exactly the audited identity, leaves another generation's record with the same key untouched, and lets the loop continue; a non-confirming one deletes it from `ownership`, creates exactly one quarantine record with `auditState: 'audited-unconfirmed'` and its exact audit, aborts with exactly `RuntimeFailure('restart-replacement-unconfirmed')`, and produces zero further `ports.acquire` and `process.launch` calls; a three-attempt success ends with `ownership.size` of one; and `replacementAttemptAudits` holds one entry per attempt with zero overwrites while `recordCleanup` was called exactly once for the phase.
- **[R4]** V-16 quarantined-residual gate tests: a project holding only a quarantine record is classified `quarantined-residual`, arms the 20,000 ms variant, reclaims under one claim, deletes only on a confirming triple, and otherwise settles `release-unconfirmed`.
- V-16 continuation tests for all three continuation outcomes, asserting the resulting phase, the termination call count, the recorded quarantine cleanup, and that the promise is absent from `completionTasks`, `backgroundTasks`, `restartTasks`, and `stopTasks`.
- V-16 cardinality test driving the continuation, a resolving restart, and a shutdown sweep against the same `audited-unconfirmed` record, asserting exactly one claim wins, `concurrentAttempts: 0`, `reattempts <= reattemptClaims`, and one deletion.
- V-4 and V-5 regression: scenarios 52, 53, 54, and 59 settle inside their declared variant bound with a recording scheduler and no real timer.

### Documentation Impact
T-12 documents the admission model, **[R4]** the five prior-resource classes, the identity-keyed replacement cleanup rule and its blocking behaviour, the quarantine indexes and their audit states, the constrained post-settlement mutation rule, and the two release-phase bounds in `docs/project-runtime.md`.

### Expected Evidence
**[R4]** V-16 results plus matrix rows 52, 53, 54, 56, 57, 58, 59, 60, 61, 62, 63, and 64 carrying the `admission`, `quarantine`, `lateCallbacks`, `taskSets`, and `replacementAttempts` row objects, and an `audit()` snapshot per row showing `pendingAdmissions`, `quarantinedOwnershipRecords`, `quarantineCleanupRecords`, and `admissionResolutions`.

## Task T-3: Extend start, reuse, stop, and shutdown for the `restarting` entry, pending admissions, and quarantine **[R3]**

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1, T-2, T-14
- **Acceptance Criteria:** AC-3, AC-12, AC-14
- **Related ADRs:** ADR-260815-explicit-workbench-restart-control, ADR-260815-selected-runtime-stop-control
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
1. In `start`, add a branch for `current?.state === 'restarting'` that throws `new RuntimeFailure('runtime-restarting')` without mutating, terminating, auditing, or emitting, placed with the existing `stopping` branch.
2. In `reuseOwnershipFailure`, return `new RuntimeFailure('runtime-restarting')` when the installed entry is `restarting`, keeping the delivered precedence: shutdown first, then an exact-match pass, then a retained failure winner, then the in-flight-operation failure.
3. In `stop`, add a branch for `current.state === 'restarting'` returning the frozen `{ outcome: 'rejected', projectId, category: 'restart-in-progress' }`, placed before the `stopping` branch.
4. In `shutdown`, await `restartTasks` alongside `stopTasks` before the ownership sweep, and treat a `restarting` entry the same way a `stopping` entry is treated: it is not terminated directly by the sweep, because its own settlement owns its generation.
4a. **[R3] Bounded shutdown over admissions and quarantine.** Awaiting `restartTasks` is finite because each restart operation is bounded by its own deadline at 66,000 ms or 81,000 ms. An abandoned launch promise is in **no** set, so the delivered unbounded `while (completionTasks.size > 0 || backgroundTasks.size > 0)` drain can never observe it; the T-8 source guard rejects any `add(` of the launch-promise identifier to any set. Extend the sweep to:
   - Sweep `quarantinedOwnership` alongside `ownership`, in the same pass and with the same termination-and-audit discipline, **[R4]** whatever created each record — a late callback, a detached continuation, or an installed replacement attempt blocked by a non-confirming cleanup: claim each `audited-unconfirmed` record with the compare-and-set to `reclaiming`, terminate and audit it once, and delete it only when the audit reports all three absences. `unaudited` records are quarantined by an in-flight continuation that already owns their one termination, so the sweep leaves them to it and reports them.
   - Report unresolved admissions honestly. Add `unresolvedAdmissions: readonly RuntimeUnresolvedAdmission[]` to `RuntimeShutdownResult` (2 members to **3**), one entry per `pendingAdmissions` value whose phase is still `launch-pending`, each exactly `{ projectToken, admissionId, phase }` with opaque values only. **Never await `admission.resolution` and never await the launch promise.**
   - Keep `status` at its delivered two values and set it to `'failed'` whenever `unresolvedAdmissions` is non-empty or any swept quarantine record failed its triple. The manager cannot audit a handle it never received, so a shutdown that leaves an unresolved admission is not an `'ok'` shutdown; widening the vocabulary would let a caller treat `'ok'` and this case as interchangeable. No zero-residual and no completed-audit claim is emitted for an unresolved admission in the result, in an event, in evidence, or in documentation.
   - A launch that materialises after `shutdown()` returned is still quarantined and terminated by its detached continuation from T-14, which touches no entry, no ownership record, no cleanup outcome, no successor, and no event because the manager is already gone.
5. In `reportPublicStates` and `inspectEntries`, ensure the new entry state flows through the delivered generic paths with no special case other than the contract mapping, and that `inspect` returns the `restarting` entry's snapshot.
6. Leave `ownsSnapshot` unchanged: it already answers only for an exact installed `running` snapshot, so a replaced snapshot fails immediately.
7. **[R2]** Keep the delivered BL-017 whole-file manager guards satisfied: introduce no capitalised single-word quoted literal (`validateStateLiterals`), and add no second `const stop = async (`, `state: 'stopping',`, `event: 'runtime.stop.requested'`, or `event: 'runtime.stop.succeeded'` occurrence (`validateManagerSource`). The new branches use `'restarting'` and `'restart-in-progress'`, both lowercase, so no guard input changes shape.

### Files and Surfaces
- `apps/api/src/project-runtime-manager.ts`

### Acceptance Criteria
- AC-3: a `restarting` entry reports `Starting` through `reportPublicStates` with no failure category.
- AC-12: a stop during a restart returns `restart-in-progress` with zero mutations; a restart during a start returns `start-in-progress`; a restart during a stop returns `stop-in-progress`; a restart after `shuttingDown` returns `manager-shutdown`.
- AC-14: a reuse observation whose recheck fails because a restart claimed its generation returns `runtime-restarting` and never a snapshot.
- **[R3]** AC-12: `shutdown()` completes within a finite bound even when an abandoned launch never settles, awaits no launch promise, and reports every unresolved admission with `status: 'failed'`.
- **[R3]** AC-14: a launch resolving after shutdown is terminated and audited through the detached continuation, and mutates no entry, ownership record, current cleanup, successor, or event.

### Test Coverage
- V-6 conflict-matrix tests for every row of the concurrency contract table in both winner orders where an order exists.
- V-6 shutdown test asserting the sweep awaits an in-flight restart, records no concurrent cleanup for one exact identity, and answers later restarts with `manager-shutdown`.
- **[R3]** V-6 and V-16 bounded-shutdown tests: with an admission left `launch-pending` by an injected launch that never settles, `shutdown()` resolves, records `awaitedAbandonedLaunch: false` and all three `taskSets` flags false, returns `status: 'failed'` with exactly one `unresolvedAdmissions` entry of opaque values, and claims no zero residual; then resolving that launch afterwards terminates and audits the identity under its quarantine key with zero entry, ownership, current-cleanup, successor, and event mutations.
- **[R3]** V-16 sweep test asserting the quarantine sweep claims only `audited-unconfirmed` records, leaves `unaudited` records to their in-flight continuation, deletes only on a confirming triple, and never double-terminates an identity a continuation is already terminating.
- V-7 reuse-recheck tests for a healthy and an unhealthy verdict delayed past the claim.
- Regression updates to `apps/api/test/runtime-stop-manager.test.ts` and `apps/api/test/project-runtime-manager.test.ts` for the widened vocabularies.
- **[R2]** A rerun of the delivered `just verify-runtime-stop` asserting `validateStateLiterals` and `validateManagerSource` still report zero violations against the widened manager, and that the committed BL-017 matrix is byte-unchanged.

### Documentation Impact
T-12 documents the conflict matrix in `docs/project-runtime.md` and the proxy-path failure in `docs/stable-workbench-routing.md`.

### Expected Evidence
**[R3]** V-6, V-7, and V-16 results plus matrix rows 28-32, 39, 41, 43, 55, and 56, each carrying the `shutdown` row object (`status`, `unresolvedAdmissionCount`, `quarantineSwept`, `awaitedAbandonedLaunch: false`, `elapsedClass`) and the `taskSets` row object.

## Task T-4: Isolate the successor from every stale prior-generation settlement

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-2, T-3
- **Acceptance Criteria:** AC-4, AC-14
- **Related ADRs:** ADR-260815-explicit-workbench-restart-control
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
No new mechanism is introduced; this task proves and, where necessary, tightens the delivered ones for the new state:

1. Verify and assert that the prior generation's `exitTask` continues to compare-and-set on the exact `running` entry object and generation, so it loses silently once `restarting` or the successor `running` entry is installed, and that its loss records no cleanup and emits nothing.
2. Ensure the abandoned prior termination's late settlement increments `lateTerminationSettlements` and performs no mutation, signal, audit, or emission.
3. Ensure a launch that resolves after the restart deadline is terminated and audited through the same path `start` uses for an aborted launch, counted in `lateReplacementSettlements`, and never installed.
4. **[R2]** Ensure a proxy acquisition holding a replaced snapshot fails `ownsSnapshot`, and make **every** runtime failure category reachable through the proxy a bounded, categorised failure rather than a wait, a stale forward, or an uncategorised error. `apps/api/src/workbench-proxy-manager.ts` needs no change: `classifyRuntime` already widens automatically to `runtime:${category}` for every category except `manager-shutdown`, and `WorkbenchFailureCategory` is a computed template-literal union over `Exclude<RuntimeFailureCategory, 'manager-shutdown'>`. The required change is in `apps/api/src/workbench-proxy-contract.ts`, because `workbenchFailure()` **throws `Error('Unknown workbench failure category')` for any category without a table row**.

   Revision 1 instructed adding one row and asserting no row exists for restart release. **That was wrong and is corrected here.** The delivered table already ships **11** `runtime:` rows against **13** proxied categories, so `runtime:stop-unconfirmed` and `runtime:runtime-stopping` are already reachable and already throw: `reuseOwnershipFailure` returns `installed.failure` for a retained failed winner — which can carry any retained category, including `stop-unconfirmed` from an unconfirmed stop and now `restart-release-unconfirmed` and `restart-deadline-exceeded` — and returns `runtime-stopping` when a stop is in flight, and `ProjectRuntimeManager.start()` throws that failure straight into `classifyRuntime`. This is a delivered latent uncategorised 500 that BL-018 widens; the honest fix is to close the table over the whole union.

   **[R4]** Add **six** rows, all `503`, inserted as a contiguous block immediately after `runtime:caller-cancelled` so the `runtime:` group stays grouped and ordered like `RUNTIME_FAILURE_CATEGORIES`:

   | Row | Status | Code | Safe message |
   |---|---|---|---|
   | `runtime:stop-unconfirmed` | 503 | `workbench_stop_unconfirmed` | `Workbench shutdown could not be confirmed.` |
   | `runtime:runtime-stopping` | 503 | `workbench_stopping` | `Workbench is stopping.` |
   | `runtime:restart-release-unconfirmed` | 503 | `workbench_restart_release_unconfirmed` | `Workbench restart could not release the previous session.` |
   | `runtime:restart-deadline-exceeded` | 503 | `workbench_restart_deadline_exceeded` | `Workbench restart did not finish in time.` |
   | `runtime:runtime-restarting` | 503 | `workbench_restarting` | `Workbench is restarting.` |
   | **[R4]** `runtime:restart-replacement-unconfirmed` | 503 | `workbench_restart_replacement_unconfirmed` | `Workbench restart could not confirm the previous attempt was cleaned up.` |

   **[R4]** `WORKBENCH_FAILURE_TABLE` goes from **23** to **29** rows and its `runtime:` group from **11** to **17** — one row per `RUNTIME_FAILURE_CATEGORIES` member except `manager-shutdown`. Every message names no path, port, PID, authority, or command. All six are retryable in the navigation shell, which is already correct because the delivered `retryableFailure` excludes only `invalid_project_id` and `project_not_found`.
5. **[R2]** Make the exhaustiveness mechanical rather than asserted in prose, so a future runtime category cannot silently reintroduce the throw:
   - Make `row` generic (`const row = <C extends WorkbenchFailureCategory>(category: C, status: number, code: string, message: string) => ({ category, status, code, message }) as const;`) and remove the widening `readonly WorkbenchPublicFailure[]` annotation from `WORKBENCH_FAILURE_TABLE` so its element categories stay literal. Add no `as any`, no `as unknown as`, and no non-null assertion.
   - Add `type TableCategory = (typeof WORKBENCH_FAILURE_TABLE)[number]['category'];` and two compile-time checks asserting `Exclude<WorkbenchFailureCategory, TableCategory>` and `Exclude<TableCategory, WorkbenchFailureCategory>` are both `never`. A missing or extra row is then a type error at build time.
   - Add a runtime check inside `validateWorkbenchFailureMatrix` asserting the table's `runtime:`-prefixed category sequence equals `RUNTIME_FAILURE_CATEGORIES.filter(isProxiedRuntimeCategory).map((c) => \`runtime:${c}\`)`, where `isProxiedRuntimeCategory` is a declared type guard excluding `manager-shutdown` — not a cast.
   - Confirm `apps/api/src/workbench-navigation-shell.ts` still compiles against the narrowed table type; it consumes `WorkbenchPublicFailure` structurally, so the narrowing is a subtype and no hand edit is expected. If a compile error appears, widen only at the shell's own boundary and record it.
6. Add no proxy broadcast, drain, or forced-close path. Prior-generation connections are severed by the confirmed absence of the released process and listener.

### Files and Surfaces
- `apps/api/src/project-runtime-manager.ts`
- **[R2][R4]** `apps/api/src/workbench-proxy-contract.ts` — **six** new `WORKBENCH_FAILURE_TABLE` rows (23 -> **29**), the generic `row` helper, the two `Exclude<..., ...> extends never` checks, the `isProxiedRuntimeCategory` guard, and the runtime order check in `validateWorkbenchFailureMatrix`
- `apps/api/src/workbench-proxy-manager.ts` (**no change expected**; `classifyRuntime` widens automatically)
- `apps/api/src/workbench-navigation-shell.ts` (**no change expected**; verify it compiles against the narrowed table type)
- **[R2][R4]** `apps/api/test/workbench-proxy-contract.test.ts` — the hard-coded row count at lines 48 and 51 (23 -> **29**, twice)
- **[R2][R5]** `apps/api/test/workbench-route-documentation.test.ts` — the `'23-failure'` topic literal at line 64 (-> **[R5]** `'29-failure'`)
- **[R2][R4]** `docs/stable-workbench-routing.md` — **six** new documented table rows, the `23-failure` anchor phrase, and the `The 23 catalog faults` sentence (-> **29**); the delivered documentation test asserts the documented row count equals `WORKBENCH_FAILURE_TABLE.length` and asserts every code and message string, so this file and the table move together
- **[R2][R4]** `apps/api/README.md:123` (`All 23 catalog rows` -> **29**) and `README.md:161` (`all 23 catalog rows` -> **29**)
- **[R2]** **No committed evidence artifact.** BL-011 retains none. `apps/api/test/workbench-route-acceptance.test.ts` and `apps/api/test/workbench-route-evidence.test.ts` build the matrix at run time by iterating `WORKBENCH_FAILURE_TABLE`, so the **[R5] six** new rows produce **six** additional real `case-runtime-*` route executions automatically and the recomputed `WORKBENCH_FAILURE_TABLE_SHA256` is compared in memory. No file under `project/work-items/**` changes for BL-011.

### Acceptance Criteria
- AC-4: after a successful restart a prior-generation HTTP request and WebSocket cannot communicate with the released runtime, and a fresh navigation through the unchanged stable route reaches the replacement.
- AC-14: every stale settlement class records `appliedToSuccessor: false`, `successorMutations: 0`, and `successorEvents: 0`.

### Test Coverage
- V-7 tests for all five stale settlement classes with the successor asserted unchanged in identity, entry, ownership record, public state, and event stream.
- **[R2]** V-7 proxy tests asserting `ownsSnapshot` is false for the replaced snapshot; that a proxy start during `restarting` yields `503` `workbench_restarting`; that a proxy start losing a reuse recheck to each retained category (`stop-unconfirmed`, `restart-release-unconfirmed`, `restart-deadline-exceeded`, **[R4]** `restart-replacement-unconfirmed`) and to an in-flight stop (`runtime-stopping`) yields its published `503` row and never an uncategorised error or a thrown `Unknown workbench failure category`; that `WORKBENCH_FAILURE_TABLE` has exactly **[R4] 29** rows; that `workbenchFailure` resolves for **every** member of `WorkbenchFailureCategory` with no throw; and that the table's `runtime:` subsequence equals `RUNTIME_FAILURE_CATEGORIES` minus `manager-shutdown` in order.
- **[R2][R4]** V-15 rerun of `just verify-workbench-route` proving the dynamically built matrix now contains **29** real executions and satisfies `validateWorkbenchFailureMatrix` against the recomputed table hash, with no committed evidence artifact created or modified.
- V-14 designated-episode assertions for a real prior-generation connection.

### Documentation Impact
T-12 documents stale-settlement isolation in `docs/project-runtime.md` and connection behaviour in `docs/stable-workbench-routing.md` and `docs/session-switching.md`.

### Expected Evidence
**[R2]** Matrix rows 10, 11, 37, 38, 39, 40, 41, and 51; the designated episode's connection record; and the `just verify-workbench-route` run report showing **[R4] 29** dynamic executions, the recomputed table hash, and zero committed-artifact diffs.

## Task T-5: Serve `POST /api/projects/:id/runtime/restart` and extend the stop route

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-7, AC-12, AC-15
- **Related ADRs:** ADR-260815-explicit-workbench-restart-control, ADR-260815-selected-runtime-stop-control
- **Related Core-Components:** CORE-COMPONENT-260808-structured-runtime-logging

### Description
1. Add `apps/api/src/routes/project-runtime-restart.ts` modelled exactly on the delivered stop route: `RUNTIME_RESTART_BODY_LIMIT_BYTES = 1_024`; frozen `RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES` with the **10** members and the status map fixed in the action plan; `PROJECT_RUNTIME_RESTART_REJECTED_EVENT = 'project.runtime.restart.rejected'` and `PROJECT_RUNTIME_RESTART_FAILED_EVENT = 'project.runtime.restart.failed'` as operational record names; the same error handler mapping for `FST_ERR_BAD_URL`, body-too-large, invalid or empty JSON body, invalid media type, and 400/413/415 to `invalid_restart_request`; the two collapsed-path `POST` registrations returning `invalid_project_id`; and the main handler rejecting a non-string or empty `:id`, any query key, and any body field.
2. Call `fastify.projectRuntime.restart({ projectId: id })` exactly once, assert `result.projectId === id` and throw `RuntimeRestartInvariantError` otherwise, log the bounded rejection category as an operational record, and send `{ id, outcome: 'restarted' }` or `{ error: { category } }`.
3. Register the plugin in `apps/api/src/app.ts` immediately after `projectRuntimeStopRoute`.
4. Extend `apps/api/src/routes/project-runtime-stop.ts` with `runtime_restart_in_progress` at **409** mapped from the manager's `restart-in-progress`, taking `RUNTIME_STOP_ROUTE_ERROR_CATEGORIES` to **10** members.
5. **[R2]** Update the delivered BL-017 guard that counts that vocabulary. `validateRouteSource` in `apps/api/src/runtime-stop-evidence.ts` asserts the stop route declares exactly **9** quoted `RUNTIME_STOP_ROUTE_ERROR_CATEGORIES` members and emits a `route-category-count` violation otherwise; change the expected count to **10**. This is the one delivered acceptance surface that fails silently if left alone, and it is a guard-constant change only — no BL-017 bound, row, or committed matrix value changes.

The response carries no public runtime state, process identity, release audit, path, or diagnostic. No pre-acceptance path emits an NFR-015 lifecycle event.

### Files and Surfaces
- `apps/api/src/routes/project-runtime-restart.ts` (new)
- `apps/api/src/routes/project-runtime-stop.ts`
- `apps/api/src/app.ts`
- **[R2]** `apps/api/src/runtime-stop-evidence.ts` — the `validateRouteSource` expected category count only (9 -> 10)

### Acceptance Criteria
- AC-7: no route path emits a lifecycle event; the operational records are named distinctly and carry only the bounded category.
- AC-12: each of the seven manager rejection categories maps to exactly one documented status and category, and every malformed request maps to a 400 category.
- AC-15: an unclassifiable response is a transport-level outcome only; the route never returns an ambiguous or partially shaped body.

### Test Coverage
- V-10 route tests for the success envelope, all ten error categories with their exact statuses, an oversized body, invalid JSON, an empty JSON body, an unsupported media type, a query parameter, a body field, an empty `:id`, both collapsed paths, a percent-encoded `:id`, and an identity-mismatch invariant fault.
- V-10 stop-route regression asserting the tenth category, its 409 status, and the nine delivered rows unchanged.
- **[R2]** V-10 rerun of `just verify-runtime-stop` asserting `validateRouteSource` reports zero violations at the new count of 10 and that the committed BL-017 matrix is byte-unchanged; plus updates to the delivered hard-coded counts at `apps/api/test/runtime-stop-documentation.test.ts:285` (9 -> 10), `:349` and `:350` (5 -> 6 entry states / targets), and `:352` (14 -> **[R4] 18** failure categories).
- V-10 disclosure scan asserting no response body contains a path, PID, port, authority, command, environment value, or raw error.

### Documentation Impact
T-12 documents both routes in `apps/api/src/routes/README.md`.

### Expected Evidence
V-10 results plus matrix rows 17, 18, 19, 28-32.

## Task T-6: Add the web restart transport, strict parser, and client-owned notices

- **Status:** Complete
- **Complexity:** Low
- **Dependencies:** T-5
- **Acceptance Criteria:** AC-6, AC-7, AC-12, AC-15
- **Related ADRs:** ADR-260815-per-project-lifecycle-activation, ADR-260815-selected-runtime-stop-control
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards

### Description
Add `apps/web/src/runtime-restart.ts` modelled exactly on the delivered `runtime-stop.ts`:

1. **[R3]** `RUNTIME_RESTART_TIMEOUT_MS = 85_000`. It **must** exceed the manager's **caller-visible ceiling** — the larger of the two declared variants, `runtimeRestartOverallBoundMs(defaults, true)` = 81,000 ms — otherwise the transport aborts every slow-but-bounded restart into `{ kind: 'unknown' }` and the bounded server categories AC-12 requires would be unreachable in the browser. Revision 1's 10,000 ms would have made `unknown` the routine outcome of a restart that hits any real allowance, and revision 2's 70,000 ms would have done the same for every restart that had to resolve a pending admission. The rule from `ADR-260815-per-project-lifecycle-activation` is unchanged; only the value it must exceed changed. A unit test asserts `RUNTIME_RESTART_TIMEOUT_MS > runtimeRestartOverallBoundMs(defaults, true)` **and** `> runtimeRestartOverallBoundMs(defaults, false)`. frozen `RUNTIME_RESTART_OUTCOMES = ['restarted']` (**1**); frozen `RUNTIME_RESTART_ERROR_CATEGORIES` with the same **10** members as the route; `RUNTIME_RESTART_NOTICES` with one bounded client-owned sentence per category naming no path, PID, port, command, or host detail; `RUNTIME_RESTART_STATUS` mapping each category to its exact status.
2. `runtimeRestartEndpoint(id)` returning `/api/projects/${encodeURIComponent(id)}/runtime/restart`.
3. `parseRuntimeRestartResponse(status, value, expectedId)` requiring exact keys, the expected ID, a known outcome for 200, and an exact `{ error: { category } }` with a status that matches the category map otherwise; throwing on anything else.
4. `sendRuntimeRestartRequest(id, ownerSignal, options)` returning `{ kind: 'success' | 'failure' | 'unknown' }`, using `AbortSignal.any([ownerSignal, timeoutController.signal])`, clearing its timer in `finally`, and returning `{ kind: 'unknown' }` for every unclassifiable transport or parse outcome.
5. Export `restartRuntime: RuntimeRestartTransport = sendRuntimeRestartRequest`.
6a. **[R2][R4]** Mirror the widened failure vocabulary in `apps/web/src/runtime-state.ts` from T-1: `RUNTIME_FAILURE_CATEGORIES` and `RUNTIME_FAILURE_NOTICES` both go 14 -> **18**, adding bounded client-owned notice text for `restart-release-unconfirmed`, `restart-deadline-exceeded`, `runtime-restarting`, and **[R4]** `restart-replacement-unconfirmed`. A public projection carrying any of the three must render a bounded notice, never a fallback or an empty string.
6. Mirror the widened stop route in `apps/web/src/runtime-stop.ts`: add `runtime_restart_in_progress` to `RUNTIME_STOP_ERROR_CATEGORIES` (**9 -> 10**), add its bounded notice to `RUNTIME_STOP_NOTICES`, and map it to **409** in `RUNTIME_STOP_STATUS`. Without this the delivered strict parser rejects a legitimate 409 and degrades a bounded outcome into `unknown`, breaking AC-12's bounded-vocabulary requirement for the stop control during a restart.

### Files and Surfaces
- `apps/web/src/runtime-restart.ts` (new)
- `apps/web/src/runtime-stop.ts` (mirror the widened stop vocabulary; 9 -> 10)
- **[R2][R4]** `apps/web/src/runtime-state.ts` (mirror the widened failure vocabulary; 14 -> **18**)

### Acceptance Criteria
- AC-6: every settled classification the controller renders is derivable from a bounded transport result.
- AC-7: no notice text or parsed field exposes a protected value.
- AC-15: an unclassifiable response yields exactly `{ kind: 'unknown' }` and never a success or an assumed state.

### Test Coverage
- V-11 parser tests for the success envelope, each of the ten categories at its exact status, a category at a wrong status, extra keys, missing keys, a wrong ID, a non-object body, and invalid JSON.
- V-11 transport tests for an empty ID, an abort, a timeout, a network rejection, and a non-JSON response, each asserting `unknown`.
- V-11 notice test asserting one bounded sentence per category and zero protected-value matches.
- **[R3]** V-11 bound test asserting `RUNTIME_RESTART_TIMEOUT_MS` is **85,000 ms** and strictly greater than both variants of `runtimeRestartOverallBoundMs` at defaults, including the 81,000 ms ceiling, so `unknown` stays an exceptional outcome rather than the normal one.
- **[R2][R4]** V-11 failure-notice test asserting the web failure vocabulary has exactly **18** members identical to the API list and that each of the four new categories renders bounded notice text.
- V-11 web stop mirror tests asserting `RUNTIME_STOP_ERROR_CATEGORIES` has exactly 10 members, that a 409 `runtime_restart_in_progress` parses to a bounded failure rather than `unknown`, and that the same category at any other status is rejected.

### Documentation Impact
T-12 documents the client contract in `apps/web/README.md`.

### Expected Evidence
V-11 results plus matrix row 42.

## Task T-7: Add the Project Home per-project restart lane, control, outcomes, and one refresh

- **Status:** **[R6] Complete** — the Restart admission now uses the global `value.close !== undefined` guard required by the ADR. The hook and component regressions prove that Close B open refuses Restart A without a transport call or restart-lane mutation, while the retained opposite-direction regression proves that Restart A pending still permits Close B. The focused 59-test web run and canonical `just verify` both pass.
- **Complexity:** High
- **Dependencies:** T-6
- **Acceptance Criteria:** AC-3, AC-6, AC-15
- **Related ADRs:** ADR-260815-per-project-lifecycle-activation, ADR-260815-public-runtime-state-projection
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards

### Description
In `apps/web/src/use-project-home.ts`:

1. Add `ProjectRestartState { readonly id: string; readonly phase: 'pending' | 'retry' | 'unknown'; readonly category?: RuntimeRestartErrorCategory }`.
2. Add `restarts: ReadonlyMap<string, ProjectRestartState>` (initially empty), `restartSettlementVersion: number` (initially 0), and `'restart'` to `focusTarget` in `ProjectHomeState`. Add `'restart'` to `activeKind` only for announcement parity; the restart lane does not claim the single Home owner.
3. Add a `restartOwners = useRef(new Map<string, Owner>())` registry and a `restart(projectId: string)` controller method. Admission requires: `listStatus === 'success'`, `mode === 'editing'`, **[R6] no close dialog open for any project — the guard is `value.close !== undefined`, never `value.close?.id === projectId`** — no owner already registered for that project unless the existing state is `phase: 'retry'`, and no pending `stop` for that project. It must not call `invalidate()`, must not read or set `owner.current`, and must not bump the global `generation`.
3a. **[R6] The close-dialog condition is global; only the restart and stop conditions are project-scoped.** This is `ADR-260815-per-project-lifecycle-activation` verbatim ("a successful project list, the ordinary editing mode, no open close dialog, no pending or in-flight restart already registered for P, and no pending stop for P" — every project-scoped clause says "for P" and this one deliberately does not) and it matches the delivered `submit`, `openClose`, and `stop` admissions, which all guard `value.close !== undefined`. A refused admission — for this or any other reason — returns synchronously and is inert: no transport call, no `AbortController`, no `restartOwners` entry, no `restarts` mutation, no `restartSettlementVersion` increment, no `focusProjectId`/`focusTarget`/`focusVersion` change, and no announcement. The opposite direction is unchanged: `openClose` keeps its per-project `restartOwners.current.has(id)` guard, so a pending restart for A never blocks opening or using Close for B. Add no close-dialog term to any `disabled` expression — the delivered dialog is `role="dialog"` with `aria-modal={true}`, a full-viewport overlay, and a Tab focus trap, so no card control is reachable while it is open and the refusal is reachable only programmatically.
4. Each admitted restart creates its own `AbortController` and `Owner` with its own monotonic generation, installs it under the project ID, and sets `restarts` to include `{ id, phase: 'pending' }` with a polite announcement.
5. On settlement, apply only when `restartOwners.current.get(projectId)` is that exact owner and the project is still in `state.projects`; otherwise discard without mutation. Then delete the owner, set `focusProjectId`/`focusTarget: 'restart'`/`focusVersion + 1`, and apply: success -> remove the entry, `restartSettlementVersion + 1`, announce the settled replacement; failure -> `{ phase: 'retry', category }` with the bounded notice announced; unknown -> `{ phase: 'unknown' }` with the explicit unknown announcement.
6. Add `restart` to `ProjectHomeController` and `restart?: RuntimeRestartTransport` to `ProjectHomeDependencies`.

In `apps/web/src/App.tsx`:

7. Add `restartRuntime?: RuntimeRestartTransport` to the app props and wire it into `useProjectHome`.
8. Add a `restartActions = useRef(new Map<string, HTMLButtonElement>())` map and extend the focus effect for `focusTarget === 'restart'`.
9. Add a `refreshedRestartSettlement` ref and an effect that calls `runtime.refresh()` exactly once per new `restartSettlementVersion`, mirroring the delivered stop-settlement effect.
10. Render the Restart control only when `currentRuntimeReports` is defined and that project's report state is `Running` or `Failed`. Give it `aria-describedby="restart-workbench-description"`, `aria-label={'Restart ' + project.name + ' workbench'}`, `data-restart-project-id={project.id}`, `disabled={state.restarts.get(project.id)?.phase === 'pending'}`, and the delivered focus-visible styling. Add the screen-reader description text stating that Restart releases the workbench and launches a replacement and that editor and terminal session state does not survive replacement.
11. Extend the card `aria-busy` expression to include a pending restart for that project.
12. Render a `role="alert"` failure block with `RUNTIME_RESTART_NOTICES[category]` and a Retry restart button, and an unknown block with the explicit unknown text and the delivered Refresh runtime state button, both scoped to that project.
13. **[R6] Corrected statement of delivered behaviour; no code change.** Do not add a close-dialog term to any `disabled` expression, and do not change the delivered per-project ones: while project P's restart is pending, P's own Open, Stop, and Close controls are disabled and P's card is `aria-busy`, because the controller genuinely refuses `stop(P)` and `openClose(P)` while a restart owner is registered for P and an Open navigation for P cannot be relied on to reach a ready runtime mid-replacement — which is what the ADR's "a control is disabled only when activating it would be refused" requires. No peer card's Open, Stop, Restart, or Close control is ever disabled by another project's pending restart, which is the availability guarantee AC-6 states. (Revisions 1 to 5 stated this as "a pending restart never disables them", which contradicted the delivered, tested, documented, and Verify-accepted behaviour.)

### Files and Surfaces
- `apps/web/src/use-project-home.ts`
- `apps/web/src/App.tsx`

### Acceptance Criteria
- AC-3: the client never renders or infers a state outside the four authoritative values and never treats a settled restart as `Running` before the refreshed projection says so.
- AC-6: Restart appears only for `Running` and `Failed`; keyboard activation works; pending, success, failure, and unknown reach assistive technology; a second activation while that project's restart is pending issues no second request; focus returns to that project's Restart control; other cards' controls stay enabled. **[R6]** An open Close dialog for *any* project refuses *every* Restart admission with no transport request and no restart-lane mutation, and a pending restart for A still leaves B's Close flow openable and usable.
- AC-15: the unknown phase is explicit, performs no automatic request, offers one manual read-only refresh, and never assumes success or creates a second replacement.

### Test Coverage
- V-12 hook tests for admission and refusal, per-project concurrency across two projects, settlement ownership after a superseded owner and after a removed project, and each settled phase.
- V-12 component tests for eligibility by state including the unavailable projection, keyboard activation, `aria-busy`, announcements, alert-role notices, focus return, the disabled scoping, and peer-control availability.
- **[R6] Cross-project admission regression, both directions, mandatory.** A hook test in `apps/web/test/use-project-home-restart.test.tsx`: open Close for B, then call `restart('a')` and assert the transport was not called, `restarts` is empty, `restartSettlementVersion`, `focusProjectId`, `focusTarget`, `focusVersion`, and `announcement` are unchanged, and `close` still holds B; the delivered `restart A pending -> openClose('b') succeeds` test is retained unchanged. A component branch in `apps/web/src/runtime-restart-component-matrix.test.tsx` under scenario 16: with the Close dialog open for the peer project, a programmatic activation of the selected project's Restart control issues zero transport requests and leaves the card unmodified, while the delivered peer-availability branch is retained.
- V-12 refresh test asserting exactly one additional state request per settled successful restart and zero on failure and unknown.
- Regression updates to `apps/web/src/App.test.tsx` and the delivered stop component matrix so a pending restart does not change their assertions.

### Documentation Impact
T-12 documents Home behaviour in `apps/web/README.md` and `README.md`. **[R6]** The correction changes no shipped sentence: neither file enumerates the controller's admission preconditions, and the documented eligibility, per-project pending rule, and peer-availability statements stay true verbatim. Record that no-impact rationale rather than editing documentation.

### Expected Evidence
V-12 results plus matrix rows 13, 14, 15, 16, 42. **[R6]** Additionally: the corrected admission expression quoted from `apps/web/src/use-project-home.ts`, the passing two-directional cross-project results (zero transport calls and a byte-unchanged restart lane with a Close dialog open for another project; B's Close flow still usable during a pending restart of A), and the unchanged pass of the delivered V-12, `App.test.tsx`, stop, and close component assertions.

## Task T-8: Build the BL-018 source guards, scenario catalog, validator, and deterministic serializer

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-7, AC-16, AC-17, AC-20
- **Related ADRs:** ADR-260815-explicit-workbench-restart-control
- **Related Core-Components:** CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Add `apps/api/src/runtime-restart-evidence.ts`:

1. **[R4]** `BL018_SCENARIOS` — the frozen **64**-member catalog in the exact order fixed in the action plan — and `Bl018Scenario`.
2. The row, matrix, declared-bounds, inventory, identity, gate, state-series, event, connection, and digest interfaces exactly as specified in the action plan's schema section.
3. `validateSelectedRestartSource(input)` implementing the source-guard rules: no `stop(`/`start(` manager call from the restart path, no launch outside the gated branch, no `registered` install in the restart path, no non-catalog event name, no stop/start/health emission from the restart path, no public-state literal outside the four values, and no bound read outside `ProjectRuntimeConfig`. **[R2]** It additionally rejects, each with its own violation code: any `processDependencies.sleep(`, `dependencies.sleep(`, or `primitives.delay(` occurrence inside the restart function body (`restart-fallible-timer`); a `scheduleDeadline(` count inside the restart body other than exactly two (`restart-deadline-arm-count`); either arm whose returned canceller is never invoked (`restart-deadline-uncancelled`); a `phaseController.abort(` argument inside the restart body that is not a `new RuntimeFailure(` expression (`restart-untyped-abort`); a deadline settlement branch reading anything other than the recorded `gateConfirmed` flag (`restart-inferred-phase`); and a `launch(` call inside the restart body passing a `config` argument other than the manager's own `config` identifier (`restart-derived-config`). It also accepts the workbench-proxy-contract source and rejects a `WORKBENCH_FAILURE_TABLE` whose `runtime:` category subsequence is not exactly `RUNTIME_FAILURE_CATEGORIES` minus `manager-shutdown` (`workbench-table-not-exhaustive`).
4. **[R4]** `validateRuntimeRestartMatrix(matrix)` implementing every rejection rule and every mutation class **M-1 through M-8**, returning `{ accepted, violations }` with one specific violation code per rule. M-6 covers deadline truth: a non-`trusted-scheduler` arm source, an uncancelled arm on a settled row, a `fired: overall` row whose `abortReasonCategory` is `manager-shutdown`, a `fired: overall`/`gateConfirmed: false` row with launches above zero, a `fired: overall`/`gateConfirmed: true` row retaining the wrong category, and **[R5]** an `unaudited-retained` row whose `residualCount` is not `null`.

   **[R3]** M-7 covers admission and quarantine truth, with its own violation code per rule: **[R5]** an `admission-unresolved` row whose `residualCount` is not `null`; a `priorResourceClass: 'no-record'` row whose project held an unresolved admission; a gate passed with `admission.resolution: 'unresolved'` or `resolutionOrder: 'after-gate'`; a launched row with `admission.createdBeforeLaunch` false; a `lateCallbacks` object with a non-zero `ownershipMapMutations`, `entryMutations`, `currentCleanupMutations`, or `eventsEmitted`; a quarantine deletion without a confirming three-absence audit; `quarantine.concurrentAttempts` above zero or `reattempts` above `reattemptClaims`; any `taskSets` flag recording an abandoned launch in a drained set; and a `shutdown` object reporting `status: 'ok'` with a non-zero `unresolvedAdmissionCount` or `awaitedAbandonedLaunch: true`. The validator additionally rejects **[R4]** a `priorResourceClass` or `replacementAuditState` outside its **five** values, an `admission.phaseAtSettlement` outside `RESTART_ADMISSION_PHASES`, a `quarantine.auditStates` member outside `RESTART_QUARANTINE_AUDIT_STATES`, an `admission.deletions` above one, a `restarted` row whose `admission.resolution` is `unresolved`, and an `admission.admissionsCreated` above one for one accepted restart or non-zero for a joined caller.

   **[R4]** M-8 covers collision cleanup identity truth, with its own violation code per rule: a confirming replacement cleanup that did not delete its exact ownership record, or that deleted another identity's or another generation's; a non-confirming cleanup with no quarantine record, with an `auditState` other than `audited-unconfirmed`, or with no phase abort; a row whose `replacementAttempts.portsAcquiredAfterAbort` is above zero; a `restarted` row carrying any quarantine record that is not `audited-absent`; a multi-attempt success whose `replacementAttempts.ownershipRecordsAfterSettlement` is not exactly one; a `quarantined-unconfirmed` row whose `residualCount` is not `null`, whose `outcome` is `restarted`, or whose retained category is neither `restart-replacement-unconfirmed` nor `restart-deadline-exceeded`; a `priorResourceClass: 'no-record'` row whose project held an uncleared quarantine record; an `attemptAuditOverwrites` above zero; and a `projectKeyedCleanupWrites` other than one per executed phase. **[R5]** M-8 additionally covers settlement-reason precedence: a row whose `settlementReasonSource` is `launch-error` while its own replacement phase created a quarantine record; a row whose `settlementReasonSource` is `phase-abort` whose retained category differs from its recorded phase-abort reason category; a non-confirming cleanup row with an absent `launchRejectionCategory`; and a `settlementReasonSource` outside its three values.

4d. **[R5] Settlement-reason evidence fields.** Extend the `replacementAttempts` row object with `settlementReasonSource` — exactly one of `phase-abort`, `launch-error`, or `none` — and `launchRejectionCategory`, a `RUNTIME_FAILURE_CATEGORIES` member or `null`, so every row records both what the launch primitive rejected with and what the manager classified from. The validator proves the precedence rather than trusting it, using the M-8 rules below.

4e. **[R5] Residual-claim encoding.** Declare the row field `residualCount: number | null` and the separate harness-owned `teardownResidualCount: number`, and implement the residual-claim predicate from the action plan as one total function of values the row already carries (`replacementAuditState`, `releaseMode`, `admission.resolution`, `quarantine.recordCount` and `auditStates`). The validator rejects, each with its own violation code: a `residualCount` that is a positive number, a negative number, a non-integer, `NaN`, a non-numeric value, or absent; a `residualCount` of `0` on a row the predicate says is `null`; a `residualCount` of `null` on a row the predicate says is `0`; a `teardownResidualCount` other than the integer `0`; and any row that counts a quarantined identity, an unresolved admission, or a retained unaudited replacement inside `teardownResidualCount`. `null` is the schema's only representation of a withheld residual claim; there is no sentinel number and no absent field.

4a. **[R3]** Extend `validateSelectedRestartSource` with six new violation codes over `apps/api/src/project-runtime-manager.ts`: `restart-admission-missing` (a `launch(` inside the restart body not preceded in the same block by a `pendingAdmissions.set(`); `restart-late-callback-unguarded` (an `onOwned:` or `onCleanup:` argument at that call site that is not the `restartOnOwned(`/`restartOnCleanup(` identifier); `restart-quarantine-project-keyed` (a `recordCleanup(` or `registerOwnership(` on the late or quarantine path instead of `recordQuarantineCleanup(`/`quarantineOwnership(`); `restart-abandoned-task-tracked` (a `completionTasks.add(`, `backgroundTasks.add(`, `restartTasks.add(`, or `stopTasks.add(` whose argument is the launch-promise identifier); `restart-admission-shortcut` (a `no-record` prior-resource branch that does not read `pendingAdmissions`); and `restart-detached-continuation-missing` (a settlement path that can leave a launch in flight without a `void <launchPromise>.then(` continuation).

4b. **[R4]** Extend `validateSelectedRestartSource` with two further violation codes over the same source: `restart-cleanup-not-identity-keyed` (an installed `restartOnCleanup` branch whose `ownership.delete(` argument is not a key derived from the cleanup audit's `pid`, `processStartTime`, and `port`, or that deletes by project ID, or that calls `recordCleanup(` from either wrapper branch); and `restart-unconfirmed-cleanup-not-blocked` (a non-confirming installed cleanup branch with no synchronous `phaseController.abort(new RuntimeFailure('restart-replacement-unconfirmed'))`, or that does not assign that same instance to `replacementBlockReason` first).

4c. **[R5]** Extend `validateSelectedRestartSource` with one further violation code over the same source: `restart-settlement-reason-precedence-missing` — a replacement-phase settlement branch that derives a retained failure category or a `replacementAuditState` from the caught launch error without first reading `phaseSignal.reason` as a typed `RuntimeFailure`, or that reads `replacementBlockReason` after the launch error rather than before it. Violation codes added by this issue go from **7** to **[R5] 16**.
5. `serializeRuntimeRestartMatrix(matrix)` producing deterministic JSON with stable key order, fixed `bl018-<surface>-<scenario>` execution IDs, no wall-clock timestamps, no measured durations, and opaque identity correlation tokens.
6. Reuse `validatePublicReportingSource` and the delivered protected-value regular expression from `runtime-state-evidence.ts` and `runtime-stop-evidence.ts` rather than redefining them.

### Files and Surfaces
- `apps/api/src/runtime-restart-evidence.ts` (new)

### Acceptance Criteria
- AC-7: the validator rejects a non-catalog event name, a wrong cardinality, a non-zero pre-accept or loser or foreign event count, and any protected-value match.
- AC-16: the catalog, the schema version, the declared bounds, and the validator are all fixed before execution and asserted in that order.
- AC-17: every correlation column required by AC-17 exists in the row schema and is validated. **[R5]** `teardownResidualCount` is the field that carries AC-17's validation-owned zero-residual proof and is validated as the integer `0` on every row; `residualCount` is the separate settlement-knowledge field and is validated against the residual-claim predicate, so neither can be substituted for the other.
- **[R5]** AC-9, AC-11, AC-17: `residualCount: number | null` and both settlement-reason fields exist in the schema, the residual-claim predicate is enforced in both directions, and the M-8 precedence rules reject any row whose recorded classification contradicts its own settlement-reason source.
- **[R3][R4]** AC-9, AC-12, AC-14, AC-17: the `admission`, `quarantine`, `lateCallbacks`, `taskSets`, `shutdown`, and **[R4]** `replacementAttempts` row objects exist in the schema, the **five**-value `priorResourceClass` and `replacementAuditState` unions are enforced, and every M-7 and **[R4]** M-8 rule has a distinct violation code and a synthetic negative fixture.
- AC-20: the module has no network, credential, host-service, or manual-judgment dependency.

### Test Coverage
- **[R4]** V-13 unit tests asserting catalog length **64**, fixed order, no duplicates, no name that is a prefix of another, and stable serialization.
- V-13 mutation tests applying at least one corruption per rule and asserting the specific violation code.
- **[R2]** V-13 source-guard tests over the real manager, process, restart-route, stop-route, and workbench-proxy-contract sources, including a synthetic negative fixture per new violation code.

### Documentation Impact
T-12 documents the evidence contract and its artifacts in `docs/project-runtime.md`.

### Expected Evidence
V-13 validator and guard results; the committed matrix depends on this module.

## Task T-9: Execute the 64-scenario matrix with inventory, manifests, digests, and cleanup **[R3][R4]**

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-2, T-3, T-4, T-5, T-6, T-7, T-8, T-14
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-20
- **Related ADRs:** ADR-260815-explicit-workbench-restart-control, ADR-260815-per-project-lifecycle-activation
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-filesystem-path-safety

### Description
Add `apps/api/test/runtime-restart-matrix.test.ts` and `apps/api/test/runtime-restart-fixtures.ts`:

1. **[R2]** Build the injectable harness: recorded process, port, health, clock, sleep, and event dependencies; a recording `RuntimeDeadlineScheduler` whose `scheduleDeadline` records `(delayMs, onDeadline)` and returns a recorded canceller so a test fires a deadline synchronously and asserts cancellation, without any scenario waiting on a real allowance; an in-process Fastify instance; an isolated project database; two disposable project fixtures; one declared unrelated control process; one declared unrelated control listener.
2. Assert the catalog, schema version, declared bounds, and validator are fixed before the first scenario action.
3. **[R4]** Execute all **64** scenarios in catalog order, recording every column of the row schema, including the pre-declared four-class inventory, the ordered state series per surface, the gate record with `gateConfirmed`, both deadline arm records with `source`, `declaredMs`, `cancelled`, `fired`, and `abortReasonCategory`, `replacementAuditState`, the identity pair, per-phase terminate and cleanup counts, `lateTerminationSettlements` and `lateReplacementSettlements`, the event tables, the peer and control digests, the registration field digests, the fixture manifest digests, the elapsed class with `withinDeclaredBound`, **[R5]** `residualCount` (the operation's settlement residual knowledge, `null` wherever the residual-claim predicate withholds a claim) and `teardownResidualCount` (the harness's validation-owned fixture cleanup, always the integer `0`) as two distinct fields, and — **[R3]** — the `admission`, `quarantine`, `lateCallbacks`, `taskSets`, and `shutdown` row objects with an `audit()` snapshot per row, **[R4]** plus the `replacementAttempts` row object **[R5]** including its `settlementReasonSource` and `launchRejectionCategory`. **[R3]** Scenarios 52-60 use an injected launch promise the test resolves, rejects, or never settles, so the abandoned-launch, late-materialisation, and unresolved-shutdown cases are fully deterministic and offline. **[R4]** Scenarios 61-64 use an injected launch whose per-attempt cleanup audit triples the test fixes before execution — confirming for rows 61 and 64, one non-confirming for rows 62 and 63 — and assert `ports.acquire` and `process.launch` call counts directly, so the block-on-unconfirmed-cleanup behaviour is proven by counted primitive calls rather than by timing. **[R5]** Scenario 62 executes **both** of its declared branches in the one row: branch A, a mid-loop collision whose cleanup is non-confirming; and branch B, a readiness-timeout failure whose cleanup is non-confirming and whose launch therefore rejects with `readiness-timeout` while the settlement still retains `restart-replacement-unconfirmed`. Both branches assert `settlementReasonSource: 'phase-abort'`, the branch's own `launchRejectionCategory`, `portsAcquiredAfterAbort: 0`, and `residualCount: null`.
4. Write measured monotonic timing to `test-results/bl-018/runtime-restart-timing.json` and assert each measured elapsed is within its configured bound.
5. **[R4]** Validate the matrix and assert acceptance; then apply one controlled corruption per validator rule across mutation classes **M-1 through M-8** and assert each is rejected with its specific violation code.
6. Write the deterministic matrix to `test-results/bl-018/runtime-restart-matrix.json`, assert SHA-256 equality with the committed copy at `project/work-items/41-bl-018-restart-a-running-or-failed-workbench/implementation/evidence/runtime-restart-matrix.json`, re-read and revalidate the committed copy, and assert byte-identical reserialization.
7. Add `apps/api/test/runtime-restart-residual-audit.test.ts` driving the residual-audit CLI over controlled artifacts without disturbing the disposable designated artifact.

Browser rows 13-16 and 42 are executed through the delivered component-test harness in `apps/web/src/runtime-restart-component-matrix.test.tsx` and their results are carried into the matrix as `homeState` and browser-scoped columns.

### Files and Surfaces
- `apps/api/test/runtime-restart-matrix.test.ts` (new)
- `apps/api/test/runtime-restart-fixtures.ts` (new)
- `apps/api/test/runtime-restart-residual-audit.test.ts` (new)
- `apps/web/src/runtime-restart-component-matrix.test.tsx` (new)
- `project/work-items/41-bl-018-restart-a-running-or-failed-workbench/implementation/evidence/runtime-restart-matrix.json` (new, committed)

### Acceptance Criteria
- **[R4]** AC-16: all **64** scenarios execute deterministically and offline against bounds fixed before their first action; no scenario waits on a real 60,000 ms, 66,000 ms, or 81,000 ms allowance, because every deadline is fired through the recording scheduler.
- **[R2][R5]** AC-17: every correlation column is populated; `teardownResidualCount` is the integer `0` after teardown for **every** scenario without exception; and `residualCount` follows the residual-claim predicate — the integer `0` only where a completed exact audit observed absence, and `null` on every row whose replacement audit state is `unaudited-retained`, `admission-unresolved`, or `quarantined-unconfirmed`, whose release was unconfirmed, whose admission is unresolved, or which holds a quarantine record outside `audited-absent`. A `null` is a withheld claim, never a missing value and never a zero.
- AC-5, AC-13: registration, fixture, peer, and control digests are unchanged for every restart outcome.
- AC-20: no scenario requires network access, a credential, a hosted service, unsupported hardware, a destructive action, an indefinite wait, or manual judgment.

### Test Coverage
This task *is* V-13; its assertions are enumerated in the test plan.

### Documentation Impact
T-12 documents the matrix, its artifacts, and its commands.

### Expected Evidence
The committed `runtime-restart-matrix.json` with its SHA-256, the disposable timing artifact, the mutation-rejection table, and the reserialization equality result.

## Task T-10: Add the designated-host restart episode and the independent residual audit

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-2, T-8, T-14
- **Acceptance Criteria:** AC-1, AC-4, AC-11, AC-17, AC-20
- **Related ADRs:** ADR-260815-explicit-workbench-restart-control, ADR-260815-termination-sequencer-boundary
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-host-process-environment

### Description
1. Add `apps/api/test/runtime-restart-designated.test.ts`, gated by `BL018_DESIGNATED=1`, modelled on `runtime-stop-designated.test.ts`. It starts one real code-server generation for a disposable fixture, records the exact root identity and every owned process-group member identity with their process start times, records the loopback listener port, establishes one real HTTP connection and one real WebSocket to that generation through the stable route, then calls `restart`, then records: the post-release audit of the root identity, every recorded member identity, the owned process group, and the listener; the outcome of the retained prior-generation connections; the replacement identity and its readiness verdict; the unchanged stable route; and the unchanged registration and fixture manifests. It writes `test-results/bl-018/designated-episode.json` with `schemaVersion: 1` and the verbatim attribution ceiling.
2. The episode records the strongest honest claim: absence is proven for the exact recorded prior root identity, every owned process-group member identity recorded immediately before the restart, the owned process group, and the prior loopback listener; descendants that left the owned group before the closure was recorded are outside the episode; and no claim is made that editor or terminal session state survived.
3. Add `apps/api/src/cli/runtime-restart-residual-audit.ts` modelled on `runtime-stop-residual-audit.ts`. It reads the episode artifact out of process and independently re-probes the prior root identity, every recorded member identity, the owned process group, the prior listener, and the retained stale connection, writing `test-results/bl-018/residual-audit.json` with zero-valued residual counts for all seven classes and a non-zero exit code on any residual. It accepts an optional explicit episode path for the controlled unit test.
4. The episode also executes three sequential real restarts for AC-11's post-sequence residual claim, asserting exactly one runtime and one listener after each settlement.
5. **[R3] The episode/residual-audit proof split, stated in both artifacts.** The episode runs *inside* the API process that owns the manager, so it can hold real connections and read the manager's own admission and quarantine indexes, but it cannot independently prove that a late-materialising process or listener closed — the only observer is the process being asked to prove the claim. The residual audit is the authority for late process, owned-group, and listener closure because it re-probes recorded exact identities from a separate process after the episode ended; its ceiling is that it can only probe identities that were **recorded**, so an admission that never materialised has no tuple to probe.
6. **[R3] The episode may not finish while it still knows about an unaudited resource.** Before writing its artifact and returning, the episode MUST have the prior root identity, every recorded owned-group member, the replacement, and every quarantined late identity audited absent, or it MUST fail. It asserts `pendingAdmissions === 0` and `quarantinedOwnershipRecords === 0` at the end of every settlement and at teardown, so it never leaves a `launch-pending` admission behind. The never-settling-launch, late-materialisation, and unresolved-shutdown cases are therefore proven only in T-9's deterministic matrix, where the launch primitive is injected.
7. **[R3][R4]** The residual-audit CLI emits an `unresolvedAdmissions` array alongside its seven zero-valued residual classes, **[R4]** and a `quarantinedIdentities` array carrying every recorded identity whose audit state is not `audited-absent`, each with its exact key and its three audit booleans. When either array is non-empty the command exits non-zero and reports those entries honestly; it never converts an unresolved admission or an unconfirmed quarantined identity into a proven absence or a zero residual. **[R4]** It also reports, without converting to a residual claim, any prior-generation ownership record it was given that it cannot prove absent, which is how the delivered start-path collision record recorded in the action plan's proof ceilings is surfaced rather than absorbed. **[R5]** The CLI reads each episode row's `residualCount` as `number | null`: a `null` is an unresolved residual that forces a non-zero exit, never a satisfied check and never coerced to `0`. It reads `teardownResidualCount` strictly as validation-owned fixture teardown and never as a manager absence claim, and it never merges the two fields or reports one in place of the other.

### Files and Surfaces
- `apps/api/test/runtime-restart-designated.test.ts` (new)
- `apps/api/src/cli/runtime-restart-residual-audit.ts` (new)

### Acceptance Criteria
- AC-1: a real release-and-replace episode proves the confirmed prior absence before the replacement and the distinct replacement identity.
- AC-4: a real prior-generation HTTP connection and WebSocket cannot communicate after the restart, and a fresh navigation reaches the replacement.
- AC-11: three real sequential restarts leave exactly one runtime and one listener after each settlement and no residual after the sequence.
- AC-17: the residual audit is a separate out-of-process command, so the episode is not self-certifying.
- **[R3]** AC-17: the episode fails rather than finishing while any identity it recorded is unaudited, and neither artifact reports a zero residual for an unresolved admission.
- **[R5]** AC-17: the seven zero-valued residual classes the audit reports are validation-owned teardown facts; a settlement row's withheld `residualCount` is `null` and is reported as unresolved rather than folded into those zeros.
- AC-20: the episode uses only repository-local fixtures, the configured local code-server, and loopback networking.

### Test Coverage
This task *is* V-14; its assertions are enumerated in the test plan.

### Documentation Impact
T-12 documents both commands, their artifacts, their bounds, and their cleanup guarantees.

### Expected Evidence
`test-results/bl-018/designated-episode.json` and `test-results/bl-018/residual-audit.json`, both disposable and re-provable by re-running their recipes, **[R3]** each carrying the verbatim proof-split statement, the final `pendingAdmissions: 0` and `quarantinedOwnershipRecords: 0` assertions, and the residual audit's `unresolvedAdmissions` array.

## Task T-11: Add the root justfile recipes and wire them into `verify`

- **Status:** Complete
- **Complexity:** Low
- **Dependencies:** T-9, T-10
- **Acceptance Criteria:** AC-16, AC-19, AC-20
- **Related ADRs:** ADR-260815-explicit-workbench-restart-control
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface

### Description
1. Add `verify-runtime-restart` running, with `BL018_ACCEPTANCE=1` and `--reporter=verbose`: `apps/api/test/runtime-restart-contract.test.ts`, `apps/api/test/runtime-restart-manager.test.ts`, `apps/api/test/runtime-restart-conflicts.test.ts`, `apps/api/test/runtime-restart-stale.test.ts`, `apps/api/test/runtime-restart-events.test.ts`, `apps/api/test/runtime-restart-route.test.ts`, `apps/api/test/runtime-restart-evidence.test.ts`, `apps/api/test/runtime-restart-matrix.test.ts`, `apps/api/test/runtime-restart-residual-audit.test.ts`, `apps/api/test/runtime-restart-documentation.test.ts`, `apps/web/test/runtime-restart-client.test.ts`, `apps/web/test/use-project-home-restart.test.tsx`, `apps/web/src/runtime-restart-component-matrix.test.tsx`, and `apps/web/src/App.test.tsx`.
2. Add `proof-runtime-restart` running the designated test with `BL018_DESIGNATED=1 --reporter=verbose`.
3. Add `proof-runtime-restart-residual-audit` running the new CLI through `pnpm --filter @ascend/api exec tsx`.
4. Wire the three recipes into `verify` immediately after `just proof-runtime-stop-residual-audit` and before `just verify-mvp-performance`, each exactly once.
5. Add `test-results/bl-018/` to the ignore rules if the delivered rule does not already cover `test-results/`.

Add no standalone runner, verification config, or validation sidecar. Change no existing recipe's contents, worker count, retry count, or bound.

### Files and Surfaces
- `justfile`
- `.gitignore` (only if `test-results/` is not already ignored)

### Acceptance Criteria
- AC-16: every new scenario is reachable from a repeatable root recipe.
- AC-19: `verify` contains each new recipe exactly once, in the fixed position, and no delivered recipe changes.
- AC-20: every recipe is repository-local and finite.

### Test Coverage
- V-15 justfile assertions: the three recipes exist, `verify` references each exactly once, the insertion position is exact, and the delivered recipe bodies are unchanged.
- V-15 executes `just verify-runtime-restart`, `just proof-runtime-restart`, and `just proof-runtime-restart-residual-audit` independently.

### Documentation Impact
T-12 documents the three commands in `README.md` and `docs/project-runtime.md`.

### Expected Evidence
The `verify` recipe diff and the recorded successful output of each new recipe.

## Task T-12: Update affected application documentation and documentation tests

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1 through T-11, T-14
- **Acceptance Criteria:** AC-18
- **Related ADRs:** all five ADRs of this issue
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards

### Description
Execute every row of the Documentation Scope table in `01-action-plan.md`:

1. **[R2][R4]** `README.md` — the BL-018 section, the failure-category count correction at line 73 (14 -> **18**), the workbench catalog-row count correction at line 161 (23 -> **29**), and reconciliation of every deferred-Restart sentence.
2. `docs/README.md` — the BL-018 index entry and the line 162 deferral reconciliation, keeping BL-019 and BL-020 explicitly deferred.
3. **[R3][R4]** `docs/project-runtime.md` — the operation, six entry states, six transition targets, eligibility table, **[R4]** the **five** prior-resource classes, claim and joining, gate, the pending replacement admission with its four phases and the rule that it is created before every launch, the exact-identity quarantine indexes with their four audit states, the restart-scoped callback wrappers, **[R4]** the identity-keyed replacement cleanup rule — a confirming triple deletes exactly one attempt's ownership record, a non-confirming triple quarantines that exact identity as `audited-unconfirmed` and blocks the attempt loop — and the rule that no restart may launch or claim a zero residual while a quarantine record for that project is uncleared, the constrained post-settlement mutation rule, the detached late-settlement continuation and why an abandoned launch belongs to no awaited task set, bounded shutdown with `unresolvedAdmissions` and its `failed` status, the two release-phase bounds (5,000 ms ordinarily, **20,000 ms** when **[R4]** an admission or a quarantine record must be resolved) and the quarantine reclamation allowance (`restartQuarantineReleaseBoundMs`, **15,000 ms**), the replacement allowance (`runtimeReplacementBoundMs`, **60,000 ms**) with its `collisionAttempts x (readinessTimeoutMs + runtimeStopOverallBoundMs)` derivation, the settlement allowance (1,000 ms), both overall bounds (`runtimeRestartOverallBoundMs(config, false)` = **66,000 ms** and `(config, true)` = **81,000 ms**, the latter being the caller-visible ceiling) and the trusted `scheduleDeadline` primitive that arms both restart deadlines, all bounded non-success settlements including the phase-aware deadline and its `restart-deadline-exceeded` category, the honest `unaudited-retained`, `admission-unresolved`, and **[R4]** `quarantined-unconfirmed` replacement rules, **[R5]** the settlement reason selector — that an aborted replacement phase is classified from the restart's own typed phase-abort reason and never from the launch error, so a readiness, health, early-exit, or last-attempt-collision failure whose cleanup did not confirm absence retains `restart-replacement-unconfirmed` — **[R5]** and the two-field residual encoding, stating that a withheld residual claim is published as an explicit `null` and never as a zero and that validation-owned fixture teardown is recorded in its own field, per-phase and quarantine cardinality, stale-settlement isolation, conflict matrix, **[R4] 18** failure categories (correcting the line 74 count and naming the four new ones), event cardinality, evidence artifacts, and commands, plus the deferred-boundaries correction.
4. `apps/api/src/routes/README.md` — both routes, all ten restart rows, the added stop row taking stop to ten, and the disclosure limits.
5. **[R2]** `apps/web/README.md` — eligibility, keyboard activation, four announced outcomes, per-project pending rule, focus return, peer availability, the single post-success refresh, the unknown outcome with its BL-019 boundary statement, **[R3]** the **85,000 ms** transport bound and why it must exceed the **81,000 ms** caller-visible manager ceiling, and the stop error-category count correction at line 34 (nine -> **ten**).
6. **[R2][R4]** `docs/stable-workbench-routing.md` — the **six** new published table rows taking the documented catalog to **29**, the `23-failure` anchor phrase and the `The 23 catalog faults` sentence corrected to **29**, proxy-path failure during `restarting`, the newly published retained-category rows, replaced-snapshot ownership failure, no proxy-side coordination, unchanged stable route, prior-generation connection severance, and the line 101 deferral reconciliation. The delivered `workbench-route-documentation.test.ts` asserts the documented row count equals `WORKBENCH_FAILURE_TABLE.length` and asserts every code and message string, so this file must move with T-4.
7. `docs/session-switching.md` — explicit Stop and Restart are the only runtime changers, and the explicit no-session-continuity statement.
8. **[R2]** `apps/api/README.md` — selected restart is BL-018; running/failed close remains BL-020; API-restart reconciliation remains BL-019; the catalog-row count at line 123 (23 -> **[R4] 29**); and the lifecycle catalog description at line 142 (`six-name` -> **nine-name**).
9. Configuration, migration, and deployment — record the explicit no-impact rationale in `implementation/00-implementation.md`; no file changes.
10. Add `apps/api/test/runtime-restart-documentation.test.ts` asserting the BL-018 phrases, counts, bounds, commands, and boundary statements, and update the delivered documentation tests whose expectations assert that Restart is absent.

### Files and Surfaces
- `README.md`, `docs/README.md`, `docs/project-runtime.md`, `docs/stable-workbench-routing.md`, `docs/session-switching.md`, `apps/api/README.md`, `apps/api/src/routes/README.md`, `apps/web/README.md`
- `apps/api/test/runtime-restart-documentation.test.ts` (new)
- `apps/api/test/project-runtime-documentation.test.ts`, `apps/api/test/runtime-state-documentation.test.ts`, `apps/api/test/runtime-stop-documentation.test.ts`, `apps/api/test/session-switching-documentation.test.ts`, `apps/api/test/workbench-route-documentation.test.ts`
- **[R2]** Exact delivered count literals to update: `apps/api/test/runtime-stop-documentation.test.ts:285` (9 -> 10), `:349` and `:350` (5 -> 6), `:352` (14 -> **[R5] 18**); `apps/api/test/workbench-route-documentation.test.ts:64` (`'23-failure'` -> **[R5]** `'29-failure'`)
- **[R2]** Exact delivered count literals that must **not** change, and are asserted unchanged: `apps/api/test/workbench-presentation-contract.test.ts:136` (`PRESENTATION_ASSERTION_IDS` length 23), `apps/api/test/workbench-route-proof-correction.test.ts:232` (`WORKBENCH_BROWSER_CLASSIFIER_VECTORS` length 23), and the `fourteen` workflow count in `docs/session-switching.md` — none of the three counts anything this issue widens

### Acceptance Criteria
- AC-18: every documentation category records eligibility, state and connection behaviour, outcomes, predeclared bounds, accessibility, privacy, evidence, cleanup, and commands, and every surface explicitly preserves the BL-019 and BL-020 boundaries.
- **[R3]** AC-18: no shipped document asserts a zero residual, a completed audit, or a clean shutdown for an unresolved pending admission, and every document that names a bound names the correct revision-3 value.

### Test Coverage
- **[R2][R4]** V-15 documentation assertions per file, including every corrected count (**18** failure categories, **29** catalog rows, 10 stop route categories, 9 lifecycle events), **[R3]** the **66,000 ms** and **81,000 ms** overall bounds, the **20,000 ms** pending-admission release bound, the **15,000 ms** quarantine reclamation allowance, the **60,000 ms** replacement allowance and its derivation, the **85,000 ms** transport bound, the admission and quarantine model, the constrained post-settlement mutation rule, **[R4]** the identity-keyed replacement cleanup rule and the quarantine gate condition, **[R5]** the settlement reason selector and the two-field residual encoding, honest shutdown reporting, the three command names, the no-session-continuity statement, and the BL-019/BL-020 boundary statements.
- V-15 negative assertion that no shipped document still states Restart is deferred.

### Documentation Impact
This task *is* the documentation work.

### Expected Evidence
V-15 documentation results plus the implementation note recording evidence or an explicit no-impact rationale for all eleven categories.

## Task T-13: Retain committed evidence and run targeted regressions plus the full gate

- **Status:** **[R6] Complete** — the changed web paths pass 59 focused tests and canonical `just verify` passes. The committed matrix remains byte-identical at `fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880`, and `/tmp/ascend-runtime-data` contains zero test-owned directories after the gate.
- **Complexity:** Medium
- **Dependencies:** T-1 through T-12, T-14
- **Acceptance Criteria:** AC-17, AC-19, AC-20
- **Related ADRs:** all five ADRs of this issue
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260505-commit-standards

### Description
1. Commit the deterministic matrix to `project/work-items/41-bl-018-restart-a-running-or-failed-workbench/implementation/evidence/runtime-restart-matrix.json` and confirm regeneration leaves the tracked file unmodified.
2. Run `just verify-focused` on the changed test paths while building, fixing every failure before proceeding.
3. Run each named regression recipe independently: `verify-project-runtime`, `verify-workbench-route`, `verify-home-workbench false`, `verify-project-runtime-isolation`, `verify-session-switching`, `verify-runtime-state`, `verify-runtime-stop`, `proof-runtime-stop`, `proof-runtime-stop-residual-audit`, and `verify-mvp-performance`.
3a. **[R2]** Record the SHA-256 of every committed BL-003, BL-004, BL-010, BL-015, BL-016, and BL-017 evidence artifact before and after the whole implementation and assert equality. BL-018 creates exactly one new committed artifact, `runtime-restart-matrix.json`, and modifies none. BL-011 has no committed artifact to regenerate; its matrix is built at run time from `WORKBENCH_FAILURE_TABLE`.
4. Run `just verify` and record its successful completion.
5. Record concrete implementation evidence for every AC ID in `implementation/00-implementation.md`, including documentation evidence or an explicit no-impact rationale per category, and hand off a clean working tree with the branch and commit SHA.

### Files and Surfaces
- `project/work-items/41-bl-018-restart-a-running-or-failed-workbench/implementation/evidence/runtime-restart-matrix.json`
- `project/work-items/41-bl-018-restart-a-running-or-failed-workbench/implementation/00-implementation.md`

### Acceptance Criteria
- **[R5]** AC-17: the committed matrix and both audit artifacts are retained or re-provable; every row's `teardownResidualCount` is the integer `0`; and every row's `residualCount` is the integer `0` where a completed exact audit observed absence and `null` where the residual-claim predicate withholds a claim. **[R3]** A scenario recording `replacementAuditState: 'admission-unresolved'` reports its unresolved admission and records `residualCount: null`, and **[R4]** a scenario recording `replacementAuditState: 'quarantined-unconfirmed'` reports its retained quarantine record and its exact audit and records `residualCount: null`; neither makes a zero-residual or success statement anywhere.
- **[R2]** AC-19: `just verify` completes successfully, every named BL-010 through BL-017 regression gate passes independently, and every previously committed evidence artifact is byte-unchanged.
- AC-20: every command run is a repository-local `just` recipe with a finite bound.

### Test Coverage
This task runs V-15's command block and every regression recipe.

### Documentation Impact
None beyond T-12; the implementation note records the evidence.

### Expected Evidence
Recorded successful output of every regression recipe and of `just verify`, the committed matrix SHA-256, both disposable audit artifacts, and the per-AC evidence table in `implementation/00-implementation.md`.
