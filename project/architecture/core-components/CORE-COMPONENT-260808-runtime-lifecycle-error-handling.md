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
- Runtime state MUST be one of `Stopped`, `Starting`, `Running`, or `Failed`.
- One active project MUST have at most one Ascend-managed workbench runtime.
- Failure of one runtime MUST NOT terminate or corrupt another runtime.
- Invalid transitions and process failures MUST surface explicit, actionable errors.
- Persisted runtime state MUST be reconciled with actual processes after backend restart.
- Broad catches, silent failures, and success-shaped fallbacks are prohibited.

### Interfaces
- Callers request lifecycle operations by stable project identifier.
- The runtime manager returns current state and typed operation outcomes.

### Expectations
- Stop and restart are idempotent where lifecycle semantics allow.
- Replacement processes always target the same canonical project directory.

## Rationale

Centralized lifecycle behavior prevents process handling from leaking into routes and UI code while making concurrency, failure, and recovery testable.

## Usage Examples

```ts
await runtimeManager.start(project)
await runtimeManager.stop(project.id)
```

## Integration Guidelines

- Emit structured lifecycle events through the application logger.
- Keep process handles and internal ports out of persistent project metadata.

## Exceptions

- None.

## Enforcement

- [x] Automated checks
- [x] Code review checklist
- [x] Test coverage requirements

## Related ADRs

- [ADR-260808-typescript-monorepo](../ADR/ADR-260808-typescript-monorepo.md)
