# Ascend API

Fastify API for project metadata and host workbench lifecycle management.

The bootstrap scaffold includes SQLite/Drizzle foundations, structured Fastify logging, and environment-driven OpenTelemetry initialization. The API binds to loopback by default.

| Variable | Default |
|---|---|
| `ASCEND_HOST` | `127.0.0.1` |
| `ASCEND_PORT` | `3000` |
| `ASCEND_DATABASE_URL` | `<repository>/apps/api/ascend.db` |

Use the repository root `justfile` rather than invoking package commands directly.

## Host workbench proof CLI

`just proof-start` calls the API-owned runtime manager directly; it does not add an HTTP API route. On success it writes exactly one JSON handle with `version`, `pid`, loopback `url`, `runId`, and process `startTimeTicks`. Readiness is an HTTP response in the 200–399 range within 15 seconds. Structured lifecycle events go to stderr.

Pipe the unchanged handle to `just proof-stop`. Stop validates the saved state and process start identity, signals only that process group, escalates within 10 seconds, removes only its run directory below `test-results/bl-001/runs`, and succeeds when repeated after absence. The fixed executable is `/home/vscode/.local/bin/code-server` 4.131.0 and the command refuses root execution. Failure codes cover missing executables, missing or non-directory projects, spawn failure, readiness timeout, early exit, invalid handles, state mismatch, and stop timeout. See [`docs/workbench-proof.md`](../../docs/workbench-proof.md).

## Terminal parity sensor

`just proof-terminal-parity` invokes the API-owned BL-001 proof modules through the existing Playwright sensor with forced integrated-terminal timeout-cleanup and passing terminal-parity scenarios; it adds no HTTP API. The shared executor directly spawns argument arrays from the canonical fixture, applies a 5,000 ms command timeout, and writes separate raw stdout/stderr plus line-ending-only normalized values. The whole episode is bounded to 90,000 ms. It preflights the six documented tools before browser startup and distinguishes `terminal-executable-missing`, context-specific `terminal-command-nonzero`, `terminal-command-timeout`, `terminal-episode-timeout`, and artifact-write failures. Only `PATH` is retained for environment comparison.


## SQLite project library


From the repository root, initialize or upgrade an explicit local database with `just db-migrate <database-path>`. This command does not use `ASCEND_DATABASE_URL`, does not reset data, and closes before returning. For the three supported committed starting states, the successful JSON outputs are exhaustively:

```json
{"appliedMigrationIds":["0000_project_library","0001_project_canonical_path_unique"],"currentMigrationId":"0001_project_canonical_path_unique"}
{"appliedMigrationIds":["0001_project_canonical_path_unique"],"currentMigrationId":"0001_project_canonical_path_unique"}
{"appliedMigrationIds":[],"currentMigrationId":"0001_project_canonical_path_unique"}
```

The arrays respectively represent a missing database, the tracked `0000_project_library` prior-version fixture, and a current database rerun.

`0000_project_library` creates `projects`; `0001_project_canonical_path_unique` adds database-enforced uniqueness. The physical schema is exactly `id`, `name`, `canonical_path`, and `created_at`, corresponding to contract fields `id`, `name`, `canonicalPath`, and `createdAt`. The timestamp is finite non-negative safe-integer Unix epoch milliseconds and is returned unchanged.

`ProjectLibrary.create` returns `created`, `existing`, or `invalid`. A duplicate canonical path returns `existing` with the same durable winner, including for concurrent creates. Pre-write validation codes are `empty-id`, `blank-name`, `empty-canonical-path`, and `invalid-created-at`; unexpected driver failures become typed project-persistence errors. `ProjectLibrary.list` returns only the four contract fields in deterministic `createdAt ASC, id ASC` order. A complete in-process restart test creates exactly two records, closes all first-generation resources, constructs a fresh library at the same path, and lists those two once each.

The immediately previous fixture is `test/fixtures/db/0000_project_library.sqlite`, at migration `0000_project_library` with two rows and a companion integrity hash. Tests copy it to a unique database below `<repository>/test-results/bl-005/databases`. The test boundary refuses `<repository>/apps/api/ascend.db`, closes registered handles, removes only its selected database and the `-wal`, `-shm`, and `-journal` sidecars, and verifies cleanup. There is no database reset command.



## Canonical filesystem project registration (BL-006)

createProjectRegistrationService() is an API-owned, in-process boundary over the BL-005 project library. It takes an explicit database path, configuredHome, and allowedRoots; it adds no Fastify route, HTTP contract, environment variable, or network behavior. Construction validates the complete configuration before opening persistence. The configured home and each allowed root must be absolute, existing, readable directories. Each expression is canonicalized once, canonically duplicate roots are deduplicated, and the resulting home/root snapshot is fixed for that service even if configuration symlinks are later retargeted. An empty root list is valid and denies every registration.

Configuration is all-or-nothing. Failure is exactly invalid_opening_policy with safe field configured_home or indexed allowed_roots[n]; it contains no configured value, platform error, stack, or usable service. Registration accepts only absolute paths, exactly ~, and ~/.... Empty or blank input is path_required; NUL or other unsupported syntax is unsupported_path_syntax. Nonblank input is not globally trimmed, so leading, internal, and trailing whitespace in valid path segments remains in the canonical path and display name. Other safe outcomes, all with only field: path, are path_not_found, path_not_directory, path_unreadable, and outside_opening_policy.

The opening policy compares canonical path segments, not string prefixes. A canonical root and descendants pass; prefix siblings, traversal outside a root, and symlinks escaping all roots fail. Symlinked configured roots use their canonical targets. Successful records contain exactly id, name, canonicalPath, and createdAt; the name is the canonical basename, or the canonical root path when there is no basename. Absolute, home-relative, normalized, and symlink expressions for one directory return the same SQLite winner. Sequential duplicates and exactly eight concurrent equivalents return one unchanged record, which remains identical after complete close and fresh reopen.

Registration only inspects project filesystems and writes metadata outside the project tree. Successful, duplicate, concurrent, and rejected operations do not create, delete, copy, move, rename, truncate, write, chmod, or update project-content modification timestamps. Finite Linux-aware tests allocate unique disposable trees below test-results/bl-006/fixtures, restore changed modes, and remove only their allocation. test-results/bl-006/permission-capability.json reports host mode-000 evidence as proved or honestly skipped; deterministic controlled-denial checks always prove both unreadable outcomes. Run just verify-project-registration; just verify includes the same named gate.



The BL-006 registration service itself remains in-process. Repository scanning, clone/import, Git requirements, native pickers, project close, and workbench launch remain outside registration. BL-007 adds only read-only listing and presentation; registration remains a separate boundary.

## Registered project API and lifecycle (BL-007)

Before binding its listener, the API resolves `ASCEND_DATABASE_URL` as a local `file:` URL or filesystem path, defaulting to `<repository>/apps/api/ascend.db`; creates one closeable project library; and applies or validates every committed migration. A stopped API closes Fastify, the library/database handle, and telemetry through one memoized shutdown promise, so repeated SIGINT, SIGTERM, or direct stop requests join the same safe outcome. A persistence initialization failure prevents listening, exits nonzero, and emits only `{"event":"api.start.failed","category":"project_library_initialization_failed"}` without raw errors, database paths, SQL, stacks, or secrets. Existing data survives complete stop and reconstruction; no new migration or data conversion is required for BL-007.

`GET /api/projects` is read-only. Empty and populated success use one exact contract:

```json
{"projects":[]}
```

```json
{"projects":[{"id":"project-id","name":"Display name","canonicalPath":"/complete/canonical/path","createdAt":1786407000000}]}
```

Records contain no other fields. ID and canonical path are non-empty strings, name is non-blank, and createdAt is a finite non-negative safe integer. Duplicate IDs or any malformed row fail closed. Results use the deterministic total order `createdAt ASC, id ASC`, with ID as the final tie-breaker. Any persistence or list-validation failure returns HTTP 500 with only `{"error":{"category":"project_list_failed"}}`; it contains no `projects` field or partial records, and the structured `project.list.failed` event contains only the safe category.

Local Vite development proxies same-origin `/api` requests to `http://127.0.0.1:3000`. The controlled browser gate may override only that proxy target while starting its owned API; Fastify does not add CORS behavior or a product fault route.

Use only root commands for validation: `just verify-focused apps/api/test/api-lifecycle.test.ts apps/api/test/project-list-route.test.ts`, `just test-e2e`, and `just verify`. The desktop Chromium gate uses one refused-default database under `test-results/bl-007/project-home/databases`, injects one list failure only through the test launcher library-factory seam, and allows 10,000 ms for each graceful child exit. It then independently inspects every owned process group to prove no process survives and proves both listeners and the selected database plus `-wal`, `-shm`, and `-journal` sidecars are absent. A focused failure-path test retains the distinction between graceful group exit and bounded forced cleanup. The observed bounded run passed, with sanitized all-true evidence at `test-results/bl-007/project-home/episode.json`.

BL-007 adds no registration, project close, workbench startup or status, search, user sorting, tags, path mutation, or fake workbench destination. Those BL-008+ operations remain deferred.
