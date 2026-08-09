# Host code-server workbench proof

BL-001 provides a bounded designated-host proof. It is an operational validation surface, not an HTTP API or a general multi-project runtime.

## Prerequisites

- Ubuntu 24.04.4 LTS host `03f809395a5d`
- non-root user `vscode` (uid 1000)
- repository at `/workspaces/ascend`
- `/home/vscode/.local/bin/code-server` version 4.131.0
- Chromium installed by `just setup`

The tracked project fixture is `/workspaces/ascend/tests/fixtures/bl-001/workbench project;BL-001`. Its space and literal semicolon prove one argument-array path. `EXPLORER-SENTINEL-BL-001.txt` and `WORKBENCH-PREVIEW.md` are integrity sentinels; the rendered Markdown text is `BL-001 Markdown Preview Rendered Sentinel`.

## Start and stop

Run from the repository root:

```sh
handle=$(just proof-start)
printf '%s\n' "$handle" | just proof-stop
printf '%s\n' "$handle" | just proof-stop
```

Start writes structured lifecycle events to stderr and exactly one versioned JSON handle to stdout:

```json
{
  "version": 1,
  "pid": 12345,
  "url": "http://127.0.0.1:34567/",
  "runId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "startTimeTicks": "123456"
}
```

The launcher canonicalizes an existing readable directory, directly spawns code-server without a shell, binds `127.0.0.1:0`, disables authentication, telemetry, update checks, and workspace trust, and isolates user and extension data. Readiness is the first HTTP status from 200 through 399 at the emitted URL. Startup is bounded to 15 seconds. Browser interaction is bounded to 60 seconds.

Stop reads the unchanged handle from stdin, validates its saved PID, URL, run ID, and process start identity, then signals only that dedicated process group. It escalates from SIGTERM to SIGKILL within 10 seconds. A repeated stop succeeds after the exact process is absent.

## Failure diagnostics

Failures exit nonzero and emit one structured `runtime.start.failed` or `runtime.stop.failed` event on stderr. Expected startup codes are:

| Condition | Code | Relevant detail |
|---|---|---|
| Missing code-server | `executable-missing` | executable path |
| Nonexistent project | `project-missing` | input path |
| Project is not a directory | `project-not-directory` | canonical path |
| HTTP readiness deadline | `readiness-timeout` | timeout milliseconds |
| Process exits before readiness | `early-exit` | exit code |

Other explicit lifecycle codes cover unreadable projects, root execution, spawn failure, invalid handles, state mismatch, and stop timeout. Diagnostics exclude environment values, source contents, and raw child output.

## Artifacts and cleanup

The only disposable boundary is `test-results/bl-001`. Per-run state, logs, user data, and extensions stay below `test-results/bl-001/runs/<runId>` and that exact run directory is removed by stop or startup-failure cleanup. `test-results/bl-001/injection-sentinel` must remain absent. The tracked fixture is never removed or modified.

The Chromium proof writes `test-results/bl-001/episode.json` with host facts, handle, readiness exits, process identities, NUL-delimited argv represented as arrays, loopback listeners, fixture hashes, browser observations, and cleanup results. Playwright traces and screenshots are failure-only artifacts. Generated evidence is ignored; the safe retained AC mapping is the issue implementation record.

If a prior run directory exists, do not delete its state until its exact handle is proven absent. Never kill by process name and never sweep unrelated listeners; the host may run unrelated VS Code Remote processes.

## Validation

```text
just verify-focused apps/api/test/workbench-proof-contract.test.ts apps/api/test/workbench-proof-runtime.test.ts apps/api/test/workbench-proof-failures.test.ts
just test-e2e
just verify
```

The configured full gate runs exactly five fake startup failures and one real code-server Chromium lifecycle, alongside existing checks. Its BL-001 full-gate target is 120 seconds. Every browser path places exact-handle stop in `finally`, repeats stop for idempotence, and audits PID, listener, fixture, injection sentinel, and disposable state.

## Troubleshooting

- `executable-missing`: confirm the fixed executable exists and reports 4.131.0.
- `root-user-forbidden`: run as `vscode`, not through privilege elevation.
- `readiness-timeout`: inspect the structured condition and rerun only after confirming no exact handle is live.
- Browser sentinel failure: retain Playwright failure artifacts; cleanup still runs against the emitted handle.
