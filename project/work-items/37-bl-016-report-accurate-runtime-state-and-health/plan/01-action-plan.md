# Action Plan: BL-016 Report accurate runtime state and health

## Feature
- **ID:** 37
- **Research Brief:** project/work-items/37-bl-016-report-accurate-runtime-state-and-health/research/00-research.md
- **Branch:** feat/37-report-accurate-runtime-state-and-health
- **Base SHA:** ca34dbde0e5732667bd20e84020408254a346024
- **Scope Type:** issue
- **Revision:** 2 — incorporates the guarded `running -> failed` transition, committed evidence retention, single request trigger, implementable synchronous proof, and exact list/report reconciliation.

## ADRs Created
- **ADR-260815-public-runtime-state-projection** — Report Public Runtime State Through a Read-Only Projection. Issue #37 introduces the first public runtime-state surface. The choice among a separate read-only projection endpoint, an extended four-field project payload, a pushed stream, a second derived authority, persisted state, and partial rendering of an unreconcilable response is a real architectural decision that no existing ADR governs.

## Core-Components Created
- None created. Two existing global core-components were extended in place with their creation dates and IDs preserved.

## Core-Components Updated
- **CORE-COMPONENT-260808-runtime-lifecycle-error-handling** — public `Stopped`/`Starting`/`Running`/`Failed` vocabulary, single-authority projection, one-synchronous-pass reporting, retained-failure precedence over absence, one guarded compare-and-set `running -> failed` transition shared by false liveness, failed health observation, and exit settlement, bounded public disclosure, explicit unavailability, exact list-revision reconciliation, and public state-to-event consistency with a manager-shutdown carve-out.
- **CORE-COMPONENT-260808-structured-runtime-logging** — exactly one NFR-015 catalog event per public state transition, with a post-readiness exit reported as `runtime.health.changed` instead of the non-catalog `runtime.exited`.

## Decision Records Added
| # | Decision | Source |
|---|----------|--------|
| 95 | Report public runtime state through a read-only projection endpoint | ADR-260815-public-runtime-state-projection |
| 96 | Keep runtime state out of the four-field project payload and its validators | ADR-260815-public-runtime-state-projection |
| 97 | Refresh public runtime state on demand without polling, streaming, or background health loops | ADR-260815-public-runtime-state-projection |
| 98 | Expose exactly one of Stopped, Starting, Running, or Failed on every public surface | CORE-COMPONENT-260808-runtime-lifecycle-error-handling |
| 99 | Project every public runtime state from the runtime manager in one synchronous pass | CORE-COMPONENT-260808-runtime-lifecycle-error-handling |
| 100 | Report retained runtime failures as Failed instead of Stopped | CORE-COMPONENT-260808-runtime-lifecycle-error-handling |
| 101 | Disclose only bounded failure categories in public runtime reports | CORE-COMPONENT-260808-runtime-lifecycle-error-handling |
| 102 | Report an unavailable public runtime report explicitly instead of substituting a state | CORE-COMPONENT-260808-runtime-lifecycle-error-handling |
| 103 | Announce each public runtime-state transition with exactly one NFR-015 catalog event | CORE-COMPONENT-260808-structured-runtime-logging |
| 104 | Report post-readiness runtime exits as runtime.health.changed and emit no non-catalog lifecycle event | CORE-COMPONENT-260808-structured-runtime-logging |
| 105 | Route every running-to-failed transition through one guarded compare-and-set operation | CORE-COMPONENT-260808-runtime-lifecycle-error-handling |
| 106 | Reject runtime reports that do not match the authoritative ordered project list revision | CORE-COMPONENT-260808-runtime-lifecycle-error-handling |
| 107 | Request public runtime state exactly once per authoritative project-list revision | ADR-260815-public-runtime-state-projection |

## Acceptance Criteria

Stable IDs are assigned in GitHub Issue #37 order; the criterion text is preserved verbatim.

- **AC-1:** For every registered project, the runtime boundary, API response, and Project Home expose exactly one state from `Stopped`, `Starting`, `Running`, or `Failed`; when observed without an intervening lifecycle outcome, those surfaces do not disagree or expose any additional public state.
- **AC-2:** A registered project with no active Ascend-owned runtime and no currently observed failure is reported `Stopped`; an accepted start still in progress before workbench readiness is reported `Starting` rather than `Running`.
- **AC-3:** A project is reported `Running` only after its workbench readiness has been observed; process existence without readiness is not sufficient.
- **AC-4:** A start failure before readiness, an observed runtime exit after readiness, and a completed health observation that does not satisfy the documented workbench health contract each result in `Failed` and cannot leave that project reported `Running`.
- **AC-5:** Project Home visibly identifies all four states, and a failed project presents a notice identifying the observed failure category without exposing credentials, command output, full environment values, or internal network addresses.
- **AC-6:** In a two-project scenario, causing one project's start, process, or health outcome to become `Failed` leaves the other project's independently observed state unchanged.
- **AC-7:** The NFR-015 `runtime.start.*` and `runtime.health.changed` events emitted for these scenarios report outcomes consistent with the public state and do not report success or health while that state is `Failed`.
- **AC-8:** Finite automated repository validation demonstrates the four public states and the required transitions using delayed readiness, successful readiness, start failure, post-readiness process exit, health failure, cross-project isolation, and structured-event consistency.

## Acceptance Coverage

| AC ID | Implementation tasks | Tests / validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1, T-3, T-4, T-5 | V-1, V-2, V-4, V-5, V-6, V-7, V-8, V-10 | Three-surface agreement rows in the committed `runtime-state-matrix.json`; source-guard report proving the projection is synchronous and dependency-free; rejection fixtures for a fifth state, an internal state, and an unreconcilable response rendered partially. |
| AC-2 | T-1, T-3, T-5 | V-1, V-2, V-4, V-7, V-8, V-10 | Matrix rows `stopped-registered` and `starting-delayed-readiness`; a never-started project reported `Stopped`, a held-readiness start reported `Starting`, and a retained-failure fixture proving absence never overrides `Failed`. |
| AC-3 | T-1, T-2, T-3 | V-1, V-2, V-3, V-4, V-8, V-10 | Matrix row `running-observed-readiness` retaining the observed `/healthz/` result before `Running`; a live-process-without-readiness fixture that stays `Starting`; a rejected mutation reporting `Running` without a readiness observation. |
| AC-4 | T-1, T-2, T-3, T-6, T-8 | V-1, V-2, V-3, V-4, V-8, V-9, V-10 | Matrix rows `failed-start-before-readiness`, `failed-post-readiness-exit`, `failed-health-observation`, `failed-false-liveness`, and `failed-transition-race` with one retained bounded category, one cleanup audit, one event, and no `Running` report after the failure. |
| AC-5 | T-4, T-5, T-8 | V-4, V-5, V-6, V-7, V-8, V-9, V-10 | Component matrix rows rendering all four states with accessible text; a `Failed` card carrying the category notice; explicit unavailable rendering for transport, timeout, and reconciliation-mismatch cases; a rendered-DOM disclosure scan with zero prohibited matches. |
| AC-6 | T-1, T-2, T-3, T-5, T-6 | V-2, V-4, V-7, V-8, V-10 | Matrix row `cross-project-isolation` with project B faulted through start, false-liveness, exit, and health paths while project A's runtime, API, and Home state, category, cleanup, and event digests stay byte-identical. |
| AC-7 | T-2, T-6 | V-3, V-8, V-10 | Ordered NFR-015 event records per scenario with `to`-state-to-public-state mapping; exactly one terminal event per race with zero loser events; zero non-catalog lifecycle names; passing BL-013 catalog regression. |
| AC-8 | T-6, T-7, T-9 | V-1 through V-10 | `just verify-runtime-state` output covering all ten scenarios, the validator mutation table, the committed evidence artifact with digest equality and revalidation, and a passing `just verify`. |

Coverage proof: every AC ID maps to at least one implementation task, at least one finite automated test or validation command, and at least one inspectable evidence artifact retained in version control. No criterion depends on implicit full-suite behavior; `just verify` is a regression gate, not the acceptance source for any single criterion.

## Implementation Tasks

1. **T-1 — Define the public runtime state vocabulary and manager projection** (AC-1, AC-2, AC-3, AC-4, AC-6)
2. **T-2 — Own the guarded `running -> failed` transition and align lifecycle events** (AC-3, AC-4, AC-6, AC-7)
3. **T-3 — Serve the read-only public runtime-state endpoint** (AC-1, AC-2, AC-3, AC-4, AC-6)
4. **T-4 — Add the revision-bound web runtime-state client and controller** (AC-1, AC-5)
5. **T-5 — Report the four states, the safe failure notice, and explicit unavailability on Project Home** (AC-1, AC-5, AC-6)
6. **T-6 — Build the BL-016 source guard, scenario catalog, deterministic matrix, and validator** (AC-1 through AC-8)
7. **T-7 — Add the root justfile validation recipes** (AC-8)
8. **T-8 — Update affected application documentation** (AC-4, AC-5, AC-8)
9. **T-9 — Retain committed evidence and run the regression and full validation gates** (AC-1 through AC-8)

## Public Reporting Contract

### Vocabulary and projection
- `PUBLIC_RUNTIME_STATES = ['Stopped', 'Starting', 'Running', 'Failed']` is declared in `apps/api/src/project-runtime-contract.ts`, distinct from the internal lowercase `RUNTIME_STATES`.
- Missing entry and internal `registered` map to `Stopped`; `starting` to `Starting`; `running` to `Running`; `failed` to `Failed`. The internal `registered` state never reaches a public surface.
- `ProjectRuntimeManager.reportPublicStates(projectIds)` is the only producer. Its interface return type is a non-`Promise` `readonly PublicRuntimeReport[]`. Its body contains no `await`, no `.then(`, and no process, port, health, launch, terminate, audit, or event-dependency call, and performs exactly one ordered read over the entry map.
- `failureCategory` is present only when `state` is `Failed`, is one of the existing 12 `RuntimeFailureCategory` values, and is the only failure data projected. Diagnostics, messages, PIDs, ports, internal authorities, canonical paths, commands, and environment values are never projected.

### Guarded `running -> failed` transition
- One manager-owned operation performs every `running -> failed` transition. Its contenders are observed false liveness during reuse, a completed health observation that fails the documented contract, and process-exit settlement.
- The claim is a synchronous compare-and-set on the exact installed entry object and its generation, resolved **before** any `await`, so a losing contender can never begin a second cleanup.
- The winner installs the frozen failed entry with exactly one retained bounded category, performs exactly one cleanup operation (`terminate` for the reuse contenders, `audit` with `already-absent` for the exit contender), records exactly one cleanup audit, and emits exactly one `runtime.health.changed` with `from: 'running'`, `to: 'failed'`, elapsed timing, and that category.
- A loser performs no mutation, no terminate, no audit, and no emit. A reuse-path loser surfaces the winner's retained failure so its caller observes the same bounded category. A delayed loser that settles after the transition behaves identically.
- A cleanup rejection surfaces explicitly after the single event is emitted; it is never swallowed, never produces a second event, and never changes the retained category.
- `shuttingDown` still suppresses the transition and its event: manager shutdown ends the reporting surface and is not a reportable public transition.
- No automatic retry, no replacement start, and no background health work is introduced.

### Event catalog
- Public transitions map to exactly one NFR-015 catalog event: `stopped|failed -> starting` is `runtime.start.requested`, `starting -> running` is `runtime.start.succeeded`, `starting -> failed` is `runtime.start.failed`, and `running -> failed` is `runtime.health.changed`.
- `runtime.exited` is removed from `RuntimeLifecycleEvent`, the manager, the BL-013 catalog, the isolation e2e assertion, and the shipped documentation. The BL-013 record count stays 70 because the event is renamed, not added.
- The false-liveness path, which today installs `Failed` and throws with no event at all, is corrected by routing through the guarded transition.

### API
- `GET /api/projects/runtime` returns `200 {"runtimes":[{"id":"...","state":"Running"}]}` for every registered project in the existing `compareProjects` order, with `failureCategory` added only for `Failed`. It is served by its own route plugin so the registration and close error handler in `routes/projects.ts` cannot shape its responses. Only `DELETE /api/projects/:id` exists today, so the static `runtime` segment is unambiguous.
- A library or projection failure returns `500 {"error":{"category":"runtime_state_failed"}}` and logs `project.runtime.state.failed`. No partial or empty success body is produced.
- `GET /api/projects`, `validateProject`, and `PROJECT_FIELDS` are unchanged.

### Browser refresh, reconciliation, and unavailability
- Each successful authoritative project-list load produces one **list revision**: `{ id: number, projectIds: readonly string[] }` in list order. Revisions come from list load, list retry, refresh, and close reconciliation.
- `useRuntimeState` issues **zero** requests until it holds a revision, exactly **one** request per revision, and exactly **one** additional request when Retry is activated for the current revision. There is no timer, no stream, and no client health probe.
- Every response is tagged with its requesting revision id. A settlement whose revision id is not the current one is discarded and can never attach to a later revision.
- `parseRuntimeStateResponse` validates shape with exact-key checks; `reconcileRuntimeReports(reports, revision.projectIds)` then requires an exact match of identifiers and order. Missing, extra, duplicate, or reordered identifiers yield `{ kind: 'mismatch', reason }` and the controller reports `failure` with that reason.
- Unavailability — loading, transport failure, timeout, or reconciliation mismatch — is rendered as an explicit status distinct from the four lifecycle states, on every card plus one accessible summary, with a Retry control. Partial rendering, per-project substitution, and any `Stopped` fallback are prohibited.
- The web package owns its safe notice text keyed by bounded category, mirroring `REGISTRATION_FAILURE_MESSAGES`; server message strings are never rendered.

### Evidence retention
- Working artifact (disposable, gitignored): `test-results/bl-016/runtime-state-matrix.json`.
- **Retained evidence (committed):** `project/work-items/37-bl-016-report-accurate-runtime-state-and-health/implementation/evidence/runtime-state-matrix.json`, following the BL-010 `implementation/evidence/fake-matrix.json` precedent.
- Both copies are written from the same validated in-memory matrix using one deterministic serializer: stable key order, no wall-clock timestamps, no measured durations, no absolute paths, ports, PIDs, or authorities, elapsed recorded as a bounded class, and fixed `bl016-<surface>-<scenario>` execution IDs.
- The matrix test asserts SHA-256 equality between the two files, re-reads the committed copy, parses it, and revalidates it with `validateRuntimeStateMatrix`. Serializing the same run twice must be byte-identical.
- Because regeneration is deterministic, re-running validation leaves the committed file unmodified; T-9 proves this with a clean working tree, and Verify inspects the committed artifact rather than `test-results/`.

## Documentation Scope

| Category | Affected file | Required work |
|---|---|---|
| Architecture | `ADR-260815-public-runtime-state-projection.md`, both updated core-components, `DECISION-LOG.md` | Delivered in this Plan stage. |
| API | `README.md`, `docs/README.md`, `apps/api/src/routes/README.md` | Document `GET /api/projects/runtime`, its exact success and failure envelopes, ordering, disclosure limits, and the unchanged four-field project payload. |
| Usage / operations | `docs/project-runtime.md` | Add the public four-state projection, the guarded single `running -> failed` transition and its one-event guarantee, retained-failure precedence, revision-bound refresh with exact reconciliation, explicit unavailability, the `runtime.health.changed` replacement for `runtime.exited`, the retained evidence path, and the new commands. |
| Configuration | none | No new environment variable, flag, or configuration key; state is memory-only and read-only. |
| Migration | none | No schema, migration, or persisted-payload change; SQLite remains four-field metadata. |
| Deployment | none | No new process, port, front-door route, or deployment step; the endpoint is served by the existing API on the existing origin. |
| Cross-issue correction | `apps/api/src/routes/README.md`, `docs/stable-workbench-routing.md`, `docs/project-runtime.md`, `README.md` | Rename the BL-013 crash-scenario event from `runtime.exited` to `runtime.health.changed`; the 70-record catalog count is unchanged. |

Implement must record documentation evidence, or an explicit no-impact rationale, for every category above in `implementation/00-implementation.md`.

## Validation Commands

Root justfile is the sole validation source. No standalone verification config or validation sidecar is added.

- `just verify-focused <files>` — while building.
- `just verify-runtime-state` — new BL-016 acceptance recipe (added by T-7, gated by `BL016_ACCEPTANCE=1`).
- `just verify-project-runtime` — BL-010 regression after the transition and event change.
- `just verify-project-runtime-isolation` — BL-013 regression after the event-catalog rename.
- `just verify-home-workbench false` — BL-012 Project Home regression after the card change.
- `just verify` — authoritative full validation before handoff, with `verify-runtime-state` wired in.

## Scope Boundaries

In scope: reporting `Stopped`, `Starting`, `Running`, and `Failed` from outcomes the runtime boundary already observes, across the runtime projection, the API, and Project Home, with a single guarded terminal transition, NFR-015 event consistency, and finite automated validation.

Out of scope and explicitly not implemented: stop or restart controls, automatic recovery or retry, API-restart reconciliation, persisted runtime state, background or distributed health checks, any additional or intermediate public state, historical dashboards, and any change to the four-field persisted project metadata, the runtime manager's sole process ownership, the health-gated readiness contract, the stable proxy boundary, or the navigation shell.
