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
