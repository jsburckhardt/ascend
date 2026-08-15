# Task Breakdown: BL-016 Report Accurate Runtime State and Health

Tasks are dependency ordered. Every task is implemented within the boundaries of ADR-260815-public-runtime-state-projection and the two updated core-components; a required deviation returns to the Plan stage instead of being absorbed in code.

## Task T-1: Define the public runtime state vocabulary and manager projection

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-6
- **Related ADRs:** ADR-260815-public-runtime-state-projection, ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-host-process-environment

### Description
Add `PUBLIC_RUNTIME_STATES`, `PublicRuntimeState`, `PublicRuntimeReport`, and a pure `publicRuntimeState(state)` mapper to `apps/api/src/project-runtime-contract.ts`, leaving the lowercase `RUNTIME_STATES` unchanged. Add `reportPublicStates(projectIds: readonly string[]): readonly PublicRuntimeReport[]` to the `ProjectRuntimeManager` interface and implementation. The declared return type must not be a `Promise`. The body must contain no `await`, no `.then(`, and no call into process, port, health, launch, terminate, audit, or event dependencies, and must perform exactly one ordered read over the existing entry map, returning frozen records in the requested order. Map a missing entry and `registered` to `Stopped`, `starting` to `Starting`, `running` to `Running`, and `failed` to `Failed`. Attach `failureCategory` from the retained `FailedEntry.failure.category` only for `Failed`. Project no diagnostics, message, PID, port, internal URL, canonical path, stable route, or owner token. Leave `inspect`, `inspectEntries`, `ownsSnapshot`, `lastFailure`, `lastCleanup`, and `shutdown` behavior unchanged.

### Acceptance Criteria
- AC-1: the projection returns exactly one of the four public values per project and can never return an internal state name.
- AC-2: a registered-but-never-started project and a project unknown to the manager both report `Stopped`; an accepted start that has not reached readiness reports `Starting`.
- AC-3: `Running` is produced only from a `running` entry, which the manager installs only after `launchReadyRuntime` resolves.
- AC-4: a `failed` entry reports `Failed` with its retained bounded category and is never overridden by absence.
- AC-6: reports for different stable project IDs read independent entries and share no object, failure, or category.

### Test Coverage
- Unit tests for the mapper across `undefined`, `registered`, `starting`, `running`, and `failed`, including exhaustiveness over `RUNTIME_STATES`.
- Unit tests proving frozen records, preserved request order, `failureCategory` only for `Failed`, and the absence of every internal identity and diagnostic key.
- A behavioral no-side-effect test asserting that calling the projection leaves `manager.audit()` counters unchanged and invokes zero fake process, health, port, launch, or event spies.
- The T-6 source guard proving the operation is declared and implemented synchronously with one ordered map read.

### Expected Evidence
- V-1 contract results listing the mapping table, frozen-report key set, order preservation, category-presence rules, and zero dependency invocations.
- Source diff showing no change to `RUNTIME_STATES`, no new persisted field, and no new process, port, or health call.

## Task T-2: Own the guarded `running -> failed` transition and align lifecycle events

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-3, AC-4, AC-6, AC-7
- **Related ADRs:** ADR-260815-public-runtime-state-projection, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging

### Description
Introduce one manager-owned guarded transition operation in `apps/api/src/project-runtime-manager.ts` that performs every `running -> failed` change. Route all three contenders through it: observed false liveness during reuse (`isAlive()` returns false), a completed health observation that fails the documented contract, and process-exit settlement. The operation claims the transition with a synchronous compare-and-set on the exact installed entry object and its generation, resolved before any `await`. The winner installs the frozen failed entry with one retained bounded category, performs exactly one cleanup operation — `terminate` for the reuse contenders and `audit` with the `already-absent` outcome for the exit contender — records exactly one cleanup audit, and emits exactly one `runtime.health.changed` carrying `from: 'running'`, `to: 'failed'`, elapsed timing, and that category. A loser mutates nothing, terminates nothing, audits nothing, and emits nothing; a reuse-path loser surfaces the winner's retained failure so its caller sees the same bounded category, and a delayed loser that settles after the transition behaves identically. A cleanup rejection surfaces explicitly after the single event is emitted, without a second event or a category change. Preserve the existing `shuttingDown` suppression: manager shutdown is not a reportable public transition.

This corrects the current false-liveness path, which installs `Failed` and throws while emitting no event at all, and the reuse-health-versus-exit race, in which both paths can install `Failed`, terminate or audit twice, and emit two terminal events with conflicting categories.

Then align the event vocabulary: remove `'runtime.exited'` from the `RuntimeLifecycleEvent['event']` union in `apps/api/src/project-runtime-contract.ts`; update `apps/api/src/project-runtime-isolation-evidence.ts` so `allowedEvents`, the `runtimeFailure` event union, and the `crash` scenario use `runtime.health.changed`, keeping scenario order and the 70-record catalog count unchanged; update the `runtime.exited` assertion in `tests/e2e/project-runtime-isolation.spec.ts` to the renamed event with its project-token match. Export a testable mapping from lifecycle event and `to` state to public state so consistency is asserted structurally rather than by string matching. Add no retry, no replacement start, and no background health work.

### Acceptance Criteria
- AC-3 and AC-4: `runtime.start.succeeded` is still emitted only after observed readiness; false liveness, failed health observation, and post-readiness exit each produce `Failed` with one retained category and never leave the project `Running`.
- AC-6: a guarded transition for one project performs no cleanup, mutation, or event for any other project.
- AC-7: every public transition emits exactly one catalog event whose `to` state maps to the new public state; each race emits exactly one terminal event with zero loser events; no success or healthy event is emitted while the public state is `Failed`; `runtime.exited` remains nowhere in source, tests, or shipped docs.

### Test Coverage
- Unit tests for the event-to-public-state mapping across all four catalog events.
- Manager tests for each contender in isolation: false liveness, failed health observation, and exit settlement, each asserting one installed category, one cleanup audit, and one `runtime.health.changed`.
- Race tests with controllable ordering for health-versus-exit and false-liveness-versus-exit, in both win orders, including a loser that settles after a delay, asserting exactly one terminal event, one cleanup audit, a stable retained category, and a stable public state across repeated reports.
- A loser-behavior test asserting zero additional `terminate`/`audit` spy calls and zero additional emitted events.
- A shutdown test asserting the guarded transition and its event are suppressed while `shuttingDown`.
- A guard test asserting the emitted event-name set is a subset of the NFR-015 catalog and that `runtime.exited` appears nowhere in `apps/api/src`, `tests/`, or shipped docs.
- BL-010 and BL-013 regression through `just verify-project-runtime` and `just verify-project-runtime-isolation`.

### Expected Evidence
- V-2 contender and race rows with claim outcome, installed category, cleanup count, event count, and post-settlement report stability.
- V-3 per-scenario ordered event tables with mapped public states and zero loser events.
- Passing BL-010 and BL-013 regression output with the unchanged 70-record catalog count.

## Task T-3: Serve the read-only public runtime-state endpoint

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-6
- **Related ADRs:** ADR-260815-public-runtime-state-projection, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Add `apps/api/src/routes/project-runtime-state.ts` registering `GET /api/projects/runtime` in its own plugin scope. Resolve the authoritative list through `fastify.projectLibrary.list()`, order it with the existing `compareProjects`, then call `fastify.projectRuntime.reportPublicStates` once with all ordered IDs so every row in a response comes from one synchronous pass. Serialize each row as `{ id, state }` plus `failureCategory` only for `Failed`. Return `500 {"error":{"category":"runtime_state_failed"}}` with a `project.runtime.state.failed` log record on a list or projection failure, with no partial or empty success body. Do not modify `GET /api/projects`, `validateProject`, `PROJECT_FIELDS`, or the registration and close routes.

### Acceptance Criteria
- AC-1: the response contains exactly one row for every registered project, in the same order as `GET /api/projects`, with no additional public state value and no additional response key.
- AC-2 and AC-3: never-started and `registered` projects serialize as `Stopped`, an in-flight start serializes as `Starting`, and `Running` appears only for a health-gated running entry.
- AC-4: a retained failure serializes as `Failed` with its bounded category and never as `Stopped` or `Running`.
- AC-6: one project's failure changes only its own row.

### Test Coverage
- Route tests for the empty list, a mixed four-state list, ordering equality with `GET /api/projects`, and exact response and row key sets.
- Tests proving `failureCategory` is present only for `Failed` and is always one of the 12 bounded categories.
- Failure tests for a throwing library and a throwing projection, asserting the 500 envelope, the logged event, and the absence of a success-shaped body.
- A disclosure test scanning the serialized body for canonical paths, `127.0.0.1`, `localhost`, ports, PIDs, owner tokens, commands, and environment values.
- A regression test asserting the `GET /api/projects` body is unchanged from the four-field contract.

### Expected Evidence
- V-4 route results with status codes, exact body key sets, ordering comparison, and the failure envelope.
- Disclosure-scan output with zero prohibited matches.

## Task T-4: Add the revision-bound web runtime-state client and controller

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-3
- **Acceptance Criteria:** AC-1, AC-5
- **Related ADRs:** ADR-260815-public-runtime-state-projection, ADR-260812-browser-navigation-shell
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-development-standards

### Description
Add `apps/web/src/runtime-state.ts` with `RUNTIME_STATE_ENDPOINT`, `RUNTIME_STATE_TIMEOUT_MS`, the public state tuple, the client-owned `RUNTIME_FAILURE_NOTICES` map keyed by bounded category, `parseRuntimeStateResponse`, `reconcileRuntimeReports`, and `loadRuntimeStates`. Reuse the `isRecord`/`exactKeys` validation style already in `apps/web/src/projects.ts`, extracting shared helpers rather than duplicating them. `parseRuntimeStateResponse` rejects any unknown key, unknown state, duplicate ID, unknown category, a category present without `Failed`, and a missing category with `Failed`. `reconcileRuntimeReports(reports, projectIds)` returns `{ kind: 'reconciled', reports }` only when the report identifiers exactly match the supplied authoritative ordered identifiers, and otherwise `{ kind: 'mismatch', reason: 'missing' | 'extra' | 'duplicate' | 'order' }`.

Add `apps/web/src/use-runtime-state.ts` taking a list revision `{ id, projectIds } | undefined`. The controller issues **no** request while the revision is undefined, exactly one request per distinct revision id, and exactly one further request per `retry()` for the current revision. It uses an abort controller, a bounded timeout, and a monotonic request generation; every in-flight request carries its revision id, and any settlement whose revision id is no longer current is discarded. Statuses are `idle`, `loading`, `success`, and `failure`, where `failure` carries `reason: 'transport' | 'timeout' | 'mismatch'`. There is no timer-based refresh and no client health probe. Do not modify `use-project-home.ts` state or its registration and close flows; do not render server-provided message text.

### Acceptance Criteria
- AC-1: parsed reports carry exactly one of the four public states, every malformed payload is rejected rather than coerced, and a report set that does not exactly match the revision's ordered identifiers is a mismatch rather than partial data.
- AC-5: each bounded failure category maps to one safe client-owned notice string containing no path, authority, port, command, or environment value.

### Test Coverage
- Parser tests for the valid payload and for each rejection class: extra key, missing key, unknown state, lowercase state, duplicate ID, unknown category, category without `Failed`, `Failed` without category, non-array `runtimes`, non-object row.
- Reconciliation tests for exact match, missing ID, extra ID, duplicate ID, and reordered IDs, asserting the reason and that no partial report set is returned.
- Notice-map tests asserting complete coverage of the bounded category set and a disclosure scan over every notice string.
- Controller tests for zero requests while the revision is undefined, exactly one request per revision, exactly one per retry, transport failure, timeout, mismatch, stale-revision discard, and abort on unmount.

### Expected Evidence
- V-5 parser, reconciliation, and notice rows with one row per accepted and rejected fixture.
- V-6 controller results with per-step request count, revision id, status, reason, and abort observations.

## Task T-5: Report the four states, the safe failure notice, and explicit unavailability on Project Home

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-4
- **Acceptance Criteria:** AC-1, AC-5, AC-6
- **Related ADRs:** ADR-260815-public-runtime-state-projection, ADR-260812-browser-navigation-shell, ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-development-standards

### Description
In `apps/web/src/App.tsx`, own the list revision: each transition of the existing project-home controller into a successful authoritative list produces exactly one new revision with that list's ordered project identifiers, and that revision is the only trigger passed to `useRuntimeState`. Home issues no projection request of its own and adds no timer.

Render on each registered project card an accessible status element carrying the project's public state and a stable `data-runtime-state` attribute, plus, for `Failed`, a notice element carrying the client-owned category text and a stable `data-runtime-failure` attribute. When the controller reports `idle`, `loading`, or `failure` — including the `mismatch` reason — render the explicit unavailable status on every card with its own attribute plus one accessible summary notice and a Retry control that issues exactly one further request. Never render a partial mix of reported and unavailable cards from a single response, never substitute `Stopped`, and never present unavailability as one of the four states. Keep Open and Close behavior, focus management, announcements, and the close dialog unchanged, and add no stop, restart, or other lifecycle control.

### Acceptance Criteria
- AC-1: a card renders exactly one public state, matching the reconciled report for that project ID, and never renders an internal state, an additional state, or a state from an unreconciled response.
- AC-5: all four states are visibly identified with text, and a failed card presents the category notice with no credential, command output, environment value, or internal network address.
- AC-6: with a two-project fixture where one project is `Failed`, the peer card's rendered state, notice presence, and controls are unchanged.

### Test Coverage
- Component tests rendering each of the four states with accessible text and attributes.
- A failed-card test asserting the category notice, its association with the card, and a rendered-DOM disclosure scan.
- Unavailability tests for the pre-revision idle case, loading, transport failure, timeout, and reconciliation mismatch, each asserting whole-list unavailable rendering, the distinct attribute, and Retry issuing exactly one request.
- A request-trigger test asserting zero projection requests before the first successful list and exactly one after it, with one further request per subsequent successful list load.
- A two-project isolation test comparing the peer card's rendered output before and after the other project fails.
- Regression through `just verify-home-workbench false`.

### Expected Evidence
- V-7 component matrix rows with rendered state, attributes, notice category, unavailable handling, request counts, peer digests, and a zero-match DOM disclosure scan.
- Passing BL-012 Home regression output.

## Task T-6: Build the BL-016 source guard, scenario catalog, deterministic matrix, and validator

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- **Related ADRs:** ADR-260815-public-runtime-state-projection
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Add `apps/api/src/runtime-state-evidence.ts` following the `home-workbench-evidence.ts` and `project-runtime-isolation-contract.ts` patterns. It exports three things.

First, `validatePublicReportingSource(source)`, a source guard returning `{ accepted, violations }`. It asserts the `reportPublicStates` declaration returns a non-`Promise` `readonly PublicRuntimeReport[]`, that its implementation body contains no `await`, no `.then(`, and no `async`, that the body references no process, port, health, launch, `terminate(`, `.audit(`, `isAlive(`, or event-dependency call, and that it performs exactly one ordered read over the entry map with no additional map traversal. It also asserts the guarded transition exists as one named operation and that the false-liveness, health, and exit paths all call it.

Second, the ordered `BL016_SCENARIOS` tuple: `stopped-registered`, `starting-delayed-readiness`, `running-observed-readiness`, `failed-start-before-readiness`, `failed-post-readiness-exit`, `failed-health-observation`, `failed-false-liveness`, `failed-transition-race`, `cross-project-isolation`, and `event-consistency`; plus a row type carrying scenario ID, fixed execution ID, the `runtime`, `api`, and `home` surface states, `failureCategory` or `null`, ordered event records, cleanup count, readiness observation, peer digests for the isolation row, contender and loser counts for the race row, and assertion count.

Third, `validateRuntimeStateMatrix`, enforcing exact scenario order and count, unique execution and event IDs, three-surface equality per row, membership in the four public states, category presence and bounded membership, `Running` only with a retained readiness observation, catalog-only event names with `to`-state-to-public-state agreement, exactly one terminal event and one cleanup audit per `Failed` row, zero loser events on the race row, unchanged peer digests on the isolation row, and a disclosure scan over the serialized row.

Drive the `runtime` and `api` surfaces from `apps/api/test/runtime-state-matrix.test.ts` using the existing deterministic fake process dependencies, a controllable readiness gate for delayed readiness, and controllable contender ordering for the race row. Drive the `home` surface from the web component matrix test, which imports this module exactly as the BL-012 component matrix imports its evidence module.

Serialize deterministically: stable key order, no wall-clock timestamps, no measured durations, no absolute paths, ports, PIDs, or authorities, elapsed as a bounded class, and fixed `bl016-<surface>-<scenario>` execution IDs. Write the disposable copy to `test-results/bl-016/runtime-state-matrix.json` and the retained copy to `project/work-items/37-bl-016-report-accurate-runtime-state-and-health/implementation/evidence/runtime-state-matrix.json` from the same serialized string, assert SHA-256 equality between them, re-read and revalidate the committed copy, and assert that serializing the same run twice is byte-identical. Add no real-process or Chromium episode, no residual-audit CLI, and no validation sidecar; no host process, port, or listener is created.

### Acceptance Criteria
- AC-1 through AC-7: each criterion has at least one dedicated scenario row whose retained fields prove it.
- AC-8: the ten scenarios cover delayed readiness, successful readiness, start failure, post-readiness exit, health failure, false liveness, transition races, cross-project isolation, and event consistency, and the run is finite, offline, repository-local, and free of manual steps.

### Test Coverage
- A positive matrix run producing all ten executed rows, both artifacts, and a passing revalidation of the committed copy.
- Source-guard tests accepting the implemented source and rejecting fixtures that make the projection `async`, add an `await`, add a dependency call, add a second map traversal, or bypass the guarded transition.
- Validator mutation tests rejecting at least: surface disagreement, a fifth or internal state, `Running` without a readiness observation, `Stopped` replacing a retained failure, a missing or unbounded category, a category on a non-`Failed` row, a non-catalog event name, a success or healthy event on a `Failed` row, two terminal events or two cleanup audits on one row, a loser event on the race row, a changed peer digest, a duplicate execution ID, a missing scenario, a reordered scenario, and a leaked path, authority, port, or diagnostic value.
- Determinism tests: two serializations of one run are byte-identical, and the committed copy's digest equals the disposable copy's digest.

### Expected Evidence
- V-8 validator results with the positive artifact plus one rejection row per named mutation class and per source-guard fixture.
- Committed `implementation/evidence/runtime-state-matrix.json` with its recorded SHA-256 digest.

## Task T-7: Add the root justfile validation recipes

- **Status:** Complete
- **Complexity:** Low
- **Dependencies:** T-6
- **Acceptance Criteria:** AC-8
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260806-rpiv-stage-contract

### Description
Add a `verify-runtime-state` recipe to the root justfile that runs the BL-016 API and web test files under `BL016_ACCEPTANCE=1` with `--reporter=verbose`, following the existing `verify-*` recipe shape. Wire `just verify-runtime-state` into the `verify` recipe after `just verify-session-switching`. Add no standalone verification configuration file, no validation sidecar, and no new command runner.

### Acceptance Criteria
- AC-8: `just verify-runtime-state` executes the complete BL-016 validation set from the root command interface and is included in `just verify`.

### Test Coverage
- Execute `just verify-runtime-state` directly and observe a passing verbose result.
- Execute `just verify` and observe the recipe running in order without duplicating unrelated designated proofs.

### Expected Evidence
- Recipe output retained in the implementation record, plus the justfile diff showing the new recipe and its position in `verify`.

## Task T-8: Update affected application documentation

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-3, T-5, T-7
- **Acceptance Criteria:** AC-4, AC-5, AC-8
- **Related ADRs:** ADR-260815-public-runtime-state-projection
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260806-project-command-interface

### Description
Update `docs/project-runtime.md` with a public runtime-state section covering the four-value vocabulary, the manager projection and its single synchronous pass, the guarded `running -> failed` transition with its one-category, one-cleanup, one-event guarantee, retained-failure precedence, revision-bound refresh with exact reconciliation, explicit unavailability, the `runtime.health.changed` replacement for `runtime.exited`, the retained evidence path, and the new commands. Update `README.md`, `docs/README.md`, and `apps/api/src/routes/README.md` with the `GET /api/projects/runtime` contract, its ordering and failure envelope, and an explicit statement that the four-field project payload is unchanged. Rename every remaining `runtime.exited` reference in `docs/project-runtime.md`, `docs/stable-workbench-routing.md`, `apps/api/src/routes/README.md`, and `README.md`, leaving the 70-record BL-013 catalog count intact. Record an explicit no-impact rationale for configuration, migration, and deployment documentation. Add `apps/api/test/runtime-state-documentation.test.ts` following the existing `*-documentation.test.ts` convention.

### Acceptance Criteria
- AC-4: the documented workbench health contract, the four `Failed` causes, and the single-transition guarantee are stated in the runtime runbook.
- AC-5: the documented disclosure limit and unavailability behavior match the implementation.
- AC-8: documented commands and the retained evidence path match the root justfile and the committed artifact exactly.

### Test Coverage
- Documentation test asserting the required phrases, the endpoint contract, the four public states, the guarded transition, the disclosure limit, the renamed event, the retained evidence path, and the command names.
- A repository scan asserting no shipped document still references `runtime.exited`.

### Expected Evidence
- V-9 documentation test results plus the documentation diff.
- Implementation record entries for every documentation category, including no-impact rationales.

## Task T-9: Retain committed evidence and run the regression and full validation gates

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1, T-2, T-3, T-4, T-5, T-6, T-7, T-8
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- **Related ADRs:** ADR-260815-public-runtime-state-projection, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260505-commit-standards

### Description
Run `just verify-runtime-state`, then `just verify-project-runtime`, `just verify-project-runtime-isolation`, and `just verify-home-workbench false`, then `just verify`. Commit `implementation/evidence/runtime-state-matrix.json` as retained evidence and record its SHA-256 digest in `implementation/00-implementation.md`. After the final `just verify`, confirm `git status --porcelain` reports no modification to the committed evidence file, proving deterministic regeneration. Record per-AC evidence naming command, artifact, and observed result; mark every task complete in this breakdown; commit with a Conventional Commits message and the required trailers, leaving a clean working tree. Hand off to Verify with the branch, commit SHA, clean-tree proof, the committed evidence path, and the statement that `test-results/` is disposable and is not the retained artifact.

### Acceptance Criteria
- AC-1 through AC-8: every criterion has recorded evidence naming its command, artifact, and observed result.
- AC-8: full validation passes with BL-016 included, no delivered-issue regression, and a committed evidence artifact that revalidates and regenerates without diff.

### Test Coverage
- The four regression recipes plus full `just verify`.
- A post-run clean-tree check over the committed evidence path.
- Confirmation that BL-016 validation adds no host process, listener, or designated-host dependency.

### Expected Evidence
- Command transcripts with exit status, the committed matrix path and digest, the clean-tree result, the per-AC evidence table, and the commit SHA.
