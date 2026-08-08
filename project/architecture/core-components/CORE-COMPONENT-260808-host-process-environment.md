# CORE-COMPONENT-260808-host-process-environment: Host Process and Environment Handling

## Status

Adopted

## Purpose

Preserve the configured host user's development environment when Ascend launches and manages browser workbenches.

## Scope

code-server child processes, integrated terminals, shell initialization, working directories, permissions, sockets, and inherited development tooling.

## Definition

### Rules
- code-server MUST run directly on the Ascend host for the MVP.
- Workbenches MUST run as the configured Ascend OS user without privilege escalation.
- New workbench terminals MUST start in the project's canonical directory.
- Required host tools MUST resolve through a documented and deterministic environment.
- Child-process arguments MUST use argument arrays rather than shell interpolation.
- Each runtime SHOULD bind to loopback and be exposed through an Ascend-owned stable route.
- Environment differences from a normal login shell MUST be documented and corrected when they prevent required tooling.

### Interfaces
- Runtime launch accepts a canonical directory and explicit environment.
- Environment construction starts from an allowlisted host environment and documented overrides.

### Expectations
- Git, GitHub CLI, Docker CLI, tmux, and configured project tools behave as they do for the host user.
- Runtime processes remain independent across projects.

## Rationale

Host-native terminal parity is the central MVP hypothesis. Direct, least-privilege host processes provide that parity with less duplication than per-project containers.

## Usage Examples

```ts
spawn(codeServerPath, ['--bind-addr', bindAddress, canonicalPath], {
  cwd: canonicalPath,
  env: workbenchEnvironment,
})
```

## Integration Guidelines

- Never invoke code-server through an interpolated shell command.
- Record startup timing and health transitions without logging environment secrets.

## Exceptions

- Containerized or remote providers require a later ADR and are outside the MVP.

## Enforcement

- [x] Automated checks
- [x] Code review checklist
- [x] Test coverage requirements

## Related ADRs

- [ADR-260808-typescript-monorepo](../ADR/ADR-260808-typescript-monorepo.md)
