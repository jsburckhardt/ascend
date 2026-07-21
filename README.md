# Ascend

<!-- Replace with a short description of your project. -->
[![APS version](https://img.shields.io/badge/APS-v1.2.2-blue?logo=github)](https://github.com/chris-buckley/agnostic-prompt-standard/releases/tag/v1.2.2)

Ascend is a workflow orchestrator for developers who work across many projects.

## Product boundary

**Ascend orchestrates; VS Code provides the IDE.** Ascend's job is cross-project
workflow — opening, closing, switching, and resuming projects — while the editing
experience is delivered by an existing browser-based VS Code (initially
[`code-server`](https://github.com/coder/code-server)). Ascend does **not** rebuild
IDE features; it coordinates the projects and the runtime around the editor.

This repository is a greenfield baseline. It is deliberately independent of any prior
implementation, and no prior codebase has been migrated into it.

## Directory structure

```text
/
├── README.md          # Product boundary + single documented setup entry point
├── package.json       # Project manifest (stack, engines, scripts)
├── package-lock.json  # Reproducible dependency lock
├── tsconfig.json      # Minimal TypeScript compiler configuration
├── .nvmrc             # Pinned Node.js version
├── src/               # Application source (node:http server: shell + /health)
├── docs/              # Application-specific documentation
└── project/           # Soft Factory pipeline artifacts (ADRs, core-components, issues)
```

Application source lives under `src/`. It now contains Ascend's first running
service — a `node:http` server (`src/server.ts`) that serves the application
shell and the `/health` endpoint, started by the `src/main.ts` entry point (see
[ADR-0005](project/architecture/ADR/ADR-0005-application-serve-runtime.md)).

## Getting Started

Ascend uses Node.js and TypeScript (see
[ADR-0002](project/architecture/ADR/ADR-0002-ascend-baseline-stack-and-layout.md)).

1. Clone the repository.
2. Ensure the pinned Node.js version is active. The version is pinned in
   [`.nvmrc`](.nvmrc) and enforced by the `engines` field in `package.json`
   (Node.js 22 LTS). With [nvm](https://github.com/nvm-sh/nvm): `nvm use`.
3. From the repository root, run the single setup command:

   ```bash
   npm install
   ```

That is the only setup step.

> **Offline dependency caveat.** `@types/node` is a **compile-time-only**
> devDependency — it types `node:http`/`node:test` for `tsc`; the application and
> its tests run with **zero installed packages**. If `package-lock.json` could not
> be refreshed in a network-blocked environment, run `npm install` once on a
> connected machine to reconcile the lock. The verification gate is
> `tsc --noEmit` (not `npm ci`), so a stale lock does **not** block
> `./harness verify`.

## Development and validation

Ascend's single, documented operating surface is the engineering harness
(`./harness`, see [ADR-0003](project/architecture/ADR/ADR-0003-repo-local-engineering-harness.md)
and [`.harness/README.md`](.harness/README.md)). Prefer `./harness <verb>` over
calling a wrapped command directly.

### Start the local development environment

```bash
./harness dev           # preferred — single operating surface
npm run dev             # the underlying script that ./harness dev execs
```

`./harness dev` starts the local development environment through the harness. It
is an **interactive handoff**: the harness `exec`s `npm run dev` (which runs
`tsc --noEmit --watch`) — the Prototype-0 development inner loop that gives
continuous TypeScript typecheck feedback as you edit `src/`. Because it hands off
the process, it emits **no verdict** and writes no evidence; leave it running and
press Ctrl-C to stop. To see what it would run without starting the watch, use
`./harness dev --print` (prints `npm run dev`) or `./harness dev --json` (a JSON
handoff descriptor). See
[ADR-0004](project/architecture/ADR/ADR-0004-interactive-handoff-verbs.md) for
the interactive/handoff verb (`mode: exec`) behavior.

> **`./harness dev` is a typecheck watch, not a server.** It gives continuous
> `tsc --noEmit` feedback as you edit `src/`; it does **not** serve HTTP. To run
> the application itself (shell + `/health`), use **`./harness boot`** — a
> distinct concern, documented next.

### Run the application (shell + health)

```bash
./harness boot          # preferred — single operating surface
npm run start           # the underlying script that ./harness boot execs
```

`./harness boot` starts the Ascend application through the harness. Like
`./harness dev`, it is an **interactive handoff** (`mode: exec`): the harness
`exec`s `npm run start`, which runs `node --experimental-strip-types
src/main.ts` — the `node:http` server. Because it hands off the long-running
process, it emits **no verdict** and writes no evidence; leave it running and
press Ctrl-C to stop. To resolve the command **without** starting the server,
use `./harness boot --print` (prints `npm run start`) or `./harness boot --json`
(a JSON handoff descriptor).

The server listens on **port 3000** by default; override it with the **`PORT`**
environment variable (e.g. `PORT=8080 ./harness boot`). Routes:

| Route | Method | Response |
|-------|--------|----------|
| `/health` | `GET` | `200`, `application/json`, body `{"status":"ok"}` |
| `/` | `GET` | `200`, `text/html`, a deliberately thin application shell |
| any other | any | `404` |

Verify it quickly (in another shell, while `./harness boot` runs):

```bash
curl -s localhost:3000/health   # {"status":"ok"}
curl -s localhost:3000/         # the application shell HTML
```

### Validate the codebase

```bash
./harness verify        # preferred — single operating surface
npm run typecheck       # the underlying check that verify wraps
```

`./harness verify` wraps `npm run typecheck` and aggregates the other checks. It
returns **`degraded`** and **exits `0`** — the expected, **non-blocking**
"passing" state, not a failure. Per the harness exit-code contract (ADR-0003 /
CORE-COMPONENT-0003) only a real `fail` exits non-zero; `pass`, `degraded`, and
`unknown` all exit `0`. Since issue #6 wired the `test` verb, the aggregate now
proves the health/shell behaviour: `typecheck=pass`, **`test=pass`** (`npm test`
runs the `node:test` suites under `tests/app/`), `doctor=pass`, while `lint` and
`build` stay `unknown` (no linter or build step is added ahead of a validated
need — ADR-0002, avoid speculative frameworks). That mix (some `pass`, some
`unknown`, no `fail`) is why `verify` stays `degraded`. It turns **`fail`** only
if `tsc --noEmit` **or** `npm test` fails. `verify` therefore needs
`node_modules` present so `tsc --noEmit` can typecheck against `@types/node`; the
`node:test` suite itself runs with zero installed packages. Run directly,
`npm run typecheck` exits `0`.

## Documentation

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — pipeline workflow, how to contribute via GitHub Issues, and where artifacts belong
- [`AGENTS.md`](AGENTS.md) — agent definitions, guardrails, and pipeline specification
- [`docs/`](docs/) — application-specific documentation (API docs, user guides, etc.)
- [`project/`](project/) — architecture decisions, core-components, and per-issue pipeline artifacts
