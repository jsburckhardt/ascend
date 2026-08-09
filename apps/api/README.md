# Ascend API

Fastify API for project metadata and host workbench lifecycle management.

The bootstrap scaffold includes SQLite/Drizzle foundations, structured Fastify logging, and environment-driven OpenTelemetry initialization. The API binds to loopback by default.

| Variable | Default |
|---|---|
| `ASCEND_HOST` | `127.0.0.1` |
| `ASCEND_PORT` | `3000` |
| `ASCEND_DATABASE_URL` | `file:ascend.db` |

Use the repository root `justfile` rather than invoking package commands directly.

## Host workbench proof CLI

`just proof-start` calls the API-owned runtime manager directly; it does not add an HTTP API route. On success it writes exactly one JSON handle with `version`, `pid`, loopback `url`, `runId`, and process `startTimeTicks`. Readiness is an HTTP response in the 200–399 range within 15 seconds. Structured lifecycle events go to stderr.

Pipe the unchanged handle to `just proof-stop`. Stop validates the saved state and process start identity, signals only that process group, escalates within 10 seconds, removes only its run directory below `test-results/bl-001/runs`, and succeeds when repeated after absence. The fixed executable is `/home/vscode/.local/bin/code-server` 4.131.0 and the command refuses root execution. Failure codes cover missing executables, missing or non-directory projects, spawn failure, readiness timeout, early exit, invalid handles, state mismatch, and stop timeout. See [`docs/workbench-proof.md`](../../docs/workbench-proof.md).

## Terminal parity sensor

`just proof-terminal-parity` invokes the API-owned BL-001 proof modules through the existing Playwright episode; it adds no HTTP API. The shared executor directly spawns argument arrays from the canonical fixture, applies a 5,000 ms command timeout, and writes separate raw stdout/stderr plus line-ending-only normalized values. The whole episode is bounded to 90,000 ms. It preflights the six documented tools before browser startup and distinguishes `terminal-executable-missing`, context-specific `terminal-command-nonzero`, `terminal-command-timeout`, `terminal-episode-timeout`, and artifact-write failures. Only `PATH` is retained for environment comparison.
