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
| `ASCEND_DATABASE_URL` | `<repository>/apps/api/ascend.db` | Local application SQLite path; `file:` or filesystem-path overrides are supported |
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

The designated comparison command is just proof-workbench-presentation. It compares only embedded code-server and full-page code-server with a minimal Ascend header, using three fresh no-retry attempts per candidate and a 1440 by 900 repository Chromium context. The retained authoritative desktop result selected full-page because it had fewer blocking browser protocol violations, 0 versus 3. Both candidates were eligible. Tablet validation remains a separate non-authoritative follow-up, and this proof adds no product routing or lifecycle behavior. The operational and evidence contract is documented in workbench-proof.md.


## Project library persistence

The persistence module resolves its developer database to `<repository>/apps/api/ascend.db` when `createApplicationProjectLibrary()` is called. `ASCEND_DATABASE_URL` overrides that local persistence path with a `file:` URL or filesystem path. Current Fastify startup does not construct the project library; that application integration remains deferred with the BL-007 HTTP/API boundary. Migration is intentionally separate: it ignores the environment override and requires an explicit filesystem target.

```text
just db-migrate <database-path>
```

The command creates parent directories and a missing database, never resets data, applies committed migrations in order, closes its SQLite handle, and emits exactly one JSON object. For the supported missing, immediately prior, and current committed states, the complete output set is:

```json
{"appliedMigrationIds":["0000_project_library","0001_project_canonical_path_unique"],"currentMigrationId":"0001_project_canonical_path_unique"}
{"appliedMigrationIds":["0001_project_canonical_path_unique"],"currentMigrationId":"0001_project_canonical_path_unique"}
{"appliedMigrationIds":[],"currentMigrationId":"0001_project_canonical_path_unique"}
```

The final `projects` table has exactly four physical columns: `id`, `name`, `canonical_path`, and `created_at`. They map to the `Project` fields `id`, `name`, `canonicalPath`, and `createdAt`; `createdAt` is a finite, non-negative safe integer containing Unix epoch milliseconds. No source text, terminal output, ports, PIDs, handles, environment data, credentials, secrets, or runtime state is part of this schema.

The in-process `ProjectLibrary` creates and lists records. A valid create returns a `created` or `existing` disposition; canonical-path uniqueness is enforced by SQLite, and `existing` carries the durable winning record. Invalid input returns `invalid` with `empty-id`, `blank-name`, `empty-canonical-path`, or `invalid-created-at` before a write. A bounded integration proof closes the complete library/database generation, reconstructs fresh instances at the same path, and recovers exactly two records once each. This adds no HTTP route or UI.

Migration compatibility uses the tracked prior-version fixture `apps/api/test/fixtures/db/0000_project_library.sqlite`, which is at `0000_project_library` and contains exactly two records. BL-005 database tests allocate unique paths below `test-results/bl-005/databases`, refuse `<repository>/apps/api/ascend.db`, close all handles, remove only the selected database plus `-wal`, `-shm`, and `-journal`, and prove those files are absent. The tracked fixture is copied and never mutated.

Filesystem existence, readability, home expansion, and canonicalization policy remain BL-006 work. HTTP/API response semantics, routes, and UI remain BL-007 work.
