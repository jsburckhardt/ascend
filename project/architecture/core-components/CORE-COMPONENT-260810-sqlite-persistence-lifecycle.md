# CORE-COMPONENT-260810-sqlite-persistence-lifecycle: SQLite Persistence Lifecycle

## Status

Adopted

## Purpose

Provide one safe, repeatable lifecycle for Ascend's local SQLite metadata stores so application services, repository commands, migrations, and tests share explicit ownership and deterministic cleanup.

## Scope

This component applies to API-owned SQLite connection creation, Drizzle migrations, persistence repositories and services, root database commands, and database integration tests. It does not define product HTTP or UI behavior, project-path canonicalization, remote databases, backups, deployment, or the fields owned by an individual persistence model.

## Definition

### Rules
- SQLite access MUST use an explicit-path, closeable database factory rather than an import-time module-global client.
- The factory MUST expose the Drizzle database and an idempotent close operation for its underlying local client.
- Application persistence MUST run only against the finite ordered Drizzle migrations committed in the repository.
- Migration execution MUST be idempotent and report newly applied migration IDs and the current committed migration ID.
- The root `justfile` MUST expose migration through a paved command that requires an explicit database path; migration MUST NOT reset or remove existing data.
- Database tests MUST use unique paths under a repository-defined disposable directory, refuse the documented developer/default database location, close every handle, remove only the selected database and its SQLite sidecars, and verify cleanup.

- **Amended 2026-08-16 (BL-020, Issue #45).** The persisted project record remains exactly `id`, `name`, `canonicalPath`, and `createdAt`. A selected project close introduces **no schema change, no migration, and no new persisted value**: runtime identities, ownership records, close claims, retirement entries, release markers, admissions, and public states remain memory-only and MUST NOT be written to the durable store or inferred from it. Durable removal remains one explicit serialized transaction that deletes exactly one row, rolls back as a unit, and reports either a removal or an already-absent subject; a partial or best-effort removal MUST NOT be exposed. Durable removal MUST be invoked only through the single removal callable that the close-composing service constructs and injects into the lifecycle boundary's close operation, and only after that boundary has positively confirmed every owned resource absent or exactly released. The close-composing service is the **sole construction point** of that callable and is therefore the one component permitted to name durable removal; it MUST NOT invoke it anywhere outside the callable's body. No route handler, browser client, CLI, other service, or lifecycle path may invoke durable removal directly, and no path may invoke it as a repair for an unconfirmed release. A guard phrased as "no service may invoke durable removal" is wrong and MUST NOT be written: it would forbid the only legitimate construction site. A removal that fails MUST leave the registration present exactly once with every field unchanged, and MUST NOT be retried inside the same operation.

### Interfaces
- A database resource factory accepts a local SQLite filesystem path and returns a Drizzle database plus explicit close ownership.
- A migration runner accepts an open database resource and returns an ordered result containing applied migration IDs and the current migration ID.
- The root command accepts the target database path as an argument and prints the migration result without exposing database contents.

### Expectations
- Fresh, current, and committed prior-version databases converge through the same migration runner.
- Repositories and in-process services receive database resources through construction rather than importing global state.
- Future metadata tables reuse this lifecycle while retaining their own schema and validation contracts.

## Rationale

The accepted stack already selects local SQLite and Drizzle. Explicit close ownership is required for restart and exact-file cleanup, while committed idempotent migrations provide one evolution path for commands, services, and tests. Keeping model fields and product semantics outside this component prevents an issue-specific project repository from becoming a premature general persistence framework.

## Usage Examples

```ts
const resource = createDatabase(databasePath)
try {
  const result = await migrateDatabase(resource)
  const projects = createProjectRepository(
    createDrizzleProjectAdapter(resource.database)
  )
  // Use result and projects through an in-process application service.
} finally {
  resource.close()
}
```

## Integration Guidelines

- Keep generated SQL migrations and the Drizzle migration journal tracked with schema changes.
- Resolve the documented default path once and compare normalized absolute paths in test refusal guards.
- Keep fixture creation deterministic and commit only fixtures needed for migration compatibility.
- Preserve typed persistence outcomes at repository boundaries instead of leaking driver errors.

## Exceptions

- Tests that do not open SQLite resources are outside the database cleanup and refusal rules.

## Enforcement

- [x] Automated checks
- [x] Code review checklist
- [x] Test coverage requirements

## Related ADRs

- [ADR-260808-typescript-monorepo](../ADR/ADR-260808-typescript-monorepo.md)
- [ADR-260816-selected-project-close-control](../ADR/ADR-260816-selected-project-close-control.md)
- [CORE-COMPONENT-260816-managed-resource-release-ordering](./CORE-COMPONENT-260816-managed-resource-release-ordering.md)
