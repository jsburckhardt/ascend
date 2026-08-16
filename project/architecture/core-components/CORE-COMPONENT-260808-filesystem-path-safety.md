# CORE-COMPONENT-260808-filesystem-path-safety: Filesystem Path Safety

## Status

Adopted

## Purpose

Ensure Ascend references existing host directories safely and never treats project registration as ownership of project contents.

## Scope

Project path input, canonicalization, duplicate detection, workbench launch paths, and project close behavior.

## Definition

### Rules
- Project paths MUST be expanded according to the supported home notation and canonicalized server-side.
- A project path MUST exist, be a directory, and be readable before registration.
- Canonically equivalent paths MUST identify one project.
- Runtime launch MUST use the stored canonical directory.
- Closing a project MUST stop managed resources and remove metadata only.
- Closing a project MUST NOT delete, move, rename, copy, or otherwise modify its directory.
- Stopping a selected project runtime MUST release only Ascend-owned runtime resources. It MUST retain that project's registration exactly once with its stable ID, display name, canonical path, and created-at value unchanged, and MUST NOT delete, move, rename, copy, or otherwise modify its directory, another project's directory, or any declared unrelated resource, on any outcome, including a confirmed release, an already-stopped no-op, a request that resolves to no manager-owned runtime, an unconfirmed release, a termination fault, and every other bounded non-success.
- Restarting a selected project runtime MUST release and relaunch only Ascend-owned runtime resources against the same stored canonical directory. Every restart outcome — success, unconfirmed prior release, and failed replacement alike — MUST retain that project's registration, its stable ID, display name, canonical path, and created-at value, and MUST NOT delete, move, rename, copy, create, or otherwise modify any file, directory, permission mode, or recorded timestamp inside the project directory.
- Filesystem operations MUST reject traversal outside the configured project-opening policy.
- A per-runtime ephemeral diagnostic file created for a workbench process MUST live inside that runtime's own mode-0700 ephemeral runtime-data directory, MUST be created at mode 0600, MUST never be copied into committed evidence or any public surface, and MUST be removed together with that directory when the runtime exits or is terminated, including when a later API process adopts that runtime and thereby reacquires ownership of the directory.
- Reconciling or adopting a surviving runtime MUST NOT create, modify, move, or delete anything inside a registered project directory, and MUST leave registration rows, file membership, content, permission modes, and recorded timestamps unchanged.

### Interfaces
- Path validation returns a canonical path or a specific validation error.
- Persistence enforces canonical-path uniqueness.

### Expectations
- Validation errors are safe to display and actionable.
- Non-destructive close behavior has automated regression coverage.
- Non-destructive selected runtime restart has automated regression coverage that compares before-and-after project fixture manifests for every restart outcome in a scenario that declares no in-project writer.
- Non-destructive selected runtime stop has automated regression coverage that compares before-and-after project fixture manifests across success and failure outcomes.

## Rationale

Ascend indexes user-owned directories but does not own them. Canonicalization and an explicit non-destructive boundary prevent duplicate records and critical data-loss behavior.

## Usage Examples

```ts
const canonicalPath = await projectPaths.validate(inputPath)
```

## Integration Guidelines

- Never derive shell commands by concatenating untrusted paths.
- Keep deletion APIs outside the project-library boundary.

## Exceptions

- None.

## Enforcement

- [x] Automated checks
- [x] Code review checklist
- [x] Test coverage requirements

## Related ADRs

- [ADR-260808-typescript-monorepo](../ADR/ADR-260808-typescript-monorepo.md)
- [ADR-260815-selected-runtime-stop-control](../ADR/ADR-260815-selected-runtime-stop-control.md)
- [ADR-260815-explicit-workbench-restart-control](../ADR/ADR-260815-explicit-workbench-restart-control.md)
