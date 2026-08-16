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
- A launched workbench process MUST NOT depend on its launching process for the lifetime of its standard streams. Its standard error MUST be attached to a per-runtime file descriptor inside its own ephemeral runtime-data directory rather than to a pipe owned by the launching process, so an abrupt loss of the launching process cannot terminate the workbench through a broken stream. Any diagnostic classification the launch contract derives from standard error MUST be derived from a bounded prefix of that file.
- Attribution of a live process to an Ascend runtime MUST use only unprivileged same-user host reads — process identity and process-group leadership, owning user, exact argument vector, the process-group member set, the loopback listening socket inode, and the socket descriptors of the group's members — and MUST NOT require elevated privileges, process-space exhaustion, or indefinite waiting. Those reads MUST be read-only and MUST NOT signal, bind, or modify any process.
- **Amended 2026-08-15 (revision 2).** When a runtime is launched through a wrapper or shell launcher, the configured executable path is not what the kernel reports. The expected argument-vector prefix MUST therefore be derived by resolving the configured executable to its real path and its installation root and taking the installation's own interpreter, and MUST NOT be assumed to equal the configured path string. Correspondingly, the listening socket of a detached runtime MUST be attributed across that runtime's own process-group member set rather than the group leader's own descriptors alone, because the binding process is commonly a forked member of the group.

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
