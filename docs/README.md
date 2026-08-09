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

The repository exposes `just proof-start` and `just proof-stop` for one bounded standalone code-server 4.131.0 lifecycle. `just verify` includes five fake failure cases and one real Chromium Explorer/Markdown Preview episode, with exact-handle cleanup. See [`workbench-proof.md`](workbench-proof.md) for the fixed host prerequisites, handle contract, readiness and stop bounds, disposable artifacts, diagnostics, evidence, and troubleshooting. Harness boot remains non-persistent and test-backed.

## Source Documents

- [`PRD.md`](../PRD.md) defines the MVP requirements and acceptance criteria.
- [`ADR-260808-typescript-monorepo`](../project/architecture/ADR/ADR-260808-typescript-monorepo.md) defines the initial stack.
- [`project/architecture/core-components/`](../project/architecture/core-components/) contains cross-cutting contracts.
