# ADR-260815-public-runtime-state-projection: Report Public Runtime State Through a Read-Only Projection

## Status

Accepted

## Context

FR-017 and AC-023 require Ascend to expose an accurate `Stopped`, `Starting`, `Running`, or `Failed` state for every registered project. Issue #37 must make that state visible across the runtime boundary, the API, and Project Home without disagreement, and must keep the NFR-015 event stream consistent with it.

The delivered system has the state but not the surface. `ProjectRuntimeManager` already holds project-local `registered`, `starting`, `running`, and `failed` entries keyed by stable project ID, gates `running` behind the documented `/healthz/` readiness contract, and retains a bounded typed failure after a failed launch, a failed reuse-health observation, or a post-readiness exit. Nothing outside the in-process runtime and proxy owners can read it: `GET /api/projects` returns exactly `id`, `name`, `canonicalPath`, and `createdAt`, and both the Fastify route and the web client reject any additional project field. Project Home renders name, canonical path, Open, and Close only.

Three properties constrain any new surface. Runtime identity, ports, handles, and lifecycle state are memory-only and must never join the four-field SQLite project record. The runtime manager must remain the sole process and lifecycle owner, so a second component must not derive state from process liveness, ports, or its own probes. Public payloads must not leak canonical paths, internal authorities, ports, commands, environment values, credentials, or unbounded diagnostics.

Issue #37 reports observed outcomes only. Stop and restart operations, automatic recovery, API-restart reconciliation, background or distributed health monitoring, additional states, and historical dashboards remain out of scope.

## Decision

Expose public runtime state as a read-only projection of runtime-manager memory.

Add a public four-value vocabulary — `Stopped`, `Starting`, `Running`, `Failed` — to the runtime contract, distinct from the internal lowercase entry states. Map a missing entry and the internal `registered` entry to `Stopped`, `starting` to `Starting`, `running` to `Running`, and `failed` to `Failed`, so the non-public `registered` state never reaches a public surface and a retained failure is never reported as `Stopped`.

Make `ProjectRuntimeManager` the single authority. It exposes `reportPublicStates(projectIds)`, which builds every requested report in one synchronous pass over its own entry map and returns frozen `{ projectId, state, failureCategory? }` records. `failureCategory` is present only for `Failed` and carries only the existing bounded `RuntimeFailureCategory`; no diagnostics, PID, port, authority, canonical path, or message text is projected. No caller derives state from process liveness, ports, snapshots, or its own health probe.

Make the manager the single owner of the `running` to `failed` transition as well. Observed false liveness, a failed health observation, and process-exit settlement race for the same entry, so all three route through one guarded compare-and-set transition on the exact installed entry and generation. Exactly one contender installs the failed entry, retains one bounded category, records one cleanup audit, and emits one `runtime.health.changed`; the others surface that retained failure without mutating, terminating, auditing, or emitting again. This keeps the reported state, its category, and the NFR-015 stream single-valued under concurrency without introducing retry or background health work.

Serve that projection from a new read-only endpoint, `GET /api/projects/runtime`, owned by its own route plugin and returning `{ runtimes: [...] }` for every registered project in the existing project order. The four-field project payload of `GET /api/projects` and its server and client validators stay exactly as they are, so persisted metadata and volatile runtime state remain separate contracts.

Refresh on demand, bound to the authoritative project list. Each successful project-list load produces one list revision carrying its exact ordered project identifiers. The runtime-state controller issues no request until it holds a revision, issues exactly one request per revision, and issues exactly one further request when the user activates Retry for the current revision. It never polls on a timer, never opens a stream, and never issues its own health check.

Reconcile every response against the revision that requested it. A response whose identifiers are missing, extra, duplicated, or reordered relative to that revision is projection unavailability, not partial truth; Project Home then reports an explicit unavailable status distinct from the four states instead of rendering some cards, substituting `Stopped`, or attaching a stale settlement to a later revision.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Add a `runtimeState` field to the project payload | One request; no new endpoint | Breaks the exact four-field project contract on server and client, mixes volatile runtime state with persisted metadata, and invalidates existing list, schema-minimization, and documentation evidence | The persisted four-field project boundary is a delivered contract that this reporting issue must not change |
| Add a second array to the `GET /api/projects` response body | Keeps one round trip | Still changes the list response contract and couples state freshness to list caching and reconciliation | State reads and metadata reads have different lifetimes and failure modes |
| Push state over WebSocket or server-sent events | Live transitions without refresh | Adds a streaming surface, connection lifecycle, and reconnect semantics beyond a reporting issue | Issue #37 reports observed outcomes; a push channel is unjustified scope |
| Derive state in the route or web client from process or proxy signals | No manager change | Creates a second lifecycle authority, allows process existence to imply readiness, and permits surfaces to disagree | The runtime manager must stay the sole owner of lifecycle truth |
| Persist runtime state with project metadata | Survives API restart | Contradicts the memory-only runtime boundary and requires restart reconciliation that is explicitly out of scope | Persisted runtime identity remains a future architecture concern |
| Poll a background health loop and publish results | Detects failures without user action | Adds background or distributed health monitoring excluded by the issue | Reporting is limited to outcomes the runtime boundary already observes |
| Render whichever rows a projection response happens to contain | Shows partial information during list churn | Lets Project Home disagree with the authoritative list and invites a `Stopped` substitution for absent rows | An unreconcilable response is unavailability, not partial truth |

## Consequences

### Positive
- One authority produces every public state, so the runtime boundary, API, and Project Home cannot disagree without an intervening lifecycle outcome.
- The persisted four-field project contract, its validators, and its documentation remain unchanged.
- A retained typed failure is reported as `Failed` instead of being erased by entry absence.
- Racing false-liveness, health, and exit contenders produce one state, one category, one cleanup audit, and one event.
- Public disclosure stays inside the existing bounded failure-category vocabulary.

### Negative
- Project Home performs a second request and must render an explicit unavailable status when that request fails.
- Without polling, a transient `Starting` may not be observed by a user who does not refresh.
- A project registered or closed between the two observations invalidates that revision's projection and shows unavailability until the next list revision.
- A new public endpoint must be kept aligned with the runtime contract whenever lifecycle states change.

### Neutral
- The runtime manager remains the sole process owner; the proxy and navigation shell are unchanged.
- Stop and restart controls, automatic recovery, restart reconciliation, background health checks, extra states, and dashboards remain deferred by this decision.
- Amended 2026-08-15: the stop-control portion of that deferral is spent by [ADR-260815-selected-runtime-stop-control](./ADR-260815-selected-runtime-stop-control.md), which delivers a selected single-project stop, adds the internal `stopping` entry state projected as `Running`, adds a separate lifecycle transition-target vocabulary whose terminal `stopped` target maps to public `Stopped` without becoming an installable entry or snapshot state, and permits exactly one additional on-demand runtime-state request per settled stop. The four-value public vocabulary, the single projection authority, the one-synchronous-pass contract, and the no-polling rule of this decision are unchanged, and restart, automatic recovery, restart reconciliation, persisted runtime state, background health monitoring, extra public states, and dashboards remain deferred.
- Amended 2026-08-15: the restart portion of that deferral is spent by [ADR-260815-explicit-workbench-restart-control](./ADR-260815-explicit-workbench-restart-control.md), which delivers one explicit selected restart of a running or current-process retained-failed project, adds the internal `restarting` entry state projected as `Starting` for the whole operation, adds the matching `restarting` lifecycle transition target mapped to `Starting`, adds the three NFR-015 restart event names, and permits exactly one additional on-demand runtime-state request per settled successful restart. A restart never installs a released `registered` entry between generations, so no transient `Stopped` is ever projected, and `Running` is still reported only after the delivered health-gated readiness contract. The four-value public vocabulary, the single projection authority, the one-synchronous-pass contract, and the no-polling rule of this decision are unchanged, and automatic recovery, API-restart reconciliation (BL-019), running-or-failed project close (BL-020), persisted runtime state, background health monitoring, extra public states, and dashboards remain deferred.
- Runtime identity, ports, and handles remain memory-only; no schema or migration change is required.
- Amended 2026-08-15: the API-restart reconciliation portion of that deferral is spent by [ADR-260815-api-restart-runtime-reconciliation](./ADR-260815-api-restart-runtime-reconciliation.md), which adds the internal `reconciling` entry state projected as `Starting`, the matching `reconciling` lifecycle transition target, and four bounded reconciliation event names whose targets map to `Starting`, `Running`, `Stopped`, and `Failed` under the unchanged agreement check. Every registered project now holds an entry from API startup, so `Stopped` is reported only from a positive absence observation rather than from entry absence, and one new bounded failure category reports an unresolved reconciliation as `Failed`. The four-value public vocabulary, the single projection authority, the one-synchronous-pass contract, and the no-polling rule are unchanged, and BL-020 running-or-failed close, BL-021, BL-022, automatic recovery beyond one reconciliation, persisted runtime state, background health monitoring, extra public states, and dashboards remain deferred.
- Amended 2026-08-15 (revision 2 of the BL-019 plan): reconciliation is a required capability of the runtime-management boundary and is invoked unconditionally at startup, so this projection can never be served from a boundary that silently skipped it. One limit of the projection is recorded explicitly: a `Running` value for an **adopted** runtime is only as fresh as the last on-demand observation, because an adopted process has no automatic death observation and this issue adds no background monitor. The projection remains synchronous, read-only, and four-valued; the correction happens on the next acquisition, selected stop, or explicit restart and is published through those paths' own events, never as a reconciliation event.

## Related Issues

- [#37](https://github.com/jsburckhardt/ascend/issues/37)

## References

- [TypeScript monorepo and host workbench stack](./ADR-260808-typescript-monorepo.md)
- [In-process stable workbench reverse proxy](./ADR-260812-in-process-workbench-reverse-proxy.md)
- [Separate browser navigation shell from workbench transport](./ADR-260812-browser-navigation-shell.md)
- [Release one selected workbench runtime through a manager-owned stop control](./ADR-260815-selected-runtime-stop-control.md)
- [Replace one selected workbench runtime through a manager-owned restart control](./ADR-260815-explicit-workbench-restart-control.md)
- [Serialize Project Home lifecycle activation per project](./ADR-260815-per-project-lifecycle-activation.md)
- [Runtime lifecycle and error handling](../core-components/CORE-COMPONENT-260808-runtime-lifecycle-error-handling.md)
- [Structured runtime logging](../core-components/CORE-COMPONENT-260808-structured-runtime-logging.md)
