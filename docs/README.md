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

The in-process `ProjectLibrary` creates and lists records. A valid create returns a `created` or `existing` disposition; canonical-path uniqueness is enforced by SQLite, and `existing` carries the durable winning record. Invalid input returns `invalid` with `empty-id`, `blank-name`, `empty-canonical-path`, or `invalid-created-at` before a write. A bounded integration proof closes the complete library/database generation, reconstructs fresh instances at the same path, and recovers exactly two records once each. BL-007 now exposes this persisted data through the read-only list route and Project Home.

Migration compatibility uses the tracked prior-version fixture `apps/api/test/fixtures/db/0000_project_library.sqlite`, which is at `0000_project_library` and contains exactly two records. BL-005 database tests allocate unique paths below `test-results/bl-005/databases`, refuse `<repository>/apps/api/ascend.db`, close all handles, remove only the selected database plus `-wal`, `-shm`, and `-journal`, and prove those files are absent. The tracked fixture is copied and never mutated.



## Canonical filesystem registration

BL-006 adds an in-process registration service over BL-005 persistence; it does not add an HTTP API or UI. Construction receives an explicit database path, configured home, and allowed-root list. Every configured entry must be an absolute, existing, readable directory and is canonicalized once before persistence opens. Canonically equivalent roots are deduplicated, configuration symlink targets are frozen for the service lifetime, and [] is a valid deny-all policy. Any invalid entry fails the whole construction as invalid_opening_policy with only safe field configured_home or allowed_roots[n].

Inputs support absolute paths, exactly ~, and ~/.... Blank input maps to path_required; NUL and unsupported forms map to unsupported_path_syntax; missing, file, unreadable, and disallowed targets map to path_not_found, path_not_directory, path_unreadable, and outside_opening_policy. Each registration failure contains only field: path and its category. Nonblank path whitespace is preserved. Canonical segment containment admits roots and descendants while rejecting prefix siblings, outside traversal, and escaping symlinks; symlinked roots are evaluated at their canonical targets.

A project record has exactly stable ID, canonical-basename display name (canonical root fallback), canonical path, and created-at time. Equivalent absolute, home, normalized, or symlink inputs—and exactly eight concurrent registrations—return the same durable four-field winner after close/reopen. Registration never mutates project membership, bytes, permissions, or modification timestamps.

just verify-project-registration uses disposable test-results/bl-006/fixtures trees and emits named configuration, registration, persistence, non-mutation, fixture-cleanup, documentation, and permission-capability signals. The generated test-results/bl-006/permission-capability.json says proved only when bounded mode-000 checks are enforceable; otherwise it says skipped with the failed probe result. Controlled denial always proves unreadable configuration and project mappings, and fixture cleanup restores modes and removes only allocated roots.



The BL-006 registration service remains in-process. Repository scanning, clone/import, Git requirements, native pickers, project close, and workbench launch remain outside registration. BL-007 adds read-only listing and presentation without adding registration.

## Registered Project Home (BL-007)

API startup resolves `ASCEND_DATABASE_URL` (`file:` URL or filesystem path, with `<repository>/apps/api/ascend.db` as the default), opens one closeable project library, and applies or validates committed migrations before listening. Complete shutdown closes Fastify, SQLite, and telemetry once; repeated SIGINT, SIGTERM, and direct stop requests join the same memoized outcome. Restarting against the same database preserves every record. Initialization failure never opens the listener, exits nonzero, and emits the safe `api.start.failed` event with category `project_library_initialization_failed`; raw secrets, SQL, stack text, and database paths are not logged. BL-007 uses the existing migrations and requires no upgrade conversion.

`GET /api/projects` returns `{"projects":[]}` or a projects array whose records contain exactly `id`, `name`, `canonicalPath`, and `createdAt`. Valid records require a non-empty ID, non-blank name, non-empty unchanged canonical path, and finite non-negative safe-integer createdAt. Results are ordered `createdAt ASC, id ASC`. Duplicate IDs, malformed rows, and persistence failures return HTTP 500 as `{"error":{"category":"project_list_failed"}}`, with no projects or partial records.

Vite sends same-origin `/api` traffic to the loopback API. Project Home makes one 5,000 ms-bounded request per mount and shows distinct announced loading, explanatory empty, populated, and actionable failure states. Retry starts one new request. A newer retry aborts or supersedes its predecessor, stale responses cannot update the page, and unmount aborts the current request. Every valid card shows the display name and complete canonical path unchanged as whitespace-preserving text and title. Its keyboard-focusable Open button carries the stable project ID and names the project; activation only announces that opening is not available in BL-007. It performs no navigation, request, or workbench operation, including after repeated activation.

Project registration, close, workbench startup/status, search, sorting controls, tags, path mutation, and fake workbench routing remain BL-008+ scope. Registered projects appear here, but this page does not register them.

Validate through root commands only: `just verify-focused apps/web/src/project-client.test.tsx apps/web/src/App.test.tsx`, `just verify-focused apps/api/test/api-lifecycle.test.ts apps/api/test/project-list-route.test.ts`, `just test-e2e`, and `just verify`. The one desktop Chromium episode owns real Vite and API children at disposable loopback ports and refuses the developer database. It proves empty, restart-populated, keyboard Open identity, one test-launcher-only list fault, and successful retry. Cleanup requests graceful shutdown within 10,000 ms, proves listener absence, and removes only the isolated database plus `-wal`, `-shm`, and `-journal` sidecars. The observed bounded result passed; sanitized all-true evidence is generated at `test-results/bl-007/project-home/episode.json`. Harness boot remains non-persistent and test-backed.
