# Research Brief: BL-018: Restart a running or failed workbench

## GitHub Issue
- **Issue:** #41
- **Title:** BL-018: Restart a running or failed workbench
- **Work Item:** project/work-items/41-bl-018-restart-a-running-or-failed-workbench/

## Scope Classification
- **Scope Type:** issue

## Problem Statement

Ascend currently provides a read-only public runtime-state projection and a
selected Stop operation, but it does not provide an explicit restart action for
a selected running workbench or for a retained failure in the current API
process. Issue #41 requires a replacement for the same registered project and
canonical filesystem directory while preserving the stable workbench route,
registration, and project files. It also requires truthful public state,
bounded lifecycle outcomes, accessible Project Home feedback, safe lifecycle
events and disclosure, per-project isolation, and local repeatable evidence.

The issue is limited to explicit restart of a selected running workbench or a
current-process retained-failed workbench. A project reported `Stopped` keeps
the existing Open flow. Automatic recovery, API-restart reconciliation
(BL-019), running-or-failed project close (BL-020), persisted runtime handles
or state, idle shutdown, bulk actions, and arbitrary-process adoption are out
of scope.

## Acceptance Criteria

`gh issue view 41 --repo jsburckhardt/ascend --json
number,title,body,labels,assignees,milestone` returned exactly the `## Problem`
and `## Acceptance Criteria` sections, one
`ACCEPTANCE_CRITERIA_START`/`ACCEPTANCE_CRITERIA_END` marker pair, and 20
unchecked checklist criteria in issue order. Each criterion has a bounded or
specified observable outcome, count, state, resource set, or command-based
verification condition. The criteria below are preserved verbatim; Research
assigns no AC IDs.

<!-- ACCEPTANCE_CRITERIA_START -->

**Core**
- [ ] Restarting a selected running workbench settles within a finite bound fixed and documented before execution. Before replacement startup begins, evidence tied to the complete pre-restart identity confirms that prior runtime is absent, no process remains attributable as its owned descendant, and its prior listener accepts no connection; the operation then produces exactly one healthy replacement with a distinct complete identity for the same registered project, canonical filesystem directory, and stable workbench route.
- [ ] Within the same API process, a project with a retained `Failed` result remains eligible for an explicit Restart until a restart succeeds or runtime management shuts down, including after an earlier Restart settles unsuccessfully. When its prior owned resources are already absent or their release is confirmed within the predeclared bound, Restart produces exactly one healthy replacement for the same project and directory, and the next authoritative runtime-state observation reports `Running` without the prior failure category.
- [ ] From acceptance of Restart until replacement readiness or a terminal failure, the selected project is reported `Starting`; it is not reported `Stopped` between generations or `Running` from process existence alone. Success is reported only after the replacement satisfies the existing workbench readiness contract, and every observation remains within `Stopped`, `Starting`, `Running`, or `Failed`.
- [ ] After successful Restart, prior-generation browser and proxy connections can no longer communicate with the released runtime, and a fresh navigation through the unchanged stable workbench route reaches the ready replacement. Restart makes no claim that editor or terminal session state survives replacement.
- [ ] In a controlled scenario that declares no in-project writer, every restart outcome leaves the selected project registered exactly once with its stable ID, display name, canonical path, and created-at value unchanged; a non-empty finite before-and-after fixture manifest shows unchanged project file membership, content digests, permission modes, and recorded timestamps.
- [ ] Project Home offers Restart only for a project reported `Running` or current-process retained `Failed`, supports keyboard activation, exposes pending, success, failure, and unknown outcomes to assistive technology, prevents duplicate activation while that project restart is pending, and returns focus to that project lifecycle control when the action settles. Other projects and their applicable controls remain available during the selected restart.
- [ ] Each accepted restart emits one `runtime.restart.requested` event and exactly one terminal `runtime.restart.succeeded` or `runtime.restart.failed` event. A request rejected before acceptance emits no restart lifecycle event. Events, public operation outcomes, authoritative state reports, Project Home notices, and retained public evidence agree on the outcome and expose no raw project path, process identity, internal authority, command, environment value, credential, terminal content, source content, stack, or raw error.

**Edge Cases**
- [ ] If release of an existing running or retained-failed runtime cannot be confirmed within the predeclared bound, Restart returns an explicit non-success, launches no replacement, does not report `Stopped` or success, and leaves the project reported `Failed` with a bounded actionable category.
- [ ] If prior release is confirmed but replacement startup or readiness fails, Restart returns an explicit non-success, reports the selected project `Failed` with a bounded actionable category, and leaves no replacement process, owned descendant, listener, timer, or in-flight startup behind.
- [ ] Eight concurrent Restart requests for one eligible project join one accepted restart and settle within the same predeclared bound with the same project and outcome; exactly one prior-generation release and one replacement startup occur.
- [ ] Three sequential successful Restart requests for one project each produce one distinct healthy replacement and one accepted event pair. After every settlement exactly one selected runtime and listener remain, and after the sequence no prior identity, attributable descendant, retained prior failure, listener, timer, or in-flight operation remains.
- [ ] Restart requests for an unknown project, a registered project reported `Stopped`, a project whose start or stop is already in progress, or a manager that is shutting down return documented bounded non-success outcomes and create, release, or mutate no project runtime or registration.
- [ ] In a bounded two-project matrix, every selected-project outcome covered by this issue, including running success, retained-failed success, unconfirmed release, and replacement startup or readiness failure, leaves the peer project `Running` with the same runtime identity, readiness result, route, connections, and registered metadata; a declared unrelated control process and listener also retain their identities and availability.
- [ ] A delayed prior-generation release, exit, health, connection, or startup settlement cannot terminate, replace, route traffic to, emit a terminal outcome for, or change the state of the successful replacement.
- [ ] When the client cannot classify a restart response, Project Home presents an explicit unknown outcome and offers a fresh read-only observation of the current API process authoritative runtime state without assuming success, automatically retrying Restart, or creating a second replacement. This client re-observation adds no backend restart reconciliation behavior and does not claim BL-019.

**Verification**
- [ ] Finite repeatable repository validation executes running and retained-failed restart, controlled responsive and non-responsive prior runtimes, unconfirmed release, replacement startup and readiness failures, eight concurrent requests, three sequential successes, start/stop/shutdown conflicts, stale prior-generation settlements and connections, unknown client outcome, peer isolation across success and failure, registration retention, fixture integrity, event and public-disclosure consistency, and final cleanup. Each scenario produces inspectable pass/fail evidence against bounds fixed before its first action.
- [ ] Retained evidence correlates complete pre-restart and replacement identities, prior release observations, replacement readiness, stable-route and stale-connection outcomes, authoritative state observations, lifecycle events, registration values, fixture manifests, peer and control identities, elapsed bounds, and cleanup. Final residual audits report zero validation-owned prior-generation processes, descendants, listeners, timers, in-flight operations, stale connections, and disposable fixtures.
- [ ] Affected user, runtime, operational, and validation documentation records Restart eligibility, state and connection behavior, outcomes, predeclared finite bounds, accessibility, privacy, evidence, cleanup, and repeatable repository commands, and explicitly preserves the BL-019 API-restart reconciliation and BL-020 running-or-failed project-close boundaries.
- [ ] The canonical full repository validation completes successfully, and all BL-010 through BL-017 runtime, routing, navigation, isolation, continuity, state, performance, and Stop regression gates remain successful.
- [ ] All required validation uses repository-local fixtures and commands and requires no production access, hosted service, unavailable credential, unsupported hardware, destructive environment action, indefinite observation, or manual judgment.

<!-- ACCEPTANCE_CRITERIA_END -->

## Repository Findings

### Current branch and delivered lineage

- The checked-out branch is `feat/41-restart-running-or-failed-workbench` at
  `353c3a9e7d14496772644ec8512d1cd31c45cd71`. That SHA is `main` and the
  merge commit for PR #40, the accepted BL-017 selected-stop delivery. Issues
  #31, #33, #35, #37, and #39 are closed; Issue #41 is open and has no
  comments. No `project/work-items/41-*` directory existed when Research
  resolved this work item.
- `PRD.md` FR-016 and AC-022 require one healthy replacement for a running or
  failed workbench against the same project path. NFR-004 requires one
  project's failure not to affect another, NFR-005 prohibits restart-caused
  project-file mutation, and NFR-015 already names
  `runtime.restart.requested`, `runtime.restart.succeeded`, and
  `runtime.restart.failed` in the event catalog.

### Runtime lifecycle, state, release, and event boundaries

- `apps/api/src/project-runtime-manager.ts` is the current single process and
  lifecycle owner. It holds memory-only entries keyed by stable project ID;
  its public API exposes `start`, `stop`, `reportPublicStates`, inspection,
  and manager shutdown. There is no restart operation.
- `apps/api/src/project-runtime-contract.ts` fixes the public vocabulary to
  `Stopped`, `Starting`, `Running`, and `Failed`. Internal entries include
  `registered`, `starting`, `running`, `stopping`, and `failed`; a `stopping`
  entry projects as `Running`. `reportPublicStates` is a synchronous manager
  projection and performs no process, health, cleanup, or event work.
- A running entry is reusable only after exact liveness and the `/healthz/`
  readiness contract. `start` rejects a `stopping` entry as
  `runtime-stopping`; when an existing entry is `failed`, it does not take a
  running-reuse branch and reaches the ordinary launch path after the persisted
  ID/path check. This existing behavior is not an explicit Restart operation,
  does not accept a restart request, and does not establish Issue #41's prior
  release, joined-operation, event, public-state, or retained-failed-resource
  requirements.
- The delivered selected Stop operation synchronously claims one running
  generation, projects it as `Running` until release settles, and either
  installs a released `registered` entry after the exact
  process/process-group/listener absence audit or a retained `failed` entry
  with `stop-unconfirmed`. It rejects an already retained failed entry with
  `failure-retained`. Its in-flight public `Running` projection differs from
  Issue #41's required `Starting` observation after a restart is accepted.
- `apps/api/src/project-runtime-process.ts` supplies the existing exact
  termination boundary: process identity, owned process-group membership,
  listener absence, bounded graceful/force windows, a monotonic clock,
  trusted deadline scheduling, cancellation, and an `unconfirmed` outcome.
  These are release facts only; the module has no replacement-generation
  operation.
- The current runtime event type includes start, health, and stop names only.
  The restart event names are present in `PRD.md` and in BL-017 evidence as
  forbidden/zero restart events, but are not current runtime lifecycle event
  values or emitted operation outcomes.

### API, proxy, browser, registration, and documentation surfaces

- `GET /api/projects/runtime` in
  `apps/api/src/routes/project-runtime-state.ts` remains the sole public state
  authority. It orders the authoritative project list, obtains one manager
  projection, and returns only project ID, one public state, and a bounded
  failure category for `Failed`.
- `POST /api/projects/:id/runtime/stop` is the only selected lifecycle write
  route. It delegates once to the manager, exposes only bounded stop outcomes,
  and does not return a public state, process identity, release audit, path,
  or diagnostic. `apps/api/src/app.ts` registers the state and stop plugins;
  no restart plugin is registered.
- `apps/api/src/workbench-proxy-manager.ts` resolves a persisted project and
  calls `projectRuntime.start`, then forwards only when the snapshot remains
  the exact manager-owned running object. It is a consumer of runtime
  ownership and has no stop, terminate, kill, or restart capability.
- `apps/web/src/runtime-stop.ts`, `apps/web/src/use-project-home.ts`, and
  `apps/web/src/App.tsx` implement only Stop transport and Project Home
  outcomes. Stop is globally serialized with the existing Home-owned actions;
  a settled success refreshes the runtime projection once, an unknown result
  remains explicit, and focus returns to Stop. There is no Restart transport,
  control, or current eligibility rendering for `Running` versus `Failed`.
- The registered project model remains exactly `id`, `name`, `canonicalPath`,
  and `createdAt`; runtime identities, process handles, ports, route snapshots,
  owner tokens, and lifecycle state remain memory-only. Existing documentation
  (`README.md`, `docs/project-runtime.md`, `docs/stable-workbench-routing.md`,
  `apps/api/README.md`, `apps/api/src/routes/README.md`, and
  `apps/web/README.md`) explicitly records Restart as deferred.

### Delivered BL-013 through BL-017 evidence and constraints

- BL-013 establishes stable-ID partitioning of entries, snapshots, proxy
  routes, events, identities, fixture state, and cleanup. Its accepted
  three-project evidence retains immediate isolation and B-only failure or
  replacement behavior while A/C remain unchanged. The project runtime,
  listener, proxy, fixture, and control audits use exact identities and do not
  claim session continuity.
- BL-014 establishes that Home navigation, browser disconnection, history, and
  reload do not stop healthy current runtimes. It explicitly records that
  selected Stop is an explicit action and that Restart remains out of scope;
  runtime-scoped code-server session state is not claimed to survive a runtime
  replacement.
- BL-015's retained designated measurement is evidence context, not a restart
  contract. It measured cold startup and warm reuse with exact identities and
  cleanup, retained a 15,000 ms cold target and 2,000 ms warm target, and
  reported the warm result as a blocker. Existing runtime defaults separately
  provide a 15,000 ms readiness timeout and a 5,000 ms selected-stop overall
  bound; neither is a declared end-to-end restart bound.
- BL-016 established the four-state, read-only manager projection, ordered
  browser reconciliation, no polling, and catalog-aligned state events. BL-017
  added selected Stop with a fixed 31-scenario matrix, a designated real-host
  release episode, and a separate exact-identity residual audit. Its retained
  matrix has 31 stop scenarios, no restarts, project registration and fixture
  digests, peer/control evidence, monotonic bounds, and zero final residuals.
  It does not prove restart acceptance criteria.

### Existing validation capabilities

- The root `justfile` is the canonical command interface. It exposes both
  `verify-focused` and `verify`, plus focused gates for project runtime,
  workbench routing, project-runtime isolation, session switching, runtime
  state, runtime stop, and MVP performance.
- `just verify` currently includes the delivered BL-010 through BL-017
  regression gates, including `verify-runtime-stop`,
  `proof-runtime-stop`, and `proof-runtime-stop-residual-audit`. It has no
  restart-specific gate, proof recipe, retained restart matrix, or restart
  residual audit.
- Existing API and browser tests exercise health-gated running state,
  retained failures, exact stop release, state reconciliation, strict bounded
  transport parsing, unknown stop outcomes, keyboard/focus behavior,
  project isolation, stable proxy ownership, continuity, retained evidence,
  and residual cleanup. The existing suites do not exercise accepted restart
  requests, a replacement after a selected release, retained-failed restart,
  stale prior-generation release effects, or restart event pairs.

## Constraints

- **Scope classification:** this is an `issue`, not an architecture-decision
  or core-component request. Existing global runtime, proxy, state, logging,
  filesystem, persistence, host-process, and command contracts remain the
  governing boundary. Research makes no determination whether Plan needs to
  amend an existing architecture artifact.
- **Single lifecycle authority:** the runtime manager remains the sole owner of
  process ownership, liveness, readiness, exact identity, release, public
  state, and lifecycle results. Routes, the proxy, the browser, and CLI
  surfaces cannot derive a lifecycle result from a process, port, listener, or
  their own probe.
- **State and readiness:** public observations remain exactly `Stopped`,
  `Starting`, `Running`, or `Failed`; `Running` requires the existing
  health-gated readiness contract. No public fifth state, optimistic state,
  partial projection, polling, stream, client health probe, or process-exists
  inference is permitted by the delivered state architecture.
- **Stable ownership and routing:** manager state is keyed by stable project
  ID; the proxy may resolve upstreams only through persisted project metadata
  and the exact installed running snapshot. The percent-encoded stable route
  remains unchanged and must not expose the loopback authority.
- **Exact release and stale work:** existing termination, stop, and proxy rules
  require exact process/start identity, owned-group attribution, listener
  observation, bounded cleanup, and exact-snapshot checks. Delayed work must
  not alter a newer manager entry, peer, route, or process it no longer owns.
- **Registration and filesystem safety:** the four persisted registration
  fields, canonical path, SQLite lifecycle, and project contents are separate
  from memory-only runtime state. Lifecycle work must not delete, move, copy,
  rename, or modify project content or metadata unless an existing contract
  explicitly permits it; Issue #41 itself prohibits restart-caused project
  mutation in the declared no-writer scenario.
- **Isolation and disclosure:** one project cannot change another project's
  entry, identity, listener, route, readiness, state, failure category, or
  lifecycle evidence. Public payloads, browser notices, structured events, and
  retained public evidence must exclude raw paths, process identities,
  loopback authorities, commands, environment values, credentials, terminal
  content, source content, stack traces, and raw errors.
- **Current-process boundary:** runtime identity and release markers are not
  persisted. A fresh API process has no retained release marker and no restart
  reconciliation behavior; BL-019 remains outside this issue. A running or
  failed project close remains BL-020.
- **Repository workflow:** only the Research artifact is changed in this
  stage. Plan owns stable AC IDs, architectural decisions, task/test plans,
  and any required ADR/core-component or decision-log update. Implement and
  Verify own code, documentation, validation evidence, and acceptance.

## Relevant ADRs and Core-Components

- **ADR-260808-typescript-monorepo** - Direct host code-server workbenches,
  Fastify/React application surfaces, SQLite metadata, and one active runtime
  per project establish the MVP operating context.
- **ADR-260810-full-page-browser-workbench-presentation** - Keeps the
  full-page workbench and minimal Ascend header; lifecycle controls remain a
  Project Home concern rather than a workbench-shell concern.
- **ADR-260812-in-process-workbench-reverse-proxy** and
  **ADR-260812-browser-navigation-shell** - Keep stable same-origin routing,
  snapshot-derived upstream selection, native navigation, redaction, and the
  proxy-before-runtime shutdown order.
- **ADR-260815-public-runtime-state-projection** - Establishes the four-value,
  manager-owned, read-only public projection; its dated amendment defers
  Restart after spending only the selected Stop portion of the lifecycle
  deferral.
- **ADR-260815-selected-runtime-stop-control** and
  **ADR-260815-termination-sequencer-boundary** - Define the current
  manager-owned release, exact generation claim, bounded termination and
  attribution boundaries, selected-stop event semantics, and failure
  retention. They are the immediate delivered lifecycle baseline, not a
  restart implementation.
- **CORE-COMPONENT-260808-runtime-lifecycle-error-handling** - Governs memory
  ownership, internal and public states, health-gated readiness, bounded typed
  failures, exact cleanup, concurrency, shutdown, replacement isolation, and
  public projection authority.
- **CORE-COMPONENT-260808-structured-runtime-logging** - Limits lifecycle
  events to the NFR-015 catalog and requires opaque-token correlation plus
  protected-data exclusion.
- **CORE-COMPONENT-260812-stable-workbench-proxy** - Governs stable-prefix
  HTTP/WebSocket routing, exact running-snapshot ownership, proxy resource
  ownership, stale-snapshot rejection, safe disclosure, and shutdown order.
- **CORE-COMPONENT-260808-filesystem-path-safety**,
  **CORE-COMPONENT-260808-host-process-environment**, and
  **CORE-COMPONENT-260810-sqlite-persistence-lifecycle** - Preserve canonical
  project directories, non-root direct host launch, explicit SQLite ownership,
  migration discipline, and fixture/sidecar cleanup.
- **CORE-COMPONENT-260806-project-command-interface** and
  **CORE-COMPONENT-260808-development-standards** - Require the root
  `justfile`, focused and full validation, strict TypeScript, automated tests,
  documentation updates, and configured formatting/linting.
- `project/architecture/ADR/DECISION-LOG.md` records the active decisions for
  manager-owned memory-only lifecycle state, exact cleanup, stable proxy
  ownership, four-state reporting, selected Stop, and the termination
  primitive boundary (including decisions 53-57, 90-107, and 108-153).

## Risks and Open Questions

- **Retained-failure ownership:** a retained `failed` entry can fall through
  the current generic `start` launch path, while selected Stop rejects retained
  failure and retains its ownership record after an unconfirmed release. The
  complete ownership and cleanup relation of an explicit retained-failed
  restart is not currently represented as an operation result.
- **State transition truth:** selected Stop intentionally reports `Running`
  while release is in flight, but Issue #41 requires `Starting` from accepted
  restart through replacement readiness or terminal failure. The existing
  four-state projection must remain the only public authority.
- **Generation safety:** current stop, reuse, exit, health, proxy, and shutdown
  protections are generation-sensitive. Issue #41 additionally requires that
  delayed prior release, health, connection, or startup work cannot affect a
  successful replacement; no delivered restart evidence exercises that
  relationship.
- **Connections and sessions:** the proxy currently rejects a released
  snapshot and owns active HTTP/WebSocket resources, but no current evidence
  relates a released generation's browser/proxy connections to a replacement.
  BL-014 only supports continuity while the original runtime remains running;
  replacement does not imply terminal or editor-session continuity.
- **Event vocabulary and safe outcomes:** restart names are listed in NFR-015,
  but current lifecycle types, browser transport, bounded notices, route
  records, and retained evidence have no restart semantics. The required
  request/terminal cardinality and public-outcome agreement remain unproven.
- **Concurrency and cleanup scale:** no current delivery proves eight joined
  restart requests, three sequential replacement generations, a retained
  failed restart after an earlier unsuccessful restart, or the complete
  two-project matrix with stale settlement and connection cases. Existing
  stop/isolation evidence is an adjacent baseline, not coverage of these
  restart conditions.
- **Current-process and scope boundaries:** treating an API restart as proof
  that an earlier release or failure is resolved would violate the memory-only
  state boundary and consume BL-019. Treating Restart as a running/failed
  project close would consume BL-020.
- **Documentation consistency:** the delivered user, API, runtime, routing,
  and validation documentation still states that Restart is deferred. Any
  later changed behavior requires coordinated application-documentation review
  while preserving the explicit BL-019 and BL-020 boundaries.

## External Prerequisites

- The configured repository environment supplies the root `just` interface,
  pnpm dependencies, Node/TypeScript, Vitest, Playwright Chromium, and the
  designated local code-server runtime used by existing runtime proofs.
- Existing exact process and listener evidence depends on the repository's
  supported Linux host facilities, including `/proc`, loopback networking,
  process groups, and the configured non-root `vscode` user. Existing
  designated browser proofs use repository-local disposable fixtures and a
  local Chromium process.
- Issue #41 specifies no production access, hosted service, credential,
  unsupported hardware, destructive environment action, indefinite
  observation, or manual judgment prerequisite. Current GitHub state adds no
  issue comment or external dependency that changes that boundary.
