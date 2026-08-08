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
- Filesystem operations MUST reject traversal outside the configured project-opening policy.

### Interfaces
- Path validation returns a canonical path or a specific validation error.
- Persistence enforces canonical-path uniqueness.

### Expectations
- Validation errors are safe to display and actionable.
- Non-destructive close behavior has automated regression coverage.

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
