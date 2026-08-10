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

Run just proof-workbench-presentation on the designated Ubuntu 24.04 devcontainer to execute the BL-003 comparison. It runs exactly three fresh, no-retry 1440 by 900 Chromium attempts for each of two proof-only candidates: embedded code-server and top-level full-page code-server with a minimal Ascend header. The retained comparison selected full-page at the first ordered tie-breaker, with 6 blocking browser protocol violations versus 9 for embedded; both candidates were otherwise eligible. See docs/workbench-proof.md and ADR-260810-full-page-browser-workbench-presentation. This desktop Chromium result is authoritative; tablet validation is separate and non-authoritative. Project Home, routing, runtime, lifecycle, and tablet integration are not implemented by this proof.
