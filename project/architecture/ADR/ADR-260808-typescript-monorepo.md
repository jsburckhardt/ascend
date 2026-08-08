# ADR-260808-typescript-monorepo: TypeScript Monorepo and Host Workbench Stack

## Status

Accepted

## Context

Ascend needs a browser project home, a local lifecycle API, durable project metadata, and browser-hosted VS Code workbenches that preserve the development host's tools and user environment. The MVP must validate host-native terminal behavior before expanding into broader IDE functionality.

## Decision

Ascend uses a pnpm TypeScript monorepo with:

- React, Vite, Tailwind CSS, and shadcn/ui foundations for the web application
- Node.js and Fastify for the API
- SQLite and Drizzle ORM for metadata persistence
- Vitest and Playwright for automated validation
- code-server processes launched directly on the host, initially one runtime per active project

The repository is organized into `apps/web` and `apps/api`. Ascend owns project navigation and runtime lifecycle; code-server owns editing, terminals, file exploration, previews, Git UI, and extensions.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Next.js | Integrated full-stack framework | Adds server-rendering and routing complexity not required by the two-surface MVP | React/Vite and Fastify keep browser and host-process responsibilities explicit |
| Per-project containers | Stronger isolation | Breaks or complicates host tool, credential, socket, and shell parity | Host-native terminal behavior is an MVP requirement |
| PostgreSQL and Redis | Mature multi-user infrastructure | Adds services and operations beyond local metadata needs | SQLite is sufficient for the single-host MVP |
| Custom editor and terminal | Complete product control | Reimplements mature IDE capabilities | Ascend intentionally delegates IDE behavior to code-server |

## Consequences

### Positive
- Frontend and backend share TypeScript tooling and package management.
- Workbench terminals can use the configured host user's environment.
- The application boundary remains smaller than an IDE implementation.

### Negative
- Multiple code-server processes may consume significant host resources.
- Host process lifecycle and reverse-proxy behavior require careful isolation and testing.
- Initial assumptions are specific to the selected development host.

### Neutral
- Cross-platform and multi-user support remain deferred until after MVP validation.

## Related Issues

- None. This decision establishes the initial project foundation from `PRD.md`.

## References

- [`PRD.md`](../../../PRD.md)
- [code-server documentation](https://coder.com/docs/code-server)
