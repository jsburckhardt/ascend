# Task Breakdown: BL-020 Close a running or failed project

- **Issue:** https://github.com/jsburckhardt/ascend/issues/45
- **Action Plan:** project/work-items/45-bl-020-close-a-running-or-failed-project/plan/01-action-plan.md
- **Test Plan:** project/work-items/45-bl-020-close-a-running-or-failed-project/plan/03-test-plan.md
- **Branch:** feat/45-close-a-running-or-failed-project
- **Base SHA:** 2f51f768c2fa8b80b2d8cb0347ee22196e9f9e13

**Revision 8.** This breakdown was revised after the independent review of revision 1 (blockers B1 – B7 and notes N1 – N3, dispositioned in `01-action-plan.md` under *Revision 2 dispositions*), after the independent re-review of revision 2 (eight residual prose and implementation ambiguities, dispositioned under *Revision 3 dispositions*), during `T-3` (two contract contradictions, dispositioned under *Revision 4 dispositions*), during `T-10` (one architecture-versus-guard contradiction in `G-7`, dispositioned under *Revision 5 dispositions*), and during `T-11` (two contradictions between the plan and the executing production code — a three-member pre-claim settlement set that is really eight, and an unreachable `S-69`/`S-70` choreography — dispositioned under *Revision 6 dispositions*). Every task below carries the corrections that belong to it. It was revised once more during `T-11` (revision 7, which splits the `S-69`/`S-70` choreography across two arrivals with disjoint declared roles and replaces the `S-74`/`E-6` post-boot expectation with the reconciliation decision's own conjunction-conditioned disjunction, dispositioned under *Revision 7 dispositions*). Every task below carries the corrections that belong to it. No task, dependency, scenario, mutation class, or bound count changed in revision 3, 5, 6, or 7; **revision 6 moves the source-guard count from 27 to 28 (`G-28`) and touches `T-10` and `T-11` only, and revision 7 moves no count at all and touches `T-10`, `T-11`, and `T-12` only.** It was revised once more during `T-14` (revision 8, which replaces `G-23`'s unsatisfiable every-changed-file scope with the computed governed production scope of action-plan section 16.2, dispositioned under *Revision 8 dispositions*). **Revision 8 moves no count at all and touches `T-14` only**; it adds no guard, keeps `G-23`'s identifier, and publishes three new declared counts rather than changing any existing one.

Sixteen tasks in dependency order. Every task carries status, dependencies, files and surfaces, acceptance criteria, architecture references, documentation impact, explicit test coverage, and expected evidence. The graph is acyclic; each task depends only on lower-numbered tasks. Implement executes in this order and designs nothing.

**Architecture references used below**
`ADR-C` = ADR-260816-selected-project-close-control · `CC-R` = CORE-COMPONENT-260816-managed-resource-release-ordering · `ADR-S` = ADR-260815-selected-runtime-stop-control · `ADR-RS` = ADR-260815-explicit-workbench-restart-control · `ADR-P` = ADR-260815-public-runtime-state-projection · `ADR-RC` = ADR-260815-api-restart-runtime-reconciliation · `ADR-T` = ADR-260815-termination-sequencer-boundary · `ADR-L` = ADR-260815-per-project-lifecycle-activation · `ADR-X` = ADR-260812-in-process-workbench-reverse-proxy · `CC-L` = CORE-COMPONENT-260808-runtime-lifecycle-error-handling · `CC-X` = CORE-COMPONENT-260812-stable-workbench-proxy · `CC-E` = CORE-COMPONENT-260808-structured-runtime-logging · `CC-D` = CORE-COMPONENT-260810-sqlite-persistence-lifecycle · `CC-F` = CORE-COMPONENT-260808-filesystem-path-safety · `CC-A` = CORE-COMPONENT-260815-host-runtime-attribution-evidence · `CC-C` = CORE-COMPONENT-260806-project-command-interface

---

## Task T-1: Extend the runtime contract with close vocabularies, two failure categories, three configuration allowances, and the cardinality-aware bound functions

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** none
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-5
- **Related ADRs:** ADR-C, ADR-P, ADR-S, ADR-RS
- **Related Core-Components:** CC-L, CC-E

### Description

In `apps/api/src/project-runtime-contract.ts`:

1. Add `RUNTIME_CLOSE_OUTCOMES = ['closed', 'already-absent', 'rejected']` and `RuntimeCloseOutcomeName`.
2. Add `RUNTIME_CLOSE_REJECTION_CATEGORIES` with exactly the **nine** members in the action-plan order — `start-in-progress`, `stop-in-progress`, `restart-in-progress`, `reconcile-in-progress`, `reconcile-unresolved`, `release-unconfirmed`, `ownership-cardinality-exceeded`, `removal-failed`, `manager-shutdown` — and `RuntimeCloseRejectionCategory`.
3. Add the discriminated `RuntimeCloseOutcome`: `{ outcome: 'closed', projectId, releasedGenerations, audits? }`, `{ outcome: 'already-absent', projectId, released: boolean }`, `{ outcome: 'rejected', projectId, category, failureCategory?, audits? }`. Every value is frozen.
4. Add `ProjectRuntimeCloseInput` with **four** members: `projectId`, `drainConnections`, `auditConnections`, `commitRemoval`. `auditConnections: () => WorkbenchProxyAudit` is synchronous by signature so the manager can re-observe per-subject connections inside its final confirmation region without introducing an `await` before `commitRemoval` (B1).
5. Add `RuntimeCloseInvariantError` following the delivered `RuntimeStopInvariantError` shape, including `delete this.stack`.
6. Append `'runtime-closing'` and `'close-release-unconfirmed'` to `RUNTIME_FAILURE_CATEGORIES`, taking it 19 → 21, and add their `RUNTIME_FAILURE_MESSAGES` entries: `'Workbench is being closed; wait for the close to settle before retrying.'` and `'Workbench release could not be confirmed during close; retry after the runtime manager reconciles it.'`
7. Append `close-in-progress` to `RUNTIME_STOP_REJECTION_CATEGORIES` (9 → 10) and to `RUNTIME_RESTART_REJECTION_CATEGORIES` (9 → 10).
8. Add `closeDrainAllowanceMs: 5_000`, `closeSettlementAllowanceMs: 1_000`, and `closeOwnershipSweepCap: 4` to `PROJECT_RUNTIME_DEFAULTS` (19 → 22), to `ProjectRuntimeConfig` (17 → 20), to `createProjectRuntimeConfig`'s override handling, and to its positive-safe-integer validation loop. The two counts differ by design and must stay that way: the delivered defaults carry `healthPath`, `healthStatus`, and `healthBodyStatuses`, which the resolved config folds into its health descriptor, and the resolved config carries `environment`, which has no default. All three new members appear on both surfaces, so the delivered asymmetry is unchanged.
9. Add `runtimeCloseReleaseBoundMs(config, requiresQuarantineResolution, sweepUnits)` and `runtimeCloseOverallBoundMs(config, requiresQuarantineResolution, sweepUnits)` exactly as action-plan section 9 defines, both through `checkedRuntimeBound`, and both rejecting a `sweepUnits` that is not an integer in `[1, config.closeOwnershipSweepCap]` so the multiplier can never be an unvalidated observed count (B2).
10. **Update every delivered test that hard-codes a vocabulary length.** These are enumerated here so no mechanical sweep can miss one and no hard-coded length can silently disagree with its vocabulary:

| File and line | Assertion | Change |
|---|---|---|
| `apps/api/test/project-runtime-contract.test.ts:55` | `RUNTIME_FAILURE_CATEGORIES` length | 19 → 21 |
| `apps/api/test/runtime-stop-contract.test.ts:83` | `RUNTIME_FAILURE_CATEGORIES` length | 19 → 21 |
| `apps/api/test/runtime-reconcile-contract.test.ts:30` | `RUNTIME_FAILURE_CATEGORIES` length | 19 → 21 |
| `apps/api/test/runtime-stop-documentation.test.ts:355` | `RUNTIME_FAILURE_CATEGORIES` length | 19 → 21 |
| `apps/api/test/runtime-restart-documentation.test.ts:66` | `RUNTIME_FAILURE_CATEGORIES` length | 19 → 21 |
| `apps/api/test/runtime-reconcile-documentation.test.ts:107` | `RUNTIME_FAILURE_CATEGORIES` length | 19 → 21 |
| `apps/api/test/runtime-reconcile-documentation.test.ts:108` | `RUNTIME_STOP_REJECTION_CATEGORIES` length | 9 → 10 |
| `apps/api/test/runtime-restart-documentation.test.ts:87` | `RUNTIME_RESTART_REJECTION_CATEGORIES` length | 9 → 10 |
| `apps/api/test/runtime-reconcile-documentation.test.ts:109` | `RUNTIME_RESTART_REJECTION_CATEGORIES` length | 9 → 10 |
| `apps/api/test/runtime-stop-documentation.test.ts:352` | `RUNTIME_ENTRY_STATES` length 7 | **unchanged — must stay 7** |
| `apps/api/test/runtime-stop-documentation.test.ts:353` | `RUNTIME_LIFECYCLE_TARGETS` length 7 | **unchanged — must stay 7** |
| `apps/api/test/runtime-stop-documentation.test.ts:354` | `PUBLIC_RUNTIME_STATES` length 4 | **unchanged — must stay 4** |

The route-vocabulary and failure-table lengths in the same family are owned by the tasks that change them: `runtime-stop-documentation.test.ts:288`, `runtime-reconcile-documentation.test.ts:110`, `runtime-restart-documentation.test.ts:99`, `runtime-reconcile-documentation.test.ts:111`, and `runtime-restart-route.test.ts:171` (route vocabularies 12 → 13) by **T-5**; `workbench-proxy-contract.test.ts:48` and `runtime-reconcile-documentation.test.ts:112` (`WORKBENCH_FAILURE_TABLE` 30 → 32) plus the committed-hash consumers `workbench-proxy-contract.test.ts:67` and `:286`, `workbench-route-evidence.test.ts:73`, and `workbench-route-acceptance.test.ts:541` by **T-2**.

Do not add an entry state, a lifecycle target, a lifecycle event name, or a public state. Do not modify `RUNTIME_ENTRY_STATES`, `PUBLIC_RUNTIME_STATES`, `RUNTIME_LIFECYCLE_TARGETS`, or `RUNTIME_LIFECYCLE_EVENTS`.

### Files and Surfaces
- `apps/api/src/project-runtime-contract.ts`
- `apps/api/test/project-close-contract.test.ts` (new)
- The six hard-coded-length test files enumerated above

### Acceptance Criteria
- The four new exported types and three new exported constants exist with exactly the declared members in the declared order, and `RUNTIME_CLOSE_REJECTION_CATEGORIES` has 9 members.
- `RUNTIME_FAILURE_CATEGORIES` has 21 members and `RUNTIME_FAILURE_MESSAGES` has a safe message for each; no message contains a path, identity, port, authority, command, or raw error.
- `ProjectRuntimeConfig` has 20 members and `PROJECT_RUNTIME_DEFAULTS` 22; all three new members are positive safe integers and are rejected when overridden with zero, a negative, or a non-integer.
- `runtimeCloseOverallBoundMs(defaults, false, 1) === 11_000`, `(defaults, true, 1) === 26_000`, `(defaults, false, 2) === 16_000`, `(defaults, false, 4) === 26_000`, and `(defaults, true, 4) === 41_000`; every value equals its B-table row.
- Both bound functions throw for `sweepUnits` of `0`, `5` at the default cap, `1.5`, `NaN`, and a non-number, and neither ever multiplies by a value it did not validate.
- `ProjectRuntimeCloseInput` has exactly four members and `auditConnections` is synchronous by signature.
- The five delivered vocabularies named above are byte-identical to the base SHA, and every hard-coded length in the repository equals its vocabulary's actual length.

### Documentation Impact
None directly; the vocabularies and bounds are documented by T-15.

### Test Coverage
`V-2` (contract vocabularies, messages, bound arithmetic, validation loop), `V-3` (outcome type inhabitability).

### Expected Evidence
`V-2` transcript listing all 21 failure categories, all nine close rejection categories, all three new configuration members, the five named bound values at defaults, the five `sweepUnits` rejections, and the byte-identical assertions for the five unchanged vocabularies; a repository-wide hard-coded-length agreement report covering every row of the table above.

---

## Task T-2: Add the proxy per-project drain and the two published failure rows

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-1, AC-5, AC-17
- **Related ADRs:** ADR-C, ADR-X
- **Related Core-Components:** CC-X, CC-R

### Description

In `apps/api/src/workbench-proxy-contract.ts`, add exactly two `WORKBENCH_FAILURE_TABLE` rows in declared runtime-category order — `runtime:runtime-closing` at `503 workbench_closing` with the message `'Workbench is being closed.'` and `runtime:close-release-unconfirmed` at `503 workbench_release_unconfirmed` with the message `'Ascend could not confirm the workbench release during close.'` — taking the table 30 → 32. The exhaustiveness type check must continue to compile with no cast.

`audit(projectToken?)` is already synchronous, uncached, and derived from the live resource maps, and it must stay that way: the manager composes its confirmation-time `auditConnections` callable from it, and any caching, memoization, or promise-returning change would make the confirmation stale (B1). Add an explicit assertion in the proxy suite that `audit` returns a plain value rather than a thenable, and that two calls straddling a mutation return different counts.

In `apps/api/src/workbench-proxy-manager.ts`, add `closeProject(projectId, signal)` implemented exactly as action-plan section 12 specifies: derive the token, abort matching `pending` controllers, destroy matching `httpRequests` and `httpResponses`, terminate matching `webSockets`, wait for zero, then terminate and destroy any remaining matching WebSockets and raw sockets, delete exactly those keys, and return `audit(projectToken)`. It must not assign `shuttingDown`, call `resolveTarget`, call `projectRuntime.start`, read or delete another token's keys, or clear a whole map.

**The wait owns no authority over time (revision 5).** The drain terminates on exactly two conditions — the five per-token counts observed zero, or the caller's `AbortSignal` aborting — and it declares no deadline, reads no clock, measures no elapsed time, counts no attempt or retry, and carries no fallback. It re-reads those counts across **one fixed non-authoritative observation gap**, the literal `setTimeout(check, 1)`, which decides only when to look again and is never read, compared, accumulated, or counted; `setInterval`, `setImmediate`, `queueMicrotask`, `scheduleDeadline`, `AbortSignal.timeout`, `Date.now()`, `performance.now()`, `process.hrtime`, and any counter (`++`, `+=`, `-=`) are prohibited in the body. Capture the gap in one handle named `pollHandle`, settle at most once, and on that settlement path call `clearTimeout(pollHandle)` and `signal.removeEventListener('abort', check)` before resolving, so no timer, listener, or callback survives the returned promise and a callback delivered after settlement changes nothing. Model the shape on the delivered `awaitTrustedReconciliationDelay` in `project-runtime-manager.ts`. Revision 4's literal "no timer" wording is superseded: the proxy's five resource maps are mutated from eleven independent Node stream and `ws` callbacks and publish no aggregate settlement event, so re-reading the synchronous per-token audit is the only way the drain can observe settlement, and an invented notification surface would buy no bound while making a missed notification indistinguishable from a stuck socket.

### Files and Surfaces
- `apps/api/src/workbench-proxy-contract.ts`
- `apps/api/src/workbench-proxy-manager.ts`

### Acceptance Criteria
- `WORKBENCH_FAILURE_TABLE` has 32 rows, is exhaustive over the widened proxied union, and `WORKBENCH_FAILURE_TABLE_SHA256` differs from the base-SHA value `2273128ddfb69c81bbea8b8a09e55706291f433d8d776f09623d13567f633b15`. The five delivered consumers of the count and the hash are updated in this task: `apps/api/test/workbench-proxy-contract.test.ts:48` (30 → 32), `:67` and `:286` (hash), `apps/api/test/runtime-reconcile-documentation.test.ts:112` (30 → 32), `apps/api/test/workbench-route-evidence.test.ts:73` and `apps/api/test/workbench-route-acceptance.test.ts:541` (committed hash).
- `closeProject` reduces the five per-token counts to zero for the selected token and leaves every other token's counts unchanged.
- `closeProject` returns before its caller's signal aborts when the counts reach zero, and returns the truthful non-zero audit when the signal aborts first. **Drain timing is never assumed:** the drain completes when the five per-token counts observably reach zero, and the only other terminator is the caller's deadline; a scenario that needs a slow socket forces it with a paused reader rather than with a sleep, and a drain that does not reach zero within its deadline fails closed as `release-unconfirmed` rather than being retried optimistically.
- The drain owns no authority over time and leaves no handle behind: exactly two terminators as above; every scheduling call in the body is `pollHandle = setTimeout(check, 1)`; no `setInterval`, `setImmediate`, `queueMicrotask`, `scheduleDeadline`, `AbortSignal.timeout`, `Date.now()`, `performance.now()`, `process.hrtime`, `++`, `+=`, or `-=` appears in it; and the settlement path calls `clearTimeout(pollHandle)` and `signal.removeEventListener('abort', check)` before it resolves, so after the returned promise settles the pending-timer count is what it was before the drain began and the signal carries no remaining `'abort'` listener (`G-7`, `V-4` steps 7 and 9).
- `audit(projectToken?)` remains synchronous, uncached, and live-derived; the suite asserts it is not thenable and that it reflects a mutation made between two calls.
- The global `shutdown()` path and its audit are byte-identical in behaviour.

### Documentation Impact
`docs/stable-workbench-routing.md` gains the per-project drain, its caller-owned bound and non-authoritative re-observation, and the two published rows (executed in T-15).

### Test Coverage
`V-4` (drain semantics, token scoping, signal-only bounding, peer non-interference), `V-9` (failure-table exhaustiveness, statuses, codes, messages, hash change).

### Expected Evidence
`V-4` transcript showing per-token counts before and after for the selected and peer tokens; `V-9` transcript listing 32 rows with the two new categories and the new table hash.

---

## Task T-3: Implement the manager close operation: one entry-install authority, claim, post-await rechecks, admission, cardinality gate, phases, re-observed and sealed confirmation, settlement, retirement, and the refusals

- **Status:** Completed
- **Complexity:** Very High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-18, AC-20
- **Related ADRs:** ADR-C, ADR-S, ADR-RS, ADR-P, ADR-RC, ADR-T
- **Related Core-Components:** CC-R, CC-L, CC-A, CC-E, CC-F

### Description

In `apps/api/src/project-runtime-manager.ts`:

1. Add module-local `closeClaims: Map<string, CloseClaim>` and `retiredProjects: Set<string>`, plus counters `closeTasks`, `lateCloseSettlements`, and `refusedLateAcquisitions`.
2. **One entry-install authority, with no grandfathered site (rewritten in revision 4).** Add one `installEntry(projectId, entry, owner?)` helper that refuses when `retiredProjects.has(projectId)`, when a claim not owned by the caller is installed, or when the owning claim is **sealed**, and route **every** existing `entries.set` through it. When this task completes, `entries.set(` occurs **exactly once** in `apps/api/src/project-runtime-manager.ts`, inside `installEntry`'s body. The three sites that are easiest to leave literal are named so they cannot be skipped: `stop()`'s `stopping` install, `stop()`'s `registered { released: true }` success settlement, and `restart()`'s `running` success settlement. Each converted site handles the boolean result in one of exactly two ways, and neither may discard it:
   - **refusable** (reachable after an `await` on its own path): a `false` result installs nothing and the caller MUST NOT emit, register ownership, record cleanup, register a task, or return success; it settles its own caller with `entryInstallRefusal(projectId)` — `unknown-project` when retired, `runtime-closing` when claimed;
   - **unrefusable by construction** (performed in the same synchronous region as its own path's refusal check or identity recheck, with no `await` in between): assert the `true` result with that path's invariant error — `RuntimeStopInvariantError`, `RuntimeRestartInvariantError`, or `RuntimeCloseInvariantError`.

   Apply the same rule to `registerOwnership`: it consults `retiredProjects`, the claim map, and the seal before it writes.
2a. **Migrate the delivered BL-017 and BL-018 source guards in this same change set (revision 4, C2).** Action-plan section 16.1 fixes the exact edits; they land here so `just verify` is never red between commits. In `apps/api/src/runtime-stop-evidence.ts` `validateManagerSource`: retarget `stopping-entry-install-count` to `installEntry(input.projectId, stopping)`; replace the `entries.set(` count of two with the two stronger assertions (zero direct writes in `stopBody`, exactly two `installEntry(` calls in `stopBody`) plus one module-level assertion that `entries.set(` occurs once in the manager and lies inside `installEntry`; retarget the `claim-install-order` index and the `settlement-terminal-install` index to the helper calls; and compute the `settlement-invariant-fault` expectation as `recheckCount + installAssertionCount`, with `installAssertionCount = countMatches(stopBody, /if \(!(?:installEntry|failEntry)\(/gu)` derived from the source rather than a literal — `2 + 3 = 5` at the delivered shape, because the `stopping` head install, the released settlement install, and the `failEntry` unconfirmed-failure install are each unrefusable by construction and therefore each assert. In `apps/api/src/runtime-restart-evidence.ts`: widen the detached-continuation prohibition to `entries.set(` **or** `installEntry(`, so routing writes through the helper cannot weaken it. In `apps/api/test/runtime-stop-evidence.test.ts` and `apps/api/test/runtime-restart-evidence.test.ts`: move the two `mutate` anchors to the helper form. Every violation code name, every negative control, and `BL018_ADDED_SOURCE_GUARD_CODES`'s length of 16 are preserved; no committed BL-017 or BL-018 artifact changes.
3. Implement `close(input)` exactly as action-plan sections 3 – 8 specify: resolve the persisted project, re-read `shuttingDown`, evaluate the nine-step admission order, install the claim synchronously, freeze the ownership cardinality in the same synchronous section, run the seven phases under `runtimeCloseOverallBoundMs(config, requiresQuarantineResolution, sweepUnits)` armed from `deadlineScheduler`, evaluate the **eight-clause** confirmation predicate, settle each terminal case per the action-plan table, retire on success, and release the claim on every path including faults.
4. Bound the drain with `closeDrainAllowanceMs` — **one** deadline covering both permitted drains — and the release with `runtimeCloseReleaseBoundMs`, both armed from `deadlineScheduler` and both cancelled on settlement. Do not await `processDependencies.sleep` anywhere in the close region. The close region for this rule is the body of `close()` plus the manager-local helpers reachable only from it; the delivered `stop()`, `restart()`, and reconciliation regions and `project-runtime-process.ts` keep their delivered delay primitives untouched (G-5, G-6).
4a. **Re-evaluate the claim after every `await` (B1).** Add `closeClaimFailure(projectId)` returning `closeClaims.has(projectId) ? new RuntimeFailure('runtime-closing') : undefined`, and compose it into the reuse guard beside the delivered `reuseOwnershipFailure` so both are evaluated together. In `start()`, evaluate the composed guard at all six fixed points of action-plan section 2 — before the entry read, after `isAlive()` resolves, after `health.check()` resolves, before returning a reused snapshot, after every `await` on the starting-join path, and immediately before any `installEntry` — so a claim installed while an await was pending cannot be overtaken by a snapshot return or an entry install. No `await` on the reuse or join seam may be followed by an `entries.set`, an ownership revival, or a snapshot return without an intervening recheck.
4b. **Freeze the ownership cardinality and gate on it (B2).** In the same synchronous section that installs the claim, count the ownership records attributable to P, freeze that count on the claim, and compute `sweepUnits = max(1, frozenCardinality)`, which both bound functions re-validate to lie in `[1, config.closeOwnershipSweepCap]`. If the frozen count exceeds the cap, settle immediately as `rejected: ownership-cardinality-exceeded` and perform **no** drain, **no** signal, **no** terminate, **no** removal, **no** failure install, and **no** lifecycle event; the registration and every ownership record are left exactly as found. Pass `sweepUnits` to both bound functions so the release bound is the exact sum for the records actually swept. Phase 4 sweeps every frozen record; a record appearing after the freeze is handled by the confirmation predicate, not by the bound.
4b-i. **Give the claim record the state confirmation reads (revision 3, finding 6; late-work definition corrected in revision 4, C1).** The `CloseClaim` value installed in step 4b carries, captured inside that same synchronous section: `claimedEntry`, the exact value `entries.get(P)` returned at install, held **by reference** and permitted to be `undefined`; `installedRegisteredEntry`, set only if this close later installs a `registered` entry itself; `frozenOwnershipCardinality` and the resolved `sweepUnits`; `sealed`, a boolean starting `false`; and `lateWork`, a counter starting at `0`. Confirmation reads these and nothing else for its lifecycle and identity clauses.

   **`claim.lateWork` counts identity-bearing late work only, and exactly three events increment it:** an `installEntry` call for P that **refuses**; a `registerOwnership` call observing P claimed or retired; and every `lateCloseSettlements` increment attributable to P while its claim is held. Each is a site that attempted or created state carrying a runtime identity for P outside the frozen sweep cardinality.

   **A refused acquisition MUST NOT increment `lateWork`.** The `start()` post-`await` rechecks, the `start()` and `register()` head refusals, and the `stop()`/`restart()` `close-in-progress` rejections are refused *before* installing an entry, registering or reviving ownership, creating a pending admission, minting a generation, or returning a snapshot; they mutate nothing and are already covered by confirmation clauses 1 – 4 and 7. They increment the new manager-wide counter `refusedLateAcquisitions` instead. Revision 3's wording included them, which made `S-69` unsatisfiable — the close could not confirm precisely because its own refusal mechanism worked. That reading is withdrawn.

   **`lateCloseSettlements` is not widened.** It keeps its delivered meaning: continuations with no caller that arrive for a claimed or retired project and are accounted rather than applied. A caller-visible refusal is never counted there.
4b-ii. **Seal the confirmation-to-removal window (revision 4, C1).** `claim.sealed` is assigned `true` as the **last statement of the confirmation region**, immediately before `commitRemoval()`. While it is `true`, `installEntry` refuses **every** caller for P including the owning close, and `registerOwnership` for P does not write the ownership index but records the exact identity as a `quarantinedOwnership` record for P so the manager shutdown sweep still reaches it; both account the arrival as late work. The seal is assigned `false` in exactly one other place: the `removal-failed` branch, in the statement immediately before the close installs its released `registered` entry. The `closed` and `already-absent` branches never lift it — retirement supersedes it. Guard: `G-27`.
4c. **Confirm by re-observation, not by memory (B1).** Phase 5 calls `input.auditConnections()` synchronously. If any per-subject count is non-zero, perform at most one further `drainConnections` under the already-armed drain deadline and re-audit; if it is still non-zero, settle `release-unconfirmed`. On success, evaluate the eight-clause predicate — identity-bearing runtime, ownership, quarantine, pending admissions, in-flight lifecycle, release audits, generation identity, and re-observed connections — in one uninterrupted synchronous region whose **next statement** is `commitRemoval()`. **Discharge the lifecycle and identity clauses from project-keyed state only (revision 3, finding 6).** Clause 7 is `Object.is(entries.get(P), claim.claimedEntry) || Object.is(entries.get(P), claim.installedRegisteredEntry)` — reference identity, which compares the absent case correctly because entry objects are immutable and every transition installs a new object. Clause 5 is the conjunction of `entries.get(P)` being `undefined` or non-transient (`registered`, `running`, `failed`), `pendingAdmissions.has(P) === false`, and `claim.lateWork === 0`, with `lateWork` defined by step 4b-i. **Do not read `stopTasks` or `restartTasks` for either clause**: they are unkeyed `Set<Promise<…>>` values retained for shutdown settlement and the `audit()` counts, and reading them would both false-negative on a peer's in-flight stop and false-positive on P's own suspended acquisition. Between the final `auditConnections()` observation and `commitRemoval()` the only permitted statements are the pure predicate evaluation, its single fail-closed guard branch, and the `claim.sealed = true` assignment that ends the region; no `await`, no further branch, and no other call may appear (`G-25`). At most two `drainConnections` and at most two `auditConnections` calls may occur in one close.
5. Implement contender joining: a close finding an installed claim awaits its settlement promise and derives its outcome per action-plan section 4, performing no effect of its own.
6. Add the close-claim refusals: `start` throws `runtime-closing`; `stop` and `restart` return `close-in-progress`; `register` throws `runtime-closing`. Each refusal is evaluated before the delivered state branches and mutates nothing. `runtime-closing` is thrown as an acquisition failure only — **no site may install it as an entry `failure.category`**, and the public projection maps it nowhere (B5).
7. Emit exactly one `runtime.health.changed` classified `close-release-unconfirmed` when, and only when, an exact claimed `running` entry becomes a retained failure. Emit no other lifecycle event anywhere in the close region.
8. Extend `audit()` with `closeTasks`, `closeClaims`, `retiredProjects`, `lateCloseSettlements`, and `refusedLateAcquisitions` (16 → 21 members; the fifth is added in revision 4). `closeClaims` reports each live claim's frozen ownership cardinality, its resolved `sweepUnits`, its `lateWork`, and its `sealed` flag, so the bound in effect and the seal state are externally observable. `refusedLateAcquisitions` is monotonic for the manager's lifetime, is incremented only inside a production refusal seam, and is **never read by the confirmation predicate**.
9. Make `shutdown()` await every in-flight close before it sweeps ownership or deletes entries, exactly as it already awaits stops and restarts, and settle an in-flight close explicitly as `manager-shutdown` rather than leaving a claim.
10. Account every late or reordered settlement for a retired or claimed project in `lateCloseSettlements`, and additionally in `claim.lateWork` when a claim for that project is installed; such a settlement installs nothing, emits nothing, records no cleanup, and touches no other project. Account every caller-visible refusal in `refusedLateAcquisitions` and nowhere else.

### Files and Surfaces
- `apps/api/src/project-runtime-manager.ts`
- `apps/api/src/runtime-stop-evidence.ts`, `apps/api/src/runtime-restart-evidence.ts` — the BL-017/018 source-guard migration of step 2a
- `apps/api/test/runtime-stop-evidence.test.ts`, `apps/api/test/runtime-restart-evidence.test.ts` — the two negative-control anchors of step 2a

### Acceptance Criteria
- The claim is installed with no `await` between the entry read and the install, and is absent from `audit().closeClaims` after every settled operation.
- `entries.set(` occurs exactly once in `project-runtime-manager.ts`, inside `installEntry`; every entry transition calls `installEntry`; and no `installEntry` call site discards its boolean result — each either branches on refusal without emitting, registering ownership, recording cleanup, registering a task, or reporting success, or asserts it with its path's invariant error (`G-4`).
- `claim.lateWork` is incremented by exactly three events — a refused `installEntry`, a `registerOwnership` observing a claimed or retired project, and a `lateCloseSettlements` increment for a claimed project — and by nothing else. A refused acquisition increments `refusedLateAcquisitions` only, and a close whose only arriving work was refused acquisitions still confirms.
- `claim.sealed` is assigned `true` in exactly one lexical site, as the last statement of the confirmation region, and `false` in exactly one lexical site, on the `removal-failed` branch immediately before the released `registered` install; while sealed, `installEntry` refuses every caller including the owner and `registerOwnership` records a quarantined identity instead of writing the ownership index (`G-27`).
- Every migrated BL-017 and BL-018 guard keeps its violation code, keeps at least one negative control that still fails it, and `BL018_ADDED_SOURCE_GUARD_CODES` still has 16 members; `verify-runtime-stop` and `verify-runtime-restart` pass in the same change set as the manager edit.
- Every `await` on `start()`'s running-reuse and starting-join seams is followed by a claim re-evaluation before the next entry install, ownership revival, or snapshot return; deleting any single recheck fails `G-21` and makes `S-69`/`S-70` observable.
- The nine admission steps evaluate in the declared order and each is independently reachable.
- The frozen ownership cardinality, the resolved `sweepUnits`, and the declared bound agree on every admitted close; an observed cardinality above `closeOwnershipSweepCap` refuses with no effect of any kind.
- A close of a project holding **two** ownership records with no quarantine anywhere sweeps both and settles within the two-record bound, not the one-record bound.
- `commitRemoval` is invoked from exactly one lexical site, dominated by the eight-clause confirmation predicate, with no `await` or branch between the predicate and the call, and never on a rejection.
- The in-flight-lifecycle and generation-identity clauses read only project-keyed state: a peer project's in-flight stop or restart never blocks P's confirmation, and P's own suspended acquisition, which registers no promise in either global task set, never passes it. Neither `stopTasks` nor `restartTasks` is referenced anywhere in the close region.
- The generation-identity clause is a reference comparison against the value captured at claim install, so a close that claimed an absent entry and finds an entry installed at confirmation fails closed rather than removing the registration.
- No close performs more than two `drainConnections` calls or more than two `auditConnections` calls.
- A project with no owned runtime is closed with zero `signal` and zero `terminate` primitive calls.
- A confirmed release with a failing `commitRemoval` leaves `registered { released: true }` and reports `Stopped`; an unconfirmed release leaves `failed` with `close-release-unconfirmed` and reports `Failed`, with ownership retained in both failure senses as the action-plan table specifies.
- After a confirmed removal the entry and its cleanup outcomes are deleted, the ID is retired, and every entry-installing site refuses it. Between the confirmation region and the settlement of `commitRemoval`, a forced entry install and a forced ownership registration are both refused: the install writes nothing and the registration produces a quarantined identity rather than an ownership record.
- `start`, `stop`, `restart`, and `register` each refuse a claimed project before their delivered branches, and `start` additionally refuses it after every await on the reuse and join seams.
- `runtime-closing` never appears as an installed entry failure category anywhere in the manager.
- No lifecycle event other than one truthful `runtime.health.changed` is emitted anywhere in the close region.

### Documentation Impact
`docs/project-runtime.md` gains the close operation, its admission order, its bounds, its outcomes, and its retirement rule (executed in T-15).

### Test Coverage
`V-5` (claim, admission order, phase order), `V-6` (every outcome and every rejection), `V-7` (event discipline), `V-8` (concurrency and contention), `V-10` (reconciliation and adoption interaction), `V-11` (stale settlements, shutdown, interruption).

### Expected Evidence
Per-branch transcripts for all nine admission steps and all eleven terminal cases; per-close drain and connection-audit invocation counts, each at most two; the eight-clause confirmation record for every successful close; the frozen cardinality, `sweepUnits`, and declared bound for every admitted close; `audit()` snapshots showing `closeClaims: 0`, `closeTasks: 0`, and the expected `retiredProjects`, `lateCloseSettlements`, and `refusedLateAcquisitions` values after each settled scenario; a converted-site ledger listing every former `entries.set` call site with its refusable or unrefusable classification and how its result is handled; and a migration transcript for the five BL-017 assertions, the one BL-018 prohibition, and the two negative-control anchors, each shown passing on the migrated sources and failing on its control.

---

## Task T-4: Recompose the close service and application wiring

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-2, T-3
- **Acceptance Criteria:** AC-1, AC-3, AC-4, AC-18
- **Related ADRs:** ADR-C
- **Related Core-Components:** CC-R, CC-D

### Description

Rewrite `apps/api/src/project-close.ts`: `ProjectCloseService.closeProject(id): Promise<RuntimeCloseOutcome>`; `createProjectCloseService(dependencies: ProjectCloseServiceDependencies)`; identifier validation preserved exactly, still throwing `ProjectCloseError('invalid_project_id')` for a non-string or empty value; `PROJECT_CLOSE_ERROR_CATEGORIES` unchanged; `createLibraryProjectCloseService` removed. `ProjectCloseServiceDependencies` binds `library: Pick<ProjectLibrary, 'closeProject'>`, `runtime: Pick<ProjectRuntimeManager, 'close'>`, and — **both** proxy members — `proxy: Pick<WorkbenchProxyManager, 'closeProject' | 'audit'>`; a `Pick` naming only `closeProject` does not typecheck at the `auditConnections` construction site. The service composes all three callables and performs no ordering, bounding, or release of its own: `drainConnections` from `proxy.closeProject(id, signal)`; `auditConnections` as the synchronous thunk `() => proxy.audit(projectToken)` over `projectToken = deriveProjectOwnerToken(id)` derived once per close — synchronous, uncached, live-derived, so the manager can call it inside its confirmation region — and `commitRemoval` from `library.closeProject(id)`. The single call is `runtime.close({ projectId: id, drainConnections, auditConnections, commitRemoval })`, all four `ProjectRuntimeCloseInput` members at one site. An infrastructure fault from any callable propagates to the manager rather than being caught here.

**Durable removal has exactly one construction point (B3).** The body of the `commitRemoval` callable constructed here is the only place in the repository that names `closeProject` on a `ProjectLibrary`- or `ProjectCloseRepository`-typed receiver. The service is *allowed* to name it — it is the sole construction point — and no route, browser client, CLI, other service, or lifecycle path may. `G-3` scans `apps/api/src/**`, `apps/web/src/**`, `apps/api/src/cli/**`, and `tests/**` and fails on any other call site, with two negative controls: a route calling `library.closeProject`, and the service calling it outside `commitRemoval`.

In `apps/api/src/app.ts`: change `AppOptions.createProjectCloseService` to `(dependencies: ProjectCloseServiceDependencies) => ProjectCloseService`, construct the close service after the proxy, and pass all three dependencies. `apps/api/src/api-server.ts` continues to forward the option by type alias and needs no shape change. The `onClose` shutdown order — proxy, manager, registration, library — is unchanged.

`apps/api/src/project-persistence.ts` and `apps/api/src/project-library.ts` are unchanged: `closeProject` keeps its serialized `closeTail`, its single transactional `deleteById`, and its two-member result vocabulary.

### Files and Surfaces
- `apps/api/src/project-close.ts`
- `apps/api/src/app.ts`

### Acceptance Criteria
- The service delegates to `runtime.close` on every valid identifier and reaches durable removal only through the injected `commitRemoval` callable.
- `G-3` passes on the delivered sources, fails on each negative control, and permits exactly one construction site.
- `ProjectCloseServiceDependencies.proxy` is `Pick<WorkbenchProxyManager, 'closeProject' | 'audit'>`, asserted at type level, and the service reads exactly those two proxy members and no others.
- The service passes all four `ProjectRuntimeCloseInput` members to `runtime.close` at one call site, and `auditConnections` is a synchronous function value there — not a promise, not a bound method that re-enters the proxy asynchronously.
- Identifier validation behaviour is byte-identical to the base SHA.
- `app.ts` constructs the service with all three dependencies and the initialization failure path still disposes proxy, manager, registration, and library in the delivered order.
- `project-persistence.ts` and `project-library.ts` are unmodified.

### Documentation Impact
`apps/api/README.md` records the recomposed close service and the unchanged persistence contract (executed in T-15).

### Test Coverage
`V-6` (service delegation and validation), `V-8` (composition under contention).

### Expected Evidence
Delegation transcript proving one `runtime.close` call per valid request with all four input members present, the two-member proxy `Pick` asserted at type level, and exactly one `commitRemoval` construction site; the `G-3` transcript with both negative controls; `git diff --stat` showing `project-persistence.ts` and `project-library.ts` untouched.

---

## Task T-5: Publish the close route vocabulary, statuses, and event discipline

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-4
- **Acceptance Criteria:** AC-3, AC-4, AC-8, AC-9, AC-14, AC-18, AC-20
- **Related ADRs:** ADR-C, ADR-S, ADR-RS
- **Related Core-Components:** CC-E

### Description

In `apps/api/src/routes/projects.ts`, add `PROJECT_CLOSE_ROUTE_ERROR_CATEGORIES` with the **eleven** declared members — including `runtime_close_ownership_unresolved` at `500` for the cardinality refusal — and a frozen status map, then map every `RuntimeCloseOutcome` to its declared status and body per the action-plan table. `200` keeps exactly `{ id, disposition: 'closed' }`; every failure keeps exactly `{ error: { category } }`. `project.closed` is logged from exactly one site, reachable only from the `closed` outcome. `project.close.failed` remains the operational record for an unexpected fault. The delivered `DELETE /api/projects/` and malformed-URL handling are unchanged.

In `apps/api/src/routes/project-runtime-stop.ts` and `apps/api/src/routes/project-runtime-restart.ts`, add `runtime_close_in_progress` at `409` to each vocabulary (12 → 13 each) and map the manager's `close-in-progress` rejection to it.

### Files and Surfaces
- `apps/api/src/routes/projects.ts`
- `apps/api/src/routes/project-runtime-stop.ts`
- `apps/api/src/routes/project-runtime-restart.ts`

### Acceptance Criteria
- All eleven close route categories are published with the declared statuses and every one is reachable; the twelve-row status map covers two success statuses and ten failure categories, with `project_not_found` serving both the persisted-absence path and the contender path.
- A repeated close after a successful close returns `404 project_not_found` on **each** of three sequential repeats, emits no further `project.closed`, and performs no side effect (AC-20, B7).
- The `200` body and every failure body have exactly the declared key sets.
- `project.closed` is emitted exactly once per completed close and never otherwise.
- Both runtime route vocabularies have 13 members and publish `runtime_close_in_progress` at `409`. The five delivered hard-coded route-vocabulary lengths are updated in this task: `runtime-stop-documentation.test.ts:288`, `runtime-reconcile-documentation.test.ts:110` and `:111`, `runtime-restart-documentation.test.ts:99`, and `runtime-restart-route.test.ts:171`, each 12 → 13.

### Documentation Impact
`apps/api/src/routes/README.md`, `apps/api/README.md`, `README.md`, and `docs/README.md` gain the eleven categories and the statuses (executed in T-15).

### Test Coverage
`V-6` (route status and body per outcome), `V-7` (event cardinality), `V-9` (published vocabularies).

### Expected Evidence
Route transcript covering all twelve response shapes including `400`, the four-request repeated-close sequence showing `200, 404, 404, 404`, and the emitted-record set per response proving one `project.closed` only on the single `200`.

---

## Task T-6: Mirror the close and runtime vocabularies and the raised bound in the web client

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-1, T-5
- **Acceptance Criteria:** AC-7, AC-19
- **Related ADRs:** ADR-C, ADR-L
- **Related Core-Components:** CC-E

### Description

In `apps/web/src/projects.ts`: extend `CLOSE_FAILURE_MESSAGES` from 3 to **11** members with bounded safe text for the eight new categories; extend `CLOSE_FAILURE_STATUS` with their statuses; keep `parseCloseResponse`'s exact-key and status-agreement checks and extend them to the new categories; raise `PROJECT_CLOSE_TIMEOUT_MS` to `45_000`, which must strictly exceed B-12, the 41,000 ms caller-visible ceiling at the sweep cap. In `apps/web/src/runtime-state.ts`: append the two new categories to `RUNTIME_FAILURE_CATEGORIES` (19 → 21) and their bounded notices to `RUNTIME_FAILURE_NOTICES`. The four-value `PUBLIC_RUNTIME_STATES` and the exact list-alignment rule are unchanged.

### Files and Surfaces
- `apps/web/src/projects.ts`
- `apps/web/src/runtime-state.ts`

### Acceptance Criteria
- Eleven close categories with the exact server statuses; a response whose status and category disagree is still rejected.
- 21 runtime failure categories and 21 notices; no notice contains a path, identity, port, authority, command, or raw error.
- `PROJECT_CLOSE_TIMEOUT_MS === 45_000` and is strictly greater than `runtimeCloseOverallBoundMs(defaults, true, defaults.closeOwnershipSweepCap) === 41_000`, asserted by computing the manager bound rather than by restating it.

### Documentation Impact
`apps/web/README.md` and `README.md` record the raised bound and its relation to the manager bound (executed in T-15).

### Test Coverage
`V-12` (client parsing, statuses, bound), `V-13` (notice vocabulary alignment).

### Expected Evidence
Client parse matrix covering all eleven categories plus the malformed and disagreeing-status controls; a bound assertion transcript comparing `PROJECT_CLOSE_TIMEOUT_MS` with `runtimeCloseOverallBoundMs(defaults, true, cap)`.

---

## Task T-7: Give Project Home a per-project close lane, an exclusive pre-transmission dialog, and a close settlement version

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-6
- **Acceptance Criteria:** AC-7, AC-19
- **Related ADRs:** ADR-L, ADR-C
- **Related Core-Components:** CC-E

### Description

In `apps/web/src/use-project-home.ts`:

Revision 1 kept the delivered single global `close?: ProjectCloseState` and the single global owner while also promising that peer close-related controls stay usable. Those cannot both hold: the delivered `aria-modal` dialog traps focus and stays open through `pending`, `retry`, `unknown`, and `refreshing`. Revision 2 adopts the per-project model of action-plan section 13, mirroring the delivered restart lane (`restarts: ReadonlyMap<string, ProjectRestartState>` plus `restartOwners`, with per-card retry and unknown regions) rather than inventing a new shape.

1. **Replace the global close record with a per-project map.** `ProjectHomeState.close?: ProjectCloseState` becomes `closes: ReadonlyMap<string, ProjectCloseState>`, plus `closeDialogId?: string` and `closeSettlementVersion: number`. `ProjectCloseState` keeps its delivered members — `id`, `name`, `originalIndex`, `phase`, `transmitted`, `message?` — unchanged. Add `closeOwners: Map<string, CloseOwner>` and an `ownsClose(projectId, owner)` predicate with the same shape as the delivered `restartOwners` and `ownsRestart`.
2. **Make the dialog exclusive and pre-transmission only.** `openClose(id)` sets `closeDialogId` and admits exactly per the action-plan admission table: the list is successful, the mode is editing, no dialog is open, that project has no close record, no close owner, no restart owner, is not the pending stop, and the global owner lane is idle. `confirmClose()` transmits and **dismisses the dialog in the same update** (`closeDialogId: undefined`, `transmitted: true`); the close then continues as that card's own state. `cancelClose()` and `Escape` remain available for the dialog's whole life, which now ends at transmission.
3. **Scope every peer interaction to its own project.** A pending close for P refuses only P's Open, Close, Stop, and Restart; it admits every action for every other project. `retryClose(id)` and `refreshClose(id)` take the project id and admit only for that card's `retry` or `unknown` phase with no owner in flight. **The close transport no longer takes the global owner**, which is what makes a peer close reachable while another is pending.
4. **Serialize duplicates twice over.** `closeOwners.has(id)` refuses a second transmission for the same project, and `transmitted` refuses a second send within one record; a settlement applies only through `ownsClose(projectId, owner)`, so a late settlement can never mutate another project's record, owner, focus target, or announcement. Two concurrent submissions for different projects are fully independent; two concurrent dialogs are impossible by construction.
5. **Widen the focus targets from the delivered five to eight and restore per the action-plan table** — the base-SHA union in `use-project-home.ts` is `'open' | 'close' | 'stop' | 'restart' | 'heading'`, and three members are added with none removed or renamed: `'open' | 'close' | 'close-status' | 'close-retry' | 'close-refresh' | 'stop' | 'restart' | 'heading'`, with cancel returning to that card's Close, transmission moving to that card's close status region, settled success using the delivered next-Close / previous-Close / heading rule computed from the settling record's own `originalIndex`, settled failure moving to that card's Retry close, and settled unknown moving to that card's Refresh close result.
6. **Prefix every announcement with its project's display name** so two concurrent settlements are never ambiguous, across all five classes: transmission, success, failure, unknown, and cancel.
7. Add `closeSettlementVersion` to `ProjectHomeState`, initialized to `0` and incremented exactly once per settled successful close, including a success established by the unknown-outcome refresh.
8. Map the eight new failure categories to phases: `project_not_found` keeps the delivered `unknown` refresh-requiring phase; the five `409` categories, `runtime_release_unconfirmed`, `runtime_close_ownership_unresolved`, and `runtime_manager_shutdown` map to `retry` with their bounded messages.
9. **Keep the two lanes aligned (revision 3, finding 5).** Removing the close transport from the global owner lane removes the property that made that lane safe, so add the four rules of action-plan section 13 rather than leaving the ordering implicit:
   - list-bearing actions — `submit()`, `retrySameSubmission()`, `retryList()`, `refreshProjects()`, and each card's `refreshClose(id)` — keep the delivered single global owner lane, and per-project runtime controls (`openClose`, `confirmClose`, `retryClose`, `stop`, `restart`, `open`) keep taking no global owner, which is the split AC-7 protects;
   - a pending or transmitted close, for this project or any other, adds no refusal to the global lane;
   - add `closeSettlementVersionAtIssue` to the delivered `Owner` record, stamped at creation, and on resolution discard a response whose stamp is behind the current `closeSettlementVersion` without mutating `state.projects`, finishing the owner, advancing the generation, and issuing exactly one replacement request of the same kind — a finite chain, because each replacement is stamped at a strictly greater version;
   - add `closedProjectIds: Set<string>`, insert into it on every close settling `closed` or `already-absent`, and filter every applied list response through it, which is sound because a project ID is a `randomUUID` minted once at registration and never reissued.

### Files and Surfaces
- `apps/web/src/use-project-home.ts`

### Acceptance Criteria
- A pending close for P admits Open, Close, Stop, and Restart for every other project and refuses only P's.
- A pending restart or stop for P still refuses a close for P and admits a close for a peer.
- At most one close dialog exists at any time; `openClose` refuses while one is open; the dialog is dismissed at transmission and never renders in `retry`, `unknown`, or `refreshing`.
- Two closes for two different projects can be in flight simultaneously, settle independently, and each settlement mutates only its own record; a same-project duplicate is refused at both the owner layer and the `transmitted` layer.
- `closeSettlementVersion` increments exactly once per settled successful close and never on a rejection, a cancel, or an unknown outcome that stays unknown.
- A project-list response issued before a close settled and resolving after it is discarded and re-issued rather than applied, and the re-issued response is the one that reaches `state.projects`; a successfully closed project never reappears in the rendered list under any interleaving.
- A pending close never refuses a registration, a list load, a list retry, or a recovery refresh; `refreshClose(id)` is admitted only while the global lane is idle and refused otherwise.
- Every phase transition, announcement class, and focus target of the delivered flow is preserved in per-project form, with the five focus targets of the action-plan table and name-prefixed announcement text.

### Documentation Impact
`apps/web/README.md` records the per-project close lane, the exclusive pre-transmission dialog, the per-card retry and unknown regions, and the settled-close refresh (executed in T-15).

### Test Coverage
`V-13` (controller admission matrix and settlement version), `V-15` (browser flow).

### Expected Evidence
Controller admission matrix listing, for each of the two projects, the admitted and refused actions under each pending state, matching the action-plan admission table row for row; a two-project concurrent-submission transcript showing independent settlement through `ownsClose`; a same-project duplicate-refusal transcript for both layers; a focus-target transcript for all five transitions; a settlement-version transcript across success, rejection, cancel, and unknown paths.

---

## Task T-8: Render disabled-exactly-when-refused and the settled-close runtime refresh

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-7
- **Acceptance Criteria:** AC-7, AC-19
- **Related ADRs:** ADR-L, ADR-C
- **Related Core-Components:** CC-E

### Description

In `apps/web/src/App.tsx`: derive each card's Close, Stop, and Restart `disabled` value from the same predicate the controller uses to admit that action for that card, so rendered state and admission are provably equivalent. The same rule covers each card's Refresh close result control, whose admission conjunction includes global-lane idleness (revision 3, finding 5), so it renders disabled exactly while another list-bearing action is in flight and never renders enabled as a silent no-op. Add a `refreshedCloseSettlement` ref and an effect that issues exactly one `runtime.refresh()` per `closeSettlementVersion` increment, mirroring the delivered stop and restart effects.

Render the close lane per card, mirroring the delivered restart lane:

1. The dialog renders only for `closeDialogId` and only in the pre-transmission phases. Its markup, `CLOSE_DIALOG_BODY`, `aria-modal`, `aria-busy`, labelled and described-by wiring, Escape handling, and contained focus are unchanged — they are simply scoped to a shorter, safer life that ends at transmission.
2. Each card gains a close status region (`role="status"`, `tabIndex={-1}`) rendered while that project has a close record, and per-card Retry close and Refresh close result controls in the `retry` and `unknown` phases, matching the delivered restart-lane markup and labelling conventions.
3. Focus restoration follows the eight-member `focusTarget`, with each new target resolved to that card's own element.
4. Announcements are rendered through the delivered live region with the project-name prefix.

### Files and Surfaces
- `apps/web/src/App.tsx`

### Acceptance Criteria
- For every rendered card in every matrix row, `disabled === !admits(action, card)` for Close, Stop, Restart, Retry close, and Refresh close result; there is no rendered-enabled control the controller would refuse and no rendered-disabled control it would admit.
- Exactly one additional runtime-state request occurs per settled successful close.
- The dialog's accessible structure is unchanged; it is never open while any peer control is expected to be operable, so `AC-7`'s peer-usability requirement and the dialog's focus containment no longer conflict.
- Every per-card close control is reachable by keyboard in document order, is labelled with its project, and restores focus to a deterministic target on every transition.
- Two cards can display independent close states simultaneously without either announcement or focus target interfering with the other.

### Documentation Impact
`apps/web/README.md` and `README.md` record the disabled-exactly-when-refused rule (executed in T-15).

### Test Coverage
`V-13` (rendered-versus-admitted equivalence), `V-15` (browser keyboard and announcement flow).

### Expected Evidence
A component matrix transcript asserting the equivalence per card per row, a rendered-close-lane transcript covering dialog exclusivity, dismissal at transmission, and both per-card phases, and a request log showing exactly one runtime-state request per close settlement.

---

## Task T-9: Migrate every typed manager, proxy, and close-service double

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-2, T-3, T-4
- **Acceptance Criteria:** AC-24
- **Related ADRs:** ADR-C
- **Related Core-Components:** CC-L, CC-X

### Description

Add the new required members to every typed object-literal double, with behaviour appropriate to that double's scenario rather than a blanket stub that hides a call.

**18 `ProjectRuntimeManager` declaration sites across 15 files that must gain an explicit `close` member.** Thirteen are object literals annotated `: ProjectRuntimeManager`; five are factory functions annotated `): ProjectRuntimeManager` that return a fresh literal. The sites are `apps/api/test/session-switching-matrix.test.ts:44`, `apps/api/test/workbench-proxy-websocket.test.ts:203`, `apps/api/test/home-workbench-matrix.test.ts:90`, `apps/api/test/runtime-reconcile-route.test.ts:14`, `apps/api/test/runtime-state-route.test.ts:56`, `apps/api/test/workbench-route-proof-correction.test.ts:116`, `apps/api/test/runtime-stop-route.test.ts:25`, `apps/api/test/runtime-reconcile-app.test.ts:31`, `apps/api/test/workbench-route-acceptance.test.ts:290`, `:631`, `:1158`, `apps/api/test/workbench-proxy-route.test.ts:81`, `apps/api/test/workbench-navigation-shell.test.ts:29`, `apps/api/test/workbench-proxy-http.test.ts:97`, `:631`, `apps/api/test/runtime-restart-route.test.ts:22`, `apps/api/test/project-runtime-lifecycle.test.ts:68`, `tests/e2e/home-workbench-failures.spec.ts:69`.

**3 spread-based manager doubles inherit `close` automatically** because each spreads a real manager, and are listed so a mechanical sweep records rather than edits them: `apps/api/test/project-runtime-isolation-acceptance.test.ts:595` (`{ beginReconciliation, ...manager }`), `tests/e2e/mvp-performance.spec.ts:254` (`{ ...runtime, start }`), `tests/e2e/session-switching.spec.ts:454` (`{ ...runtime, start }`). **2 casts are unaffected** and are likewise recorded, not edited: `apps/api/test/workbench-proxy-route.test.ts:44` (`{} as ProjectRuntimeManager`), `apps/api/test/runtime-stop-fixtures.ts:2134` (`as unknown as ProjectRuntimeManager`). Twenty-three `ProjectRuntimeManager` sites in total: eighteen edited, five recorded.

**5 `WorkbenchProxyManager` object-literal doubles across 5 files** — `apps/api/test/session-switching-matrix.test.ts:78`, `apps/api/test/home-workbench-matrix.test.ts:135`, `apps/api/test/workbench-proxy-route.test.ts:95`, `apps/api/test/workbench-navigation-shell.test.ts:39`, `tests/e2e/home-workbench-failures.spec.ts:89`.

**10 close-service construction sites across 3 test files**, all of which must adopt the new dependency object — `apps/api/test/project-close-non-mutation.test.ts:127` (real construction) and `:131` (override double); `apps/api/test/project-close-route.test.ts:37`, `:86`, `:105`, `:121`, `:165` (five `createProjectCloseService` overrides); `apps/api/test/project-close-service.test.ts:27`, `:58`, `:93` (three direct constructions). Their two imports of the removed `createLibraryProjectCloseService` surface at `project-close-non-mutation.test.ts:8` and `project-close-service.test.ts:6` and are updated with them. The production sites are owned by T-4 and are listed here only so the sweep is total: `apps/api/src/project-close.ts:34`, `:51`, `:54` and `apps/api/src/app.ts:9`, `:81`, `:149`. `apps/api/src/api-server.ts:40`, `:79`, `:81` forward the option by type alias and need no shape change.

A double that is asserted never to close returns a rejection that fails the test if invoked; a double whose scenario exercises close returns the scenario's declared outcome.

**Revision 4 adds no site to this task.** The manager's single entry-install authority, the claim seal, and the `refusedLateAcquisitions` counter are all manager-local or optional `audit()` members; no `ProjectRuntimeManager`, `WorkbenchProxyManager`, or `ProjectCloseService` double gains a required member, so the enumerated 38 sites and their dispositions are unchanged. The BL-017/018 source-guard migration touches evidence modules and their negative-control anchors, not typed doubles, and is owned by `T-3`.

### Files and Surfaces
- The 15 manager-double files, 5 proxy-double files, and 3 close-service test files enumerated above (`apps/api/src/project-close.ts`, `app.ts`, and `api-server.ts` are owned by T-4).

### Acceptance Criteria
- `pnpm typecheck` passes with no `as any`, no `as unknown as`, and no `@ts-expect-error` added by this task.
- No double silently swallows a close call it was not expected to receive.
- The three spread-based doubles and the two casts are left unchanged and are recorded as reviewed, giving a total of twenty-three manager sites, five proxy sites, and ten close-service sites accounted for.

### Documentation Impact
No impact: test doubles are not application documentation.

### Test Coverage
`V-20` (full canonical gate) plus every suite that owns a migrated double.

### Expected Evidence
`pnpm typecheck` transcript; a migration ledger listing all 38 enumerated sites — 23 manager, 5 proxy, 10 close-service — with their disposition as edited or recorded.

---

## Task T-10: Build the close evidence contract, catalog, guards, mutation classes, and validator

- **Status:** Completed
- **Complexity:** Very High
- **Dependencies:** T-1, T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-8, AC-21, AC-22, AC-25
- **Related ADRs:** ADR-C
- **Related Core-Components:** CC-A, CC-R, CC-E

### Description

Create `apps/api/src/project-close-evidence.ts`, modelled on `runtime-restart-evidence.ts` and `runtime-reconcile-evidence.ts`:

1. `BL020_SCENARIOS`: the frozen ordered **75**-member tuple `S-1 … S-75` from the test plan.
2. Declared vocabularies: close outcomes, the nine close rejection categories, the eleven route categories, release modes, elapsed classes, residual classes, peer-observation classes, and the **twenty** declared bounds `B-1 … B-20` with their values.
3. `CloseEvidenceRow` with `scenario`, `declaredBound`, `elapsedMs`, `elapsedClass`, `outcome`, `category?`, `execution`, `residual`, `teardown`, `registrationBefore`, `registrationAfter`, `publicState`, `stableRouteResult`, `emittedEvents`, `proxyAudit`, `managerAudit`, `peer`, `control`, and `fixtureDigests`, all correlated by opaque project token. `execution` carries `boundaryInstanceId`, `productionPathsEntered`, `primitiveCalls`, `signalCallsByProject`, `drainInvocations`, `connectionAuditInvocations`, `routeEnteredAt`, `claimInstalledAt: number | null`, `elapsedOrigin: 'claim' | 'route-entry'`, `ownershipCardinality: { frozen, cap, sweepUnits, capExceeded }`, `refusedAcquisitions`, and — on every `closed` row — the eight-member `confirmation` record with its five re-observed connection counts. **Revision 6 adds one row-level member**, `preClaimSettlement: Bl020PreClaimSettlement | null`, and one frozen eight-member enumeration, `BL020_PRE_CLAIM_SETTLEMENTS`, in the admission order of action-plan section 3: `manager-shutdown`, `persisted-absence`, `contender-join`, `reconcile-in-progress`, `reconcile-unresolved`, `start-in-progress`, `restart-in-progress`, `stop-in-progress`. `drainInvocations` and `connectionAuditInvocations` count the **subject close's own** composed callables, never a boundary-wide total.
4. **Two frozen source sets, because one cannot serve both purposes (B3).** `SelectedCloseSources`: the fifteen implementation files of action-plan section 16, now including `routes/project-runtime-stop.ts`, `routes/project-runtime-restart.ts`, and `apps/web/src/runtime-state.ts`, which `G-19` and the client-vocabulary guards must read and which revision 1's twelve-member set omitted. `CommittedEvidenceWriters`: the three files permitted to write a committed BL-020 artifact — `project-close-evidence.ts`, `cli/project-close-residual-audit.ts`, and `test/project-close-matrix.test.ts` — which is the exact scan set for `G-22`. Then the **28** source guards `G-1 … G-28` from action-plan section 16, each declaring which set it draws from and which subset of that set it scans. `G-4` is the rewritten one-entry-install-authority guard, `G-25` is amended for the seal assignment, and `G-27` is the sealed-window guard; all three scan `project-runtime-manager.ts`, so both source sets stay at fifteen and three. **`G-7` is rewritten in revision 5** from an absolute timer ban into an authority-over-time and handle-hygiene guard over the drain body, with the five assertions and four negative controls of action-plan section 16; it keeps its ID, its violation code `proxy-close-no-self-derived-bound`, and its single scanned file `proxyManager`, so the guard count stayed at twenty-seven through revision 5. **`G-28` is added in revision 6**: over `CommittedEvidenceWriters` — the set `G-22` already scans, so neither source set grows — it asserts that admission is discriminated by `preClaimSettlement` alone, that `BL020_PRE_CLAIM_SETTLEMENTS` is a frozen eight-member tuple in admission order, and that no writer decides claim installation from a list, set, array, or union of outcome-category literals. Its four negative controls are a reintroduced `PRE_CLAIM_REJECTIONS` category list consulted for `claimInstalledAt`, the site test replaced by `outcome === 'closed'`, a ninth enumeration member, and a reordered enumeration. The guard count therefore moves to twenty-eight and both source sets stay at fifteen and three.
5. The **18** mutation classes `M-1 … M-18` from action-plan section 17, each as a named predicate with at least one negative fixture. `M-18` rejects a row that declares the running-reuse or starting-join seam without a production-observed increase in `managerAudit.refusedLateAcquisitionsDelta`, and — **added in revision 6** — one whose refusal carries any `classification` other than `runtime-closing`, since that is the only classification the post-`await` recheck produces. `M-15` gains the invocation-pair rule of action-plan section 17 and `M-17` is rewritten site-keyed; the class count stays at **18**. **Revision 7 extends `M-18` once more** — it rejects a recorded refusal the production recheck did not produce, such as an arrival the release's own abort cancelled and the fixture relabelled as a refusal — and fixes the mutation lane's baseline as a **substrate rather than evidence**: the baseline is the executed edge rows plus structural copies re-keyed to the remaining catalog identities, it must publish `executedBaselineScenarios` naming the rows that are executions of themselves, it must validate clean before any mutation is applied, and no copy may ever be written to, merged into, or used to satisfy an acceptance criterion of the committed matrix. The class count still stays at **18**.
6. `validateProjectCloseMatrix(value)` and `serializeProjectCloseMatrix(matrix)`, enforcing 75 rows in declared order, unique execution identifiers, the per-project signal-accounting rule, the residual zero-or-null discipline, the teardown separation rule, the confirmation-record completeness rule, the ownership-cardinality bound-agreement rule including the `capExceeded` constraints above, the drain and connection-audit invocation ceilings, the elapsed-origin cross-check, the redaction scan, and the late-acquisition execution rule — a row declaring the running-reuse or starting-join seam must carry the refused acquisition's settled outcome and name that seam in `productionPathsEntered`, and is rejected as **unexecuted** when it does not, so a fixture that never reached the production recheck cannot pass as a clean zero (revision 3, finding 8). Revision 4 adds the production-observed half: such a row must also show `managerAudit.refusedLateAcquisitions` increased across the scenario (`M-18`), so the fixture's own declaration is corroborated by a counter it cannot write.

**The elapsed-origin representation is inhabitable and cross-checked (N1), and keyed on the settlement site (revision 6).** `routeEnteredAt` is always a number; `claimInstalledAt` is non-null **if and only if** `preClaimSettlement === null`; `elapsedOrigin` must be `'claim'` exactly when `claimInstalledAt !== null`. Revision 2 named three pre-claim outcomes; execution of the delivered nine-step admission shows **eight** pre-claim *sites*, and shows that the outcome category cannot discriminate at all — `manager-shutdown` and `already-absent` are each reachable on both sides of the claim, and a contender inherits any winner rejection verbatim. The validator therefore keys every admission decision on the site and rejects: a member outside the frozen enumeration; a `claimInstalledAt` nullability disagreeing with it; an `elapsedOrigin` disagreeing with that nullability; a site disagreeing with the row's settled outcome where the site determines it; a row naming a site while carrying an admission-only witness (`ownershipCardinality`, `confirmation`, or a non-zero `drainInvocations` or `connectionAuditInvocations`), or naming none while omitting `ownershipCardinality`; a `claimInstalledAt` earlier than `routeEnteredAt`; and any `elapsedMs` not reproducible from the declared origin on that row's own monotonic samples. An `ownership-cardinality-exceeded` row is **admitted**: its gate runs inside the claim-installing section, so it names no site, carries a non-null `claimInstalledAt` and `elapsedOrigin: 'claim'` (revision 3, finding 4), and — because the over-cap branch installs, tests, and deletes its claim in one synchronous section no other close can observe — can never be inherited by a contender. No representation permits a fabricated elapsed value, or a fabricated admission, to validate.

**`BL020_DECLARED_COUNTS` in revision 6.** `guards` moves from `27` to `28`. One **new** key is published, `preClaimSettlements: 8`, asserted equal to `BL020_PRE_CLAIM_SETTLEMENTS.length`. No other declared count changes: `scenarios` stays `75`, `mutations` stays `18`, `bounds` stays `20`, `confirmationClauses` stays `8`, and both source-set counts stay `15` and `3`.

**The over-cap cardinality witness is inhabitable (revision 3, finding 4).** `execution.ownershipCardinality` carries `frozen`, `cap`, `sweepUnits`, and `capExceeded`, constrained together: `capExceeded === (frozen > cap)`; `capExceeded === true` iff the outcome is `ownership-cardinality-exceeded`; `sweepUnits` is always an integer in `1 … cap`, being `max(1, frozen)` on a close that proceeds and exactly `1` on a `capExceeded` row, which authorised no sweep and used only the floor multiplier; and the declared bound always equals `runtimeCloseOverallBoundMs` recomputed from that row's own `(requiresQuarantineResolution, sweepUnits)` pair. `S-75` is therefore witnessed as `frozen: 5`, `cap: 4`, `capExceeded: true`, `sweepUnits: 1`, bound `B-5` — every field a true value, `frozen` alone carrying the over-cap fact, and no field outside its schema.

No new validation tool and no new configuration file: the module is ordinary TypeScript executed by the existing Vitest runner through the existing recipes.

### Files and Surfaces
- `apps/api/src/project-close-evidence.ts`

### Acceptance Criteria
- The catalog has exactly 75 members with unique identifiers in declared order.
- All 28 guards and all 18 mutation classes exist, are exported, and each has at least one negative control fixture that fails it.
- `BL020_PRE_CLAIM_SETTLEMENTS` is a frozen eight-member tuple in the admission order of action-plan section 3, `BL020_DECLARED_COUNTS.preClaimSettlements` equals its length, and `BL020_DECLARED_COUNTS.guards` equals `28`.
- `G-28` passes on the module once admission is discriminated by `preClaimSettlement` alone, and fails on each of its four negative controls; no `CommittedEvidenceWriters` member contains a category list used to decide claim installation.
- `M-17` rejects, by name, an admitted `already-absent` row that falsely names `persisted-absence`, a post-claim `manager-shutdown` row that falsely names the head, a contender row inheriting `release-unconfirmed` that omits `contender-join`, and an `ownership-cardinality-exceeded` row that names any site at all.
- `M-15` rejects a row declaring a late-acquisition seam whose invocation pair its outcome cannot produce — a `closed` row that is not `2`/`2` or a `release-unconfirmed` row that is not `2`/`1` — and `M-18` rejects such a row whose refusal classification is not `runtime-closing`, and one carrying a recorded refusal the production recheck did not produce.
- The mutation baseline is a declared substrate: it publishes `executedBaselineScenarios` naming exactly the scenarios that are executions of themselves, it validates clean under `validateProjectCloseMatrix` before any mutation is applied, every other catalog identity in it carries a structural copy of a real executed row re-keyed to that identity's bound and sweep shape, and no structural copy can reach `test-results/bl-020/close-matrix.json`.
- Every guard names a subset of exactly one declared source set, and every file a guard scans is a member of the set it draws from — asserted mechanically, so a guard can neither scan an undeclared file nor pass vacuously over a missing one.
- The five rewritten guards are executable against the delivered sources: `G-3`, `G-5`, `G-6`, `G-15`, and `G-21` each pass unmodified on the base-SHA tree and fail on their negative controls.
- `G-7` asserts the corrected invariant rather than an absolute timer ban: it passes on the `T-2` drain once its handle hygiene is in place, and fails on each of its four negative controls — `setTimeout(resolve, 5)`, a `setInterval` re-poll, a `Date.now()` elapsed comparison guarding `resolve()`, and deletion of `clearTimeout(pollHandle)`. No guard may be phrased so that the only way to satisfy it is an invented notification surface or an unbounded synchronous spin.
- The validator rejects, by name, each corruption the 18 mutation classes describe.
- The declared bound set has exactly 20 members and every value matches the contract functions computed from defaults with the row's own `(requiresQuarantineResolution, sweepUnits)` pair.

### Documentation Impact
`README.md`, `docs/README.md`, and `apps/api/README.md` record the evidence responsibilities and the artifact paths (executed in T-15).

### Test Coverage
`V-16` (contract, catalog, guards, mutation classes, validator).

### Expected Evidence
`V-16` transcript listing 75 scenarios, 28 guards with their declared source set and scanned file subset, 18 mutation classes with their negative fixtures, 20 declared bounds with their computed values, the eight-member `BL020_PRE_CLAIM_SETTLEMENTS` enumeration in admission order, and the two frozen source sets with their 15 and 3 members.

---

## Task T-11: Execute the 75-scenario deterministic matrix and commit its artifact

- **Status:** Completed
- **Complexity:** Very High
- **Dependencies:** T-9, T-10
- **Acceptance Criteria:** AC-1 … AC-12, AC-14, AC-15, AC-17, AC-18, AC-19, AC-20, AC-21, AC-22
- **Related ADRs:** ADR-C, ADR-S, ADR-RS, ADR-RC, ADR-X, ADR-L
- **Related Core-Components:** CC-R, CC-A, CC-L, CC-X, CC-E, CC-F

### Description

Create `apps/api/test/project-close-matrix.test.ts` and its fixtures, and execute all 75 scenarios through production paths in the two-project plus unrelated-control fixture. Every row is produced by running the real close, route, proxy, and manager code with injected primitives that record a call ledger; no row is typed. Capture in the declared order — declare bounds, before manifest, execute, settled observations, after manifest, residual, teardown, independent re-observation — and write `test-results/bl-020/close-matrix.json` through `serializeProjectCloseMatrix`.

Companion suites: `apps/api/test/project-close-manager.test.ts` (T-3 branches), `apps/api/test/project-close-route.test.ts` extended (T-5), `apps/api/test/project-close-service.test.ts` extended (T-4), `apps/api/test/project-close-proxy.test.ts` (T-2), `apps/api/test/project-close-evidence.test.ts` (T-10), `apps/web/src/project-close-client.test.ts` extended (T-6), `apps/web/src/use-project-close.test.tsx` extended and `apps/web/src/App.close.test.tsx` extended (T-7, T-8), plus a new `apps/web/src/project-close-component-matrix.test.tsx` for the rendered-versus-admitted equivalence.

The seven scenarios added in revision 2 need fixtures that do not exist in revision 1's set, and each is constructed from delivered behaviour rather than from an injected impossibility:

| Scenario | Fixture construction |
|---|---|
| `S-69` | **rebuilt in revision 6, split across two arrivals in revision 7.** Two real loopback HTTP arrivals with disjoint declared roles. **Arrival A, the refusal witness, is issued before the close is requested**: `handleHttp` registers its per-token pending operation, `resolveTarget` reaches `start()`, and the acquisition is held at the single declared seam `await current.ready.process.isAlive()` on the running-reuse branch, so it is inside `start()` while no claim exists. Phase 1's drain aborts A's controller synchronously, then observes `pendingOperations: 1` because A is suspended; the fixture releases A **inside that first drain**; A resumes at the mandatory post-`await` recheck, which evaluates `entryInstallRefusal` before the liveness branch and before any `signal.aborted` test on that path, so it settles as a refusal (`runtime-closing`, `503 workbench_closing`) rather than as a cancellation, raises `refusedLateAcquisitions`, and deletes its pending key in `handleHttp`'s `finally` — which is what earns phase 1's five zeros. **Arrival B, the stale-audit witness, is issued after phase 1 settled**, during phases 2 – 4 with the close suspended inside phase 3's own release await; `handleHttp` registers its per-token pending operation and B is held at the first `await` inside `resolveTarget` — the proxy's project resolution, reached after that registration and before any acquisition request — so B never enters `start()` while held. Phase 5's first `auditConnections()` therefore observes `pendingOperations: 1` and every other per-token count zero, and the single permitted re-drain runs; the fixture releases B at the instant the re-drain is entered, and because the re-drain's synchronous head already aborted B's controller, B settles `caller-cancelled` (`502 workbench_start_cancelled`) at `start()`'s first statement, which is **not** wrapped in the refusal counter, and deletes its pending key. The drain then reaches five zeros, the second audit is clear, and the close confirms with `claim.lateWork` still `0`. Exactly one refusal is recorded — A's. Witness pair `drainInvocations: 2` / `connectionAuditInvocations: 2`. Residual is captured only after the close and **both** arrivals have settled. Neither the revision-2 choreography nor revision 6's single-arrival form may be attempted; both are unreachable against the delivered ordering. |
| `S-70` | **rebuilt in revision 6, split across two arrivals in revision 7.** The identical two-arrival choreography, differing only in arrival B's fate. A is released and refused exactly as in `S-69`, so the row still carries one settled `runtime-closing` refusal and an increased `refusedLateAcquisitionsDelta`. B is never released before the armed `closeDrainAllowanceMs` deadline; because B is suspended **before** the point at which it would observe its own cancellation, the re-drain's abort cannot unwind it and its pending registration stays live, so the re-drain cannot reach five zeros, the deadline ends it, no second audit is taken, and the close settles `release-unconfirmed` with the registration retained, the entry `failed` classified `close-release-unconfirmed`, the public state `Failed`, ownership retained, and no `commitRemoval`. `claim.lateWork` is `0` — the live resource, not the refusal, is the reason. Witness pair `drainInvocations: 2` / `connectionAuditInvocations: 1`. The fixture then releases B and awaits its `502` settlement before capturing `residual`. |
| `S-71` | a stop whose audit does not confirm the triple, retaining its ownership record, followed by a fresh start from the retained `failed` entry that registers a second record — **two ownership records, no quarantine anywhere** — then a close that must sweep both within the two-record bound |
| `S-72` | two cards, a dialog open for one, `openClose` attempted for the other; dialog exclusivity holds and the peer's non-close controls stay operable |
| `S-73` | one card, two rapid `confirmClose` activations and a `retryClose` racing an in-flight transmission; both duplicate layers refuse |
| `S-74` | **expectation corrected in revision 7.** An interruption injected during release and sweep, strictly before confirmation, with a surviving attributable candidate. The interrupted close must settle `500 project_close_failed` with the entry `failed` classified `close-release-unconfirmed`, the published state `Failed`, the registration present with four byte-identical durable fields, ownership retained, `commitRemoval` never reached, and **zero** signals delivered to the candidate. The replacement boot then settles that candidate through the unchanged reconciliation conjunction, and the scenario asserts the branch it took rather than forcing one: `adopted` — entry `running`, published `Running`, adopted `pid:processStartTime:port` identical to the survivor's — when the full attribution-and-readiness conjunction holds, and `unresolved` — entry `failed` classified `reconcile-unconfirmed`, published `Failed`, the refusing element named — when it cannot be proven; `absent` and `Stopped` are asserted unreachable while the survivor is alive. The published state must be read from the route projection that publishes it, never from `manager.inspect()`, whose `state` is the internal `RuntimeState`. The boot's own reconciliation record for the subject is read and asserted, so the reconciliation result is proven from the recovery boundary's settlement rather than inferred from the entry state. The safe Close retry then settles on the branch the boot produced: `closed` with drain, audit, removal in that order, exactly one signal, and zero residual on the adopted branch; the bounded `reconcile-unresolved` refusal with the registration retained and zero signals on the unresolved branch. Signals are carried in three separately labelled accounts — the interrupted close's zero, the replacement transition's own orderly cleanup, and the retry's — and no assertion may state or imply zero across the whole episode |
| `S-75` | a frozen ownership cardinality of five against the default cap of four, refused with no effect, witnessed as `frozen: 5`, `cap: 4`, `capExceeded: true`, `sweepUnits: 1`, declared bound `B-5`, non-null `claimInstalledAt`, `elapsedOrigin: 'claim'` |

**Five fixture corrections required by revision 6.** `T-11`'s first execution built a genuine harness — isolated SQLite library, production manager, proxy, and Fastify route over loopback HTTP, real upstream listeners, recording deadline scheduler — and that harness is retained. Five of its constructions are untruthful and must be replaced before any row is committed:

| # | Defect | Correction |
|---|---|---|
| 1 | `preClaimSettlementOf` / `claimInstallingOutcome` derive claim installation from a `PRE_CLAIM_REJECTIONS` **category list**, mislabelling an admitted `already-absent` settled by phase 6, a post-claim `manager-shutdown`, and any contender that inherited `release-unconfirmed` or `removal-failed` — the last of which would also read the *winner's* claim, since both share `projectId` | Derive the site from production observations: an admitted close arms exactly **three** deadlines on the injected scheduler (drain, release, overall), which only `runClose` does; `ownership-cardinality-exceeded` is the one admitted outcome that arms none and is produced at exactly one post-claim lexical site; `persisted-absence` is witnessed by the injected `findProjectById` recording a resolution of `undefined`; `contender-join` is corroborated by arming nothing while a concurrent close for the same project armed three and settled first. `G-28` fails the module if any category list returns |
| 2 | `claimInstalledAt` is reconstructed after settlement | Record the monotonic sample the injected `findProjectById` already takes when it resolves the subject (`admissionReads`), which **is** the claim-install instant because production runs from that resolution to `closeClaims.set` with no suspension; assert no other subject observation lies between it and the first deadline arm |
| 3 | `buildCloseRow`'s `confirmation` record is reconstructed from post-settlement `observeResidual` / `inspect` reads, and two members are semantically wrong — `generationIdentity` from `snapshot === undefined` and `notRetired` from `persisted === undefined` | Capture every member inside the harness-composed `commitRemoval` callable, as its first statements before it delegates to the real library, which `G-25` makes the next statement after the confirmation region: `reobserved` from the last `auditConnections()` return value re-read there, `ownership`/`quarantine`/`pendingAdmissions`/`notRetired` from one synchronous `manager.audit()`, `generationIdentity` from `manager.inspect(P)` compared against the projection captured at claim install, `releaseAudits` from the recorded audit set of the generations this close terminated. Clauses 5 and 7 remain boundary-internal and are proven by reference in `V-5` |
| 4 | `managerAuditFor` samples `claimLateWork` after settlement, when the claim is already deleted, so it is always `null` on `closed` rows and `S-69`'s "`lateWork` stayed `0` at confirmation" is unprovable | Sample it at the same `commitRemoval` instant from `audit().closeClaims`, which still exposes the held claim's `lateWork`, `sealed`, `frozenOwnershipCardinality`, and `sweepUnits` |
| 5 | `drainInvocations` / `connectionAuditInvocations` are read from a boundary-wide call counter | Attribute both to the subject close's own composed callables, so a peer or contender drain cannot inflate them and the invocation-pair witness of `M-15` means what action-plan section 15 says it means |

**Eight fixture corrections required by revision 7.** The harness and the five revision-6 corrections above are retained. Executing them exposed a further set of untruthful or under-specified constructions, each of which must be replaced before any row is committed.

| # | Defect | Correction |
|---|---|---|
| 1 | `S-69`/`S-70` describe one arrival doing two jobs, which the delivered ordering forbids | Declare the two arrivals' roles explicitly in the scenario record — A the pre-claim refusal witness held at `isAlive()`, B the post-phase-1 stale-audit witness held at `resolveTarget`'s project resolution — and assert each role's own observations |
| 2 | Arrival B's settlement is unstated, so nothing prevents it being recorded as a second refusal | Assert B settles `502 workbench_start_cancelled` (`caller-cancelled`) and assert `execution.refusedAcquisitions` carries **exactly one** entry, A's; recording B as a refusal is rejected by `M-18` |
| 3 | The first re-observation is asserted only as `pendingOperations: 1` | Additionally assert every other per-token count is zero at that instant, which is the discriminator between the ordinary stale registration and an escaped acquisition |
| 4 | `S-74` reads its post-boot "public state" from `manager.inspect()`, whose `state` is the internal `RuntimeState`, not the four-value `PublicRuntimeState` | Read the post-boot published state from the same route projection that publishes it, as the pre-boot observation already does |
| 5 | `S-74` asserts only that the post-boot state is neither `Stopped` nor null, which passes for an adoption, an unresolved settlement, and anything else | Assert the branch truth table: adopted ⇒ entry `running`, published `Running`, adopted `pid:processStartTime:port` equal to the survivor's; unresolved ⇒ entry `failed` classified `reconcile-unconfirmed`, published `Failed`; `absent`/`Stopped` unreachable while the survivor is alive |
| 6 | `S-74` infers the reconciliation result from the entry state | Read and assert the replacement boot's own reconciliation record for the subject — `adopted` with its attribution witness, or `unresolved` with the element that refused |
| 7 | `S-74`'s signal accounting is carried as one number per observation window, which invites a blanket zero | Carry three separately labelled accounts — the interrupted close's (zero), the replacement transition's own orderly cleanup, and the safe retry's — and assert each against its own phase |
| 8 | The mutation baseline's structural copies are indistinguishable from executions at the artifact level | Publish `executedBaselineScenarios` from the baseline builder, assert it equals the executed edge set, and keep the substrate provably separate from the committed-matrix writer so no copy can reach `close-matrix.json` |

**Two determinism obligations for the `S-69`/`S-70` choreography.** Phases 2 – 4 must complete well inside `closeDrainAllowanceMs` (5,000 ms) so the drain deadline is still unfired when phase 5 begins — an already-fired deadline would resolve the re-drain instantly and silently turn `S-69` into `S-70` — and both scenarios assert, from the recording scheduler, that the drain deadline arm is uncancelled and unfired at the instant the re-drain is entered. Both held arrivals must use the **HTTP** path, not the upgrade path: `handleHttp` registers exactly one per-token resource and releases it synchronously in its `finally`, whereas `sendUpgradeFailure` ends the socket with a half-close whose observation timing the scenario would then depend on. **Added in revision 7:** the two hold seams are production suspensions in the participating boundaries' own ordering — the manager's liveness observation for arrival A, the proxy's project resolution for arrival B — and neither may be replaced by a delay, a reordering, or an injected call; and the phase-3 suspension that makes B's window deterministic is the release's own await, not a scheduled pause.

Also re-execute the BL-011 workbench failure matrix so its two new rows carry their own execution identifiers and redaction scans, and record the new table hash.

### Files and Surfaces
- `apps/api/test/project-close-matrix.test.ts`, `project-close-manager.test.ts`, `project-close-proxy.test.ts`, `project-close-evidence.test.ts`, `project-close-fixtures.ts`
- `apps/api/test/project-close-route.test.ts`, `project-close-service.test.ts`, `project-close-non-mutation.test.ts` (extended)
- `apps/web/src/project-close-client.test.ts`, `use-project-close.test.tsx`, `App.close.test.tsx`, `project-close-component-matrix.test.tsx`
- `apps/api/test/workbench-route-proof-correction.test.ts` (failure-matrix re-execution)
- `test-results/bl-020/close-matrix.json`

### Acceptance Criteria
- All 75 rows present, in order, each passing its declared bound, each with a non-empty `execution.productionPathsEntered` and a `signalCallsByProject` key set equal to its project set.
- Every row's declared bound equals the value recomputed from its own `(requiresQuarantineResolution, sweepUnits)` pair; `S-71` declares a two-record bound and `S-1 … S-8` declare one-record bounds.
- Every `closed` row carries the complete eight-clause confirmation record with all clauses true and all five re-observed connection counts zero; no row exceeds two drains or two connection audits.
- Every row's `preClaimSettlement`, `elapsedOrigin`, `claimInstalledAt` nullability, and `routeEnteredAt` are mutually consistent and consistent with its outcome, with the site derived from production observation rather than from the settled category; `S-75` names no site, carries a non-null `claimInstalledAt` and the complete four-member cardinality witness, and `M-16` rejects each corruption of it. Every row settled at one of the eight pre-claim sites carries a null `claimInstalledAt`, `elapsedOrigin: 'route-entry'`, and no admission-only witness — no fabricated claim time is written for a close that never held a claim.
- `S-69` and `S-70` each carry **exactly one** refused acquisition — arrival A's, settled, seam `running-reuse-await`, `classification: 'runtime-closing'` — name `running-reuse-await` in `productionPathsEntered`, and show `managerAudit.refusedLateAcquisitionsDelta` at or above one; arrival B's cancellation is asserted as `502 workbench_start_cancelled` and is never recorded as a refusal. Phase 5's first re-observation shows `pendingOperations` non-zero and every other per-token count zero. `S-69` shows `drainInvocations: 2`, `connectionAuditInvocations: 2`, `claim.lateWork` at `0` at confirmation, and settles `closed`; `S-70` shows `drainInvocations: 2`, `connectionAuditInvocations: 1`, a retained registration, and settles `release-unconfirmed`. Both are produced entirely through production paths — two real loopback HTTP arrivals held at the two declared production seams — with no injected `requestHttp` and no bypassed proxy registration. A run in which the hold never reached the production recheck fails as a fixture failure rather than reporting a clean zero, and a `closed` row with any non-zero residual class fails as a product failure and is never re-run or re-classified.
- `S-74` shows a present registration, no durable removal, an exactly attributable surviving candidate, and **zero signals delivered by the interrupted close**, with the interrupted generation retaining the entry `failed` classified `close-release-unconfirmed` and published `Failed`. Its replacement boot's settlement is asserted as the branch the unchanged reconciliation conjunction produced — adopted to entry `running`, published `Running`, with the survivor's exact identity, or `unresolved` classified `reconcile-unconfirmed` and published `Failed` with the refusing element named — read from the route projection and corroborated by the boot's own reconciliation record; `absent` and `Stopped` are asserted unreachable. The safe retry settles on that branch, its signal account is separate from the interrupted close's and the replacement transition's, and residual is zero after the replacement boot's own teardown.
- `S-67` performs four requests — one success and three sequential repeats — yielding one `200`, three `404 project_not_found`, exactly one `project.closed`, and no duplicate side effect.
- Every `closed` row shows all thirteen residual classes zero; every non-success row shows a retained registration with four unchanged fields and a truthful four-value public state.
- Every row's peer block shows the peer's identity, readiness, route, connections, registration values, and manifest digests unchanged; every row's control block shows the control's identity and listener availability unchanged.
- The committed artifact passes `validateProjectCloseMatrix` and fails under each of the 18 mutation classes.
- The re-executed BL-011 matrix has 32 executions and the new table hash.

### Documentation Impact
`README.md` and `docs/README.md` record the artifact path (executed in T-15).

### Test Coverage
`V-16` (validator over the produced artifact), `V-17` (matrix execution), plus `V-5` … `V-15` for the individual behaviours.

### Expected Evidence
`test-results/bl-020/close-matrix.json` with 75 executed rows; the 18 mutation-rejection transcripts; the re-executed BL-011 matrix with its new hash.

---

## Task T-12: Execute the designated real-host proof episodes

- **Status:** Completed
- **Complexity:** Very High
- **Dependencies:** T-11
- **Acceptance Criteria:** AC-1, AC-2, AC-5, AC-13, AC-16, AC-20, AC-21, AC-25
- **Related ADRs:** ADR-C, ADR-T, ADR-RC
- **Related Core-Components:** CC-A, CC-R

### Description

Create `apps/api/test/project-close-designated.test.ts` (gated by `BL020_DESIGNATED=1`) and `tests/e2e/project-close.spec.ts`. The designated proof launches real `code-server` runtimes through the delivered launch path and executes the **seven** episodes `E-1 … E-7` of action-plan section 19, each claiming an API generation that runs the repository's compiled entry point with host-observed evidence: observed argument vector equal to that entry, a listening socket attributed to that process, at least one served request, and an observed persistence file. A placeholder, in-process, synthesized, or assigned generation is rejected by name. The browser proof executes the keyboard-only Chromium episodes of the same section. Episodes are written to `test-results/bl-020/designated-episode.json`.

### Files and Surfaces
- `apps/api/test/project-close-designated.test.ts`
- `tests/e2e/project-close.spec.ts`
- `test-results/bl-020/designated-episode.json`

### Acceptance Criteria
- `E-1`, `E-2`, and `E-3` each show the exact release triple, the durable removal, the stable-route result after removal, peer isolation, and settlement within the bound declared from that episode's own frozen cardinality.
- `E-4` leaves a registered project the next real API process settles truthfully; `E-5` leaves an absent registration with a positively excluded candidate; the prohibited pairing is asserted unreachable.
- **`E-6` (B6, expectation corrected in revision 7)** interrupts the real API process *during* release and sweep, strictly before confirmation, while a surviving attributable candidate is still alive, and proves from host observation these unconditional invariants: no durable removal occurred; the registration is still present on the replacement boot, never absent; the interrupted close delivered **zero** signals to the candidate; and the candidate satisfies the unchanged attribution conjunction. The post-boot state is then whatever `ADR-260815-api-restart-runtime-reconciliation` settles, and the episode records the branch with the element that decided it: adoption — entry `running`, published `Running`, adopted `pid:processStartTime:port` identical to the survivor's — when the full attribution-and-readiness conjunction holds, and `unresolved` classified `reconcile-unconfirmed` published `Failed` when any element cannot be proven. `absent` and `Stopped` stay prohibited while the survivor is alive. The replacement boot's own teardown releases connections, terminates, audits, and only then removes; residual is zero across every class afterwards; and the safe Close retry settles on the branch the boot produced — `closed` with the adopted survivor released and the registration removed, or the bounded `reconcile-unresolved` refusal with the registration retained and zero signals. Signals are attributed per episode phase and never aggregated; a real-host interruption kills the API, so the replacement transition delivers none. `E-6` and `S-74` must both pass, must agree on every invariant, and must each record their branch; a divergence in branch is admissible only when the recorded deciding elements differ.
- **`E-7` (B7)** performs one successful close followed by **three** sequential repeated close requests — four in total — returning one `200` and three `404 project_not_found`, each repeat within its declared bound, with zero runtime creations, zero signals and zero terminations after the first success, exactly one `project.closed` overall and no duplicate side effect, and the project still absent after a real API-process restart.
- The browser episode proves the dialog flow for `Running` and `Failed` cards, peer-control availability, three announcements, focus recovery, the unknown-outcome resolution, the dead pre-close WebSocket, and the post-close route error.

### Documentation Impact
`docs/project-runtime.md`, `docs/api-restart-reconciliation.md`, and `docs/workbench-proof.md` record the designated episodes (executed in T-15).

### Test Coverage
`V-17` (designated host proof), `V-15` (browser proof).

### Expected Evidence
`test-results/bl-020/designated-episode.json` with seven episodes `E-1 … E-7`, each carrying its compiled-entry generation evidence, its release observations, its registration observations, and its elapsed value against its own declared bound; `E-6`'s surviving-candidate attribution record, its recorded post-boot branch with the conjunction element that decided it, its three per-phase signal accounts, and its replacement-boot teardown order; `E-7`'s four-request status sequence and single-event ledger.

---

## Task T-13: Build the independent residual audit CLI and artifact

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-12
- **Acceptance Criteria:** AC-1, AC-22
- **Related ADRs:** ADR-C
- **Related Core-Components:** CC-R, CC-A, CC-L

### Description

Create `apps/api/src/cli/project-close-residual-audit.ts`, modelled on `runtime-reconcile-residual-audit.ts`. It reads the designated episode artifact, refuses an unfinalized, unclear, or malformed artifact by distinct named error, then performs an independent post-capture re-observation for nine classes — validation-owned API processes, workbench processes, attributable descendants, listeners, proxy connections, timers, in-flight close operations, database sidecars, and disposable fixtures — using the delivered primitives `readProcessStartTime`, `readProcessGroupMembers`, and `loopbackListenerIsAbsent`. Each class reports either an integer zero with a completed probe flag or an explicit withheld claim. It writes `test-results/bl-020/residual-audit.json` and exits non-zero on any non-zero or withheld class.

### Files and Surfaces
- `apps/api/src/cli/project-close-residual-audit.ts`
- `test-results/bl-020/residual-audit.json`

### Acceptance Criteria
- The audit is an independent re-observation, not a copy of any captured value.
- All nine classes report zero with completed probes on a clean run.
- The CLI refuses an unfinalized, unclear, or malformed artifact with three distinct named errors.

### Documentation Impact
`README.md`, `docs/README.md`, and `apps/api/README.md` record the recipe and the artifact (executed in T-15).

### Test Coverage
`V-18` (residual audit behaviour and refusals).

### Expected Evidence
`test-results/bl-020/residual-audit.json` with nine zero classes and nine completed probes; three refusal transcripts.

---

## Task T-14: Extend filesystem non-mutation and peer-isolation proof to every close outcome

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-11
- **Acceptance Criteria:** AC-6, AC-17
- **Related ADRs:** ADR-C
- **Related Core-Components:** CC-F, CC-R

### Description

Extend `apps/api/test/project-close-non-mutation.test.ts` from the delivered stopped-scope manifest proof to cover every BL-020 outcome: running success, retained-failed success, unconfirmed release, removal failure, each admission rejection, the eight-concurrent case, and the repeated-close case. Each case captures a non-empty recursive manifest of the selected fixture and of the peer fixture before and after, comparing relative membership, file-content digests, non-dereferenced link-target digests, permission modes, and modification timestamps while excluding access-time effects. **Rewrite `G-15` as an executable proof rather than an impossible ban (B3).** Revision 1 asserted that no close-reachable module imports a write-capable filesystem API. That is unsatisfiable against the delivered sources: `apps/api/src/project-runtime-process.ts` imports `mkdir`, `open`, and `rm` to create and clean the runtime's own mode-0700 ephemeral directory under `os.tmpdir()`, and `apps/api/src/project-library.ts:1` imports `mkdir` for the database directory. Both are close-reachable and both must keep working.

`G-15` instead asserts, during every executed close scenario, that **zero** write-capable filesystem call receives a path inside any registered project directory root. The write-capable set is frozen: `writeFile`, `appendFile`, `mkdir`, `rm`, `rmdir`, `unlink`, `rename`, `copyFile`, `cp`, `chmod`, `chown`, `utimes`, `truncate`, `symlink`, `link`, `mkdtemp`, `createWriteStream`, and `open` with any write flag. Calls are observed by instrumenting the `node:fs` and `node:fs/promises` module boundary in the test process and recording every path argument. Exactly two path families are permitted and each is asserted to lie outside every registered project root: the runtime's own ephemeral runtime-data root, and the isolated database directory. Its negative control is a fixture close path that writes a marker file inside the selected project directory, which must fail the guard.

**Add `G-23` alongside it, with the scope corrected in revision 8 (D1).** Revisions 2 through 7 stated `G-23` over "every file the change set adds or modifies". That is unsatisfiable against this plan's own required work: `T-10` … `T-14` must add validation-only modules whose purpose is to create and destroy validation-owned resources — the residual-audit CLI writes `test-results/bl-020/residual-audit.json`, the designated and non-mutation modules build and clean fixture trees containing a symbolic link, a nested directory, and a non-default mode, and the matrix evidence writers emit committed artifacts — so every one of them legitimately adds `mkdir`, `rm`, `writeFile`, `rename`, or `symlink` with an empty base set, and the literal rule rejects the evidence `AC-6`, `AC-17`, `AC-21`, `AC-22`, and `AC-25` require.

`G-23` therefore **measures every** added, modified, or renamed source file against the base revision, and **asserts** only over the computed governed production scope defined in action-plan section 16.2: `Governed = (K ∪ SELECTED_CLOSE_SOURCE_PATHS) ∩ C`, where `K` is the static relative-import closure of the frozen `BL020_PRODUCTION_ENTRYPOINTS` and `C` is the change set. No governed file may carry a write-capable `node:fs` or `node:fs/promises` member it did not carry at the base SHA; the delivered allowlist keeps what it already has and is forbidden to grow. Every non-governed changed file is still measured and reported with its computed role and its added members, and is never asserted against, because validation, test, fixture, evidence-writer, and tool modules are proven unreachable from every deployed entry point.

Each changed file's `role` is **computed**, never declared by the file, in the section 16.2 precedence: `production` when the file is in `K` or in `SELECTED_CLOSE_SOURCE_PATHS`; otherwise `validation-harness` when it is in the frozen five-member `BL020_VALIDATION_ONLY_MODULES` or lies under `apps/*/test/` or `tests/` or is named `*.test.*` or `*.spec.*`; otherwise `unclassified`, which is a hard failure. Reachability outranks location, so a production module cannot escape by moving into a test directory, by taking a test-shaped name, or by living outside a conventional `src/` directory. `apps/api/src/cli/` is **not** exempted as a directory: only `project-close-residual-audit.ts` is ratified, by name, in the frozen declaration.

`G-23` fails on **seven** distinct named conditions, each with its own negative control: `governed-write-capable-import-added`, `selected-source-degoverned`, `changed-file-unmeasured`, `base-comparison-incomplete`, `role-misclassified`, `validation-module-executable`, and `governed-scope-reduced`. The validator must **re-derive** the change-set census and the entry-point closure rather than trust the caller, since the last two conditions are unprovable while its only input is the caller's own entry list. The closure's specifier grammar must recognise `import … from`, `export … from`, bare side-effect `import '…'`, and dynamic `import('…')` in single and double quotes — the delivered walk recognises only single-quoted `from '…'` and silently drops bare side-effect imports — and the change set must be measured with rename detection, reading a renamed file's base text from its pre-rename path. `G-15` is unchanged and remains the runtime authority for actual registered-project-directory path safety.

### Files and Surfaces
- `apps/api/test/project-close-non-mutation.test.ts`
- `apps/api/src/project-close-evidence.ts` (guards `G-15`, `G-23`; the frozen `BL020_PRODUCTION_ENTRYPOINTS`, `BL020_VALIDATION_ONLY_MODULES`, and seven `G-23` violation codes; `BL020_DECLARED_COUNTS` gains `productionEntrypoints`, `validationOnlyModules`, and `importDeltaViolationCodes`)
- `apps/api/test/project-close-non-mutation-support.ts` (change-set measurement, closure walk, role computation, and the eight negative controls)

### Acceptance Criteria
- Every enumerated outcome shows identical selected and peer manifests on all five compared attributes.
- Every manifest is non-empty and finite, and includes at least one symbolic link, one non-default mode, and one nested directory.
- `G-15` passes on the delivered sources — the `os.tmpdir()`-rooted runtime cleanup and the database-directory `mkdir` do not fail it — and fails its marker-file negative control.
- `G-23` measures every added, modified, or renamed source file and reports each with its computed role, its added members, and its added write-capable members.
- `G-23` asserts the no-new-write-capable-import rule over the governed production scope only, and passes on the delivered tree, where the validation, fixture, CLI, and evidence-writer modules this plan requires legitimately add write-capable members.
- `G-23` fails, each by its own distinct code and each proven by its own negative control: a new write-capable import in a governed file (`governed-write-capable-import-added`, controlled both on an existing governed file and on a governed file absent at the base); a changed `SelectedCloseSources` member carrying a non-`production` role (`selected-source-degoverned`); a changed file missing from, duplicated in, or foreign to the measured census (`changed-file-unmeasured`); an unresolved base text for a non-added file, an unresolved pre-rename text, or a non-empty base set on an added file (`base-comparison-incomplete`); a file in the closure or the selected set carrying a non-`production` role, or any `unclassified` file (`role-misclassified`); a `BL020_VALIDATION_ONLY_MODULES` member reachable from a deployed entry point (`validation-module-executable`); and a supplied closure narrower than the one recomputed from the frozen entry points (`governed-scope-reduced`).
- No file declares its own role or its own exemption; `governed` is derived from the computed role, and the validator re-derives the census and the closure rather than trusting its input.
- The closure grammar recognises bare side-effect imports, proven by a negative control in which a production module reachable only through `import './x.js'` is still governed.
- The two permitted path families are proven to lie outside every registered project root, rather than being exempted by name.

### Documentation Impact
`README.md` and `docs/README.md` record the filesystem safety guarantee for running and failed close (executed in T-15).

### Test Coverage
`V-14` (filesystem integrity across every outcome).

### Expected Evidence
Per-outcome before/after manifest digest pairs for the selected and peer fixtures; the `G-15` call-argument ledger showing every observed write-capable call with its path and its permitted family, plus its negative control; the `G-23` import-delta report listing **every** changed file with its computed role, its added members, and its added write-capable members, alongside the base SHA, the measured change-set size, the recomputed closure size, the governed count, the changed-selected-source count, and the per-role totals; and the eight-row `G-23` negative-control table, each row naming the injected corruption and the violation code it produced.

---

## Task T-15: Maintain every affected application documentation category

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1 … T-14
- **Acceptance Criteria:** AC-23
- **Related ADRs:** ADR-C, ADR-S, ADR-RS, ADR-P, ADR-RC, ADR-X, ADR-L
- **Related Core-Components:** CC-C, CC-E, CC-D, CC-F, CC-R

### Description

Update every application documentation surface the change set affects, and prove the coverage with `apps/api/test/project-close-documentation.test.ts`, extending the delivered BL-009 contract test rather than replacing it. Remove every stale "BL-020 or later" deferral claim about running or failed close from `README.md:165`, `README.md:207`, `docs/README.md:206`, `apps/web/README.md:26`, `apps/api/README.md:96`, and `docs/api-restart-reconciliation.md:48`, and replace each with the delivered behaviour. Two contract tests currently require the deferral token to be present and must be updated in the same change: `apps/api/test/project-close-documentation.test.ts:56` asserts `'BL-020'` and `'running or failed workbench close'`, and `apps/api/test/runtime-reconcile-documentation.test.ts:38` asserts `'BL-020'` in the reconciliation runbook. `apps/api/test/runtime-stop-documentation.test.ts:790` and `:796` are stale-claim detectors that must not begin matching: the new close prose must never assert that Stop, Restart, or lifecycle controls remain deferred. The remaining deferral references to BL-021 and BL-022 stay, because those scopes are genuinely undelivered.

**Documentation disposition, all thirteen categories.** Revision 1 described this table as covering eleven categories while the table itself has thirteen rows; the count is corrected here and in `V-19`, and the table is unchanged in membership (N2).

| Category | Surface | Disposition |
|---|---|---|
| README / overview | `README.md`, `docs/README.md` | Running and failed eligibility, the bounded outcomes, the eleven route categories, non-destructive confirmation, registration and filesystem safety, evidence paths, cleanup, and the canonical commands |
| API reference | `apps/api/README.md`, `apps/api/src/routes/README.md` | `DELETE /api/projects/{id}` with all eleven categories and statuses, the unchanged success body, `project.closed` cardinality, and the two new `409` categories on the stop and restart routes |
| Configuration | `docs/project-runtime.md` | `closeDrainAllowanceMs`, `closeSettlementAllowanceMs`, and `closeOwnershipSweepCap` as internal, positive-safe-integer-validated settings with fixed defaults, explicitly not environment variables or deployment settings |
| Usage / UI | `apps/web/README.md` | The Close dialog for `Running` and `Failed` as an exclusive pre-transmission confirmation dismissed at transmission; keyboard operation, contained focus, safe cancel; the per-project close lane with per-card pending, retry, and unknown regions; peer controls remaining operable throughout a peer's pending close; five name-prefixed announcement classes; duplicate-activation prevention at both layers; the five focus-recovery targets; the raised 45,000 ms client bound and its relation to the 41,000 ms caller-visible manager ceiling; the unknown-outcome recovery; and the list-alignment behaviour a user can observe — registration, list retry, and refresh stay available during a pending close, the per-card Refresh close result control waits for the list lane, and a closed project never reappears in the list because a refresh was already in flight |
| Migration | `README.md`, `apps/api/README.md` | **Explicit no-impact rationale:** the persisted record remains the same four fields, no schema change, no migration, and no new persisted value; nothing to migrate |
| Architecture | `docs/project-runtime.md` | The close authority, the exclusive claim and its re-evaluation after every await, the nine-step admission order, the ownership-cardinality freeze and its cap, the seven phases, the eight-clause re-observed confirmation predicate, the retirement rule, and the cardinality-aware bound arithmetic |
| Operational / recovery | `docs/project-runtime.md`, `docs/api-restart-reconciliation.md` | The documented safe recovery for `release-unconfirmed`, `removal-failed`, and `ownership-cardinality-exceeded`; the interruption guarantee including an interruption during release before confirmation; and the unchanged one-shot reconciliation boundary |
| Routing | `docs/stable-workbench-routing.md` | The per-project drain, its two termination conditions and its caller-owned bound — stated as owning no deadline, clock, or elapsed measurement of its own, with its re-observation described as non-authoritative and leaving no timer or listener behind — the two published `503` failure rows, and the post-close stable-route behaviour |
| Privacy / evidence | `README.md`, `docs/README.md`, `apps/api/README.md` | Opaque tokens and bounded classifications in retained and committed evidence, protected raw values excluded everywhere, and the residual-audit responsibility |
| Validation | `README.md`, `docs/README.md`, `justfile` | `just verify-close-project` (delivered, extended), `just verify-runtime-close`, `just proof-runtime-close`, `just proof-runtime-close-residual-audit`, targeted `just verify-focused`, and `just verify` |
| Deployment topology | `docs/api-restart-reconciliation.md`, `docs/mvp-performance.md` | **Explicit no-impact rationale:** single local host, one API process, loopback-only runtimes; close introduces no new process, port, service, or host requirement |
| Session switching | `docs/session-switching.md` | **Explicit no-impact rationale:** close removes a project rather than switching among retained ones; no continuity claim changes |
| Workbench proof | `docs/workbench-proof.md` | The designated close episodes and their artifacts |

### Files and Surfaces
- `README.md`, `docs/README.md`, `docs/project-runtime.md`, `docs/stable-workbench-routing.md`, `docs/api-restart-reconciliation.md`, `docs/session-switching.md`, `docs/workbench-proof.md`, `docs/mvp-performance.md`, `apps/api/README.md`, `apps/api/src/routes/README.md`, `apps/web/README.md`, `justfile`
- `apps/api/test/project-close-documentation.test.ts`, `apps/api/test/runtime-reconcile-documentation.test.ts` (updated); `apps/api/test/runtime-stop-documentation.test.ts` (re-run unchanged as a stale-claim detector)

### Acceptance Criteria
- No surface retains a claim that running or failed close is deferred.
- Every changed behaviour, bound, vocabulary, command, and artifact path appears on at least one surface, asserted by the contract test.
- Every unchanged category carries an explicit no-impact rationale and makes no new behaviour claim.
- The disposition table has exactly thirteen rows and every count assertion about it — here, in `01-action-plan.md`, and in `V-19` — reads thirteen.
- No documentation claims that `runtime-closing` is a retained or projected state; it is documented as an acquisition failure surfaced through the workbench failure table and the route mapping only.
- No documentation states that bounded classifications are absent from committed evidence; the two-tier boundary is stated at the granularity the amended attribution core-component requires.

### Documentation Impact
This task is the documentation task.

### Test Coverage
`V-19` (documentation contract and redaction scan).

### Expected Evidence
`V-19` transcript listing every asserted token and its surface; a `rg` transcript showing zero remaining running-or-failed close deferral claims.

---

## Task T-16: Add the justfile recipes, preserve prior evidence digests, and run the canonical gate

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-15
- **Acceptance Criteria:** AC-21, AC-24, AC-25
- **Related ADRs:** ADR-C
- **Related Core-Components:** CC-C, CC-R

### Description

Add `verify-runtime-close`, `proof-runtime-close`, and `proof-runtime-close-residual-audit` to the root `justfile`, and extend the delivered `verify-close-project` with the BL-020 suites.

**`proof-runtime-close` builds before it proves (revision 3, finding 7).** Its body is two lines in this order — `pnpm --filter @ascend/api build:ts`, which emits `apps/api/dist/server.js`, then the `BL020_DESIGNATED=1` designated suite — mirroring the delivered `proof-runtime-reconcile` recipe body exactly. Every claimed API generation in `E-1 … E-7` must execute that compiled entry point, so a recipe that assumed a prior build would either fail outright or, worse, prove a stale binary. `verify-runtime-close` and `proof-runtime-close-residual-audit` need no build line: the first runs suites through the existing runner and the second runs a `tsx` CLI, exactly as their delivered siblings do.

Insert the three new recipes into `verify` immediately after `just proof-runtime-reconcile-residual-audit` and before `just verify-mvp-performance`, in that order, following the delivered convention that each backlog item's gates are appended ahead of the performance gates. `verify-focused *args` and `verify` keep their delivered names and signatures.

**Naming, corrected in revision 2 (N3).** Revision 1 proposed `verify-project-close`, which is a word-order transposition of the delivered `verify-close-project` at `justfile:75` — two live recipes differing only by the order of two words. The new names follow the delivered runtime-operation family instead (`verify-runtime-stop`, `verify-runtime-restart`, `verify-runtime-reconcile`, `proof-runtime-restart`, `proof-runtime-reconcile-residual-audit`), so no delivered recipe is renamed and no new recipe can be confused with one. `CORE-COMPONENT-260806-project-command-interface` is amended to prohibit transposed recipe names, and `V-20` asserts it over the whole `justfile`.

Record the SHA-256 of every committed BL-017, BL-018, and BL-019 artifact before the change set and re-assert them byte-identical afterwards, with exactly one declared exception: the BL-011 workbench failure matrix at `test-results/bl-011/workbench-route-evidence.json`, which is re-executed because its `tableHash` field changes. Ensure every recipe removes exactly its own validation-owned resources — isolated databases and their `-wal`, `-shm`, and `-journal` sidecars, disposable fixtures, launched runtimes, control processes, and control listeners — after integrity capture and before exit. The compiled output `apps/api/dist` is **not** removed by any BL-020 recipe: it is a shared build artifact that the delivered `proof-runtime-reconcile` and every other compiled-entry proof also consumes, and deleting it would make recipe order significant. Ownership is by creator: each proof recipe cleans the processes, listeners, databases, and fixtures it created, and nothing it merely used. Run `just verify` end to end.

### Files and Surfaces
- `justfile`
- `test-results/bl-020/**`

### Acceptance Criteria
- The `justfile` exposes `verify-focused *args` and `verify` unchanged in name and signature, and adds exactly three recipes — `verify-runtime-close`, `proof-runtime-close`, `proof-runtime-close-residual-audit` — plus the extension of the delivered `verify-close-project`.
- `proof-runtime-close` builds the compiled API entry point as its first line and runs the designated suite as its second, in that order, matching the delivered `proof-runtime-reconcile` body; running it on a tree with no `apps/api/dist` succeeds, and running it after a source change proves the new binary rather than a stale one.
- Every recipe removes the resources it created and no shared build output; a post-recipe audit finds no validation-owned process, listener, database, sidecar, or fixture, and `apps/api/dist` is left in place.
- No recipe name in the `justfile` is a word-order permutation of any other recipe name, asserted mechanically over every recipe.
- `just verify` completes successfully with every BL-006 … BL-019 gate green.
- The prior-evidence digest report shows exactly one regeneration, the declared BL-011 matrix.
- No recipe requires network access, a credential, a hosted service, unsupported hardware, a destructive environment action, indefinite observation, or manual judgment.

### Documentation Impact
Covered by T-15's validation category.

### Test Coverage
`V-1` (plan, architecture, and acceptance-coverage agreement), `V-20` (canonical gate, digest preservation, cleanup, prerequisites).

### Expected Evidence
`just verify` transcript; the prior-evidence digest comparison report; the post-run residual audit showing zero validation-owned resources.
