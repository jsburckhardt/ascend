# Ascend API

Fastify API for project metadata and host workbench lifecycle management.

The bootstrap scaffold includes SQLite/Drizzle foundations, structured Fastify logging, and environment-driven OpenTelemetry initialization. The API binds to loopback by default.

| Variable | Default |
|---|---|
| `ASCEND_HOST` | `127.0.0.1` |
| `ASCEND_PORT` | `3000` |
| `ASCEND_DATABASE_URL` | `<repository>/apps/api/ascend.db` |
| `ASCEND_PROJECT_HOME` | configured OS home |
| `ASCEND_PROJECT_ALLOWED_ROOTS` | configured home; path-delimiter-separated, empty is deny-all |

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

createProjectRegistrationService() is the API-owned BL-006 boundary over the BL-005 project library. It takes an explicit database path, configuredHome, and allowedRoots. BL-008 now delegates its Fastify POST route to this boundary without changing its behavior. Construction validates the complete configuration before opening persistence. The configured home and each allowed root must be absolute, existing, readable directories. Each expression is canonicalized once, canonically duplicate roots are deduplicated, and the resulting home/root snapshot is fixed for that service even if configuration symlinks are later retargeted. An empty root list is valid and denies every registration.

Configuration is all-or-nothing. Failure is exactly invalid_opening_policy with safe field configured_home or indexed allowed_roots[n]; it contains no configured value, platform error, stack, or usable service. Registration accepts only absolute paths, exactly ~, and ~/.... Empty or blank input is path_required; NUL or other unsupported syntax is unsupported_path_syntax. Nonblank input is not globally trimmed, so leading, internal, and trailing whitespace in valid path segments remains in the canonical path and display name. Other safe outcomes, all with only field: path, are path_not_found, path_not_directory, path_unreadable, and outside_opening_policy.

The opening policy compares canonical path segments, not string prefixes. A canonical root and descendants pass; prefix siblings, traversal outside a root, and symlinks escaping all roots fail. Symlinked configured roots use their canonical targets. Successful records contain exactly id, name, canonicalPath, and createdAt; the name is the canonical basename, or the canonical root path when there is no basename. Absolute, home-relative, normalized, and symlink expressions for one directory return the same SQLite winner. Sequential duplicates and exactly eight concurrent equivalents return one unchanged record, which remains identical after complete close and fresh reopen.

Registration only inspects project filesystems and writes metadata outside the project tree. Successful, duplicate, concurrent, and rejected operations do not create, delete, copy, move, rename, truncate, write, chmod, or update project-content modification timestamps. Finite Linux-aware tests allocate unique disposable trees below test-results/bl-006/fixtures, restore changed modes, and remove only their allocation. test-results/bl-006/permission-capability.json reports host mode-000 evidence as proved or honestly skipped; deterministic controlled-denial checks always prove both unreadable outcomes. Run just verify-project-registration; just verify includes the same named gate.



The BL-006 registration service remains the only registration boundary. Repository scanning, clone/import, Git requirements, native pickers, project close, and workbench launch remain outside it.

## Project list and registration API (BL-008)

Before binding its listener, the API resolves `ASCEND_DATABASE_URL`, constructs both the closeable list library and BL-006 registration service against that explicit path, and validates `ASCEND_PROJECT_HOME` plus `ASCEND_PROJECT_ALLOWED_ROOTS`. Roots use the host path delimiter; an explicit empty value creates the supported deny-all policy. Invalid configuration or persistence fails safely before listener creation. Shutdown closes both SQLite-backed owners and telemetry once. This behavior requires no migration.

`GET /api/projects` returns `{"projects":[]}` or exact four-field records ordered `createdAt ASC, id ASC`; safe list failure remains 500 `{"error":{"category":"project_list_failed"}}`.

`POST /api/projects` supports only the `application/json` media type and exactly `{"path":"string"}`. The encoded body limit is 4,096 bytes. Blank strings delegate to BL-006. Missing or other media types—including Fastify parser-supported `text/plain` and unsupported `application/xml` or `application/octet-stream`—return 400 `{"error":{"category":"invalid_registration_request"}}` with zero registration delegation. Empty or malformed JSON, arrays, scalars, missing or wrong-type path, and extra keys return that same safe 400 response before registration. A 4,097-byte body returns 413 `{"error":{"category":"registration_request_too_large"}}` before registration.

Created returns 201 and existing returns 200 with only `{"disposition":"created|existing","project":{"id","name","canonicalPath","createdAt"}}`. The project is exactly the stable BL-006 record; `name` is not accepted from the request. Failure status and category mappings are:

| Status | Categories |
|---|---|
| 400 | `path_required`, `unsupported_path_syntax` |
| 403 | `path_unreadable`, `outside_opening_policy` |
| 404 | `path_not_found` |
| 422 | `path_not_directory` |
| 500 | `project_registration_failed` |

Typed path bodies contain exactly `{"error":{"category":"...","field":"path"}}`; unexpected failure contains only its category. No response, header, startup outcome, or structured event includes partial projects, submitted or configured paths, platform errors, stacks, SQL, secrets, or internal text. Every contract-valid request delegates exactly once. Equivalent sequential and exactly eight concurrent requests retain one complete stable ID and one durable row.

Use root commands only: `just verify-open-project`, targeted `just verify-focused <test-path>`, and `just verify`. The API matrix uses a refused-default database and isolated SQLite paths and disposable content fixtures, compares manifests, closes every handle, removes only the selected database and `-wal`, `-shm`, `-journal` sidecars, and proves no residue. Browser success evidence is generated as `test-results/bl-008/open-project/episode.json`. The executed cleanup scenarios are retained separately in `cleanup-matrix.json`: startup and assertion failures, episode timeout, interrupted graceful shutdown, and a surviving descendant each report independent process-group, listener, database/sidecar, and fixture counts. The survivor deliberately reports `ownerCleanupPassed: false` before exact-PID test teardown and `teardownClean: true` afterward.

Open still remains a project-ID deferred browser action. Workbench runtime, picker, scanning, clone/import, project close, search, user sorting, tags, and path mutation are later scope.
