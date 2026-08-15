# Research Brief: BL-017: Stop a workbench without closing its project

## GitHub Issue
- **Issue:** #39
- **Title:** BL-017: Stop a workbench without closing its project
- **Work Item:** project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/

## Scope Classification
- **Scope Type:** issue

## Problem Statement

Issue #39 states that Ascend cannot release a selected project's runtime while
retaining that project's library registration. It requires an operation limited
to one selected Ascend-managed runtime that retains the project and reports
`Stopped` only after release is confirmed. The issue excludes project close,
project-file mutation, unrelated-process termination, peer-runtime effects,
automatic idle shutdown, restart, API-restart reconciliation, persisted process
handles, bulk operations, arbitrary-process adoption, and BL-018-and-later
behavior.

This is an issue-scoped research record. The following observations distinguish
current repository behavior from Issue #39 requirements; they do not select an
implementation, API, signal, timeout, library, test plan, or architecture
change.

## Acceptance Criteria

`gh issue view 39 --repo jsburckhardt/ascend --json number,title,body,labels,assignees,milestone`
returned the `ACCEPTANCE_CRITERIA_START` and `ACCEPTANCE_CRITERIA_END` markers
and exactly six unchecked checklist items. The six items below are copied
verbatim and retain their issue order. No Research-stage AC IDs are assigned.

<!-- ACCEPTANCE_CRITERIA_START -->

**Core**
- [ ] Stopping a selected running project succeeds only for that project’s Ascend-managed runtime. A successful result identifies the selected project, and a finite ownership audit confirms that its exact pre-stop runtime identity no longer exists, no process remains attributable as its owned descendant, and its listener accepts no connection. A request that does not resolve to a selected Ascend-managed runtime returns a documented non-success classification within a finite bound and leaves registered project metadata, public runtime states, declared peer and control identities, and declared project fixtures unchanged.
- [ ] A stop attempt provides a graceful shutdown opportunity bounded by a documented finite limit before any escalation. A controlled graceful case returns the documented successful classification without escalation. A controlled non-graceful case escalates only after that limit and returns the documented successful classification within a documented finite overall bound. A controlled escalation-failure case that cannot confirm release returns an explicit non-success classification within the same overall bound, does not report the project as `Stopped`, and leaves registered project metadata, declared peer runtime identity and readiness, unrelated controls, and declared project fixtures unchanged.
- [ ] After a confirmed stop, the selected project remains registered exactly once with its stable ID, display name, canonical path, and created-at value unchanged, and the public runtime state observed after that same stop result is `Stopped`.

**Edge Cases**
- [ ] Each repeated stop of the same already-stopped project completes within a documented finite bound with the same documented successful already-stopped or no-op classification, leaves the registered project metadata unchanged and the public state `Stopped`, creates or terminates no runtime identity, requires no restart, and leaves the declared project fixture unchanged.
- [ ] In a bounded two-project scenario with independently ready runtimes, stopping the selected runtime leaves the peer `Running` with the same pre-stop runtime identity and the same successful readiness or health observation, while a declared unrelated control process and listener retain their pre-stop identities and availability. Both projects’ registered metadata remains unchanged. Before-and-after evidence for declared finite fixtures of both projects uses a non-empty manifest schema fixed before execution and shows identical relative tree membership, file content digests, permission modes, and recorded timestamps for every fixture node.

**Verification**
- [ ] Finite, repeatable repository validation executes graceful stop, successful escalation, escalation that cannot confirm shutdown, a request with no selected Ascend-managed runtime, repeated already-stopped stop, two-ready-runtime isolation, metadata retention, and filesystem safety. Inspectable evidence records declared bounds, elapsed outcomes, and result classifications; the selected pre-stop ownership identity and its post-stop descendant/listener audit; unchanged peer and control identities and readiness; unchanged stable ID, display name, canonical path, and created-at values; `Stopped` only after confirmed release; and the before-and-after fixture manifests. A bounded inventory fixed before each scenario enumerates its runtime processes and listeners, controls, registration resources, and disposable fixtures. Assertions distinguish the product registration that must remain during the scenario from validation-owned temporary resources; after evidence capture, final teardown leaves no validation-owned temporary resource behind.

<!-- ACCEPTANCE_CRITERIA_END -->

## Repository Findings

### Current runtime ownership, identity, and termination behavior

- `apps/api/src/project-runtime-manager.ts` defines the current
  `ProjectRuntimeManager` interface. It exposes `register`, `start`,
  `reportPublicStates`, inspection/audit accessors, and global `shutdown`; it
  has no selected-project stop method. Entries are one manager-owned `Map`
  keyed by stable project ID and have `registered`, `starting`, `running`, or
  `failed` state. The manager's `ownership` index keys the exact
  PID/process-start-time/port tuple and retains the owning project ID and
  generation in memory.
- `start()` confirms the persisted project ID/canonical-path pair, coalesces
  only same-project starts, and reuses a running entry only after exact
  liveness plus the health contract. The running snapshot carries stable ID,
  PID, process-start identity, loopback URL/port, canonical path, stable route,
  opaque owner token, and timing for trusted in-process consumers. It is not
  persisted in the four-field project record.
- `apps/api/src/project-runtime-process.ts` is the existing exact cleanup
  boundary. `terminateGroup()` validates the root PID against its start time,
  targets the owned process group, waits through configured graceful and force
  periods, and returns an audit with `processAbsent`, `processGroupAbsent`,
  `listenerAbsent`, and `already-absent`, `graceful`, or `escalated` outcome.
  `loopbackListenerIsAbsent()` makes a bounded loopback connection attempt.
  The current audit shape reports root identity, process-group absence, and
  listener absence; it does not separately expose an owned-descendant
  attribution result.
- Existing termination is internal to failure handling and global shutdown.
  Readiness failure in `launchReadyRuntime()` terminates the owned process;
  failed reuse-health or false-liveness handling calls the manager's guarded
  `transitionRunningToFailed()` and terminates; a post-readiness exit records
  an audit; and `shutdown()` aborts all starting entries, terminates owned
  running/remaining records, awaits tracked completion/background tasks, and
  returns an aggregate `ok` or `failed` audit result. These are not a selected
  runtime-release operation.
- `apps/api/src/project-runtime-contract.ts` currently declares only twelve
  bounded runtime failure categories. Its public projection maps missing or
  `registered` entries to `Stopped`, `starting` to `Starting`, `running` to
  `Running`, and a retained failed entry to `Failed`. There is no
  selected-stop result or stop-specific public classification in this contract.

### Current routes, proxy, Project Home, registration, and close semantics

- `apps/api/src/routes/project-runtime-state.ts` provides only the read-only
  `GET /api/projects/runtime` projection. It loads registered projects,
  projects their manager state in project-list order, and returns each ID,
  public state, and a bounded category only for `Failed`; it does not perform
  a lifecycle action.
- `apps/api/src/routes/projects.ts` has list, registration, and
  `DELETE /api/projects/:id` routes. The DELETE route delegates to
  `ProjectCloseService.closeProject`; it does not access `projectRuntime`.
  `apps/api/src/project-close.ts` receives only a metadata repository, and
  `apps/api/src/project-persistence.ts` implements close as a serialized
  SQLite delete by stable ID. This is distinct from retaining a registration.
- `apps/web/src/App.tsx` renders per-project public runtime state plus Open and
  Close controls. Open navigates to the stable workbench route; Close opens the
  destructive registration-removal dialog. `apps/web/src/use-project-home.ts`
  owns only the close transport/reconciliation path and removes the closed ID
  from the rendered authoritative list after a confirmed close. There is no
  Stop control, selected-stop client transport, or selected-stop state/result
  rendering.
- `apps/api/src/workbench-proxy-manager.ts` resolves one stable route through
  persisted metadata, calls `projectRuntime.start`, and requires
  `ownsSnapshot(snapshot)` before deriving the trusted upstream. The proxy
  therefore starts or reuses a runtime during a workbench request, but it has
  no selected runtime-release call. This is a current start/route race surface
  relevant to the issue boundary.
- `apps/api/src/app.ts` creates one runtime manager and registers application
  close ordering as proxy shutdown, runtime-manager shutdown, registration
  close, then library close. `apps/api/src/routes/README.md` explicitly states
  that global application shutdown is the only exposed runtime shutdown path.
  `docs/project-runtime.md`, `docs/README.md`, and `apps/api/README.md` state
  that BL-016 added no Stop/Restart control; the API README also limits the
  existing DELETE route to stopped-project metadata and defers running/failed
  workbench close to BL-020.

### Current isolation, event, metadata, filesystem, and evidence surfaces

- The manager's guarded running-to-failed transition compares the exact entry
  object and generation, retains one failure, records one cleanup, and emits
  `runtime.health.changed`. It is used by reuse-health, liveness, and exit
  contenders. Current lifecycle events are serialized with the opaque project
  token, transition, elapsed value, and bounded classification; raw project
  paths, ports, commands, environments, credentials, and diagnostics are
  excluded from public reporting and structured lifecycle events.
- Public state is synchronous and read-only. `reportPublicStates()` reads the
  matching manager entry for each requested ID and does not launch, probe,
  terminate, audit, or emit. `apps/web/src/runtime-state.ts` and
  `apps/web/src/use-runtime-state.ts` require exact ordered reconciliation of
  all project IDs and show whole-list unavailability rather than inventing
  `Stopped`; the Home has no polling, stream, health probe, Stop, or Restart.
- Project registration persists exactly `id`, `name`, `canonicalPath`, and
  `createdAt`. `apps/api/src/project-registration.ts` canonicalizes and
  validates a readable allowed directory before writing metadata.
  `apps/api/src/project-persistence.ts` keeps the same four fields and
  deterministic `createdAt ASC, id ASC` list order. Runtime identity/state is
  memory-only.
- Existing filesystem safety evidence is available but is not selected-stop
  evidence. `apps/api/test/project-registration-fixture-helper.ts` snapshots
  fixture membership, type, modes, mtimes, file bytes, and symlink targets.
  `apps/api/test/project-close-non-mutation.test.ts` records before/after
  recursive manifests across close outcomes and asserts unchanged membership,
  bytes, permissions, and timestamps. The close test proves deletion of
  metadata need not mutate the project tree; it does not retain registration.
- BL-010 evidence is already finite and identity-aware. The executable matrix
  in `apps/api/test/project-runtime-acceptance.test.ts` requires concrete
  invocation/observation records and recursive manifest capture from
  `apps/api/test/project-runtime-evidence.ts`. The designated
  `project-runtime-designated.test.ts` records real PID/start identity,
  listener inode, health, manager-shutdown audit, unchanged fixture, and
  unrelated control process/listener survival. The independent
  `apps/api/src/cli/project-runtime-residual-audit.ts` rechecks the retained
  PID/start identity and listener inode. These current proofs exercise global
  manager shutdown, not a selected stop.
- BL-013 evidence establishes current project partitioning. Its test matrix
  (`apps/api/test/project-runtime-isolation-acceptance.test.ts`) executes the
  fixed 12 scenarios in `project-runtime-isolation-evidence.ts`, including
  interleaving, B-only failures, replacement, global shutdown, and shutdown
  race. That helper validates bounded monotonic timing and protected-value
  scans. `project-runtime-isolation-audit.ts` independently audits generated
  evidence, runtime identities/listeners, ten resource classes, fixture
  integrity, and unrelated-control survival. It does not provide a
  selected-stop scenario.
- BL-016 evidence protects the read-only projection, not a lifecycle control.
  `apps/api/src/runtime-state-evidence.ts` fixes ten projection/transition
  scenarios and rejects projection dependency calls, retained-failure-to-
  `Stopped` substitution, public-state disagreement, unsafe disclosure, and
  inconsistent events. `apps/api/test/runtime-state-matrix.test.ts` executes
  source and controlled-mutation checks against those guards. No existing
  BL-016 helper or route defines selected stop behavior.
- The root `justfile` exposes `verify-focused` and `verify`, as well as
  `verify-project-runtime`, `verify-project-runtime-isolation`, and
  `verify-runtime-state`. These existing recipes are the repository command
  interface; Research does not prescribe a new validation command.

## Constraints

- **Issue #39 requirements, not observed implementation:** release applies to
  one selected Ascend-managed runtime, retains registration metadata, reports
  `Stopped` only after confirmed release, and has bounded graceful/escalated
  behavior with explicit non-success when confirmation is unavailable.
- **Manager ownership:** `CORE-COMPONENT-260808-runtime-lifecycle-error-handling`
  requires one internal runtime-management boundary, stable-ID-keyed entries,
  exact ownership cleanup, project isolation, bounded lifecycle handling, and
  memory-only runtime identities. The proxy remains a consumer of an exact
  manager-owned running snapshot rather than a process owner.
- **Public state and failure:** the public vocabulary is exactly `Stopped`,
  `Starting`, `Running`, and `Failed`. A retained failed entry must remain
  `Failed`, and unavailable reporting must not substitute another state.
- **Metadata and filesystem:** SQLite metadata remains exactly stable ID,
  display name, canonical path, and created-at value. Filesystem-path safety
  prohibits project-content mutation, and selected runtime release is distinct
  from the metadata-deleting close route.
- **Concurrency and peer isolation:** same-project starts are single-flight;
  different stable IDs must not share entries, promises, snapshots, failures,
  cleanup results, routes, or contexts. Selected-stop coordination is absent.
- **Safe disclosure:** public reports, browser surfaces, logs, and public
  evidence cannot disclose raw paths, internal authorities/ports, commands,
  environments, credentials, secrets, source, terminal content, or diagnostics.
- **Existing operational context, not a BL-017 requirement:** the coordinator
  reported one transient BL-001 fake code-server readiness timeout during
  governed pre-flight. Its focused test passed 6/6; the governed boot rerun
  returned `status: ok`, readiness `ready`, duration 458119 ms, a 610000 ms
  checks timeout, test-backed scaffolding, and no development servers running.
- **Scope boundary:** project close, filesystem changes, unrelated-process
  release, auto-idle, restart, API-restart reconciliation, persisted handles,
  bulk operations, arbitrary-process adoption, and BL-018+ remain excluded.

## Relevant ADRs and Core-Components

- **ADR-260808-typescript-monorepo** establishes one host code-server runtime
  per active project, SQLite/Drizzle metadata, Fastify API ownership, and React
  Project Home context.
- **ADR-260812-in-process-workbench-reverse-proxy** and
  **CORE-COMPONENT-260812-stable-workbench-proxy** separate stable transport
  from process ownership; the proxy consumes a persisted project and exact
  manager-owned snapshot, and it shuts down before the runtime manager.
- **ADR-260815-public-runtime-state-projection** establishes the separate
  read-only four-state endpoint and records Stop/Restart controls as deferred.
  It keeps volatile state outside the four-field project payload.
- **CORE-COMPONENT-260808-runtime-lifecycle-error-handling** governs central
  ownership, four-state reporting, retained failures, exact ownership, bounded
  manager shutdown, one runtime per project, and peer isolation. Its current
  interface/rules do not specify a selected-project stop request or result.
- **CORE-COMPONENT-260808-structured-runtime-logging** requires catalogued safe
  lifecycle events with opaque-token correlation and protected-data exclusion.
- **CORE-COMPONENT-260808-filesystem-path-safety** requires canonical paths and
  non-destructive project close. **CORE-COMPONENT-260810-sqlite-persistence-lifecycle**
  requires closeable SQLite ownership, committed migrations, and exact cleanup.
- **CORE-COMPONENT-260808-host-process-environment** constrains direct non-root
  process launch, direct argv, canonical working directories, loopback binding,
  and deterministic environment handling.
- `project/architecture/ADR/DECISION-LOG.md` records applicable decisions 27-33
  (host workbench/metadata), 53-57 (runtime cleanup/diagnostics), 90-94
  (stable-ID and snapshot attribution), and 95-107 (public state/event rules).

Existing global architecture governs ownership, cleanup, state, logging,
storage, filesystem, and proxy constraints. It does not declare a selected-stop
product contract; Research makes no determination about future architecture.

## Risks and Open Questions

- **Release confirmation:** current cleanup returns root/group/listener audit
  fields and graceful/escalated outcomes, but selected-stop confirmation and
  its non-success result are absent.
- **Truthful `Stopped`:** missing/registered entries project as `Stopped`, while
  retained failures project as `Failed`; no selected-stop path defines when an
  entry can be absent without reporting release prematurely.
- **Failure retention and classification:** current categories describe start,
  health, cancellation, and manager shutdown, not selected-stop failure.
- **Idempotency:** global shutdown memoizes one result; selected already-stopped
  and no-op behavior is undefined at the manager, route, and client boundaries.
- **Lifecycle races:** start, reuse-health, exit, proxy acquisition, and global
  shutdown have existing boundaries; selected-stop ordering with them is absent.
- **Cross-project and control isolation:** stable-ID partitioning protects
  current routing, but no selected-stop operation demonstrates peer/control
  identity, readiness, and listener preservation.
- **Metadata and filesystem integrity:** close deletes registration; adjacent
  manifest proofs show non-mutation, but selected-stop metadata/fixture proof
  does not yet exist.
- **Fake versus designated-host evidence:** BL-010/BL-013 use fakes, designated
  episodes, and residual audits, but their release events are shutdown/failure,
  not selected stop; descendant-attribution coverage remains unresolved.
- **NFR-015 and disclosure:** current event/state evidence is safe and aligned,
  but no selected-stop transition/event relationship exists to inspect.
- **Deferred boundaries:** close/delete, restart, persistence/reconciliation,
  multi-runtime operations, user-process adoption, BL-018, and BL-020 remain
  outside Issue #39.
