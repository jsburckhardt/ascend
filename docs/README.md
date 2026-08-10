# Ascend Documentation

Ascend provides a browser project home for existing host directories and persistent code-server workbenches. The product owns navigation and runtime lifecycle; code-server owns editing, terminals, Explorer, previews, Git UI, and extensions.

## MVP Boundaries

- Projects are explicitly opened by filesystem path; Ascend does not scan for repositories.
- Project metadata is stored in SQLite; source files remain in their original directories.
- Closing a project removes metadata and stops managed resources without deleting project files.
- Workbenches run directly on the host as the configured Ascend user.
- The MVP targets a modern Chromium desktop browser and a single development host.

## Local Development

Use the root command interface:

```text
just setup
just run
just verify
```

The devcontainer pins Node.js 22, pnpm 10.34.5, and code-server 4.131.0 through features. Its post-create script invokes `just setup` to install workspace and Playwright dependencies reproducibly.

Configuration uses environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `ASCEND_HOST` | `127.0.0.1` | API bind address |
| `ASCEND_PORT` | `3000` | API port |
| `ASCEND_DATABASE_URL` | `file:ascend.db` | SQLite database URL |
| Standard `OTEL_*` variables | OpenTelemetry defaults | Optional observability configuration |

Application logs are simple structured console records. Logs and telemetry must not contain source, terminal, clipboard, prompt, credential, or secret content.

## Designated-host workbench proof

The repository exposes `just proof-start` and `just proof-stop` for one bounded standalone code-server 4.131.0 lifecycle. `just verify` includes five fake failure cases and two real workbench Chromium scenarios: forced integrated-terminal timeout cleanup and passing Explorer, Markdown Preview, and terminal parity, each with exact-handle cleanup. See [`workbench-proof.md`](workbench-proof.md) for the fixed host prerequisites, handle contract, readiness and stop bounds, disposable artifacts, diagnostics, evidence, and troubleshooting. Harness boot remains non-persistent and test-backed.

## Source Documents

- [`PRD.md`](../PRD.md) defines the MVP requirements and acceptance criteria.
- [`ADR-260808-typescript-monorepo`](../project/architecture/ADR/ADR-260808-typescript-monorepo.md) defines the initial stack.
- [`project/architecture/core-components/`](../project/architecture/core-components/) contains cross-cutting contracts.

## Host-native terminal parity

Run `just proof-terminal-parity` on the designated Ubuntu 24.04.4 LTS devcontainer as `vscode` with code-server 4.131.0, Chromium, and the fixed Git, GitHub CLI, tmux, Docker CLI, and Copilot CLI executables installed. The BL-001 workbench/Chromium sensor runs both real scenarios; its passing terminal-parity scenario compares direct and integrated `hostname`, `id -un`, `pwd -P`, and the exact six-command tool list. It has a 90,000 ms episode bound and 5,000 ms per-command bounds. See [the operational runbook](workbench-proof.md).

## Browser workbench presentation proof

The designated comparison command is just proof-workbench-presentation. It compares only embedded code-server and full-page code-server with a minimal Ascend header, using three fresh no-retry attempts per candidate and a 1440 by 900 repository Chromium context. The retained authoritative desktop result selected full-page because it had fewer blocking browser protocol violations, 6 versus 9. Both candidates were eligible. Tablet validation remains a separate non-authoritative follow-up, and this proof adds no product routing or lifecycle behavior. The operational and evidence contract is documented in workbench-proof.md.
