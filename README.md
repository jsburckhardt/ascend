# Ascend

[![APS version](https://img.shields.io/badge/APS-v1.2.2-blue?logo=github)](https://github.com/chris-buckley/agnostic-prompt-standard/releases/tag/v1.2.2)

Ascend is a browser-based home for development projects that already exist on the host filesystem. It provides a project dashboard and launches persistent code-server workbenches whose integrated terminals use the host development environment.

The MVP goal is to make switching among projects simple without rebuilding IDE capabilities or losing each project's editor and terminal state.

## Project Status

The repository contains the initial TypeScript monorepo scaffold. Product behavior is specified in [`PRD.md`](PRD.md) and will be delivered incrementally.

## Technology

- React, Vite, Tailwind CSS, and shadcn/ui foundations
- Node.js and Fastify
- SQLite and Drizzle ORM
- code-server processes running directly on the host
- Vitest and Playwright
- pnpm workspaces

## Development

The root `justfile` is the command interface:

```text
just setup
just run
just verify-focused apps/web/src/App.test.tsx
just verify-rpiv-harness
just proof-start
just proof-stop
just proof-workbench-capacity
just proof-workbench-capacity-audit
just verify-project-runtime
just proof-project-runtime
just proof-project-runtime-residual-audit
just verify
```

`just run` starts the web application and API together. The web application uses `http://localhost:5173`; the API uses `http://127.0.0.1:3000`.

The devcontainer provides Node.js 22, pnpm, just, and code-server. Its post-create script runs `just setup`, including Playwright's Chromium dependencies, so no manually installed host tools are required for repository development.

RPIV harness integration is APS-governed. The coordinator owns serialized lifecycle calls through the registered VS Code `vscode/runCommand` host tool, which invokes only the `eng-harness-flow` skill with exact lifecycle-hook arguments. Initial and correction seam failures stop before the next stage and return typed `SEAM_FAILURE` details instead of generic verification output. Research, Plan, Implement, and Verify remain least-privilege leaf workers that capture only their own qualifying friction through `harness observe`. `just verify-rpiv-harness` runs the read-only full APS inventory, 26 negative fixtures, executable lifecycle and regression contracts, and the 114-row documentation/profile matrix.

## Host Workbench Proof

On the designated Ubuntu devcontainer, `just proof-start` starts one isolated code-server 4.131.0 against the tracked BL-001 fixture and writes one versioned JSON handle to stdout. Pipe that exact handle to `just proof-stop`; repeated cleanup is safe. The full gate runs the five bounded fake failure cases and two real workbench Chromium scenarios: the forced integrated-terminal timeout cleanup scenario and the passing terminal-parity scenario. See [the workbench proof runbook](docs/workbench-proof.md) for prerequisites, timeouts, diagnostics, evidence, and cleanup boundaries.

## Project Runtime Manager

The API now owns one internal in-memory manager that can start or health-check and reuse a persisted project's code-server. It validates the stable ID and exact canonical path, uses direct non-root loopback launch, coalesces concurrent calls, reports typed bounded failures, and returns graceful or escalated shutdown audits for every exact owned PID/start identity, process group, port, and listener before SQLite closes. Browser workbench traffic now reaches this manager through the stable `/projects/{projectId}/workbench/` proxy route; Project Home wiring remains deferred, and no runtime identity or state is persisted. The retained designated episode is the single source for the observed startup timing versus the 15-second target, PID/port reuse, recursive BL-001 manifest, exact shutdown audit, unrelated-control survival, and zero residuals. See [the project runtime runbook](docs/project-runtime.md).

## Repository Layout

| Path | Purpose |
|---|---|
| `apps/web/` | React project-home application |
| `apps/api/` | Fastify project and workbench lifecycle API |
| `docs/` | Application documentation |
| `project/architecture/` | ADRs and shared core-component contracts |
| `project/work-items/` | RPIV delivery artifacts |

## Documentation

- [`PRD.md`](PRD.md) - MVP requirements and acceptance criteria
- [`docs/`](docs/) - application usage and operational context
- [`CONTRIBUTING.md`](CONTRIBUTING.md) - contribution workflow
- [`AGENTS.md`](AGENTS.md) - agent definitions and pipeline contracts
- [`project/`](project/) - architecture decisions and work-item artifacts

## Terminal Parity Proof

On the designated Ubuntu host, run `just proof-terminal-parity`. The BL-001 Chromium sensor runs the forced integrated-terminal timeout-cleanup scenario and the passing terminal-parity scenario. In the passing scenario, one workbench starts at the canonical fixture, one integrated terminal opens, and direct/integrated host and tool results are compared within a 90,000 ms overall bound. Each command has a 5,000 ms bound.

The exact tool list is `git --version`, `git status --short`, `gh --version`, `tmux -V`, `docker --version`, and `copilot --version`. Only `PATH` is compared; a difference is allowed only when every fixed executable resolves to the same canonical path. See [the workbench proof runbook](docs/workbench-proof.md) for diagnostics, normalization, evidence, and cleanup.

## Browser Workbench Presentation Decision

Run just proof-workbench-presentation on the designated Ubuntu 24.04 devcontainer to execute the BL-003 comparison. It runs exactly three fresh, no-retry 1440 by 900 Chromium attempts for each of two proof-only candidates: embedded code-server and top-level full-page code-server with a minimal Ascend header. The retained comparison selected full-page at the first ordered tie-breaker, with 0 blocking browser protocol violations versus 3 for embedded; both candidates were otherwise eligible. See docs/workbench-proof.md and ADR-260810-full-page-browser-workbench-presentation. This desktop Chromium result is authoritative; tablet validation is separate and non-authoritative. Project Home, routing, runtime, lifecycle, and tablet integration are not implemented by this proof.


## Workbench Capacity Baseline

`just proof-workbench-capacity` runs the designated-host BL-004 diagnostic over fixed cohorts 1, 3, 5, and 10. It retains raw JSON plus a concise comparison under the Issue #11 implementation evidence directory. The three-member cohort is the only MVP gate; five and ten are findings.

A 1,200,000 ms deadline cooperatively aborts in-flight starts, sampling, probes, and workloads. The command keeps its active guard and does not return until coordination has stopped, every discovered member/workload PID and listener has been cleanup-audited, partial evidence has been retained, and guard release finishes; bounded cleanup can therefore finish after the deadline instant. Failed starts and later inspection/attribution failures retain all identities already discovered. Stop, inspection, listener-attribution, and audit failures remain explicit cleanup details/findings and make completeness or disposition nonzero as applicable.

Both 5,000 ms windows sample at or after exact target offsets, and workload stdout plus stderr share one 4,096-byte bound. The comparison separately reports host and process-tree retained/absent counts and explicit missing reasons. `just proof-workbench-capacity-audit` performs the short all-identity, evidence, and BL-001 fixture audit that also ends `just verify` without repeating the expensive episode.

The retained run `853037e6-5dab-43cf-bcf8-61f1e8bbdb18` passed: all 19 requested members remained ready, all workloads passed, host counts were 10/0 per cohort, process-tree counts were 10/0, 30/0, 50/0, and 100/0, final cleanup and fixture integrity passed, and the independent three-member gate passed. This is a diagnostic baseline, not runtime scheduling, quota, sleep, multi-host, BL-010, or BL-013 functionality. See [the workbench proof runbook](docs/workbench-proof.md) for exact prerequisites, bounds, cancellation, sampling, evidence, results, and interpretation.


## Open Project on Project Home

`just run` starts the SQLite-backed API and Project Home. Project Home now provides an accessible `Open Project` form whose persistently labeled `Host path` field describes absolute, `~`, and `~/...` notation. Input text is preserved exactly. Blank input and typed server validation focus the associated field, retain its value, and announce a specific error. Successful created or existing results upsert by stable project ID, restore `createdAt ASC, id ASC` order, scroll and focus the exact Open action, and announce the disposition without reloading.

`POST /api/projects` supports only the `application/json` media type with exactly `{"path":"<host path>"}` up to 4,096 encoded bytes. Missing or other media types—including parser-supported `text/plain` and unsupported `application/xml` or `application/octet-stream`—return safe HTTP 400 `invalid_registration_request` with no registration delegation. Created returns 201 and existing returns 200 as `{"disposition":"created|existing","project":{"id":"...","name":"...","canonicalPath":"...","createdAt":0}}`. Safe typed errors use only `{"error":{"category":"...","field":"path"}}`; malformed contracts use 400 `invalid_registration_request`, oversized bodies use 413 `registration_request_too_large`, and unexpected failures use 500 `project_registration_failed`. Configure the opening policy with `ASCEND_PROJECT_HOME` and path-delimiter-separated `ASCEND_PROJECT_ALLOWED_ROOTS`; defaults allow the configured host home.

Registration attempts are bounded to 10 seconds and project lists to 5 seconds. Pending registration has active Cancel and blocks duplicate requests. Positive pre-send unavailability and ordinary cancellation return to editing without card changes. Any ambiguous post-send outcome locks and displays the exact JSON payload and exposes only `Retry same submission` and `Refresh projects`. Retry reuses identical bytes. Authoritative refresh compares stable IDs against the pre-submit snapshot: one new ID is activated, zero unlocks with a no-new-project message, and multiple retain the complete list until explicit reset. One monotonic generation owns every request, cancellation, timeout, refresh, reset, and unmount, so stale completions are inert.

Card Open remains a project-ID keyboard action that announces the deferred workbench behavior and performs no navigation or request. Picker integration, scanning, clone/import, running or failed workbench close, search, user sorting, tags, path mutation, BL-010, and BL-012 remain out of scope. No migration is required. Use `just verify-open-project`, `just verify-focused <test-path>`, and `just verify`. Executed evidence is generated under `test-results/bl-008/open-project/`. The bounded episode passed. `episode.json` maps the successful keyboard-only Chromium episode to unchanged fixtures and zero owned residuals. `cleanup-matrix.json` maps startup failure, assertion failure, episode timeout, interrupted graceful shutdown, and surviving-descendant scenarios to process-group, listener, database/sidecar, and fixture audits. The interrupted scenario records `gracefulStop: false` followed by successful bounded escalation. The surviving-descendant scenario records detection and `ownerCleanupPassed: false` until its exact PID is removed by test teardown, after which `teardownClean` is true.


## Close a stopped project (BL-009)

Project Home provides one keyboard-focusable Close action per registered card. It opens a modal named Close <project name>? with the exact confirmation copy: Closing removes this project registration from Ascend. The filesystem directory and files will not be deleted. Tab and Shift+Tab stay within available dialog controls. Escape and Cancel before transmission send no DELETE request and restore the activating Close action. Destructive Confirm is required; one attempt owns one request, announces pending state, and removes Cancel after transmission.

DELETE /api/projects/{stable-id} closes only the metadata registration. A successful one-transaction SQLite removal returns HTTP 200 with {id:stable-id, disposition:closed}. Malformed IDs return 400 invalid_project_id, unknown or already absent IDs return 404 project_not_found, and rollback-safe persistence failures return 500 project_close_failed. Failure envelopes contain only their safe category. Fastify request logging redacts `req.url` as `[request-url-redacted]`, so encoded or decoded stable-ID sentinels never enter access or close-event logs. The service receives only the metadata library, invokes no project-filesystem API, and adds no schema, migration, soft-delete, archive, runtime-state, or product cleanup behavior.

Success removes only the matching stable-ID card without reload, announces closure, and focuses the next Close action, then the previous Close action, or the Ascend heading; the final card reveals the existing empty state. Definitive no-mutation failures preserve the card and allow same-ID Retry. Timeout, reset, invalid contract, and every other ambiguous post-transmission result preserve the card, lock the original ID, and require the authoritative GET project list. Presence enables same-ID Retry; absence applies normal success; failed or invalid refresh remains locked with Refresh projects. Stale and unmounted completions are inert.

Run just verify-close-project for the isolated service, API, client, controller, component, non-mutation, documentation, and real desktop Chromium matrices; just verify remains the complete gate. Generated evidence is under test-results/bl-009/close-project and test-results/bl-008/open-project/close-fault-episode.json. The executed manifest matrix records complete before/after membership, bytes, symlink targets, modes, and nanosecond timestamps for Cancel, success, unknown, persistence failure, transport ambiguity, retry, already absent, and the combined eight-DELETE route scenario before test-only fixture cleanup. Browser cleanup owns only recorded process groups, listeners, isolated database sidecars, and disposable fixtures. Text-safety validation executes one-character and 4,096-character bounded project name/path fixtures; this is a test bound, not a new product maximum. The existing registration contract remains the only finite input limit: 4,096 encoded body bytes, with byte 4,097 rejected.

This delivery applies only to registered stopped projects. Closing a running or failed workbench, runtime stop/restart, archive, undo, bulk close, and product deletion remain BL-020 or later scope.


## Stable Project Workbench Route

The API owns `/projects/{projectId}/workbench/` and descendants for streamed HTTP and WebSocket traffic. It resolves persisted metadata, starts or reuses one BL-010 loopback runtime, preserves full-page Explorer, Preview, and terminal behavior, and keeps the internal runtime authority out of public surfaces. Redirects, cookies, service-worker scope, hop headers, finite failures, backpressure, cancellation, evidence disclosure, and shutdown follow the [stable-routing runbook](docs/stable-workbench-routing.md).

Use `just verify-workbench-route` for the complete fake matrices and exact three-navigation Chromium workflow, or `just proof-workbench-route-residual-audit` for the independent cleanup audit. `just verify` includes the complete gate. No new configuration or migration is required. BL-012 Project Home/header wiring, multi-project policy, public authentication, TLS, public networking, and multi-host operation remain out of scope.
