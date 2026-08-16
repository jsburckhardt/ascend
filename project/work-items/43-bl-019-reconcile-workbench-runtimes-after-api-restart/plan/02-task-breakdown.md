# Task Breakdown: BL-019 Reconcile workbench runtimes after API restart

**Revision 5.** Tasks are dependency ordered. Every task is implemented inside the boundaries of `ADR-260815-api-restart-runtime-reconciliation`, `CORE-COMPONENT-260815-host-runtime-attribution-evidence`, and the five amended ADRs and five amended core-components recorded in `01-action-plan.md`. All behavioural decisions, type names, signatures, member sets, vocabulary counts, bounds, cardinalities, messages, statuses, and command names are already fixed in `01-action-plan.md`; Implement executes them and does not design. A required deviation returns to the Plan stage instead of being absorbed in code.

Scenario identifiers `S-01` … `S-66` and validation identifiers `V-1` … `V-20` are defined once in `03-test-plan.md` and referenced from here.

**What changed from revision 1.** Revision 1's `T-8` … `T-14` are renumbered `T-9` … `T-15`; a new `T-8` migrates every typed `ProjectRuntimeManager` test double now that `beginReconciliation()` is required. `T-1`, `T-2`, `T-3`, `T-5`, `T-9`, `T-10`, `T-11`, `T-12`, and `T-14` carry substantive repairs for the seven defects listed in `01-action-plan.md`. `T-4`, `T-6`, `T-7`, `T-13`, and `T-15` change only by renumbered references. Every revision-1 instruction that is superseded has been rewritten in place; none remains active.

**What changed from revision 2.** No task is added, removed, renumbered, or re-ordered, and no task changes a production contract. `T-9`, `T-10`, `T-11`, `T-12`, and `T-14` carry the three revision-3 repairs decided in `01-action-plan.md` sections 1d, 11, and 12: `T-11` gains the isolated control subepisode `P0c`/`P0d` and real compiled-API generations, `T-10` must produce every row by executing production paths, `T-9` gains the execution witness, the generation-authenticity and control-isolation rejections, the eighteen-phase order, and two new source guards, `T-12` audits both subepisodes, and `T-14` documents the validation structure. `T-2` changes only in how its real-host controls are registered (V-4), not in any product behaviour. Every other task is unchanged in substance, and every revision-2 instruction that revision 3 supersedes has been rewritten in place.

**What changed from revision 4.** Independent Verify rejected implementation commit `61d3acf22a14be55ed9f7ae386739fd9366ece23` and returned this issue to Plan. Six tasks reopen — `T-2`, `T-3`, `T-9`, `T-10`, `T-14`, `T-15`, in that dependency order — and nine remain accurately completed. **No task is added, removed, renumbered, or re-ordered; no task dependency, complexity, or file set changes; and no count anywhere in this plan changes.** `T-2` gains the group-membership conjunct and its ordering (`01-action-plan.md` section 13a); `T-3` replaces the readiness poll's awaited `processDependencies.sleep` with the trusted delay fixed in section 13b and records the manager-side consequences of the membership refusal; `T-9` extends two existing source guards and one existing mutation class's fixtures and carries the amended `S-17` catalog entry; `T-10` re-executes the matrix and regenerates the committed artifact; `T-14` repairs the privacy sentence under section 13c and documents both behavioural corrections; `T-15` reruns the canonical gate and re-proves the preserved digests. Every revision-4 instruction that revision 5 supersedes has been rewritten in place.

**What changed from revision 3.** One task, `T-9`, changes, and only inside the execution witness it defines: `execution` gains `probeHealthByProject`, the project-keyed readiness map fixed in `01-action-plan.md` section 12a, `primitiveCalls.probeHealth` becomes an aggregate total with no per-project claim, step 7b restates the readiness rules per project and totally, and `M-12` gains its project-keyed body. `T-10` changes only in the sentence that names the rule it must satisfy while emitting rows. No task is added, removed, renumbered, or re-ordered; no task count, dependency, complexity, file, or production contract changes; and no other task changes at all. Every revision-3 instruction that revision 4 supersedes has been rewritten in place.

---

## Task T-1: Extend the runtime contract with the reconciling state, reconciliation events, categories, vocabularies, and bounds

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-3, AC-8, AC-9, AC-10, AC-14
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation, ADR-260815-public-runtime-state-projection, ADR-260815-selected-runtime-stop-control, ADR-260815-explicit-workbench-restart-control
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-development-standards

### Description
Change `apps/api/src/project-runtime-contract.ts` only. No manager, process, route, or proxy behaviour changes in this task.

1. Extend `RUNTIME_ENTRY_STATES` to `['registered','starting','running','stopping','restarting','reconciling','failed']` (frozen, **7**). Leave `RUNTIME_STATES` at **3** and `PUBLIC_RUNTIME_STATES` at **4**. `RuntimeSnapshot` is unchanged.
2. Extend `publicRuntimeState` so `'reconciling'` returns `'Starting'`, keeping the switch exhaustive.
3. Extend `RUNTIME_LIFECYCLE_TARGETS` to `['starting','running','failed','stopping','stopped','restarting','reconciling']` (frozen, **7**) and map `'reconciling'` to `'Starting'` in `publicRuntimeStateForLifecycleTarget`.
4. Extend `RuntimeLifecycleEvent['event']` with `'runtime.reconcile.requested'`, `'runtime.reconcile.succeeded'`, `'runtime.reconcile.absent'`, `'runtime.reconcile.failed'` (**13** total) and add the matching `PUBLIC_STATE_BY_LIFECYCLE_EVENT` rows `Starting`, `Running`, `Stopped`, `Failed`. The delivered agreement check is unchanged and must still throw on a mismatch.
5. Append `'reconcile-unconfirmed'` to `RUNTIME_FAILURE_CATEGORIES` (18 → **19**) with the exact `RUNTIME_FAILURE_MESSAGES` entry fixed in `01-action-plan.md` section 8. Add no diagnostics key.
6. Append `'reconcile-in-progress'` and `'reconcile-unresolved'`, in that order, to `RUNTIME_STOP_REJECTION_CATEGORIES` (7 → **9**) and to `RUNTIME_RESTART_REJECTION_CATEGORIES` (7 → **9**). `RUNTIME_STOP_OUTCOMES` and `RUNTIME_RESTART_OUTCOMES` are unchanged.
7. Add the three frozen reconciliation vocabularies exactly as fixed in `01-action-plan.md` section 2, with their `as const` union types: `RECONCILE_OUTCOMES` (**3**), `RECONCILE_REFUSAL_REASONS` (**18**, in the stated order), `RECONCILE_ABSENCE_PROOFS` (**2**). **Revision 2:** the vocabulary contains no `executable-mismatch` member, and does contain `launcher-unresolved`, `launcher-prefix-mismatch`, and `group-scan-incomplete`.
8. Add the **six** reconcile members to `PROJECT_RUNTIME_DEFAULTS`, `ProjectRuntimeConfig`, and `createProjectRuntimeConfig` with the same positive-safe-integer validation as their siblings, taking `ProjectRuntimeConfig` from 11 to **17** members:
   - `reconcileScanAllowanceMs` **2,000**
   - `reconcileAttributionAllowanceMs` **1,000**
   - `reconcileReadinessBoundMs` **7,000**
   - `reconcileSettlementAllowanceMs` **1,000**
   - `reconcileStartupHeadroomMs` **3,000**
   - `reconcileResponseAllowanceMs` **1,000**
9. Export **five** pure bound functions beside the delivered ones, each returning a positive safe integer through the delivered `checkedRuntimeBound` guard:
   - `reconciliationOverallBoundMs(config)` = `reconcileScanAllowanceMs + reconcileAttributionAllowanceMs + reconcileReadinessBoundMs + reconcileSettlementAllowanceMs` (**11,000** at defaults) — the internal deadline, armed at installation;
   - `reconciliationEndToEndBoundMs(config)` = `reconcileStartupHeadroomMs + reconciliationOverallBoundMs(config) + reconcileResponseAllowanceMs` (**15,000** at defaults) — the issue ceiling, measured from the replacement API process spawn instant and claimed only by the designated episode;
   - `reconciliationStartupControlBoundMs(config)` = `reconcileStartupHeadroomMs + reconcileResponseAllowanceMs` (**4,000** at defaults) — the zero-project startup control that proves the headroom;
   - `workbenchAcquisitionBoundMs(config)` = `runtimeReplacementBoundMs(config)` (**60,000** at defaults), which exists so no plan, document, or test recomputes the delivered acquisition ceiling;
   - `acquisitionAcrossReconciliationBoundMs(config)` = `reconciliationOverallBoundMs(config) + workbenchAcquisitionBoundMs(config)` (**71,000** at defaults).
10. Add the read-only inspection types with no behaviour: `ReconciliationProjectInspection` (`projectToken`, `outcome: ReconcileOutcome | null`, `refusalReason: ReconcileRefusalReason | null`, `absenceProof: ReconcileAbsenceProof | null`, `settledElapsedMs: number | null`) and `ReconciliationInspection` (`phase: 'not-started' | 'installing' | 'observing' | 'settled' | 'aborted'`, `startedAt: number | null`, `settledElapsedMs: number | null`, `boundMs: number`, `scanCompleted: boolean | null`, `candidateCount: number | null`, `projects: readonly ReconciliationProjectInspection[]`). Every member is bounded, opaque-token keyed, and free of pid, port, path, argv, inode, and authority values.

Introduce no environment variable, feature flag, persisted field, public state, or diagnostics field. Do not change `RuntimeSnapshot`, `RuntimeFailure` diagnostics filtering, `serializeRuntimeEvent`, `stableProjectRoute`, `deriveProjectOwnerToken`, or any delivered bound function.

### Files and Surfaces
- `apps/api/src/project-runtime-contract.ts`

### Acceptance Criteria
- AC-3: `publicRuntimeState('reconciling') === 'Starting'`; `PUBLIC_RUNTIME_STATES` still has exactly four frozen members; no fifth public value exists anywhere in the module.
- AC-8: all thirteen event names map to a public state and the agreement check rejects a mismatched pair.
- AC-1, AC-9, AC-10: at `createProjectRuntimeConfig()` defaults, `reconciliationOverallBoundMs` is exactly `11_000`, `reconciliationEndToEndBoundMs` is exactly `15_000`, `reconciliationStartupControlBoundMs` is exactly `4_000`, `workbenchAcquisitionBoundMs` is exactly `60_000`, and `acquisitionAcrossReconciliationBoundMs` is exactly `71_000`; each rejects a non-positive or non-safe-integer configuration.
- AC-14: both new rejection categories exist on Stop and on Restart, are frozen, and carry no free-text member.
- The three reconciliation vocabularies are frozen with exactly 3, 18, and 2 members in the stated order.

### Documentation Impact
None in this task; documentation is maintained once in T-14 against the delivered behaviour.

### Test Coverage
- V-1 covers every clause above, including exhaustiveness of the switch statements, the exact default bound values, and the arithmetic identity `endToEnd === headroom + overall + response`.

### Expected Evidence
- V-1 assertions naming each count (4/3/7/7/13/19/9/9/3/18/2/17) and each bound (11,000 / 15,000 / 4,000 / 60,000 / 71,000).
- Matrix `vocabularies` block emitted by T-10 recording the same counts.

---

## Task T-2: Add host attribution primitives, the installed-runtime identity helper, group-scoped listener ownership, the adopted runtime handle, and survivorship-safe child stderr

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-1, AC-11, AC-12
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation, ADR-260815-termination-sequencer-boundary
- **Related Core-Components:** CORE-COMPONENT-260815-host-runtime-attribution-evidence, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-filesystem-path-safety

### Description
Change `apps/api/src/project-runtime-process.ts` only.

1. **Survivorship repair.** In `createNodeRuntimeProcessAdapter().launch`, after the delivered `mkdir(userDataPath, { recursive: true, mode: 0o700 })` and before `spawn`, open `path.join(userDataPath, 'runtime-stderr.log')` with flags `'a'` and mode `0o600`; pass that numeric descriptor as the third `stdio` member in place of `'pipe'`; close the adapter's own copy of the descriptor immediately after `spawn` returns, on both the success and the throw path. Remove the `child.stderr` listeners and the in-memory `diagnosticOutput` accumulator.
2. **Preserve the address-in-use contract.** Inside the delivered `exit` handler, read at most the first **4,096** bytes of that file and apply the unchanged `/EADDRINUSE|address already in use/iu` test to produce `RuntimeExit.addressInUse`. A read failure yields `addressInUse: false` and is not an error path of its own. Nothing else about argv, environment, cwd, detachment, port reservation, readiness, collision retry, termination, audit, or user-data removal changes.
3. **Installed-runtime identity (revision 2).** Export the type `InstalledRuntimeIdentity` and the resolver exactly as fixed in `01-action-plan.md` section 1a:

   ```
   resolveInstalledRuntimeIdentity(executablePath, signal): Promise<InstalledRuntimeIdentity | null>
   InstalledRuntimeIdentity = {
     launcherRealPath: string        // realpath(executablePath)
     installationRoot: string        // path.dirname(path.dirname(launcherRealPath))
     interpreterPath: string         // path.join(installationRoot, 'lib', 'node')
     launcherArgvPrefix: readonly [string, string]   // [interpreterPath, installationRoot]
   }
   ```

   It performs exactly one `realpath` and one `access(interpreterPath, X_OK)`. It returns `null` — never a guess, never a fallback prefix, never `[executablePath]` — when either fails. There is no other producer of an expected argument-vector prefix anywhere in the solution. **No code in this task or any later task compares `argv[0]` to `config.executablePath`.**
4. **Attribution primitives.** Export these named functions plus one injectable interface `RuntimeAttributionPrimitives` holding exactly **seven** members, and one `defaultRuntimeAttributionPrimitives` implementation:
   - `resolveInstalledRuntimeIdentity(executablePath, signal)` — item 3.
   - `listRuntimeCandidatePids(signal): Promise<{ readonly pids: readonly number[]; readonly complete: boolean }>` — one bounded `/proc` enumeration; `complete` is `false` when the enumeration itself failed or was cancelled, and a per-entry read failure caused by an exiting process does not make the enumeration incomplete.
   - `readProcessAttributionIdentity(pid, signal): Promise<{ processStartTime: string; processGroupId: number; uid: number } | null>` — `/proc/<pid>/stat` fields 5 and 22 using the delivered post-`)` parsing, and the `Uid:` line of `/proc/<pid>/status`.
   - `readProcessCommandLine(pid, signal): Promise<readonly string[] | null>` — NUL-split `/proc/<pid>/cmdline` with the trailing empty element removed.
   - `readProcessGroupMemberPids(processGroupId, signal): Promise<{ readonly pids: readonly number[]; readonly complete: boolean }>` — **revision 2**; the same enumeration the delivered `readProcessGroupMembers` performs, reported as a completeness-bearing result instead of throwing, so `group-scan-incomplete` is a first-class refusal rather than an exception. The delivered `readProcessGroupMembers` keeps its exact signature and behaviour for its existing termination and residual-audit callers.
   - `readLoopbackListenerInode(port, signal): Promise<number | null>` — the LISTEN row for `127.0.0.1:<port>` in `/proc/net/tcp` and, when a dual-stack listener holds the same port, `/proc/net/tcp6`; returns the inode.
   - `readProcessSocketInodes(pid, signal): Promise<readonly number[] | null>` — `socket:[inode]` targets of `/proc/<pid>/fd`.

   Add `attribution: RuntimeAttributionPrimitives` to `RuntimeProcessDependencies` (5 → **6** members) defaulted in `defaultRuntimeProcessDependencies`, so every refusal branch is provable with injected fakes.
5. **Group-scoped listener ownership (revision 2).** Export the pure composed helper:

   ```
   resolveGroupListenerOwner(input: {
     groupLeaderPid: number
     port: number
     identity: InstalledRuntimeIdentity
     primitives: RuntimeAttributionPrimitives
     signal: AbortSignal
   }): Promise<{ owner: number } | { refusal: 'group-scan-incomplete' | 'listener-absent' | 'listener-not-owned' }>
   ```

   Rules, exactly as fixed in `01-action-plan.md` section 1c: the group enumeration must complete and contain `groupLeaderPid`, else `group-scan-incomplete`; a loopback LISTEN inode for `port` must exist, else `listener-absent`; that inode must appear in the socket descriptors of exactly one *conforming member* — same process group, current non-root uid, `argv[0] === identity.interpreterPath`, and `argv[1]` contained inside `identity.installationRoot` by `path.relative` containment — else `listener-not-owned`. The owner may be the group leader or a forked member; the implementation must not assume either. `listener-not-owned` is returned for an inode held outside the group, held by a non-conforming member, held by an unobservable holder, or observed in more than one member.

   **Revision 5 correction — the missing conjunct, fixed in `01-action-plan.md` section 13a.** The delivered helper refuses `group-scan-incomplete` only on `!group.complete` and then reads the listening socket, so a completed enumeration that omits the candidate leader is accepted. Correct it to this exact order, and change nothing else in the helper:

   1. `const group = await primitives.readProcessGroupMemberPids(input.processGroupId, input.signal)`;
   2. `if (!group.complete) return listenerRefusal('group-scan-incomplete')`;
   3. `if (!group.pids.includes(input.processGroupId)) return listenerRefusal('group-scan-incomplete')`;
   4. only then `primitives.readLoopbackListenerInode(...)`, and only then the per-member descriptor reads.

   The candidate leader identifier is the value the attribution boundary passes in as `input.processGroupId` — the attributed candidate root pid, already proven to equal its own process-group id by check 8. It is never derived, defaulted, or re-read from `group`. The comparison is strict numeric identity through `Array.prototype.includes` over the integer member pids the primitive returns: no string coercion, no re-parse, no prefix or substring test, no cardinality test, and no inference that a non-empty member set implies membership. **Do not rename the parameter**, do not add a refusal class, and do not split `group-scan-incomplete`: it names both sub-branches. No listener, descriptor, identity, argument-vector, or health call may occur between step 1 and a step-3 refusal.
6. **Adopted runtime handle.** Export `adoptOwnedRuntimeProcess(input: { pid, processStartTime, port, userDataPath, config, primitives?, attribution? }): OwnedRuntimeProcess`. It implements the delivered interface exactly: `terminate` delegates to `terminateOwnedRuntimeGroup` with the same bounds and then removes `userDataPath` in a `finally`, identically to a launched handle; `audit` uses the delivered bounded `auditRuntimeResource` with `config.stopAuditAllowanceMs`; `isAlive` compares a fresh process-start read to the recorded one. Its `exit` promise settles exactly once, with `{ code: null, signal: null, addressInUse: false }`, when its own `terminate` completes or when its own `isAlive` observes absence. **Revision 2, explicit:** it is never a never-settling promise, it is never registered with any timer, interval, watcher, or subscription, and no caller may add it to a task set that shutdown drains. The handle performs no polling of any kind.
7. Export `buildRuntimeUserDataPath(ownerToken: string, port: number): string` returning the delivered `path.join(os.tmpdir(), 'ascend-runtime-data', ownerToken + '-' + String(port))`, and use it in `launch` so the launch path and the attribution path can never diverge.

No signalling, binding, writing, or privileged operation may occur on any attribution path.

### Files and Surfaces
- `apps/api/src/project-runtime-process.ts`
- `apps/api/test/runtime-reconcile-host-conformance.test.ts` (V-3, V-4; real-host, run by `just proof-runtime-reconcile`)

### Acceptance Criteria
- AC-1: a detached workbench child survives an abrupt kill of its launching process, and `RuntimeExit.addressInUse` still classifies a real address-in-use exit.
- AC-1, AC-12: `resolveInstalledRuntimeIdentity(config.executablePath)` returns the bundled interpreter path and installation root of the configured executable, and its `launcherArgvPrefix` is byte-equal to the first two elements of a real spawned workbench's `/proc/<pid>/cmdline`.
- AC-12: `resolveGroupListenerOwner` returns the exactly observed owning member for a real workbench's own port, and `listener-not-owned` for a real listener held by a process outside that group.
- AC-10, AC-12 (revision 5): `resolveGroupListenerOwner` returns `group-scan-incomplete` both for an enumeration that did not complete and for a completed enumeration whose member set omits the candidate leader — including an empty member set — and in the second case it performs zero `readLoopbackListenerInode` and zero `readProcessSocketInodes` calls.
- AC-11, AC-12: each primitive returns `null` or `complete: false` rather than throwing on an unreadable, exited, or cancelled observation, and never fabricates a value.
- AC-12: attribution primitives perform no signal, bind, write, or privileged call, and complete without PID exhaustion or indefinite waiting.
- An adopted handle is interchangeable with a launched handle at the `OwnedRuntimeProcess` boundary, including user-data-directory removal on termination, and adds no background observation.

### Documentation Impact
Feeds T-14: the launch contract sentence about stderr, the ephemeral diagnostic file, the installed-runtime identity and its same-installation constraint, and the attribution reads.

### Test Coverage
- V-2 covers every primitive and every refusal branch with injected and real inputs, including all three `group-scan-incomplete` cases and their zero-call consequences (revision 5).
- V-3 covers survivorship with a real detached child and a real abrupt parent kill, plus address-in-use preservation.
- V-4 covers real-host launcher conformance and group listener ownership, with both negative controls. **Revision 3:** V-4 registers **two** fixture projects — one for the genuinely spawned workbench and one for the foreign-installation control — so that its single production pass has exactly one candidate per project, as required by `01-action-plan.md` section 1d. A control that carries the workbench project's own markers could only ever produce `ambiguous-candidates`.
- V-5 covers the adopted handle, including `exit` settlement, directory removal, and the absence of any background observation.

### Expected Evidence
- V-3 records the child's pre-kill and post-kill liveness observations and the parent's exit signal.
- V-4 records the resolved identity tokens, the byte-equality result for the launcher prefix, the observed listener-owning member and whether it was the leader, the observed candidate count per registered project (exactly one each), and both negative-control refusals.
- V-2 records one recorded observation per primitive per branch.
- Matrix rows S-08 … S-22 reference the primitive branch each refusal used.

---

## Task T-3: Implement bounded one-shot reconciliation in the runtime manager

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-15, AC-16, AC-17
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation, ADR-260815-public-runtime-state-projection, ADR-260815-termination-sequencer-boundary
- **Related Core-Components:** CORE-COMPONENT-260815-host-runtime-attribution-evidence, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging

### Description
Change `apps/api/src/project-runtime-manager.ts`. Add one `ReconcilingEntry` to the `ProjectRuntimeEntry` union (`state: 'reconciling'`, `projectId`, `canonicalPath`, `generation: symbol`, `snapshot: RuntimeSnapshot` shaped exactly like the delivered restarting snapshot with null identity fields, `settlement: Promise<void>`, `controller: AbortController`). Add `listProjects` to `ProjectRuntimeManagerDependencies` (the library's ordered list). Add `beginReconciliation(): Promise<void>` as a **required** member of `ProjectRuntimeManager` and `inspectReconciliation?(): ReconciliationInspection` as an optional member exactly like the delivered `audit?()`.

1. **Install (synchronous after one list).** `beginReconciliation()` memoizes one promise. It rejects with `RuntimeFailure('manager-shutdown')` when shutting down. It awaits `listProjects()` once; a rejection propagates unchanged. It then resolves `resolveInstalledRuntimeIdentity(config.executablePath)` once for the whole pass. It then, in one synchronous block, calls the delivered `register(projectId, canonicalPath)` for every listed project, installs a `reconciling` entry for each, emits one `runtime.reconcile.requested` (`stopped` → `reconciling`) per project, records `startedAt = deadlineScheduler.now()`, arms one deadline with `deadlineScheduler.scheduleDeadline(reconciliationOverallBoundMs(config), …)`, starts the settlement task, and resolves. It never awaits settlement. With zero listed projects it emits nothing, performs no `/proc` read, resolves no identity, arms no deadline, records `scanCompleted: null`, `candidateCount: 0`, and settles immediately.
2. **Identity gate (revision 2).** When `resolveInstalledRuntimeIdentity` returns `null`, every registered project settles `unresolved` with `launcher-unresolved`, no `/proc` enumeration is performed, and no candidate is read. This is a whole-pass refusal, not a per-candidate one.
3. **Discover (once, bounded by `reconcileScanAllowanceMs`).** One `listRuntimeCandidatePids` pass. For each pid, read the command line and compute the two candidacy markers fixed in `01-action-plan.md` section 1b: the registered project whose exact persisted canonical path equals the vector's final element, and the registered project whose owner token equals the `--user-data-dir` basename's owner-token segment. A pid is a **candidate for project `P`** when `P` equals either marker; a pid with neither marker is ignored entirely and is neither counted nor refused; a pid whose two markers name different projects is a candidate for both. Candidacy is deliberately that wide so a foreign, stale, or mismatched process shaped like a workbench is refused by name. Record `scanCompleted` from the enumeration's `complete` flag and `candidateCount`. A pid that exits mid-scan is skipped without making the scan incomplete.
4. **Classify and attribute (bounded by `reconcileAttributionAllowanceMs` per candidate, then `reconcileReadinessBoundMs` for readiness), per project and independently.** Zero candidates with `scanCompleted: true` → `absent` with proof `no-candidate-complete-scan`. Zero candidates with `scanCompleted: false` → `unresolved` / `scan-incomplete`. Two or more candidates → `unresolved` / `ambiguous-candidates`. One candidate → evaluate checks 2 … 13 of `01-action-plan.md` section 1b **in that evaluation order**, stopping at the first failure and recording its named refusal reason:
   - checks 2 … 7 from `readProcessAttributionIdentity` and `readProcessCommandLine`, with the three specific argument checks (final element, owner token, port agreement) evaluated **before** the wholesale `argv.slice(2)` byte-equality check, and the expected vector built from `buildRuntimeArgv` and `buildRuntimeUserDataPath` for the port parsed from the candidate's own `--bind-addr`;
   - checks 8 … 11, of which 9 … 11 run through `resolveGroupListenerOwner`, whose three refusals map straight through;
   - check 12 re-attempts the delivered health adapter with `config.healthAttemptTimeoutMs` per attempt inside `reconcileReadinessBoundMs`, pacing itself across **trusted-scheduler poll gaps** of at most `config.pollIntervalMs` as fixed in `01-action-plan.md` section 13b — never by awaiting `processDependencies.sleep`;
   - check 13 re-reads the candidate's process-start time, the candidate's argument vector, **and the listener-owning member's process-start time** and requires all three to equal the first reads.
   If the candidate disappears at any point, run the delivered `auditRuntimeResource` for its exact identity: a complete triple of absences settles `absent` with proof `candidate-audit-triple-absent`; anything else settles `unresolved` / `absence-unconfirmed`.
5. **Adopt.** Build the handle with `adoptOwnedRuntimeProcess`, register ownership under a fresh `Symbol(projectId)` generation, freeze a snapshot whose `state` is `'running'`, `internalUrl` is `http://127.0.0.1:<port>`, `canonicalPath` is the persisted value, `stableRoute` is `stableProjectRoute(projectId)`, `ownerToken` is `deriveProjectOwnerToken(projectId)`, `startedAt` is the reconciliation start and `elapsedMs` the settled elapsed, install the `running` entry with one compare-and-set against the exact `reconciling` entry, and emit `runtime.reconcile.succeeded`. **Do not attach a process-exit background task for an adopted runtime, and do not add its `exit` promise to `backgroundTasks` or to any set that `shutdown()` drains.** There is no child handle and no automatic health monitoring in this issue; a later death is observed only by the delivered on-demand liveness and health checks in `start`, `stop`, and `restart`, exactly as recorded in `01-action-plan.md` section 5. That difference from a launched runtime is a decided, documented limitation, not an oversight.
6. **Settle absent and unresolved.** `absent` installs `registered { released: true }` and emits `runtime.reconcile.absent`. `unresolved` installs the delivered `failed` entry carrying `new RuntimeFailure('reconcile-unconfirmed')` through the delivered `failEntry` helper and emits `runtime.reconcile.failed` with `classification: 'reconcile-unconfirmed'`.
7. **Deadline.** When the armed deadline fires, abort the reconciliation controller, settle every still-pending project as `unresolved` / `deadline-exceeded`, and cancel the handle on every exit path. Abandoned observations must not be read, recorded, converted into absence, or allowed to mutate an entry.
7b. **Revision 5 correction — trusted readiness pacing (`01-action-plan.md` section 13b).** `probeCandidateReadiness` currently awaits `processDependencies.sleep(config.pollIntervalMs, signal)` between health attempts. Replace it with one module-local helper declared beside `runReconciliationBounded`:

   ```
   awaitTrustedReconciliationDelay(milliseconds: number, signal: AbortSignal): Promise<void>
   ```

   It resolves immediately when `signal.aborted` is already true; otherwise it arms `deadlineScheduler.scheduleDeadline(Math.max(0, milliseconds), resolve)` plus one `once: true` `'abort'` listener that resolves the same promise; it never rejects and returns nothing; and it cancels the scheduled handle and removes the listener on every exit path, so a callback delivered after cancellation resolves nothing and mutates nothing. It performs no probe, read, write, or state transition of its own. It is **not** exported, **not** a `ProjectRuntimeManager` member, **not** a config member, and **not** a dependency member, so no member count changes.

   `probeCandidateReadiness` captures `const readinessDeadlineAt = deadlineScheduler.now() + config.reconcileReadinessBoundMs` immediately before it calls `runReconciliationBounded` for readiness, and each gap awaits `awaitTrustedReconciliationDelay(Math.max(0, Math.min(config.pollIntervalMs, readinessDeadlineAt - deadlineScheduler.now())), signal)`, so a gap can never extend past the window that encloses it. After each gap the loop re-checks `signal.aborted` and issues no further health probe once aborted; an abort during a gap resolves the gap, exits the loop, and returns `{ completed: false }`, which settles the project by its enclosing reason and never from a readiness verdict that was not read. Introduce no timer library, no `setTimeout`, no `setInterval`, no `timers/promises`, no new configuration member, and no new declared bound. **Preserve** the two delivered non-reconciliation uses of `processDependencies.sleep` exactly as they are: launched-runtime readiness polling in `project-runtime-process.ts`, and the selected-Stop overall bound inside `stop` in this file.

7c. **Revision 5 — manager-side consequence of the membership refusal (`01-action-plan.md` section 13a).** When `resolveGroupListenerOwner` returns `group-scan-incomplete`, the manager maps it straight through as it already does, settles `unresolved`, and issues **no** further observation for that candidate: no listener lookup, no descriptor read, and no readiness probe, so that project's readiness count is exactly `0` in the execution witness. No manager code changes for this beyond consuming the corrected helper.

8. **Guards for late work.** Every settlement compare-and-sets on the exact `reconciling` entry object and its generation. A settlement whose entry is no longer installed records nothing, emits nothing, and mutates nothing. Late scan, identity, group, listener, readiness, and audit results arriving after settlement or after the deadline are discarded the same way. Reconciliation never signals, terminates, launches, or emits a start, stop, restart, or health event.
9. **Shutdown.** `shutdown()` aborts the reconciliation controller before its delivered sweep, awaits nothing that the reconciliation still has pending, claims no absence for an unsettled project, signals no unadopted candidate, and treats an already-adopted runtime as the owned runtime it is. `inspectReconciliation()` after shutdown reports `phase: 'aborted'` with per-project outcomes settled so far.
10. **Inspection.** `inspectReconciliation()` returns the frozen bounded record defined in T-1, keyed by `deriveProjectOwnerToken(projectId)`, with no pid, port, path, argv, inode, or authority value.

### Files and Surfaces
- `apps/api/src/project-runtime-manager.ts`

### Acceptance Criteria
- AC-1, AC-3: every registered project is `Starting` from installation until it settles, then exactly one of `Running`, `Stopped`, `Failed`.
- AC-6: three sequential manager instances over the same survivors settle identically, with no identity change, no duplicated ownership record, and no accumulated listener.
- AC-8: exactly one `requested` event per project and exactly one terminal reconcile event per settled project; no start, stop, restart, or health event.
- AC-9: zero registered projects settles with no `/proc` read, no identity resolution, no signal, and no launch.
- AC-10, AC-11, AC-12: every refusal class settles `unresolved` with its named reason, claims nothing, and signals nothing.
- AC-15: a late observation cannot mutate a later generation.
- AC-16: two projects settle independently with disjoint entries, events, and cleanup.
- AC-17: an aborted reconciliation ceases inside the bound, claims no absence, and leaves unadopted survivors untouched.
- No adopted runtime is given a background exit task, timer, interval, watcher, or poll.
- AC-1, AC-10, AC-18 (revision 5): no reconciliation path awaits `processDependencies.sleep`; every readiness poll gap is armed from `deadlineScheduler`, clamped inside `reconcileReadinessBoundMs`, and abandoned on abort, and a project refused at check 9 records zero listener, descriptor, and readiness observations.

### Documentation Impact
Feeds T-14: outcomes, absence rule, bounds and their origin, events, inspection, shutdown behaviour, and the adopted-liveness limitation with its on-demand corrections.

### Test Coverage
- V-6, V-7, V-8, V-11, V-12 cover installation, identity gating, classification, adoption, bounds, concurrency, interruption, and late work; V-16 executes them as catalogued scenarios.

### Expected Evidence
- Matrix rows S-01 … S-32 and S-48 … S-66 with `outcome`, `refusalReason`, `absenceProof`, `publicState`, `events`, `elapsedMs`, `boundMs`, `adoptedLiveness`.
- `inspectReconciliation()` records captured per scenario.

---

## Task T-4: Admit or refuse acquisition, Stop, and Restart around reconciliation

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-3
- **Acceptance Criteria:** AC-2, AC-4, AC-5, AC-9, AC-10, AC-13, AC-14, AC-16
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation, ADR-260815-selected-runtime-stop-control, ADR-260815-explicit-workbench-restart-control, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Change `apps/api/src/project-runtime-manager.ts` only. Implement exactly the admission table in `01-action-plan.md` section 3.

1. Add one private helper `reconciliationBlock(projectId)` that returns `true` when the installed entry is `failed` and its retained failure category is `'reconcile-unconfirmed'`. It reads only the entry map and performs no await.
2. **`start`.** After the delivered persisted-project and canonical-path checks and before `register`: if the entry is `reconciling`, await that entry's `settlement` promise (which is bounded by the reconciliation deadline and therefore cannot exceed `reconciliationOverallBoundMs`), honouring the caller's `signal` exactly as the delivered waiter does, then re-read the entry and continue with the delivered logic for the settled state. If `reconciliationBlock(projectId)` is true — before or after that await — throw `new RuntimeFailure('reconcile-unconfirmed')` **before** `register`, port acquisition, or `launch`. A settled `running` entry follows the delivered liveness-plus-health reuse path unchanged, which is also the primary on-demand correction for an adopted runtime that has since died; a settled `registered { released: true }` entry follows the delivered launch path unchanged.
3. **`stop`.** Immediately after the delivered shutdown and persisted-project checks and **before** the entry-state switch: `reconciliationBlock` true → `rejected` / `reconcile-unresolved`; entry `reconciling` → `rejected` / `reconcile-in-progress`. Both return frozen results, change no entry, call no process primitive, and emit no lifecycle event. Every delivered row of the stop table is otherwise unchanged, including the delivered sequencer's `already-absent` path for an adopted runtime that has since died.
4. **`restart`.** Same two checks in the same order and the same position, returning `rejected` / `reconcile-unresolved` and `rejected` / `reconcile-in-progress`. They precede the delivered eligibility switch, so the delivered failed-entry replacement path can never launch over an unattributable survivor. A `running` entry installed by adoption is eligible and follows the delivered release-before-replacement gate, bounds, admission, quarantine, and generation rules unchanged.
5. Concurrency: eight concurrent `start` calls for one project held across the boundary join the one settlement and then the one delivered outcome — one reused adopted snapshot and listener when adoption succeeded, or the identical thrown `reconcile-unconfirmed` with zero launches when it did not. Peer projects remain independently operable throughout.

Change no delivered rejection precedence other than inserting these two checks, and add no new await between reading a running entry and installing a stopping or restarting entry.

### Files and Surfaces
- `apps/api/src/project-runtime-manager.ts`

### Acceptance Criteria
- AC-13: eight concurrent acquisitions across a healthy boundary settle within `workbenchAcquisitionBoundMs` against one identity and one listener with zero launches; eight concurrent acquisitions across an unresolved boundary all receive `reconcile-unconfirmed` within the same ceiling and launch nothing.
- AC-9: eight concurrent acquisitions across an absent boundary produce exactly one launch across the group within `acquisitionAcrossReconciliationBoundMs`, and a later normal acquisition after an absent settlement launches once within `workbenchAcquisitionBoundMs`.
- AC-14: Stop and Restart during pending reconciliation return their pre-acceptance category, leave public state unchanged, and emit no event.
- AC-4, AC-5: Stop and Restart on an adopted runtime behave exactly as the delivered contracts, including when that runtime has already died.
- AC-2, AC-16: peers and stable routes are unaffected.

### Documentation Impact
Feeds T-14: the admission table, acquisition behaviour, the on-demand correction paths, and the operator path for an unresolved project.

### Test Coverage
- V-9 and V-10 cover acquisition and control admission; V-16 executes S-33 … S-47 and S-58 … S-62.

### Expected Evidence
- Matrix rows S-33 … S-47 recording acquisition counts, launches, identities, route outcomes, rejection categories, and zero events for unaccepted actions.

---

## Task T-5: Wire one required reconciliation into application startup

- **Status:** Completed
- **Complexity:** Low
- **Dependencies:** T-3, T-4
- **Acceptance Criteria:** AC-1, AC-3, AC-9, AC-17
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation, ADR-260815-public-runtime-state-projection
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260810-sqlite-persistence-lifecycle

### Description
Change `apps/api/src/app.ts` only.

1. Pass `listProjects: () => library.list()` into the default `createProjectRuntimeManager` factory alongside the delivered `findProjectById` and `recordEvent`.
2. After the manager, proxy, close service, and registration are constructed and decorated, and **before** any route plugin is registered, call `await runtimeManager.beginReconciliation()`. **Revision 2, mandatory:** no optional chaining, no `typeof` guard, no `in` test, and no try/catch that would let a missing or failing reconciliation reach a served request. Because `beginReconciliation()` is a required member of `ProjectRuntimeManager`, a manager that cannot reconcile is a type error rather than a silent runtime skip. Because Fastify does not serve a request until plugin registration resolves, every registered project holds a `reconciling` entry before the first request.
3. A rejection from that call is handled by the delivered construction `catch`: shut down proxy, manager, registration, and library in the delivered order and throw `ProjectLibraryInitializationError`, so a failed library list at startup surfaces through the delivered `project_library_initialization_failed` path instead of serving a fabricated `Stopped` for every project. Add no new public category and no new startup event.
4. The `onClose` hook is unchanged: proxy, then manager (which aborts reconciliation), then registration, then library.

### Files and Surfaces
- `apps/api/src/app.ts`

### Acceptance Criteria
- AC-3: no request is served before installation completes, and no code path can start the application with reconciliation skipped.
- AC-9: an application with zero registered projects starts normally and creates or signals nothing.
- AC-1, AC-17: shutdown ordering is unchanged and aborts an in-flight reconciliation before the manager sweep.
- A library-list failure fails startup explicitly with the delivered category.

### Documentation Impact
Feeds T-14: startup behaviour and the startup-failure path.

### Test Coverage
- V-13 covers wiring, ordering, zero-project startup, the failure path, and the absence of any optional-call form.

### Expected Evidence
- V-13 assertions on registration order, the recorded startup-failure event, and a first-request projection that never reports a false `Stopped`.
- The `reconcile-startup-required` source guard in V-15.

---

## Task T-6: Publish the two Stop and two Restart route categories and the exhaustive proxy failure row

- **Status:** Completed
- **Complexity:** Low
- **Dependencies:** T-1, T-4
- **Acceptance Criteria:** AC-10, AC-14
- **Related ADRs:** ADR-260815-selected-runtime-stop-control, ADR-260815-explicit-workbench-restart-control, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-structured-runtime-logging

### Description
1. `apps/api/src/routes/project-runtime-stop.ts`: append `'runtime_reconcile_in_progress'` and `'runtime_reconcile_unresolved'` to `RUNTIME_STOP_ROUTE_ERROR_CATEGORIES` (10 → **12**) and add `'reconcile-in-progress': [409, 'runtime_reconcile_in_progress']` and `'reconcile-unresolved': [409, 'runtime_reconcile_unresolved']` to `STOP_REJECTION_STATUS`. Response shape, body limit, query and body strictness, and the operational rejection record are unchanged.
2. `apps/api/src/routes/project-runtime-restart.ts`: the same two categories (10 → **12**) with the same 409 statuses in its rejection map.
3. `apps/api/src/workbench-proxy-contract.ts`: the failure table is exhaustive by construction over the proxied runtime union, so add exactly one row — category `runtime:reconcile-unconfirmed`, status **503**, code `workbench_reconcile_unconfirmed`, message `'Workbench recovery could not be confirmed.'` — bringing the table to **30** rows with an **18**-row `runtime:` subsequence. Change no other row, no classification function, and no proxy behaviour. `WORKBENCH_FAILURE_TABLE_SHA256` changes as a consequence; BL-011 retains no committed failure-matrix artifact and recomputes that hash in memory, so no committed evidence file changes.

### Files and Surfaces
- `apps/api/src/routes/project-runtime-stop.ts`
- `apps/api/src/routes/project-runtime-restart.ts`
- `apps/api/src/workbench-proxy-contract.ts`

### Acceptance Criteria
- AC-14: both routes answer 409 with the exact category for a pending or unresolved project and disclose no runtime state, identity, port, path, authority, or server message.
- AC-10: opening an unresolved project through the stable route returns 503 `workbench_reconcile_unconfirmed` with the fixed safe message.

### Documentation Impact
Feeds T-14: the Stop and Restart route category lists and the complete safe failure table.

### Test Coverage
- V-10 covers both routes; V-9 covers the proxy row.

### Expected Evidence
- Route response captures per category; failure-table row count assertions at 30 and 18; the recomputed table hash compared in memory by the delivered BL-011 tests.

---

## Task T-7: Mirror the three closed vocabularies in the web clients

- **Status:** Completed
- **Complexity:** Low
- **Dependencies:** T-6
- **Acceptance Criteria:** AC-3, AC-10, AC-14
- **Related ADRs:** ADR-260815-public-runtime-state-projection, ADR-260815-per-project-lifecycle-activation
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-structured-runtime-logging

### Description
1. `apps/web/src/runtime-state.ts`: append `'reconcile-unconfirmed'` to `RUNTIME_FAILURE_CATEGORIES` (18 → **19**) and add its client-owned `RUNTIME_FAILURE_NOTICES` text fixed in `01-action-plan.md` section 8.
2. `apps/web/src/runtime-stop.ts`: append `'runtime_reconcile_in_progress'` and `'runtime_reconcile_unresolved'` to `RUNTIME_STOP_ERROR_CATEGORIES` (10 → **12**), add both notices, and add both to `RUNTIME_STOP_STATUS` as **409**.
3. `apps/web/src/runtime-restart.ts`: the same two categories, notices, and statuses (10 → **12**).
4. Change no component, hook, admission rule, focus behaviour, refresh cardinality, or transport bound. A `Starting` row continues to render no Restart control and to render Stop exactly as delivered; pressing Stop on a reconciling row surfaces the client-owned pre-acceptance notice.

### Files and Surfaces
- `apps/web/src/runtime-state.ts`
- `apps/web/src/runtime-stop.ts`
- `apps/web/src/runtime-restart.ts`

### Acceptance Criteria
- AC-3, AC-10: a `Failed` row carrying `reconcile-unconfirmed` renders client-owned text and never a server message.
- AC-14: both new route categories parse as known errors with 409 and render client-owned text.
- No server-provided message, path, identity, port, or authority reaches the browser.

### Documentation Impact
Feeds T-14: the user-facing recovery notices.

### Test Coverage
- V-14 covers all three mirrors and their exact counts.

### Expected Evidence
- V-14 assertions naming 19, 12, and 12, plus notice text equality.

---

## Task T-8: Migrate every typed `ProjectRuntimeManager` test double to the required reconciliation member

- **Status:** Completed
- **Complexity:** Low
- **Dependencies:** T-1, T-3
- **Acceptance Criteria:** AC-3, AC-21
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
**New in revision 2.** Making `beginReconciliation()` required is the repair for the silent-skip defect, and it has a real, countable change surface that revision 1 avoided by declaring the member optional. That surface is enumerated here in full so Implement does not discover it mid-build.

Add `beginReconciliation: async () => undefined` — or, where the double models a manager under test, a spy that records the call — to every structurally typed `ProjectRuntimeManager` double. Add nothing else; do not add `inspectReconciliation`, which stays optional.

**Exactly 16 double sites in 13 files:**

| File | Sites |
|---|---:|
| `apps/api/test/session-switching-matrix.test.ts` | 1 |
| `apps/api/test/workbench-proxy-websocket.test.ts` | 1 |
| `apps/api/test/home-workbench-matrix.test.ts` | 1 |
| `apps/api/test/project-runtime-isolation-acceptance.test.ts` | 1 |
| `apps/api/test/workbench-route-proof-correction.test.ts` | 1 |
| `apps/api/test/workbench-route-acceptance.test.ts` | 3 |
| `apps/api/test/workbench-proxy-route.test.ts` | 1 |
| `apps/api/test/workbench-navigation-shell.test.ts` | 1 |
| `apps/api/test/workbench-proxy-http.test.ts` | 2 |
| `apps/api/test/project-runtime-lifecycle.test.ts` | 1 |
| `apps/api/test/runtime-state-route.test.ts` | 1 |
| `apps/api/test/runtime-stop-route.test.ts` | 1 |
| `apps/api/test/runtime-restart-route.test.ts` | 1 |

Two structurally unchecked casts are deliberately **not** modified, because they assert their way past the interface and are unaffected by a new required member: `apps/api/test/runtime-stop-fixtures.ts` (`as unknown as ProjectRuntimeManager`) and `apps/api/test/workbench-proxy-route.test.ts` line 44 (`{} as ProjectRuntimeManager`). Do not "fix" them; changing them is out of scope and would alter delivered test intent.

`.trees/manual-test` is a separate git worktree outside the `apps/*` pnpm workspace. It is not built, typechecked, linted, or tested by `just verify`, and it must not be modified.

No behaviour of any migrated test changes: the added member is never called by those tests, and none of them constructs the real manager through `app.ts`.

### Files and Surfaces
- The 13 test files listed above.

### Acceptance Criteria
- AC-21: `pnpm typecheck` and every delivered gate pass with `beginReconciliation()` required and with no `as any`, `as unknown as`, `@ts-expect-error`, or widened interface introduced anywhere.
- AC-3: no double gains a stubbed reconciliation that reports a settled state, so no delivered test can accidentally assert reconciliation behaviour it does not exercise.

### Documentation Impact
None.

### Test Coverage
- V-13 asserts the interface member is required and that `app.ts` calls it unconditionally; V-20 runs the delivered gates that consume these doubles.

### Expected Evidence
- `pnpm typecheck` transcript and the delivered BL-011 … BL-018 gate transcripts in the `just verify` run.

---

## Task T-9: Build the reconciliation evidence contract, catalog, source guards, and validator

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3, T-4, T-5, T-6, T-7
- **Acceptance Criteria:** AC-8, AC-18, AC-19, AC-22
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation
- **Related Core-Components:** CORE-COMPONENT-260815-host-runtime-attribution-evidence, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Create `apps/api/src/runtime-reconcile-evidence.ts`, following the delivered BL-017 and BL-018 evidence modules in structure and strictness.

1. Export the frozen catalog `BL019_SCENARIOS` with exactly **66** identifiers `S-01` … `S-66` in the order fixed in `03-test-plan.md` V-16, and `BL019_SCENARIO_ACS` mapping each to its AC IDs. **Revision 5:** `S-17`'s catalog name becomes *Process-group enumeration completes without the candidate leader*; its identifier, position, bound, refusal class, and AC mapping are unchanged, and the catalog count stays 66. Export `BL019_ELAPSED_CLASSES = ['within-bound','over-bound']`, `BL019_OUTCOMES` re-exporting the contract's three outcomes, and the **eighteen** refusal reasons and two absence proofs from the contract rather than re-declaring them.
2. Export `BL019_DECLARED_BOUNDS` with exactly the **13** bounds enumerated in `01-action-plan.md` section 8 and require the artifact's `declaredBounds` to equal it exactly.
3. Define `RuntimeReconcileEvidenceProject` with exactly these members: `projectToken` (`bl019-project-<slug>`), `outcome` (`ReconcileOutcome | 'unsettled'`), `refusalReason` (`ReconcileRefusalReason | null`), `absenceProof` (`ReconcileAbsenceProof | null`), `publicState` (the settled public state, one of the four), `postActionPublicState` (`PublicRuntimeState | null`, non-null only when the row declares a lifecycle action), `publicFailureCategory` (`'reconcile-unconfirmed' | null`), `identity` (`{ preRestart: string | null; settled: string | null; unchanged: boolean | null }` using `bl019-identity-<slug>` opaque tokens), `listenerAttributed` (`0 | 1`), `listenerOwner` (`'group-leader' | 'group-member' | null`, non-null exactly when `outcome` is `'adopted'`), `absenceProven` (boolean).
   Define `RuntimeReconcileEvidenceRow` with exactly these members: `id`, `name`, `acceptanceCriteria` (non-empty), `projects` (ordered, possibly empty), `outcome` (`ReconcileOutcome | 'mixed' | 'not-applicable'`, where `'mixed'` is legal only for a row whose projects disagree and `'not-applicable'` only for a row with zero projects), `publicStates` (the projects' settled public states in project order, hence `[]` for a zero-project row), `declaredActions` (an ordered, possibly empty subset of `['acquire','stop','restart','shutdown']` naming every lifecycle action the scenario itself performs), `declaredKills` (an ordered, possibly empty subset of the row's project tokens whose adopted identity the scenario itself makes absent), `adoptedLiveness` (`'not-applicable' | 'alive' | 'died-observed-stale' | 'died-corrected'`), `events` (ordered records of event name, opaque project token, from, to, optional classification), `eventCount`, `listeners` (`{ attributed: number; accumulated: 0 }`), `acquisitions` (integer), `launches` (integer), `signalsSent` (integer), `signalsDelivered` (integer), `elapsedMs`, `boundMs`, `elapsedClass`, `absenceProven` (boolean), `residualCount` (`number | null`), `inspection` (the non-null `ReconciliationInspection` record captured for the row, or `null` only for a row that performs no reconciliation).
   **Revision 3, as corrected by revision 4:** add exactly one further **row** member, `execution`, fixed in `01-action-plan.md` section 12a, with these **7** nested members: `{ runId: string; managerInstances: number; primitiveCalls: Readonly<Record<'resolveInstalledRuntimeIdentity' | 'listCandidatePids' | 'readProcessCommandLine' | 'readProcessAttributionIdentity' | 'readProcessGroupMemberPids' | 'readLoopbackListenerInode' | 'readProcessSocketInodes' | 'probeHealth', number>>; probeHealthByProject: Readonly<Record<string, number>>; projectionCalls: number; eventSinkWrites: number; observedFrom: readonly ('manager-inspection' | 'public-projection' | 'event-sink' | 'primitive-ledger' | 'injected-clock' | 'route-response' | 'proxy-publication')[] }`. The `primitiveCalls` counters, `probeHealth` included, are **row-level aggregate totals that carry no per-project claim**. `probeHealthByProject` is keyed by the row's own opaque project tokens — its key set must equal `projects[*].projectToken` exactly, and it is `{}` on the zero-project row — and it is the only place a readiness-observation count per project may be expressed. The top-level row member count is unchanged at `+1 execution`. Also export `deriveAdoptedLiveness(row)` so `adoptedLiveness` is computed from the observed row rather than typed into a fixture.
   **Revision 2:** `teardownResidualCount` is removed from the row schema entirely. Matrix rows run on injected primitives and create no host resource, so a row-level teardown claim was a fabricated constant. Teardown is claimed only by the designated episode and only from observation (`01-action-plan.md` section 9).
4. Enforce these **total** aggregate rules so no row is uninhabitable and no aggregate can be assigned by hand: row `outcome` is derived from `projects` (single shared outcome, else `'mixed'`, else `'not-applicable'` when empty); `publicStates` equals the projects' `publicState` values in order; `listeners.attributed` equals the number of projects with `outcome: 'adopted'` and each of those has `listenerAttributed: 1` and a non-null `listenerOwner`, while every other project has `0` and `null`; `listeners.accumulated` is always `0`; row `absenceProven` is `true` if and only if the row has at least one project and every project settled `absent` with a non-null `absenceProof`; `residualCount` is the integer `0` if and only if row `absenceProven === true`, and is `null` otherwise, with every positive, negative, non-integer, and non-numeric value rejected everywhere; `postActionPublicState` is non-null on every project exactly when `declaredActions` is non-empty; `launches > 0` is legal only when `declaredActions` includes `'acquire'` or `'restart'`, and `signalsSent > 0` only when it includes `'stop'`, `'restart'`, or `'shutdown'`; `signalsDelivered <= signalsSent`; `inspection` is non-null on every row whose `projects` is non-empty.
5. Enforce the **adopted-liveness rules** (revision 2), which make the section-5 limitation machine-checked rather than prose: `adoptedLiveness` is `'not-applicable'` exactly when no project settled `adopted`; `'alive'` requires `declaredKills` empty; `'died-observed-stale'` requires `declaredKills` non-empty, `declaredActions` empty, every killed project's `publicState` still `'Running'`, and zero events after the terminal reconcile event; `'died-corrected'` requires `declaredKills` non-empty, `declaredActions` non-empty, and every killed project's `postActionPublicState` equal to the delivered corrected state for the declared action. No row may claim an automatic terminal transition for an adopted runtime.
6. Enforce the event cardinality rule rather than a magic total: a row that reconciles `n` projects carries exactly `n` `runtime.reconcile.requested` records and exactly one terminal reconcile record per settled project; a row that performs no reconciliation carries zero reconcile records; a `runtime.start.*`, `runtime.stop.*`, or `runtime.restart.*` record requires the matching member of `declaredActions`; a `runtime.health.changed` record requires `'acquire'`, `'stop'`, or `'restart'` in `declaredActions` and is never counted as a reconciliation event; and `eventCount` must equal the length of `events`.
7. Enforce: `elapsedMs` is a positive integer below `WALL_CLOCK_FLOOR_MS` (reuse the delivered floor constant pattern) and `elapsedMs <= boundMs` with `elapsedClass: 'within-bound'`; **`boundMs` must be a member of `BL019_DECLARED_BOUNDS` and must equal the bound the catalog declares for that row, and no matrix row may declare `reconciliationEndToEndBoundMs` (15,000), because the end-to-end ceiling is measured only from the replacement API spawn instant in the designated episode**; every adopted project has `identity.unchanged === true`, `listenerAttributed: 1`, `publicState: 'Running'`, and `publicFailureCategory: null`; every `absent` project has `publicState: 'Stopped'`, a non-null `absenceProof`, and `absenceProven: true`; every `unresolved` project has `publicState: 'Failed'`, `publicFailureCategory: 'reconcile-unconfirmed'`, and a non-null `refusalReason`; every `unsettled` project has `publicState: 'Starting'` and no terminal reconcile event; a row with an empty `declaredActions` has `launches === 0` and `signalsSent === 0`; every refusal class in the eighteen appears in at least one project of at least one row; both absence proofs appear in at least one project; both `listenerOwner` values appear in at least one adopted project; the union of `publicStates` across all rows equals exactly the four delivered public states; all 66 identifiers appear exactly once, in catalog order.
7b. **Revision 3 as corrected by revision 4 — execution-witness rules, total and per project.** Every row must carry a non-null `execution`. `runId` is unique across the artifact and is never a scenario identifier. `managerInstances >= 1` on every row. The zero-project row records every `primitiveCalls` counter at `0` and `probeHealthByProject` as the empty map `{}`; every other row records `resolveInstalledRuntimeIdentity >= 1` and `listCandidatePids >= 1`. `projectionCalls >= 1` on every row with a non-empty `publicStates`. `eventSinkWrites` equals `events.length`. `observedFrom` is non-empty and contains `manager-inspection` when `inspection` is non-null, `public-projection` when `publicStates` is non-empty, `event-sink` when `events` is non-empty, `primitive-ledger` on every row whose `projects` is non-empty, and `route-response` on every row whose declared control is issued through a route.

   The readiness rules are keyed to projects, never to the row, exactly as fixed in `01-action-plan.md` section 12a, and the validator applies each to that project's own recorded `outcome`, `refusalReason`, and `absenceProof`:
   - `probeHealthByProject`'s key set equals the row's `projects[*].projectToken` exactly — no missing key, no extra key, no foreign token — and every value is a non-negative integer;
   - **exactly `0`** for a project that settled `unresolved` with `launcher-unresolved`, `ambiguous-candidates`, `uid-mismatch`, `launcher-prefix-mismatch`, `canonical-path-mismatch`, `owner-token-mismatch`, `port-mismatch`, `argv-mismatch`, `not-group-leader`, `group-scan-incomplete`, `listener-absent`, or `listener-not-owned` — checks 0 … 11, all strictly before readiness — and for a project that settled `absent` with `no-candidate-complete-scan`;
   - **`>= 1`** for a project that settled `adopted` (check 12 then 13 satisfied), `readiness-unconfirmed` (check 12 attempted and polled to its bound), or `identity-unstable` (check 13, reachable only after check 12);
   - **unconstrained by class**, `>= 0`, for a project that settled `absent` with `candidate-audit-triple-absent`, `unresolved` with `absence-unconfirmed`, `deadline-exceeded`, or `manager-shutdown`, and for a project still `unsettled` at capture, because the evaluation order does not determine whether the disappearance, deadline, or abort landed before or after check 12;
   - counts are scoped to the pass whose `inspection` the row carries, aggregate every poll attempt inside `reconcileReadinessBoundMs`, and have no upper bound;
   - `primitiveCalls.probeHealth` is at least the sum of `probeHealthByProject`'s values on every row, and equals that sum on every row whose `managerInstances` is `1` and whose `declaredActions` is empty.

   Each count must be attributed from the injected primitive call ledger by observed call authority and observed manager instance and never from an expectation; a witnessed-pass entry whose authority matches injected candidates of more than one registered project fails the row as `probe-unattributable`, and an entry whose authority is a port the injected allocator issued to a launched runtime is a start-path probe, excluded from every project's map and counted only in the aggregate.
8. Export `validateSelectedReconcileSource(sources)` implementing exactly these **20** source-guard codes over the delivered source text, taking `SelectedReconcileSources` from 10 to **13** members with `matrixFixtures` (`apps/api/test/runtime-reconcile-fixtures.ts`), `designated` (`apps/api/test/runtime-reconcile-designated.test.ts`), and `controlWitness` (`apps/api/test/runtime-reconcile-control-witness.ts`):
   `reconcile-deadline-trusted-scheduler`, `reconcile-bound-origin-arithmetic`, `reconcile-no-signal-before-adoption`, `reconcile-conjunctive-attribution`, `reconcile-launcher-prefix-derived`, `reconcile-identity-reread`, `reconcile-listener-group-scoped`, `reconcile-absence-requires-complete-scan`, `reconcile-startup-required`, `reconcile-blocked-start-refuses-launch`, `reconcile-blocked-controls-reject`, `reconcile-pending-controls-reject`, `reconcile-no-lifecycle-success-fabrication`, `reconcile-no-adopted-exit-task`, `reconcile-shutdown-aborts`, `runtime-child-stderr-file-fd`, `reconcile-no-persisted-runtime-state`, `reconcile-privacy-public-surfaces`.
   Four are new or renamed in revision 2 and each has a precise assertion:
   - `reconcile-launcher-prefix-derived` — the expected argument-vector prefix is produced only by `resolveInstalledRuntimeIdentity`, and **no source compares `argv[0]` to `config.executablePath`**;
   - `reconcile-listener-group-scoped` — listener ownership is decided by `resolveGroupListenerOwner` over the candidate's process-group member set, and no source resolves the listening inode against the leader's own descriptors alone (replaces revision 1's `reconcile-listener-inode-ownership`). **Extended in revision 5, without adding a guard code:** slice the helper's own region of `sources.process` from `export async function resolveGroupListenerOwner` to `async function runBoundedPrimitive` and additionally require that the region contains `group.pids.includes(input.processGroupId)`, that its index is greater than the index of `readProcessGroupMemberPids(`, and that its index is less than the index of `primitives.readLoopbackListenerInode(`. The slice exists so the earlier primitive definitions in the same file cannot satisfy or defeat the ordering test;
   - `reconcile-startup-required` — `beginReconciliation` is declared without `?` on `ProjectRuntimeManager` and `app.ts` calls it without `?.`;
   - `reconcile-no-adopted-exit-task` — the adopted handle's `exit` promise is never added to `backgroundTasks` or any shutdown-drained set, and no timer, interval, or watcher is created for an adopted runtime;
   - `reconcile-bound-origin-arithmetic` — `reconciliationEndToEndBoundMs` is defined as the sum of the headroom, the internal bound, and the response allowance, and the internal bound is the sum of its four allowances.

   One is extended in revision 5, again without adding a guard code:
   - `reconcile-deadline-trusted-scheduler` — keep the delivered assertions, and additionally slice the reconciliation region of `sources.manager` from `const runReconciliationBounded` to `const stop = async` and require that the region contains **zero** occurrences of `processDependencies.sleep(`, `setTimeout(`, and `setInterval(`, and that it contains both `const awaitTrustedReconciliationDelay` and a `deadlineScheduler.scheduleDeadline(` call within that helper. The end anchor is `const stop = async` precisely so the delivered selected-Stop `sleep` remains legal and unguarded.

   Two are new in revision 3, fixed in `01-action-plan.md` section 12:
   - `reconcile-matrix-observed-rows` — over `matrixFixtures`: the module contains **zero** string literals drawn from `RECONCILE_OUTCOMES`, `RECONCILE_REFUSAL_REASONS`, `RECONCILE_ABSENCE_PROOFS`, `PUBLIC_RUNTIME_STATES`, the four reconciliation event names, `reconcile-unconfirmed`, and the four `adoptedLiveness` values; contains `createProjectRuntimeManager(`, `inspectReconciliation(`, and `reportPublicStates(`; reads no committed artifact and no JSON fixture; and assigns every observed row member from the run record. Scenario inputs — declared actions, declared kills, bounds, identifiers, names, and AC lists — are catalog-derived and exempt by name;
   - `reconcile-designated-real-api` — over `designated` and `controlWitness`: the designated source references `API_COMPILED_ENTRY` (`apps/api/dist/server.js`) and contains no `createProjectRuntimeManager`, no `buildApp(`, no `createApp(`, and no import from `../src/app.js`; the witness module uses `defaultRuntimeAttributionPrimitives` and `createProjectLibrary` and constructs no injected attribution fake.
9. Export `validateRuntimeReconcileMatrix(matrix)` returning a report that rejects each of these **12** mutation classes: **M-1** missing, extra, duplicated, or reordered scenario rows; **M-2** a wrong outcome for a scenario; **M-3** a wrong, missing, or extra refusal reason or absence proof; **M-4** a residual-claim mutation violating the total predicate; **M-5** an elapsed mutation (assigned zero, above bound, wall-clock magnitude, non-integer); **M-6** an event mutation (missing, extra, misordered, misclassified, or raw-identifier token); **M-7** an identity or aggregate mutation (adopted identity differing from the pre-restart identity, a duplicated identity, a peer's identity copied, or a hand-assigned `outcome`, `publicStates`, `listeners`, or `absenceProven` that disagrees with `projects`); **M-8** a privacy mutation (any protected value present in any declared source); **M-9** an attribution mutation (an adoption recorded with a failed or omitted check, or with a listener owner outside the candidate's group; **extended in revision 5 with one further fixture, not a new class**: a project recorded with `refusalReason: 'group-scan-incomplete'` together with `listenerAttributed: 1` or a non-null `listenerOwner`); **M-10** a bound-origin mutation (a `boundMs` outside `BL019_DECLARED_BOUNDS`, a row declaring the end-to-end 15,000 ms ceiling, or a row declaring a bound other than the one its catalog entry fixes); **M-11** an adopted-liveness mutation (a killed adopted identity recorded as automatically transitioned, an `adoptedLiveness` value inconsistent with `declaredKills` and `declaredActions`, or a corrective event recorded as a reconciliation event); **M-12** (revision 3, made project-keyed in revision 4) an execution-witness mutation (a missing `execution` record, `managerInstances: 0`, a `probeHealthByProject` key set that is not exactly the row's project tokens — a missing key, an extra key, or a foreign token — a per-project count contradicting that project's own recorded class, a cross-peer swap of two peers' counts on a mixed row, which is caught because each count is checked against its own project's recorded class, a `primitiveCalls` set inconsistent with the row's settled outcomes, a `primitiveCalls.probeHealth` below the map's sum or unequal to it on a single-pass action-free row, an `eventSinkWrites` disagreeing with `events.length`, a duplicated `runId`, or an `observedFrom` that omits a source the row's own members require).
10. Export the privacy scan surface: the declared protected value set (raw canonical paths, argv strings, executable and installation-root paths, pid values, process-start values, ports, loopback authorities, socket inodes, environment values, credentials, terminal and source content, stacks, raw errors) and a scanner that derives its match arrays from the actual bytes of every declared source, so an artifact that omits a source or assigns a zero is rejected.
11. Export `BL019_EPISODE_TEARDOWN_STATUSES = ['proven-clear','unproven','residual-present']` and `validateReconcileEpisode(episode)` implementing the section-9 rules: `teardown` is `null` or a complete observed record; `'proven-clear'` requires every probe completed and every one of the six residual classes observed at integer `0`; a `null`, `'unproven'`, or `'residual-present'` teardown makes the episode a non-success artifact; and every residual value must be accompanied by its own `probeCompleted` flag so a zero from an incomplete probe is impossible to express as a success.
   **Revision 3** extends the same validator, taking its rejection reasons from 3 to **15** and its declared `phaseOrder` from 16 to **18** (`P0`, `P0b`, `P0c`, `P0d`, `P1`, `P1b`, `P2`, `P3`, `P4`, `P5`, `P6`, `P7`, `P8`, `P9`, `P10`, `P11`, `P12`, `P13`):
   - **generation authenticity**, applied to every generation record anywhere in the episode — the startup control, the control subepisode's `C0` and `C1`, and the main episode's generations 0 … 3: `generation-not-compiled-api` (`argv[1]` does not end with `apps/api/dist/server.js`), `generation-eval-spawn` (`argv` contains `-e`, `--eval`, `-p`, `--print`, or `--input-type`), `generation-listener-unobserved` (`listenerOwnerPid !== pid`, or a missing listener inode), `generation-http-absent` (`httpRequests.succeeded < 1`), `generation-database-unobserved` (a missing `database.path`, `database.bytes <= 0`, or a null `database.projectRowsObserved`);
   - **control isolation**: `control-subepisode-missing`, `control-not-sole-candidate` (an observed candidate count other than `1` for a control's registered project), `control-settlement-mismatch` (a public settlement other than `Failed` with `reconcile-unconfirmed`, or an observed refusal reason other than the declared one), `control-signalled` (`signalsSent > 0`, or an observed liveness or identity change before that control's own teardown), `control-not-cleared-before-main-episode` (a control residual class that is not a completed-probe zero, or a clearance recorded at or after `P1`), `main-episode-control-candidate-bearing` (a coexisting control whose observed `pathMarker` or `tokenMarker` is non-null);
   - **structure**: `phase-order-mismatch` (a `phaseOrder` other than the eighteen declared phases in order).
   Every rejection is derived from observed members of the artifact. No rule accepts a value the episode assigned to itself.
12. Export `BL019_PRESERVED_EVIDENCE` with the two prior committed artifact paths and their required digests `c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3` (BL-017) and `fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880` (BL-018).

### Files and Surfaces
- `apps/api/src/runtime-reconcile-evidence.ts`

### Acceptance Criteria
- AC-18: the catalog is exactly 66 rows and every bound is declared in the artifact before any scenario acts.
- AC-19: every correlation named by AC-19 has a typed home in the row or episode schema, and the teardown claim is expressible only as an observation.
- AC-8: the event rule, the adopted-liveness rule, and the privacy scan are enforced by the validator, not by convention.
- AC-12, AC-18, AC-19 (revision 3): the execution witness, generation authenticity, and control isolation are enforced by the validator and the two new source guards, so a written row, a placeholder generation, and a coexisting candidate-bearing control each fail mechanically.
- AC-10, AC-12, AC-18 (revision 5): the two extended guards fail a helper that omits or misplaces the group-membership test and a reconciliation region that awaits `processDependencies.sleep` or arms a raw timer, and the extended `M-9` fixture fails a `group-scan-incomplete` project recorded with a listener attribution.
- AC-18, AC-19 (revision 4): the readiness witness is project-keyed and total, so no mixed row is required to hold both `0` and `>= 1` in one counter, and a cross-peer swap, a missing or extra project key, a nonzero count on an early refusal, and a zero count on a project that reached readiness each fail mechanically.
- AC-22: validation needs no network, credential, or manual step.

### Documentation Impact
Feeds T-14: the evidence encoding, especially the `residualCount` null rule, the removal of the row-level teardown field, and the episode teardown statuses.

### Test Coverage
- V-15 executes every source guard and every mutation class against mutated fixtures, and every episode teardown status.

### Expected Evidence
- V-15 report listing 20 guard codes passing with 20 negative controls, 12 mutation classes rejected, 3 episode teardown statuses classified, and all **15** episode rejection reasons exercised against targeted negative fixtures (the 3 revision-2 status rejections plus the 12 added in revision 3).

---

## Task T-10: Execute the deterministic 66-scenario matrix against production paths and emit the committed artifact

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-9
- **Acceptance Criteria:** AC-1 … AC-19, AC-22
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation
- **Related Core-Components:** CORE-COMPONENT-260815-host-runtime-attribution-evidence, CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
Create `apps/api/test/runtime-reconcile-matrix.test.ts` and `apps/api/test/runtime-reconcile-fixtures.ts`.

1. Execute all **66** catalogued scenarios independently with injected attribution, process, health, port, and deadline-scheduler dependencies. Every scenario declares its `boundMs` before its first action and measures `elapsedMs` on the injected monotonic clock. **No scenario declares 15,000 ms**: the internal reconciliation bound is 11,000 ms and the end-to-end ceiling belongs to T-11.
   **Revision 3, and this is what "execute" means.** Every row is *produced by running production code*, exactly as fixed in `01-action-plan.md` section 12a. Each scenario constructs a real `ProjectRuntimeManager` through `createProjectRuntimeManager`, calls the real `beginReconciliation()`, and — where the row declares one — drives the real acquisition, Stop, Restart, and route paths and the real `reportPublicStates`. Every observed row member is then read back from that run: `outcome`, `refusalReason`, `absenceProof`, and per-project settlement timing from `inspectReconciliation()`; `publicState` and `postActionPublicState` from `reportPublicStates`; `events` and `eventCount` from the recorded event sink; `launches`, `signalsSent`, `signalsDelivered`, `acquisitions`, and listener attribution from the injected primitives' call ledger; `elapsedMs` from the injected clock; `adoptedLiveness` from the exported `deriveAdoptedLiveness`. Each row also carries its `execution` witness with the counters and rules fixed in section 12a, including the project-keyed `probeHealthByProject` map, whose per-project counts are attributed from the injected primitive call ledger by observed authority and observed manager instance.
   **These do not count as T-10 completion or as AC evidence:** building a row from the catalog constants, mapping an expected value into a row, serializing a static fixture, re-reading the committed artifact, or running only the validator. The partially implemented `runtime-reconcile-fixtures.ts`, which constructs all 66 rows from catalog constants without executing any manager, admission, route, or projection path, is superseded and must be rewritten to this rule.
   Expected values live in `runtime-reconcile-matrix.test.ts`, which asserts observed rows against the catalog; they must not appear in `runtime-reconcile-fixtures.ts`, which the `reconcile-matrix-observed-rows` guard enforces.
2. Injected fixtures use a **synthetic** installed-runtime identity so the matrix stays hermetic and never spawns a workbench, but they must model the **real** host shape proven in V-4, not the revision-1 shape: a conforming candidate's argument vector is `[interpreterPath, installationRoot, ...buildRuntimeArgv(...)]`, and its listening inode is held by a forked group member in the adopted rows that declare `listenerOwner: 'group-member'` and by the leader in the row that declares `listenerOwner: 'group-leader'`. V-4 is the bridge that proves the synthetic shape equals the real one on this host.
3. No scenario may use a retry, a sleep-until-it-passes loop, a real network call, or a manual step. Real host processes are used only in V-3, V-4, and the designated episode.
3b. **Revision 5.** Re-execute all 66 rows against the corrected production code and regenerate the committed artifact. Two scenario inputs change and nothing else: `S-17`'s injected `readProcessGroupMemberPids` returns `{ complete: true, pids: [<one forked member>] }`, omitting the candidate leader, so the row records the membership sub-branch of `group-scan-incomplete` with zero listener, descriptor, and readiness observations for its project; and every scenario injects a `sleep` implementation that **fails when invoked**, so a reconciliation that depended on the fallible primitive could not settle. Readiness pacing is now driven by the injected deadline scheduler, so `S-21` and every other polling row remain fully deterministic on injected time with no real sleep and no retry. `S-17`'s observable row members keep their catalogued values; only its `name` and its injected input change.
4. Write the artifact to `test-results/bl-019/runtime-reconcile-matrix.json` and require it to be byte-identical to the committed `project/work-items/43-bl-019-reconcile-workbench-runtimes-after-api-restart/implementation/evidence/runtime-reconcile-matrix.json`, following the delivered BL-017 and BL-018 convention.
5. Validate the emitted artifact with `validateRuntimeReconcileMatrix` and the source set with `validateSelectedReconcileSource` — now 13 sources including `runtime-reconcile-fixtures.ts`, `runtime-reconcile-designated.test.ts`, and `runtime-reconcile-control-witness.ts` — in the same run. Validation alone is never evidence: it runs over the artifact this task's execution produced.
6. Record the `vocabularies` block from the live modules, not from literals, so a vocabulary drift fails here.

### Files and Surfaces
- `apps/api/test/runtime-reconcile-matrix.test.ts`
- `apps/api/test/runtime-reconcile-fixtures.ts`
- `project/work-items/43-bl-019-reconcile-workbench-runtimes-after-api-restart/implementation/evidence/runtime-reconcile-matrix.json`
- `test-results/bl-019/runtime-reconcile-matrix.json`

### Acceptance Criteria
- All 66 rows present exactly once in catalog order with `elapsedClass: 'within-bound'`.
- Every AC from AC-1 to AC-17 is named by at least one row per the mapping in `03-test-plan.md`, and AC-18 and AC-19 hold structurally for every row.
- Every row carries an `execution` witness that satisfies every total rule in `01-action-plan.md` section 12a, including a `probeHealthByProject` map whose keys equal that row's projects exactly, and `M-12` rejects each fabricated-witness fixture.
- `reconcile-matrix-observed-rows` passes against `runtime-reconcile-fixtures.ts` and fails against a negative fixture that types an expected outcome, refusal reason, public state, event name, or liveness value into the module.
- The committed artifact and the working copy are byte-identical.
- Revision 5: the regenerated artifact differs from the revision-4 artifact only where the corrected behaviour and the amended `S-17` entry require, and no other row's settled values move.

### Documentation Impact
Feeds T-14: the committed artifact path and the disposable working-copy path.

### Test Coverage
- V-16 is this task's execution; V-15 guards the validator itself.

### Expected Evidence
- The committed 66-row artifact and its byte-identical working copy, every row carrying its `execution` witness.
- The V-16 report naming, per row, the manager, admission, route, and projection entry points that produced it.

---

## Task T-11: Run the designated real API-restart episode with an isolated negative-control subepisode

- **Status:** Completed
- **Complexity:** High
- **Dependencies:** T-5, T-10
- **Acceptance Criteria:** AC-1, AC-2, AC-4, AC-5, AC-6, AC-7, AC-9, AC-10, AC-12, AC-14, AC-18, AC-19, AC-22
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation, ADR-260815-selected-runtime-stop-control, ADR-260815-explicit-workbench-restart-control
- **Related Core-Components:** CORE-COMPONENT-260815-host-runtime-attribution-evidence, CORE-COMPONENT-260808-filesystem-path-safety

### Description
Create `apps/api/test/runtime-reconcile-designated.test.ts` and `apps/api/test/runtime-reconcile-control-witness.ts`, gated by `BL019_DESIGNATED=1`, with zero retries and an overall bound of **360,000 ms**. Everything the episode claims is executed for real: the compiled API, real code-server workbenches, real controlled abrupt exits, real loopback HTTP, and real disposable SQLite databases.

**Two rules govern this task and are not negotiable.**

- **Every API generation is the compiled API.** `API_COMPILED_ENTRY` is `apps/api/dist/server.js`, built by the recipe. A generation is `spawn(process.execPath, [API_COMPILED_ENTRY], { env })` with a disposable `ASCEND_DATABASE_URL`, a fixed `ASCEND_PORT`, an `ASCEND_PROJECT_ALLOWED_ROOTS` covering only that episode's disposable root, and a fixed `ASCEND_FRONT_DOOR_TOKEN`; its record carries the OS-observed pid, process-start time, `/proc/<pid>/cmdline` argv, listener port, listener inode, listener-owning pid, real HTTP request counts, and the observed disposable database file, exactly as fixed in `01-action-plan.md` section 12b. A `node -e` placeholder, an in-process Fastify application, an in-process `ProjectRuntimeManager`, a synthesized record, or an assigned identity **cannot count** as a generation, as T-11 completion, or as evidence. The partially implemented designated test, which records four `node -e 'setInterval(...)'` processes as `apiGenerations` and drives an in-process manager, is superseded in full. `createProjectRuntimeManager` may not appear in this file at all; the one legitimate in-process production reconciliation lives in `runtime-reconcile-control-witness.ts`.
- **Every candidate-bearing control is isolated.** `01-action-plan.md` section 1d and section 11 govern control placement. `C-1` and `C-3` carry project markers, so they run only inside the `P0c` subepisode, each as the sole candidate for its own registered control project, and are torn down and independently proven clear in `P0d` before `P1` registers anything. `C-2` carries neither marker and is the only control that may coexist with survivors.

Phases, each declaring its bound before it acts, are exactly:

1. **P0 prerequisites.** Non-root expected user, executable present, `resolveInstalledRuntimeIdentity(config.executablePath)` non-null, readable `/proc`, readable `/proc/net/tcp`, a built `apps/api/dist/server.js`, two disposable project fixtures copied from the BL-001 fixture into a disposable root under `os.tmpdir()`, a disposable SQLite database, `ASCEND_PROJECT_ALLOWED_ROOTS` set to that root, and a fixed `ASCEND_FRONT_DOOR_TOKEN`. A failed prerequisite fails the episode with zero attempts.
2. **P0b startup headroom control (bound `reconciliationStartupControlBoundMs`, 4,000 ms).** Spawn a compiled API generation against an empty disposable database with **zero** registered projects, measuring with `process.hrtime.bigint()` from the spawn instant to the first `GET /api/projects/runtime` response. Record `startupControl.spawnToFirstResponseMs` and the full generation record. This is the measured proof of the startup headroom the 15,000 ms budget reserves, and it is also AC-9's zero-project case: assert no workbench resource was created and no signal was sent. Stop that generation before `P0c`.
3. **P0c isolated negative-control subepisode.** Execute steps 1 to 10 of `01-action-plan.md` section 11 exactly, with their declared bounds: create the control root, the two control fixtures, the foreign-installation tree, and the disposable control database; register `K-1` and `K-3` through generation `C0` and read both records back; stop `C0`; spawn `C-1` (a detached `node -e` idle process whose final argument is `K-1`'s exact canonical path, no `--user-data-dir`) and `C-3` (through `<foreign-root>/bin/code-server`, argument vector byte-identical to `buildRuntimeArgv(K-3.canonicalPath, port3, buildRuntimeUserDataPath(deriveProjectOwnerToken(K-3.id), port3))`, binding `127.0.0.1:port3` and serving the delivered `/healthz/` ready body); assert sole candidacy by observation; spawn generation `C1` and measure settlement from its spawn instant against `reconciliationEndToEndBoundMs`; assert both control projects report `Failed` with `reconcile-unconfirmed`, that zero workbench processes exist, that zero signals were delivered, and that both controls are alive with byte-identical identities; assert the delivered blocked surfaces — 503 `workbench_reconcile_unconfirmed` on each stable route with zero launches, and 409 `runtime_reconcile_unresolved` on Stop and on Restart with zero lifecycle events; then call `observeControlRefusalReasons` from `runtime-reconcile-control-witness.ts`, which runs one further **production** reconciliation in process with the default attribution primitives over `createProjectLibrary(<control database>)` and returns `inspectReconciliation()`, requiring `launcher-prefix-mismatch` for both `K-1` and `K-3`. Record every observed value; assert no refusal reason in advance of observing it, and never assign one by index.
4. **P0d control teardown and clearance (bounds 30,000 ms then 15,000 ms).** Execute steps 11 to 13 of section 11: stop `C1` gracefully, terminate `C-1` and `C-3` through the delivered exact-identity sequencer, remove the control database, both control fixtures, and the foreign-root tree; then re-probe, outside the teardown code path, both control identities, both control generations, `port3`, `<tmpdir>/ascend-runtime-data/<K-3 owner token>-<port3>`, and every disposable control path, each with its own `probeCompleted` flag. Record `controlSubepisode.residuals` and `clearedBeforePhase: 'P1'`. The episode proceeds only when every class is a completed-probe zero; otherwise it fails here, writes its non-success artifact, and registers no main-episode project.
5. **P1 baseline (bound 60,000 ms per acquisition).** Spawn compiled API generation 0 on a fixed loopback port against the main disposable database, register both projects through the delivered API, acquire both workbenches through their stable routes, and record for each: pid, process-start time, port, process-group leadership, **the full observed process-group member set with each member's identity**, the listener inode **and the exact member pid that holds it**, argv-derived user-data path, stable route, and the recursive fixture manifest (membership, digests, modes, timestamps) plus the registration row.
6. **P1b launcher conformance and candidate uniqueness.** For each acquired workbench, assert `/proc/<pid>/cmdline` is byte-equal to `resolveInstalledRuntimeIdentity(config.executablePath).launcherArgvPrefix` concatenated with `buildRuntimeArgv(canonicalPath, port, buildRuntimeUserDataPath(ownerToken, port))`, and assert the listener inode is held by an exactly observed conforming member of that workbench's own process group. Record `launcherConformance.prefixMatched` and `launcherConformance.listenerOwner` (`'group-leader'` or `'group-member'`) as observed; assert neither value in advance. **Revision 3:** additionally assert candidate uniqueness by observation over the whole live process set — exactly one candidate carries a marker for project A and exactly one for project B — so the healthy pass that follows is provably free of ambiguity.
7. **P2 the one coexisting control.** Start exactly one real control beside the survivors: **`C-2`**, a real listener process in its own process group holding a loopback port previously used by a terminated workbench. Record its identity and, from its own observed argument vector, its marker set against every registered project; both markers must be `null`, which is why it may coexist. `resolveGroupListenerOwner` for that port against a surviving workbench's group must return `listener-not-owned`, and the control must never be adopted or signalled. Record explicitly that this is a **helper-level** host-fidelity control and that the whole-predicate `listener-not-owned` class is carried by `S-19` and `S-20`, exactly as `03-test-plan.md` V-4 records it.
8. **P3 controlled abrupt exit.** `SIGKILL` compiled API generation 0, then assert both workbench processes and both listeners are still alive with byte-identical identities. This assertion is the survivorship proof and must not be retried or softened.
9. **P4 reconciliation (bound `reconciliationEndToEndBoundMs`, 15,000 ms, `originAt: 'api-process-spawn'`).** Spawn compiled API generation 1, measuring from the spawn instant with `process.hrtime.bigint()` to the first `GET /api/projects/runtime` response in which no registered project reports `Starting`. Assert both report `Running`, both identities are unchanged, exactly one runtime and one listener are attributable per project, no new workbench process exists, and zero signals were delivered. Record whether a pending `Starting` observation was captured; when settlement preceded the first response, record `pendingObserved: false` honestly rather than claiming it. Both projects reporting `Running` is itself the independent corroboration that no coexisting process made either project ambiguous.
10. **P5 stable route (bound 5,000 ms per request).** For each project, issue a fresh top-level document request and a marked `GET /projects/{id}/workbench/healthz/` through the unchanged stable route; require HTTP 200 with the delivered health body, require the workbench identity to be unchanged, and require an established connection from the replacement API to that exact port during the request window, proven by socket-inode ownership. No browser rendering claim is made here; BL-012 and BL-014 retain the browser claims.
11. **P6 sequential restarts (bound 15,000 ms each, same origin).** Repeat P3 and P4 for compiled API generations 2 and 3, asserting unchanged identities, no duplicated ownership, no accumulated listener, and no influence of an earlier outcome on a later one.
12. **P7 controls check.** Assert `C-2` is alive with its declared identity, that both of its markers are still `null`, that no project reports `Running` because of it, and that it was never adopted or signalled. Replay into the artifact the `P0c` records for `C-1` and `C-3` — their sole-candidacy counts, public settlements, observed refusal reasons, zero signals, and `P0d` clearance — without re-running them; they were settled and cleared before any survivor existed, which is precisely why their refusals were observable.
13. **P8 Stop (bound 5,000 ms).** Stop project A through the delivered route; assert `Stopped`, still registered, exact release of its attributed identity, owned group, and listener, and project B unchanged and still reachable on its unchanged route.
14. **P9 Restart (bound 66,000 ms).** Restart project B through the delivered route; assert the reconciled prior generation is confirmed absent before the replacement becomes ready, one new identity, and an unchanged stable route.
15. **P10 pre-teardown evidence capture.** Write `test-results/bl-019/designated-episode.json` with the schema fixed in `03-test-plan.md` V-17, including the eighteen-entry `phaseOrder`, the `controlSubepisode` block, every generation record, `residualCount: null`, and **`teardown: null`**. Survivors are deliberately alive at this instant; the artifact says so rather than predicting a cleanup that has not happened.
16. **P11 explicit teardown (bound 30,000 ms).** Only after capture: gracefully stop the API generation, terminate any remaining validation-owned workbench identity through the delivered sequencer, stop `C-2`, and remove the disposable fixtures, database, and runtime-data directories. The control subepisode's own resources were already removed in `P0d`.
17. **P12 independent teardown re-observation.** Re-probe every recorded identity, owned process group, listener port, and disposable path out of the teardown code path, producing `{ probesCompleted, residuals: { apiProcesses, workbenchProcesses, attributableDescendants, listeners, activeRequests, disposableFixtures } }`, each with its own `probeCompleted` flag. A class whose probe did not complete is never reported as zero.
18. **P13 atomic finalization.** Write the finalized episode to a temporary file in the same directory and `rename()` it over `designated-episode.json`, setting `teardown.status` to `'proven-clear'` only when every probe completed and every residual is `0`, and otherwise to `'unproven'` or `'residual-present'` with the observed counts. A failed teardown therefore leaves a real, non-success artifact that the residual audit rejects — never a preassigned zero.

Host identities, ports, paths, and measured durations stay in the disposable `test-results/bl-019` artifacts and are never committed.

### Files and Surfaces
- `apps/api/test/runtime-reconcile-designated.test.ts`
- `apps/api/test/runtime-reconcile-control-witness.ts`
- `test-results/bl-019/designated-episode.json`

### Acceptance Criteria
- AC-1, AC-6: each replacement generation is a compiled-API process that settles within 15,000 ms of its own spawn instant with unchanged identities and no accumulation.
- AC-9: the zero-project startup control settles within 4,000 ms and creates or signals nothing.
- AC-2: both stable routes reach the same ready pre-restart runtime with a connection-attribution match.
- AC-4, AC-5: Stop and Restart behave exactly as their delivered contracts on reconciled runtimes.
- AC-7: registration rows and fixture manifests are unchanged before and after.
- AC-10, AC-12: `C-1` and `C-3` are each the sole candidate for their own registered project, settle `Failed` with `reconcile-unconfirmed` through the compiled API, produce the observed refusal reason `launcher-prefix-mismatch` through a production reconciliation, refuse acquisition with 503 and zero launches, are never adopted or signalled, and are proven clear before `P1`.
- AC-14: Stop and Restart on an unresolved control project return 409 `runtime_reconcile_unresolved` with no lifecycle event.
- AC-12: `C-2` coexists with survivors only because both of its observed markers are `null`, and it survives unchanged, unadopted, and unsignalled.
- AC-18, AC-19, AC-22: every generation record satisfies the section-12b authenticity rules, survivors persist until `P11`, teardown is proven by re-observation in `P12` and finalized atomically in `P13`, and every step is repository-local, offline, and non-manual.

### Documentation Impact
Feeds T-14: the designated command, its bounds and their origin, the isolated control subepisode and why controls are isolated, what the episode proves, and what it deliberately does not claim.

### Test Coverage
- V-17 is this task's execution.

### Expected Evidence
- `test-results/bl-019/designated-episode.json` with the eighteen-entry phase order, the `controlSubepisode` block (registration records, marker sets, sole-candidacy counts, public settlements, observed refusal reasons, blocked-surface statuses, teardown, and completed-probe residual zeros cleared before `P1`), every generation record with its observed argv, listener, HTTP, and database evidence, all phase bounds, the measurement origin, the startup control, launcher conformance, measured elapsed values, identities, group member sets, listener owners, `C-2`'s null marker set, manifests, registration rows, and the finalized teardown record.

---

## Task T-12: Provide the independent residual audit command

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-2, T-11
- **Acceptance Criteria:** AC-12, AC-19, AC-22
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation
- **Related Core-Components:** CORE-COMPONENT-260815-host-runtime-attribution-evidence, CORE-COMPONENT-260806-project-command-interface

### Description
Create `apps/api/src/cli/runtime-reconcile-residual-audit.ts`, following the delivered BL-017 and BL-018 residual audits.

1. Read `test-results/bl-019/designated-episode.json` and reject, with a distinct exit reason each, a missing artifact, a malformed artifact, `teardown: null`, and any `teardown.status` other than `'proven-clear'`. The audit never accepts a value the episode assigned to itself.
2. **Recompute** every residual class out of process from the recorded identities and paths: each API generation pid and start identity — including the startup control and both control-subepisode generations — each workbench pid and start identity, each recorded owned process-group closure, each recorded loopback port including the control subepisode's `port3`, each recorded control identity from both subepisodes, and each disposable fixture, database, control fixture, foreign-root, and runtime-data path. Report the six classes required by AC-19 as integers: `apiProcesses`, `workbenchProcesses`, `attributableDescendants`, `listeners`, `activeRequests`, `disposableFixtures`.
3. Reject any class whose recomputed value differs from the episode's finalized `teardown.residuals` value. Agreement between two independent observations is the claim; a single self-report is not.
4. All six recomputed classes must be `0`, and a zero may be reported only from a completed probe; an incomplete probe is a failure, never a zero.
5. Separately assert that every control in both subepisodes was observed alive before its own cleanup and that no control was signalled by Ascend, and that the control subepisode's residual classes were completed-probe zeros recorded before `P1`.
6. **Revision 3:** reject the artifact when `validateReconcileEpisode` rejects it, so a placeholder generation (`generation-not-compiled-api`, `generation-eval-spawn`, `generation-listener-unobserved`, `generation-http-absent`, `generation-database-unobserved`), a control-isolation failure (`control-subepisode-missing`, `control-not-sole-candidate`, `control-settlement-mismatch`, `control-signalled`, `control-not-cleared-before-main-episode`, `main-episode-control-candidate-bearing`), or `phase-order-mismatch` fails the audit rather than the audit trusting the episode's prose.
7. Write `test-results/bl-019/residual-audit.json` and exit non-zero on any rejection, mismatch, non-zero residual, or incomplete probe.

### Files and Surfaces
- `apps/api/src/cli/runtime-reconcile-residual-audit.ts`
- `test-results/bl-019/residual-audit.json`

### Acceptance Criteria
- AC-19: all six residual classes are integer zero from completed probes and agree with the episode's finalized record.
- AC-12: control survival, sole candidacy, and pre-`P1` clearance are recorded independently of the episode's own claim, for both subepisodes.
- AC-22: the command is offline, repository-local, and non-interactive.

### Documentation Impact
Feeds T-14: the audit command and its authority over late closure.

### Test Coverage
- V-18 is this task's execution.

### Expected Evidence
- `test-results/bl-019/residual-audit.json` with six recomputed zeros, a completed-probe flag per class, the control-subepisode clearance re-check, the generation-authenticity verdict, and the agreement result against the episode's finalized teardown record.

---

## Task T-13: Add the root justfile recipes and wire the canonical gate

- **Status:** Completed
- **Complexity:** Low
- **Dependencies:** T-10, T-11, T-12
- **Acceptance Criteria:** AC-18, AC-21, AC-22
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface

### Description
1. Add to the root `justfile`, in the delivered style and placed immediately after the restart recipes:

```
verify-runtime-reconcile:
    BL019_ACCEPTANCE=1 pnpm exec vitest run apps/api/test/runtime-reconcile-contract.test.ts apps/api/test/runtime-reconcile-attribution.test.ts apps/api/test/runtime-reconcile-manager.test.ts apps/api/test/runtime-reconcile-admission.test.ts apps/api/test/runtime-reconcile-app.test.ts apps/api/test/runtime-reconcile-route.test.ts apps/api/test/runtime-reconcile-evidence.test.ts apps/api/test/runtime-reconcile-matrix.test.ts apps/api/test/runtime-reconcile-documentation.test.ts apps/web/test/runtime-reconcile-client.test.ts --reporter=verbose

proof-runtime-reconcile:
    pnpm --filter @ascend/api build:ts
    BL019_DESIGNATED=1 pnpm exec vitest run apps/api/test/runtime-reconcile-host-conformance.test.ts apps/api/test/runtime-reconcile-designated.test.ts --reporter=verbose

proof-runtime-reconcile-residual-audit:
    pnpm --filter @ascend/api exec tsx src/cli/runtime-reconcile-residual-audit.ts
```

2. Add `just verify-runtime-reconcile`, `just proof-runtime-reconcile`, and `just proof-runtime-reconcile-residual-audit` to the `verify` recipe in that order, immediately after `just proof-runtime-restart-residual-audit` and before `just verify-mvp-performance`, so designated episodes stay serial and precede their audits.
3. Add `project/work-items/43-bl-019-reconcile-workbench-runtimes-after-api-restart/implementation/evidence` to `.prettierignore`, matching the delivered treatment of the BL-004, BL-017, and BL-018 evidence directories.
4. Add no new environment variable beyond the two test gates, no CI change, and no configuration default.

### Files and Surfaces
- `justfile`
- `.prettierignore`

### Acceptance Criteria
- AC-18, AC-22: every command is repository-local, offline, retry-free, and non-interactive.
- AC-21: `just verify` runs the new gates in the stated order and still runs every delivered gate.

### Documentation Impact
Feeds T-14: the repeatable command list.

### Test Coverage
- V-19 asserts the documented commands exist; V-20 runs the canonical gate.

### Expected Evidence
- `just verify` transcript showing the three new recipes in position.

---

## Task T-14: Maintain the affected application documentation

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-1 … T-13
- **Acceptance Criteria:** AC-2, AC-8, AC-20
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation and all five amended ADRs
- **Related Core-Components:** CORE-COMPONENT-260815-host-runtime-attribution-evidence, CORE-COMPONENT-260808-development-standards

### Description
Update every documentation surface this change affects, and no others. Each bullet names the required content.

1. `docs/api-restart-reconciliation.md` (**new**): user, runtime, operational, and recovery documentation — what an API restart does and does not do; the three outcomes and the four public states; the attribution conjunction stated as behaviour, including that Ascend recognises only a workbench launched from **this host's configured code-server installation** and only while that workbench's own process group still owns its loopback listener; the **15,000 ms end-to-end bound measured from the replacement API process start**, its 3,000 ms startup headroom, its 11,000 ms internal reconciliation deadline, and its 1,000 ms response allowance; the acquisition, Stop, and Restart admission table; **the adopted-runtime liveness limitation** — an adopted workbench that dies is still reported `Running` until the next Open, Stop, or Restart observes it, because Ascend adds no background monitor in this release, and the exact user action that corrects it; the operator path for an unresolved project; the ephemeral runtime-data and diagnostic-file lifetime; the same-user, same-`TMPDIR`, and same-installation operational constraints; the evidence and cleanup model including the `residualCount` null encoding and the three episode teardown statuses; the repeatable commands; and the explicit BL-020, BL-021, and BL-022 boundaries.
2. `docs/project-runtime.md`: add the reconciling state to the state vocabulary and the projection table, the four events to the event list, `reconcile-unconfirmed` to the typed-failure list (**18 → 19** categories, stated once — the delivered document currently says "The 18 closed categories are …"), the two new Stop and Restart rejection rows and route categories, the changed post-restart Stop answer, the child-stderr change in the launch section, the new bounds with their origin, the adopted-liveness limitation, and the BL-019 validation commands. Replace the sentence at line 37 stating that a fresh API process returns `runtime_not_managed` "until API-restart reconciliation is delivered by BL-019" with the delivered behaviour, and update the deferred-boundaries paragraph so API-restart reconciliation is no longer listed as deferred.
3. `docs/session-switching.md` (**added in revision 2 — revision 1 missed this surface**): replace the sentence in the Stop paragraph stating that after an API restart a persisted project with no manager entry returns `runtime_not_managed` and that "BL-019 owns API-restart reconciliation" with the delivered behaviour, and remove API-restart reconciliation from the out-of-scope list in the boundaries paragraph while leaving close-on-running, auto-sleep, scheduling, quotas, multi-user, and multi-host operation in place.
4. `docs/stable-workbench-routing.md`: acquisition across the reconciliation boundary, the refusal-before-launch rule, and one new row in the complete safe failure table (30 rows).
5. `apps/api/src/routes/README.md`: the two new Stop and Restart categories with their 409 statuses, the reconciliation-related behaviour of `GET /api/projects/runtime`, and a correction to the `runtime_not_managed` versus `already-stopped` paragraph, which currently says a persisted project with no manager entry "including after API restart" returns the former.
6. `docs/README.md`: index the new document.
7. `README.md`: one operational subsection on API-restart recovery, its bound and measurement origin, its limits including the adopted-liveness limitation, and the three commands; and remove API-restart reconciliation from the deferred list at line 194.
8. Privacy and validation documentation, **corrected in revision 5 under `01-action-plan.md` section 13c, because the delivered sentence contradicted the committed evidence.** State the boundary in two tiers and at that granularity:
   - public surfaces — every browser-visible surface, HTTP body, and lifecycle event — carry only the opaque project token, the four public states, and the bounded public categories `reconcile-unconfirmed`, `runtime_reconcile_in_progress`, `runtime_reconcile_unresolved`, and `workbench_reconcile_unconfirmed`, and never a refusal reason;
   - the bounded internal classifications — the eighteen refusal reasons, the three outcomes, the two absence proofs — exist in trusted in-process inspection and in retained validation evidence, **including the committed matrix and the designated episode**, which is exactly what the committed artifact records;
   - raw canonical paths, argument vectors, executable and installation paths, process identifiers, process-start times, ports, loopback authorities, socket inodes, environment values, credentials, terminal or source content, stacks, and raw errors appear in **neither** tier — not on a public surface and not in a committed artifact.

   Replace the sentence at `docs/api-restart-reconciliation.md:9` that says refusal reasons "never enter a browser-visible surface, HTTP body, or committed artifact" with wording that carries this distinction. Do not weaken the raw-value prohibition, and do not name a host path, pid, port, or argv anywhere.
9. **Revision 5 — the two behavioural corrections.** In `docs/api-restart-reconciliation.md`, state as delivered behaviour that a workbench is adopted only while the bounded enumeration of its own process group both completes **and** contains that workbench's leader, so an enumeration that cannot be completed and one that does not contain it are refused identically and before any listener is examined; and that recovery paces its own readiness checks on the same trusted monotonic scheduling used for its deadlines, so every wait is bounded, cancellable, and cannot outlive the recovery window. Name no primitive, no helper, no host path, and no interval value.

10. **Revision 3 — validation documentation.** In the validation section of `docs/api-restart-reconciliation.md`, record how the behaviour is proven: every scenario row is produced by executing the runtime manager, admission, route, and projection paths on injected dependencies and carries an execution witness; every API generation in the designated proof is the repository's compiled API entry with observed process, listener, HTTP, and database evidence; and adversarial negative controls that impersonate a registered project are proven in an isolated subepisode where each is the only candidate for its own registered project, then removed and proven clear before the survivor proof begins — because a process impersonating a live project's markers can only ever make that project ambiguous. Name no host path, pid, port, or argv.

Do not restate an ADR; document delivered behaviour. Record in the implementation notes any documentation category that this change genuinely does not affect (configuration, migration, deployment topology) with the reason: no environment variable, schema, payload, or topology change is introduced.

### Files and Surfaces
- `docs/api-restart-reconciliation.md` (new)
- `docs/project-runtime.md`
- `docs/session-switching.md`
- `docs/stable-workbench-routing.md`
- `docs/README.md`
- `apps/api/src/routes/README.md`
- `README.md`

### Acceptance Criteria
- AC-20: every required topic is present and matches delivered behaviour; the adopted-liveness limitation is stated plainly; the validation structure of revision 3 is recorded; the BL-020 through BL-022 boundaries are stated explicitly.
- AC-8, AC-20 (revision 5): the privacy paragraph states the two-tier boundary and agrees with the committed artifact, which records bounded refusal-reason enum values; the group-membership and trusted-pacing behaviours are documented without naming a primitive, path, or interval.
- AC-8, AC-2: the documented classifications are exactly the delivered vocabularies, and no documented example contains a protected value.

### Documentation Impact
This task is the documentation impact.

### Test Coverage
- V-19 asserts required topics, command names, counts, and the removal of all five superseded BL-019 deferral sentences.

### Expected Evidence
- V-19 report naming each documented topic, each asserted count, and each removed sentence.

---

## Task T-15: Run the canonical gate and prove prior evidence bytes are preserved

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-1 … T-14
- **Acceptance Criteria:** AC-19, AC-21, AC-22
- **Related ADRs:** ADR-260815-api-restart-runtime-reconciliation
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards

### Description
1. Run `just verify-focused` on the BL-019 test set while building, fixing every failure at its cause rather than by relaxing an assertion.
2. Run `just verify` before handoff and fix every failure. All BL-010 through BL-018 gates must remain successful without modification to their evidence.
3. Assert in V-20 that the two prior committed evidence artifacts still hash to `c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3` and `fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880`.
4. Record concrete evidence for every AC ID in `implementation/00-implementation.md`, commit the implementation, and hand off a clean working tree. Do not update the GitHub issue and do not open a pull request.
5. **Revision 5.** Record the three corrections and their evidence in the implementation record: the membership conjunct and its ordering, the trusted readiness pacing with its injected failing-`sleep` control, and the corrected documentation boundary, each with the validation that proves it.

### Files and Surfaces
- `project/work-items/43-bl-019-reconcile-workbench-runtimes-after-api-restart/implementation/00-implementation.md`

### Acceptance Criteria
- AC-21: `just verify` completes successfully with every delivered gate intact.
- AC-19: prior committed evidence is byte-identical.
- AC-22: no step requires network access, a credential, or manual judgement.

### Documentation Impact
None beyond the implementation record.

### Test Coverage
- V-20.

### Expected Evidence
- `just verify` transcript, the two preserved digests, and a per-AC evidence table in the implementation notes.
