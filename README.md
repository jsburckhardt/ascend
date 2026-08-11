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
just proof-start
just proof-stop
just proof-workbench-capacity
just proof-workbench-capacity-audit
just verify
```

`just run` starts the web application and API together. The web application uses `http://localhost:5173`; the API uses `http://127.0.0.1:3000`.

The devcontainer provides Node.js 22, pnpm, just, and code-server. Its post-create script runs `just setup`, including Playwright's Chromium dependencies, so no manually installed host tools are required for repository development.

## Host Workbench Proof

On the designated Ubuntu devcontainer, `just proof-start` starts one isolated code-server 4.131.0 against the tracked BL-001 fixture and writes one versioned JSON handle to stdout. Pipe that exact handle to `just proof-stop`; repeated cleanup is safe. The full gate runs the five bounded fake failure cases and two real workbench Chromium scenarios: the forced integrated-terminal timeout cleanup scenario and the passing terminal-parity scenario. See [the workbench proof runbook](docs/workbench-proof.md) for prerequisites, timeouts, diagnostics, evidence, and cleanup boundaries.

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

`POST /api/projects` accepts only `application/json` with exactly `{"path":"<host path>"}` up to 4,096 encoded bytes. Created returns 201 and existing returns 200 as `{"disposition":"created|existing","project":{"id":"...","name":"...","canonicalPath":"...","createdAt":0}}`. Safe typed errors use only `{"error":{"category":"...","field":"path"}}`; malformed contracts use 400 `invalid_registration_request`, oversized bodies use 413 `registration_request_too_large`, and unexpected failures use 500 `project_registration_failed`. Configure the opening policy with `ASCEND_PROJECT_HOME` and path-delimiter-separated `ASCEND_PROJECT_ALLOWED_ROOTS`; defaults allow the configured host home.

Registration attempts are bounded to 10 seconds and project lists to 5 seconds. Pending registration has active Cancel and blocks duplicate requests. Positive pre-send unavailability and ordinary cancellation return to editing without card changes. Any ambiguous post-send outcome locks and displays the exact JSON payload and exposes only `Retry same submission` and `Refresh projects`. Retry reuses identical bytes. Authoritative refresh compares stable IDs against the pre-submit snapshot: one new ID is activated, zero unlocks with a no-new-project message, and multiple retain the complete list until explicit reset. One monotonic generation owns every request, cancellation, timeout, refresh, reset, and unmount, so stale completions are inert.

Card Open remains a project-ID keyboard action that announces the deferred workbench behavior and performs no navigation or request. Picker integration, scanning, clone/import, close, search, user sorting, tags, path mutation, BL-010, and BL-012 remain out of scope. No migration is required. Use `just verify-open-project`, `just verify-focused <test-path>`, and `just verify`. Executed evidence is generated under `test-results/bl-008/open-project/`. The bounded episode passed. `episode.json` maps the successful keyboard-only Chromium episode to unchanged fixtures and zero owned residuals. `cleanup-matrix.json` maps startup failure, assertion failure, episode timeout, interrupted graceful shutdown, and surviving-descendant scenarios to process-group, listener, database/sidecar, and fixture audits. The interrupted scenario records `gracefulStop: false` followed by successful bounded escalation. The surviving-descendant scenario records detection and `ownerCleanupPassed: false` until its exact PID is removed by test teardown, after which `teardownClean` is true.
