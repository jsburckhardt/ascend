# CORE-COMPONENT-260808-runtime-lifecycle-error-handling: Runtime Lifecycle and Error Handling

## Status

Adopted

## Purpose

Keep code-server process ownership, lifecycle state, failure reporting, and recovery behavior consistent and isolated.

## Scope

Workbench registration state, start, stop, restart, health detection, backend recovery, multi-project isolation, state exposed to trusted application boundaries, and the public lifecycle state reported to application, API, and browser surfaces.

## Definition

### Rules
- Workbench process operations MUST be owned by one internal runtime-management boundary.
- Runtime state MUST be one of `stopped`, `starting`, `running`, or `failed`; absence represents `stopped` when no stopped snapshot is returned.
- Public runtime state MUST be reported as exactly one of `Stopped`, `Starting`, `Running`, or `Failed`. The internal `registered` state and every other internal state MUST NOT reach a public surface, and no additional public state may be introduced.
- Every public runtime state MUST be projected by the runtime manager from its own entry map. No route, proxy, browser client, or other consumer may derive public state from process liveness, ports, snapshots, or its own health probe.
- A missing or `registered` entry MUST be reported `Stopped`; a retained failed entry MUST be reported `Failed` and MUST NOT become `Stopped` through entry absence. `Running` MUST be reported only after the documented health-gated readiness has been observed; process existence alone MUST NOT be sufficient.
- A start failure before readiness, an observed runtime exit after readiness, and a completed health observation that does not satisfy the documented health contract MUST each report `Failed` and MUST NOT leave that project reported `Running`.
- Every `running` to `failed` transition MUST pass through one manager-owned guarded transition operation that compare-and-sets on the exact installed entry object and its generation. Observed false liveness, a failed health observation, and process-exit settlement MUST all use it. The winning contender MUST install the failed entry, retain exactly one bounded failure category, record exactly one cleanup audit, and emit exactly one `runtime.health.changed`. A losing contender MUST NOT mutate the entry, MUST NOT terminate or audit the process again, MUST NOT emit an event, and MUST surface the retained failure of the winning transition.
- A set of public reports MUST be produced in one synchronous pass over the entry map, so reports observed together cannot disagree without an intervening lifecycle outcome.
- A public report MUST disclose only the project identifier, the public state, and a bounded `RuntimeFailureCategory` when the state is `Failed`. Failure diagnostics, PIDs, ports, internal authorities, canonical paths, commands, environment values, credentials, and command output MUST NOT appear in a public report or in any surface rendered from it.
- A consumer that cannot obtain a current public report MUST report that absence explicitly and MUST NOT substitute `Stopped` or any other lifecycle state.
- A consumer that reads public reports separately from its authoritative project list MUST bind each request to one authoritative list revision and MUST reconcile the response against that revision's exact ordered project identifiers. A missing, extra, duplicate, or reordered identifier MUST be treated as projection unavailability for that revision; partial rendering, per-project substitution, and attaching a settled response to a later revision are prohibited.
- Every public state transition MUST be announced by exactly one `PRD.md` NFR-015 lifecycle event whose `to` state maps to the new public state; no event may report start success or a healthy observation while that project's public state is `Failed`. Manager shutdown ends the reporting surface itself and is not a reportable public transition.
- Runtime process handles, PID identities, internal ports, in-flight operations, owner tokens, and lifecycle state MUST remain in runtime-manager memory and MUST NOT be persisted with project metadata.
- Registered, starting, running, and failed project lifecycle entries MUST be held in one runtime-manager-owned map keyed only by stable project ID. An exact PID/start-identity/port ownership index MAY exist solely for cleanup, but each record MUST retain its owning stable project identity.
- One active project MUST have at most one Ascend-managed workbench runtime.
- Concurrent starts for one project MUST join one in-flight spawn and readiness operation; starts for different stable project IDs MUST never share an entry, promise, snapshot, failure, or cleanup result.
- A running runtime MUST be reused only while its exact process identity is alive and its documented health check passes.
- Failed starts and post-running exits MUST be evicted from reusable state; a later explicit start MAY create one replacement, but the manager MUST NOT run an automatic retry loop.
- Runtime launch MUST use the persisted stable project ID and exact stored canonical path, direct argument-vector process creation, a configured non-root user, and loopback-only binding.
- Port selection and binding MUST avoid an unprotected check-then-bind result by delegating binding or applying a documented finite address-in-use retry bound without disturbing unrelated listeners.
- Readiness MUST use a documented status-and-body health contract with finite per-attempt and overall timeouts, recorded attempt timing, and cancellation.
- Caller cancellation MUST end only that caller wait while another caller still waits. When cancellation leaves an in-flight project start with zero waiting callers, the manager MUST cancel and clean that orphaned project-owned start without affecting any other project.
- Manager shutdown MUST be bounded and idempotent, reject new starts, cancel every in-flight project start, gracefully stop every exact owned process group, record project-attributed audits, and escalate only after a finite timeout. A trusted audit inspection MUST independently report entry, exact-ownership, completion-task, background-task, and settlement counts. Shutdown MUST cancel and await tracked promises until their own handlers remove them, MUST NOT clear task sets as settlement proof, and MUST expose immediate plus delayed post-return zero audits so late completion cannot repopulate state. Verification evidence MUST retain real monotonic start, end, elapsed, and configured-bound values for manager shutdown, task settlement, every project cleanup, and delayed post-return observation, and MUST reject any measured duration above its bound.
- Failure, eviction, cancellation, cleanup, or explicit replacement of one runtime MUST NOT change another project's process identity, listener, route, state, or terminal/editor/Git context.
- Invalid transitions, startup failures, health failures, cancellation, shutdown, and process exits MUST surface distinct typed actionable errors with finite diagnostic fields.
- Lifecycle snapshots, failures, diagnostics, and events MUST exclude command, environment, credential, secret, source, terminal, command-output, stack, raw-error, and redaction-sentinel content.
- Structured lifecycle events MUST include stable event names, the same deterministic opaque project token used by workbench proxy events, state transition, elapsed time, and a bounded failure classification when applicable. The one-way token MAY appear in safe logs and declared privacy-safe public evidence; raw project IDs, canonical paths, internal ports/authorities, credentials, and secrets MUST NOT be logged. Browser stable routes separately contain the encoded persisted stable project ID.
- Every immutable running snapshot MUST include its stable project ID, exact PID/start identity, loopback authority, canonical path, stable route, start timestamp, and deterministic opaque owner token; the owner token MUST match lifecycle and proxy attribution for that project and MUST NOT be treated as a credential.
- If runtime state is persisted in a future architecture, it MUST be reconciled with actual processes after backend restart; the memory-only manager instead MUST stop owned runtimes during current-process shutdown.
- Broad catches, silent failures, and success-shaped fallbacks are prohibited.

### Interfaces
- Callers request lifecycle operations with a persisted stable project identifier and exact stored canonical path.
- The runtime manager returns typed `starting`, `running`, or `failed` snapshots and typed operation failures; running snapshots expose the stable route and opaque owner token only to trusted in-process consumers, and an in-memory ownership query accepts only the exact immutable snapshot object still installed in the matching running entry.
- The runtime manager exposes a read-only public reporting operation that accepts stable project IDs and returns frozen public reports; it performs no process, port, or health operation and mutates no entry.
- Runtime dependencies expose injectable process, port, health, clock, cancellation, event, and exact-identity audit boundaries for finite validation.

### Expectations
- Interleaved repeated starts join only the matching project's in-flight start or reuse only its health-checked running identity.
- Shared-start failure settles every participating caller with the same typed failure and permits one fresh later attempt.
- Stop and shutdown are idempotent where lifecycle semantics allow.
- Replacement processes always target the same persisted canonical project directory.
- Cleanup proves exact owned process identity and listener absence without sweeping names or ports.
- The runtime boundary, API response, and browser surface report the same public state for a project observed without an intervening lifecycle outcome.
- One project's start, process, health, or cleanup outcome never changes another project's reported public state or failure category.
- Concurrent false-liveness, health-observation, and exit-settlement contenders for one running project settle as exactly one terminal transition with one retained category, one cleanup audit, and one emitted event, regardless of contender ordering or delayed loser settlement.

## Rationale

Centralized memory-only lifecycle behavior prevents process handling from leaking into routes and UI code while making concurrency, ownership, failure, recovery, and exact cleanup testable. Caller cancellation preserves shared single-flight work while waiters remain; zero-waiter cancellation prevents an orphaned project startup, and manager shutdown remains the global cancellation boundary for all projects and owned processes. Projecting one public four-state vocabulary from that same memory keeps every surface truthful without adding a second lifecycle authority or a background health loop. Persisted reconciliation remains a future concern until an architecture explicitly introduces persisted runtime identity.

## Usage Examples

```ts
const snapshot = await runtimeManager.start({
  projectId: project.id,
  canonicalPath: project.canonicalPath,
  signal: requestSignal,
})
const [report] = runtimeManager.reportPublicStates([project.id])
await runtimeManager.shutdown()
```

## Integration Guidelines

- Verify the ID and canonical-path pair against persisted metadata before launch.
- Emit bounded structured lifecycle events through the application logger without raw canonical paths.
- Keep process handles, PID identities, internal ports, and lifecycle state out of persistent project metadata.
- Read public state only through the manager's reporting operation and render it without adding, renaming, or inferring a state.
- Isolate code-server user data in an opaque runtime-owned ephemeral directory and remove that directory on exit or exact termination.
- Use exact PID/start identity and listener attribution for cleanup evidence; never kill by process name or sweep ports.
- Document health, retry, cancellation, and shutdown bounds beside the runtime-manager interface.

## Exceptions

- None.

## Enforcement

- [x] Automated checks
- [x] Code review checklist
- [x] Test coverage requirements

## Related ADRs

- [ADR-260808-typescript-monorepo](../ADR/ADR-260808-typescript-monorepo.md)
- [ADR-260815-public-runtime-state-projection](../ADR/ADR-260815-public-runtime-state-projection.md)
