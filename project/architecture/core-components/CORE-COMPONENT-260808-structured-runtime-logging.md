# CORE-COMPONENT-260808-structured-runtime-logging: Structured Runtime Logging

## Status

Adopted

## Purpose

Provide simple, machine-readable runtime events without introducing a complex logging subsystem or collecting sensitive development content.

## Scope

API requests, project registration, workbench lifecycle transitions, health changes, and startup measurements.

## Definition

### Rules
- Runtime logs MUST be structured records written to standard output or standard error.
- Fastify's built-in structured logger is the default application logger.
- Lifecycle event names MUST remain stable and follow the event catalog in `PRD.md`.
- Every public runtime-state transition MUST be announced by exactly one NFR-015 catalog event whose reported outcome matches the new public state; a post-readiness runtime exit MUST be reported as `runtime.health.changed` with its bounded exit classification, and non-catalog lifecycle event names MUST NOT be emitted.
- A selected runtime stop that claims an exact running generation MUST emit exactly one `runtime.stop.requested`, and its settlement MUST emit exactly one terminal event: `runtime.stop.succeeded` when release is confirmed, or `runtime.health.changed` carrying the bounded unconfirmed-stop classification when release cannot be confirmed. `runtime.stop.failed` is absent from the NFR-015 catalog and MUST NOT be emitted as a lifecycle event.
- A rejected stop request, a stop request that resolves to no manager-owned runtime, a successful already-stopped no-op, and a caller that joins an in-flight stop produce no public state transition and MUST emit no lifecycle event. A losing stop, health, false-liveness, or exit contender MUST emit nothing, and a settlement that no longer owns its claim MUST NOT emit a terminal event for state it did not install.
- Route-level operational records for a lifecycle request MUST use distinct non-catalog record names prefixed by their route surface, MUST carry only the bounded route error category, and MUST NOT duplicate or replace the manager-emitted NFR-015 lifecycle event. Such a record MUST NOT be read, validated, or documented as a lifecycle event even when its name resembles a catalog name, and no NFR-015 lifecycle event name that the catalog omits may be introduced by any surface.
- Multi-project lifecycle and proxy events MUST use the shared deterministic opaque one-way project token, which MAY appear in safe logs and declared privacy-safe public evidence for correlation. Raw project IDs, canonical paths, internal ports/authorities, credentials, secrets, commands, environment, Git, terminal, editor, and source values MUST NOT be logged; browser stable URLs separately carry the encoded persisted stable project ID.
- Logs MUST NOT include source contents, terminal contents, command output, clipboard data, prompts, credentials, or secrets.
- OpenTelemetry defaults and environment configuration MUST provide traces and metrics independently of application log formatting.

### Interfaces
- Components log through the Fastify request or application logger.
- Operators configure OpenTelemetry through standard `OTEL_*` environment variables.

### Expectations
- Failures include an event name, opaque project token when available, bounded classification, and an actionable safe error.
- Startup events include elapsed timing data.

## Rationale

Structured console records are sufficient for the local MVP and remain compatible with common log collectors. OpenTelemetry supplies standard observability without coupling product behavior to a vendor.

## Usage Examples

```ts
request.log.info({ event: 'runtime.start.succeeded', projectToken, elapsedMs })
```

## Integration Guidelines

- Prefer stable fields over formatted message parsing.
- Redact sensitive values before logging.
- Keep exporters optional and environment-driven.

## Exceptions

- Human-readable development formatting may be enabled locally when it preserves the structured production path.

## Enforcement

- [x] Automated checks
- [x] Code review checklist
- [x] Test coverage requirements

## Related ADRs

- [ADR-260808-typescript-monorepo](../ADR/ADR-260808-typescript-monorepo.md)
- [ADR-260815-public-runtime-state-projection](../ADR/ADR-260815-public-runtime-state-projection.md)
- [ADR-260815-selected-runtime-stop-control](../ADR/ADR-260815-selected-runtime-stop-control.md)
