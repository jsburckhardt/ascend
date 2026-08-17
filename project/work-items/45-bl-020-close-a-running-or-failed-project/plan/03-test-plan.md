# Test Plan: BL-020 Close a running or failed project

- **Issue:** https://github.com/jsburckhardt/ascend/issues/45
- **Action Plan:** project/work-items/45-bl-020-close-a-running-or-failed-project/plan/01-action-plan.md
- **Task Breakdown:** project/work-items/45-bl-020-close-a-running-or-failed-project/plan/02-task-breakdown.md
- **Branch:** feat/45-close-a-running-or-failed-project
- **Base SHA:** 2f51f768c2fa8b80b2d8cb0347ee22196e9f9e13

**Revision 8.** This test plan was revised after the independent review of revision 1 (blockers B1 – B7 and notes N1 – N3, which added seven scenarios), after the independent re-review of revision 2 (eight residual prose and implementation ambiguities), during `T-3` (revision 4, which added `G-27` and `M-18`), during `T-10` (revision 5, which corrects the semantics of `G-7`), and during `T-11` (revision 6, which replaces the three-member pre-claim settlement rule with the eight settlement **sites** production actually has, and replaces the unreachable `S-69`/`S-70` choreography with one the delivered proxy and manager ordering can produce). Every disposition table is in `01-action-plan.md`. Each correction is carried into the validation that owns it. **Revision 6 adds no scenario, mutation class, bound, or validation and moves no scenario identifier**: `S-69` and `S-70` keep their identifiers, their group, and their bound `B-5`, and the catalog stays at seventy-five. It adds exactly one source guard, `G-28`, and restates `V-5` step 7b, `V-8` step 7, and `V-16` steps 7 and 9. **Revision 7** was raised during `T-11` as well, by executing revision 6's own replacement: it splits the `S-69`/`S-70` choreography across two arrivals with disjoint declared roles, replaces the `S-74`/`E-6` post-boot expectation with the reconciliation decision's own conjunction-conditioned disjunction, states the `S-55` accounting the delivered manager performs, and fences the mutation lane's structural-copy substrate off from the committed matrix. **Revision 7 adds no scenario, mutation class, guard, bound, episode, or validation and moves no identifier**; it restates `V-5` step 7b, `V-8` steps 7 and 7a, `V-11` step 5a, `V-16` steps 4 and 9, `V-17` step 7, and the `S-55`, `S-69`, `S-70`, and `S-74` catalog rows. **Revision 8** was raised during `T-14`, by implementing `G-23` beside a `G-15` that executed successfully: it replaces `G-23`'s unsatisfiable every-changed-file scope with the computed governed production scope of action-plan section 16.2. **Revision 8 adds no scenario, mutation class, guard, bound, episode, or validation and moves no identifier**; `M-12` is untouched; it restates `V-14` step 6 and `V-16` steps 2 and 3, and publishes three new declared counts rather than changing any existing one.

Twenty validations `V-1 … V-20` and a deterministic catalog of seventy-five scenarios `S-1 … S-75`. Every validation names its tasks, its acceptance criteria, its setup, its steps, its expected result, and its expected evidence, and uses only bounds `B-1 … B-20`, guards `G-1 … G-28`, mutation classes `M-1 … M-18`, and vocabularies fixed by the action plan. The root `justfile` is the only command interface; no new validation tool and no new validation configuration file is introduced.

**Fixture standard for every executed scenario.** Two registered projects — **selected** P and **peer** Q — plus one **unrelated control** consisting of a non-Ascend process and a non-Ascend loopback listener with recorded identities. Q is always `Running` with a real readiness result, a live stable route, and at least one active connection. Each scenario declares its bound before its first action, captures the before manifest, executes through production paths, captures settled observations, captures the after manifest, captures `residual`, tears down, and only then captures `teardown` by independent re-observation.

---

## Test V-1: Plan, architecture, and acceptance-coverage agreement

- **Type:** Static analysis
- **Task:** T-1 … T-16 (plan-wide)
- **Acceptance Criteria:** AC-1 … AC-25
- **Priority:** P0

### Setup
The three plan artifacts, the issue body, `project/architecture/ADR/DECISION-LOG.md`, and the created and amended architecture artifacts at the branch head.

### Steps
1. Extract the twenty-five checkbox criteria from the issue body in issue order and compare them against the action plan's `AC-1 … AC-25` catalog, text for text.
2. Assert every AC identifier appears in all three plan artifacts and that the coverage table maps each to at least one task, at least one validation, and at least one concrete evidence artifact.
3. Assert every task identifier `T-1 … T-16` referenced by the coverage table and by the test plan exists in the task breakdown, and that its dependency list contains only lower-numbered tasks.
4. Assert every validation identifier `V-1 … V-20`, scenario identifier `S-1 … S-75`, guard `G-1 … G-28`, mutation class `M-1 … M-18`, and bound `B-1 … B-20` used anywhere is declared exactly once.
5. Assert every created and amended architecture artifact has at least one decision record in `DECISION-LOG.md`; that decisions `1 … 301` are byte-identical to the base SHA; that revision 1's records `302 … 352`, revision 2's records `353 … 374`, revision 3's records `375 … 379`, revision 4's records `380 … 387`, and revision 5's records `388 … 393` are byte-identical; and that every artifact amended during revision 2 has at least one record in `353 … 374`, every artifact amended during revision 3 — `ADR-260816-selected-project-close-control`, `ADR-260815-per-project-lifecycle-activation`, and `CORE-COMPONENT-260808-runtime-lifecycle-error-handling` — has at least one record in `375 … 379`, every artifact amended during revision 4 — `ADR-260816-selected-project-close-control`, `CORE-COMPONENT-260808-runtime-lifecycle-error-handling`, and `CORE-COMPONENT-260816-managed-resource-release-ordering` — has at least one record in `380 … 387`, and every artifact amended during revision 5 — `ADR-260812-in-process-workbench-reverse-proxy`, `ADR-260816-selected-project-close-control`, `CORE-COMPONENT-260812-stable-workbench-proxy`, and `CORE-COMPONENT-260816-managed-resource-release-ordering` — has at least one record in `388 … 393`, and every artifact amended during revision 6 — `ADR-260816-selected-project-close-control`, `CORE-COMPONENT-260815-host-runtime-attribution-evidence`, `CORE-COMPONENT-260812-stable-workbench-proxy`, and `CORE-COMPONENT-260816-managed-resource-release-ordering` — has at least one record in `394 … 401`, with the log ending at record `401`.

### Expected Result
Twenty-five of twenty-five criteria matched verbatim and in order; totality holds; the dependency graph is acyclic; no dangling or duplicated identifier; every touched artifact has a decision record; the decision log is append-only across all five revisions.

### Expected Evidence
Coverage report listing all twenty-five criteria with their tasks, validations, and evidence; the identifier census; the decision-log source-coverage report.

---

## Test V-2: Runtime contract vocabularies, safe messages, configuration, and bound arithmetic

- **Type:** Unit
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-5
- **Priority:** P0

### Setup
`apps/api/test/project-close-contract.test.ts` importing `project-runtime-contract.ts` directly, plus a type-level import of `ProjectCloseServiceDependencies` from `apps/api/src/project-close.ts` for step 7c.

### Steps
1. Assert `RUNTIME_CLOSE_OUTCOMES` has exactly three members in declared order and `RUNTIME_CLOSE_REJECTION_CATEGORIES` exactly nine, ending `ownership-cardinality-exceeded`, `removal-failed`, `manager-shutdown`.
2. Assert `RUNTIME_FAILURE_CATEGORIES` has twenty-one members, ends with `runtime-closing` and `close-release-unconfirmed`, and that `RUNTIME_FAILURE_MESSAGES` has a message for every member.
3. Scan every message for a path separator, an identity, a port, an authority, a command, an environment value, or a stack fragment.
4. Assert `RUNTIME_STOP_REJECTION_CATEGORIES` and `RUNTIME_RESTART_REJECTION_CATEGORIES` each have ten members ending in `close-in-progress`.
5. Assert the resolved `ProjectRuntimeConfig` exposes twenty members and `PROJECT_RUNTIME_DEFAULTS` twenty-two, that the delivered difference is exactly `healthPath`, `healthStatus`, and `healthBodyStatuses` on the defaults side and `environment` on the config side, and that `closeDrainAllowanceMs === 5_000`, `closeSettlementAllowanceMs === 1_000`, and `closeOwnershipSweepCap === 4` on both.
6. Drive `createProjectRuntimeConfig` with `0`, `-1`, `1.5`, `NaN`, and `Number.MAX_SAFE_INTEGER + 1` for each of the three new members and assert each is refused.
7. Assert `runtimeCloseReleaseBoundMs(defaults, false, 1) === 5_000`, `(defaults, true, 1) === 20_000`, `(defaults, false, 2) === 10_000`, `(defaults, false, 4) === 20_000`, `(defaults, true, 4) === 35_000`; and `runtimeCloseOverallBoundMs(defaults, false, 1) === 11_000`, `(defaults, true, 1) === 26_000`, `(defaults, false, 2) === 16_000`, `(defaults, false, 4) === 26_000`, `(defaults, true, 4) === 41_000`. Assert each is produced through `checkedRuntimeBound` and that each equals its declared `B-*` row.
7a. Assert both bound functions reject a `sweepUnits` of `0`, `5` at the default cap, `1.5`, `NaN`, and a non-number, so the multiplier can never be an unvalidated observed count (`G-24`).
7b. Assert `ProjectRuntimeCloseInput` has exactly four members and that `auditConnections` is declared as a synchronous function returning a `WorkbenchProxyAudit`, not a promise.
7c. Assert the composition binding the manager depends on: `ProjectCloseServiceDependencies.proxy` is `Pick<WorkbenchProxyManager, 'closeProject' | 'audit'>` — both members, asserted at type level — `library` is `Pick<ProjectLibrary, 'closeProject'>`, and `runtime` is `Pick<ProjectRuntimeManager, 'close'>`. Assert that a dependency object omitting `audit` fails to typecheck, so the plan's own composition cannot be built with a narrower `Pick` than `auditConnections` requires.
8. Assert `RUNTIME_ENTRY_STATES`, `PUBLIC_RUNTIME_STATES`, `RUNTIME_LIFECYCLE_TARGETS`, `RUNTIME_LIFECYCLE_EVENTS`, and `NFR015_EVENT_CATALOG` are byte-identical tuples to the base SHA (`G-17`).
9. Assert every hard-coded vocabulary length in the repository equals its vocabulary's actual length, enumerating each of the sixteen assertions listed under T-1, T-2, and T-5 — including the three that must remain unchanged at 7, 7, and 4 — so an unenumerated surface cannot pass silently.

### Expected Result
All member counts, orders, values, refusals, and bound values exact; the five delivered vocabularies unchanged.

### Expected Evidence
Transcript listing every vocabulary with its members and counts, the three configuration members with their defaults, the fifteen refusal cases, the ten computed bound values against their `B-*` rows, the five `sweepUnits` rejections, the four-member close input and the three-member service dependency binding with both proxy members, and the repository-wide hard-coded-length agreement report; the `G-17` and `G-24` guard results.

---

## Test V-3: Close outcome and rejection schemas are inhabitable and every branch reachable

- **Type:** Unit
- **Task:** T-1, T-3
- **Acceptance Criteria:** AC-1, AC-2, AC-3
- **Priority:** P0

### Setup
`apps/api/test/project-close-manager.test.ts` with the injectable manager fixture, primitives ledger, and deterministic scheduler.

### Steps
1. For each of the three outcome variants, construct the value the production path actually returns and assert its exact key set, frozen-ness, and discriminant.
2. For each of the nine rejection categories, drive the production path that produces it and assert the returned category, including `ownership-cardinality-exceeded` produced by a frozen ownership cardinality above the configured cap.
3. Assert no outcome variant carries a key the schema does not declare and no declared key is optional-in-practice-but-never-populated.
4. Assert `already-absent` carries `released` and that both `true` and `false` occur across the catalog.

### Expected Result
Three outcome variants and nine rejection categories all produced by real execution; every declared field inhabited by at least one scenario; no uninhabitable branch.

### Expected Evidence
Inhabitability report mapping each variant and each category to the scenario identifier that produced it.

---

## Test V-4: Per-project proxy drain, token scoping, and signal-only bounding

- **Type:** Unit / integration
- **Task:** T-2
- **Acceptance Criteria:** AC-1, AC-5, AC-17
- **Priority:** P0

### Setup
`apps/api/test/project-close-proxy.test.ts` with a real `WorkbenchProxyManager` over a loopback upstream, projects P and Q, and populated `pending`, `httpRequests`, `httpResponses`, `rawSockets`, and `webSockets` for both.

### Steps
1. Capture `audit(tokenP)` and `audit(tokenQ)` before the drain.
2. Call `closeProject(P, signal)` with a signal that does not abort and await it.
3. Assert all five counts for `tokenP` reach zero and all five for `tokenQ` are unchanged.
4. Repeat with a signal that aborts before the counts reach zero and assert the returned audit is truthfully non-zero.
5. Assert the delivered global `shutdown()` audit and behaviour are unchanged.
6. Assert `audit(projectToken?)` is synchronous, uncached, and live-derived: its return value is not thenable, and two calls straddling a mutation of the live maps return different counts. This is what makes it usable as the manager's confirmation-time `auditConnections` input.
7. Assert drain completion is observed, never assumed, and that the drain owns no authority over time: it returns when the five per-token counts observably reach zero, the only other terminator is the caller's deadline, and nothing else can end it. Assert that no elapsed value, attempt count, retry budget, or fallback participates in either termination — the same drain, given a signal that never aborts, returns at the instant the counts reach zero regardless of how many observation gaps elapsed first. A scenario needing a slow socket forces it with a paused reader rather than a sleep, and a drain that does not reach zero within its deadline fails closed rather than being retried optimistically.
8. Run guards `G-7`, `G-8`, and `G-9` with their negative controls, including `G-7`'s four: `setTimeout(resolve, 5)`, a `setInterval` re-poll, a `Date.now()` elapsed comparison guarding `resolve()`, and deletion of `clearTimeout(pollHandle)`.
9. Assert nothing survives settlement, for **both** terminations — counts-zero and signal-abort. Capture the pending-timer count and the signal's `'abort'` listener count immediately before the drain and immediately after the returned promise settles, and assert both are equal to their pre-drain values; then advance the clock past several observation gaps and assert that no further per-token observation, map mutation, socket call, or audit occurs, so a callback delivered after settlement changes nothing.

### Expected Result
The drain is scoped to the selected token, bounded only by the caller's signal, truthful when the signal wins, leaves no timer, listener, or callback alive after it settles, and leaves the peer and the global path untouched.

### Expected Evidence
Before and after five-count tables for both tokens in both cases; the returned audits; the synchronicity and liveness assertions; the drain-termination transcript for the zero-reached and deadline-reached cases; the pending-timer and abort-listener counts before and after settlement for both terminations, with the post-settlement clock advance showing no further observation or mutation; the three guard transcripts with their failing negative controls, including `G-7`'s four.

---

## Test V-5: Exclusive claim, post-await rechecks, nine-step admission order, cardinality gate, and seven-phase execution order

- **Type:** Unit
- **Task:** T-3
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-9, AC-10, AC-11, AC-12, AC-14
- **Priority:** P0

### Setup
`apps/api/test/project-close-manager.test.ts` with an ordered call ledger recording every admission evaluation and every phase entry.

### Steps
1. For each of the nine admission steps, construct the state in which that step and no earlier step fires, and assert the returned outcome and the ledger's evaluation prefix.
2. Assert the claim is installed synchronously — no ledger entry between the entry read and the claim install (`G-10`) — and that the ownership cardinality is frozen in the same synchronous section.
3. For a success, assert `productionPathsEntered` equals the seven phase names in declared order.
4. Assert the claim is absent from `audit().closeClaims` after every settled path, including a path on which an injected primitive throws (`G-11`).
5. **Claim rechecks after every await (B1).** Hold `start()` at each of the six declared recheck points on the running-reuse and starting-join seams, install a close claim while it is held, release it, and assert the acquisition refuses `runtime-closing` rather than installing an entry, reviving ownership, or returning a reused snapshot. Then delete each recheck in turn in a mutation fixture and assert `G-21` fails and the corresponding scenario becomes observable.
6. **Confirmation is a re-observation (B1).** Assert phase 5 calls `input.auditConnections()` synchronously; that a non-zero count triggers at most one further `drainConnections` under the already-armed drain deadline followed by one re-audit; that a still-non-zero count settles `release-unconfirmed`; that no close performs more than two drains or two connection audits; that the eight-clause predicate is evaluated in one uninterrupted synchronous region; and that `commitRemoval()` is the **next statement** with no intervening `await`, branch, or call (`G-25`).
7. **Cardinality gate (B2).** For a frozen cardinality of one, two, and four, assert the resolved `sweepUnits` and the declared bound equal the recomputed values and that phase 4 sweeps exactly the frozen records. For a frozen cardinality above `closeOwnershipSweepCap`, assert immediate `rejected: ownership-cardinality-exceeded` with zero drains, zero signals, zero terminations, no removal, no failure install, and no lifecycle event.
7a. **Confirmation clauses are discharged from project-keyed state (revision 3, finding 6; late-work fixtures corrected in revision 4, C1).** Assert the claim record captures `claimedEntry` by reference at install — including the `undefined` case — plus `lateWork` at `0` and `sealed` at `false`. Then prove both directions of clause 5 and clause 7:
   - **peer-busy fixture:** hold an in-flight stop and an in-flight restart for peer Q, so `stopTasks` and `restartTasks` are non-empty, and assert P's close still confirms and removes. A close that consulted either global set would fail here, so this fixture is the false-negative control.
   - **identity-bearing late-work fixtures (false-positive controls):** with the global sets empty, drive each of the three incrementing events independently and assert the close fails closed as `release-unconfirmed` rather than confirming — (i) an `installEntry` call for P that is refused while the claim is held, (ii) a `registerOwnership` call observing P claimed, and (iii) a late settlement for P accounted in `lateCloseSettlements` while the claim is held. Assert each raised `claim.lateWork` by exactly one.
   - **refused-acquisition control (new in revision 4, and the direct counterpart of the contradiction that returned `T-3` to Plan):** hold an acquisition for P at each of the six declared recheck seams, install the claim, release the hold, and assert that the resumed acquisition is refused `runtime-closing`, that `claim.lateWork` stays `0`, that `audit().refusedLateAcquisitions` increased by exactly one per refusal, and that the close **confirms and removes**. Assert the same for the `start()`/`register()` head refusals and the `stop()`/`restart()` `close-in-progress` rejections. A close whose only arriving work was refused acquisitions must never settle `release-unconfirmed`.
   - **counter-separation control:** assert `refusedLateAcquisitions` is not referenced anywhere in the confirmation region, and that no refusal path increments `lateCloseSettlements`.
   - **identity fixture:** claim P while `entries.get(P)` is `undefined`, install an entry during the phases, and assert clause 7 fails by reference comparison; then repeat with the close's own `registered` install and assert it passes.
   - Assert `stopTasks` and `restartTasks` are not referenced anywhere in the close region, and that the `execution.confirmation` record's `inFlightLifecycle` and `generationIdentity` booleans are computed from these project-keyed observations only.
7a-i. **One entry-install authority (revision 4, C2).** Assert `entries.set(` occurs exactly once in `apps/api/src/project-runtime-manager.ts` and that the occurrence is inside `installEntry`; that every former literal site — `stop()`'s `stopping` install, `stop()`'s released-settlement install, and `restart()`'s success settlement — now calls `installEntry`; and that no call site discards the boolean. For each refusable site, force a refusal and assert nothing was emitted, no ownership was registered, no cleanup was recorded, no task was registered, and the caller settled with `entryInstallRefusal`'s bounded failure. For each unrefusable-by-construction site, assert the invariant error is thrown when the helper is forced to refuse. Run `G-4` with all three negative controls.
7a-ii. **The migrated BL-017 and BL-018 guards keep their strength (revision 4, C2).** Execute `validateSelectedStopSource` and the BL-018 restart source guards against the migrated sources and assert acceptance; then execute every delivered negative control and assert each still fails with its original violation code — `stopping-entry-install-count`, `stop-entry-mutation-count`, `claim-install-order`, `claim-install-suspension`, `claim-install-deferred-count`, `claim-install-deferred-shape`, `settlement-terminal-install`, `settlement-recheck-coverage`, `settlement-recheck-suspension`, `settlement-recheck-count`, `settlement-invariant-fault`, `restart-quarantine-project-keyed`, and `restart-registered-entry-install`. Assert `BL018_ADDED_SOURCE_GUARD_CODES` still has 16 members, that the two migrated `mutate` anchors are found (the helper asserts `toContain`, so a stale anchor fails loudly), and that the migrated stop guard additionally rejects a source in which any direct `entries.set(` is reintroduced into the stop body or anywhere outside `installEntry`.
7a-iii. **The sealed window (revision 4, C1).** Assert `claim.sealed` is `false` through every phase and becomes `true` as the last statement of the confirmation region. With the removal callable suspended, force an entry install and an ownership registration for P and assert: the install writes nothing and is refused even when the owning claim is presented; the registration produces a `quarantinedOwnership` record for P and **no** ownership-index entry; both increment `claim.lateWork` and `lateCloseSettlements`; and the retired project therefore never holds an ownership record. Assert the seal is lifted on the `removal-failed` branch immediately before the released `registered` install, and never on the `closed` or `already-absent` branch. Prove the window is additionally unreachable by construction: enumerate every `registerOwnership` call site and assert each is reachable only from an operation whose transient entry state close admission refuses. Run `G-27` with its four negative controls.
7b. **Late-acquisition holds settle before capture (revision 3, finding 8; choreography replaced in revision 6, split across two arrivals in revision 7).** For `S-69` and `S-70`, assert the fixed order the delivered code can actually produce, with each of the two arrivals proving one half of it. **Arrival A:** issued *before* the close, it registers its per-token pending operation, enters `start()` while no claim exists, and is held at exactly one declared `await` — `current.ready.process.isAlive()` on the running-reuse path — through an explicit release handle and never a delay; phase 1's drain aborts its controller synchronously and then observes `pendingOperations: 1`; the hold is released **inside that first drain**; the resumed acquisition reaches the mandatory post-`await` recheck, which is evaluated before the liveness branch and before any `signal.aborted` test on that path, so it settles as a refusal (`runtime-closing`, `503`) and not as a cancellation; only then does phase 1 reach five zeros. **Arrival B:** issued *after* phase 1 settled, during phases 2 – 4 with the close suspended in phase 3's own release await, it registers its per-token pending operation and is held at `resolveTarget`'s first `await` — before any acquisition is requested — so phase 5's first `auditConnections()` observes `pendingOperations: 1` with every other per-token count zero and the single permitted re-drain runs under the still-unfired armed drain deadline. Assert that releasing B at the re-drain settles it `caller-cancelled` (`502`), because the re-drain's synchronous head already aborted it, and that this settlement is recorded as a cancellation and never as a refusal: exactly one refused acquisition, A's, appears in the row. Assert `residual` is captured only after the close and **both** arrivals have settled, as observed settlements rather than elapsed time. Assert the impossible coupling is not reattempted: no scenario requires one arrival both to be accounted by phase 1 and to be pending at phase 5. Assert the revision-2 choreography is **not** attempted and is unreachable: enumerate `handleHttp` and `handleUpgrade` and assert each registers its per-token resource before it calls `resolveTarget`, and assert no scenario injects `requestHttp` or otherwise opens an upstream connection outside the production path. Assert a run whose held acquisition never reached the production recheck is reported as a **fixture failure** and rejected as unexecuted, and that a `closed` row with any non-zero residual class is reported as a **product failure** and is never re-run or re-classified.

7c. **The confirmation record is captured at the instant it describes (revision 6).** Assert every member of `execution.confirmation` is sampled inside the harness-composed `commitRemoval` callable, as its first statements before it delegates — the one production instant `G-25` makes the next statement after the confirmation region — and that no member is reconstructed from a post-settlement observation: `reobserved` from the last `auditConnections()` return value, `ownership`/`quarantine`/`pendingAdmissions`/`notRetired` from one synchronous `manager.audit()` taken there, `generationIdentity` from `manager.inspect(P)` compared against the projection captured at claim install, and `claim.lateWork` from the still-present `audit().closeClaims` record. Assert the negative control fails: a harness that reconstructs `notRetired` from a post-settlement persisted read is rejected even when the reconstructed value is equal, because equality after the fact is what a broken ordering also produces. Assert clauses 5 and 7 are discharged by this validation's own manager-internal assertions and are carried in the row by reference rather than restated as an external observation.
8. Assert no site installs an entry whose `failure.category` is `runtime-closing` (`G-26`).
9. Run guards `G-1`, `G-2`, `G-4`, `G-5`, `G-6`, `G-21`, `G-24`, `G-25`, `G-26`, and `G-27` with their negative controls. For `G-5` and `G-6`, additionally assert a **positive control**: both pass unmodified against the base-SHA sources, so the delivered `processDependencies.sleep` uses in `project-runtime-process.ts` and in the stop, restart, and reconciliation regions cannot false-fail them, while an awaited delay primitive inserted inside the close region does fail them. For `G-25`, assert the amended form: the seal assignment is permitted and required as the region's last statement, and an inserted `await`, an inserted second call, or a deleted seal each fails it.

### Expected Result
Each admission step independently reachable and ordered; the claim installed without interleaving, re-evaluated after every await on the reuse and join seams, and released on every path; the cardinality frozen, bounded by the declared cap, and gated; the seven phases entered in order; confirmation performed by synchronous re-observation with `commitRemoval` as its next statement.

### Expected Evidence
Nine per-step transcripts with their evaluation prefixes; the synchronous-install and cardinality-freeze ledger extract; six recheck-point transcripts plus six recheck-deletion failures; the drain and connection-audit invocation counts; the eight-clause confirmation record; the peer-busy, three identity-bearing late-work, refused-acquisition, counter-separation, and identity fixtures with their pass or fail results, their `claim.lateWork` and `audit().refusedLateAcquisitions` deltas, and the assertion that neither global task set is read in the close region; the converted-site ledger and the forced-refusal transcript for every `installEntry` call site; the migrated BL-017 and BL-018 guard acceptance and negative-control transcripts with their thirteen preserved violation codes; the sealed-window transcript showing the refused install, the quarantined identity, the absent ownership record, the failed-removal unseal, and the `registerOwnership` reachability enumeration; the two late-acquisition hold ledgers showing release, refusal settlement, and close settlement before residual capture, plus one fixture-failure and one product-failure control; the three cardinality bound agreements and the over-cap refusal ledger showing no effect and its complete four-member witness; the ordered phase list; the fault-path claim release; ten guard transcripts with negative controls and two positive controls.

---

## Test V-6: Every terminal case, its durable effect, its projection, and its route response

- **Type:** Integration
- **Task:** T-3, T-4, T-5
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-9, AC-10, AC-11, AC-14, AC-18, AC-20
- **Priority:** P0

### Setup
`apps/api/test/project-close-route.test.ts` and `project-close-service.test.ts` over a real application instance with an isolated database and the injected runtime primitives.

### Steps
1. Drive each of the eleven terminal cases through `DELETE /api/projects/{id}` and record the status, the body key set, the retained registration, the public state, the ownership disposition, and the emitted records.
2. Assert `200` carries exactly `{ id, disposition: 'closed' }` and every failure exactly `{ error: { category } }`.
3. Assert the eleven published categories equal the declared set with the declared statuses across the twelve-row status map (`G-19`, drawing on the fifteen-member `SelectedCloseSources`), and that each is reachable — including `runtime_close_ownership_unresolved` at `500` for the cardinality refusal.
4. Assert `release-unconfirmed` projects `Failed` classified `close-release-unconfirmed` with ownership retained, and `removal-failed` projects `Stopped` with a registered released row.
5. Drive an invalid identifier and assert `400 invalid_project_id` with the delivered validation behaviour byte-identical.
6. Assert the service calls `runtime.close` once per valid request and reaches durable removal only through the injected `commitRemoval` callable, and that `G-3` finds exactly one construction site for it — the body of the callable the close service builds — while failing both negative controls: a route calling `library.closeProject`, and the service calling it outside `commitRemoval` (B3).
7. Drive the stop and restart routes against a claimed project and assert `409 runtime_close_in_progress` on each, and run `G-16` asserting the change set adds no persistence schema, migration, or column reference and leaves `project-persistence.ts` and `project-library.ts` unmodified.
8. **Repeated close (AC-20, B7).** After one successful close, issue **three** sequential close requests for the same identifier and assert `404 project_not_found` on each, exactly one `project.closed` across all four requests, zero further runtime creations, signals, or terminations, and each repeat settled within its declared bound.
9. Assert `runtime-closing` never appears as an installed entry failure category or as a public projection input on any of the eleven cases (`G-26`, B5).

### Expected Result
Eleven terminal cases each produce their declared status, body, durable effect, and projection; repeated closes are exactly idempotent; no failure produces a success; the delivered validation and success shapes are unchanged.

### Expected Evidence
Terminal-case table with status, body key set, registration-after, public state, ownership, and emitted records per case; the four-request repeated-close sequence showing `200, 404, 404, 404` with a single-event ledger; the `G-3`, `G-19`, and `G-26` guard transcripts with their negative controls; the two `409` route transcripts.

---

## Test V-7: Event discipline and cardinality

- **Type:** Integration
- **Task:** T-3, T-5
- **Acceptance Criteria:** AC-8
- **Priority:** P0

### Setup
The application instance with a recording event sink, driven across every terminal case and the concurrency scenarios.

### Steps
1. Assert exactly one `project.closed` per completed close and none on any other outcome.
2. Assert the eight-concurrent case yields exactly one `project.closed` in total.
3. Assert no `runtime.stop.*`, `runtime.restart.*`, `runtime.start.*`, or `runtime.reconcile.*` record is emitted anywhere in the close region (`G-12`).
4. Assert the only lifecycle emission in the close region is `runtime.health.changed` (`G-13`), that it occurs exactly when a claimed `running` entry becomes a retained failure, and that its classification is `close-release-unconfirmed`.
5. Assert `project.closed` has exactly one lexical emission site reachable only from the `closed` outcome (`G-14`).
6. Assert `NFR015_EVENT_CATALOG` is unchanged and that every emitted name is a catalog member.

### Expected Result
Event sets exact per outcome; no borrowed lifecycle name; the health record truthful and singular; the catalog unchanged.

### Expected Evidence
Per-outcome emitted-record sets; the three guard transcripts; the catalog membership assertion.

---

## Test V-8: Concurrency, contention, and single-effect discipline

- **Type:** Integration
- **Task:** T-3, T-4, T-5
- **Acceptance Criteria:** AC-4, AC-9, AC-10, AC-11, AC-12
- **Priority:** P0

### Setup
The application instance with a deterministic scheduler that can hold a phase open, plus the primitive call ledger keyed by opaque project token.

### Steps
1. Issue eight concurrent `DELETE` requests for a running P and assert one `closed` and seven `already-absent`, exactly one `terminate`, exactly one `commitRemoval`, one `project.closed`, and all within `B-5`.
2. Repeat for a stopped P and assert one `200` and seven `404` with zero `signal` and zero `terminate`.
3. Drive close-during-start, close-during-stop, close-during-restart, and close-during-reconcile and assert the four declared rejections with the registration retained.
4. Drive start-during-close, stop-during-close, restart-during-close, and register-during-close and assert `runtime-closing`, `close-in-progress`, `close-in-progress`, and `runtime-closing` respectively, each mutating nothing.
5. Assert in every case that `signalCallsByProject` has a key set equal to the row's project set and obeys the zero-before-phase-three and at-least-one-on-termination rule.
6. Assert no replacement generation, pending admission, quarantined identity, or stale route target survives a successful close.
7. **Reuse race (B1, ordered in revision 3, choreography replaced in revision 6, split across two arrivals in revision 7).** Drive the race the delivered ordering can produce, with two arrivals carrying disjoint roles. With P `Running` and one completed real proxied HTTP navigation, issue **arrival A** before the close and hold it at `start()`'s one declared running-reuse await; admit the close; assert phase 1's drain observes `pendingOperations: 1` while A is suspended, release A inside that drain, and assert it is refused `runtime-closing` at the mandatory post-`await` recheck, settles `503`, deletes its pending key in `handleHttp`'s `finally`, and only then lets phase 1 reach five zeros — so the phase-1 zero is earned rather than assumed. Then, during phases 2 – 4 with the close suspended in phase 3's own release await, issue **arrival B** and hold it at `resolveTarget`'s first `await`, before any acquisition is requested. Assert phase 5's first `auditConnections()` observes `pendingOperations: 1` and every other per-token count zero — the phase-1 zero is now stale on a close that is otherwise entirely correct — and that the single permitted re-drain runs. For `S-69`, release B at the instant the re-drain is entered and assert it settles `caller-cancelled` (`502`) because the re-drain's synchronous head already aborted it, that the drain then reaches five zeros, the second audit is clear, and the close confirms with all eight clauses true, `claim.lateWork` at `0`, and the pair `drainInvocations: 2` / `connectionAuditInvocations: 2`. For `S-70`, never release B before the armed `closeDrainAllowanceMs` deadline and assert that because B is suspended before it can observe its own cancellation its pending registration stays live, the re-drain cannot reach zeros, the deadline fires, no second audit is taken, and the close settles `release-unconfirmed` with the registration retained and the pair `drainInvocations: 2` / `connectionAuditInvocations: 1`. Assert in both cases that `residual` is captured only after the close and both arrivals have settled, that the row names `running-reuse-await` in `productionPathsEntered`, that `execution.refusedAcquisitions` carries **exactly one** settled refusal classified `runtime-closing` — A's — and that `managerAudit.refusedLateAcquisitionsDelta` increased while `claim.lateWork` stayed `0` at confirmation (revision 4). Assert `M-18` rejects the same row with the counter unchanged, with any other classification, or with B's cancellation relabelled as a second refusal, and `M-15` rejects it with an invocation pair its outcome cannot produce.

7a. **The deletion controls the race exists for (revision 6, made reachable in revision 7).** Two distinct deletions produce two distinct observable defects, and the control must not conflate them. **First**, delete the post-`await` recheck from the running-reuse branch and assert arrival A is no longer refused — `reuseOwnershipFailure` compares entries only and never consults the ownership map, so nothing else on that branch stops it — and that the defect is caught by `refusedLateAcquisitionsDelta` staying `0` on a row declaring the seam (`M-18`) and by `G-21` failing on the source. Assert A still cannot open an upstream connection in this state, because phase 1's drain aborted its controller and the pre-return `signal.aborted` test settles it `caller-cancelled`; a control that claimed an escaped connection here would be asserting something the ordering forbids. **Second**, delete the claim's refusals on the acquisition path as a whole — the head refusal and the running-reuse rechecks — and release **arrival B** in a window where the subject's runtime is still live and no drain is in flight, which the delivered phase-3 release suspension provides. Assert B is admitted, returns the live snapshot, and the proxy opens a real upstream connection under the installed claim; assert this is caught by a third, independent detection: phase 5's first re-observation shows a non-zero **upstream** request, upstream response, raw socket, or bridged WebSocket count, which the ordinary path can never produce because a refused or cancelled arrival never obtains a target. Assert both runs pass when the refusals are restored. Then delete phase 5's first `auditConnections()` and assert `M-15` rejects the resulting invocation pair, and delete the re-drain and assert the close cannot confirm.
8. **Multi-ownership without quarantine (B2).** Construct two retained ownership records for P through a stop whose audit did not confirm followed by a fresh start from the retained `failed` entry, with no quarantine anywhere, and assert the close sweeps both records, declares the two-record bound rather than the one-record bound, and settles within it (`S-71`).

### Expected Result
Exactly one effect per contended close; every contender derives rather than reports; every cross-operation refusal is inert; per-project signal accounting exact.

### Expected Evidence
Contention transcripts for all eight orderings with the ledger extract; the eight-concurrent tallies for the running and stopped cases; the two reuse-race transcripts with their hold, release, refusal-settlement, and close-settlement order and their drain and re-audit counts; the two-ownership-record sweep transcript with its declared bound; the post-success residual snapshot.

---

## Test V-9: Published proxy failure table, statuses, messages, and hash

- **Type:** Unit
- **Task:** T-2, T-5
- **Acceptance Criteria:** AC-5, AC-8
- **Priority:** P0

### Setup
`apps/api/test/workbench-route-proof-correction.test.ts` extended, importing `workbench-proxy-contract.ts`.

### Steps
1. Assert `WORKBENCH_FAILURE_TABLE` has exactly thirty-two rows in declared order and is exhaustive over the widened proxied category union with no cast (`G-18`).
2. Assert `runtime:runtime-closing` maps to `503 workbench_closing` and `runtime:close-release-unconfirmed` to `503 workbench_release_unconfirmed`, with their declared messages.
3. Assert `WORKBENCH_FAILURE_TABLE_SHA256` equals the recomputed digest and differs from the base-SHA value `2273128ddfb69c81bbea8b8a09e55706291f433d8d776f09623d13567f633b15`.
4. Re-execute the BL-011 matrix so all thirty-two rows carry their own execution identifiers and redaction scans.
5. Scan every message for a protected raw value.

### Expected Result
Thirty-two exhaustive rows, two new `503` rows with safe messages, a recomputed hash, and a re-executed matrix.

### Expected Evidence
The thirty-two-row listing with statuses and codes; the old and new hashes; the re-executed BL-011 matrix artifact.

---

## Test V-10: Reconciliation, adoption, and the one-shot boundary

- **Type:** Integration
- **Task:** T-3, T-5
- **Acceptance Criteria:** AC-13, AC-14
- **Priority:** P0

### Setup
The application instance driven through `beginReconciliation` with an observation that can be held open, plus an adoption fixture whose candidate is attributable.

### Steps
1. Close a project whose entry is `reconciling` and assert `reconcile-in-progress` with zero `signal`, zero `terminate`, zero adoption attempts, and the registration retained.
2. Close a `failed` entry classified `reconcile-unconfirmed` and assert `reconcile-unresolved` with the same inertness.
3. Let reconciliation resolve to an adopted runtime, close, and assert the exact release triple, the durable removal, and the post-removal stable-route result.
4. Let reconciliation resolve to positive absence, close, and assert success with zero `signal`.
5. Assert no close path starts, re-arms, or extends reconciliation, and that the delivered one-shot boundary is unchanged.

### Expected Result
Both reconciliation-related rejections inert and reachable; both resolutions closable; the one-shot boundary untouched.

### Expected Evidence
Four transcripts with their ledgers and registration observations; the boundary assertion against the delivered reconciliation audit.

---

## Test V-11: Stale settlements, interruption, and shutdown

- **Type:** Integration
- **Task:** T-3
- **Acceptance Criteria:** AC-1, AC-2, AC-15, AC-16
- **Priority:** P0

### Setup
The manager fixture with a scheduler that can deliver a settlement after its project has been retired or claimed, and an application fixture that can be halted between phases.

### Steps
1. Deliver a late stop settlement, a late restart settlement, and a late reconciliation observation for a retired or claimed project.
2. Assert each installs nothing, emits nothing, records no cleanup, touches no other project, and is accounted in `audit().lateCloseSettlements`; assert additionally that a late settlement arriving while a claim for that project is installed also raises that claim's `lateWork` and fails the close closed, while a late settlement arriving after retirement raises `lateCloseSettlements` only.
3. Assert every entry-installing site refuses a retired identifier (`G-4`).
4. Halt an in-flight close before confirmation and assert the registration is retained and settles truthfully on the next boot.
5. Halt an in-flight close after removal and assert the registration is absent and the candidate is positively excluded.
5a. **Interruption during release and sweep, before confirmation, with a surviving candidate (B6, `S-74`; expectation corrected in revision 7).** Halt the process while phases 3 and 4 are in progress, before any confirmation is evaluated, while at least one attributable candidate for P is still alive. Assert the unconditional invariants first: `commitRemoval` was never invoked, proven from the durable row rather than from a log line; the registration is still present with four byte-identical durable fields; the interrupted generation retains the entry `failed` classified `close-release-unconfirmed` and publishes `Failed`; and the interrupted close delivered **zero** signals to the candidate. Then assert the replacement boot settles that candidate through the **unchanged** reconciliation conjunction rather than to a value this validation chose: when the full attribution-and-readiness conjunction holds, the boot adopts — entry `running`, published `Running` read from the route projection that publishes it, adopted `pid:processStartTime:port` identical to the survivor's — and asserting `unresolved` here would contradict `ADR-260815-api-restart-runtime-reconciliation`; when any element cannot be proven, the boot settles `unresolved` — entry `failed` classified `reconcile-unconfirmed`, published `Failed` — and the element that refused is named. Assert `absent` and `Stopped` are unreachable while the survivor is alive. Assert the branch is corroborated by the boot's own reconciliation record for the subject, not inferred from the entry state. Assert the replacement boot's own teardown releases connections, terminates, audits, and only then removes; that residual is zero across every class afterwards; and that a safe retry settles on the branch the boot produced — `closed` on the adopted branch, the bounded `reconcile-unresolved` refusal with zero signals on the unresolved branch. Assert signals are carried in three separately labelled accounts — the interrupted close's, the replacement transition's own orderly cleanup, and the retry's — and that no assertion states or implies zero across the whole episode. The designated real-host counterpart is episode `E-6` in `V-17`, and the two must agree on every invariant and each record their branch.
6. Assert the prohibited pairing — absent registration with an unexcluded attributable candidate — is unreachable.
7. Drive `shutdown()` with a close in flight and assert the close settles `manager-shutdown`, that shutdown awaits it before sweeping ownership, and that no claim survives.

### Expected Result
Every stale settlement inert and accounted; all three interruption points leave a truthful recoverable state with no false deletion; the prohibited pairing unreachable; shutdown drains closes before sweeping.

### Expected Evidence
Three stale-settlement transcripts with audit deltas; three interruption transcripts with their boot observations, including `S-74`'s surviving-candidate attribution record, its zero-signal proof for the interrupted close, its recorded post-boot branch with the reconciliation record that corroborates it, its three per-phase signal accounts, its replacement-boot teardown order, and its zero residual; the unreachability assertion; the shutdown ordering transcript.

---

## Test V-12: Web transport parsing, statuses, and bounds

- **Type:** Unit
- **Task:** T-6
- **Acceptance Criteria:** AC-7, AC-19
- **Priority:** P1

### Setup
`apps/web/src/project-close-client.test.ts` extended, with a stubbed fetch returning each declared response.

### Steps
1. Assert `CLOSE_FAILURE_MESSAGES` and `CLOSE_FAILURE_STATUS` each have exactly eleven members matching the server vocabulary and statuses.
2. Parse a response for each of the eleven categories and assert the resulting failure value.
3. Parse a response whose status and category disagree, one with an extra key, one with a missing key, and one with a non-object body, and assert each is refused.
4. Assert `PROJECT_CLOSE_TIMEOUT_MS === 45_000` and that it strictly exceeds `runtimeCloseOverallBoundMs(defaults, true, defaults.closeOwnershipSweepCap) === 41_000` — the `B-12` caller-visible ceiling — computed rather than restated (`G-20`).
5. Assert the request is aborted at the bound and that the abort surfaces the delivered unknown outcome.

### Expected Result
Eleven categories parsed exactly, four malformed controls refused, the bound raised and strictly greater than the largest manager bound.

### Expected Evidence
Parse matrix with eleven positive and four negative rows; the bound comparison transcript and the `G-20` guard result.

---

## Test V-13: Project Home admission, rendered equivalence, and settlement refresh

- **Type:** Component
- **Task:** T-6, T-7, T-8
- **Acceptance Criteria:** AC-7, AC-19
- **Priority:** P0

### Setup
`apps/web/src/use-project-close.test.tsx`, `App.close.test.tsx`, and the new `project-close-component-matrix.test.tsx` with two rendered cards and a recording transport.

### Steps
1. Build the admission matrix: for each pending state of P — none, close-confirming, close-pending, close-retry, close-unknown, stop, restart, start — record which of Open, Close, Stop, and Restart the controller admits for P and for Q, and assert it row for row against the action-plan admission table.
2. Assert a pending close for P admits every action for Q and refuses only P's.
3. Assert a pending stop or restart for P refuses a close for P and admits a close for Q.
4. For every matrix row and every rendered card, assert `disabled === !admits(action, card)`.
5. **Dialog exclusivity and dismissal (B4, `S-72`).** Assert at most one close dialog can exist: `closeDialogId` is a single optional and `openClose` refuses while it is set. Assert the dialog renders only in `confirming` and in `pending` with `transmitted === false`, and that confirming transmits and dismisses it in the same update, so no peer control is ever unreachable while a close is in flight.
6. **Two pending submissions (B4, `S-64`).** Start closes for P and Q, hold both, and assert each has its own owner, controller, and generation; that each settlement applies only through `ownsClose(projectId, owner)`; and that neither settlement mutates the other's record, owner, focus target, or announcement.
7. **Same-project duplicates (B4, `S-73`).** Assert a second transmission for the same project is refused at the owner layer (`closeOwners.has(id)`) and a second send within one record is refused at the `transmitted` layer, and that `retryClose` racing an in-flight transmission is refused.
8. Assert `closeSettlementVersion` increments exactly once per settled successful close and never on rejection, cancel, or an unknown outcome that stays unknown.
9. Assert exactly one additional runtime-state request per increment.
10. Assert the dialog's `aria-modal`, contained focus, `Escape` and Cancel inertness, and `aria` wiring are unchanged for the dialog's whole (now pre-transmission) life; that `focusTarget` has eight members; that each of the five focus transitions restores to the declared target on that card; and that all five announcement classes are present and prefixed with the project's display name.
11. Assert the eight new categories map to their declared phases and messages.
12. **List-lane alignment (revision 3, finding 5).** Assert the lane split: `openClose`, `confirmClose`, `retryClose`, `stop`, `restart`, and `open` take no global owner and are admitted per card, while `submit`, `retrySameSubmission`, `retryList`, `refreshProjects`, and `refreshClose(id)` take the global owner lane. Assert a pending or transmitted close never refuses a list-bearing action, and that `refreshClose(id)` is refused — and rendered disabled — exactly while the lane is busy.
13. **Stale list response (revision 3, finding 5).** Issue a list request, settle a successful close for a project present in that response, then resolve the request. Assert the response is discarded without mutating `state.projects`, that exactly one replacement request of the same kind is issued, that the replacement's result is the one applied, and that the closed project never appears in the rendered list. Repeat with the response resolving *before* the settlement and assert the ordinary delivered path is unchanged.
14. **Closed-project filter (revision 3, finding 5).** Assert `closedProjectIds` gains an entry on every close settling `closed` or `already-absent`, that every applied list response is filtered through it, and that a hand-injected list response containing a closed ID still cannot re-add its card. Assert a project registered after a close receives a different ID and is rendered normally, so the filter hides nothing legitimate.

### Expected Result
Per-project scoping exact; the dialog exclusive and pre-transmission only, so `AC-7`'s peer-usability requirement and the dialog's focus containment no longer conflict; two concurrent submissions independent and same-project duplicates excluded at both layers; rendered state provably equivalent to admission; one refresh per settlement; delivered dialog semantics preserved within their shortened life; and the two lanes aligned, so no list response superseded by a close settlement is ever applied and no closed card is ever re-added.

### Expected Evidence
Admission matrix with per-card admitted and refused sets, matching the action-plan table row for row; the exclusivity and dismissal transcript; the two-project concurrent-submission transcript; the duplicate-refusal transcript for both layers; the eight-target focus table and the five name-prefixed announcement texts; the equivalence assertion count; the settlement-version and request-count transcripts; the lane-membership table naming each action's lane; the stale-list transcript showing the discarded response, the single replacement, and the applied result; and the closed-project filter transcript with its re-registration control.

---

## Test V-14: Filesystem non-mutation across every close outcome

- **Type:** Integration
- **Task:** T-14
- **Acceptance Criteria:** AC-6, AC-17
- **Priority:** P0

### Setup
`apps/api/test/project-close-non-mutation.test.ts` extended, with disposable fixtures for P and Q each containing at least one symbolic link, one non-default permission mode, and one nested directory.

### Steps
1. Capture a recursive non-empty manifest of both fixtures before each enumerated outcome.
2. Execute the outcome through production paths.
3. Capture the manifest again and compare relative membership, file-content digests, non-dereferenced link-target digests, permission modes, and modification timestamps, excluding access-time effects.
4. Repeat for running success, retained-failed success, `release-unconfirmed`, `removal-failed`, each admission rejection, the eight-concurrent case, and the repeated-close case.
5. **Run the rewritten `G-15` (B3).** During every executed scenario, instrument the `node:fs` and `node:fs/promises` module boundary and record every path argument passed to the frozen write-capable set — `writeFile`, `appendFile`, `mkdir`, `rm`, `rmdir`, `unlink`, `rename`, `copyFile`, `cp`, `chmod`, `chown`, `utimes`, `truncate`, `symlink`, `link`, `mkdtemp`, `createWriteStream`, and `open` with any write flag. Assert zero such calls receive a path under any registered project directory root. Assert the only observed write-capable calls belong to the two permitted families — the runtime's own `os.tmpdir()`-rooted ephemeral runtime-data directory created and removed by `project-runtime-process.ts`, and the isolated database directory created by `project-library.ts` — and prove each family's root lies outside every registered project root rather than exempting it by name. Its negative control is a fixture close path that writes a marker file inside the selected project directory, which must fail the guard.
6. **Run `G-23` over the computed governed production scope (revision 8, D1).** Measure **every** file the change set adds, modifies, or renames — with rename detection, reading a renamed file's base text from its pre-rename path — and record each with its `node:fs` and `node:fs/promises` base and head member sets, its added members, its added write-capable members, and its **computed** role. A file absent at the base carries an empty base set rather than being skipped. Recompute the entry-point closure `K` from the frozen two-member `BL020_PRODUCTION_ENTRYPOINTS` using a specifier grammar that recognises `import … from`, `export … from`, bare side-effect `import '…'`, and dynamic `import('…')` in single and double quotes. Assert the no-new-write-capable-import rule over `Governed = (K ∪ SELECTED_CLOSE_SOURCE_PATHS) ∩ C` only; the delivered allowlist keeps what it has and may not grow. Assert that the validation, fixture, CLI, and evidence-writer modules this plan requires are measured and reported, are **not** asserted against, and are proven unreachable from both entry points — so the guard passes on a tree in which they legitimately add `mkdir`, `rm`, `writeFile`, `rename`, and `symlink`.

6a. **Run `G-23`'s eight negative controls (revision 8).** Assert each fails by its own distinct violation code and that no code absorbs another's failure: `writeFile` injected into the governed `apps/api/src/workbench-proxy-manager.ts`, and into a governed entry absent at the base, both failing `governed-write-capable-import-added`; the changed `apps/api/src/project-close.ts` relabelled `validation-harness`, failing `selected-source-degoverned`; a changed file dropped from the measured census, and one supplied twice, failing `changed-file-unmeasured`; an existing file marked `presentAtBase: false` and an added file given a non-empty base set, both failing `base-comparison-incomplete`; `apps/api/src/app.ts` relabelled `validation-harness` and a changed unratified non-test module under `src/` left `unclassified`, both failing `role-misclassified`; `apps/api/src/project-close-evidence.ts` injected into the supplied closure, failing `validation-module-executable`; and a closure with `apps/api/src/project-runtime-manager.ts` removed, failing `governed-scope-reduced`. Additionally assert the grammar's completeness: a production module reachable only through a bare side-effect `import './x.js'` is still governed, and a grammar that recognises only `from '…'` fails `governed-scope-reduced`.

### Expected Result
Both manifests identical on all five attributes for every outcome; every manifest non-empty and finite; zero write-capable filesystem call receives a registered project path; every changed file measured and reported with a computed role and none `unclassified`; no new write-capable filesystem import anywhere in the governed production scope; and each of `G-23`'s seven failure conditions rejected by its own code under its own negative control.

### Expected Evidence
Per-outcome before and after manifest digest pairs for P and Q; the `G-15` call-argument ledger listing every observed write-capable call with its path and permitted family, plus its failing marker-file negative control; the `G-23` import-delta report listing every changed file with its computed role, added members, and added write-capable members, alongside the base SHA, the measured change-set size, the recomputed closure size, the governed and changed-selected-source counts, and the per-role totals; and the eight-row `G-23` negative-control table naming each injected corruption and the violation code it produced.

---

## Test V-15: Browser proof of the close experience

- **Type:** End-to-end (Chromium, keyboard-only)
- **Task:** T-7, T-8, T-12
- **Acceptance Criteria:** AC-5, AC-7, AC-19
- **Priority:** P0

### Setup
`tests/e2e/project-close.spec.ts` against a real application with real runtimes for P and Q.

### Steps
1. Open the Close dialog from a `Running` card by keyboard, verify the modal semantics and contained focus, cancel with `Escape`, and assert the project is still registered.
2. Repeat from a `Failed` card.
3. Begin a close for P, confirm it, and assert the dialog is dismissed at transmission and that Q's Open, Close, Stop, and Restart are keyboard-reachable and operable while P's close is still pending — the two halves of `AC-7` that revision 1 could not satisfy together.
3a. Begin a close for Q while P's is still pending and assert both settle independently with their own name-prefixed announcements and their own focus targets.
4. Complete the close and assert the name-prefixed success announcement, the removed card, the focus recovery target, and exactly one additional runtime-state request.
5. Force a failure and assert the failure announcement, the retained card with its truthful state, and focus on that card's Retry close control.
6. Force an unknown outcome and assert the unknown announcement, the preserved card, focus on that card's Refresh close result control, the absence of an automatic repeat, and both authoritative observations on manual refresh; cover the resolution to confirmed absence and to retained registration.
7. Hold a WebSocket open across the close and assert it can no longer exchange frames; navigate the stable route afresh and assert the published route error with no runtime start.

### Expected Result
The full keyboard-only close experience, peer availability during a pending close, two independent concurrent closes, five name-prefixed announcement classes, per-card focus recovery, both unknown resolutions, and dead connections after close.

### Expected Evidence
Playwright trace and the browser episode records in `test-results/bl-020/designated-episode.json`.

---

## Test V-16: Evidence contract, catalog, guards, mutation classes, and validator

- **Type:** Unit
- **Task:** T-10, T-11
- **Acceptance Criteria:** AC-8, AC-21, AC-22, AC-25
- **Priority:** P0

### Setup
`apps/api/test/project-close-evidence.test.ts` importing `project-close-evidence.ts` and the committed matrix artifact.

### Steps
1. Assert `BL020_SCENARIOS` has exactly seventy-five members with unique identifiers in declared order.
2. Assert `SelectedCloseSources` has exactly fifteen members and `CommittedEvidenceWriters` exactly three; that each of the twenty-eight guards declares exactly one of the two sets and a non-empty subset of it; and that every file a guard scans is a member of the set it draws from — so `G-19` reaches the stop and restart route files and the web runtime-state file, and `G-22` reaches all three evidence writers, which revision 1's single twelve-member set did not (B3). **Revision 8 additions:** assert `BL020_PRODUCTION_ENTRYPOINTS` is a frozen two-member tuple whose members both exist and are readable at the branch head; assert `BL020_VALIDATION_ONLY_MODULES` is a frozen five-member tuple, that no member lies under a test location (so the two exemption grounds stay independently meaningful), and that no member is reachable from either entry point; assert `G-23` declares exactly seven violation codes; and assert `BL020_DECLARED_COUNTS.productionEntrypoints`, `.validationOnlyModules`, and `.importDeltaViolationCodes` equal 2, 5, and 7 and match the lengths of the declarations they describe. Assert `G-23` alone declares neither frozen source set, because its scope is computed from the repository rather than declared — and assert it nonetheless governs every changed `SelectedCloseSources` member.
3. Execute every guard against the branch head and against its negative control fixture; assert each passes on the head and fails on its control. For `G-5` and `G-6`, additionally assert the base-SHA positive control. For `G-23`, assert the **eight** negative controls of `V-14` step 6a, each failing by its own distinct code, and assert the head-tree positive control: the guard passes on a working tree in which the required validation, fixture, CLI, and evidence-writer modules do add write-capable members, so the corrected scope is proven satisfiable rather than assumed.
4. Execute all eighteen mutation classes against the mutation baseline; assert each rejects its corruption by name and that the unmutated baseline validates. Assert the baseline is a declared **substrate and not evidence**: it publishes `executedBaselineScenarios` naming exactly the scenarios that are executions of themselves, every other catalog identity in it carries a structural copy of a real executed row re-keyed to that identity's bound and sweep shape, it validates clean before any mutation is applied, and no structural copy is present in the committed `test-results/bl-020/close-matrix.json`, which must be seventy-five executions of themselves. `M-15` corrupts a confirmation record or the invocation pair of a row declaring a late-acquisition seam, `M-16` corrupts an ownership-cardinality or bound value, `M-17` corrupts a settlement site, an elapsed origin, or a timestamp, and `M-18` leaves `managerAudit.refusedLateAcquisitionsDelta` unchanged — or rewrites the refusal's classification away from `runtime-closing` — on a row declaring the running-reuse or starting-join seam.
5. Assert the twenty declared bounds equal the values computed from `PROJECT_RUNTIME_DEFAULTS` with their declared `(requiresQuarantineResolution, sweepUnits)` pairs and from the delivered client constants, and that every row's declared bound is recomputed rather than trusted.
6. Assert the validator enforces the per-project signal-accounting rule, the residual zero-or-null discipline, the teardown separation rule, the confirmation-record completeness rule, the drain and connection-audit invocation ceilings, the ownership-cardinality bound-agreement rule, the elapsed-origin cross-check, and the redaction scan.
7. **Elapsed-origin inhabitability, keyed on the settlement site (N1, corrected in revision 3, rewritten in revision 6).** Assert `BL020_PRE_CLAIM_SETTLEMENTS` is a frozen **eight**-member tuple in the admission order of action-plan section 3 — `manager-shutdown`, `persisted-absence`, `contender-join`, `reconcile-in-progress`, `reconcile-unresolved`, `start-in-progress`, `restart-in-progress`, `stop-in-progress` — and that `BL020_DECLARED_COUNTS.preClaimSettlements` equals its length. Assert `routeEnteredAt` is always present; that `claimInstalledAt` is non-null exactly when `preClaimSettlement === null`; and that `elapsedOrigin` is `'claim'` exactly when `claimInstalledAt !== null`. Assert the validator rejects: a `preClaimSettlement` outside the enumeration; a non-null `claimInstalledAt` on a row naming a site; a null one on a row naming none; a `'route-entry'` origin on an admitted row; a site disagreeing with the row's settled outcome where the site determines it; a row naming a site while carrying `ownershipCardinality`, `confirmation`, or a non-zero `drainInvocations` or `connectionAuditInvocations`; a `claimInstalledAt` earlier than `routeEnteredAt`; and an `elapsedMs` not reproducible from the declared origin.

   **Assert the category cannot be the discriminator**, by validating the three rows a category-keyed rule gets wrong and rejecting the falsified variants of each: an admitted `already-absent` settled by phase 6, which carries `preClaimSettlement: null` and a non-null `claimInstalledAt` and is rejected if it names `persisted-absence`; a `manager-shutdown` settled by an in-phase `shuttingDown` re-read, which is admitted and is rejected if it names the head site; and a contender that inherited `release-unconfirmed`, which names `contender-join` with a null `claimInstalledAt` and is rejected if it omits the site. Assert the over-cap refusal is treated as **admitted**: `S-75` names no site, carries a non-null `claimInstalledAt` and `elapsedOrigin: 'claim'`, cannot be inherited by a contender, and a validator that rejected it would be wrong about its own gate. Run `G-28` against the module and against its four negative controls — a reintroduced category list consulted for `claimInstalledAt`, the site test replaced by `outcome === 'closed'`, a ninth enumeration member, and a reordered enumeration — and assert no `CommittedEvidenceWriters` member derives admission from a settled category.
8. **Over-cap cardinality witness (revision 3, finding 4).** Assert the four members are constrained together: `capExceeded === (frozen > cap)`; `capExceeded === true` iff the outcome is `ownership-cardinality-exceeded`; `sweepUnits` is an integer in `1 … cap` on every admitted row and exactly `1` on a `capExceeded` row; and the declared bound equals `runtimeCloseOverallBoundMs` recomputed from that row's `(requiresQuarantineResolution, sweepUnits)` pair on both branches. Assert `S-75` validates as `frozen: 5`, `cap: 4`, `capExceeded: true`, `sweepUnits: 1`, bound `B-5`, and that `M-16` rejects each of: a `sweepUnits` of `5`, a `sweepUnits` of `2` on a `capExceeded` row, a `capExceeded` of `false` with `frozen > cap`, and a bound not recomputable from the recorded pair.
9. **Late-acquisition execution rule (revision 3, finding 8; extended in revision 6).** Assert the validator rejects, as **unexecuted**, a row that declares the running-reuse or starting-join seam but carries no refused-acquisition settlement, omits that seam from `productionPathsEntered`, shows no increase in `managerAudit.refusedLateAcquisitionsDelta`, or carries a refusal whose `classification` is not `runtime-closing` — the only classification the post-`await` recheck produces, so any other value proves the hold was released where the recheck is not. Assert it also rejects a row carrying a recorded refusal the production recheck did not produce: the second arrival's `caller-cancelled` settlement relabelled as a refusal, which fabricates a witness where only one exists. Assert the invocation pair is enforced as the second, independent half of the witness the fixture cannot write: a `closed` row declaring the seam must carry `drainInvocations: 2` and `connectionAuditInvocations: 2`, a `release-unconfirmed` row declaring it must carry `2` and `1`, and `M-15` rejects each of the four falsified pairs. Assert every one of these rejections is distinct by name from the residual rejection a `closed` row with a non-zero residual class receives.
10. **Migrated BL-017 and BL-018 guards (revision 4, C2).** Assert `validateSelectedStopSource` and the BL-018 restart source guards accept the migrated sources, that every delivered negative control still fails with its original violation code, that `BL018_ADDED_SOURCE_GUARD_CODES` still has 16 members, and that the migrated stop guard rejects a source in which any direct `entries.set(` is reintroduced outside `installEntry`. This is the cross-check that the BL-020 change set strengthened rather than weakened the delivered guards.

### Expected Result
Seventy-five scenarios, twenty-eight guards each with a failing negative control, eighteen mutation classes each rejecting by name, twenty bounds exact, the eight-member pre-claim settlement enumeration in admission order, two frozen source sets each containing every file its guards scan, and the validator enforcing all eight disciplines with no inhabitable representation of a fabricated elapsed value, no inhabitable representation of a fabricated admission, and no representation in which a true over-cap refusal or a genuinely executed late-acquisition race fails to validate.

### Expected Evidence
Catalog listing; guard-and-control table naming each guard's source set and scanned subset, including `G-4`'s one-entry-install-authority controls, `G-27`'s four sealed-window controls, and `G-28`'s four category-inference controls, plus the migrated BL-017 and BL-018 guard transcripts with their thirteen preserved violation codes and `BL018_ADDED_SOURCE_GUARD_CODES` still at 16; mutation-rejection table with the eighteen error names; bound comparison table with the twenty recomputed values; the settlement-site and elapsed-origin rejection matrix including the admitted over-cap row and the three rows a category-keyed rule misclassifies; the four-member cardinality-witness constraint table with its four rejections; the late-acquisition unexecuted-row rejections including the classification and invocation-pair falsifications; validator discipline transcript.

---

## Test V-17: Deterministic matrix execution and designated real-host proof

- **Type:** Acceptance / real-host
- **Task:** T-11, T-12
- **Acceptance Criteria:** AC-1 … AC-22
- **Priority:** P0

### Setup
`just verify-runtime-close` for the matrix and `just proof-runtime-close` (gated by `BL020_DESIGNATED=1`) for the designated episodes, both on a local Linux host with `code-server` and Chromium available.

### Steps
1. Execute all seventy-five scenarios in the standard fixture, capturing in the declared order, and write `test-results/bl-020/close-matrix.json` through `serializeProjectCloseMatrix`.
2. Assert every row has a non-empty `productionPathsEntered`, a `boundaryInstanceId`, a `signalCallsByProject` key set equal to its project set, drain and connection-audit invocation counts of at most two each, and an elapsed value within its declared bound measured from its declared origin; and that each row's declared bound equals the value recomputed from its own `(requiresQuarantineResolution, sweepUnits)` pair.
2a. Assert every `closed` row carries the complete eight-clause confirmation record with all clauses true and all five re-observed connection counts zero.
3. Assert every `closed` row reports all thirteen residual classes as integer zero with completed probes and an absent registration; assert every non-success reports a retained registration with four byte-identical durable fields and a four-value public state.
4. Assert every row's peer and control blocks are unchanged before and after.
5. Execute the seven designated episodes `E-1 … E-7` and write `test-results/bl-020/designated-episode.json`; assert each claimed API generation ran the repository's compiled entry point with an observed argument vector, an attributed listening socket, at least one served request, and an observed persistence file.
6. Assert a placeholder, in-process, synthesized, or assigned generation is refused by name.
7. **`E-6` (B6, expectation corrected in revision 7).** Interrupt the real API process during release and sweep, strictly before confirmation, with a surviving attributable candidate alive. Assert the unconditional invariants: no durable removal occurred; the registration is present on the replacement boot; the interrupted close delivered zero signals to the candidate; and the candidate satisfies the unchanged attribution conjunction. Then assert the boot's settlement is the branch that conjunction produced and that the episode records it with the deciding element — adoption to entry `running`, published `Running`, with the adopted identity equal to the survivor's, when the full attribution-and-readiness conjunction holds; `unresolved` classified `reconcile-unconfirmed`, published `Failed`, when any element cannot be proven — and that `absent` and `Stopped` are unreachable while the survivor is alive. Assert the replacement boot's teardown order is release, terminate, audit, remove; that residual is zero across every class; and that the safe retry settles on the branch the boot produced. Assert signals are attributed per episode phase and that a real-host interruption's replacement transition delivers none. Assert `E-6` and `S-74` agree on every invariant and that each records its branch; a branch divergence is admissible only when the recorded deciding elements differ.
8. **`E-7` (B7).** Perform one successful close followed by **three** sequential repeated close requests — four in total — and assert one `200` and three `404 project_not_found`, each repeat within its declared bound, zero runtime creations, zero signals and zero terminations after the first success, exactly one `project.closed` overall with no duplicate side effect, and that absence survives a real API-process restart.

### Expected Result
Seventy-five executed rows and seven real-host episodes, each within its declared bound, each with a production-path witness, and each with truthful residual and peer observations.

### Expected Evidence
`test-results/bl-020/close-matrix.json`; `test-results/bl-020/designated-episode.json`; the generation-authenticity refusal transcript.

---

## Test V-18: Independent residual audit

- **Type:** CLI / integration
- **Task:** T-13
- **Acceptance Criteria:** AC-1, AC-22
- **Priority:** P0

### Setup
`just proof-runtime-close-residual-audit` executed after `just proof-runtime-close`, reading the designated episode artifact.

### Steps
1. Re-observe, independently of every captured value, the nine classes: validation-owned API processes, workbench processes, attributable descendants, listeners, proxy connections, timers, in-flight close operations, database sidecars, and disposable fixtures.
2. Assert each class reports an integer zero with a completed probe flag, or an explicit withheld claim that fails the run.
3. Feed the CLI an unfinalized artifact, an unclear artifact, and a malformed artifact and assert three distinct named refusals.
4. Assert the audit reads no value from the matrix artifact as a substitute for observation.

### Expected Result
Nine zero classes with completed probes on a clean run; three distinct refusals; no copied value.

### Expected Evidence
`test-results/bl-020/residual-audit.json`; the three refusal transcripts; the independence assertion.

---

## Test V-19: Documentation contract, deferral removal, and redaction

- **Type:** Contract / static analysis
- **Task:** T-15
- **Acceptance Criteria:** AC-8, AC-22, AC-23
- **Priority:** P0

### Setup
`apps/api/test/project-close-documentation.test.ts` extended and `apps/api/test/runtime-reconcile-documentation.test.ts` updated, with `apps/api/test/runtime-stop-documentation.test.ts` re-run unchanged as a stale-claim detector.

### Steps
1. Assert each of the **thirteen** documentation categories has its declared surface updated or carries an explicit no-impact rationale, and assert the disposition table itself has exactly thirteen rows so the count cannot drift from the table again (N2).
2. Assert the eleven route categories, the two new `409` categories, the two new failure categories, the raised `PROJECT_CLOSE_TIMEOUT_MS` of `45_000`, the three configuration allowances, the four justfile recipes — `verify-close-project`, `verify-runtime-close`, `proof-runtime-close`, `proof-runtime-close-residual-audit` — and the three artifact paths each appear on at least one surface.
3. Assert zero surfaces retain a claim that running or failed close is deferred, by scanning the six recorded locations and the whole documentation tree, and assert the delivered stale-claim detectors `stop-deferred` and `lifecycle-controls-deferred` still find no match in the new prose.
4. Assert the documented recovery for `release-unconfirmed`, `removal-failed`, and `ownership-cardinality-exceeded` matches the implemented behaviour, and that no surface documents `runtime-closing` as a retained or projected state (B5).
5. Scan every committed evidence artifact and every documented example payload for a protected raw value (`G-22`, `M-14`).

### Expected Result
Every category dispositioned and asserted; no stale deferral; documented recovery accurate; no protected value anywhere.

### Expected Evidence
Token-to-surface report; the deferral scan showing zero matches; the redaction scan report with the `G-22` guard result.

---

## Test V-20: Canonical gate, prior-evidence preservation, cleanup, and prerequisites

- **Type:** System
- **Task:** T-9, T-16
- **Acceptance Criteria:** AC-17, AC-21, AC-24, AC-25
- **Priority:** P0

### Setup
A clean tree at the branch head on a local Linux host with `code-server` and Chromium, no network access required.

### Steps
1. Record the SHA-256 of every committed BL-017, BL-018, and BL-019 artifact before the change set.
2. Run `pnpm typecheck` and assert no `as any`, no `as unknown as`, and no added `@ts-expect-error`.
3. Run `just verify-focused` for the BL-020 suites, then `just verify` end to end.
4. Re-assert every recorded prior digest byte-identical, with exactly one declared exception: the re-executed BL-011 workbench failure matrix.
5. Assert the three new recipes — `verify-runtime-close`, `proof-runtime-close`, `proof-runtime-close-residual-audit` — sit between `just proof-runtime-reconcile-residual-audit` and `just verify-mvp-performance` in `verify`, that the delivered `verify-close-project` keeps its name, that no recipe name in the `justfile` is a word-order permutation of any other recipe name (N3), and that every recipe removes exactly its own isolated databases and their `-wal`, `-shm`, and `-journal` sidecars, disposable fixtures, launched runtimes, control processes, and control listeners after integrity capture and before exit, while leaving the shared compiled output `apps/api/dist` in place.
5a. **Proof recipe build ordering (revision 3, finding 7).** Assert `proof-runtime-close`'s body is `pnpm --filter @ascend/api build:ts` followed by the `BL020_DESIGNATED=1` suite, in that order, matching the delivered `proof-runtime-reconcile` body. Remove `apps/api/dist`, run `just proof-runtime-close` alone, and assert it succeeds and that every claimed API generation executed `apps/api/dist/server.js`; then change an API source, re-run, and assert the episodes ran against the rebuilt binary rather than a stale one.
6. Assert no recipe requires network access, a credential, a hosted service, unsupported hardware, a destructive environment action, indefinite observation, or manual judgment.
7. Run the residual audit after the gate and assert zero validation-owned resources remain.

### Expected Result
Every gate green, every prior digest preserved except the one declared regeneration, every validation-owned resource removed, and no unavailable prerequisite.

### Expected Evidence
`just verify` transcript; the prior-evidence digest comparison report; the cleanup ledger showing created-versus-removed resources and the retained shared build output; the `proof-runtime-close` body listing with its clean-tree and rebuild runs; the prerequisite report; the post-gate residual audit.

---

## Scenario Catalog

Seventy-five scenarios, declared as a frozen ordered tuple in `apps/api/src/project-close-evidence.ts`. Every row is produced by executing production paths in the standard two-project plus unrelated-control fixture. `B-*` is the declared bound, recomputed per row from that row's own `(requiresQuarantineResolution, sweepUnits)` pair; elapsed is measured from `execution.claimInstalledAt` when `elapsedOrigin` is `'claim'` and from `execution.routeEnteredAt` when it is `'route-entry'`, with the two cross-checked so no row can declare an origin it did not use.

The fifteen groups below carry the twenty behavioural criteria `AC-1 … AC-20`. The five verification criteria `AC-21 … AC-25` are properties of the evidence itself rather than of any single scenario, and are proven by `V-16` (contract, guards, mutation classes), `V-17` (executed matrix and designated proof), `V-18` (independent residual audit), `V-19` (documentation and redaction), and `V-20` (canonical gate, digest preservation, cleanup, prerequisites) over the committed artifacts these scenarios produce.

### Group A — Running close succeeds (AC-1)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-1 | Running project, idle runtime, no proxy connections | B-5 | `closed`; audit triple confirmed; five-count audit zero; registration absent; thirteen residual classes zero |
| S-2 | Running project with one in-flight proxied HTTP request | B-5 | `closed`; request destroyed during drain; peer request unaffected |
| S-3 | Running project with one open proxied WebSocket | B-5 | `closed`; socket terminated during drain; peer socket unaffected |
| S-4 | Running project with one pending proxy resolve operation | B-5 | `closed`; pending controller aborted; no `resolveTarget` call during drain |
| S-5 | Running project with mixed HTTP, WebSocket, and raw-socket load | B-5 | `closed`; all five per-token counts zero; peer counts unchanged |
| S-6 | Running project whose prior generation is quarantined | B-6 | `closed`; quarantine resolved before release; no quarantined identity remains |
| S-7 | Running project whose runtime exits gracefully within `B-16` | B-5 | `closed`; exactly one `signal` for P; graceful path recorded |
| S-8 | Running project whose runtime requires force termination within `B-17` | B-5 | `closed`; graceful then force recorded; exactly one owned identity released |

### Group B — Retained failed close and release or removal failure (AC-2, AC-18)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-9 | Failed entry whose identity is positively absent | B-5 | `closed`; zero `signal` for P; registration absent |
| S-10 | Failed entry whose attributable identity is still alive | B-5 | `closed`; exactly one `signal`; audit triple confirmed |
| S-11 | Failed entry whose identity is quarantined | B-6 | `closed`; quarantine resolved; registration absent |
| S-12 | Failed entry classified `reconcile-unconfirmed` | B-5 | `rejected: reconcile-unresolved`; zero `signal`; registration retained |
| S-13 | Running close whose release cannot be confirmed | B-5 | `rejected: release-unconfirmed`; retained `failed` classified `close-release-unconfirmed`; public `Failed`; ownership retained |
| S-14 | Failed close whose release cannot be confirmed | B-5 | `rejected: release-unconfirmed`; classification and ownership as declared |
| S-15 | Confirmed release then `commitRemoval` fails | B-5 | `rejected: removal-failed`; registered released row; public `Stopped`; zero further `signal` |

### Group C — Ordering and durable non-mutation on failure (AC-3)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-16 | Success ledger order: confirmation strictly precedes `commitRemoval` | B-5 | Ordered ledger with the confirmation predicate before the single removal call |
| S-17 | `removal-failed`: four durable fields compared before and after | B-5 | Four fields byte-identical; row retained |
| S-18 | `release-unconfirmed`: four durable fields compared before and after | B-5 | Four fields byte-identical; row retained |
| S-19 | Each of the nine admission rejections: durable fields compared | B-5 | Four fields byte-identical in every case; public state within the four-value vocabulary |

### Group D — Delivered stopped behaviour preserved (AC-4)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-20 | Stopped project close | B-5 | `closed`; zero `signal`; zero `terminate`; registration absent |
| S-21 | Never-started registered project close | B-5 | `closed`; zero `signal`; no runtime creation |
| S-22 | Registered-released project close | B-5 | `closed`; `already-absent` semantics on release; zero `signal` |
| S-23 | Eight concurrent `DELETE`s for a stopped project | B-5 | One `200`, seven `404`; zero `signal`; zero `terminate`; one `project.closed` |
| S-24 | Close of an identifier that was never registered | B-5 | `already-absent` → `404 project_not_found`; no effect of any kind |

### Group E — Proxy transport after close (AC-5)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-25 | WebSocket opened before the close attempts a frame after it | B-5 | Frame exchange fails; socket closed; no runtime start |
| S-26 | HTTP response streaming at close time | B-5 | Response terminated; client observes termination; no partial success claim |
| S-27 | Fresh stable-route navigation after removal | B-5 | Published route error rendered; zero `projectRuntime.start` calls; no identity or authority in the payload |

### Group F — Filesystem integrity (AC-6)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-28 | Manifests around a running close success | B-5 | Selected and peer manifests identical on membership, content digests, link-target digests, modes, mtimes |
| S-29 | Manifests around a retained-failed close success | B-5 | Identical on all five attributes |
| S-30 | Manifests around `release-unconfirmed` and `removal-failed` | B-5 | Identical on all five attributes |
| S-31 | Manifests around every admission rejection | B-5 | Identical on all five attributes; every manifest non-empty |

### Group G — Project Home experience (AC-7)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-32 | Close dialog opened by keyboard from a `Running` card | B-13 | `aria-modal`, contained focus, described-by wiring, pending state on confirm |
| S-33 | Close dialog opened by keyboard from a `Failed` card | B-13 | Same semantics; card state truthfully rendered |
| S-34 | `Escape` and Cancel before transmission | B-13 | Zero requests; project unchanged; focus returned to the invoking control |
| S-35 | Peer controls during a pending close for P | B-13 | Q's Open, Close, Stop, and Restart all admitted and operable |
| S-36 | Rendered-versus-admitted equivalence across the matrix | B-13 | `disabled === !admits(action, card)` for every card in every row |
| S-37 | Success and failure announcements with focus recovery, and a project-list request in flight across the settlement | B-13 | Three announcement texts; focus recovers to next Close, previous Close, or the Ascend heading; the in-flight list response, stamped at the earlier `closeSettlementVersion`, is discarded and re-issued rather than applied, exactly one replacement request is made, and the closed card never reappears — under the reverse ordering the delivered path is unchanged |

### Group H — Six-surface agreement and privacy (AC-8)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-38 | Agreement on a successful close | B-5 | Route response, registration, public state, stable route, events, and audits all agree |
| S-39 | Agreement on each failure outcome | B-5 | All six surfaces agree per outcome; emitted-event set exact |
| S-40 | Redaction scan of committed artifacts and public payloads | B-5 | No path, identity, port, authority, command, environment value, credential, terminal or source content, stack, or raw error |

### Group I — Concurrency and cross-operation contention (AC-9 … AC-12)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-41 | Eight concurrent `DELETE`s for a running project | B-5 | One `closed`, seven `already-absent`; exactly one `terminate`; exactly one `commitRemoval`; one `project.closed` |
| S-42 | Close arrives while a start is in progress | B-5 | `rejected: start-in-progress`; registration retained; one authoritative generation |
| S-43 | Start arrives while a close claim is installed | B-5 | Acquisition refused `runtime-closing`; the late start installs nothing |
| S-44 | Close arrives while a stop is in progress, then retried | B-5 | `rejected: stop-in-progress`, then `closed`; exactly one effective release |
| S-45 | Stop arrives while a close claim is installed | B-5 | `close-in-progress` → `409 runtime_close_in_progress`; nothing mutated |
| S-46 | Close arrives while a restart is in progress, then retried | B-6 | `rejected: restart-in-progress`, then `closed`; no replacement generation survives |
| S-47 | Restart arrives while a close claim is installed | B-5 | `close-in-progress` → `409 runtime_close_in_progress`; no pending admission, quarantine, or stale route target |

### Group J — Reconciliation and adoption (AC-13, AC-14)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-48 | Close of an adopted runtime after a real API restart | B-5 | `closed`; exact release triple; registration absent; stable route serves the route error |
| S-49 | Close while the entry is `reconciling` | B-20 | `rejected: reconcile-in-progress`; zero `signal`, zero `terminate`, zero adoption attempts |
| S-50 | Close of a `failed` entry classified `reconcile-unconfirmed` | B-5 | `rejected: reconcile-unresolved`; registration retained; condition observable |
| S-51 | Close after reconciliation resolves to an adopted runtime | B-5 | `closed`; exactly one `signal`; residual zero |
| S-52 | Close after reconciliation resolves to positive absence | B-5 | `closed`; zero `signal`; no adoption attempt |

### Group K — Stale work, interruption, and shutdown (AC-15, AC-16)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-53 | Late stop settlement for a retired project | B-5 | Installs nothing, emits nothing, records no cleanup; `lateCloseSettlements` incremented |
| S-54 | Late restart settlement for a claimed project | B-6 | Same inertness; peer untouched |
| S-55 | Late reconciliation observation for a retired project | B-20 | Same inertness; no entry reinstalled, no event emitted, no cleanup recorded, no identity created, and no other project touched; **stated exactly in revision 7** — the observation is accounted exactly once in `lateCloseSettlements` and, because retirement has already released the claim, raises no `claim.lateWork`, which is the same rule that raises both counters when the observation arrives for a project still claimed |
| S-56 | API interruption between confirmation and removal | B-5 | Registration retained; next real boot settles truthfully |
| S-57 | API interruption after removal | B-5 | Registration absent; candidate positively excluded; prohibited pairing unreachable |
| S-58 | Manager shutdown while a close is in flight | B-5 | `rejected: manager-shutdown` → `503`; shutdown awaits the close; no surviving claim |

### Group L — Peer isolation and the unrelated control (AC-17)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-59 | Peer identity, readiness, and stable route across a success | B-5 | All three unchanged before and after |
| S-60 | Peer connections during the selected project's drain | B-5 | Peer connection count unchanged; peer traffic uninterrupted |
| S-61 | Peer registration across every outcome | B-5 | Peer's four durable fields byte-identical in every case |
| S-62 | Unrelated control process during a close | B-5 | Not adopted, not signalled, not terminated; non-candidacy proven from its observed argument vector |
| S-63 | Unrelated control listener during a close | B-5 | Listener availability unchanged; no port reclaimed |
| S-64 | Close of Q admitted while P's close is pending | B-5 | Both closes settle independently; each releases only its own identity |

### Group M — Unknown client outcome (AC-19)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-65 | Unknown outcome resolving to confirmed absence | B-13 | Card preserved, phase `unknown`, no automatic repeat; the per-card refresh is admitted only while the global list-bearing lane is idle and renders disabled otherwise; both authoritative observations re-issued; a response superseded by a close settling meanwhile is discarded and re-issued; resolves to normal success |
| S-66 | Unknown outcome resolving to retained registration | B-13 | Card preserved with its truthful public state; the refresh joins the list-bearing lane; both authoritative observations re-issued; no false success and no card removed by a filter, because no close settled `closed` or `already-absent` |

### Group N — Repeated close (AC-20)

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-67 | One successful close followed by **three** sequential repeated closes — four requests in total | B-5 | One `200` then three `404 project_not_found`, each request within `B-5`; zero runtime creations; zero `signal` and zero `terminate` after the first success; exactly one `project.closed` overall; no duplicate side effect of any kind |
| S-68 | Absence after a real API-process restart | B-5 | The project is still absent; no adoption candidate; peer and fixtures unchanged |

### Group O — Revision 2 additions (AC-1, AC-3, AC-7, AC-10, AC-16, AC-18)

Seven scenarios added after the independent review. Each is reachable from delivered behaviour; none is constructed by injecting an impossible state.

| ID | Scenario | Bound | Expected settled result |
|----|----------|-------|-------------------------|
| S-69 | **Choreography replaced in revision 6, split across two arrivals in revision 7.** Two real loopback HTTP arrivals with disjoint declared roles: **arrival A** is issued before the close, enters `start()` while no claim exists, and is held at the one declared running-reuse await; **arrival B** is issued after phase 1 settled, during phases 2 – 4, and is held at `resolveTarget`'s first `await`, after its per-token registration and before any acquisition request. A is released inside phase 1's drain; B is released at the re-drain (AC-10, B1) | B-5 | A resumes at the mandatory post-`await` recheck, is refused `runtime-closing`, settles `503 workbench_closing`, and releases its pending key — so phase 1's five zeros are earned. Phase 5's first `auditConnections()` then observes `pendingOperations: 1` with every other per-token count zero — the phase-1 zero is stale on an otherwise correct close — and the single permitted re-drain runs under the still-unfired armed drain deadline; B, already aborted by that re-drain's synchronous head, settles `caller-cancelled` (`502 workbench_start_cancelled`) and releases its pending key; the drain reaches five zeros; the second audit is clear; `closed` with all eight confirmation clauses true and `claim.lateWork` at `0`. Witness: `drainInvocations: 2`, `connectionAuditInvocations: 2`, `running-reuse-await` in `productionPathsEntered`, **exactly one** settled refusal classified `runtime-closing`, and `managerAudit.refusedLateAcquisitionsDelta` at or above one. B is never recorded as a refusal. `residual` is captured only after all three settlements; a run that never reached the recheck fails as a fixture failure (`M-18`) and a falsified invocation pair fails `M-15` |
| S-70 | **Choreography replaced in revision 6, split across two arrivals in revision 7.** The identical two-arrival choreography; arrival B is never released before the armed `closeDrainAllowanceMs` deadline (AC-18, B1) | B-5 | A's refusal settles exactly as in `S-69` and raises `managerAudit.refusedLateAcquisitionsDelta` without raising `claim.lateWork`; B is suspended **before** the point at which it would observe its own cancellation, so the re-drain's abort cannot unwind it and its pending registration stays live, the re-drain cannot reach five zeros, the drain deadline fires, and no second audit is taken — the **live resource**, not the refusal, is the reason; `rejected: release-unconfirmed`; **no** `commitRemoval`; retained `failed` classified `close-release-unconfirmed`; public `Failed`; ownership retained; registration's four durable fields byte-identical. Witness: `drainInvocations: 2`, `connectionAuditInvocations: 1`. B is released and its `502` settlement awaited before `residual` is captured |
| S-71 | Two retained ownership records for P with **no quarantine anywhere** — a stop whose audit did not confirm, then a fresh start from the retained `failed` entry (AC-1, B2) | B-8 | `closed`; phase 4 sweeps both frozen records; `sweepUnits === 2`; the declared bound is the two-record bound `B-8` and not the one-record `B-5`; residual zero; peer untouched |
| S-72 | A close dialog is open for P and `openClose` is attempted for Q (AC-7, B4) | B-13 | The second dialog is refused; `closeDialogId` remains P's; Q's non-close controls stay operable; P's dialog is dismissed at transmission, after which Q's Close is admitted |
| S-73 | Two rapid `confirmClose` activations for the same card, and a `retryClose` racing an in-flight transmission (AC-7, B4) | B-13 | The second transmission is refused at the owner layer and the second send at the `transmitted` layer; exactly one request is issued; the peer lane is unaffected |
| S-74 | API interruption **during** release and sweep, strictly before confirmation, with a surviving attributable candidate (AC-16, B6) | B-5 | Unconditionally: no durable removal; the registration present with four byte-identical durable fields; the interrupted generation retaining the entry `failed` classified `close-release-unconfirmed` and publishing `Failed`; **zero** signals delivered by the interrupted close; the survivor exactly attributable. **Corrected in revision 7** — the replacement boot then settles that survivor through the unchanged reconciliation conjunction and the row records the branch: `adopted` with entry `running`, published `Running` read from the route projection, and the adopted `pid:processStartTime:port` identical to the survivor's when the full attribution-and-readiness conjunction holds; `unresolved` with entry `failed` classified `reconcile-unconfirmed` and published `Failed`, naming the element that refused, when it cannot be proven. `absent` and `Stopped` are unreachable while the survivor is alive. The boot's own reconciliation record corroborates the branch. The safe retry then settles on that branch — `closed` with release, terminate, audit, remove observed and exactly one signal, or the bounded `reconcile-unresolved` refusal with the registration retained and zero signals — with residual zero and the three signal accounts (interrupted close, replacement transition, retry) reported separately |
| S-75 | Frozen ownership cardinality of five against the default cap of four (AC-3, B2) | B-5 | `rejected: ownership-cardinality-exceeded` → `500 runtime_close_ownership_unresolved`; zero drains, zero `signal`, zero `terminate`, no removal, no failure install, no lifecycle event; the registration and every ownership record are exactly as found. Witness: `frozen: 5`, `cap: 4`, `capExceeded: true`, `sweepUnits: 1` (the floor, because no sweep was authorised), declared bound `B-5` recomputed from `(false, 1)`, non-null `claimInstalledAt` and `elapsedOrigin: 'claim'` because the gate runs inside the claim-installing section |

Every scenario in this group is executed through production paths under the same fixture standard, capture order, and evidence obligations as `S-1 … S-68`, and each carries the revision-2 evidence members: `drainInvocations`, `connectionAuditInvocations`, `routeEnteredAt`, the nullable `claimInstalledAt`, `elapsedOrigin`, `ownershipCardinality`, and — where the outcome is `closed` — the eight-clause `confirmation` record. Revision 3 changes no scenario identifier, count, bound, or acceptance mapping in this catalog; it fixes the hold and release order of `S-69` and `S-70`, the complete witness of `S-75`, and the list-lane expectations of `S-37`, `S-65`, and `S-66`.

**Revision 6 changes no scenario identifier, count, bound, or acceptance mapping either.** It replaces the *choreography* of `S-69` and `S-70` — which `T-11` proved unreachable against the delivered proxy registration ordering, since `handleHttp` and `handleUpgrade` each register their per-token resource before calling `resolveTarget` and phase 1 waits for all five counts to reach zero, so no acquisition can both escape the phase-1 audit and open an upstream connection under an installed claim — with one built entirely from that ordering, and it adds the row-level `preClaimSettlement` member to **every** scenario in this catalog. Every row settled at one of the eight pre-claim sites carries `preClaimSettlement` naming that site, a null `claimInstalledAt`, `elapsedOrigin: 'route-entry'`, and no admission-only witness; every admitted row carries `preClaimSettlement: null` and a non-null `claimInstalledAt`. The site is observed from production — three armed close deadlines, the `ownership-cardinality-exceeded` lexical site, an `undefined` persisted read, or a losing concurrent close — never inferred from the settled category, and `G-28` fails any evidence writer that infers it.

**Revision 7 changes no scenario identifier, count, bound, or acceptance mapping either.** It splits the `S-69`/`S-70` choreography across **two** arrivals with disjoint declared roles, because executing revision 6's replacement showed that a single arrival still cannot both be accounted by phase 1 and be the resource phase 5 re-observes: an arrival suspended at a post-`await` seam entered `start()` before the claim and phase 1 cannot settle until it unwinds, while an arrival that reaches the proxy after phase 1 is refused at `start()`'s head before any `await`. It replaces `S-74`'s post-boot expectation with the reconciliation decision's own conjunction-conditioned disjunction, so a live, healthy, exactly attributable survivor is adopted rather than forced into an unresolved settlement, and attributes signals per episode phase instead of claiming zero across the episode. And it states the accounting `S-55` proves. Every other row, bound, and mapping in this catalog is untouched.
