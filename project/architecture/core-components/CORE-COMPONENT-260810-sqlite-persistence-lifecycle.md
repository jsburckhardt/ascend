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
const resource = createDatabase({ databasePath })
const result = await migrateDatabase(resource)
try {
  const projects = createProjectRepository(resource.database)
  // Use the repository through an in-process application service.
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
