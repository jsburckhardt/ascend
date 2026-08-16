# Research Brief: BL-019: Reconcile workbench runtimes after API restart

## GitHub Issue
- **Issue:** #43
- **Title:** BL-019: Reconcile workbench runtimes after API restart
- **Work Item:** `project/work-items/43-bl-019-reconcile-workbench-runtimes-after-api-restart/`
- **Branch supplied by coordinator:** `feat/43-reconcile-workbench-runtimes-after-api-restart`
- **Base/main merge supplied by coordinator:** `4e2b48b8a54204d68617b40e2dd6de302676f550`

## Scope Classification
- **Scope Type:** issue

## Problem Statement

Ascend persists registered projects but deliberately keeps runtime identities, ownership records, process handles, listeners, lifecycle entries, and public runtime state in a `ProjectRuntimeManager` instance. A replacement API receives the durable project library but not the previous manager runtime knowledge. This issue concerns API-process restart while registered workbenches can remain alive, requiring a replacement API to report and control only runtimes it can establish as exactly attributable without starting an unintended replacement.

This research records current boundaries and factual gaps only. It does not choose a persistence, ownership-adoption, reconciliation, route, event, classification, or validation design.

## Acceptance Criteria

`gh issue view 43 --repo jsburckhardt/ascend --json number,title,body,labels,assignees,milestone,url` returned one `ACCEPTANCE_CRITERIA_START`/`ACCEPTANCE_CRITERIA_END` marker pair and exactly 22 unchecked Markdown checklist criteria. They are preserved below verbatim and in issue order. Research assigns no AC IDs.

<!-- ACCEPTANCE_CRITERIA_START -->

**Core**
- [ ] After a controlled abrupt API-process exit leaves exactly two registered, ready workbench processes and their loopback listeners alive, a replacement API process settles reconciliation within 15,000 ms. Both projects are then reported `Running` against their unchanged pre-restart complete runtime identities; reconciliation starts, stops, or restarts no workbench, and exactly one managed runtime and listener are attributable to each project.
- [ ] Fresh navigation through each unchanged stable workbench route after reconciliation reaches the same ready pre-restart runtime for that project. All browser-visible URLs, responses, events, and public evidence captured by the finite validation scenarios expose no internal authority or runtime identity.
- [ ] During the finite validation scenarios, a registered project whose reconciliation is still pending reports `Starting`, a positively absent runtime reports `Stopped`, an exactly attributed ready runtime reports `Running`, and a surviving candidate whose ownership or readiness remains inconclusive at 15,000 ms reports `Failed` with a stable documented machine-inspectable reconciliation classification. No observation exposes a fifth public state, substitutes a false state, or reports `Running` from process existence alone.
- [ ] Selected Stop applied to a reconciled runtime releases only its exact attributed process identity, owned descendants, and listener within the existing selected-Stop ceiling; the project then reports `Stopped`, remains registered, and its peer remains `Running` with the same identity and route.
- [ ] Explicit Restart applied after successful reconciliation retains the delivered BL-018 eligibility and bounded outcomes, confirms the reconciled prior generation absent before one replacement becomes ready, and keeps the stable route unchanged. Reconciliation itself never invokes Restart or replaces a healthy surviving generation.
- [ ] Three sequential controlled API-process restarts over the same two surviving runtimes each settle within 15,000 ms without changing either runtime identity, duplicating ownership, accumulating listeners, or allowing an earlier reconciliation outcome to affect a later one.
- [ ] Successful, failed, repeated, and interrupted reconciliation leave every project registered exactly once with stable ID, display name, canonical path, and created-at value unchanged. In scenarios that declare no in-project writer, finite before-and-after manifests show unchanged file membership, content digests, permission modes, and recorded timestamps.
- [ ] Reconciliation events, public state, lifecycle-control outcomes, and retained public evidence agree and use only stable documented machine-inspectable classifications. Reconciliation emits no start, stop, or restart success for an action it did not perform, and all finite scenario captures exclude raw project paths, process identities, internal authorities, commands, environment values, credentials, terminal content, source content, stacks, and raw errors.

**Edge Cases**
- [ ] A replacement API process with zero registered projects settles reconciliation within 15,000 ms without creating or signalling a workbench resource. A registered project whose prior runtime is positively established absent settles `Stopped` within the same bound; one later normal workbench acquisition settles within the delivered acquisition ceiling and reaches exactly one ready runtime and listener under the delivered start contract.
- [ ] A surviving process or listener that cannot be attributed to one registered project with exact delivered ownership and readiness evidence settles `Failed` within 15,000 ms with a stable documented machine-inspectable reconciliation classification; it is not claimed, signalled, routed, or reported `Running`, and opening the project returns that classification within the delivered acquisition ceiling without launching a potentially duplicate generation while the ambiguity remains.
- [ ] If a candidate process exits, changes readiness, or loses its listener while reconciliation is in progress, the result within 15,000 ms reflects the completed exact observation, installs no stale `Running` outcome, and leaves no duplicate or orphan workbench process or listener attributable to that project.
- [ ] Deterministic controlled evidence representing stale or recycled process identity, a replaced listener, mismatched project evidence, and unrelated control processes or listeners cannot authorize attribution or signalling of a different process. Every control retains its declared identity and availability without requiring PID exhaustion, privileged facilities, or indefinite waiting.
- [ ] In the healthy scenario, exactly eight concurrent workbench acquisitions for one project held across the reconciliation boundary all settle within the existing workbench-acquisition ceiling against the same surviving runtime and listener. In the inconclusive scenario, all eight return the same stable documented machine-inspectable reconciliation classification within that ceiling and launch no runtime.
- [ ] Selected Stop or explicit Restart requested while that project reports reconciliation `Starting` returns a stable documented machine-inspectable pre-acceptance classification within the applicable delivered operation ceiling, agrees with the unchanged public state and absence of a lifecycle event for an unaccepted action, and cannot produce duplicate ownership or terminate a generation. Other projects remain independently operable.
- [ ] Delayed or reordered reconciliation, readiness, route-acquisition, process-exit, and lifecycle observations from an earlier attempt cannot overwrite, terminate, route to, emit a terminal outcome for, or change the state of the currently attributed generation.
- [ ] In a bounded two-project matrix, successful reconciliation of one project and failed reconciliation of the other preserve separate identities, listeners, routes, registration, public outcomes, events, and cleanup; neither result changes the peer.
- [ ] If the replacement API process shuts down or is lost during reconciliation, accepted operations cease within 15,000 ms without claiming unobserved absence or signalling unrelated resources, correctly owned surviving workbenches remain alive and unchanged, and a later replacement API process can reconcile them without being affected by the abandoned attempt.

**Verification**
- [ ] Finite repeatable repository validation executes healthy two-project recovery, zero projects, positively absent runtime, three sequential API restarts, inconclusive and mismatched ownership, process exit and readiness loss during reconciliation, deterministic stale-identity and replaced-listener cases, eight concurrent acquisitions in healthy and inconclusive scenarios, concurrent Stop and Restart, delayed settlements, mixed peer outcomes, interrupted reconciliation, registration retention, filesystem integrity, stable routing, event and privacy checks, and final cleanup. Each scenario produces inspectable pass or fail evidence against the ceilings stated above before its first action.
- [ ] Retained evidence correlates pre-restart and reconciled runtime identities, exact ownership observations, readiness and listener observations, stable-route results, public states, lifecycle-control outcomes, events, registration values, fixture manifests, peer and control identities, elapsed ceilings, and cleanup. Correctly owned survivors remain present until an explicit validation teardown; after evidence capture, separate teardown and residual audits report zero validation-owned API processes, workbench processes, attributable descendants, listeners, active requests, and disposable fixtures.
- [ ] Affected user, runtime, operational, recovery, routing, privacy, and validation documentation records API-restart behavior, bounded outcomes, state and lifecycle-control behavior, ownership limits, evidence, cleanup, and repeatable repository commands while explicitly preserving the BL-020 through BL-022 boundaries.
- [ ] The canonical full repository validation completes successfully, and all BL-010 through BL-018 runtime, routing, navigation, isolation, continuity, state, performance, Stop, and Restart regression gates remain successful.
- [ ] All required validation uses repository-local fixtures and commands and requires no production access, hosted service, unavailable credential, unsupported hardware, destructive environment action, indefinite observation, or manual judgment.

<!-- ACCEPTANCE_CRITERIA_END -->

## Repository Findings

### Durable registration is distinct from runtime authority

- `apps/api/src/db/schema.ts`, `apps/api/src/project-persistence.ts`, and `apps/api/src/project-library.ts` persist and reload only `id`, `name`, `canonicalPath`, and `createdAt`, ordered by `createdAt ASC, id ASC`. The schema has no runtime identity, process-start time, port, listener, state, route snapshot, owner token, or release marker.
- `apps/api/test/api-lifecycle.test.ts` proves a clean controller stop followed by a fresh controller can reopen SQLite and list the same registered project. It does not start a workbench, abruptly lose the API, retain a child workbench, or reconcile a child after API replacement.
- `apps/api/src/app.ts` constructs a new `ProjectRuntimeManager` and `WorkbenchProxyManager` each time the application is built. Graceful Fastify close shuts down proxy, manager, registration, and library in that order. `apps/api/src/server.ts` routes `SIGINT` and `SIGTERM` through the controller and has no `SIGKILL` handler.

### Current-process manager state and child-process boundaries

- `apps/api/src/project-runtime-manager.ts` keeps entries, exact ownership, cleanup outcomes, in-flight starts/stops/restarts, pending admissions, quarantine, and generations in instance-local maps. Entries are keyed by stable project ID; ownership is keyed by `pid:processStartTime:port` and carries an in-memory generation.
- Trusted snapshots contain project ID, state, PID, process-start time, loopback URL and port, canonical path, stable route, owner token, and timing. They are not persisted. A new manager therefore has registrations but no old entry, snapshot, exact ownership, released marker, retained failure, or generation.
- `apps/api/src/project-runtime-process.ts` launches code-server detached and calls `child.unref()`. A controlled abrupt exit that bypasses the controller close hook invokes no manager shutdown in this code path. Whether an individual workbench survives must be observed in a controlled scenario; registration does not prove survival.

### State, release, failure, identity, and shutdown

- `apps/api/src/project-runtime-contract.ts` fixes public state to `Stopped`, `Starting`, `Running`, and `Failed`. `reportPublicStates()` synchronously reads the manager map; it does not inspect a PID, probe a port, start, emit, or clean up. Missing/`registered` entries are `Stopped`; `starting`/`restarting` are `Starting`; `running`/`stopping` are `Running`; retained failures are `Failed` with an existing bounded category.
- A released marker is the memory-only `registered { released: true }` entry installed only by confirmed selected Stop. A retained failure is a memory-only `failed` entry. Neither reaches a new manager. `docs/project-runtime.md` and `apps/api/src/routes/README.md` state that a persisted project without a manager entry, including after API restart before BL-019, is `runtime_not_managed` for Stop rather than `already-stopped`.
- `Running` is gated by loopback `/healthz/`: HTTP 200 plus `alive` or `expired`. Process existence alone is not a running observation.
- Existing exact identity safety is current-manager-only: process start time prevents PID reuse, termination revalidates it before group signalling, and confirmation requires root absence, owned process-group absence, and listener absence. The descendant claim is limited to the recorded process group, not a process that has left that group.
- Manager shutdown cancels/sweeps current-manager operations and exact records. Application startup has no recovery import or candidate scan for prior manager processes and listeners.

### Stable route, acquisition, isolation, and stale observations

- `apps/api/src/routes/workbench.ts` owns `/projects/{projectId}/workbench/`. `apps/api/src/workbench-proxy-manager.ts` looks up the persisted project, calls `projectRuntime.start()`, requires the exact `ownsSnapshot()` object, and checks ID, canonical path, stable route, owner token, loopback protocol, and port before forwarding. It never accepts a client target.
- The stable route can be rebuilt from a persisted ID, but its upstream target is an exact running snapshot in the current manager. With no recovered entry, ordinary acquisition follows `start()`; current code has no pending-reconciliation or survivor-attribution branch to prevent a new launch while an old child may be alive.
- Same-project `start()` calls coalesce within one manager and later requests reuse only a health-checked exact snapshot. Project-keyed maps, generation checks, Restart admissions, and quarantine prevent stale same-process work from mutating successors. A replacement manager has no persistent predecessor record for those checks.
- Proxy HTTP/stream/socket inventories are per-project, close before manager shutdown, and expose only bounded classifications and opaque project tokens. Browser-visible responses and committed evidence exclude loopback authorities and runtime identities.

### Prior delivery evidence, documentation, and history

- BL-017 records under `project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/` establish exact Stop ownership, process-group/listener audit, registration and filesystem retention, peer isolation, a 31-scenario matrix, a designated real-host episode, and a residual audit. Its verification record reports the root `just verify` gate passed.
- BL-018 records under `project/work-items/41-bl-018-restart-a-running-or-failed-workbench/` establish explicit current-process Restart, release-before-replacement, health-gated replacement, admission/quarantine safety, stale-generation guards, a 64-scenario matrix, a three-generation real-host episode, and a separate residual audit. Its verify record reports the root gate passed and preserves BL-019 as out of scope.
- Both prior work items include proof corrections for ownership, late settlements, collision cleanup, global Close-dialog admission, retained-evidence claims, and teardown. These are contract-level proof constraints, not optional test detail.
- History contains the BL-010 through BL-018 runtime/proxy/state/Stop/Restart deliveries, including `72ab072`, `87ae194`, `c42a9c2`, `3038ee9`, and `e4e8dc1`, but no API-restart reconciliation delivery.
- Root `justfile` exposes `verify-focused`, `verify`, focused runtime/route/state/Stop/Restart gates, designated proofs, and residual audits. It is the configured validation interface.

### Deterministic repository-local proof: current capability and factual gap

| Required observation | Current capability | Factual gap |
|---|---|---|
| Real API restart | Graceful controller recreation and real compiled-API process proofs exist. | No identified proof abruptly loses an API while ready workbenches survive, starts a replacement API, and reconciles them. |
| Surviving exact identity | BL-017/BL-018 designated proofs and residual audits record PID/start-time, group members, and listeners. | No replacement-manager handoff correlates a pre-loss identity to a live candidate. |
| Listener reachability/readiness | Bounded loopback health, listener absence audits, and stable-route proof exist. | No proof joins a surviving listener/readiness observation to one registered project after API replacement. |
| Stable-route recovery | Stable ID route and exact current-manager snapshot routing exist; BL-018 proves explicit replacement routing. | A new manager calls `start()` with no survivor knowledge, so duplicate-free recovery is unproven. |
| No duplicate generation | Current-manager coalescing, claims, admissions, quarantine, and generation checks exist. | No cross-manager ownership/reconciliation boundary exists. |
| Privacy/public evidence | Existing contracts use bounded categories/tokens and protected-value scans. | Reconciliation classifications, events, route outcomes, and evidence correlations do not exist. |
| Stale/foreign refusal | Start-time checks, exact snapshot ownership, canonical-path checks, and unrelated-control cases exist. | A replacement manager lacks prior evidence to distinguish legitimate survivors from stale, recycled, mismatched, or foreign controls. |
| Zero residuals | BL-017/BL-018 proofs and residual audits establish exact owned cleanup within their episodes. | No recovery episode inventories API loss, retained survivors, replacement API, reconciliation, and final teardown together. |

## Constraints

- **Persisted registration is bounded:** delivered SQLite schema, payload validators, and list contract remain exactly the four project fields; existing architecture keeps runtime identities, ports, handles, and state in memory.
- **One authority and four states:** only the manager projects public state; `Running` requires readiness; no fifth public state is available.
- **Exact ownership before control:** Stop/Restart target only current-manager exact identities and bounded process-group/listener audits. Unattributable processes/listeners cannot be signalled under delivered contracts.
- **Stable proxy and privacy:** targets come only from persisted project plus exact manager snapshot; public surfaces must exclude paths, identities, ports/authorities, commands, environment, credentials, terminal/source content, stacks, and raw errors.
- **Registration, filesystem, and peer isolation:** projects stay user-owned; registration and fixtures remain unchanged; stable-ID partitions, unrelated controls, and peers must remain independent.
- **Delivered Stop/Restart are not reconciliation:** Stop distinguishes released-in-this-manager from absent-in-this-manager; Restart is explicit and cannot substitute for reconciliation. Current route/event/failure/client vocabularies are closed surfaces.
- **Scope:** automatic recovery beyond API restart, arbitrary process adoption, multi-host operation, scheduling, quotas, bulk lifecycle actions, and BL-020 through BL-022 remain out of scope.
- **Operations and pipeline:** root `justfile` is the validation surface. The coordinator reported that argument-bearing lifecycle-hook invocation is unavailable and must not be represented as successful. Research invoked no lifecycle hook.

## Relevant ADRs and Core-Components

### ADRs

- **ADR-260808-typescript-monorepo** - host-native code-server, Fastify, and SQLite foundation.
- **ADR-260812-in-process-workbench-reverse-proxy** - application-owned stable HTTP/WebSocket routing, exact snapshot target resolution, privacy, and shutdown ordering.
- **ADR-260815-public-runtime-state-projection** - manager-only four-state projection and explicit BL-019 deferral.
- **ADR-260815-selected-runtime-stop-control** - current-manager Stop, confirmed release, released-marker distinction, and explicit no-managed-runtime behaviour after API restart before BL-019.
- **ADR-260815-termination-sequencer-boundary** - exact identity, process-group attribution ceiling, listener audit, monotonic deadlines, cancellation, and no inference from incomplete observations.
- **ADR-260815-explicit-workbench-restart-control** - explicit current-process Restart, exact release gate, generation/admission safety, and no automatic recovery or BL-019 substitution.
- **ADR-260815-per-project-lifecycle-activation** - per-project truthful browser activation without backend reconciliation.

### Core-components

- **CORE-COMPONENT-260808-runtime-lifecycle-error-handling** - sole manager owner, memory-only identities, health-gated state, exact-generation guards, peer isolation, retained uncertainty, and no automatic recovery loop.
- **CORE-COMPONENT-260812-stable-workbench-proxy** - stable route, exact snapshot verification, bounded failures, privacy, and proxy cleanup.
- **CORE-COMPONENT-260808-structured-runtime-logging** - bounded lifecycle catalog, opaque correlation, and protected-data exclusion.
- **CORE-COMPONENT-260808-filesystem-path-safety** - canonical paths and non-destructive registration/filesystem lifecycle behaviour.
- **CORE-COMPONENT-260808-host-process-environment** - direct non-root host launch, loopback binding, deterministic environment, and argv arrays.
- **CORE-COMPONENT-260810-sqlite-persistence-lifecycle**, **CORE-COMPONENT-260806-project-command-interface**, and **CORE-COMPONENT-260808-development-standards** - explicit SQLite lifecycle, root `justfile`, automated validation, and documentation maintenance.

`project/architecture/ADR/DECISION-LOG.md` records the applicable decisions: 27-33 (host workbench/metadata), 53-57 (memory-only runtime ownership), 58-74 and 90-94 (proxy/snapshot attribution), 95-107 (state), 108-153 (Stop/termination), and 154-236 (Restart/admissions/quarantine/residual claims).

## Risks and Open Questions

- **Cross-process authority is unresolved:** the replacement API has no durable trusted link from a registered project to a surviving PID/start-time/listener identity; registration alone is deliberately insufficient.
- **Ambiguous candidates have no current classification:** there is no reconciliation outcome for a live but unattributable, unreadied, mismatched, recycled, or replaced-listener candidate.
- **Current missing-entry behaviour is not positive absence:** projection maps missing entries to `Stopped`, while Stop and Restart classify the same persisted project as no-managed-runtime. The issue distinguishes positive absence from unknown survivor state, but a fresh manager holds no fact to decide between them.
- **The recovery seam can duplicate a generation:** current proxy acquisition correctly calls `start()` from persisted lookup, but has no surviving-runtime knowledge or pending-reconciliation outcome.
- **Lifecycle conflicts are unmodelled:** Stop/Restart currently reject known current-manager transitions; no route/browser/event contract states what happens while reconciliation is `Starting`.
- **Stale order crosses a manager boundary:** current exact-entry/generation guards are in-process only; no persisted attempt epoch relates late abandoned reconciliation work to a later manager.
- **Proof ownership differs from graceful cleanup:** current tests intentionally clean down API/runtime resources. A recovery episode needs evidence for deliberate survivor retention, exact candidate/control isolation, replacement API/proxy behaviour, and final teardown without treating interruption as absence.
- **Plan decision threshold:** existing ADRs explicitly defer BL-019. If any issue criterion changes the memory-only identity boundary, durable recovery evidence, public failure/event vocabulary, lifecycle admission, or stable-proxy target authority, Plan must make that decision in the applicable ADR/core-component artifact and update `DECISION-LOG.md` before implementation. Research makes no decision or artifact proposal.
- **BL-020 through BL-022 remain boundaries:** reconciliation must not silently become running/failed Close, later lifecycle functionality, or multi-host orchestration.
