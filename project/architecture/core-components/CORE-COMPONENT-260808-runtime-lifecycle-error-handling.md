# CORE-COMPONENT-260808-runtime-lifecycle-error-handling: Runtime Lifecycle and Error Handling

## Status

Adopted

## Purpose

Keep code-server process ownership, lifecycle state, failure reporting, and recovery behavior consistent and isolated.

## Scope

Workbench start, stop, restart, health detection, backend recovery, and state exposed to the web application.

## Definition

### Rules
- Workbench process operations MUST be owned by one internal runtime-management boundary.
- Runtime state MUST be one of `stopped`, `starting`, `running`, or `failed`; absence represents `stopped` when no stopped snapshot is returned.
- Runtime process handles, PID identities, internal ports, in-flight operations, and lifecycle state MUST remain in runtime-manager memory and MUST NOT be persisted with project metadata.
- One active project MUST have at most one Ascend-managed workbench runtime.
- Concurrent starts for one project MUST join one in-flight spawn and readiness operation.
- A running runtime MUST be reused only while its exact process identity is alive and its documented health check passes.
- Failed starts and post-running exits MUST be evicted from reusable state; a later explicit start MAY create one replacement, but the manager MUST NOT run an automatic retry loop.
- Runtime launch MUST use the persisted stable project ID and exact stored canonical path, direct argument-vector process creation, a configured non-root user, and loopback-only binding.
- Port selection and binding MUST avoid an unprotected check-then-bind result by delegating binding or applying a documented finite address-in-use retry bound without disturbing unrelated listeners.
- Readiness MUST use a documented status-and-body health contract with finite per-attempt and overall timeouts, recorded attempt timing, and cancellation.
- Caller cancellation MUST end only that caller wait; it MUST NOT cancel or mutate the shared start owned by the manager.
- Manager shutdown MUST be bounded and idempotent, reject new starts, cancel in-flight starts, gracefully stop exact owned process groups, and escalate only after a finite timeout.
- Failure of one runtime MUST NOT terminate or corrupt another runtime.
- Invalid transitions, startup failures, health failures, cancellation, shutdown, and process exits MUST surface distinct typed actionable errors with finite diagnostic fields.
- Lifecycle snapshots, failures, diagnostics, and events MUST exclude command, environment, credential, secret, source, terminal, command-output, stack, raw-error, and redaction-sentinel content.
- Structured lifecycle events MUST include stable event names, project ID, state transition, elapsed time, and a bounded failure classification when applicable; raw canonical paths MUST NOT be logged.
- If runtime state is persisted in a future architecture, it MUST be reconciled with actual processes after backend restart; the memory-only manager instead MUST stop owned runtimes during current-process shutdown.
- Broad catches, silent failures, and success-shaped fallbacks are prohibited.

### Interfaces
- Callers request lifecycle operations with a persisted stable project identifier and exact stored canonical path.
- The runtime manager returns typed `starting`, `running`, or `failed` snapshots and typed operation failures.
- Runtime dependencies expose injectable process, port, health, clock, cancellation, event, and exact-identity audit boundaries for finite validation.

### Expectations
- Repeated starts join an in-flight start or reuse one health-checked running identity.
- Shared-start failure settles every participating caller with the same typed failure and permits one fresh later attempt.
- Stop and shutdown are idempotent where lifecycle semantics allow.
- Replacement processes always target the same persisted canonical project directory.
- Cleanup proves exact owned process identity and listener absence without sweeping names or ports.

## Rationale

Centralized memory-only lifecycle behavior prevents process handling from leaking into routes and UI code while making concurrency, ownership, failure, recovery, and exact cleanup testable. Caller-only cancellation preserves shared single-flight work, while manager shutdown remains the sole cancellation boundary for all owned starts and processes. Persisted reconciliation remains a future concern until an architecture explicitly introduces persisted runtime identity.

## Usage Examples

```ts
const snapshot = await runtimeManager.start({
  projectId: project.id,
  canonicalPath: project.canonicalPath,
  signal: requestSignal,
})
await runtimeManager.shutdown()
```

## Integration Guidelines

- Verify the ID and canonical-path pair against persisted metadata before launch.
- Emit bounded structured lifecycle events through the application logger without raw canonical paths.
- Keep process handles, PID identities, internal ports, and lifecycle state out of persistent project metadata.
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
