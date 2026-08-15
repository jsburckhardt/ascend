# Test Plan: BL-016 Report Accurate Runtime State and Health

All validation is finite, offline, repository-local, deterministic, and free of manual steps. Runtime behavior is driven through the existing injectable process, health, clock, and event dependencies; no host code-server process, listener, or designated host is required. The root justfile is the sole command source, and no validation sidecar is added.

## Test V-1: Public runtime state contract and synchronous projection guard

- **Type:** Unit and source contract
- **Task:** T-1, T-6
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4
- **Priority:** High

### Setup
`apps/api/test/runtime-state-contract.test.ts` imports the runtime contract, a manager built with fake process dependencies and spies, and `validatePublicReportingSource` from the BL-016 module.

### Steps
1. Map `undefined`, `registered`, `starting`, `running`, and `failed` through `publicRuntimeState` and assert exhaustiveness over `RUNTIME_STATES`.
2. Report a never-registered ID, a registered-only entry, an in-flight start, a running entry, and a retained failed entry.
3. Assert each report is frozen, ordered as requested, and carries only `projectId`, `state`, and `failureCategory`.
4. Assert `failureCategory` appears only for `Failed` and is a member of `RUNTIME_FAILURE_CATEGORIES`.
5. Assert calling the projection leaves `manager.audit()` counters unchanged and invokes zero process, health, port, launch, terminate, audit, and event spies.
6. Run `validatePublicReportingSource` over the manager and contract sources and assert acceptance: a non-`Promise` declared return type, no `await`, `.then(`, or `async` in the body, no dependency call, and exactly one ordered map read.
7. Run the guard over negative fixtures that make the operation `async`, add an `await`, add a `health.check` call, add a second map traversal, or bypass the guarded transition, and assert each violation is reported.

### Expected Result
Exactly four public values are producible; internal `registered` never escapes; a retained failure always reports `Failed`; the projection is provably synchronous, side-effect-free, and single-pass.

### Expected Evidence
Mapping table, frozen-key set, order comparison, category-presence table, zero-spy-invocation counts, and the guard report with one row per negative fixture.

## Test V-2: Manager projection, guarded transition, and race settlement

- **Type:** Integration (in-process, fake dependencies)
- **Task:** T-1, T-2, T-3, T-5
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-6
- **Priority:** High

### Setup
`apps/api/test/runtime-state-manager.test.ts` uses the existing deferred fake-runtime harness with a readiness gate that can be held, resolved, or failed; a controllable `isAlive` result; a controllable health verdict; a controllable process-exit settlement; and a two-project fixture A and B.

### Steps
1. Report before any start and assert `Stopped`.
2. Begin a start, hold readiness open, and report `Starting` while the fake process is alive but not ready.
3. Resolve readiness and report `Running`.
4. Fail a start before readiness and report `Failed` with the retained category.
5. From a running entry, settle process exit and assert `Failed`, one cleanup audit, and one event.
6. From a running entry, fail the reuse health observation and assert `Failed`, one cleanup audit, and one event.
7. From a running entry, return false from `isAlive` during reuse and assert `Failed`, one cleanup audit, and one event.
8. Race health-versus-exit in both win orders, and race false-liveness-versus-exit in both win orders. For each, assert exactly one installed category, exactly one cleanup audit, exactly one emitted event, zero additional `terminate`/`audit` spy calls from the loser, and an unchanged public state and category across repeated reports.
9. Delay the losing contender's settlement past the winner's transition and repeat the assertions in step 8; assert the reuse-path loser surfaces the winner's retained failure.
10. Set `shuttingDown` and assert the guarded transition and its event are suppressed.
11. Apply steps 4 through 9 to project B and assert project A's report object, state, category, cleanup count, and event count are unchanged.

### Expected Result
`Starting` is never reported as `Running`; process liveness alone never yields `Running`; all four failure paths yield `Failed`; every race settles as exactly one terminal transition with a stable category; project A is never affected by project B.

### Expected Evidence
Per-transition and per-race rows with claim outcome, installed category, cleanup count, event count, loser spy counts, post-settlement report stability, and A/B comparison digests.

## Test V-3: Public state and NFR-015 event consistency

- **Type:** Unit and integration
- **Task:** T-2, T-6
- **Acceptance Criteria:** AC-3, AC-4, AC-7
- **Priority:** High

### Setup
`apps/api/test/runtime-state-events.test.ts` records emitted safe events through the manager's `recordEvent` dependency for every transition and race scenario.

### Steps
1. Assert the emitted event-name set is a subset of the NFR-015 catalog and contains no `runtime.exited`.
2. For each scenario, assert the ordered events and that each event's `to` state maps to the public state reported immediately after emission.
3. Assert each `running -> failed` path — exit, failed health observation, and false liveness — emits exactly one `runtime.health.changed` with `from: 'running'`, `to: 'failed'`, and the bounded classification.
4. For each race and each delayed loser settlement, assert exactly one terminal event and zero loser events.
5. Assert no `runtime.start.succeeded` and no healthy `runtime.health.changed` record exists while the project's public state is `Failed`.
6. Assert no lifecycle event is emitted for a suppressed shutdown transition.
7. Scan the repository for remaining `runtime.exited` references in source, tests, and shipped documentation.

### Expected Result
Every public transition is announced by exactly one catalog event that agrees with the reported state, races never double-announce, and no non-catalog lifecycle name remains.

### Expected Evidence
Per-scenario ordered event tables with mapped public states, race event counts, and a zero-match repository scan result.

## Test V-4: Public runtime-state endpoint contract

- **Type:** Integration (Fastify app)
- **Task:** T-3
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Priority:** High

### Setup
`apps/api/test/runtime-state-route.test.ts` builds the app with a fake project library and a manager whose entries can be placed in each public state.

### Steps
1. Request `GET /api/projects/runtime` with an empty library and assert `200 {"runtimes":[]}`.
2. Place four projects into `Stopped`, `Starting`, `Running`, and `Failed`, request the endpoint, and assert exact body keys, exact row keys, and one row per registered project.
3. Compare row order with the `GET /api/projects` order for the same fixture.
4. Assert `failureCategory` is present only for the `Failed` row and is a bounded category.
5. Force a library failure and a projection failure and assert `500 {"error":{"category":"runtime_state_failed"}}` with the logged event and no partial success body.
6. Scan the serialized body for canonical paths, `127.0.0.1`, `localhost`, ports, PIDs, owner tokens, commands, and environment values.
7. Assert the `GET /api/projects` response for the same fixture is unchanged from the four-field contract.

### Expected Result
The endpoint reports exactly one public state per registered project in list order, discloses only the bounded category, fails explicitly, and leaves the project payload untouched.

### Expected Evidence
Status and body tables, ordering comparison, failure envelope, zero-match disclosure scan, and the unchanged project-payload assertion.

## Test V-5: Web client validation and list reconciliation

- **Type:** Unit
- **Task:** T-4
- **Acceptance Criteria:** AC-1, AC-5
- **Priority:** High

### Setup
`apps/web/src/runtime-state-client.test.ts` exercises `parseRuntimeStateResponse`, `reconcileRuntimeReports`, `loadRuntimeStates`, and the notice map with static fixtures and a stubbed fetch.

### Steps
1. Parse a valid four-row payload and assert the exact parsed shape.
2. Reject each malformed class: extra key, missing key, unknown state, lowercase state, duplicate ID, unknown category, category without `Failed`, `Failed` without category, non-array `runtimes`, non-object row.
3. Reconcile a report set against an authoritative ordered ID sequence and assert `reconciled` only on an exact identifier and order match.
4. Reconcile missing, extra, duplicate, and reordered identifier fixtures and assert the exact `mismatch` reason and that no partial report set is returned.
5. Assert the notice map covers every bounded failure category exactly once and scan every notice string for paths, authorities, ports, commands, environment values, and credentials.
6. Assert a non-`ok` HTTP response and an aborted request both reject rather than returning an empty success list.

### Expected Result
Only exactly shaped and exactly reconciled payloads are usable; every rejection is explicit; notice text is complete and safe.

### Expected Evidence
Accepted and rejected fixture rows with rejection reasons, the reconciliation table with one row per mismatch class, notice coverage table, and zero-match notice scan.

## Test V-6: Revision-bound controller behavior

- **Type:** Unit (React hook)
- **Task:** T-4
- **Acceptance Criteria:** AC-1, AC-5
- **Priority:** High

### Setup
`apps/web/src/use-runtime-state.test.tsx` renders the hook with fake timers, a counting loader, and a controllable revision input.

### Steps
1. Render with an undefined revision and assert `idle` status and **zero** issued requests.
2. Supply revision 1 and assert exactly one request and `loading`.
3. Resolve a reconcilable payload and assert `success` with the reconciled reports.
4. Supply revision 2 with a changed ordered ID sequence and assert exactly one additional request bound to revision 2.
5. Settle the revision 1 response after revision 2 is current and assert the stale settlement is discarded and does not attach to revision 2.
6. Resolve an unreconcilable payload and assert `failure` with reason `mismatch` and no partial reports.
7. Reject the loader and assert `failure` with reason `transport`; advance past the bounded timeout and assert `failure` with reason `timeout` and an aborted request.
8. Activate `retry()` and assert exactly one further request for the current revision.
9. Unmount during flight and assert the request is aborted with no state update.

### Expected Result
Requests occur only for a held revision, exactly once per revision and once per retry, with stale settlements discarded and no fabricated reports.

### Expected Evidence
Per-step request count, revision id, status, reason, and abort observations.

## Test V-7: Project Home rendering, unavailability, and request-trigger matrix

- **Type:** Component (React Testing Library)
- **Task:** T-5, T-6
- **Acceptance Criteria:** AC-1, AC-5, AC-6
- **Priority:** High

### Setup
`apps/web/src/runtime-state-component-matrix.test.tsx` renders `App` with controllable project-list and runtime-state loaders and imports the BL-016 evidence module for the `home` surface rows.

### Steps
1. Assert zero projection requests before the first successful project list, and exactly one after it; assert one further request per subsequent successful list load.
2. Render each of the four states and assert one visible state text and one `data-runtime-state` value per card.
3. Render a `Failed` card and assert the category notice text, its `data-runtime-failure` value, and its association with that card.
4. Assert no card renders an internal state name, a fifth state, or a lifecycle control.
5. Render the idle, loading, transport-failure, timeout, and reconciliation-mismatch cases; assert whole-list unavailable rendering with its distinct attribute and summary notice, zero cards showing a lifecycle state, and Retry issuing exactly one request.
6. Render a two-project fixture, fail one project, and compare the peer card's rendered output before and after.
7. Scan the rendered DOM for credentials, command output, environment values, and internal network addresses.
8. Record each executed row into the `home` surface of the BL-016 matrix.

### Expected Result
All four states are visibly identified, the failed notice is bounded and safe, unavailability is never presented as a lifecycle state or partially mixed with reported cards, and the peer card is unchanged.

### Expected Evidence
Component matrix rows with state, attributes, notice category, unavailable handling, request counts, peer digests, and a zero-match DOM disclosure scan.

## Test V-8: BL-016 scenario matrix, validator mutations, and retained evidence

- **Type:** Acceptance evidence
- **Task:** T-6
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- **Priority:** High

### Setup
`apps/api/test/runtime-state-matrix.test.ts` executes all ten scenarios, merges the web-produced `home` surface rows, validates the matrix, and writes both artifacts.

### Steps
1. Execute `stopped-registered`, `starting-delayed-readiness`, `running-observed-readiness`, `failed-start-before-readiness`, `failed-post-readiness-exit`, `failed-health-observation`, `failed-false-liveness`, `failed-transition-race`, `cross-project-isolation`, and `event-consistency` in that order.
2. Validate scenario order and count, unique execution and event IDs, and independent execution of every row.
3. Validate three-surface equality, four-state membership, category rules, readiness-gated `Running`, catalog-only events, one terminal event and one cleanup audit per `Failed` row, zero loser events on the race row, and unchanged peer digests on the isolation row.
4. Serialize the validated matrix once, write `test-results/bl-016/runtime-state-matrix.json` and `project/work-items/37-bl-016-report-accurate-runtime-state-and-health/implementation/evidence/runtime-state-matrix.json` from that same string, and assert SHA-256 equality.
5. Re-read the committed copy, parse it, and revalidate it with `validateRuntimeStateMatrix`.
6. Serialize the same run a second time and assert byte-identical output.
7. Apply one controlled mutation per rejection class and assert each is rejected: surface disagreement, fifth or internal state, `Running` without readiness, `Stopped` replacing a retained failure, missing or unbounded category, category on a non-`Failed` row, non-catalog event name, success or healthy event on a `Failed` row, two terminal events or two cleanup audits on one row, a loser event on the race row, changed peer digest, duplicate execution ID, missing scenario, reordered scenario, and a leaked path, authority, port, or diagnostic value.

### Expected Result
One complete positive matrix passes, the committed copy is byte-identical and independently revalidates, serialization is deterministic, and every named mutation class is rejected with an inspectable classification.

### Expected Evidence
Committed `implementation/evidence/runtime-state-matrix.json` with its SHA-256 digest, the disposable copy's matching digest, and the mutation table with one rejection row per class.

## Test V-9: Application documentation validation

- **Type:** Documentation contract
- **Task:** T-8
- **Acceptance Criteria:** AC-4, AC-5, AC-8
- **Priority:** Medium

### Setup
`apps/api/test/runtime-state-documentation.test.ts` reads the shipped documentation files.

### Steps
1. Assert `docs/project-runtime.md` documents the four public states, the manager projection, the guarded `running -> failed` transition with one category, one cleanup, and one event, retained-failure precedence, revision-bound refresh with exact reconciliation, explicit unavailability, and the health contract that gates `Running`.
2. Assert `README.md`, `docs/README.md`, and `apps/api/src/routes/README.md` document the `GET /api/projects/runtime` success and failure envelopes, ordering, and the unchanged four-field project payload.
3. Assert documented commands match the root justfile recipe names and the documented retained evidence path matches the committed artifact.
4. Assert no shipped document references `runtime.exited` and that the BL-013 catalog count remains 70.

### Expected Result
Documentation matches the implemented contract exactly, with no stale event name and no undocumented public surface.

### Expected Evidence
Documentation test results and the documentation diff recorded in the implementation record.

## Test V-10: Regression, full validation, and evidence retention gates

- **Type:** System validation
- **Task:** T-7, T-9
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- **Priority:** High

### Setup
Root justfile recipes on the repository branch with a clean working tree.

### Steps
1. Run `just verify-runtime-state`.
2. Run `just verify-project-runtime` for the BL-010 runtime boundary after the transition and event change.
3. Run `just verify-project-runtime-isolation` for the BL-013 catalog rename.
4. Run `just verify-home-workbench false` for BL-012 Project Home behavior.
5. Run `just verify` for authoritative full validation.
6. Run `git status --porcelain` and assert the committed evidence file is unmodified after the full run.

### Expected Result
All five commands pass, BL-016 validation is included in `just verify`, the committed evidence regenerates without diff, and no delivered-issue regression or new host-process dependency appears.

### Expected Evidence
Command transcripts with exit status, the clean-tree result over the committed evidence path, and the recorded artifact digest.

## Acceptance Criteria to Test Index

| AC ID | Tests |
|---|---|
| AC-1 | V-1, V-2, V-4, V-5, V-6, V-7, V-8, V-10 |
| AC-2 | V-1, V-2, V-4, V-7, V-8, V-10 |
| AC-3 | V-1, V-2, V-3, V-4, V-8, V-10 |
| AC-4 | V-1, V-2, V-3, V-4, V-8, V-9, V-10 |
| AC-5 | V-4, V-5, V-6, V-7, V-8, V-9, V-10 |
| AC-6 | V-2, V-4, V-7, V-8, V-10 |
| AC-7 | V-3, V-8, V-10 |
| AC-8 | V-1 through V-10 |
