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
just verify
```

`just run` starts the web application and API together. The web application uses `http://localhost:5173`; the API uses `http://127.0.0.1:3000`.

The devcontainer provides Node.js 22, pnpm, just, and code-server. Its post-create script runs `just setup`, including Playwright's Chromium dependencies, so no manually installed host tools are required for repository development.

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
