# Test Plan: BL-019 Reconcile workbench runtimes after API restart

**Revision 4.** Every validation is repository-local, offline, deterministic, retry-free, and non-interactive. Every scenario declares its bound before its first action and measures elapsed time on a trusted clock. No validation uses a sleep-until-it-passes loop, a network service, a credential, unsupported hardware, a destructive environment action, an indefinite observation, or a manual judgement, which is AC-22 held by construction.

Real host processes are used in exactly two places: `V-3`/`V-4` (`runtime-reconcile-host-conformance.test.ts`) and `V-17` (`runtime-reconcile-designated.test.ts`, with its in-process production witness in `runtime-reconcile-control-witness.ts`), both run by `just proof-runtime-reconcile` after a real build. Everything else runs on injected process, attribution, health, port, and deadline-scheduler dependencies — but "injected dependencies" never means "no execution": every deterministic scenario runs the real manager, admission, route, and projection code against those dependencies.

**What changed from revision 2.** Three repairs, no renumbering, and no change to the scenario catalog, which stays at exactly **66** rows.

1. **Negative-control isolation (`V-4`, `V-17`).** A live process carrying a registered project's canonical-path or owner-token marker is a candidate for that project, and check 1 (exactly one candidate) precedes check 3 (launcher prefix). A byte-perfect foreign-installation control that impersonates a project with a live survivor therefore forces `ambiguous-candidates` and makes its own refusal class unobservable. `V-17` moves `C-1` and `C-3` into an isolated `P0c` subepisode where each is the sole candidate for its own registered control project, settled by the real compiled API and witnessed for its internal class by a second production reconciliation, then torn down and independently proven clear in `P0d` before the survivor episode registers anything. `C-2` carries neither marker, so it remains beside the survivors with an observed proof of non-candidacy. `V-4` registers two fixture projects for the same reason.
2. **Executable scenario evidence (`V-16`).** Every row must be produced by invoking real manager, admission, route, and projection paths and reading the row back from that run, with a per-row `execution` witness. Row construction from catalog constants, expectation mapping, static fixture serialization, and validator-only validation cannot count.
3. **Genuine API generations (`V-17`).** Every generation is the compiled `apps/api/dist/server.js` with OS-observed identity, argv, listener, real HTTP, and a real disposable SQLite file. A `node -e` process, an in-process Fastify or manager instance, a synthesized record, or an assigned identity cannot count.

Counts changed by revision 3: source guards 18 -> **20**, mutation classes 11 -> **12**, `SelectedReconcileSources` 10 -> **13**, episode phases 16 -> **18**, episode rejection reasons 3 -> **15**. Everything else — 66 scenarios, 18 refusal reasons, 3 outcomes, 2 absence proofs, 13 declared bounds, 4 public states, 22 AC IDs — is unchanged.

**What changed from revision 3.** One repair, in `V-15` and `V-16` only. Revision 3's execution witness carried one row-level `primitiveCalls.probeHealth` counter and then constrained it per project, so a mixed row — `S-28`, `S-29`, `S-30`, `S-31`, `S-47`, `S-53`, `S-57` — could be required to record both `0` and `>= 1` in one place, or could hide an illegal readiness probe issued for an early-refused peer behind a legitimate one. `execution` now carries `probeHealthByProject`, an opaque-token-keyed map whose keys are exactly the row's projects, with the total per-project rules fixed in `01-action-plan.md` section 12a; `primitiveCalls.probeHealth` remains only as an aggregate total with no per-project claim. `V-16` records the map for every row, and `V-15` gains `M-12` negative fixtures for a cross-peer swap, a missing project key, an extra project key, a nonzero count on a project refused before readiness, and a zero count on a project that reached readiness. **No count changes:** 20 source guards, 12 mutation classes, 13 sources, 18 phases, 15 episode rejection reasons, 66 scenarios and their bounds and ACs, 20 validations, and 22 AC IDs all stand, and no validation is added, removed, renumbered, or re-scoped.

**What changed from revision 1.** A new `V-4` proves real-host launcher conformance and group-scoped listener ownership with two negative controls; revision 1's `V-4` … `V-19` are renumbered `V-5` … `V-20`. The scenario catalog grows from 57 to **66**: Group F (`S-58` … `S-62`) is new and proves the adopted-runtime liveness limitation and its delivered on-demand corrections, and Group A grows by three rows because the corrected candidacy rule and check ordering made `canonical-path-mismatch`, `owner-token-mismatch`, and `port-mismatch` reachable for the first time. Bounds are restated against the single authoritative origin: every reconciliation row declares **11,000 ms**, no matrix row declares 15,000 ms, and the eight-acquisition absent-boundary row is `S-34` at **71,000 ms** mapped to **AC-9** rather than AC-13. Revision 1's `S-30`/AC-13 contradiction is gone.

---

## Validation index

| ID | Title | Type | File | Task | Gate |
|---|---|---|---|---|---|
| V-1 | Runtime contract vocabularies, projections, and bound arithmetic | unit | `apps/api/test/runtime-reconcile-contract.test.ts` | T-1 | `verify-runtime-reconcile` |
| V-2 | Attribution primitives and every refusal branch | unit | `apps/api/test/runtime-reconcile-attribution.test.ts` | T-2 | `verify-runtime-reconcile` |
| V-3 | Real detached-child survivorship and address-in-use preservation | integration (real host) | `apps/api/test/runtime-reconcile-host-conformance.test.ts` | T-2 | `proof-runtime-reconcile` |
| V-4 | Real-host launcher conformance and group listener ownership, with negative controls | integration (real host) | `apps/api/test/runtime-reconcile-host-conformance.test.ts` | T-2 | `proof-runtime-reconcile` |
| V-5 | Adopted runtime handle equivalence and absence of background observation | unit | `apps/api/test/runtime-reconcile-attribution.test.ts` | T-2 | `verify-runtime-reconcile` |
| V-6 | Manager reconciliation: install, classify, settle | unit | `apps/api/test/runtime-reconcile-manager.test.ts` | T-3 | `verify-runtime-reconcile` |
| V-7 | Bounds, deadline arming, and origin arithmetic | unit | `apps/api/test/runtime-reconcile-manager.test.ts` | T-1, T-3 | `verify-runtime-reconcile` |
| V-8 | Concurrency, independence, and eight-acquisition joins | unit | `apps/api/test/runtime-reconcile-admission.test.ts` | T-3, T-4 | `verify-runtime-reconcile` |
| V-9 | Acquisition across the boundary and proxy publication | unit | `apps/api/test/runtime-reconcile-admission.test.ts` | T-4, T-6 | `verify-runtime-reconcile` |
| V-10 | Stop and Restart admission and route categories | unit | `apps/api/test/runtime-reconcile-route.test.ts` | T-4, T-6 | `verify-runtime-reconcile` |
| V-11 | Shutdown, interruption, and abandoned attempts | unit | `apps/api/test/runtime-reconcile-manager.test.ts` | T-3 | `verify-runtime-reconcile` |
| V-12 | Stale and reordered observation guards | unit | `apps/api/test/runtime-reconcile-manager.test.ts` | T-3 | `verify-runtime-reconcile` |
| V-13 | Application wiring and required startup reconciliation | integration | `apps/api/test/runtime-reconcile-app.test.ts` | T-5, T-8 | `verify-runtime-reconcile` |
| V-14 | Web mirrors of the three closed vocabularies | unit | `apps/web/test/runtime-reconcile-client.test.ts` | T-7 | `verify-runtime-reconcile` |
| V-15 | Evidence contract: source guards, mutation classes, episode statuses | unit | `apps/api/test/runtime-reconcile-evidence.test.ts` | T-9 | `verify-runtime-reconcile` |
| V-16 | The 66-scenario deterministic matrix, executed against production paths | acceptance | `apps/api/test/runtime-reconcile-matrix.test.ts`, `apps/api/test/runtime-reconcile-fixtures.ts` | T-10 | `verify-runtime-reconcile` |
| V-17 | Designated real API-restart episode with an isolated negative-control subepisode | designated proof | `apps/api/test/runtime-reconcile-designated.test.ts`, `apps/api/test/runtime-reconcile-control-witness.ts` | T-11 | `proof-runtime-reconcile` |
| V-18 | Independent residual audit | proof command | `apps/api/src/cli/runtime-reconcile-residual-audit.ts` | T-12 | `proof-runtime-reconcile-residual-audit` |
| V-19 | Application documentation | unit | `apps/api/test/runtime-reconcile-documentation.test.ts` | T-14 | `verify-runtime-reconcile` |
| V-20 | Canonical gate and preserved prior evidence | gate | `just verify` | T-13, T-15 | `verify` |

---

## Test V-1: Runtime contract vocabularies, projections, and bound arithmetic

- **Type:** unit
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-3, AC-8, AC-9, AC-10, AC-14
- **Priority:** High

### Setup
Import `apps/api/src/project-runtime-contract.ts` directly. No process, network, or filesystem dependency.

### Steps
1. Assert the frozen member counts and exact orders: `PUBLIC_RUNTIME_STATES` **4**, `RUNTIME_STATES` **3**, `RUNTIME_ENTRY_STATES` **7**, `RUNTIME_LIFECYCLE_TARGETS` **7**, `RuntimeLifecycleEvent['event']` **13**, `RUNTIME_FAILURE_CATEGORIES` **19**, `RUNTIME_STOP_REJECTION_CATEGORIES` **9**, `RUNTIME_RESTART_REJECTION_CATEGORIES` **9**, `RECONCILE_OUTCOMES` **3**, `RECONCILE_REFUSAL_REASONS` **18** in declaration order, `RECONCILE_ABSENCE_PROOFS` **2**.
2. Assert `RECONCILE_REFUSAL_REASONS` contains no `executable-mismatch` member and does contain `launcher-unresolved`, `launcher-prefix-mismatch`, and `group-scan-incomplete`.
3. Assert `publicRuntimeState('reconciling') === 'Starting'` and `publicRuntimeStateForLifecycleTarget('reconciling') === 'Starting'`, and that both switches are exhaustive over their vocabularies.
4. Assert all thirteen event names have a `PUBLIC_STATE_BY_LIFECYCLE_EVENT` row and that the delivered agreement check throws on a deliberately mismatched pair.
5. Assert `ProjectRuntimeConfig` has **17** members and that `createProjectRuntimeConfig()` rejects each of the six new members at `0`, `-1`, `1.5`, and `Number.MAX_SAFE_INTEGER + 1`.
6. Assert at defaults: `reconciliationOverallBoundMs === 11_000`, `reconciliationEndToEndBoundMs === 15_000`, `reconciliationStartupControlBoundMs === 4_000`, `workbenchAcquisitionBoundMs === 60_000`, `acquisitionAcrossReconciliationBoundMs === 71_000`.
7. Assert the two arithmetic identities as identities over an arbitrary valid config, not only at defaults: `reconciliationEndToEndBoundMs === reconcileStartupHeadroomMs + reconciliationOverallBoundMs + reconcileResponseAllowanceMs`, and `reconciliationOverallBoundMs === reconcileScanAllowanceMs + reconcileAttributionAllowanceMs + reconcileReadinessBoundMs + reconcileSettlementAllowanceMs`.
8. Assert `reconciliationOverallBoundMs < reconciliationEndToEndBoundMs` strictly, and `workbenchAcquisitionBoundMs === runtimeReplacementBoundMs`.
9. Assert `RUNTIME_FAILURE_MESSAGES['reconcile-unconfirmed']` equals the fixed safe text and contains no path, port, pid, command, or host substring.
10. Assert `ReconciliationInspection` and `ReconciliationProjectInspection` expose no pid, port, path, argv, inode, or authority member.

### Expected Result
Every count, order, projection, message, and bound identity holds; every invalid configuration is rejected.

### Expected Evidence
V-1 assertion output naming 4/3/7/7/13/19/9/9/3/18/2/17 and 11,000 / 15,000 / 4,000 / 60,000 / 71,000.

---

## Test V-2: Attribution primitives and every refusal branch

- **Type:** unit
- **Task:** T-2
- **Acceptance Criteria:** AC-10, AC-11, AC-12
- **Priority:** High

### Setup
Inject fake `RuntimeAttributionPrimitives` and exercise `defaultRuntimeAttributionPrimitives` against synthetic `/proc`-shaped fixtures and against this process itself where the read is safe and read-only.

### Steps
1. Assert `RuntimeAttributionPrimitives` has exactly **7** members and `RuntimeProcessDependencies` exactly **6**.
2. `resolveInstalledRuntimeIdentity`: returns the four derived fields for a synthetic installation tree; returns `null` when `realpath` fails; returns `null` when the interpreter is missing; returns `null` when the interpreter exists but is not executable. Assert it never returns a fallback prefix and never returns `[executablePath]`.
3. `listRuntimeCandidatePids`: reports `complete: true` when the enumeration succeeded even though individual entries vanished mid-read; reports `complete: false` when the enumeration itself failed or the signal aborted.
4. `readProcessAttributionIdentity`, `readProcessCommandLine`, `readLoopbackListenerInode`, `readProcessSocketInodes`: each returns `null` rather than throwing for an unreadable, exited, or cancelled target; each parses its delivered format correctly, including a command name containing `)` and a space.
5. `readProcessGroupMemberPids`: returns `complete: false` instead of throwing when the enumeration fails, and the delivered `readProcessGroupMembers` retains its exact delivered signature and behaviour for its existing callers.
6. `resolveGroupListenerOwner`: returns `group-scan-incomplete` for an incomplete enumeration and for an enumeration that omits the leader; `listener-absent` when no loopback LISTEN row exists; `listener-not-owned` for an inode held outside the group, held by a member with a foreign `argv[0]`, held by a member whose `argv[1]` escapes the installation root, held by an unobservable holder, and held by two observed members; `{ owner }` when exactly one conforming member holds it, once with the leader as owner and once with a forked member as owner.
7. Assert no primitive calls `kill`, `listen`, `connect`, `write`, `chmod`, or any privileged facility, by injecting spies over the process and filesystem surfaces.

### Expected Result
Every primitive is total over its failure modes, fabricates nothing, and each of the eighteen refusal branches reachable at the primitive layer is produced by name.

### Expected Evidence
One recorded observation per primitive per branch, plus the spy report showing zero signalling, binding, and writing calls.

---

## Test V-3: Real detached-child survivorship and address-in-use preservation

- **Type:** integration (real host)
- **Task:** T-2
- **Acceptance Criteria:** AC-1
- **Priority:** High

### Setup
`BL019_DESIGNATED=1`. A disposable user-data directory under `os.tmpdir()`. No project fixture is required.

### Steps
1. Spawn a real detached child through the delivered adapter path with the repaired stderr wiring, in an intermediate process that this test owns.
2. Record the child's pid and process-start time; assert it is alive and is its own process-group leader.
3. `SIGKILL` the intermediate parent.
4. Cause the child to write to stderr repeatedly, then assert it is still alive with a byte-identical process-start time. Assert the diagnostic file exists with mode `0o600` inside the user-data directory.
5. Assert the adapter's own copy of the descriptor was closed after `spawn`, by asserting the parent process holds no descriptor to that file.
6. Independently, run the delivered exit path against a synthetic diagnostic file containing an `EADDRINUSE` line beyond and within the first 4,096 bytes, and against an unreadable file, and assert `RuntimeExit.addressInUse` is `true`, `false`, and `false` respectively with no thrown error.

### Expected Result
The detached child survives its parent's abrupt death and repeated stderr writes; the address-in-use contract is preserved exactly.

### Expected Evidence
Pre-kill and post-kill liveness observations with identical start times, the parent's kill signal, the diagnostic file mode, and the three address-in-use classifications.

---

## Test V-4: Real-host launcher conformance and group listener ownership, with negative controls

- **Type:** integration (real host)
- **Task:** T-2
- **Acceptance Criteria:** AC-1, AC-12
- **Priority:** High

This validation is the bridge between the delivered executable and every deterministic fixture in `V-16`. It exists because revision 1's predicate was byte-wrong against the real launcher, and a synthetic-only proof would have hidden that.

### Setup
`BL019_DESIGNATED=1`. **Two** disposable project fixtures registered as two projects — `F-run` for the genuinely spawned workbench and `F-ctl` for the foreign-installation control — a disposable user-data root, and two free loopback ports. Two projects are required by `01-action-plan.md` section 1d: a control that carried `F-run`'s markers would be a second candidate for `F-run` and could only produce `ambiguous-candidates`, hiding the class this validation exists to prove. `resolveInstalledRuntimeIdentity(config.executablePath)` must be non-null; if it is `null` the test fails as an unmet prerequisite rather than skipping.

### Steps
1. **Positive — launcher prefix.** Spawn one real workbench exactly as `createNodeRuntimeProcessAdapter().launch` does. Read `/proc/<pid>/cmdline` and assert it is byte-equal to `identity.launcherArgvPrefix` concatenated with `buildRuntimeArgv(canonicalPath, port, buildRuntimeUserDataPath(ownerToken, port))`. Assert explicitly that `argv[0] !== config.executablePath`, so the revision-1 predicate is recorded as refuted rather than merely replaced.
2. **Positive — candidacy and the full conjunction.** Run the delivered production classification against the live process and assert it reaches `adopted` with every check passing, and that the workbench's forked group member is **not** a candidate for any project, so exactly one candidate exists for `F-run`.
3. **Positive — group listener ownership.** Enumerate the real process group, resolve the loopback listener inode, and assert `resolveGroupListenerOwner` returns an owner that is an exactly observed conforming member of that group. Record whether the owner was the leader or a forked member as an observation; assert neither in advance.
4. **Negative control A — foreign installation root, isolated to its own project.** Build a disposable tree `<tmp>/foreign-root/` containing `bin/code-server` (a byte copy of the delivered launcher script), `lib/node` (a symlink to the real bundled interpreter), and an entry module that binds a declared loopback port and idles. Spawn it through its own `bin/code-server` with an argument vector byte-identical to the one the current build would produce **for `F-ctl`**, so its `/proc/cmdline` reads `[<tmp>/foreign-root/lib/node, <tmp>/foreign-root, ...expected]`. Assert by observation that it is the **only** candidate for `F-ctl` and carries no marker for `F-run`. Then run **one** production reconciliation over both registered projects and assert it settles `F-run` `adopted` and `F-ctl` `unresolved` with `launcher-prefix-mismatch`, that the control is never adopted, and that zero signals were sent to it. Assert it is still alive with an unchanged identity afterwards.
5. **Negative control B — listener outside the group.** Start a real process, in its own process group, that binds a fresh loopback port. Assert `resolveGroupListenerOwner({ groupLeaderPid: <real workbench leader>, port: <control port>, ... })` returns `listener-not-owned`. Assert the control is never adopted and never signalled.
6. **Attribution ceiling, stated.** Record explicitly that step 5 is a helper-level negative control rather than a whole-predicate one, because a candidate that satisfies checks 3 through 8 always binds its own declared port on a real host, so a whole-predicate `listener-not-owned` is only expressible with injected primitives (`S-19`, `S-20`). This is the honest boundary of the real-host proof and is recorded in the evidence rather than implied. Record equally explicitly that the control in step 5 carries **neither** project marker, which is why it may be alive during step 4's pass without making either project ambiguous.
7. Terminate every process this test started through the delivered sequencer and remove every disposable path.

### Expected Result
The real launcher prefix matches the derived prefix byte for byte; the real listener owner is an exactly observed conforming group member; one production pass adopts `F-run` and refuses `F-ctl` by name; both negative controls survive unadopted and unsignalled.

### Expected Evidence
`launcherConformance.prefixMatched`, the observed `listenerOwner` value, the observed candidate count per registered project (exactly one each), the refused reasons for both controls, the step-5 control's null marker set, their post-test liveness, zero signals, and the recorded attribution-ceiling statement.

---

## Test V-5: Adopted runtime handle equivalence and absence of background observation

- **Type:** unit
- **Task:** T-2
- **Acceptance Criteria:** AC-4, AC-11
- **Priority:** High

### Setup
Injected attribution and process primitives; no real process.

### Steps
1. Assert `adoptOwnedRuntimeProcess` returns a value satisfying the delivered `OwnedRuntimeProcess` interface with no extra member.
2. Assert `terminate` delegates to `terminateOwnedRuntimeGroup` with the delivered bounds and removes the user-data directory in a `finally` on both the success and the failure path.
3. Assert `audit` uses the delivered bounded `auditRuntimeResource` with `config.stopAuditAllowanceMs`.
4. Assert `isAlive` compares a fresh process-start read to the recorded one, returning `false` for an absent pid and for a recycled pid with a different start time.
5. Assert `exit` settles exactly once with `{ code: null, signal: null, addressInUse: false }` after `terminate`, and exactly once after `isAlive` observes absence, and that it does not settle while the identity remains alive.
6. Assert construction registers **no** timer, interval, watcher, subscription, or polling loop, by injecting spies over the timer and event surfaces and asserting zero calls.
7. Assert the manager never adds an adopted handle's `exit` promise to `backgroundTasks`, by asserting the drained set size after an adoption is unchanged.

### Expected Result
An adopted handle is interchangeable at the delivered interface and adds no background observation of any kind.

### Expected Evidence
Interface conformance report, the two `exit` settlement traces, and the zero-count timer and background-task spy reports.

---

## Test V-6: Manager reconciliation — install, classify, settle

- **Type:** unit
- **Task:** T-3
- **Acceptance Criteria:** AC-1, AC-3, AC-8, AC-9, AC-10, AC-11, AC-12, AC-16
- **Priority:** High

### Setup
Construct the manager with injected `listProjects`, attribution, process, health, port, and deadline-scheduler dependencies.

### Steps
1. Assert `beginReconciliation()` awaits `listProjects()` exactly once, memoizes one promise across repeated calls, and rejects with `RuntimeFailure('manager-shutdown')` while shutting down.
2. Assert installation is synchronous after that single list: every registered project holds a `reconciling` entry and has emitted exactly one `runtime.reconcile.requested` before the returned promise resolves, and settlement is never awaited by it.
3. Assert the whole-pass identity gate: when `resolveInstalledRuntimeIdentity` returns `null`, every project settles `unresolved` / `launcher-unresolved`, and `listRuntimeCandidatePids` was never called.
4. Assert each classification branch settles exactly as fixed: zero candidates with a complete scan is `absent` / `no-candidate-complete-scan`; zero candidates with an incomplete scan is `unresolved` / `scan-incomplete`; two candidates is `unresolved` / `ambiguous-candidates`; one candidate walks checks 2 through 13 in evaluation order and stops at the first failure.
5. Assert the corrected check ordering directly: a candidate whose final element names another project yields `canonical-path-mismatch`, one whose owner token names another project yields `owner-token-mismatch`, one whose two ports disagree yields `port-mismatch`, and only a candidate that passes all three but differs elsewhere in the vector yields `argv-mismatch`.
6. Assert a pid carrying neither candidacy marker is not counted in `candidateCount`, is never refused, and never appears in evidence.
7. Assert adoption installs one ownership record under a fresh generation, freezes the snapshot fields fixed in the plan, emits `runtime.reconcile.succeeded`, and **does not** add a background exit task.
8. Assert a mid-window candidate disappearance runs the delivered audit and settles `absent` only on a complete absent triple, and `unresolved` / `absence-unconfirmed` otherwise.
9. Assert `inspectReconciliation()` returns the bounded record with opaque project tokens and no pid, port, path, argv, inode, or authority value, in every phase including `aborted`.
10. Assert reconciliation emits no `runtime.start.*`, `runtime.stop.*`, `runtime.restart.*`, or `runtime.health.changed` event on any path.

### Expected Result
Every branch settles into exactly one of the three outcomes with its named reason or proof, and no branch signals, launches, or fabricates an event.

### Expected Evidence
Per-branch settlement records, the emitted event sequences, and the inspection records.

---

## Test V-7: Bounds, deadline arming, and origin arithmetic

- **Type:** unit
- **Task:** T-1, T-3
- **Acceptance Criteria:** AC-1, AC-6, AC-9, AC-10, AC-18
- **Priority:** High

### Setup
Injected `RuntimeDeadlineScheduler` with a controllable monotonic clock.

### Steps
1. Assert exactly one deadline is armed per `beginReconciliation()`, with `reconciliationOverallBoundMs(config)` (**11,000** at defaults), at the installation instant, and that it is cancelled on every exit path including success, abort, and shutdown.
2. Assert `processDependencies.sleep` is never called on any reconciliation path and that `deadlineScheduler.now()` is the only time source.
3. Advance the clock to the deadline with one project still observing and assert it settles `unresolved` / `deadline-exceeded` while a project settled earlier keeps its outcome.
4. Assert a project that settles at exactly the bound is `within-bound` and one that would settle after it is preempted by the deadline rather than recorded late.
5. Assert the zero-project pass arms no deadline, performs no `/proc` read, resolves no identity, and records `scanCompleted: null` and `candidateCount: 0`.
6. Assert the declared-bound registry `BL019_DECLARED_BOUNDS` has exactly **13** entries with the exact values fixed in the action plan, and that the internal bound is strictly less than the end-to-end bound.

### Expected Result
One trusted, bounded deadline per pass, no untrusted timing source, and an internal bound that leaves measured startup headroom inside the issue ceiling.

### Expected Evidence
Deadline arming and cancellation traces, the sleep-call spy at zero, and the 13-entry bound registry.

---

## Test V-8: Concurrency, independence, and eight-acquisition joins

- **Type:** unit
- **Task:** T-3, T-4
- **Acceptance Criteria:** AC-13, AC-15, AC-16
- **Priority:** High

### Setup
Injected dependencies with controllable settlement timing; two registered projects.

### Steps
1. Issue eight concurrent `start` calls for one project held across the boundary against a healthy survivor and assert: all eight join one settlement, all eight receive the same adopted snapshot and port, `launches === 0`, `signalsSent === 0`, and each settles within `workbenchAcquisitionBoundMs`.
2. Repeat against an unresolved survivor and assert all eight throw the identical `reconcile-unconfirmed` failure with `launches === 0` within the same ceiling.
3. Repeat across an absent boundary and assert exactly **one** launch across the group within `acquisitionAcrossReconciliationBoundMs` (**71,000**), with the other seven reusing that generation.
4. Assert peer projects settle independently with disjoint entries, events, ownership records, and cleanup while the first project is still pending.
5. Assert a late observation from an earlier attempt cannot mutate a later generation, for scan, identity, group, listener, readiness, audit, and exit observations.

### Expected Result
Concurrency collapses to exactly one delivered outcome per project with no duplicate generation, and peers are unaffected.

### Expected Evidence
Per-call settlement records with acquisition counts, launch counts, and elapsed values against the declared ceilings.

---

## Test V-9: Acquisition across the boundary and proxy publication

- **Type:** unit
- **Task:** T-4, T-6
- **Acceptance Criteria:** AC-2, AC-9, AC-10, AC-13
- **Priority:** High

### Setup
Injected manager dependencies plus the delivered proxy contract module.

### Steps
1. Assert `start` on a `reconciling` entry awaits that project's settlement, honours the caller's abort signal exactly as the delivered waiter does, and then follows the delivered path for the settled state.
2. Assert `start` on an unresolved project throws `RuntimeFailure('reconcile-unconfirmed')` **before** `register`, port acquisition, or `launch`, proven by spies on all three.
3. Assert `start` on a settled `registered { released: true }` entry follows the delivered launch path unchanged and launches exactly once.
4. Assert `WORKBENCH_FAILURE_TABLE` has **30** rows with an **18**-row `runtime:` subsequence, that the new row is `runtime:reconcile-unconfirmed` → 503 `workbench_reconcile_unconfirmed` with the fixed message, and that no other row changed.
5. Assert opening an unresolved project through the stable route returns 503 with that code and body, and that the response contains no path, port, pid, authority, or refusal reason.
6. Assert the stable route for an adopted runtime resolves to that runtime's own port and that the route string is unchanged from before the restart.

### Expected Result
Acquisition never launches over an unattributable survivor, and the published failure is bounded, safe, and exhaustive by construction.

### Expected Evidence
Spy reports for `register`, port acquisition, and `launch`; the 30/18 row assertions; the 503 response capture with a zero-match privacy scan.

---

## Test V-10: Stop and Restart admission and route categories

- **Type:** unit
- **Task:** T-4, T-6
- **Acceptance Criteria:** AC-4, AC-5, AC-14, AC-16
- **Priority:** High

### Setup
The delivered Stop and Restart route plugins over an injected manager.

### Steps
1. Assert `stop` and `restart` on a `reconciling` project return `rejected` / `reconcile-in-progress`, change no entry, call no process primitive, and emit no lifecycle event.
2. Assert `stop` and `restart` on an unresolved project return `rejected` / `reconcile-unresolved`, and that this check precedes the delivered entry-state switch and eligibility switch respectively — proven by asserting it takes precedence over `failure-retained` and that the delivered failed-entry replacement path is never entered.
3. Assert both routes answer **409** with `runtime_reconcile_in_progress` and `runtime_reconcile_unresolved`, that both category lists have exactly **12** members, and that neither body discloses runtime state, identity, port, path, authority, or a server message.
4. Assert public state is unchanged across a rejected Stop and a rejected Restart, and that the project's peer remains independently operable throughout.
5. Assert Stop and Restart on an adopted `running` entry follow the delivered contracts unchanged, including the delivered `already-absent` audit answer and the delivered release-before-replacement gate.

### Expected Result
Both controls refuse before acceptance with a bounded, safe category and never produce duplicate ownership or terminate a generation.

### Expected Evidence
Route response captures per category, the 12/12 counts, and the unchanged public-state and event captures.

---

## Test V-11: Shutdown, interruption, and abandoned attempts

- **Type:** unit
- **Task:** T-3
- **Acceptance Criteria:** AC-17
- **Priority:** High

### Steps
1. Assert `shutdown()` aborts the reconciliation controller **before** its delivered sweep and awaits nothing the reconciliation still has pending.
2. Assert an interrupted project claims no absence, emits its `requested` event and **no** terminal event, and records `manager-shutdown` in inspection only.
3. Assert no unadopted candidate is signalled during shutdown and that an already-adopted runtime is terminated exactly as an owned runtime is.
4. Assert `inspectReconciliation()` after shutdown reports `phase: 'aborted'` with the outcomes settled so far.
5. Assert a subsequent manager instance over the same host state reconciles cleanly and is unaffected by the abandoned attempt.
6. Assert the shutdown drain completes without an adopted handle's `exit` promise being awaited.

### Expected Result
An interrupted reconciliation ceases inside the bound, claims nothing, signals nothing, and leaves correctly owned survivors intact.

### Expected Evidence
Abort ordering trace, signal count at zero, the aborted inspection record, and the clean subsequent settlement.

---

## Test V-12: Stale and reordered observation guards

- **Type:** unit
- **Task:** T-3
- **Acceptance Criteria:** AC-15
- **Priority:** High

### Steps
1. For each of scan, identity, group, listener, readiness, audit, and exit observations, deliver the result **after** the project settled and assert it records nothing, emits nothing, and mutates nothing.
2. Deliver each result after the deadline fired and assert the same.
3. Assert every settlement path compare-and-sets on the exact `reconciling` entry object **and** its generation symbol, by installing a different entry first and asserting the settlement is dropped.
4. Assert a late absence observation is never converted into an `absent` outcome.
5. Assert a late readiness success is never converted into a `Running` state.

### Expected Result
No delayed or reordered observation can overwrite, terminate, route to, emit a terminal outcome for, or change the state of the currently attributed generation.

### Expected Evidence
Per-observation drop records with the entry and generation identities that caused the drop.

---

## Test V-13: Application wiring and required startup reconciliation

- **Type:** integration
- **Task:** T-5, T-8
- **Acceptance Criteria:** AC-1, AC-3, AC-9, AC-17, AC-21
- **Priority:** High

### Setup
Build the real Fastify application with a disposable SQLite database and injected runtime dependencies.

### Steps
1. Assert `beginReconciliation` is declared on `ProjectRuntimeManager` **without** `?`, by a type-level assertion that a manager object lacking it fails to typecheck.
2. Assert `app.ts` calls `await runtimeManager.beginReconciliation()` with no optional chaining, no `typeof` guard, no `in` test, and no surrounding try/catch, by asserting the source text through the `reconcile-startup-required` guard.
3. Assert the call happens after manager, proxy, close-service, and registration construction and **before** any route plugin registration, by ordering spies.
4. Assert no request is served before installation completes: the first `GET /api/projects/runtime` after `ready()` never reports a project as `Stopped` that has a live attributable survivor.
5. Assert zero-project startup completes normally, creates nothing, and signals nothing.
6. Assert a `listProjects()` rejection at startup produces `ProjectLibraryInitializationError` with the delivered `project_library_initialization_failed` category, shuts down proxy, manager, registration, and library in the delivered order, and serves no request.
7. Assert the `onClose` order is unchanged and that manager close aborts an in-flight reconciliation.
8. Assert all **16** migrated typed test doubles typecheck and that the two structurally unchecked casts are unmodified.

### Expected Result
Startup reconciliation cannot be skipped, degraded, or silently absent, and a startup failure surfaces through the delivered error path.

### Expected Evidence
Registration-order spy trace, the source-guard result, the startup-failure event capture, the first-response projection, and the `pnpm typecheck` transcript.

---

## Test V-14: Web mirrors of the three closed vocabularies

- **Type:** unit
- **Task:** T-7
- **Acceptance Criteria:** AC-3, AC-10, AC-14
- **Priority:** Medium

### Steps
1. Assert `apps/web/src/runtime-state.ts` `RUNTIME_FAILURE_CATEGORIES` has **19** members, includes `reconcile-unconfirmed`, and has a notice for every member.
2. Assert `apps/web/src/runtime-stop.ts` and `apps/web/src/runtime-restart.ts` each have **12** categories, **12** notices, and **12** status entries, with both new categories mapped to **409**.
3. Assert every notice string is client-owned, matches the fixed text, and that no server-provided message, path, identity, port, or authority can reach a rendered surface.
4. Assert a `Starting` row still renders no Restart control and renders Stop exactly as delivered, and that pressing Stop on a reconciling row surfaces the client-owned pre-acceptance notice.
5. Assert no component, hook, admission rule, focus behaviour, refresh cardinality, or transport bound changed.

### Expected Result
The three closed vocabularies mirror the server exactly with client-owned text only.

### Expected Evidence
V-14 assertions naming 19, 12, and 12 with notice-text equality and the unchanged-behaviour assertions.

---

## Test V-15: Evidence contract — source guards, mutation classes, episode statuses

- **Type:** unit
- **Task:** T-9
- **Acceptance Criteria:** AC-8, AC-18, AC-19, AC-22
- **Priority:** High

### Steps
1. Assert `BL019_SCENARIOS` has exactly **66** identifiers in catalog order with no duplicate, and that `BL019_SCENARIO_ACS` maps every one to at least one AC.
2. Run `validateSelectedReconcileSource` over the **13** declared sources and assert all **20** guard codes pass against the delivered source, and that each fails against a targeted negative fixture — 20 positive and 20 negative controls. The five revision-2 guards are exercised explicitly: an `argv[0] === config.executablePath` comparison fails `reconcile-launcher-prefix-derived`; resolving the listener against the leader's own descriptors alone fails `reconcile-listener-group-scoped`; an optional `beginReconciliation?` declaration or a `beginReconciliation?.()` call fails `reconcile-startup-required`; adding an adopted `exit` promise to `backgroundTasks` fails `reconcile-no-adopted-exit-task`; and redefining the end-to-end bound as anything other than the declared sum fails `reconcile-bound-origin-arithmetic`. The two revision-3 guards are exercised explicitly: a fixture module that types an outcome, refusal reason, public state, reconciliation event name, `reconcile-unconfirmed`, or `adoptedLiveness` literal, that omits `createProjectRuntimeManager(`, `inspectReconciliation(`, or `reportPublicStates(`, or that reads the committed artifact fails `reconcile-matrix-observed-rows`; a designated source that contains `createProjectRuntimeManager`, `buildApp(`, `createApp(`, or an import from `../src/app.js`, or that never references `API_COMPILED_ENTRY`, fails `reconcile-designated-real-api`.
3. Run `validateRuntimeReconcileMatrix` against a valid fixture and assert it passes, then against one mutated fixture per class **M-1** … **M-12** and assert each is rejected with its class name. M-12 is exercised with a missing `execution` record, with `managerInstances: 0`, with a duplicated `runId`, with an `eventSinkWrites` that disagrees with `events.length`, with an `observedFrom` that omits `primitive-ledger` on a row with projects, and with these five project-keyed readiness fixtures over a mixed two-project row modelled on `S-57`: a **cross-peer swap** of the adopted project's count with its early-refused peer's; a **missing project key**; an **extra project key** naming a token absent from `projects`; a **nonzero count on a project refused before readiness** (`listener-absent`); and a **zero count on a project that reached readiness** (`adopted`, and again for `readiness-unconfirmed`). Each must be rejected as `M-12`, and the valid fixture — adopted `>= 1`, early-refused peer exactly `0` — must pass. M-10 is exercised with a `boundMs` outside the registry, with a row declaring 15,000 ms, and with a row declaring a registered bound other than its catalog's; M-11 with an adopted kill recorded as an automatic transition, with an `adoptedLiveness` value inconsistent with `declaredKills`/`declaredActions`, and with a corrective `runtime.health.changed` recorded as a reconciliation event.
4. Assert the total aggregate rules reject a hand-assigned `outcome`, `publicStates`, `listeners`, `absenceProven`, or `residualCount` that disagrees with `projects`, and that `residualCount` accepts only `0` when `absenceProven` is true and only `null` otherwise.
5. Assert the row schema has **no** `teardownResidualCount` member and that adding one is rejected as a schema violation.
6. Assert the privacy scanner derives its match arrays from the actual bytes of every declared source and rejects an artifact that omits a source or assigns a zero match count.
7. Run `validateReconcileEpisode` against a `teardown: null` artifact, a `'proven-clear'` artifact, an `'unproven'` artifact with an incomplete probe, and a `'residual-present'` artifact, and assert only the second is a success. Assert a zero residual accompanied by `probeCompleted: false` is rejected.
8. **Revision 3 — the twelve new episode rejections, each with its own negative fixture.** Generation authenticity: `generation-not-compiled-api` (an `argv[1]` that is not `apps/api/dist/server.js`), `generation-eval-spawn` (an argv containing `-e`, `--eval`, `-p`, `--print`, or `--input-type`), `generation-listener-unobserved` (`listenerOwnerPid !== pid`, or a missing inode), `generation-http-absent` (`httpRequests.succeeded: 0`), `generation-database-unobserved` (a missing path, `bytes: 0`, or a null `projectRowsObserved`). Control isolation: `control-subepisode-missing`, `control-not-sole-candidate` (`candidateCountForItsProject: 2`), `control-settlement-mismatch` (a `Running` settlement, or an observed refusal reason other than the declared one), `control-signalled` (`signalsSent: 1`), `control-not-cleared-before-main-episode` (an incomplete clearance probe, or `clearedBeforePhase: 'P7'`), `main-episode-control-candidate-bearing` (a coexisting control with a non-null `pathMarker` or `tokenMarker`). Structure: `phase-order-mismatch` (a sixteen-entry `phaseOrder`). Assert each fixture is rejected by its own reason and that the valid artifact still passes.
9. Assert `BL019_PRESERVED_EVIDENCE` names the two prior artifacts with their required digests.

### Expected Result
Every guard, mutation class, aggregate rule, and episode status is enforced mechanically.

### Expected Evidence
A report listing 20 guards passing with 20 negative controls, 12 mutation classes rejected, 4 episode artifacts classified, all **15** episode rejection reasons exercised (the 3 revision-2 status rejections in step 7 and the 12 revision-3 rejections in step 8), and the privacy-scanner derivation proof.

---

## Test V-16: The 66-scenario deterministic matrix

- **Type:** acceptance
- **Task:** T-10
- **Acceptance Criteria:** AC-1 … AC-19, AC-22
- **Priority:** High

### Setup
Injected attribution, process, health, port, and deadline-scheduler dependencies with a synthetic installed-runtime identity whose shape is proven equal to the real one by V-4. Every scenario runs independently on a fresh manager with a fresh monotonic clock, declares its bound before its first action, and uses no retry, sleep loop, real network call, or manual step.

### What counts as executing a row (revision 3)
A row exists only as the record of a run. Each scenario constructs a real `ProjectRuntimeManager` through `createProjectRuntimeManager`, calls the real `beginReconciliation()`, and — where the row declares one — drives the real acquisition, Stop, Restart, and route handlers and the real `reportPublicStates`. Every observed member is read back from that run: `outcome`, `refusalReason`, `absenceProof`, and per-project settlement timing from `inspectReconciliation()`; `publicState` and `postActionPublicState` from `reportPublicStates`; `events` and `eventCount` from the recorded event sink; `launches`, `signalsSent`, `signalsDelivered`, `acquisitions`, and listener attribution from the injected primitives' call ledger; `elapsedMs` from the injected clock; `adoptedLiveness` from `deriveAdoptedLiveness` over the observed row.

Each row carries an `execution` witness — `runId`, `managerInstances`, `primitiveCalls`, `probeHealthByProject`, `projectionCalls`, `eventSinkWrites`, `observedFrom` — under the total rules in `01-action-plan.md` section 12a. Readiness observation is recorded **per project**, never in one row-level counter: `probeHealthByProject`'s keys equal that row's `projects[*].projectToken` exactly (`{}` on `S-01`), each count is attributed from the injected primitive call ledger by observed call authority and observed manager instance, and each is checked against that project's own recorded class — exactly `0` for a project refused at checks 0 … 11 or settled `absent` with `no-candidate-complete-scan`; `>= 1` for `adopted`, `readiness-unconfirmed`, or `identity-unstable`; unconstrained by class for `candidate-audit-triple-absent`, `absence-unconfirmed`, `deadline-exceeded`, `manager-shutdown`, and a project still `unsettled`. `primitiveCalls.probeHealth` is the aggregate total of every health-adapter call the ledger observed, is at least the map's sum, and equals it on a single-pass row with no declared action.

Every mixed row therefore has a legal shape rather than a contradiction: `S-28` records `>= 1` for its adopted project and an observed unconstrained count for its `deadline-exceeded` peer; `S-29` records `>= 1` for adopted, exactly `0` for its `no-candidate-complete-scan` project, its unresolved project's own class rule, and an unconstrained count for its pending project; `S-30`, `S-31`, and `S-47` follow each project's own class; `S-53` records an unconstrained count per project under `manager-shutdown`; `S-57` records `>= 1` for its adopted project and its unresolved peer's exact class rule. `S-27`, `S-55`, and `S-56` construct more than one manager, so their maps count only the witnessed pass and their aggregate `probeHealth` may exceed the map's sum.

**None of these counts as V-16 evidence:** a row built from the catalog constants, an expected value mapped into a row, a serialized static fixture, a re-read of the committed artifact, or a validator run over an artifact this execution did not produce. Expected values live in `runtime-reconcile-matrix.test.ts` and are compared against observed rows; the `reconcile-matrix-observed-rows` guard keeps them out of `runtime-reconcile-fixtures.ts`.

### Steps
Execute every row below exactly once, in catalog order, recording the full `RuntimeReconcileEvidenceRow` including its `execution` witness. Assert each observed row equals the catalog's expected values for that scenario. Then emit `test-results/bl-019/runtime-reconcile-matrix.json`, assert byte-identity with the committed artifact, and run `validateRuntimeReconcileMatrix` and `validateSelectedReconcileSource` over the result.

#### Group A — settlement outcomes and refusal classes (S-01 … S-28)

| ID | Scenario | Projects | Outcome | Reason or proof | Bound (ms) | ACs |
|---|---|---:|---|---|---:|---|
| S-01 | Zero registered projects settle with no host observation | 0 | not-applicable | — | 1,000 | AC-9, AC-18 |
| S-02 | Complete scan finds no candidate for the project | 1 | absent | `no-candidate-complete-scan` | 11,000 | AC-3, AC-9 |
| S-03 | Full conjunction passes; listener owned by a forked group member | 1 | adopted | `listenerOwner: group-member` | 11,000 | AC-1, AC-3 |
| S-04 | Two projects adopt with disjoint identities and listeners | 2 | adopted | — | 11,000 | AC-1, AC-16 |
| S-05 | Full conjunction passes; listener owned by the group leader | 1 | adopted | `listenerOwner: group-leader` | 11,000 | AC-1 |
| S-06 | Settlement still pending at the observation instant | 1 | unsettled | — | 11,000 | AC-3 |
| S-07 | Two candidates present for one project | 1 | unresolved | `ambiguous-candidates` | 11,000 | AC-10 |
| S-08 | Installed-runtime identity cannot be resolved | 2 | unresolved | `launcher-unresolved` (whole pass) | 11,000 | AC-10, AC-12 |
| S-09 | Candidate launched from a foreign installation root | 1 | unresolved | `launcher-prefix-mismatch` | 11,000 | AC-10, AC-12 |
| S-10 | Candidate whose `argv[0]` is the configured executable path itself | 1 | unresolved | `launcher-prefix-mismatch` | 11,000 | AC-10, AC-12 |
| S-11 | Final argument names a different registered project | 1 | unresolved | `canonical-path-mismatch` | 11,000 | AC-10, AC-12 |
| S-12 | User-data owner token names a different registered project | 1 | unresolved | `owner-token-mismatch` | 11,000 | AC-10, AC-12 |
| S-13 | Bind-address port and user-data port disagree | 1 | unresolved | `port-mismatch` | 11,000 | AC-10, AC-12 |
| S-14 | An argument flag is altered while all specific checks pass | 1 | unresolved | `argv-mismatch` | 11,000 | AC-10, AC-12 |
| S-15 | Candidate is owned by a different uid | 1 | unresolved | `uid-mismatch` | 11,000 | AC-10, AC-12 |
| S-16 | Candidate is not its own process-group leader | 1 | unresolved | `not-group-leader` | 11,000 | AC-10, AC-12 |
| S-17 | Process-group enumeration does not complete | 1 | unresolved | `group-scan-incomplete` | 11,000 | AC-10, AC-12 |
| S-18 | No loopback listener exists on the declared port | 1 | unresolved | `listener-absent` | 11,000 | AC-10, AC-12 |
| S-19 | Listener inode held by a process outside the group | 1 | unresolved | `listener-not-owned` | 11,000 | AC-10, AC-12 |
| S-20 | Listener inode held by a non-conforming group member | 1 | unresolved | `listener-not-owned` | 11,000 | AC-3, AC-10, AC-12 |
| S-21 | Readiness never confirmed inside the readiness bound | 1 | unresolved | `readiness-unconfirmed` | 11,000 | AC-10, AC-12 |
| S-22 | Identity changes between the first and second read | 1 | unresolved | `identity-unstable` | 11,000 | AC-3, AC-10, AC-12 |
| S-23 | Candidate exits mid-window; audit triple confirms absence | 1 | absent | `candidate-audit-triple-absent` | 11,000 | AC-10, AC-11 |
| S-24 | Candidate exits mid-window; audit triple incomplete | 1 | unresolved | `absence-unconfirmed` | 11,000 | AC-10, AC-11 |
| S-25 | Discovery enumeration incomplete with no candidate found | 1 | unresolved | `scan-incomplete` | 11,000 | AC-10, AC-11 |
| S-26 | Candidate loses its listener and then exits; triple confirms absence | 1 | absent | `candidate-audit-triple-absent` | 11,000 | AC-3, AC-10, AC-11 |
| S-27 | Three sequential manager instances over one survivor | 1 | adopted | identity unchanged each pass | 11,000 | AC-3, AC-6 |
| S-28 | Deadline fires with one project still observing | 2 | mixed | one adopted, one `deadline-exceeded` | 11,000 | AC-1, AC-10 |

#### Group B — public projection, events, and privacy (S-29 … S-32)

| ID | Scenario | Projects | Outcome | Assertion | Bound (ms) | ACs |
|---|---|---:|---|---|---:|---|
| S-29 | Pending, adopted, absent, and unresolved projects in one projection | 4 | mixed | all four public states present, no fifth value | 11,000 | AC-3, AC-8 |
| S-30 | Reconciliation emits exactly the catalogued events and nothing else | 2 | mixed | zero start, stop, restart, and health events | 11,000 | AC-8 |
| S-31 | Privacy scan over every declared source for a mixed reconciliation | 3 | mixed | `matches: 0` for every protected class | 11,000 | AC-8 |
| S-32 | Stable route resolves to the adopted runtime's own port | 1 | adopted | route string unchanged, no authority disclosed | 11,000 | AC-2, AC-8 |

#### Group C — acquisition across the boundary (S-33 … S-38)

| ID | Scenario | Projects | Outcome | Acquisitions / launches | Bound (ms) | ACs |
|---|---|---:|---|---|---:|---|
| S-33 | Eight concurrent acquisitions across a healthy boundary | 1 | adopted | 8 / 0 | 60,000 | AC-13 |
| S-34 | Eight concurrent acquisitions across an absent boundary | 1 | absent | 8 / 1 | 71,000 | AC-9 |
| S-35 | Eight concurrent acquisitions across an unresolved boundary | 1 | unresolved | 8 / 0 | 60,000 | AC-10, AC-13 |
| S-36 | One acquisition issued while pending joins the settlement and reuses the runtime | 1 | adopted | 1 / 0 | 60,000 | AC-2 |
| S-37 | Acquisition on an unresolved project refuses before register and launch | 1 | unresolved | 1 / 0 | 60,000 | AC-2, AC-10 |
| S-38 | A later normal acquisition after an absent settlement launches once | 1 | absent | 1 / 1 | 60,000 | AC-9 |

#### Group D — lifecycle control admission (S-39 … S-47)

| ID | Scenario | Projects | Outcome | Control result | Bound (ms) | ACs |
|---|---|---:|---|---|---:|---|
| S-39 | Stop requested while reconciliation is pending | 1 | unsettled | `rejected` / `reconcile-in-progress`, 409 | 5,000 | AC-14 |
| S-40 | Restart requested while reconciliation is pending | 1 | unsettled | `rejected` / `reconcile-in-progress`, 409 | 66,000 | AC-14 |
| S-41 | Stop requested on an unresolved project | 1 | unresolved | `rejected` / `reconcile-unresolved`, 409 | 5,000 | AC-10, AC-14 |
| S-42 | Restart requested on an unresolved project | 1 | unresolved | `rejected` / `reconcile-unresolved`, 409 | 66,000 | AC-10, AC-14 |
| S-43 | Stop on an adopted runtime releases exactly its identity, group, and listener | 1 | adopted | `stopped`, still registered | 5,000 | AC-4 |
| S-44 | Restart on an adopted runtime confirms absence then readies one replacement | 1 | adopted | one new generation, route unchanged | 66,000 | AC-5 |
| S-45 | Stop on one adopted project leaves its adopted peer untouched | 2 | adopted | peer identity and route unchanged | 5,000 | AC-4, AC-16 |
| S-46 | A rejected Stop emits no lifecycle event and leaves public state unchanged | 1 | unsettled | zero events, `Starting` retained | 5,000 | AC-14 |
| S-47 | Concurrent Stop on a pending project and Restart on its adopted peer | 2 | mixed | rejection and delivered restart, disjoint | 66,000 | AC-14, AC-16 |

#### Group E — late work, interruption, and sequencing (S-48 … S-57)

| ID | Scenario | Projects | Outcome | Assertion | Bound (ms) | ACs |
|---|---|---:|---|---|---:|---|
| S-48 | One full healthy two-project reconciliation, measured internally | 2 | adopted | both `Running`, identities unchanged | 11,000 | AC-1, AC-18 |
| S-49 | A late scan result arriving after settlement | 1 | adopted | recorded as dropped, no mutation | 11,000 | AC-15 |
| S-50 | A late readiness result arriving after settlement | 1 | unresolved | recorded as dropped, no `Running` | 11,000 | AC-15 |
| S-51 | A late audit result arriving after the deadline | 1 | unresolved | recorded as dropped, no `absent` | 11,000 | AC-15 |
| S-52 | A late exit observation from an earlier generation | 1 | adopted | current generation unchanged | 11,000 | AC-15 |
| S-53 | Manager shutdown during observation | 2 | unsettled | `manager-shutdown` in inspection, no terminal event | 11,000 | AC-17 |
| S-54 | Shutdown leaves a correctly owned unadopted survivor untouched | 1 | unsettled | zero signals, survivor alive | 11,000 | AC-17 |
| S-55 | A later manager reconciles cleanly after an abandoned attempt | 1 | adopted | unaffected by the abandoned pass | 11,000 | AC-17 |
| S-56 | Three sequential reconciliations over two survivors | 2 | adopted | `listeners.accumulated: 0`, identities unchanged | 11,000 | AC-6 |
| S-57 | Mixed peer outcomes with disjoint cleanup | 2 | mixed | one adopted, one unresolved | 11,000 | AC-16 |

#### Group F — adopted-runtime liveness, the recorded limitation (S-58 … S-62) — new in revision 2

| ID | Scenario | Projects | `adoptedLiveness` | `declaredKills` / `declaredActions` | Bound (ms) | ACs |
|---|---|---:|---|---|---:|---|
| S-58 | An adopted runtime dies and is still reported `Running` until an on-demand observation | 1 | `died-observed-stale` | `[A]` / `[]` | 11,000 | AC-3, AC-8 |
| S-59 | Acquisition on a dead adopted runtime corrects it to `Failed` with one health event | 1 | `died-corrected` | `[A]` / `['acquire']` | 60,000 | AC-3, AC-8 |
| S-60 | Stop on a dead adopted runtime answers `stopped` from an already-absent audit | 1 | `died-corrected` | `[A]` / `['stop']` | 5,000 | AC-4 |
| S-61 | Restart on a dead adopted runtime confirms absence then readies one replacement | 1 | `died-corrected` | `[A]` / `['restart']` | 66,000 | AC-5 |
| S-62 | A recycled pid at a dead adopted identity is never signalled | 1 | `died-corrected` | `[A]` / `['stop']`, `signalsSent: 0` | 5,000 | AC-12 |

`S-58` is the honest proof of the limitation recorded in `01-action-plan.md` section 5: it asserts a stale `Running`, zero events after the terminal reconcile event, and that no automatic transition occurred. `S-59` … `S-61` prove each delivered on-demand correction path. `S-62` asserts the delivered pre-signal identity revalidation refuses to signal a recycled pid, yielding `unconfirmed` with zero signals delivered.

#### Group G — registration and filesystem integrity (S-63 … S-66)

| ID | Scenario | Projects | Outcome | Assertion | Bound (ms) | ACs |
|---|---|---:|---|---|---:|---|
| S-63 | Registration values unchanged across a successful reconciliation | 2 | adopted | id, name, canonical path, created-at identical | 11,000 | AC-7 |
| S-64 | Registration values unchanged across an unresolved reconciliation | 1 | unresolved | identical, registered exactly once | 11,000 | AC-7 |
| S-65 | Registration values unchanged across a repeated reconciliation | 1 | adopted | identical after three passes | 11,000 | AC-7 |
| S-66 | Fixture manifests unchanged across an interrupted reconciliation | 1 | unsettled | membership, digests, modes, timestamps identical | 11,000 | AC-7 |

### Expected Result
All 66 rows present exactly once in catalog order, every row `within-bound`, every declared bound a member of `BL019_DECLARED_BOUNDS`, no row declaring 15,000 ms, every row carrying an `execution` witness that satisfies every total rule — including a `probeHealthByProject` map whose keys equal that row's projects exactly and whose counts match each project's own settled class — and the emitted artifact byte-identical to the committed one.

### Expected Evidence
`project/work-items/43-bl-019-reconcile-workbench-runtimes-after-api-restart/implementation/evidence/runtime-reconcile-matrix.json` and its byte-identical working copy at `test-results/bl-019/runtime-reconcile-matrix.json`, each row carrying its `execution` witness, plus the V-16 report naming the production entry points that produced each row.

---

## Test V-17: Designated real API-restart episode with an isolated negative-control subepisode

- **Type:** designated proof
- **Task:** T-11
- **Acceptance Criteria:** AC-1, AC-2, AC-4, AC-5, AC-6, AC-7, AC-9, AC-10, AC-12, AC-14, AC-18, AC-19, AC-22
- **Priority:** High

### Setup
`BL019_DESIGNATED=1`, the compiled API at `apps/api/dist/server.js` built by the recipe, real code-server workbenches, disposable fixtures, disposable SQLite databases, and a fixed front-door token. Zero retries. Overall bound 360,000 ms.

### What counts as an API generation (revision 3)
Every generation claimed anywhere in this episode — the startup control, the control subepisode's `C0` and `C1`, and the main episode's generations 0 … 3 — is `spawn(process.execPath, [API_COMPILED_ENTRY], { env })` against a disposable `ASCEND_DATABASE_URL`, a fixed `ASCEND_PORT`, an `ASCEND_PROJECT_ALLOWED_ROOTS` covering only that episode's disposable root, and a fixed `ASCEND_FRONT_DOOR_TOKEN`, and is recorded with its OS-observed pid, process-start time, `/proc/<pid>/cmdline` argv, listener port, listener inode, listener-owning pid, real HTTP request counts, and observed disposable database file.

**None of these counts:** a `node -e` or `--eval` placeholder, an in-process Fastify application, an in-process `ProjectRuntimeManager` presented as a generation, a synthesized record, an assigned identity, an argv not read from `/proc`, a listener attributed to another pid, zero succeeded HTTP requests, or an unobserved database. `validateReconcileEpisode` rejects each by name, and the `reconcile-designated-real-api` guard keeps `createProjectRuntimeManager` out of `runtime-reconcile-designated.test.ts` entirely.

### Why the controls are split
A live process carrying a registered project's canonical-path or owner-token marker is a candidate for that project, and check 1 precedes check 3. `C-1` (final argument equal to a registered canonical path) and `C-3` (byte-perfect argument vector for a registered project from a foreign installation root) are therefore candidate-bearing and cannot be alive while a genuine survivor of the project they mark must be adopted: the only correct settlement would be `ambiguous-candidates`. They run in the isolated `P0c` subepisode as the sole candidate for their own registered control projects and are cleared in `P0d` before `P1`. `C-2` carries neither marker, and the episode proves that by observation, so it may stay beside the survivors.

### Steps
Execute phases `P0`, `P0b`, `P0c`, `P0d`, `P1`, `P1b`, `P2`, `P3`, `P4`, `P5`, `P6`, `P7`, `P8`, `P9`, `P10`, `P11`, `P12`, `P13` exactly as fixed in `02-task-breakdown.md` T-11 and `01-action-plan.md` section 11: prerequisites; the zero-project startup headroom control at 4,000 ms; the isolated control subepisode; its teardown and independently observed clearance before `P1`; baseline acquisition of two workbenches with full group and listener attribution; launcher conformance and candidate uniqueness; the single coexisting control `C-2` with its observed null marker set; the controlled abrupt `SIGKILL` and survivorship assertion; reconciliation measured from the replacement spawn instant at 15,000 ms; stable-route re-entry; two further restart generations; the controls check; Stop; Restart; pre-teardown capture with `teardown: null`; teardown; independent re-observation; and atomic finalization.

The control subepisode asserts, in order and with its declared bounds: registration of `K-1` and `K-3` through generation `C0` and their read-back records; `C0` stopped; `C-1` and `C-3` spawned with their observed marker sets; sole candidacy observed over the whole live candidate set; generation `C1` settling within `reconciliationEndToEndBoundMs` from its spawn instant; both control projects reporting `Failed` with `reconcile-unconfirmed`; 503 `workbench_reconcile_unconfirmed` on each stable route with zero launches; 409 `runtime_reconcile_unresolved` on Stop and on Restart with zero lifecycle events; zero signals and unchanged control identities; the observed refusal reason `launcher-prefix-mismatch` for both control projects from `observeControlRefusalReasons`, which runs one further production reconciliation in process over the same live evidence with the default attribution primitives; teardown; and completed-probe zero residuals recorded with `clearedBeforePhase: 'P1'`.

### Expected Result
Each replacement generation is a compiled-API process that settles within 15,000 ms of its own spawn instant with unchanged identities and no accumulation; each candidate-bearing control is the sole candidate for its own registered project, is refused by name through the production predicate, is never adopted or signalled, and is proven clear before the survivor episode begins; the coexisting control carries no marker; teardown is proven by independent re-observation and finalized atomically.

### Expected Evidence
`test-results/bl-019/designated-episode.json` with, at minimum:

```
{
  "measurementOrigin": "api-process-spawn",
  "phaseOrder":           ["P0","P0b","P0c","P0d","P1","P1b","P2","P3","P4","P5",
                           "P6","P7","P8","P9","P10","P11","P12","P13"],
  "startupControl":       { "boundMs": 4000, "spawnToFirstResponseMs": <int>, "created": 0, "signalsSent": 0,
                            "generation": { <generation record> } },
  "controlSubepisode":    {
    "projects":  [ { "token": "...", "registeredAt": <int>, "canonicalPathObserved": true } ],
    "generations": [ { "generation": "C0", ... }, { "generation": "C1", "boundMs": 15000,
                       "settlementElapsedMs": <int> } ],
    "controls":  [ { "id": "C-1"|"C-3",
                     "markers": { "pathMarker": "<control project token>", "tokenMarker": null|"<token>" },
                     "candidateCountForItsProject": 1,
                     "settledPublicState": "Failed", "publicFailureCategory": "reconcile-unconfirmed",
                     "observedRefusalReason": "launcher-prefix-mismatch",
                     "acquisitionStatus": 503, "stopStatus": 409, "restartStatus": 409,
                     "lifecycleEvents": 0, "launches": 0, "signalsSent": 0,
                     "observedAlive": true, "adopted": false } ],
    "teardown":  { "status": "proven-clear" },
    "residuals": { "controlProcesses": { "probeCompleted": true, "residual": 0 },
                   "apiProcesses": { "probeCompleted": true, "residual": 0 },
                   "listeners": { "probeCompleted": true, "residual": 0 },
                   "runtimeDataPaths": { "probeCompleted": true, "residual": 0 },
                   "disposableFixtures": { "probeCompleted": true, "residual": 0 } },
    "clearedBeforePhase": "P1"
  },
  "launcherConformance":  { "prefixMatched": true, "listenerOwner": "group-leader" | "group-member",
                            "candidateCountByProject": [1, 1] },
  "apiGenerations":       [ { "generation": <int>, "pid": <int>, "processStartTime": "...",
                              "argv": ["<node>", "<...>/apps/api/dist/server.js"],
                              "listenerPort": <int>, "listenerInode": "...", "listenerOwnerPid": <int>,
                              "httpRequests": { "issued": <int>, "succeeded": <int> },
                              "database": { "path": "...", "bytes": <int>, "projectRowsObserved": <int> },
                              "boundMs": 15000, "settlementElapsedMs": <int>, "pendingObserved": <bool> } ],
  "projects":             [ { "token": "...", "preRestartIdentity": "...", "settledIdentity": "...", "unchanged": true,
                              "groupMembers": [...], "listenerOwnerPidObserved": <int>, "routeStatus": 200 } ],
  "controls":             [ { "id": "C-2", "markers": { "pathMarker": null, "tokenMarker": null },
                              "refusal": "listener-not-owned", "refusalAuthority": "helper-level",
                              "observedAlive": true, "adopted": false, "signalsSent": 0 } ],
  "stopPhase":            { "boundMs": 5000, "elapsedMs": <int>, "peerUnchanged": true },
  "restartPhase":         { "boundMs": 66000, "elapsedMs": <int>, "stableRouteUnchanged": true },
  "registration":         [ { "token": "...", "unchanged": true } ],
  "fixtureManifests":     [ { "token": "...", "beforeDigest": "...", "afterDigest": "..." } ],
  "residualCount":        null,
  "teardown":             null
}
```

finalized atomically in P13 to `"teardown": { "status": "proven-clear", "probesCompleted": 6, "residuals": { "apiProcesses": 0, "workbenchProcesses": 0, "attributableDescendants": 0, "listeners": 0, "activeRequests": 0, "disposableFixtures": 0 } }` — or to `'unproven'` / `'residual-present'` with the observed counts, which is a non-success artifact.

---

## Test V-18: Independent residual audit

- **Type:** proof command
- **Task:** T-12
- **Acceptance Criteria:** AC-12, AC-19, AC-22
- **Priority:** High

### Steps
1. Reject, with a distinct reason each, a missing artifact, a malformed artifact, `teardown: null`, and any `teardown.status` other than `'proven-clear'`.
2. Recompute all six residual classes out of process from the recorded identities and paths.
3. Reject any class whose recomputed value differs from the episode's finalized value.
4. Reject any incomplete probe and any non-zero residual.
5. Assert independently that every control in both subepisodes was observed alive before its own cleanup, that no control was signalled by Ascend, and that the control subepisode's residual classes were completed-probe zeros recorded before `P1`.
6. Reject the artifact whenever `validateReconcileEpisode` rejects it, so a placeholder generation, a control-isolation failure, or a phase-order mismatch fails the audit rather than the audit trusting the episode's prose.
7. Write `test-results/bl-019/residual-audit.json` and exit non-zero on any rejection.

### Expected Result
Two independent observations agree at integer zero for every residual class; a self-assigned value can never satisfy the audit.

### Expected Evidence
`test-results/bl-019/residual-audit.json` with six recomputed zeros, a `probeCompleted` flag per class, the agreement result, the control-survival and pre-`P1` clearance record for both subepisodes, and the generation-authenticity verdict.

---

## Test V-19: Application documentation

- **Type:** unit
- **Task:** T-14
- **Acceptance Criteria:** AC-20
- **Priority:** Medium

### Steps
1. Assert `docs/api-restart-reconciliation.md` exists and documents: the three outcomes; the four public states; the attribution conjunction as behaviour including the same-installation and owned-process-group constraints; the 15,000 ms end-to-end bound with its measurement origin, its 3,000 ms headroom, its 11,000 ms internal deadline, and its 1,000 ms response allowance; the acquisition, Stop, and Restart admission table; the adopted-runtime liveness limitation and the exact user actions that correct it; the operator path for an unresolved project; the ephemeral runtime-data and diagnostic-file lifetime; the same-user, same-`TMPDIR`, same-installation constraints; the evidence and cleanup model including the `residualCount` null encoding and the three episode teardown statuses; the three commands; and the BL-020 through BL-022 boundaries.
2. Assert the documented counts equal the live modules: 19 failure categories, 12 Stop route categories, 12 Restart route categories, 30 failure-table rows, 4 public states, 13 lifecycle events.
3. Assert all **five** superseded BL-019 deferral sentences are gone: `docs/project-runtime.md:37`, `docs/session-switching.md:21`, `docs/session-switching.md:47`, `README.md:194`, and `apps/api/src/routes/README.md:73`.
4. Assert `docs/project-runtime.md` no longer states "18 closed categories" and states 19.
5. Assert `docs/README.md` indexes the new document and that `docs/stable-workbench-routing.md` documents acquisition across the boundary and the 30-row table.
6. Assert the validation section records the revision-3 proof structure: scenario rows produced by executing the manager, admission, route, and projection paths with an execution witness; API generations that are the repository's compiled API entry with observed process, listener, HTTP, and database evidence; and adversarial impersonating controls proven in an isolated subepisode and cleared before the survivor proof, with the reason stated.
7. Assert no documentation example contains a raw project path, argv string, pid, port, loopback authority, inode, credential, or server-provided message.

### Expected Result
Every affected surface matches delivered behaviour, and no superseded deferral text remains.

### Expected Evidence
V-19 report naming each documented topic, each asserted count, and each removed sentence with its file and prior line.

---

## Test V-20: Canonical gate and preserved prior evidence

- **Type:** gate
- **Task:** T-13, T-15
- **Acceptance Criteria:** AC-19, AC-21, AC-22
- **Priority:** High

### Steps
1. Run `just verify` and require success, with `verify-runtime-reconcile`, `proof-runtime-reconcile`, and `proof-runtime-reconcile-residual-audit` executing in that order immediately after `proof-runtime-restart-residual-audit` and before `verify-mvp-performance`.
2. Require every BL-010 through BL-018 gate to pass without modification to its evidence.
3. Assert `runtime-stop-matrix.json` still hashes to `c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3` and `runtime-restart-matrix.json` to `fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880`.
4. Assert `pnpm typecheck` passes with `beginReconciliation()` required and with no `as any`, `as unknown as`, `@ts-expect-error`, or widened interface introduced by this change.
5. Assert no step required network access, a credential, or a manual judgement.

### Expected Result
The canonical gate completes successfully with every delivered gate intact and every prior committed artifact byte-identical.

### Expected Evidence
The `just verify` transcript, the two preserved digests, and the typecheck transcript.

---

## Coverage summary

| AC | Validations | Matrix rows |
|---|---|---|
| AC-1 | V-1, V-3, V-4, V-6, V-7, V-13, V-16, V-17 | S-03, S-04, S-05, S-28, S-48 |
| AC-2 | V-9, V-16, V-17, V-19 | S-32, S-36, S-37 |
| AC-3 | V-1, V-6, V-13, V-14, V-16 | S-02, S-03, S-06, S-20, S-22, S-26, S-27, S-29, S-58, S-59 |
| AC-4 | V-5, V-10, V-16, V-17 | S-43, S-45, S-60 |
| AC-5 | V-5, V-10, V-16, V-17 | S-44, S-61 |
| AC-6 | V-7, V-16, V-17 | S-27, S-56 |
| AC-7 | V-16, V-17 | S-63, S-64, S-65, S-66 |
| AC-8 | V-1, V-6, V-15, V-16, V-19 | S-29, S-30, S-31, S-32, S-58, S-59 |
| AC-9 | V-1, V-6, V-9, V-13, V-16, V-17 | S-01, S-02, S-34, S-38 |
| AC-10 | V-1, V-6, V-9, V-10, V-14, V-16, V-17 | S-07 … S-26, S-35, S-37, S-41, S-42 + the control subepisode's two live refusals |
| AC-11 | V-2, V-5, V-6, V-16 | S-23, S-24, S-25, S-26 |
| AC-12 | V-2, V-4, V-16, V-17, V-18 | S-08 … S-22, S-62 + `C-1`/`C-3` isolated live refusals and `C-2`'s observed non-candidacy |
| AC-13 | V-8, V-9, V-16 | S-33, S-35 |
| AC-14 | V-1, V-10, V-14, V-16, V-17 | S-39, S-40, S-41, S-42, S-46, S-47 + the control subepisode's real 409 responses |
| AC-15 | V-8, V-12, V-16 | S-49, S-50, S-51, S-52 |
| AC-16 | V-8, V-10, V-16 | S-04, S-45, S-47, S-57 |
| AC-17 | V-11, V-13, V-16 | S-53, S-54, S-55 |
| AC-18 | V-7, V-15, V-16, V-17 | all 66 rows |
| AC-19 | V-15, V-16, V-17, V-18, V-20 | all 66 rows + episode + audit |
| AC-20 | V-19 | — |
| AC-21 | V-20 | — |
| AC-22 | V-15, V-16, V-17, V-18, V-20 | all |

### Vocabulary and branch coverage

| Requirement | Carried by |
|---|---|
| All **18** refusal reasons appear at least once | S-07, S-08, S-09/S-10, S-11, S-12, S-13, S-14, S-15, S-16, S-17, S-18, S-19/S-20, S-21, S-22, S-24, S-25, S-28, S-53 |
| Both absence proofs appear | S-02 (`no-candidate-complete-scan`), S-23 and S-26 (`candidate-audit-triple-absent`) |
| Both `listenerOwner` values appear | S-03 (`group-member`), S-05 (`group-leader`) |
| All **4** public states appear | S-06 `Starting`, S-03 `Running`, S-02 `Stopped`, S-20 `Failed` |
| All **3** outcomes plus `unsettled` appear | S-03, S-02, S-07, S-06 |
| All **4** `adoptedLiveness` values appear | `not-applicable` on every row with no adopted project (S-01, S-02, S-06 … S-26, S-29 … S-31, S-34, S-35, S-37 … S-42, S-46, S-50, S-51, S-53, S-54, S-64, S-66); `alive` on every adopted row with no declared kill (S-03 … S-05, S-27, S-28, S-32, S-33, S-36, S-43 … S-45, S-47 … S-49, S-52, S-55 … S-57, S-63, S-65); `died-observed-stale` (S-58); `died-corrected` (S-59 … S-62) |
| All **13** declared bounds are exercised or asserted | matrix rows use 1,000 / 5,000 / 11,000 / 60,000 / 66,000 / 71,000; V-1 asserts all thirteen; V-17 uses 4,000 and 15,000 |
| All **20** source guards pass with negative controls | V-15 |
| All **12** mutation classes rejected | V-15 |
| All **3** episode teardown statuses classified | V-15, V-17 |
| All **15** episode rejection reasons exercised | V-15 |
| Every row carries an `execution` witness whose `probeHealthByProject` keys equal its projects and whose per-project counts satisfy the readiness rule | V-16, V-15 (`M-12`) |
| Every API generation proven to be the compiled entry | V-17, V-15, V-18 |
| Every candidate-bearing control isolated and cleared before `P1` | V-17, V-15, V-18 |
