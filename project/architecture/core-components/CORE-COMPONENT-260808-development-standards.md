# CORE-COMPONENT-260808-development-standards: TypeScript Development Standards

## Status

Adopted

## Purpose

Define consistent coding, commit, testing, and validation practices for the Ascend TypeScript monorepo.

## Scope

All application packages, tests, documentation, commits, and root command recipes.

## Definition

### Rules
- TypeScript strict mode MUST remain enabled.
- Code MUST pass the repository-configured linter and formatting checks.
- Named exports are preferred; framework-required default exports are allowed.
- Asynchronous application code SHOULD use `async` and `await`.
- Commits and pull-request titles MUST follow Conventional Commits.
- Exported behavior MUST have unit or integration coverage appropriate to its boundary.
- Vitest is the unit and integration test runner; Playwright covers browser workflows.
- Unit coverage MUST target at least 80 percent for lines, functions, branches, and statements.
- Raw setup, run, build, and validation commands MUST remain in root `justfile` recipes.

### Interfaces
- Developers and agents discover commands with `just --list`.
- `just verify-focused` runs targeted Vitest validation.
- `just verify` runs formatting, linting, type checks, tests, builds, and browser tests.

### Expectations
- Tests are deterministic and co-located with source or under the package test directory.
- Public behavior changes update affected application documentation.

## Rationale

A strict shared baseline catches integration defects early while keeping package-specific tooling behind a stable repository command interface.

## Usage Examples

```text
just verify-focused apps/web/src/App.test.tsx
just verify
```

## Integration Guidelines

- Add package scripts only when root recipes need a stable workspace operation.
- Keep generated artifacts and coverage output out of version control.

## Exceptions

- Generated framework files may temporarily diverge while being normalized in the same change.

## Enforcement

- [x] Automated checks
- [x] Code review checklist
- [x] Test coverage requirements

## Related ADRs

- [ADR-260808-typescript-monorepo](../ADR/ADR-260808-typescript-monorepo.md)
