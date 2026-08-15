# Research Brief: BL-016: Report accurate runtime state and health

## GitHub Issue
- **Issue:** #37
- **Title:** BL-016: Report accurate runtime state and health
- **Work Item:** project/work-items/37-bl-016-report-accurate-runtime-state-and-health/

## Scope Classification
- **Scope Type:** issue

## Problem Statement

People using Project Home cannot reliably tell whether a registered project's
workbench is stopped, starting, usable, or failed. A live process alone is
insufficient evidence that the workbench is ready, and an exited process still
reported as running, or state attributed to another project, can misrepresent
availability. Ascend must report the four-state lifecycle required by FR-017,
AC-023, NFR-004, and NFR-015 consistently across its runtime boundary, API,
and Project Home.

This issue is limited to reporting `Stopped`, `Starting`, `Running`, and
`Failed` from observed process and health outcomes. It does not add stop or
restart operations, automatic recovery, API-restart reconciliation,
distributed health checks, extra lifecycle states, or historical dashboards.

## Acceptance Criteria

Issue #37 contains the `ACCEPTANCE_CRITERIA_START` and
`ACCEPTANCE_CRITERIA_END` markers and eight marked checkboxes. They are
preserved below verbatim and in issue order.

- [ ] For every registered project, the runtime boundary, API response, and Project Home expose exactly one state from `Stopped`, `Starting`, `Running`, or `Failed`; when observed without an intervening lifecycle outcome, those surfaces do not disagree or expose any additional public state.
- [ ] A registered project with no active Ascend-owned runtime and no currently observed failure is reported `Stopped`; an accepted start still in progress before workbench readiness is reported `Starting` rather than `Running`.
- [ ] A project is reported `Running` only after its workbench readiness has been observed; process existence without readiness is not sufficient.
- [ ] A start failure before readiness, an observed runtime exit after readiness, and a completed health observation that does not satisfy the documented workbench health contract each result in `Failed` and cannot leave that project reported `Running`.
- [ ] Project Home visibly identifies all four states, and a failed project presents a notice identifying the observed failure category without exposing credentials, command output, full environment values, or internal network addresses.
- [ ] In a two-project scenario, causing one project's start, process, or health outcome to become `Failed` leaves the other project's independently observed state unchanged.
- [ ] The NFR-015 `runtime.start.*` and `runtime.health.changed` events emitted for these scenarios report outcomes consistent with the public state and do not report success or health while that state is `Failed`.
- [ ] Finite automated repository validation demonstrates the four public states and the required transitions using delayed readiness, successful readiness, start failure, post-readiness process exit, health failure, cross-project isolation, and structured-event consistency.

## Repository Findings

### Existing runtime boundary and health behavior

- `PRD.md` FR-017 and AC-023 require the public `Stopped`, `Starting`,
  `Running`, and `Failed` states. NFR-015 names `runtime.start.requested`,
  `runtime.start.succeeded`, `runtime.start.failed`, and
  `runtime.health.changed` as structured runtime events.
- `apps/api/src/project-runtime-contract.ts` defines the internal
  `RUNTIME_STATES` as lowercase `starting`, `running`, and `failed`.
  `Stopped` is represented by absence in `ProjectRuntimeManager.inspect()`;
  `RuntimeLifecycleEvent.from` additionally permits `stopped`. Its
  `RuntimeSnapshot` carries internal process and authority fields for trusted
  in-process consumers, while `serializeRuntimeEvent()` emits only the opaque
  project token, transition, elapsed time, and optional bounded failure
  classification.
- `apps/api/src/project-runtime-manager.ts` owns a stable-project-ID `Map`
  whose entries are `registered`, `starting`, `running`, or `failed`.
  `start()` installs a `starting` snapshot and emits
  `runtime.start.requested`; it installs `running` and emits
  `runtime.start.succeeded` only after `launchReadyRuntime()` resolves. The
  manager retains a typed failure in a `failed` entry after a failed launch,
  invalid reuse-health result, or post-running exit. `inspectEntries()` is an
  internal inspection API and includes the non-public `registered` state.
- `apps/api/src/project-runtime-process.ts` implements the readiness boundary:
  it polls `/healthz/` within finite bounds and accepts only HTTP 200 with JSON
  `status` equal to `alive` or `expired`. A process is not returned as ready
  merely because it exists. A pre-readiness exit, timeout, unexpected health
  status, or unexpected health body produces a typed failure and exact owned
  process cleanup.
- On reuse, `ProjectRuntimeManager.start()` checks both process liveness and
  the same health contract. A failed reuse-health check changes the entry from
  `running` to `failed`, records cleanup, and emits
  `runtime.health.changed` with a bounded classification. A post-readiness
  process exit similarly changes the entry to `failed`, but the current event
  is `runtime.exited`, rather than an NFR-015-named `runtime.start.*` or
  `runtime.health.changed` event.
- `apps/api/src/project-runtime-contract.ts` defines 12 safe typed failure
  categories, including early exit, readiness timeout, and unexpected health
  status/body. `RuntimeFailure` removes stacks and allowlists only finite
  diagnostics. These are existing failure-category and redaction boundaries;
  they are not currently rendered by Project Home.

### Current API, routing, and Project Home surfaces

- `apps/api/src/app.ts` constructs the runtime manager once, passes its safe
  events to Fastify structured logging, and exposes it to in-process route and
  proxy owners. `apps/api/src/routes/projects.ts` defines the current
  `GET /api/projects` response as `{ projects }`, where every project is
  exactly `id`, `name`, `canonicalPath`, and `createdAt`; both server and web
  validators reject additional project fields. There is no runtime-state API
  response in the registered project routes.
- `apps/api/src/routes/workbench.ts` owns the `/projects/*` transport and
  navigation-shell route. Marked workbench acquisition reaches the proxy and
  its runtime start/reuse boundary; it does not expose a runtime-status payload
  to Project Home. The current route inventory is the project list,
  registration, project close, root, and workbench catch-all routes.
- `apps/web/src/projects.ts` uses the same exact four-field `Project` shape.
  `apps/web/src/use-project-list.ts` loads that list with loading, success, and
  list-failure controller states; those are request states, not workbench
  lifecycle states. `apps/web/src/App.tsx` renders each card's name and
  canonical path with Open and Close controls. Its only workbench lifecycle
  announcement is `<project>: Opening workbench.` before browser navigation;
  it renders no runtime state or runtime-failure notice.
- `apps/api/src/home-workbench-evidence.ts` and the BL-012 component/API
  matrices contain a test-evidence `runtimeState` field. The existing
  `home-workbench-matrix.test.ts` uses it to describe route-driven start/reuse
  observations, but `valid-stopped` immediately starts the fixture and records
  `running`; it is not a public status response or Project Home rendering
  contract.

### Delivered BL-010 through BL-015 behavior and retained evidence

- BL-010 retained evidence in
  `project/work-items/25-bl-010-start-and-reuse-one-project-workbench/`
  establishes health-gated readiness, starting/running/failed internal
  snapshots, typed failures, post-running exit eviction, safe events, and
  explicit retry without automatic retry. Its implementation record identifies
  `implementation/evidence/fake-matrix.json` and `episode.json` as retained
  runtime evidence.
- BL-011 (`project/work-items/27-bl-011-route-workbenches-through-stable-project-urls/`)
  preserves BL-010 as the process owner. The stable proxy resolves only trusted
  running snapshots and maps bounded runtime failures at its transport
  boundary; it does not add a public runtime-status surface.
- BL-012 (`project/work-items/29-bl-012-connect-project-home-and-project-workbench/`)
  connects Open to the stable workbench URL. Its retained API matrix distinguishes
  route-driven stopped-start and running-reuse observations, while its own
  implementation record explicitly excludes lifecycle/status controls.
- BL-013 is delivered and is a direct dependency for cross-project state
  attribution. `apps/api/src/project-runtime-manager.ts` partitions entries by
  stable project ID, and
  `apps/api/test/project-runtime-manager.test.ts` exercises 24 interleaved
  A/B/C starts with project-local reuse. BL-013's
  `apps/api/src/project-runtime-isolation-evidence.ts` declares 12 scenarios
  and an ordered event catalog: early start failure emits
  `runtime.start.failed`, a post-running crash emits `runtime.exited`, and a
  failed reuse health check emits `runtime.health.changed`. Its retained
  implementation record documents five B-only faults while A/C remain
  unchanged.
- BL-014 retained evidence in
  `project/work-items/33-bl-014-preserve-sessions-while-switching-among-projects/`
  proves that Home navigation and browser-client disconnection preserve healthy
  per-project runtimes. Its Project Home observation is Open/Close only and
  records zero Stop/Restart or lifecycle invocation; it introduces no runtime
  status UI.
- BL-015 retained evidence in
  `project/work-items/35-bl-015-measure-mvp-navigation-and-startup-performance/`
  observes `runtime-health-ready` as a startup timing consequence and requires
  an unchanged healthy identity for warm reuse. It changes neither the public
  project API nor runtime-status presentation.

### Criterion-by-criterion observed coverage and gaps

| Issue criterion order | Observed repository coverage | Observed gap |
| --- | --- | --- |
| 1 | The internal manager has project-local starting/running/failed entries and `stopped` transition origin. | No API or Project Home state surface exists; internal inspection additionally has `registered`, and public title-cased state vocabulary is not defined. |
| 2 | `start()` creates `starting` before readiness; no manager snapshot represents a never-started project. | `Stopped` is currently inferred from internal absence and is not reported for every registered project through API or UI. |
| 3 | `launchReadyRuntime()` requires the documented `/healthz/` response before returning a running runtime. | That health-gated state is not exposed outside the runtime/proxy boundary. |
| 4 | Failed launch, reuse-health failure, and post-running exit each create a failed manager entry with a typed failure. | Failed state is not public; post-running exit currently emits `runtime.exited`; health checking after readiness occurs during reuse rather than through an independently observed background health loop. |
| 5 | Runtime failures and serialized events already have bounded, redacted categories and fields. | Project Home renders neither the four states nor a safe observed-failure notice. |
| 6 | BL-013 partitions manager entries, snapshots, events, process ownership, and cleanup by stable project ID; its A/B/C scenarios retain B-only faults with A/C unchanged. | There is no two-project public-state surface whose unchanged peer state is currently observed. |
| 7 | The manager emits start requested/succeeded/failed and health-changed events; BL-013 validates ordered, token-attributed event records. | There is no stated public-state/event consistency contract, and the post-running exit path uses `runtime.exited`, which is outside the NFR-015 event list. |
| 8 | Existing focused manager/process, BL-013 isolation, BL-012 route/UI, and BL-015 health-ready evidence cover portions of the underlying conditions. | No existing repository validation demonstrates all four public states and all listed transitions across runtime boundary, API, Project Home, and structured events together. |

## Constraints

- Runtime identity, process handles, ports, owner tokens, and lifecycle state
  are memory-only. `docs/project-runtime.md` and
  `CORE-COMPONENT-260808-runtime-lifecycle-error-handling` prohibit persisting
  them with the four-field SQLite project metadata.
- The current exact project-list shape is a shared server/client contract:
  `apps/api/src/routes/projects.ts` and `apps/web/src/projects.ts` both reject
  unexpected project fields. Current application documentation describes the
  same four-field project model.
- The runtime manager remains the sole process owner. The stable proxy and
  navigation shell consume trusted runtime snapshots but do not own or
  terminate processes; `ADR-260812-in-process-workbench-reverse-proxy` and
  `CORE-COMPONENT-260812-stable-workbench-proxy` preserve this boundary.
- `CORE-COMPONENT-260808-runtime-lifecycle-error-handling` requires state to
  remain within stopped, starting, running, and failed semantics, one active
  runtime per stable project ID, health-checked reuse only, no automatic retry,
  distinct typed failures, safe events, and cross-project isolation.
- Structured events and public evidence may contain the opaque project token,
  bounded classifications, and elapsed values, but must exclude raw project
  IDs outside stable URLs, canonical paths, ports/authorities, commands,
  environments, credentials, secrets, source, terminal, and output data.
- Stop/restart operations, automatic recovery, API-restart reconciliation,
  distributed health checks, additional states, and historical dashboards are
  explicitly outside this issue. `docs/project-runtime.md`,
  `docs/stable-workbench-routing.md`, and the BL-013/014 records also defer
  public lifecycle controls and persisted runtime state.
- Research is limited to issue scope. It assigns no AC IDs, makes no
  architectural decision, and creates no ADR or core-component artifact.

## Relevant ADRs and Core-Components

- **ADR-260808-typescript-monorepo**: establishes Fastify, React/Vite,
  code-server host processes, and one runtime per active project as the MVP
  context.
- **ADR-260812-in-process-workbench-reverse-proxy**: keeps runtime acquisition
  and lifecycle ownership inside the API process while stable public routes
  remain free of internal authorities.
- **ADR-260812-browser-navigation-shell**: defines Project Home and the
  workbench as the two browser surfaces and preserves browser-native
  navigation between them.
- **CORE-COMPONENT-260808-runtime-lifecycle-error-handling**: defines the
  stopped, starting, running, and failed lifecycle semantics, typed failures,
  health-gated readiness, isolation, and no-automatic-retry boundary.
- **CORE-COMPONENT-260808-structured-runtime-logging**: defines safe,
  structured lifecycle events and excludes sensitive project, environment,
  terminal, and command content.
- **CORE-COMPONENT-260808-host-process-environment**: constrains ownership,
  identity, environment propagation, and cleanup for host-native workbench
  processes.
- **CORE-COMPONENT-260812-stable-workbench-proxy**: keeps the proxy dependent
  on trusted runtime snapshots without making it a second lifecycle owner.

## Risks

- A public `Stopped` fallback based only on manager-entry absence could erase a
  retained failure and misreport an exited or failed-to-start runtime.
- API and Project Home observations can disagree if they derive state from
  different owners or from lifecycle changes occurring between observations.
- Transient `Starting` can be missed by validation unless the existing
  readiness boundary remains observably delayed under a finite fixture.
- A process can exist before readiness or after health has failed, so process
  liveness alone can produce a false `Running` report.
- The exact four-field project contract currently rejects additional fields on
  both server and client; changing a public response shape can invalidate
  existing list, schema-minimization, and documentation evidence.
- Failure notices can leak paths, authorities, commands, environment values,
  or credentials if they bypass the existing bounded `RuntimeFailure`
  classification and event serializer.
- The post-readiness exit path currently emits `runtime.exited`, creating a
  consistency gap with the NFR-015 `runtime.start.*` and
  `runtime.health.changed` event vocabulary.
- Cross-project state attribution can regress if lookup, failure, or event
  correlation uses mutable names, paths, ports, or process fields instead of
  the stable project partition.
- Background or distributed health monitoring would expand issue scope; the
  criterion is limited to reporting the result of a completed health
  observation already owned by the runtime boundary.
