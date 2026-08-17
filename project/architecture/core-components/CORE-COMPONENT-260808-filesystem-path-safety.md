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

- **Amended 2026-08-16 (BL-020, Issue #45).** Removing a project's registration MUST NOT create, modify, move, delete, or read the contents of that project's directory, and no path reachable from a close — admission, connection drain, release, ownership sweep, durable removal, retirement, or evidence capture — may be given a filesystem write capability over a registered project directory. This is the same prohibition already stated for reconciliation, applied to the one operation whose name most invites the opposite assumption: closing removes the project from Ascend and never deletes the thing it registered. Every close outcome, successful or not, MUST leave the selected project directory and every peer project directory byte-identical in relative membership, file-content digests, non-dereferenced link-target digests, permission modes, and modification timestamps, excluding access-time effects.

- **Amended 2026-08-16 (Plan revision 2, BL-020, Issue #45).** The prohibition above is scoped to *registered project directories*, and MUST be stated and enforced that way rather than as a ban on filesystem capability in general. Two write capabilities are already reachable from a close and remain permitted, because neither touches a registered project directory: removal of the runtime's **own** mode-0700 ephemeral runtime-data directory under the host temporary root, performed by the delivered termination and cleanup paths, and creation of the **database** directory by the persistence boundary's library factory. A guard that forbids every write-capable filesystem import on the close path would fail on the delivered sources and is therefore not a guard but a defect. The enforceable obligation is instead twofold: no write-capable filesystem call reachable from a close may receive a path derived from any registered project directory root, proven by observing the actual call arguments during every executed close scenario as well as by the before-and-after directory manifests; and no source changed by a close-bearing change set may introduce a **new** write-capable filesystem import beyond the delivered allowlist, proven by comparing the import sets against the change set's base commit.

- **Amended 2026-08-16 (Plan revision 8, BL-020, Issue #45).** The import-level obligation stated above is scoped to the code the deployed product executes, and MUST be stated and enforced that way rather than as a rule over every file a change set happens to touch. Read literally, "no source changed by a close-bearing change set may introduce a new write-capable filesystem import" is not merely broad, it is self-contradictory: the proof obligations this component itself imposes — recursive before-and-after project manifests, an argument-level write-call ledger, an independent post-capture residual audit, and a committed executed matrix — are dischargeable only by validation code that creates, writes, renames, links, and removes its own fixtures and artifacts. A rule that forbids the capability its own evidence requires forbids its own enforcement, and is a defect rather than a guard. The enforceable obligation is therefore: **no file a change set adds or modifies that is part of the executable product may introduce a write-capable `node:fs` or `node:fs/promises` member it did not carry at that change set's base revision.** Executable-product membership MUST be *computed* and never declared file by file: it is the static relative-import closure of the repository's real deployed entry points, unioned with the change set's own frozen selected-source declaration, and intersected with the change set. Validation, test, fixture, evidence-writing, and standalone-tool modules stay fully **measured and reported** — their import deltas are recorded in the same artifact as every other changed file — and are exempt from the assertion only because they are proven unreachable from every deployed entry point. A module MUST NOT declare its own exemption; exemption MUST follow from computed unreachability together with either a structurally non-shipped repository location or membership in a frozen, plan-ratified validation-module declaration. An exempt module that becomes reachable from a deployed entry point MUST fail the guard rather than silently widen the product's filesystem capability, and a governed scope narrower than the computed closure MUST fail the guard rather than pass by omission. Argument-level runtime proof — that no write-capable call receives a path under any registered project root, across every executed close scenario, with its negative control — remains the authority for actual project-directory safety and is not weakened by this scoping.

### Interfaces
- Path validation returns a canonical path or a specific validation error.
- Persistence enforces canonical-path uniqueness.

### Expectations
- Validation errors are safe to display and actionable.
- Non-destructive close behavior has automated regression coverage.
- Non-destructive selected runtime restart has automated regression coverage that compares before-and-after project fixture manifests for every restart outcome in a scenario that declares no in-project writer.
- Non-destructive selected runtime stop has automated regression coverage that compares before-and-after project fixture manifests across success and failure outcomes.
- The import-capability guard reports every changed file's filesystem import delta with its computed role, and fails on each of: a new write-capable import in a governed file, a changed member of the frozen selected-source declaration marked ungoverned, a changed file absent from the measurement, an incomplete base-revision comparison, a role that contradicts computed reachability, an exempt validation module reachable from a deployed entry point, and a governed scope narrower than the computed entry-point closure.

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
- [ADR-260816-selected-project-close-control](../ADR/ADR-260816-selected-project-close-control.md)
- [CORE-COMPONENT-260816-managed-resource-release-ordering](./CORE-COMPONENT-260816-managed-resource-release-ordering.md)
