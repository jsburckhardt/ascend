# Action Plan: BL-019 Reconcile workbench runtimes after API restart

## Feature
- **ID:** 43
- **Issue:** https://github.com/jsburckhardt/ascend/issues/43
- **Research Brief:** project/work-items/43-bl-019-reconcile-workbench-runtimes-after-api-restart/research/00-research.md
- **Branch:** feat/43-reconcile-workbench-runtimes-after-api-restart
- **Base SHA:** 4e2b48b8a54204d68617b40e2dd6de302676f550
- **Scope Type:** issue
- **Revision:** 5

Every behavioural decision, type name, member set, vocabulary count, bound, cardinality, scenario name, evidence field, and command in this plan is fixed here. Implement executes them and designs nothing. A required deviation returns to Plan.

---

## Revision 5 narrative

Independent Verify rejected the implementation commit `61d3acf22a14be55ed9f7ae386739fd9366ece23` and returned this issue to Plan. Revision 5 repairs exactly the three verified defects it found and changes nothing else. **No acceptance criterion, no AC ID or order, no scope boundary, no outcome, no refusal class, no bound, no vocabulary count, no scenario identifier, no task identifier, no validation identifier, no architecture artifact ID or creation date, and no candidacy or conjunction element changes.** Every count in the ledger of section 8 stands: 22 ACs, 15 tasks, 20 validations, 66 scenarios, 18 refusal reasons, 20 source guards, 12 mutation classes, 13 declared bounds, 13 `SelectedReconcileSources` members, 18 episode phases, 15 episode rejection reasons, 3 outcomes, 2 absence proofs, 4 public states, and `+1 execution` with 7 nested members.

**R5-1 (high) — a completed process-group enumeration that omits the candidate leader was accepted.** `apps/api/src/project-runtime-process.ts:459-495` refuses `group-scan-incomplete` only when `group.complete` is false, then proceeds straight to the listener lookup. Check 9 of section 1b and the core-component conjunction both require the enumeration to complete **and contain** the candidate, so a `{ complete: true, pids: [] }` or `{ complete: true, pids: [<forked member>] }` observation must refuse before any listener inode is read, and today it does not. The plan was under-specified rather than wrong: section 1c stated the membership conjunct in one clause of one sentence, the refusal-class gloss described only the completeness branch, and `S-17` declared the completeness input, which is the branch the delivered code already handles. Section 13a now fixes the leader-identifier owner, the exact comparison, the evaluation order, the refusal class, the expected primitive-call consequences, and the negative fixtures; `S-17` moves to the membership branch and the completeness branch keeps deterministic coverage at `V-2` and `V-6`, so the catalog stays at 66 rows and no vocabulary count moves.

**R5-2 (high) — reconciliation readiness paced itself on a fallible awaited primitive.** `apps/api/src/project-runtime-manager.ts:1028` awaits `processDependencies.sleep(config.pollIntervalMs, signal)` inside the readiness poll loop. The accepted architecture requires every awaited host observation on a reconciliation path to be bounded, cancellable, and armed from the trusted synchronous `RuntimeDeadlineScheduler`, never from the fallible injectable `sleep`; section 4 stated the outer deadline precisely and left the poll gap unnamed, and revision 4 still described check 12 as polling "at `config.pollIntervalMs`". Section 13b now defines one module-local trusted delay built from the same scheduler, its clamp inside the enclosing readiness window, its cancellation and error semantics, the two distinct scheduler uses and how they stay apart, the two delivered `sleep` call sites that are deliberately preserved, and the mechanical guard plus the injected failing-`sleep` control that keep the regression out. No timer library, no new configuration member, no new bound, and no new public surface is introduced.

**R5-3 (medium) — the documented privacy boundary contradicted the committed evidence.** `docs/api-restart-reconciliation.md:9` states that refusal reasons "never enter a browser-visible surface, HTTP body, or committed artifact", and `T-14` item 8 carried the same conflation into the plan, while the committed 66-row matrix intentionally records bounded `refusalReason` enum values for 19 projects and the evidence schema requires them. The ADR and the core-component were already right that finer classifications live in trusted in-process inspection and retained validation evidence; what was missing was that retained validation evidence includes committed artifacts. Section 13c states the two tiers once, the core-component amendment makes it explicit, and `T-14` and `V-19` are corrected so the documentation states the boundary at that granularity instead of over-claiming.

**Architecture amended, narrowly.** `ADR-260815-api-restart-runtime-reconciliation` is amended for R5-2 only: the trusted-scheduling sentence now covers every bounded wait including a poll gap, one alternative row records why awaiting `sleep` is refused, and one neutral consequence records that non-reconciliation `sleep` uses are unchanged. `CORE-COMPONENT-260815-host-runtime-attribution-evidence` is amended for all three: the group-membership precondition becomes its own rule with its own refusal semantics and ordering, the bounded-observation rule extends to intermediate pauses, the disclosure rule states the two tiers, the refusal-class gloss names both sub-branches, and the enforcement paragraph gains three mechanical obligations. Both keep their identifiers and their 2026-08-15 creation dates. `DECISION-LOG.md` keeps decisions 1 … 294 byte-unchanged and appends 295 … 301.

**Reopened for the Implement correction, in dependency order:** `T-2` (membership conjunct and its ordering), `T-3` (trusted poll gap and the manager-level refusal consequences), `T-9` (two extended source guards, the extended `M-9` fixtures, the amended `S-17` catalog entry), `T-10` (re-execute the matrix and regenerate the committed artifact), `T-14` (correct the privacy sentence and document both corrections), `T-15` (rerun the canonical gate and re-prove the preserved digests). `T-1`, `T-4`, `T-5`, `T-6`, `T-7`, `T-8`, `T-11`, `T-12`, and `T-13` stay completed and are not reopened: no contract vocabulary, admission rule, route category, web mirror, test-double migration, episode phase, audit rule, or recipe changes.

---

## Revision 4 narrative

Revision 4 repairs exactly one validated HIGH defect in revision 3 and changes nothing else. **No production behaviour, no issue scope, no acceptance criterion, no task, no validation, no scenario, no refusal class, no bound, no control-isolation rule, and no real-compiled-API rule changes.** The 76 partially implemented product and test files were not modified by this revision.

**R4-1 (high) — the execution witness stated a per-project invariant on a row-level counter.** Revision 3's section 12a gave each row one numeric `primitiveCalls.probeHealth` and then constrained it *per project*: `0` for a project refused before readiness, `>= 1` for a project that settled `adopted` or `readiness-unconfirmed`. A row with more than one project can carry both kinds at once. `S-28` is one adopted project plus one `deadline-exceeded` peer; `S-29` carries pending, adopted, absent, and unresolved projects in one projection; `S-57` is one adopted plus one unresolved; and `S-30`, `S-31`, `S-47`, and `S-53` are mixed for the same reason. On those rows one counter is required to be both `0` and `>= 1`, which is uninhabitable; and if a validator instead reads the rule as an any/all row-level test, one project's legitimate readiness poll conceals an illegal readiness probe issued for a peer the predicate refused at check 3. Either way `M-12` was not a total per-project proof and those rows were not safely inhabitable.

The witness was the defect, not the predicate. Section 12a now records readiness observation **per project**: `execution.probeHealthByProject` is an opaque-token-keyed map whose keys are exactly the row's projects, `primitiveCalls.probeHealth` is demoted to an aggregate total that carries no per-project claim, and the per-project rule is stated as a total function of where the predicate's own evaluation order stopped for that project — including the classes that order leaves genuinely indeterminate. The count is attributed from the injected primitive call ledger and cannot be typed from an expectation. `M-12` and `V-15` gain negative fixtures for a cross-peer swap, a missing or extra project key, a nonzero count on an early refusal, and a zero count on a project that reached readiness.

**What revision 4 does not change.** The 22 AC IDs and their text; the 15 tasks; the 20 validations; the 66 scenario identifiers and their order; the 18 refusal reasons and their evaluation order; the 3 outcomes; the 2 absence proofs; the 13 declared bounds; the 20 source guards; the 12 mutation classes; the 13 `SelectedReconcileSources` members; the 18 episode phases; the 15 episode rejection reasons; the negative-control isolation rules of sections 1d and 11; the compiled-API generation rules of section 12b; and every revision-2 and revision-3 repair. The top-level `RuntimeReconcileEvidenceRow` gains no further member — it is still exactly **+1 `execution`** — and only that record's nested members change. Decisions 237 … 291 stand unchanged; revision 4 appends 292 … 294 and rewrites no history.

---

## Revision 3 narrative

Implement returned this issue to Plan with one implementation-blocking architecture conflict, and it was right to. Revision 3 repairs that conflict and the two evidence-authenticity defects it exposed. **No production reconciliation behaviour changes, and no element of the trust boundary is weakened.** The 76 partially implemented product and test files were not modified by this revision; where the partial product already implements the correct behaviour, revision 3 records that and leaves it alone.

**R3-1 (critical, implementation-blocking) — an adversarial control was required to coexist with the survivor it impersonates.** Revision 2's T-11 held a genuine conforming Project A survivor and control `C-3` — a byte-perfect foreign-installation candidate carrying Project A's exact canonical path and owner-token markers — alive inside one production reconciliation, and then required Project A to settle `adopted`/`Running` in P4 while `C-3` settled `launcher-prefix-mismatch` in P7. Both cannot hold. Under the section 1b candidacy rule both processes are candidates for Project A; check **1** (exactly one candidate) is evaluated before check **3** (launcher prefix); so the only correct settlement for Project A is `unresolved` with `ambiguous-candidates`, and no downstream refusal class is reachable for either process. Revision 2's `C-1` carries the same defect for the same reason: its final argument is Project A's canonical path, so it too is a candidate for Project A.

The production predicate is not the defect. Exact-one candidacy, the complete conjunction, the fixed evaluation order, exact attribution, and zero signalling are correct and are preserved unchanged; the partial implementation already settles `ambiguous-candidates` for exactly this shape and must keep doing so. What was wrong is the *proof structure*: an adversarial candidate was placed where its own refusal class could not be observed. Section 1d states the rule that was missing, and section 11 decides the structure that satisfies it — a bounded real compiled-API **control subepisode** in which each candidate-bearing control is the sole candidate for its own registered project, is settled by the production predicate, and is then torn down and independently proven clear **before** the survivor episode registers anything.

**R3-2 (critical) — a matrix row could be written instead of observed.** T-10 and V-16 required 66 rows but never required a row to be *produced by running the production code*. The partial `runtime-reconcile-fixtures.ts` therefore builds all 66 rows by mapping catalog constants into row objects: the expected values are typed into the artifact and no manager, admission, route, or projection path executes. Such an artifact proves only that the catalog agrees with itself and cannot count as AC-1 … AC-19 evidence. Section 12a defines executable-scenario evidence and a per-row execution witness, and adds one source guard and one mutation class so that a written row fails mechanically.

**R3-3 (critical) — an "API generation" could be a placeholder process.** T-11 and V-17 required "the real compiled API" in prose only. The partial `runtime-reconcile-designated.test.ts` records four `node -e 'setInterval(...)'` processes as `apiGenerations`, drives an in-process `ProjectRuntimeManager` instead of the compiled server, performs no HTTP request, opens no SQLite database, performs no controlled abrupt API exit, and assigns each control's refusal reason from its array index. None of that can count as T-11 completion or evidence. Section 12b fixes the compiled entry, the OS-observed generation record, and the substitution rejections; T-11 and V-17 restate every phase against them.

**What revision 3 does not change.** The 22 AC IDs and their text; the work-item path; both architecture artifact IDs and their 2026-08-15 creation dates; the 18 refusal reasons and their evaluation order; the 3 outcomes; the 2 absence proofs; the 66 scenario identifiers; the 13 declared bounds; the 15,000 ms end-to-end ceiling, its `api-process-spawn` origin, and its 3,000 / 11,000 / 1,000 decomposition; the 4,000 ms startup control; owned-process-group listener ownership; the derived launcher prefix; the required `beginReconciliation()`; the adopted-runtime liveness limitation and its delivered on-demand corrections; evidence finalization, the residual audit, privacy, the public vocabularies, Stop and Restart behaviour; and the no-new-persistence boundary. Decisions 237 … 283 stand; revision 3 appends 284 … 291 and rewrites no history.

---

## Revision 2 narrative

Independent adjudication rejected revision 1. Seven defects were re-derived from the delivered source and from controlled probes on this host before any of them was accepted; all seven were confirmed, and all seven are repaired here. Revision 1's history is preserved in this section, but no superseded revision-1 instruction remains active anywhere in these three artifacts.

**R2-1 (critical) — the trust predicate was unreachable.** Revision 1 required `argv[0] === config.executablePath` and `argv.slice(1)` byte-equal to `buildRuntimeArgv(...)`. The delivered `config.executablePath` is `/home/vscode/.local/bin/code-server`, a symlink to `<installation-root>/bin/code-server`, which is a POSIX shell launcher whose last line is `exec "$ROOT/lib/node" "$ROOT" "$@"`. A controlled probe spawned a real workbench exactly as `createNodeRuntimeProcessAdapter().launch` does and read `/proc/<pid>/cmdline`:

```
["/home/vscode/.local/lib/code-server-4.131.0/lib/node",
 "/home/vscode/.local/lib/code-server-4.131.0",
 "--bind-addr","127.0.0.1:46271","--auth","none","--disable-telemetry",
 "--disable-update-check","--disable-workspace-trust","--disable-proxy",
 "--user-data-dir","/tmp/ascend-runtime-data/probetoken0000-46271",
 "/workspaces/ascend/apps/api/test/fixtures"]
```

`argv[0]` is the bundled interpreter, never `config.executablePath`, and the delivered argument vector begins at index 2. Revision 1 therefore refused every real survivor while a process injected by a fake primitive could pass. Section 1 replaces the predicate with a derived, host-provable **launcher-prefix** rule anchored to the configured executable's own installation tree, proven positively against a real spawned runtime and negatively against a real foreign installation root.

**R2-2 (critical) — listener ownership was scoped to the wrong process.** Revision 1 required the loopback listening inode to appear among the root candidate's own file descriptors. The same probe showed the group leader holds no listening socket; a forked group member does:

```
GROUP MEMBERS (pgid=1756849): [1756849, 1756878]
  member 1756849 argv[1] = <installation-root>
  member 1756878 argv[1] = <installation-root>/out/node/entry
LISTENERS on port: inode 89064796
  member 1756849 holds listener inode: []
  member 1756878 holds listener inode: ["89064796"]
```

The delivered BL-017 and BL-018 designated proofs already attribute a listener over the owned closure rather than the leader alone (`readManagedProcesses`/`readProcessGroupMembers` then `readManagedListeners(memberPids)`). Section 1 scopes listener attribution to the exact owned process group and refuses an inode held outside it.

**R2-3 (medium) — startup could silently skip reconciliation.** Revision 1 declared `beginReconciliation?()` optional and called it as `await runtimeManager.beginReconciliation?.()`, so a manager without the implementation would start successfully and serve fabricated `Stopped` rows. `beginReconciliation()` is now a required member and is called without optional chaining; the full solution-wide test-double migration is counted in T-8.

**R2-4 (medium) — adopted death behaviour was materially different and was described as unchanged.** A launched or restarted runtime attaches `ready.process.exit.then(... transitionRunningToFailed(entry, failure, 'audit'))` to the manager's background task set, so its death is observed automatically. An adopted process is not a child of this API, so no such observation exists, and this issue adds no background monitoring. Revision 1 asserted the adopted runtime was indistinguishable from a launched one and that child stderr wiring was the only delivered behaviour change; both claims were false. Section 5 records the exact limitation, section 8 documents it, and Group F proves the delivered on-demand correction path deterministically.

**R2-5 (medium) — the internal bound consumed the whole end-to-end ceiling.** Revision 1 armed a 15,000 ms internal deadline only after Node boot, library open, and manager construction, while T-10 measured AC-1 from the replacement API's spawn instant, so a valid internal run necessarily breached AC-1. Three timed spawns of the compiled API on this host measured spawn to first served response at **1,531 / 1,510 / 1,149 ms**. Section 4 defines one authoritative origin (the replacement API spawn instant), an explicit 3,000 ms startup headroom, an 11,000 ms internal bound, and a 1,000 ms response allowance, summing to exactly 15,000 ms, and proves the headroom with a measured zero-project control instead of assuming it.

**R2-6 (medium) — AC-13 contradicted its own scenario.** Revision 1's self-validation claimed AC-13's cases never launch, while S-30 was mapped to AC-13, was an absent-boundary case, launched once, and used a 75,000 ms bound. Issue AC-13 covers only the healthy and inconclusive cases. That row is now S-34, mapped to **AC-9**, and its bound is the recomputed 71,000 ms.

**R2-7 (medium) — evidence capture and teardown sequencing was dishonest.** Revision 1 wrote the episode before teardown but embedded `teardownResidualCount: 0` that could only be true after teardown. Section 9 replaces it with a pre-teardown artifact carrying `teardown: null`, a real teardown, an independent re-observation, and one atomic finalization; a failed teardown leaves a non-success artifact that the residual audit rejects.

Counts, bounds, scenario identifiers, source guards, mutation classes, task dependencies, and validation steps are recomputed throughout. Where a count is unchanged, section 7 says so explicitly.

---

## ADRs Created
- **ADR-260815-api-restart-runtime-reconciliation** — `project/architecture/ADR/ADR-260815-api-restart-runtime-reconciliation.md` (created 2026-08-15, Accepted). **Amended in place for revision 2, again for revision 3, and again for revision 5**; its ID and creation date are preserved and no replacement artifact is created. Revision 3 records the candidacy-precedence consequence, the negative-control proof rule, and the evidence-authenticity rule; it changes no production behaviour. Revision 5 extends the trusted-scheduling rule to every bounded wait on a reconciliation path, including a readiness poll gap (section 13b).

## ADRs Amended
- **ADR-260815-public-runtime-state-projection** — spends its explicit BL-019 deferral; adds the `reconciling` entry state and target and the four reconciliation events. **Revision 2 adds** the recorded adopted-liveness limitation: a `Running` projection for an adopted runtime is only as fresh as the last on-demand observation.
- **ADR-260815-selected-runtime-stop-control** — spends its explicit BL-019 deferral; adds two bounded rejections and the already-stopped answer after a positive absence. **Revision 2 adds** that a selected Stop is one of the delivered on-demand paths that corrects a stale adopted `Running`, and that it never signals a replaced identity.
- **ADR-260815-explicit-workbench-restart-control** — makes an adopted runtime eligible under the unchanged restart contract; adds the same two bounded rejections. **Revision 2 adds** that the delivered release gate is what corrects a stale adopted generation on the restart path.
- **ADR-260812-in-process-workbench-reverse-proxy** — acquisition awaits its project's settlement and refuses rather than launches while pending or unresolved. **Revision 2 adds** that acquisition is the primary on-demand liveness correction path for an adopted runtime.
- **ADR-260815-termination-sequencer-boundary** — adopted identities reach the unchanged sequencer only after the complete attribution conjunction. **Revision 2 adds** that the conjunction now includes the launcher-prefix and owned-process-group listener elements, and that the sequencer's delivered pre-signal identity revalidation is what makes a corrective termination of a dead adopted runtime safe.
- **Not amended, deliberately:** `ADR-260815-per-project-lifecycle-activation`. Project Home's admission rules, ownership, focus, and refresh cardinality are unchanged; the browser work in this issue is limited to mirroring three closed vocabularies, which that ADR does not govern.

## Core-Components Created
- **CORE-COMPONENT-260815-host-runtime-attribution-evidence** — `project/architecture/core-components/CORE-COMPONENT-260815-host-runtime-attribution-evidence.md` (created 2026-08-15, Adopted). **Amended in place for revision 2, again for revision 3, again for revision 4, and again for revision 5**; its ID and creation date are preserved and no replacement artifact is created. Revision 3 adds the negative-control isolation rules and the executed-evidence rules to the component's definition and enforcement. Revision 5 adds the group-membership precondition and its refusal semantics, extends the bounded-observation rule to intermediate pauses, and states the two-tier disclosure boundary (sections 13a, 13b, 13c).

## Core-Components Amended
- **CORE-COMPONENT-260808-runtime-lifecycle-error-handling** — eleven reconciliation rules (state, one-shot ownership, three outcomes, adoption boundary, bounds, admission, blocked refusal, shutdown, stale-observation guard). **Revision 2 adds two rules:** startup reconciliation is a required capability of the boundary, and an adopted runtime's death is corrected only on demand and must never be published as an automatic transition.
- **CORE-COMPONENT-260808-host-process-environment** — child standard streams independent of the launching process; unprivileged same-user attribution reads. **Revision 2 corrects** the attribution read list to the launcher-derived interpreter prefix and the owned process-group listener closure.
- **CORE-COMPONENT-260808-structured-runtime-logging** — four reconciliation events; no fabricated start/stop/restart/health event; refusal classes excluded from events. **Revision 2 adds** that a delivered corrective event on an adopted runtime is a start-path event and must never be recorded as a reconciliation event.
- **CORE-COMPONENT-260812-stable-workbench-proxy** — acquisition across the reconciliation boundary; exhaustive failure table. Unchanged in revision 2 beyond the recomputed bound name.
- **CORE-COMPONENT-260808-filesystem-path-safety** — per-runtime diagnostic file placement and lifetime; no project-directory mutation. Unchanged in revision 2.
- **Unchanged, deliberately:** `CORE-COMPONENT-260810-sqlite-persistence-lifecycle`. This issue adds no persisted field, table, migration, or API payload change; the four-field project contract is untouched.

## Decision Log
`project/architecture/ADR/DECISION-LOG.md` retains its two artifact rows and decisions **237 through 271** unchanged, gained decisions **272 through 283** (12 records) for the revision-2 architecture changes, and gained decisions **284 through 291** (8 records) for the revision-3 amendments, gained decisions **292 through 294** (3 records) for the revision-4 amendment, and gains decisions **295 through 301** (7 records) for the revision-5 amendments — 5 from the core-component and 2 from the ADR. No historical decision record is rewritten, and no earlier decision is superseded by revision 5; the new records make the group-membership precondition, the trusted poll gap, and the two-tier disclosure boundary explicit.

**In revision 4 the only amended architecture artifact is `CORE-COMPONENT-260815-host-runtime-attribution-evidence`**, whose revision-3 enforcement paragraph stated the ambiguous row-level readiness rule. `ADR-260815-api-restart-runtime-reconciliation` is deliberately left unchanged: its executed-evidence decision requires every settled value to be read back from the run and states no per-project readiness counter, so no global decision text is wrong.

**No other ADR or core-component is amended in revision 3.** The five ADRs and five core-components amended in revision 2 keep their revision-2 wording exactly, because revision 3 changes no production contract they own.

---

## Acceptance Criteria

Stable IDs assigned in issue order. Text is the GitHub criterion, preserved. **No AC ID or AC text changes in revision 2.**

| ID | Criterion (issue order, preserved) |
|---|---|
| AC-1 | After a controlled abrupt API-process exit leaves exactly two registered, ready workbench processes and their loopback listeners alive, a replacement API process settles reconciliation within 15,000 ms. Both projects are then reported `Running` against their unchanged pre-restart complete runtime identities; reconciliation starts, stops, or restarts no workbench, and exactly one managed runtime and listener are attributable to each project. |
| AC-2 | Fresh navigation through each unchanged stable workbench route after reconciliation reaches the same ready pre-restart runtime for that project. All browser-visible URLs, responses, events, and public evidence captured by the finite validation scenarios expose no internal authority or runtime identity. |
| AC-3 | During the finite validation scenarios, a registered project whose reconciliation is still pending reports `Starting`, a positively absent runtime reports `Stopped`, an exactly attributed ready runtime reports `Running`, and a surviving candidate whose ownership or readiness remains inconclusive at 15,000 ms reports `Failed` with a stable documented machine-inspectable reconciliation classification. No observation exposes a fifth public state, substitutes a false state, or reports `Running` from process existence alone. |
| AC-4 | Selected Stop applied to a reconciled runtime releases only its exact attributed process identity, owned descendants, and listener within the existing selected-Stop ceiling; the project then reports `Stopped`, remains registered, and its peer remains `Running` with the same identity and route. |
| AC-5 | Explicit Restart applied after successful reconciliation retains the delivered BL-018 eligibility and bounded outcomes, confirms the reconciled prior generation absent before one replacement becomes ready, and keeps the stable route unchanged. Reconciliation itself never invokes Restart or replaces a healthy surviving generation. |
| AC-6 | Three sequential controlled API-process restarts over the same two surviving runtimes each settle within 15,000 ms without changing either runtime identity, duplicating ownership, accumulating listeners, or allowing an earlier reconciliation outcome to affect a later one. |
| AC-7 | Successful, failed, repeated, and interrupted reconciliation leave every project registered exactly once with stable ID, display name, canonical path, and created-at value unchanged. In scenarios that declare no in-project writer, finite before-and-after manifests show unchanged file membership, content digests, permission modes, and recorded timestamps. |
| AC-8 | Reconciliation events, public state, lifecycle-control outcomes, and retained public evidence agree and use only stable documented machine-inspectable classifications. Reconciliation emits no start, stop, or restart success for an action it did not perform, and all finite scenario captures exclude raw project paths, process identities, internal authorities, commands, environment values, credentials, terminal content, source content, stacks, and raw errors. |
| AC-9 | A replacement API process with zero registered projects settles reconciliation within 15,000 ms without creating or signalling a workbench resource. A registered project whose prior runtime is positively established absent settles `Stopped` within the same bound; one later normal workbench acquisition settles within the delivered acquisition ceiling and reaches exactly one ready runtime and listener under the delivered start contract. |
| AC-10 | A surviving process or listener that cannot be attributed to one registered project with exact delivered ownership and readiness evidence settles `Failed` within 15,000 ms with a stable documented machine-inspectable reconciliation classification; it is not claimed, signalled, routed, or reported `Running`, and opening the project returns that classification within the delivered acquisition ceiling without launching a potentially duplicate generation while the ambiguity remains. |
| AC-11 | If a candidate process exits, changes readiness, or loses its listener while reconciliation is in progress, the result within 15,000 ms reflects the completed exact observation, installs no stale `Running` outcome, and leaves no duplicate or orphan workbench process or listener attributable to that project. |
| AC-12 | Deterministic controlled evidence representing stale or recycled process identity, a replaced listener, mismatched project evidence, and unrelated control processes or listeners cannot authorize attribution or signalling of a different process. Every control retains its declared identity and availability without requiring PID exhaustion, privileged facilities, or indefinite waiting. |
| AC-13 | In the healthy scenario, exactly eight concurrent workbench acquisitions for one project held across the reconciliation boundary all settle within the existing workbench-acquisition ceiling against the same surviving runtime and listener. In the inconclusive scenario, all eight return the same stable documented machine-inspectable reconciliation classification within that ceiling and launch no runtime. |
| AC-14 | Selected Stop or explicit Restart requested while that project reports reconciliation `Starting` returns a stable documented machine-inspectable pre-acceptance classification within the applicable delivered operation ceiling, agrees with the unchanged public state and absence of a lifecycle event for an unaccepted action, and cannot produce duplicate ownership or terminate a generation. Other projects remain independently operable. |
| AC-15 | Delayed or reordered reconciliation, readiness, route-acquisition, process-exit, and lifecycle observations from an earlier attempt cannot overwrite, terminate, route to, emit a terminal outcome for, or change the state of the currently attributed generation. |
| AC-16 | In a bounded two-project matrix, successful reconciliation of one project and failed reconciliation of the other preserve separate identities, listeners, routes, registration, public outcomes, events, and cleanup; neither result changes the peer. |
| AC-17 | If the replacement API process shuts down or is lost during reconciliation, accepted operations cease within 15,000 ms without claiming unobserved absence or signalling unrelated resources, correctly owned surviving workbenches remain alive and unchanged, and a later replacement API process can reconcile them without being affected by the abandoned attempt. |
| AC-18 | Finite repeatable repository validation executes healthy two-project recovery, zero projects, positively absent runtime, three sequential API restarts, inconclusive and mismatched ownership, process exit and readiness loss during reconciliation, deterministic stale-identity and replaced-listener cases, eight concurrent acquisitions in healthy and inconclusive scenarios, concurrent Stop and Restart, delayed settlements, mixed peer outcomes, interrupted reconciliation, registration retention, filesystem integrity, stable routing, event and privacy checks, and final cleanup. Each scenario produces inspectable pass or fail evidence against the ceilings stated above before its first action. |
| AC-19 | Retained evidence correlates pre-restart and reconciled runtime identities, exact ownership observations, readiness and listener observations, stable-route results, public states, lifecycle-control outcomes, events, registration values, fixture manifests, peer and control identities, elapsed ceilings, and cleanup. Correctly owned survivors remain present until an explicit validation teardown; after evidence capture, separate teardown and residual audits report zero validation-owned API processes, workbench processes, attributable descendants, listeners, active requests, and disposable fixtures. |
| AC-20 | Affected user, runtime, operational, recovery, routing, privacy, and validation documentation records API-restart behavior, bounded outcomes, state and lifecycle-control behavior, ownership limits, evidence, cleanup, and repeatable repository commands while explicitly preserving the BL-020 through BL-022 boundaries. |
| AC-21 | The canonical full repository validation completes successfully, and all BL-010 through BL-018 runtime, routing, navigation, isolation, continuity, state, performance, Stop, and Restart regression gates remain successful. |
| AC-22 | All required validation uses repository-local fixtures and commands and requires no production access, hosted service, unavailable credential, unsupported hardware, destructive environment action, indefinite observation, or manual judgment. |

---

## The reconciliation model, decided

### 1. Authority and trust boundary

**No new durable state exists.** SQLite keeps exactly `id`, `name`, `canonical_path`, `created_at`. Nothing about a runtime is written anywhere, so there is nothing stale to trust and nothing to migrate.

**The evidence is the live process.** The delivered launch already writes a project's complete identity into the process: `buildRuntimeArgv` emits `--bind-addr 127.0.0.1:<port>`, `--user-data-dir <os.tmpdir()>/ascend-runtime-data/<ownerToken>-<port>`, and the exact persisted canonical path as the final argument, where `ownerToken === deriveProjectOwnerToken(projectId)`; `spawn(..., { detached: true })` makes the child its own process-group leader; and the workbench binds the loopback port inside that same process group.

#### 1a. The installed-runtime identity helper (new, revision 2)

The repository has no canonical installed-runtime identity helper. `CODE_SERVER_PATH`, `CAPACITY_CODE_SERVER_PATH`, and the `code-server-4.131.0` prerequisite fact record a path and a `--version` string only, and neither yields the argument-vector prefix the kernel actually shows. One helper is therefore defined here and is the single source of that prefix for both the launch-adjacent code and every proof.

```
resolveInstalledRuntimeIdentity(executablePath, signal): Promise<InstalledRuntimeIdentity | null>

InstalledRuntimeIdentity = {
  readonly launcherRealPath: string      // realpath(executablePath)
  readonly installationRoot: string      // path.dirname(path.dirname(launcherRealPath))
  readonly interpreterPath: string       // path.join(installationRoot, 'lib', 'node'), asserted X_OK
  readonly launcherArgvPrefix: readonly [string, string]   // [interpreterPath, installationRoot]
}
```

This mirrors, term for term, what the delivered launcher computes for itself: it resolves `$0` through its symlinks, takes `ROOT` as the parent of the resolving `bin` directory, and `exec`s `"$ROOT/lib/node" "$ROOT" "$@"`. The helper resolves it from the outside using only `realpath` and one `access(X_OK)` check, both unprivileged and read-only.

The helper returns `null` — and reconciliation then settles **every** registered project `unresolved` with `launcher-unresolved` — when `realpath` fails or when `interpreterPath` is missing or not executable. That is the fail-closed branch for a host whose delivered executable is not the bundled standalone launcher. It never widens: there is no fallback prefix, no "try `argv[0]` instead", and no heuristic.

Verified on this host: `realpath('/home/vscode/.local/bin/code-server')` is `/home/vscode/.local/lib/code-server-4.131.0/bin/code-server`; `installationRoot` is `/home/vscode/.local/lib/code-server-4.131.0`; `interpreterPath` is `<installationRoot>/lib/node`; and `launcherArgvPrefix` is byte-equal to the first two elements of a real spawned workbench's `/proc/<pid>/cmdline`.

#### 1b. Candidacy, and the conjunction in evaluation order

**The trust boundary is one complete conjunction, evaluated for one candidate root pid inside one bounded window.** A live process is attributable to registered project `P` if and only if **all** of the following hold. There is no partial credit and no override.

**Candidacy (corrected in revision 2).** For every observed pid that yields an argument vector, two independent project markers are computed:

- `pathMarker` — the registered project whose exact persisted canonical path equals the vector's **final element**, or none;
- `tokenMarker` — the registered project whose `deriveProjectOwnerToken(id)` equals the owner-token segment of the `--user-data-dir` basename `<ownerToken>-<port>`, or none.

A pid is a *candidate for `P`* when `P` equals its `pathMarker` **or** its `tokenMarker`. A pid carrying neither marker is not a candidate for any project and is ignored entirely — it is not evidence and it is not refused. A pid whose two markers name **different** registered projects is a candidate for **both** and is refused for both, each by the check its own marker did not satisfy. Candidacy is deliberately that wide so that a foreign, stale, mismatched, or control process shaped like a workbench is refused **by name** instead of silently disappearing from the evidence.

Revision 1 defined candidacy as final-element equality alone, which made check `canonical-path-mismatch` unreachable. The two-marker rule restores it and is what makes AC-12's "mismatched project evidence" case a real, inhabitable branch.

**Evaluation order is the table order below, and it is not the frozen vocabulary order of section 2.** Evaluation stops at the first failing check and records that check's refusal reason. The three specific argument checks are evaluated **before** the wholesale byte-equality check, because a single wholesale comparison first would subsume and permanently hide `canonical-path-mismatch`, `owner-token-mismatch`, and `port-mismatch`. Revision 1 evaluated the wholesale check first and left those three classes uninhabitable.

| # | Check | Source | Refusal reason on failure |
|---|---|---|---|
| 0 | The installed-runtime identity resolves (1a) | `realpath`, `access(X_OK)` | `launcher-unresolved` (settles every project, not one) |
| 1 | Exactly one candidate exists for `P` | discovery | `ambiguous-candidates` |
| 2 | Owning uid equals the current process uid and is not 0 | `/proc/<pid>/status` `Uid:` | `uid-mismatch` |
| 3 | `argv.length >= 2`, `argv[0] === identity.interpreterPath`, `argv[1] === identity.installationRoot` | `/proc/<pid>/cmdline` | `launcher-prefix-mismatch` |
| 4 | The final element of `argv` equals `P.canonicalPath` byte for byte | `/proc/<pid>/cmdline` | `canonical-path-mismatch` |
| 5 | The `--user-data-dir` basename's owner-token segment equals `deriveProjectOwnerToken(P.id)` | `/proc/<pid>/cmdline` | `owner-token-mismatch` |
| 6 | The `--user-data-dir` basename's port segment equals the `--bind-addr` port, as the same integer | `/proc/<pid>/cmdline` | `port-mismatch` |
| 7 | `argv.slice(2)` is byte-equal to `expected = buildRuntimeArgv(P.canonicalPath, port, buildRuntimeUserDataPath(deriveProjectOwnerToken(P.id), port))`, including length, order, and every flag | `/proc/<pid>/cmdline` | `argv-mismatch` |
| 8 | Process-group id equals the pid | `/proc/<pid>/stat` field 5 | `not-group-leader` |
| 9 | The bounded enumeration of that process group completes **and** contains the candidate pid — two conjuncts, both refusing by the same name (section 13a) | `/proc/*/stat` field 5 | `group-scan-incomplete` |
| 10 | A loopback listening socket exists on that port | `/proc/net/tcp`, `/proc/net/tcp6` | `listener-absent` |
| 11 | That socket's inode is held by an **exactly observed conforming member of that same process group** | `/proc/<member>/fd` | `listener-not-owned` |
| 12 | The delivered readiness contract passes on `http://127.0.0.1:<port>/healthz/` — HTTP 200 with body `status` in `alive` or `expired` | delivered health adapter | `readiness-unconfirmed` |
| 13 | A second read, taken after check 12, of the candidate's process-start time, the candidate's argument vector, **and the listener-owning member's process-start time** is identical to the first | `/proc/<pid>/stat`, `/proc/<pid>/cmdline`, `/proc/<member>/stat` | `identity-unstable` |

A missing or unparseable flag fails its **own** check rather than falling through: an absent `--user-data-dir` fails check 5, an absent or non-numeric `--bind-addr` fails check 6. `port` for checks 6 and 7 is the `--bind-addr` port, parsed from the candidate's own vector.

Checks 3–7 are the *signature*; 8–11 bind the listener to the exact owned process group; 12 is the delivered readiness gate; 13 defeats PID recycling and argv substitution across the window, for the leader **and** for the process that actually holds the socket; 1 defeats duplicated generations.

**A real workbench yields exactly one candidate, and this was verified.** The forked group member that owns the listening socket carries the argument vector `[interpreterPath, <installationRoot>/out/node/entry]`: its final element is not a canonical path and it presents no `--user-data-dir`, so it holds neither marker and is never a candidate. Check 1 therefore cannot be tripped by a project's own worker process.

#### 1c. Group-scoped listener ownership (revision 2)

A *conforming member* of the candidate's process group is a pid `m` for which all of the following were exactly observed inside the bounded window: `readProcessAttributionIdentity(m).processGroupId === candidate.pid`; `uid` equals the current non-root uid; `argv[0] === identity.interpreterPath`; and `argv[1]` resolves inside `identity.installationRoot` under `path.relative` containment (neither `..`-prefixed nor absolute-escaping). The leader itself is a conforming member when it satisfies these, which it does by construction after checks 2–8.

The pure helper that decides check 11 is:

```
resolveGroupListenerOwner(input: {
  groupLeaderPid, port, identity, primitives, signal
}): Promise<
  | { readonly owner: number }
  | { readonly refusal: 'group-scan-incomplete' | 'listener-absent' | 'listener-not-owned' }
>
```

Its rules are total and closed:

- the group enumeration must complete and contain the candidate leader, else `group-scan-incomplete`. This is **two** conjuncts, not one, and section 13a fixes which source owns the candidate leader identifier, the exact membership comparison, the evaluation order relative to the listener lookup, and the primitive-call consequences of the refusal;
- a loopback LISTEN row for `port` must exist in `/proc/net/tcp` or `/proc/net/tcp6`, else `listener-absent`;
- that row's inode must appear in the socket descriptors of **exactly one** conforming member of that group, else `listener-not-owned` — this covers an inode held by a pid outside the group, an inode held by a non-conforming member, an inode whose holder could not be observed at all, and an inode held by more than one observed member;
- the owner may be the group leader **or** a forked member; the plan asserts neither, because the real host produces the forked-member case and a future build may produce either.

`listener-not-owned` is the honest name for "not proven held by an exactly observed conforming member of this group". Ascend never signals, routes to, or claims an inode it did not attribute this way.

**Why this is not arbitrary adoption.** Only a process that Ascend itself launched — through this host's configured executable, as this user, for this exact registered project, on this exact port, whose process group still owns the listening socket, and whose identity is stable across the readiness observation — can satisfy the conjunction. A foreign installation root, a foreign executable, a control process, a listener outside the group, a stale identity, a recycled pid, or a mismatched project fails at a named check and is recorded as one bounded refusal class. No refused candidate is ever signalled, terminated, routed to, claimed, counted as owned, or reported `Running`.

#### 1d. Negative-control isolation (revision 3, normative for every validation)

Check 1 is evaluated before every signature check, and that ordering is deliberate: an ambiguous project must never reach a signature verdict. One consequence of it was missed in revision 2 and is stated here as a rule.

A live process that carries either project marker is a **candidate-bearing control**. For any validation that uses one:

1. A candidate-bearing control **must be the sole candidate for exactly one registered project** in the reconciliation pass that observes it. It therefore needs its own registered project, its own canonical path, and its own owner token, and two candidate-bearing controls may not share a registered project.
2. A candidate-bearing control **must never be alive during a pass that must adopt a genuine survivor of the project it marks.** In such a pass the only correct settlement for that project is `unresolved` with `ambiguous-candidates`, so no downstream refusal class is observable and no adoption is possible.
3. A candidate-bearing control must be **torn down and independently proven clear before** the survivor episode registers its projects, so its identity, its listener, and its disposable paths cannot influence a later pass.
4. A control that **coexists** with survivors must carry **neither** marker, and its non-candidacy must be **proven by observation** — both markers computed from its own observed argument vector against every registered project — never asserted.
5. A control is settled by the **production predicate** exactly like any other candidate. It may not be excluded from candidacy by a validation-only path, evaluated outside reconciliation, pre-classified, bypassed, or granted any exception. The exact-one rule, the conjunction, the evaluation order, and the zero-signalling rule are unchanged for controls.

Nothing here changes production behaviour and nothing here widens candidacy. A byte-perfect foreign-installation candidate stays exactly as adversarial as revision 2 intended — every element of the conjunction holds for it except the launcher prefix — and its refusal becomes observable because it is the only candidate for its project. Section 11 decides the structure; section 12 decides what may count as evidence of it.

### 2. Outcomes, states, and the absence rule

Reconciliation settles every registered project into exactly one of three outcomes. `RECONCILE_OUTCOMES = ['adopted', 'absent', 'unresolved']` (**3**, frozen, unchanged from revision 1).

| Outcome | Entry installed | Public state | Event | Permitted only when |
|---|---|---|---|---|
| `adopted` | `running` with a frozen adopted snapshot and one ownership record | `Running` | `runtime.reconcile.succeeded` | The full conjunction passed |
| `absent` | `registered { released: true }` | `Stopped` | `runtime.reconcile.absent` | A positive absence proof exists |
| `unresolved` | `failed` retaining `RuntimeFailure('reconcile-unconfirmed')` | `Failed` | `runtime.reconcile.failed` with classification `reconcile-unconfirmed` | Any refusal, incomplete observation, or deadline |

`RECONCILE_ABSENCE_PROOFS = ['no-candidate-complete-scan', 'candidate-audit-triple-absent']` (**2**, frozen, unchanged). Absence is claimed only from: a discovery pass that **completed** its enumeration of the process set and found no candidate for that project; or a completed delivered `auditRuntimeResource` triple for that project's single candidate reporting process absence, owned process-group absence, **and** listener absence together. An interrupted, cancelled, abandoned, faulted, or partial observation is `unresolved` with `absence-unconfirmed` or `scan-incomplete` — never `absent`.

`RECONCILE_REFUSAL_REASONS` (**18**, frozen, in this declaration order, which is **not** the evaluation order given in section 1b): `ambiguous-candidates`, `launcher-unresolved`, `launcher-prefix-mismatch`, `argv-mismatch`, `canonical-path-mismatch`, `owner-token-mismatch`, `port-mismatch`, `uid-mismatch`, `not-group-leader`, `group-scan-incomplete`, `listener-absent`, `listener-not-owned`, `readiness-unconfirmed`, `identity-unstable`, `absence-unconfirmed`, `scan-incomplete`, `deadline-exceeded`, `manager-shutdown`.

Revision 1 declared **16**. The delta is exact: `executable-mismatch` is **removed** because the delivered launcher makes an `argv[0] === config.executablePath` comparison impossible; `launcher-prefix-mismatch`, `launcher-unresolved`, and `group-scan-incomplete` are **added**. `group-scan-incomplete` names **both** sub-branches of check 9 — an enumeration of the candidate's own process group that did not complete, and one that completed without containing the candidate leader — and no class is added, split, or renamed for the second (section 13a).

These are internal classifications: they appear in trusted in-process inspection and in retained validation evidence, **including the committed matrix and the designated episode**, and **never** in an HTTP body, a lifecycle event, or any browser-visible surface. The single public classification is the bounded failure category `reconcile-unconfirmed`. Section 13c states that two-tier boundary once, and it is the boundary the documentation must state.

While a project is `reconciling` its public state is `Starting`. `PUBLIC_RUNTIME_STATES` stays at exactly **4**. `Running` is never reported from process existence alone: check 12 is mandatory.

### 3. Ownership, control, and the no-duplicate-generation seam

**Adoption is the ownership boundary.** An adopted runtime is an owned runtime for ownership indexing, Stop, Restart, proxy target resolution, cleanup, ephemeral runtime-data removal, and manager shutdown: one ownership record keyed `pid:processStartTime:port` under a fresh `Symbol(projectId)` generation, and one frozen running entry whose snapshot is accepted by `ownsSnapshot`. It differs from a launched runtime in exactly one respect, recorded in section 5: its death is not observed automatically. Graceful manager shutdown terminates adopted runtimes exactly as it terminates launched ones; that is intentional and unchanged, and is why AC-1 and AC-6 use *controlled abrupt* API exits.

**One reconciliation owner, and it is not optional.** `beginReconciliation()` is a **required** member of `ProjectRuntimeManager` and is memoized per manager instance. `app.ts` awaits it — `await runtimeManager.beginReconciliation()`, with no optional chaining and no presence test — during plugin registration, so no request is ever served before every registered project holds a `reconciling` entry. It resolves once installation completes; settlement continues under one bounded task. A failed project-library list at that point throws `ProjectLibraryInitializationError` through the delivered startup-failure path — no fabricated `Stopped`. `inspectReconciliation?()` remains optional exactly like the delivered `audit?()`, because it is read-only inspection with no behaviour; the evidence validator separately requires a non-null inspection record on every reconciliation row, so a missing implementation fails the artifact rather than silently degrading it.

**Admission table.** These rows are exhaustive for a project whose reconciliation is pending or unresolved; every other case is delivered behaviour, unchanged.

| Caller | Project `reconciling` (pending) | Project `failed` / `reconcile-unconfirmed` (unresolved) |
|---|---|---|
| `reportPublicStates` | `Starting`, synchronous, no await | `Failed` + `reconcile-unconfirmed`, synchronous |
| `start` (Open, stable-route acquisition) | awaits **that project's** settlement inside the reconciliation bound, then follows the settled outcome | throws `RuntimeFailure('reconcile-unconfirmed')` **before** `register`, port acquisition, or `launch`; proxy publishes `runtime:reconcile-unconfirmed` |
| `stop` | `rejected` / `reconcile-in-progress`; no state change, no event, no process call | `rejected` / `reconcile-unresolved`; checked **before** the entry-state switch, so it takes precedence over `failure-retained` |
| `restart` | `rejected` / `reconcile-in-progress`; no admission, no generation, no event | `rejected` / `reconcile-unresolved`; checked before eligibility, so the delivered failed-entry replacement path can never launch over an unattributable survivor |
| `shutdown` | aborts reconciliation; claims no absence; signals no unadopted candidate | unchanged |

The unresolved refusal persists for the life of that API process. The documented operator path is to resolve the ambiguity outside Ascend and restart the API; the next process computes its outcome from fresh host evidence only. A per-request re-observation loop is prohibited — it would be automatic recovery and could launch over a live survivor.

### 4. Bounds: one authoritative origin and one arithmetic budget (revision 2)

**The authoritative measurement origin for every issue ceiling expressed as "within 15,000 ms" is the replacement API process spawn instant**, recorded by the designated episode with `process.hrtime.bigint()` immediately before `spawn`. The measured end point is the first `GET /api/projects/runtime` response in which no registered project reports `Starting`. Nothing else in this plan redefines that origin.

That end-to-end interval is decomposed into exactly three declared segments, and the decomposition is an asserted identity, not a description:

| Segment | Config member | Default | What it covers |
|---|---|---:|---|
| startup headroom | `reconcileStartupHeadroomMs` | **3,000** | API process spawn, Node boot including instrumentation, project-library open, registration service construction, manager and proxy construction, plugin registration up to `beginReconciliation()` |
| internal reconciliation | `reconciliationOverallBoundMs(config)` | **11,000** | installation to the last project's settlement |
| response allowance | `reconcileResponseAllowanceMs` | **1,000** | last settlement to the first settled runtime-state response served |

`reconciliationEndToEndBoundMs(config) = reconcileStartupHeadroomMs + reconciliationOverallBoundMs(config) + reconcileResponseAllowanceMs` = 3,000 + 11,000 + 1,000 = **15,000**, asserted equal to the issue's predeclared ceiling at defaults. The issue's ceiling is neither weakened nor reinterpreted; it is the sum, and the internal deadline is strictly smaller than it for the first time.

The internal bound is itself the sum of four declared allowances:

| Name | Default | Derivation | Measured on this host |
|---|---:|---|---|
| `reconcileScanAllowanceMs` | 2,000 | new config member | full `/proc` enumeration reading `stat` and `cmdline` for every pid: **33.5 ms** |
| `reconcileAttributionAllowanceMs` | 1,000 | new config member | group enumeration plus listener inode plus per-member fd attribution: **9.9 ms** |
| `reconcileReadinessBoundMs` | 7,000 | new config member | one `/healthz/` request against an already-ready survivor: **5.3 ms** |
| `reconcileSettlementAllowanceMs` | 1,000 | new config member | entry installation and event emission, synchronous |
| **`reconciliationOverallBoundMs(config)`** | **11,000** | sum of the four above | — |

Startup headroom is proven, not assumed. Three timed spawns of the compiled API on this host measured spawn to first served response at **1,531 / 1,510 / 1,149 ms** with zero registered projects. The designated episode re-measures that control every run:

| Name | Default | Derivation |
|---|---:|---|
| `reconciliationStartupControlBoundMs(config)` | **4,000** | `reconcileStartupHeadroomMs + reconcileResponseAllowanceMs`; the bound for a replacement API with zero registered projects, whose reconciliation settles without any host observation |

The remaining acquisition bounds:

| Name | Default | Derivation |
|---|---:|---|
| `workbenchAcquisitionBoundMs(config)` | **60,000** | alias of the delivered `runtimeReplacementBoundMs(config)`; the delivered acquisition ceiling, named once so no document recomputes it |
| `acquisitionAcrossReconciliationBoundMs(config)` | **71,000** | `reconciliationOverallBoundMs + workbenchAcquisitionBoundMs`; applies only to an acquisition issued while its project is pending **and** whose settled outcome is `absent`, so it must still launch. Revision 1 stated 75,000 against the old 15,000 internal bound |

Delivered bounds referenced and unchanged: `runtimeStopOverallBoundMs` 5,000; `runtimeRestartOverallBoundMs(config, false)` 66,000 and `(config, true)` 81,000; restart browser transport 85,000; proxy upstream/handshake 5,000; delivered launch readiness 15,000; health attempt 1,000; poll 50.

**Which bound applies where, without ambiguity:**

- The deterministic matrix runs entirely in process on an injected monotonic clock and measures only the internal segment. Every reconciliation row declares **11,000**; no matrix row declares 15,000 and no matrix row claims the end-to-end ceiling.
- The designated episode is the only artifact that claims the end-to-end ceiling, and it declares **15,000** with `originAt: 'api-process-spawn'`.
- AC-3's "inconclusive at 15,000 ms" is satisfied strictly: an inconclusive project settles `Failed` at or before 11,000 ms internal, hence at or before 14,000 ms from the authoritative origin, and is reported by 15,000 ms.
- AC-13 is measured against the **existing** 60,000 ms acquisition ceiling and needs no new ceiling: a healthy acquisition across the boundary costs at most 11,000 ms of settlement plus one 1,000 ms reuse health check, and an inconclusive one at most 11,000 ms. AC-9's "later normal workbench acquisition" begins after settlement and is measured against 60,000 ms; AC-9's eight-acquisition absent-boundary case, which must still launch, is the only user of 71,000 ms.
- `RuntimeDeadlineScheduler.now()` and `scheduleDeadline()` arm every reconciliation deadline **and every reconciliation poll gap**; `processDependencies.sleep` is never awaited on a reconciliation path, and section 13b fixes the delay helper, its clamp, its cancellation semantics, and the two scheduler uses that must not be confused with one another. All allowances are validated as positive safe integers through the delivered `checkedRuntimeBound` guard, exactly like their delivered siblings. `config.pollIntervalMs` remains the delivered 50 ms poll interval and is **not** promoted to a declared BL-019 bound, so `BL019_DECLARED_BOUNDS` stays at 13 entries.

### 5. Adopted runtimes and liveness: the recorded limitation (revision 2)

A launched or restarted runtime installs `ready.process.exit.then(async (exit) => transitionRunningToFailed(entry, failure, 'audit'))` into the manager's `backgroundTasks` set, so its death moves the entry to `failed` and emits `runtime.health.changed` with no user action. **An adopted runtime cannot have that observation.** It is not a child of this API process, there is no `exit` event to await, and this issue adds **no** background monitor, poller, watcher, timer, or supervisor. `reportPublicStates` remains synchronous and read-only.

**The decided consequence, stated plainly:** between adoption and the next on-demand observation, an adopted runtime that dies continues to be reported `Running`. That is a real, user-visible difference from a launched runtime, it is recorded here as an ADR consequence and in the application documentation, and it is proven — not hidden — by scenario S-58.

**The delivered on-demand paths that correct it**, all of them existing code that this issue consumes unchanged:

| Trigger | Delivered path | Corrected outcome | Event |
|---|---|---|---|
| Workbench acquisition / Open (`start` on a `running` entry) | `ready.process.isAlive()`, then the delivered `/healthz/` check; on either failure `transitionRunningToFailed(current, failure, 'terminate')` | entry `failed`, public `Failed`, the delivered category (`early-exit-code` for an absent identity, `health-status-unexpected` or `health-body-unexpected` for a bad health verdict), acquisition throws | one `runtime.health.changed` |
| Selected Stop | the delivered sequencer; its **initial** audit already confirms process, owned-group, and listener absence | `stopped` with an `already-absent` audit, entry `registered { released: true }`, public `Stopped` | `runtime.stop.requested`, `runtime.stop.succeeded` |
| Explicit Restart | the delivered release-before-replacement gate, which confirms the prior generation absent before launching | one replacement generation, unchanged stable route | the delivered restart event pair |

**Signal safety on the corrective path is delivered, not new.** `terminateOwnedRuntimeGroup` performs an initial audit, returns `already-absent` without signalling when the triple confirms, and otherwise re-reads `readProcessStartTime(pid)` and refuses to signal unless it still equals the recorded `processStartTime`. A recycled pid whose start time differs therefore yields `unconfirmed` with **zero** signals delivered. S-62 proves exactly that.

**The adopted handle's `exit` promise** settles exactly once, with `{ code: null, signal: null, addressInUse: false }`, when its own `terminate` completes or when its own `isAlive` observes absence. It is **never** added to `backgroundTasks`, never awaited by shutdown's drain, and never converted into an automatic transition. A source guard enforces this.

Out of scope and deliberately not smuggled in: any background task, interval, watcher, `inotify`, `pidfd`, `waitid`, `SIGCHLD` handler, or periodic health loop for adopted runtimes. Those belong to later work, not to BL-019.

### 6. Survivorship: the launch repair this issue requires

The delivered launch spawns with `stdio: ['ignore', 'ignore', 'pipe']`. A controlled probe on this host proved that such a detached, unref-ed child **dies on its next stderr write** once the API is killed, because the pipe has no reader; the identical child with stderr on a file descriptor survived indefinitely. Without a repair, AC-1's premise is false.

**Decided repair.** `RuntimeProcessAdapter.launch` opens `path.join(userDataPath, 'runtime-stderr.log')` with flags `'a'` and mode `0o600` **after** `mkdir(userDataPath, { recursive: true, mode: 0o700 })` and before `spawn`, passes that numeric descriptor as the third `stdio` member, and closes its own copy of the descriptor immediately after `spawn` returns. The delivered address-in-use contract is preserved by reading a bounded 4,096-byte prefix of that file inside the `exit` handler and applying the unchanged `/EADDRINUSE|address already in use/iu` test to produce `RuntimeExit.addressInUse`. Nothing else about the launch, argv, environment, cwd, port reservation, readiness, or collision retry changes. The file is never published, never copied into evidence, and is removed with its runtime-data directory on exit or termination — including by an adopted handle, which therefore restores cleanup ownership of a survivor's directory.

### 7. Events

`RuntimeLifecycleEvent['event']` grows from **9** to **13**:

| Event | from | to | Public state | Emitted once per |
|---|---|---|---|---|
| `runtime.reconcile.requested` | `stopped` | `reconciling` | `Starting` | registered project at installation |
| `runtime.reconcile.succeeded` | `reconciling` | `running` | `Running` | adopted project |
| `runtime.reconcile.absent` | `reconciling` | `stopped` | `Stopped` | absent project |
| `runtime.reconcile.failed` | `reconciling` | `failed` | `Failed` | unresolved project, with `classification: 'reconcile-unconfirmed'` |

`PUBLIC_STATE_BY_LIFECYCLE_EVENT` gains those four rows and the delivered agreement check applies unchanged. Reconciliation emits **no** `runtime.start.*`, `runtime.stop.*`, `runtime.restart.*`, or `runtime.health.changed` event, because it performs none of those actions. A project reconciled while manager shutdown aborts the attempt emits its `requested` event and **no** terminal event; the abandoned attempt claims nothing.

Revision 2 adds one clarification that the evidence validator enforces: the `runtime.health.changed` emitted by the delivered acquisition path when it corrects a stale adopted `Running` (section 5) is a **start-path** event, legal only on a row whose `declaredActions` includes `'acquire'`, and it is never recorded as a reconciliation event.

### 8. Complete vocabulary and cardinality ledger

| Vocabulary | Before | After | Delta | Changed in revision 2? |
|---|---:|---:|---|---|
| `PUBLIC_RUNTIME_STATES` | 4 | **4** | unchanged | no |
| `RUNTIME_STATES` (snapshot) | 3 | **3** | unchanged | no |
| `RUNTIME_ENTRY_STATES` | 6 | **7** | `+ reconciling` | no |
| `RUNTIME_LIFECYCLE_TARGETS` | 6 | **7** | `+ reconciling` | no |
| `RuntimeLifecycleEvent['event']` | 9 | **13** | `+ 4 reconcile events` | no |
| `RUNTIME_FAILURE_CATEGORIES` | 18 | **19** | `+ reconcile-unconfirmed` | no |
| `RUNTIME_STOP_REJECTION_CATEGORIES` | 7 | **9** | `+ reconcile-in-progress`, `+ reconcile-unresolved` | no |
| `RUNTIME_RESTART_REJECTION_CATEGORIES` | 7 | **9** | same two | no |
| `RUNTIME_STOP_ROUTE_ERROR_CATEGORIES` | 10 | **12** | `+ runtime_reconcile_in_progress` (409), `+ runtime_reconcile_unresolved` (409) | no |
| `RUNTIME_RESTART_ROUTE_ERROR_CATEGORIES` | 10 | **12** | same two, same statuses | no |
| `WORKBENCH_FAILURE_TABLE` | 29 | **30** | `+ runtime:reconcile-unconfirmed` -> 503 `workbench_reconcile_unconfirmed` | no |
| `WORKBENCH_FAILURE_TABLE` `runtime:` subsequence | 17 | **18** | mechanical | no |
| web `RUNTIME_FAILURE_CATEGORIES` / `RUNTIME_FAILURE_NOTICES` | 18 | **19** | mirror | no |
| web `RUNTIME_STOP_ERROR_CATEGORIES` / notices / statuses | 10 | **12** | mirror | no |
| web `RUNTIME_RESTART_ERROR_CATEGORIES` / notices / statuses | 10 | **12** | mirror | no |
| `RECONCILE_OUTCOMES` | — | **3** | new | no |
| `RECONCILE_ABSENCE_PROOFS` | — | **2** | new | no |
| `RECONCILE_REFUSAL_REASONS` | — | **18** | new | **yes** (16 -> 18: `-executable-mismatch`, `+launcher-prefix-mismatch`, `+launcher-unresolved`, `+group-scan-incomplete`) |
| `ProjectRuntimeConfig` members | 11 | **17** | six reconcile members | **yes** (was 15: `+reconcileStartupHeadroomMs`, `+reconcileResponseAllowanceMs`) |
| exported reconciliation bound functions | — | **5** | `reconciliationOverallBoundMs`, `reconciliationEndToEndBoundMs`, `reconciliationStartupControlBoundMs`, `workbenchAcquisitionBoundMs`, `acquisitionAcrossReconciliationBoundMs` | **yes** (was 3) |
| `RuntimeProcessDependencies` members | 5 | **6** | `+ attribution` | no |
| `RuntimeAttributionPrimitives` members | — | **7** | new | **yes** (was 5: `+resolveInstalledRuntimeIdentity`, `+readProcessGroupMemberPids`) |
| `ProjectRuntimeManager` members | 13 | **15** | `+ beginReconciliation()` **required**, `+ inspectReconciliation?()` optional | **yes** (`beginReconciliation` was optional) |
| `BL019_DECLARED_BOUNDS` entries | — | **13** | new | **yes** (revision 1 said "ten", unenumerated) |
| `BL019_SCENARIOS` | — | **66** | new | **yes** (was 57) |
| source-guard codes | — | **20** | new | **yes (r3)** (r1 14 -> r2 18 -> r3 20: `+reconcile-matrix-observed-rows`, `+reconcile-designated-real-api`) |
| matrix mutation classes | — | **12** | new | **yes (r3)** (r1 9 -> r2 11 -> r3 12: `+M-12` execution witness) |
| `SelectedReconcileSources` members | — | **13** | new | **yes (r3)** (r2 10: `+matrixFixtures`, `+designated`, `+controlWitness`) |
| `RuntimeReconcileEvidenceRow` members | — | **+1 `execution`** | new | **yes (r3)** (section 12a; `execution`'s own nested members corrected in r4, top-level count unchanged) |
| designated episode `phaseOrder` entries | — | **18** | new | **yes (r3)** (r2 16: `+P0c`, `+P0d`) |
| `validateReconcileEpisode` rejection reasons | — | **15** | new | **yes (r3)** (r2 3: `+12` generation-authenticity and control-isolation reasons) |
| typed `ProjectRuntimeManager` test doubles to migrate | 16 | **16** | all must gain `beginReconciliation` | **yes** (revision 1 required none) |

**Revision 3 delta, exactly.** Every value in the ledger above that is not named here is unchanged in revision 3.

| Item | Revision 2 | Revision 3 | Why |
|---|---:|---:|---|
| source-guard codes | 18 | **20** | executable-evidence enforcement (section 12) |
| matrix mutation classes | 11 | **12** | `M-12`, the execution witness (section 12a) |
| `SelectedReconcileSources` members | 10 | **13** | the two guarded test sources plus the witness module |
| `RuntimeReconcileEvidenceRow` members | — | **+1** | `execution` (section 12a) |
| designated episode phases | 16 | **18** | `P0c` control subepisode, `P0d` clearance (section 11) |
| `validateReconcileEpisode` rejection reasons | 3 | **15** | generation authenticity and control isolation (sections 12b, 12c) |
| `BL019_SCENARIOS` | 66 | **66** | unchanged; the repair required no catalog change |
| `RECONCILE_REFUSAL_REASONS` | 18 | **18** | unchanged |
| `BL019_DECLARED_BOUNDS` | 13 | **13** | unchanged; the subepisode reuses declared bounds only |
| `ProjectRuntimeConfig` members | 17 | **17** | unchanged |
| `ProjectRuntimeManager` members | 15 | **15** | unchanged |
| AC IDs | 22 | **22** | unchanged, in issue order |

**Revision 4 delta, exactly.** Revision 4 changes no count in either table above. It changes only the nested member set and the total rules of the `execution` record fixed in section 12a.

| Item | Revision 3 | Revision 4 | Why |
|---|---:|---:|---|
| `RuntimeReconcileEvidenceRow` members | **+1 `execution`** | **+1 `execution`** | unchanged; the repair is entirely inside `execution` |
| `execution` nested members | 6 (`runId`, `managerInstances`, `primitiveCalls`, `projectionCalls`, `eventSinkWrites`, `observedFrom`) | **7** (`+ probeHealthByProject`) | section 12a, R4-1 |
| `primitiveCalls` counter keys | 8 | **8** | unchanged keys; `probeHealth` is redefined as an aggregate total with no per-project claim |
| source-guard codes | 20 | **20** | unchanged |
| matrix mutation classes | 12 | **12** | unchanged; `M-12`'s content is made project-keyed and total |
| `BL019_SCENARIOS` | 66 | **66** | unchanged |
| tasks / validations / AC IDs | 15 / 20 / 22 | **15 / 20 / 22** | unchanged |
| episode phases / rejection reasons | 18 / 15 | **18 / 15** | unchanged |

**Revision 5 delta, exactly.** Revision 5 changes **no count anywhere in this plan**. It changes the body of two source guards, the fixture set of one mutation class, the declared input and name of one scenario, one task item of documentation content, and one production helper that is module-local by construction.

| Item | Revision 4 | Revision 5 | Why |
|---|---:|---:|---|
| `RECONCILE_REFUSAL_REASONS` | 18 | **18** | `group-scan-incomplete` names both sub-branches of check 9; no class is added or split (13a) |
| source-guard codes | 20 | **20** | `reconcile-listener-group-scoped` and `reconcile-deadline-trusted-scheduler` are extended in place (13a, 13b) |
| matrix mutation classes | 12 | **12** | `M-9` gains one fixture; no class is added (13a) |
| `BL019_SCENARIOS` | 66 | **66** | `S-17` changes its declared input and name only (13a) |
| `BL019_DECLARED_BOUNDS` | 13 | **13** | the poll gap declares no bound and `config.pollIntervalMs` is not promoted (13b) |
| `ProjectRuntimeConfig` / `ProjectRuntimeManager` / `RuntimeProcessDependencies` / `RuntimeAttributionPrimitives` members | 17 / 15 / 6 / 7 | **17 / 15 / 6 / 7** | `awaitTrustedReconciliationDelay` is module-local and exported nowhere (13b) |
| `SelectedReconcileSources` members | 13 | **13** | both extended guards read sources already declared |
| `RuntimeReconcileEvidenceRow` members / `execution` nested members | +1 / 7 | **+1 / 7** | the schema was already correct |
| episode phases / rejection reasons | 18 / 15 | **18 / 15** | the designated episode is unchanged |
| tasks / validations / AC IDs | 15 / 20 / 22 | **15 / 20 / 22** | six tasks reopen; none is added, removed, or renumbered |

`BL019_DECLARED_BOUNDS`, enumerated exactly (**13**): `reconcileScanAllowanceMs` 2,000; `reconcileAttributionAllowanceMs` 1,000; `reconcileReadinessBoundMs` 7,000; `reconcileSettlementAllowanceMs` 1,000; `reconcileStartupHeadroomMs` 3,000; `reconcileResponseAllowanceMs` 1,000; `reconciliationOverallBoundMs` 11,000; `reconciliationStartupControlBoundMs` 4,000; `reconciliationEndToEndBoundMs` 15,000; `workbenchAcquisitionBoundMs` 60,000; `acquisitionAcrossReconciliationBoundMs` 71,000; `runtimeStopOverallBoundMs` 5,000; `runtimeRestartOverallBoundMs(config, false)` 66,000.

Fixed safe messages (no path, port, pid, command, or host detail) — unchanged from revision 1:
- `RUNTIME_FAILURE_MESSAGES['reconcile-unconfirmed']` = `'Workbench recovery could not confirm this runtime; restart Ascend after resolving the workbench.'`
- web `RUNTIME_FAILURE_NOTICES['reconcile-unconfirmed']` = `'Ascend could not confirm this workbench after a restart.'`
- web `RUNTIME_STOP_NOTICES` / `RUNTIME_RESTART_NOTICES` `runtime_reconcile_in_progress` = `'Ascend is still recovering this workbench. Retry after recovery settles.'`
- web `RUNTIME_STOP_NOTICES` / `RUNTIME_RESTART_NOTICES` `runtime_reconcile_unresolved` = `'Ascend could not confirm this workbench after a restart.'`
- `WORKBENCH_FAILURE_TABLE` row: category `runtime:reconcile-unconfirmed`, status **503**, code `workbench_reconcile_unconfirmed`, message `'Workbench recovery could not be confirmed.'`

### 9. Evidence, capture order, and teardown (revision 2)

Two claims that revision 1 conflated are separated permanently, and neither may be assigned by hand.

- **`residualCount`** is a claim about the **pre-restart identity a row reconciled**. It is the integer `0` if and only if the row's `absenceProven` is `true` — that is, every project on the row settled `absent` with a non-null absence proof — and it is `null` otherwise. An adoption publishes `null`, because a live owned runtime is not a zero residual.
- **Teardown** is a claim about **everything the designated episode itself created**. It does not exist on matrix rows at all: those rows run entirely on injected primitives and create no host resource, so revision 1's row-level `teardownResidualCount: 0` was a fabricated constant and is removed.

The designated episode's capture order is fixed and failure-safe:

1. **P10 — pre-teardown capture, survivors deliberately alive.** Write `test-results/bl-019/designated-episode.json` with the full observed record, `residualCount: null`, and `teardown: null`. `null` here means "teardown has not been attempted", and the artifact is honest and complete at that instant. Correctly owned survivors are still running, exactly as AC-19 requires.
2. **P11 — teardown.** Gracefully stop the API generation, terminate every remaining validation-owned identity through the delivered sequencer, stop the controls, and remove the disposable fixtures, database, and runtime-data directories.
3. **P12 — independent re-observation.** Re-probe every recorded identity, owned group, listener, and disposable path and build the observed record `{ probesCompleted, residuals: { apiProcesses, workbenchProcesses, attributableDescendants, listeners, activeRequests, disposableFixtures } }`. Each count is derived from a completed probe; an incomplete probe is not a zero.
4. **P13 — atomic finalization.** Write the finalized episode to a temporary file in the same directory and `rename()` it over the artifact, so no partially finalized artifact can ever be observed. `teardown.status` is `'proven-clear'` only when every probe completed and every residual is `0`; otherwise it is `'unproven'` (a probe did not complete) or `'residual-present'` (a completed probe observed a residual), and the episode is a **non-success artifact**.

`just proof-runtime-reconcile-residual-audit` is the independent authority and never trusts an assigned value. It rejects a missing, malformed, or unparseable artifact; rejects `teardown: null`; rejects any `teardown.status` other than `'proven-clear'`; **recomputes** all six residual classes out of process from the recorded identities and paths; rejects any class whose recomputed value differs from the episode's; rejects any incomplete probe; and exits non-zero on any non-zero residual. Cleanup cannot mask it, because the recorded identities and paths are what it probes, and a removed or truncated artifact is a rejection rather than a pass.

### 10. Scope boundaries held

Not in this issue and not implemented: BL-020 running-or-failed Close, BL-021, BL-022, adoption of any process outside the conjunction, multi-host or multi-user operation, automatic or periodic health monitoring of any runtime including adopted ones, auto-sleep, scheduling, quotas, bulk lifecycle actions, persisted runtime state, a new public state, a browser polling or streaming surface, and any change to Project Home's admission, focus, or refresh cardinality.

### 11. The control subepisode, decided (revision 3)

The designated episode gains one bounded subepisode that runs **before any survivor exists**, and one rule for the control that remains beside the survivors. It uses the real compiled API, a real disposable SQLite database, real registration through the delivered route, real live controls, and the delivered production predicate. It launches nothing and signals nothing.

**Timing, fixed. Each numbered step completes before the next begins.**

| Step | What happens | Bound (ms) |
|---|---|---:|
| 1 | Create a disposable control root; two control fixtures `control-c1/` and `control-c3/`, each a recursive byte copy of the BL-001 fixture; the foreign-installation tree `foreign-root/`; and an empty disposable control database. `ASCEND_PROJECT_ALLOWED_ROOTS` covers the control root only. | — |
| 2 | Spawn compiled API generation `C0` against the control database; register `K-1` (`control-c1/`) and `K-3` (`control-c3/`) through the delivered registration route; read both records back through `GET /api/projects`; record each `id`, `deriveProjectOwnerToken(id)`, canonical path, and `createdAt`. | 15,000 |
| 3 | Stop `C0` gracefully with `SIGTERM` through the delivered controller and confirm its process is absent. No workbench was acquired, so nothing survives it. | 5,000 |
| 4 | Spawn control **`C-1`**: a detached `node -e` idle process, its own process-group leader, whose **final argument is `K-1`'s exact canonical path** and which presents no `--user-data-dir`. Observed marker set: `pathMarker = K-1`, `tokenMarker = none`. Sole candidate for `K-1`. | — |
| 5 | Spawn control **`C-3`**: through `<foreign-root>/bin/code-server` — a byte copy of the delivered launcher whose `ROOT` resolves to `<foreign-root>` and whose `lib/node` is a symlink to the real bundled interpreter — with an argument vector byte-identical to `buildRuntimeArgv(K-3.canonicalPath, port3, buildRuntimeUserDataPath(deriveProjectOwnerToken(K-3.id), port3))`. Its entry module binds `127.0.0.1:port3`, serves the delivered `/healthz/` ready body, and idles; it creates no runtime-data directory. Observed `/proc/<pid>/cmdline` is `[<foreign-root>/lib/node, <foreign-root>, ...expected]`. Observed marker set: `pathMarker = K-3`, `tokenMarker = K-3`. Sole candidate for `K-3`. | — |
| 6 | Assert **sole candidacy by observation, before the pass**: over the whole live candidate set, exactly one process carries a marker for `K-1` and exactly one carries a marker for `K-3`, each computed from observed argument vectors. | 2,000 |
| 7 | **Public witness.** Spawn compiled API generation `C1` against the same control database, measuring with `process.hrtime.bigint()` from its spawn instant to the first `GET /api/projects/runtime` in which no registered project reports `Starting`. | 15,000 |
| 8 | Assert the public settlement: `K-1` and `K-3` both report `Failed` with the public failure category `reconcile-unconfirmed`; no other public state appears; zero workbench processes exist; zero signals reached either control; both controls are alive with byte-identical identities and `C-3` still holds `port3`. | — |
| 9 | Assert the delivered blocked surfaces against the same live evidence: `GET /projects/{K-1}/workbench/` and `GET /projects/{K-3}/workbench/` each return **503** `workbench_reconcile_unconfirmed` and launch nothing; Stop returns **409** `runtime_reconcile_unresolved`; Restart returns **409** `runtime_reconcile_unresolved`; no lifecycle event is emitted for any of them. | 60,000 / 5,000 / 66,000 |
| 10 | **Refusal-class witness.** With both controls still alive, run one further production reconciliation in process — `createProjectRuntimeManager` with the **default** attribution primitives and a delivered `createProjectLibrary(<control database>)` — and read `inspectReconciliation()`. `K-1` and `K-3` must each settle `unresolved` with `refusalReason: 'launcher-prefix-mismatch'`. This is the production predicate over real host evidence, not a helper call; the internal class is deliberately absent from every HTTP surface, so it is witnessed in the one place it legitimately exists. Shut the witness manager down; it adopted nothing, so it signals nothing. | 15,000 |
| 11 | Stop `C1` gracefully; terminate `C-1` and `C-3` through the delivered exact-identity sequencer; remove the control database, both control fixtures, and the foreign-root tree. | 30,000 |
| 12 | **Independent re-observation, outside the teardown code path.** Re-probe: both control identities absent; both control API generations absent; `port3` holding no loopback listener; `<tmpdir>/ascend-runtime-data/<K-3 owner token>-<port3>` absent, because nothing created it; and the control root, control database, and foreign-root paths absent. Each class carries its own `probeCompleted` flag, and a class whose probe did not complete is never reported as a zero. | 15,000 |
| 13 | The episode proceeds to `P1` **only** when every class in step 12 is a completed-probe zero. Otherwise it fails here, writes its non-success artifact, and registers no main-episode project. | — |

**The control that stays.** `C-2` — a real listener process, in its own process group, holding a loopback port previously used by a terminated workbench — carries **neither** marker: its argument vector's final element is not a registered canonical path and it presents no `--user-data-dir`. It is therefore not a candidate for any project and cannot make any project ambiguous. The episode proves that by observation, computing both markers for `C-2` against every registered project and requiring `none`/`none`, and the healthy pass corroborates it independently: had `C-2` been a candidate for either project, both projects would have settled `Failed` with `ambiguous-candidates` instead of `Running`. `C-2`'s `listener-not-owned` result remains a **helper-level** host-fidelity control over `resolveGroupListenerOwner`, for the reason already recorded in `03-test-plan.md` V-4: a candidate that reaches check 11 on a real host always holds its own declared port, so the whole-predicate class is expressible only with injected primitives, where `S-19` and `S-20` carry it. That boundary is recorded in the evidence rather than implied.

**Why `C-3`'s markers name a control project rather than Project A.** An owner token is `deriveProjectOwnerToken(projectId)` over a registration-assigned id, and a marker means nothing except against a project registered in the pass that observes it. Binding `C-3` to its own registered `K-3` preserves the adversarial property exactly — byte-perfect for a genuinely registered project, differing only in installation root, holding a real listener, and satisfying readiness — while making its refusal observable. Binding it to Project A can only ever produce `ambiguous-candidates`, which is what the blocker demonstrated.

**The same rule governs the real-host conformance proof.** `V-4` registers **two** fixture projects — one for the genuinely spawned workbench and one for its foreign-installation control — so its single production pass has exactly one candidate per project and settles `adopted` for one and `launcher-prefix-mismatch` for the other. Revision 2's V-4 left both processes marked for one fixture project, which had the same latent conflict.

### 12. Executable evidence, decided (revision 3)

Two claims in this plan were satisfiable without running anything. Both are now defined so that an artifact is a record of execution.

#### 12a. A scenario row must be produced by executing production code

Every one of the 66 rows is produced by invoking a real `ProjectRuntimeManager`, its admission and acquisition paths, the delivered route handlers where the row declares a route-issued control, and `reportPublicStates`, with **injected** attribution, process, health, port, and deadline-scheduler dependencies. Every observed member of the row is read back from that run: `outcome`, `refusalReason`, `absenceProof`, and per-project settlement timing from `inspectReconciliation()`; `publicState` and `postActionPublicState` from `reportPublicStates`; `events` and `eventCount` from the recorded event sink; `launches`, `signalsSent`, `signalsDelivered`, `acquisitions`, and listener attribution from the injected primitives' call ledger; `elapsedMs` from the injected monotonic clock; and `adoptedLiveness` from one exported derivation over the observed row.

**These may not count:** constructing a row from the catalog constants, mapping an expected value into a row, serializing a static fixture, re-reading the committed artifact, or validating an artifact that this run did not produce.

**Per-row execution witness.** Each row carries one `execution` record whose values only a real run can produce, and which the validator cross-checks against the row's own settled outcomes, **project by project**:

| Member | Meaning | Total rule |
|---|---|---|
| `runId` | opaque `bl019-run-<slug>` | unique across the artifact; never a scenario identifier |
| `managerInstances` | managers constructed for this row | `>= 1` on every row |
| `primitiveCalls` | observed invocation counts of `resolveInstalledRuntimeIdentity`, `listCandidatePids`, `readProcessCommandLine`, `readProcessAttributionIdentity`, `readProcessGroupMemberPids`, `readLoopbackListenerInode`, `readProcessSocketInodes`, and `probeHealth` — **row-level aggregate totals that carry no per-project claim** | zero-project row: every counter `0`; every other row: `resolveInstalledRuntimeIdentity >= 1` and `listCandidatePids >= 1` |
| `primitiveCalls.probeHealth` (revision 4: aggregate only) | every health-adapter invocation this row's ledger observed, whatever its origin — reconciliation readiness polling, start-path liveness, and delivered on-demand correction alike | at least the sum of `probeHealthByProject`'s values on every row, and **equal** to that sum on every row whose `managerInstances` is `1` and whose `declaredActions` is empty |
| `probeHealthByProject` (revision 4) | `Readonly<Record<opaqueProjectToken, number>>` — the reconciliation readiness observations attributed to each project of this row, counted per project and independently | keys are **exactly** the row's `projects[*].projectToken`: same set, same cardinality, no missing key, no extra key, no foreign token; the zero-project row records `{}`; every value is a non-negative integer; per-project totals are fixed by the table below |
| `projectionCalls` | `reportPublicStates` invocations | `>= 1` on every row with a non-empty `publicStates` |
| `eventSinkWrites` | records the event sink actually received | equals `events.length` |
| `observedFrom` | the observed sources this row was read from | non-empty; contains `manager-inspection` when `inspection` is non-null, `public-projection` when `publicStates` is non-empty, `event-sink` when `events` is non-empty, `primitive-ledger` on every row whose `projects` is non-empty, since `probeHealthByProject` and the signal, launch, and listener counts are read from it, and `route-response` on every row whose declared control is issued through a route |

**The per-project readiness rule, total over every settlement class (revision 4).** Revision 3 stated this invariant per project but recorded it in one row-level counter, so a mixed row could be required to hold both `0` and `>= 1`, or could hide an illegal readiness probe issued for an early-refused peer behind a legitimate one. The rule below is evaluated for each key of `probeHealthByProject` against **that project's own** recorded outcome, refusal reason, and absence proof, and it is read directly off the evaluation order fixed in section 1b. No any/all row-level form of this rule exists anywhere in this plan.

| Recorded settlement for project `P` | Where `P`'s evaluation stopped | `probeHealthByProject[P]` |
|---|---|---|
| `adopted` | check 12 satisfied, then check 13 satisfied | `>= 1` |
| `unresolved` / `readiness-unconfirmed` | check 12 attempted and never satisfied inside `reconcileReadinessBoundMs` | `>= 1`, and typically far more, because check 12 re-attempts across trusted-scheduler poll gaps of at most `config.pollIntervalMs` (section 13b) |
| `unresolved` / `identity-unstable` | check 13, which the order reaches only after check 12 | `>= 1` |
| `unresolved` / `launcher-unresolved`, `ambiguous-candidates`, `uid-mismatch`, `launcher-prefix-mismatch`, `canonical-path-mismatch`, `owner-token-mismatch`, `port-mismatch`, `argv-mismatch`, `not-group-leader`, `group-scan-incomplete`, `listener-absent`, `listener-not-owned` | checks 0 … 11, every one of them strictly before readiness | exactly `0` |
| `absent` / `no-candidate-complete-scan` | no candidate existed, so no conjunction ran for `P` | exactly `0` |
| `absent` / `candidate-audit-triple-absent`, `unresolved` / `absence-unconfirmed` | the candidate disappeared, which section 1b and T-3 step 4 permit **at any point** — before the readiness poll or during it | `>= 0`, not constrained by class |
| `unresolved` / `deadline-exceeded` | the armed deadline aborts wherever the evaluation had reached | `>= 0`, not constrained by class |
| `unresolved` / `manager-shutdown`, or `unsettled` (still pending at capture) | the pass was aborted, or had not settled `P` when the row was captured | `>= 0`, not constrained by class |

The three unconstrained families are unconstrained **by class only**, and that is deliberate: the evaluation order genuinely does not determine whether the interruption landed before or after check 12, and a rule that pretended otherwise would make a legal execution unrecordable — the exact failure being repaired. They are not unconstrained in substance, because each count is still an observed ledger value keyed to its own project: no peer's probe can be attributed to them, and their presence can never relax the exact `0` another project on the same row must record.

**Aggregation, when a project is observed more than once.** `probeHealthByProject` counts only the readiness observations issued by the reconciliation pass the row's own `inspection` record was captured from — the **witnessed pass** — so the per-project rule stays exact for a row that constructs several managers. Within that pass a project's count is the sum over every candidate and readiness observation its evaluation issued, including every poll attempt inside `reconcileReadinessBoundMs`; there is no upper bound, because check 12 re-attempts across trusted-scheduler poll gaps (section 13b). A row with `managerInstances > 1` (`S-27`, `S-55`, `S-56`) accumulates its earlier passes' readiness observations in `primitiveCalls.probeHealth` alone, which is exactly why the sum relation is an inequality there and an equality on a single-pass row with no declared action.

**Attribution, from the injected primitive call ledger only.** Every health-adapter call the injected dependency receives is appended to the ledger with the loopback authority it was asked to probe and the manager instance that issued it. A ledger entry is counted in `probeHealthByProject[P]` when its manager instance is the witnessed pass's **and** its authority is the declared authority of the candidate the scenario injected for `P`. Both are observed values — a recorded call argument and a declared scenario input — so no outcome, refusal class, public state, or other expectation participates in the count, and `reconcile-matrix-observed-rows` keeps every such literal out of the fixture module. Two fail-closed rules keep the attribution honest rather than convenient: an entry from the witnessed pass whose authority matches injected candidates of **more than one** registered project fails the row as `probe-unattributable` instead of being assigned by guess; and an entry whose authority is a port the injected allocator issued to a launched runtime is a start-path probe, is excluded from every project's map, and is counted only in the aggregate.

This rule is the load-bearing one: each project's count is an emergent consequence of where the fixed evaluation order stopped for that project, so an author who copies expectations into rows cannot satisfy it — and, unlike revision 3's row-level counter, it stays inhabitable and total on every mixed row. `S-28` records `>= 1` for its adopted project and an unconstrained observed count for its `deadline-exceeded` peer; `S-29` records `>= 1` for its adopted project, exactly `0` for its `no-candidate-complete-scan` project, its unresolved project's own class rule, and an unconstrained count for its pending project; `S-30`, `S-31`, and `S-47` follow their own projects' classes; `S-53` records an unconstrained count per project under `manager-shutdown`; and `S-57` records `>= 1` for its adopted project and the exact class rule for its unresolved peer.

**Mechanical enforcement.** One new source guard, `reconcile-matrix-observed-rows`, over `apps/api/test/runtime-reconcile-fixtures.ts`: the module must contain **zero** string literals drawn from `RECONCILE_OUTCOMES`, `RECONCILE_REFUSAL_REASONS`, `RECONCILE_ABSENCE_PROOFS`, `PUBLIC_RUNTIME_STATES`, the four reconciliation event names, `reconcile-unconfirmed`, and the four `adoptedLiveness` values; must contain `createProjectRuntimeManager(`, `inspectReconciliation(`, and `reportPublicStates(`; must not read the committed artifact or any JSON fixture; and must assign every observed row member from the run record rather than from a catalog lookup. Scenario **inputs** — declared actions, declared kills, bounds, identifiers, names, and AC lists — remain catalog-derived and are exempt by name. One new mutation class, **M-12**, rejects an execution-witness mutation: a missing `execution` record, `managerInstances: 0`, a `probeHealthByProject` key set that is not exactly the row's project tokens (a missing key, an extra key, or a foreign token), a per-project count that contradicts that project's own recorded class (a nonzero count on a project refused before readiness, or a zero count on a project that settled `adopted`, `readiness-unconfirmed`, or `identity-unstable`), a cross-peer swap of two peers' counts on a mixed row — caught because every count is checked against **its own** project's recorded class, so any swap between projects whose classes differ in readiness reachability fails, while a swap between two projects holding equal counts produces a byte-identical artifact and is therefore no mutation at all — a `primitiveCalls.probeHealth` below the map's sum or unequal to it on a single-pass action-free row, an `eventSinkWrites` that disagrees with `events.length`, a duplicated `runId`, or an `observedFrom` that omits a source the row's own members require.

#### 12b. An API generation must be the repository's compiled API

`API_COMPILED_ENTRY` is `apps/api/dist/server.js`, built by the `proof-runtime-reconcile` recipe before the proof runs. Every generation claimed anywhere in the designated episode — the startup control, the control subepisode's `C0` and `C1`, and the main episode's generations 0 … 3 — is spawned as `spawn(process.execPath, [API_COMPILED_ENTRY], { env })` with a disposable `ASCEND_DATABASE_URL`, a fixed `ASCEND_PORT`, an `ASCEND_PROJECT_ALLOWED_ROOTS` covering only that episode's disposable root, and a fixed `ASCEND_FRONT_DOOR_TOKEN`, and is recorded as:

```
{ generation, pid, processStartTime, argv,           // argv read from /proc/<pid>/cmdline after spawn
  listenerPort, listenerInode, listenerOwnerPid,     // OS-observed; the owner must be this pid
  httpRequests: { issued, succeeded },               // real loopback HTTP through the delivered routes
  database: { path, bytes, projectRowsObserved },    // the disposable SQLite file this generation served
  spawnedAt, settlementElapsedMs, boundMs, pendingObserved }
```

**These may not count:** a `node -e` or `--eval` process, an in-process Fastify application or `createProjectRuntimeManager` instance presented as a generation, a synthesized generation record, an assigned identity, an argument vector that was not read from `/proc`, a listener attributed to any pid other than the generation's own, a generation with zero succeeded HTTP requests, or a database claim with no observed file.

**Mechanical enforcement.** The episode validator rejects, by name: `generation-not-compiled-api` (`argv[1]` does not end with `apps/api/dist/server.js`), `generation-eval-spawn` (`argv` contains `-e`, `--eval`, `-p`, `--print`, or `--input-type`), `generation-listener-unobserved` (`listenerOwnerPid !== pid`, or a missing inode), `generation-http-absent` (`httpRequests.succeeded < 1`), and `generation-database-unobserved` (a missing path, `bytes <= 0`, or a null `projectRowsObserved`). One new source guard, `reconcile-designated-real-api`, over `apps/api/test/runtime-reconcile-designated.test.ts` and `apps/api/test/runtime-reconcile-control-witness.ts`, requires the designated test to reference `API_COMPILED_ENTRY` and forbids it from containing `createProjectRuntimeManager`, `buildApp(`, `createApp(`, or any import from `../src/app.js`. The in-process refusal-class witness of section 11 step 10 therefore lives in its own module, which must use `defaultRuntimeAttributionPrimitives` and `createProjectLibrary` and whose result may never be recorded as a generation. `C-1` remains a legitimate `node -e` **control**, and is distinguishable mechanically because a control is never a generation record.

#### 12c. Control isolation is enforced on observed evidence

The episode validator additionally rejects, by name: `control-subepisode-missing`; `control-not-sole-candidate` (an observed candidate count other than 1 for a control's registered project); `control-settlement-mismatch` (a public settlement other than `Failed` with `reconcile-unconfirmed`, or an observed refusal reason other than the declared one); `control-signalled` (`signalsSent > 0`, or an observed liveness or identity change before its own teardown); `control-not-cleared-before-main-episode` (a control residual class that is not a completed-probe zero, or a clearance recorded at or after `P1`); `main-episode-control-candidate-bearing` (a coexisting control whose observed `pathMarker` or `tokenMarker` is non-null); and `phase-order-mismatch` (a `phaseOrder` other than the eighteen declared phases in their declared order).

### 13. Revision 5 corrections, decided

Three verified defects are repaired here and nowhere else. Each subsection is complete: Implement executes it and designs nothing.

#### 13a. Check 9 is two conjuncts, and both refuse before the listener is read

**What is wrong.** `resolveGroupListenerOwner` in `apps/api/src/project-runtime-process.ts` refuses `group-scan-incomplete` on `!group.complete` and then calls `readLoopbackListenerInode`. A `{ complete: true, pids: [] }` observation, and a `{ complete: true, pids: [<forked member>] }` observation that omits the candidate leader, both reach the listener lookup and can only be refused later — or, if a conforming member happens to hold the inode, not refused at all. Check 9 of section 1b and the core-component conjunction require the enumeration to complete **and contain** the candidate.

**Which source owns the candidate leader identifier.** The attribution boundary that already proved leadership owns it: the manager passes its attributed candidate root pid as the helper's leader argument, after check 8 has proven `candidateIdentity.processGroupId === candidate.pid`. The delivered parameter is named `processGroupId` and carries exactly that value; **it is not renamed**, because the candidate leader's pid and its process-group id are the same integer by check 8 and a rename would be churn. The helper must never derive, default, re-read, or infer the leader identifier from `readProcessGroupMemberPids`' result: that result is the set under test, never the authority for what it is tested against.

**The exact membership comparison.** `group.pids.includes(input.processGroupId)` — strict numeric identity against the enumerated member pids, which the primitive already returns as parsed integers. Forbidden: string coercion of either side, re-parsing a member entry, a prefix or substring test, a cardinality test, and any inference that a non-empty member set implies membership.

**Evaluation order inside the helper, fixed and total.**

| # | Step | On failure |
|---|---|---|
| 1 | `primitives.readProcessGroupMemberPids(processGroupId, signal)` | — |
| 2 | `group.complete` is `true` | `group-scan-incomplete` |
| 3 | `group.pids.includes(processGroupId)` is `true` | `group-scan-incomplete` |
| 4 | `primitives.readLoopbackListenerInode(port, signal)` returns an inode | `listener-absent` |
| 5 | exactly one conforming member holds that inode | `listener-not-owned` |

Steps 2 and 3 are adjacent, and no listener, file-descriptor, identity, argument-vector, or health primitive may be called between step 1 and a step-3 refusal. Nothing else in the helper changes: the conforming-member definition, the `listener-absent` and `listener-not-owned` semantics, and the leader-or-forked-member rule are exactly as fixed in section 1c.

**Refusal class.** `group-scan-incomplete`, for both sub-branches. `RECONCILE_REFUSAL_REASONS` stays at **18**; no class is added, split, renamed, or reordered, and the declaration order of section 2 is unchanged. Its meaning, stated once for every artifact: *the bounded enumeration of the candidate's own process group did not complete, or completed without containing the candidate leader.*

**Expected consequences of the refusal, which the evidence must show.** For the refused project, within that pass: `readLoopbackListenerInode` **0** calls; `readProcessSocketInodes` **0** calls; no further identity or argument-vector read for that candidate; `probeHealth` **0** calls, hence `probeHealthByProject[P] === 0` under the unchanged section-12a class rule, which already lists `group-scan-incomplete` in the exactly-zero family; `listenerAttributed: 0`; `listenerOwner: null`; `launches: 0`; `signalsSent: 0`; `outcome: 'unresolved'`; `publicState: 'Failed'`; `publicFailureCategory: 'reconcile-unconfirmed'`; and the delivered two-event record (`requested`, then `failed`).

**Mechanical enforcement, by extension rather than addition.** The existing source guard `reconcile-listener-group-scoped` is extended — the guard count stays **20** and no code is renamed. Over the helper's own region of `sources.process`, sliced from `export async function resolveGroupListenerOwner` to `async function runBoundedPrimitive`, it additionally requires that the region contains `group.pids.includes(input.processGroupId)`, that its index is greater than the index of `readProcessGroupMemberPids(`, and that its index is less than the index of `primitives.readLoopbackListenerInode(`. Its negative controls are a region with the membership test removed and a region with the membership test moved after the inode lookup. The existing mutation class `M-9` is extended with one fixture rather than a new class — the count stays **12** — rejecting a project recorded with `refusalReason: 'group-scan-incomplete'` together with `listenerAttributed: 1` or a non-null `listenerOwner`.

**Deterministic coverage, with the catalog unchanged at 66 rows.** `S-17` moves to the branch the delivered code accepts: its injected `readProcessGroupMemberPids` returns `{ complete: true, pids: [<one forked member>] }`, omitting the candidate leader, and its name becomes *Process-group enumeration completes without the candidate leader*. The enumeration-did-not-complete branch keeps deterministic coverage where it already had it — `V-2`, at the helper layer, and `V-6`, at the manager layer — so both branches stay separately provable and the vocabulary coverage table is unchanged, because `S-17` still carries `group-scan-incomplete`. No scenario is added, removed, renumbered, or re-bounded; `S-17` keeps `boundMs: 11000` and its `AC-10, AC-12` mapping. Its observable row members are unchanged in value, so the committed artifact changes only in that row's `name` and in whatever the injected input makes of the recorded counters.

#### 13b. Reconciliation pacing is trusted scheduling, never an awaited fallible primitive

**What is wrong.** `probeCandidateReadiness` in `apps/api/src/project-runtime-manager.ts` awaits `processDependencies.sleep(config.pollIntervalMs, signal)` between health attempts. `sleep` is the fallible injectable primitive the architecture excludes from reconciliation: it can reject, it can be substituted, and it paces a window whose bound it does not own, so readiness pacing stops being provable from the trusted clock.

**The two uses of the trusted scheduler, kept apart.** They are different in owner, duration, and effect, and no artifact may conflate them.

| Use | Owner | Duration | Effect when it fires | Cancelled by |
|---|---|---|---|---|
| readiness **window deadline** | `runReconciliationBounded({ milliseconds: config.reconcileReadinessBoundMs, … })`, one per readiness observation | **7,000 ms** at defaults | aborts the inner controller, so the readiness observation is abandoned and the project settles by the reason its enclosing window declares | the bounded helper's existing `finally` |
| readiness **poll gap** | `awaitTrustedReconciliationDelay`, one per gap between two health attempts | at most `config.pollIntervalMs` (**50 ms** delivered), clamped as below | resolves the gap so the loop re-checks its signal and re-attempts | its own handle, and the window's abort |

The poll gap never becomes a bound: it declares nothing, is not a member of `BL019_DECLARED_BOUNDS` (**13**, unchanged), and cannot extend the 7,000 ms window it runs inside.

**The delay helper, fixed.**

```
awaitTrustedReconciliationDelay(milliseconds: number, signal: AbortSignal): Promise<void>
```

- Module-local to `apps/api/src/project-runtime-manager.ts`, declared beside `runReconciliationBounded`. It is not exported, not a `ProjectRuntimeManager` member (**15**, unchanged), not a `ProjectRuntimeConfig` member (**17**, unchanged), and not a `RuntimeProcessDependencies` member (**6**, unchanged).
- Resolves immediately when `signal.aborted` is already true on entry.
- Otherwise arms `deadlineScheduler.scheduleDeadline(Math.max(0, milliseconds), resolve)` and one `once: true` `'abort'` listener that resolves the same promise.
- Never rejects, never throws, and returns nothing, so no caller can read a value out of a pause.
- Cancels the scheduled handle and removes the abort listener on every exit path, so a callback delivered after cancellation resolves nothing, records nothing, and mutates nothing.
- Performs no observation of its own: no probe, no read, no write, no state transition. Late resolution is therefore inert by construction, on top of the section-3 and section-7 compare-and-set guards.

**The clamp, computed on the same monotonic clock.** `probeCandidateReadiness` captures `readinessDeadlineAt = deadlineScheduler.now() + config.reconcileReadinessBoundMs` immediately before it calls `runReconciliationBounded` for readiness — the same instant, on the same clock, from which that helper arms its window — and each gap awaits `awaitTrustedReconciliationDelay(Math.max(0, Math.min(config.pollIntervalMs, readinessDeadlineAt - deadlineScheduler.now())), signal)`. A gap therefore never outlives its window even before the window's abort reaches it, and no new configuration member, no second clock, and no derived bound is introduced.

**Loop semantics, unchanged except for the primitive.** The `while (!signal.aborted)` loop, the delivered `/healthz/` verdict test, `config.healthAttemptTimeoutMs` per attempt, and the enclosing bounded helper are all as delivered. After each gap the loop re-checks `signal.aborted` and issues **no** further health probe once aborted. An abort during a gap resolves the gap, exits the loop, and returns `{ completed: false }` from the bounded helper, which settles the project by its enclosing reason — `deadline-exceeded` or `manager-shutdown` — and never as `adopted`, never as `absent`, and never from a readiness verdict that was not read.

**No timer library and no new public surface.** `setTimeout`, `setInterval`, `timers/promises`, and any new dependency are forbidden on reconciliation paths; the trusted scheduler's delivered default implementation already owns the single host timer. `config.pollIntervalMs` is reused exactly as delivered.

**Preserved uses of `processDependencies.sleep`, which must not change.** Exactly two delivered call sites keep it: launched-runtime readiness polling in `apps/api/src/project-runtime-process.ts`, and the selected-Stop overall bound inside `stop` in `apps/api/src/project-runtime-manager.ts`. Reconciliation paths — installation, discovery, attribution, readiness, the identity re-read, the absence audit, settlement, the deadline, and shutdown — contain none.

**Mechanical enforcement, by extension rather than addition.** The existing source guard `reconcile-deadline-trusted-scheduler` is extended — the guard count stays **20**. It slices the reconciliation region of `sources.manager` from `const runReconciliationBounded` to `const stop = async` and additionally requires that the region contains **zero** occurrences of `processDependencies.sleep(`, `setTimeout(`, and `setInterval(`, and that it contains both `const awaitTrustedReconciliationDelay` and a `deadlineScheduler.scheduleDeadline(` call inside that helper. The end anchor is `const stop = async` precisely so the delivered selected-Stop `sleep` stays legal and unguarded. Its negative controls are a region that awaits `processDependencies.sleep(`, and a region whose delay helper is armed from anything other than the scheduler. No mutation class changes, because the defect is a source property rather than an artifact property.

**Deterministic proof that the fallible primitive cannot participate.** `V-7` and `V-16` inject a `sleep` implementation that fails when invoked, then run the readiness-polling scenarios to settlement on the injected scheduler and clock. A reconciliation that depended on `sleep` cannot settle under that control, and the polling rows (`S-21` above all) still settle exactly as catalogued, entirely on injected time. No real sleep, no retry, and no wall-clock wait enters the matrix.

#### 13c. The disclosure boundary has two tiers, and the documentation must state both

**What is wrong.** `docs/api-restart-reconciliation.md:9` places refusal reasons in one sentence with raw identities, ports, argv, installation paths, socket inodes, environment values, and raw errors, and says none of them enters "a browser-visible surface, HTTP body, or committed artifact". `T-14` item 8 carried the same conflation. The committed 66-row matrix records bounded `refusalReason` enum values by design, the evidence schema requires them, `M-3` rejects a wrong or missing one, and the ADR and core-component both permit them in trusted inspection and retained validation evidence. The documentation therefore contradicts the delivered artifact and the accepted architecture.

**Tier 1 — public surfaces: browser-visible surfaces, HTTP bodies, and lifecycle events.** Only the delivered opaque project token, the four public states, and the bounded public categories `reconcile-unconfirmed`, `runtime_reconcile_in_progress`, `runtime_reconcile_unresolved`, and `workbench_reconcile_unconfirmed`. **No refusal reason, ever.**

**Tier 2 — trusted in-process inspection and retained validation evidence, explicitly including the committed matrix and the designated episode.** Bounded enum names — the 18 refusal reasons, the 3 outcomes, the 2 absence proofs — together with opaque tokens, counts, and elapsed measurements. This is where the internal classification legitimately exists, and it is why section 11 step 10 witnesses a refusal class from `inspectReconciliation()` rather than from a public surface.

**Neither tier, ever.** Raw canonical paths, argument vectors, executable and installation paths, process identifiers, process-start times, ports, loopback authorities, socket inodes, environment values, credentials, terminal or source content, stacks, and raw errors. The privacy scan of section 12 and mutation class `M-8` already enforce exactly this list over every declared source and over the committed artifact, and neither changes.

**What must change.** `T-14` item 8 is rewritten to state the two tiers at that granularity, `docs/api-restart-reconciliation.md` is corrected in the same words, and `V-19` gains an assertion that the documented boundary matches the committed artifact rather than over-claiming. No vocabulary, schema, validator, guard, or mutation class changes, because the artifact was already right and only the prose was wrong.

---

## Acceptance Coverage

Every AC maps to implementation tasks, validation, and expected evidence. Task IDs are defined in `02-task-breakdown.md`; validation IDs in `03-test-plan.md`.

| AC | Tasks | Validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1, T-2, T-3, T-5, T-10, T-11 | V-1, V-3, V-4, V-6, V-7, V-13, V-16, V-17 | Matrix rows S-03, S-04, S-05, S-28, S-48 with `outcome: adopted`, `launches: 0`, `signalsSent: 0`, `listeners.attributed: 1`, `boundMs: 11000`, each carrying its own `execution` witness (section 12a); episode `apiGenerations[1].settlementElapsedMs <= 15000` with `originAt: 'api-process-spawn'`, `projects[*].unchanged === true`, and every generation record proven to be the compiled `apps/api/dist/server.js` under section 12b |
| AC-2 | T-3, T-4, T-10, T-11, T-14 | V-9, V-16, V-17, V-19 | Matrix rows S-32, S-36, S-37; episode `routeStatus: 200` per project through the unchanged stable route, connection-attribution match to the unchanged port, privacy scan `matches: 0` |
| AC-3 | T-1, T-3, T-5, T-7, T-8, T-10 | V-1, V-6, V-13, V-14, V-16 | Matrix rows S-02, S-03, S-06, S-20, S-22, S-26, S-27, S-29, S-58, S-59 with `publicState` per row; `publicStates` union equals the four delivered values |
| AC-4 | T-4, T-10, T-11 | V-5, V-10, V-16, V-17 | Matrix rows S-43, S-45, S-60; episode stop phase within 5,000 ms, peer identity unchanged, registration row unchanged |
| AC-5 | T-4, T-10, T-11 | V-5, V-10, V-16, V-17 | Matrix rows S-44, S-61 with release-before-replacement audit triple; episode restart phase within 66,000 ms and unchanged `stableRoute` |
| AC-6 | T-3, T-10, T-11 | V-7, V-16, V-17 | Matrix rows S-27, S-56; episode `apiGenerations[1..3]` each `<= 15000`, identical identities, `listeners.accumulated: 0` |
| AC-7 | T-3, T-10, T-11 | V-16, V-17 | Matrix rows S-63..S-66; episode `registration[*]` all-unchanged and `fixtureManifests[*].beforeDigest === afterDigest` |
| AC-8 | T-1, T-3, T-9, T-10, T-14 | V-1, V-6, V-15, V-16, V-19 | Matrix per-row `events` equal to the catalog rule; zero start/stop/restart/health events on reconciliation rows; privacy scan `matches: 0` |
| AC-9 | T-1, T-3, T-4, T-5, T-10, T-11 | V-1, V-6, V-9, V-13, V-16, V-17 | Matrix rows S-01, S-02, S-34, S-38 with `signalsSent: 0`, `launches: 0` for S-01/S-02, `launches: 1` for S-34 within 71,000 ms and for S-38 within 60,000 ms; episode `startupControl.spawnToFirstResponseMs <= 4000` |
| AC-10 | T-1, T-3, T-4, T-6, T-7, T-10, T-11 | V-1, V-6, V-9, V-10, V-14, V-16, V-17 | Matrix rows S-07..S-26, S-35, S-37, S-41, S-42 with `outcome: unresolved`, `launches: 0`, `signalsSent: 0`; episode control subepisode settling `K-1` and `K-3` `Failed`/`reconcile-unconfirmed` against live controls, with 503 `workbench_reconcile_unconfirmed` acquisitions, `launches: 0`, and `signalsSent: 0` |
| AC-11 | T-2, T-3, T-10 | V-2, V-5, V-6, V-16 | Matrix rows S-23..S-26, each settling with a positive absence proof, `absence-unconfirmed`, or `scan-incomplete`; `listeners.attributed: 0`, no `Running` |
| AC-12 | T-2, T-3, T-10, T-11, T-12 | V-2, V-4, V-16, V-17, V-18 | Matrix rows S-08..S-22 one per refusal class and S-62 for the recycled-identity signal refusal; V-4 real-host negative controls under one production pass with one registered project each (foreign installation root adopted-peer pass, listener outside the group); episode `controlSubepisode.controls[*]` with `candidateCountForItsProject: 1`, `observedRefusalReason: 'launcher-prefix-mismatch'`, `adopted: false`, `signalsSent: 0`, `observedAlive: true`, cleared before `P1`; main-episode `controls[*].markers` both `null` with `observedAlive: true` and `adopted: false` |
| AC-13 | T-4, T-10 | V-8, V-9, V-16 | Matrix rows S-33 and S-35 with exactly 8 acquisitions, one settled identity each, and `boundMs: 60000`; no absent-boundary row is mapped to AC-13 |
| AC-14 | T-1, T-4, T-6, T-7, T-10, T-11 | V-1, V-10, V-14, V-16, V-17 | Matrix rows S-39, S-40, S-41, S-42, S-46, S-47 with route status 409 and zero lifecycle events; episode control subepisode recording real 409 `runtime_reconcile_unresolved` Stop and Restart responses with no lifecycle event |
| AC-15 | T-3, T-10 | V-8, V-12, V-16 | Matrix rows S-49..S-52 with post-settlement observations recorded and discarded |
| AC-16 | T-3, T-4, T-10 | V-8, V-10, V-16 | Matrix rows S-04, S-45, S-47, S-57 with two projects, disjoint identities, events, and cleanup |
| AC-17 | T-3, T-5, T-10 | V-11, V-13, V-16 | Matrix rows S-53..S-55 with `signalsSent: 0`, `residualCount: null`, later manager reconciling cleanly |
| AC-18 | T-9, T-10, T-11, T-13 | V-7, V-15, V-16, V-17 | Committed 66-row matrix; every row carries `boundMs` declared before its first action, `elapsedClass: within-bound`, and an `execution` witness proving the row was produced by a real run, including the project-keyed `probeHealthByProject` map whose keys equal that row's projects exactly; the episode declares all eighteen phases in order |
| AC-19 | T-9, T-10, T-11, T-12, T-15 | V-15, V-16, V-17, V-18, V-20 | Committed matrix + disposable episode finalized with `teardown.status: 'proven-clear'` + `controlSubepisode.residuals` proven clear from completed probes before `P1` + `residual-audit.json` recomputing all six residual classes at integer 0 from completed probes and re-checking every control in both subepisodes |
| AC-20 | T-14 | V-19 | Updated README, docs/project-runtime.md, docs/session-switching.md, docs/stable-workbench-routing.md, docs/README.md, apps/api/src/routes/README.md, new docs/api-restart-reconciliation.md; documentation test asserts required topics |
| AC-21 | T-8, T-13, T-15 | V-20 | `just verify` transcript and unchanged BL-017/BL-018 committed evidence digests |
| AC-22 | T-9, T-10, T-11, T-12, T-13, T-15 | V-15, V-16, V-17, V-18, V-20 | Recipes run offline with repository-local fixtures, zero retries, zero manual steps |

---

## Implementation Tasks (dependency order)

| Task | Title | Depends on | Revision 2 | Revision 3 | Revision 5 |
|---|---|---|---|---|---|
| T-1 | Runtime contract: reconciling state, four events, categories, vocabularies, six allowances, five bounds | — | changed | unchanged | completed, not reopened |
| T-2 | Host attribution primitives, installed-runtime identity, group listener ownership, adopted handle, survivorship-safe child stderr | T-1 | changed | changed (V-4 control isolation only; no product change) | **reopened** (13a) |
| T-3 | Manager reconciliation: install, discover, attribute, settle, bound, inspect, shut down | T-1, T-2 | changed | unchanged | **reopened** (13b, and 13a's manager-side consequences) |
| T-4 | Manager admission: acquisition await, blocked refusal, Stop and Restart pre-acceptance | T-3 | unchanged in substance | unchanged | completed, not reopened |
| T-5 | Application wiring: one required reconciliation before routes, explicit startup failure | T-3, T-4 | changed | unchanged | completed, not reopened |
| T-6 | Routes: two Stop categories, two Restart categories, exhaustive proxy failure table | T-1, T-4 | unchanged | unchanged | completed, not reopened |
| T-7 | Web mirrors: three closed vocabularies, notices, status maps | T-6 | unchanged | unchanged | completed, not reopened |
| T-8 | Migrate every typed `ProjectRuntimeManager` test double to the required member | T-1, T-3 | **new** | unchanged | completed, not reopened |
| T-9 | Evidence contract and validator: catalog, schema, source guards, mutation classes | T-1..T-7 | changed | **changed** (execution witness, generation authenticity, control isolation, 18 phases) | **reopened** (two guards extended, `M-9` fixture, `S-17` entry) |
| T-10 | Deterministic 66-scenario matrix and artifact emission, executed against production paths | T-9 | changed | **changed** (section 12a) | **reopened** (re-execute, regenerate artifact) |
| T-11 | Designated real API-restart episode with an isolated control subepisode and real compiled-API generations | T-5, T-10 | changed | **changed** (sections 11, 12b) | completed, not reopened |
| T-12 | Independent residual audit command | T-2, T-11 | changed | **changed** (audits both subepisodes and generation authenticity) | completed, not reopened |
| T-13 | Root justfile recipes, canonical gate wiring, prettier ignore | T-10, T-11, T-12 | unchanged | unchanged | completed, not reopened |
| T-14 | Application documentation maintenance | T-1..T-13 | changed | **changed** (validation-structure topics only) | **reopened** (13c, plus the two behavioural corrections) |
| T-15 | Full canonical gate and prior-evidence byte preservation | all | unchanged | unchanged | **reopened** (rerun the gate, re-prove the digests) |

**Revision-5 correction order.** The six reopened tasks run in exactly this dependency order and no other: **T-2 -> T-3 -> T-9 -> T-10 -> T-14 -> T-15.** `T-3` consumes `T-2`'s corrected helper; `T-9` guards the shape both produce and carries the amended `S-17` catalog entry; `T-10` re-executes the matrix against the corrected code and regenerates the committed artifact; `T-14` documents the settled behaviour and repairs the privacy sentence; `T-15` reruns the canonical gate last. The nine tasks not reopened remain accurately completed, because all three corrections leave their delivered surfaces untouched.

---

## Plan self-validation

Each item is a claim Implement may rely on. Items 1 to 13 were re-checked against the delivered source or a controlled probe for revision 2 and re-checked again for revision 3; items 14 to 19 are the revision-3 claims.

1. **Architecture, task, and test artifacts agree.** The 18 refusal reasons, 66 scenario identifiers, **20** source guards, **12** mutation classes, 13 declared bounds, 17 config members, 7 attribution primitives, 15 manager members, **13** `SelectedReconcileSources` members, **7** `execution` nested members, **18** episode phases, and **15** episode rejection reasons appear with identical values in the ADR, the core-component, `02-task-breakdown.md`, and `03-test-plan.md`. No artifact still states 16 reasons, 57 scenarios, 14 or 18 guards, 9 or 11 mutation classes, 15 config members, 5 primitives, 16 phases, or a 15,000 ms internal bound.
2. **The trust predicate matches the delivered source and the real host.** `spawn(config.executablePath, buildRuntimeArgv(...))` in `apps/api/src/project-runtime-process.ts` reaches a shell launcher that `exec`s `<installationRoot>/lib/node <installationRoot> "$@"`. A real spawned workbench's `/proc/<pid>/cmdline` is byte-equal to `resolveInstalledRuntimeIdentity(config.executablePath).launcherArgvPrefix ++ buildRuntimeArgv(...)`. No check in this plan compares `argv[0]` to `config.executablePath`.
3. **Listener ownership matches the real host.** The group leader held no listening socket; the forked group member `pgid === leaderPid` held the inode. Check 11 accepts either and requires an exactly observed conforming member of that group; an inode held outside the group is `listener-not-owned`. The delivered BL-017/BL-018 designated proofs already attribute over the owned closure, so this is consistent with prior art rather than a new claim.
4. **Startup cannot skip reconciliation.** `beginReconciliation()` is required on the interface, `app.ts` calls it without `?.`, and the `reconcile-startup-required` source guard fails if either optional chaining or an optional declaration reappears. The migration surface is exactly 16 typed doubles in 13 files, enumerated in T-8; the two structurally unchecked casts (`as unknown as ProjectRuntimeManager` in `runtime-stop-fixtures.ts`, `{} as ProjectRuntimeManager` in `workbench-proxy-route.test.ts`) are unaffected and are deliberately not modified.
5. **The bound origin is single and the arithmetic closes.** 3,000 + 11,000 + 1,000 = 15,000 exactly, asserted at defaults; 2,000 + 1,000 + 7,000 + 1,000 = 11,000 exactly. Measured segments on this host: startup 1,149–1,531 ms against a 4,000 ms control ceiling; `/proc` scan 33.5 ms against 2,000; attribution 9.9 ms against 1,000; readiness 5.3 ms against 7,000. Only the designated episode declares 15,000; every matrix reconciliation row declares 11,000. `acquisitionAcrossReconciliationBoundMs` is 11,000 + 60,000 = 71,000.
6. **AC-13 has no contradiction.** AC-13 is carried by S-33 (adopted, 8 acquisitions, 60,000, zero launches) and S-35 (unresolved, 8 acquisitions, 60,000, zero launches). The absent-boundary eight-acquisition row is S-34, mapped to **AC-9** with `boundMs: 71000` and `launches: 1`. Every AC-13 case therefore launches nothing and is measured against the delivered 60,000 ms ceiling, and the sentence in this list is true of the catalog as written.
7. **Every refusal class is reachable and the evidence schema is inhabitable.** Revision 2 corrected two uninhabitable branches that revision 1 shipped. Candidacy is now two-marker, so `canonical-path-mismatch` is reachable; and the three specific argument checks are evaluated before the wholesale byte-equality check, so `canonical-path-mismatch`, `owner-token-mismatch`, and `port-mismatch` are no longer subsumed by `argv-mismatch`. All eighteen classes are carried by at least one catalogued project: S-07, S-08, S-09/S-10, S-14, S-11, S-12, S-13, S-15, S-16, S-17, S-18, S-19/S-20, S-21, S-22, S-24, S-25, S-28, S-53. The evidence schema is likewise inhabitable and no aggregate is assignable. `residualCount` is `0` exactly when the row records `absenceProven: true`, and `null` otherwise, under one total predicate; no row is left with no legal value. Row-level teardown fields do not exist. The episode's `teardown` is `null` before teardown and a finalized observed record afterwards, with `'proven-clear'` reachable only from completed probes and observed zeros. `adoptedLiveness` is total over four values and is derived from the row's own kill and action declarations.
8. **No cleanup masking and no late-work gap.** The residual audit recomputes every class out of process from recorded identities and rejects a missing, malformed, `teardown: null`, non-`proven-clear`, mismatched, or incompletely probed artifact. Every settlement compare-and-sets on the exact entry and generation; abandoned observations are never read, recorded, converted into absence, or allowed to mutate an entry.
9. **Shutdown and late work are bounded.** The adopted handle's `exit` is never added to `backgroundTasks`, so it cannot stall the shutdown drain; `shutdown()` aborts the reconciliation controller before its delivered sweep; a `beginReconciliation()` call during shutdown rejects with `manager-shutdown`.
10. **Named consumer compatibility is preserved.** Adding one workbench failure row changes `WORKBENCH_FAILURE_TABLE_SHA256`; BL-011 retains no committed failure-matrix artifact and recomputes that hash in memory in `workbench-route-acceptance.test.ts`, `workbench-route-evidence.test.ts`, and `workbench-proxy-contract.test.ts`, exactly as BL-018 recorded when it took the table from 23 to 29 rows. `.trees/manual-test` is outside the `apps/*` pnpm workspace and is neither built, typechecked, nor tested by `just verify`, so it is deliberately untouched.
11. **No prior-art drift, stated honestly.** The delivered stop, restart, termination, admission, quarantine, and shutdown contracts are consumed unchanged. Two delivered behaviours do change, and both are recorded rather than described as unchanged: child stderr wiring (section 6, address-in-use preserved by construction) and the absence of an automatic death observation for adopted runtimes (section 5, corrected on demand and proven by Group F).
12. **Prior evidence bytes are preserved.** BL-017 `runtime-stop-matrix.json` must remain `c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3` and BL-018 `runtime-restart-matrix.json` must remain `fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880`; V-20 asserts both.
13. **Unresolved blockers:** none. Every decision required by Issue #43, including all seven revision-2 repairs and all three revision-3 repairs, is made here from repository evidence, delivered source, and controlled host probes.

**Revision 3 adds these claims.**

14. **The blocker is resolved without weakening anything.** The conflict was between T-11's control placement and the production predicate, not inside the predicate. Exact-one candidacy, the complete conjunction, the fixed evaluation order, exact attribution, zero signalling, no heuristic, and the genuine two-project three-generation real API-restart proof are all preserved verbatim. The partial implementation's `ambiguous-candidates` behaviour for two candidates on one project is correct and stays. No control is made non-candidate, no production predicate is bypassed, no control is pre-classified outside reconciliation, and no refusal class is claimed from a helper alone: `C-1` and `C-3` are settled by the compiled API's own reconciliation, and their internal class is read from a second production reconciliation's `inspectReconciliation()`.
15. **Every control subepisode states its full contract.** Section 11 fixes, for each control, its registration and database timing, its process timing relative to every reconciliation pass, its observed marker set, its sole-candidacy assertion, its expected public settlement (`Failed` with `reconcile-unconfirmed`), its expected refusal reason (`launcher-prefix-mismatch`), zero signals, zero launches, its teardown, and its independent residual re-observation, which must be a completed-probe zero before `P1` begins.
16. **`C-1` and `C-2` are coherent.** `C-1` was a candidate for Project A in revision 2 for exactly the same reason `C-3` was, so it moves into the subepisode with its own registered project `K-1`. `C-2` carries neither marker, so it can coexist with survivors; its non-candidacy is proven by observed markers rather than asserted, and the healthy pass corroborates it because an ambiguity would have made both projects `Failed` instead of `Running`. `C-2`'s helper-level `listener-not-owned` boundary is unchanged and remains recorded rather than implied, with the whole-predicate class carried by `S-19` and `S-20`.
17. **A matrix row cannot be written.** Every row is read back from a real manager, admission, route, or projection run on injected primitives; the `execution` witness records emergent counters; the per-project readiness rule ties those counters to the evaluation order for each project independently; `reconcile-matrix-observed-rows` forbids every expected-value literal in the fixture module; and `M-12` rejects a fabricated or inconsistent witness. Row construction from catalog constants, expectation mapping, static fixture serialization, and validator-only validation are each individually rejected.
18. **A generation cannot be substituted.** Every generation is `spawn(process.execPath, [apps/api/dist/server.js])` with OS-observed argv, process-start time, listener inode and owner, real loopback HTTP, and an observed disposable SQLite file. `generation-not-compiled-api`, `generation-eval-spawn`, `generation-listener-unobserved`, `generation-http-absent`, and `generation-database-unobserved` are executable rejections, and `reconcile-designated-real-api` keeps `createProjectRuntimeManager` out of the designated test entirely, so the partial test's `node -e` generations and in-process manager cannot pass.
19. **Counts reconcile.** The scenario catalog stays at exactly 66 and no bound, refusal reason, outcome, absence proof, config member, or manager member changes. The only count changes are the six named in the revision-3 delta table, and each appears with the same value in `01-action-plan.md`, `02-task-breakdown.md`, `03-test-plan.md`, and the amended core-component.

**Revision 4 adds these claims.**

20. **The readiness witness is total and inhabitable on every row.** `probeHealthByProject` is defined for every one of the 66 rows: `{}` on the zero-project row and one key per project elsewhere, with each key's total fixed by that project's own recorded class. Every mixed row has a legal shape — `S-28`, `S-29`, `S-30`, `S-31`, `S-47`, `S-53`, and `S-57` are each resolved explicitly in section 12a — and no row can be required to record both `0` and `>= 1` in one place. The three indeterminate families (`candidate-audit-triple-absent`/`absence-unconfirmed`, `deadline-exceeded`, and `manager-shutdown`/`unsettled`) are unconstrained by class because the evaluation order truly does not determine where the interruption landed; constraining them would have replaced one uninhabitable rule with another.
21. **The witness cannot be typed and cannot hide a peer's probe.** Each count is attributed from the injected primitive call ledger by observed call authority and observed manager instance, never from an outcome, refusal class, or public state; `reconcile-matrix-observed-rows` already forbids those literals in the fixture module; an ambiguous attribution fails the row as `probe-unattributable` rather than being guessed; and a start-path probe is excluded from every project's map and counted only in the aggregate. Because the map is keyed per project, an illegal readiness probe issued for a project the predicate refused at check 3 raises **that project's** count above `0` and is rejected, whatever its peers recorded.
22. **The correction is contained.** Only the nested members of `execution` change. The top-level row still gains exactly `+1 execution`; the 20 source guards, 12 mutation classes, 66 scenarios, 18 refusal reasons, 13 bounds, 18 phases, 15 episode rejection reasons, 15 tasks, 20 validations, and 22 AC IDs are untouched; `M-12` keeps its identity and gains a total, project-keyed body; and the only amended architecture artifact is the core-component whose enforcement paragraph carried the row-level wording.

**Revision 5 adds these claims.**

23. **Check 9's second conjunct is specified where it is executed.** Section 13a fixes the owner of the candidate leader identifier (the attribution boundary, never the enumeration under test), the comparison (`group.pids.includes(input.processGroupId)`, strict numeric identity), the position (adjacent to the completeness test, strictly before the listening-socket lookup and before any descriptor or readiness observation), the single refusal class (`group-scan-incomplete`, still one of eighteen), and the observable consequences (zero listener, descriptor, and readiness calls; `probeHealthByProject[P] === 0`; `listenerAttributed: 0`; `listenerOwner: null`). Both sub-branches keep deterministic proof: the membership branch at `S-17` and `V-6`, the completeness branch at `V-2` and `V-6`, and the ordering at the extended `reconcile-listener-group-scoped` guard with its two negative controls.
24. **No reconciliation path can await a fallible primitive, and the two scheduler uses cannot be confused.** Section 13b names the readiness window deadline (7,000 ms, armed once per readiness observation by `runReconciliationBounded`) and the poll gap (at most 50 ms, armed by `awaitTrustedReconciliationDelay` and clamped by `readinessDeadlineAt`) as distinct uses with distinct owners, and neither declares a bound, so `BL019_DECLARED_BOUNDS` stays at thirteen. The helper is module-local, never rejects, resolves on abort, cancels its handle on every exit path, and observes nothing, so a late resolution is inert. The extended `reconcile-deadline-trusted-scheduler` guard bans `processDependencies.sleep(`, `setTimeout(`, and `setInterval(` from the reconciliation region while leaving the delivered selected-Stop `sleep` legal, and `V-7` and `V-16` prove participation is impossible by injecting a `sleep` that fails when invoked. The matrix stays hermetic: injected clock, injected scheduler, no real sleep, no retry.
25. **The privacy contract is one boundary stated in two tiers.** Section 13c fixes bounded enum classifications in trusted inspection and retained validation evidence — the committed matrix and the designated episode included — and the raw-value list in neither tier. That is what the committed artifact already does for its refused projects, what `M-3` and `M-8` already enforce, and what `T-14` and `V-19` now require the documentation to state. No schema, validator, guard, or mutation class changes.
26. **Counts and history reconcile.** Every count named in section 8 is identical to revision 4, and the revision-5 delta table is entirely "unchanged" by design. Decisions 1 … 294 are byte-unchanged and 295 … 301 are appended. Both architecture artifacts keep their identifiers and their 2026-08-15 creation dates. The 22 AC IDs, their issue order, and the full coverage mapping are untouched; the corrections attach to the AC-10, AC-12, AC-18, and AC-20 evidence already claimed through `S-17`, `V-2`, `V-6`, `V-7`, `V-15`, `V-16`, and `V-19`.
27. **Unresolved blockers:** none. All three Verify findings are repaired from the delivered source, the committed artifact, and the accepted architecture, and this revision changed no product code, test, application documentation, justfile recipe, evidence artifact, or implementation record.
