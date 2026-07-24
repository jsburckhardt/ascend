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
├── scripts/           # Process-orchestration scripts (e.g. code-server launcher)
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
2. Ensure a supported Node.js version is active. The runtime floor is
   **Node.js ≥ 22.6.0 (< 23)** — pinned in [`.nvmrc`](.nvmrc) (`22`, which nvm
   resolves to the newest 22.x, i.e. ≥ 22.6.0) and enforced by the `engines`
   field (`>=22.6.0 <23`) in `package.json`. The **≥ 22.6.0** floor is required
   because the app runs via `node --experimental-strip-types` (see
   [Run the application](#run-the-application-shell--health)), a flag that first
   shipped in Node **v22.6.0**; Node 22.0–22.5 cannot run it. With
   [nvm](https://github.com/nvm-sh/nvm): `nvm use`.
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

> **Runtime floor.** `--experimental-strip-types` first shipped in Node
> **v22.6.0**, so the app requires **Node.js ≥ 22.6.0 (< 23)** (matching
> `engines.node`). On Node 22.0–22.5 `npm run start`/`npm test` fail before
> executing; `./harness doctor` reports **`degraded`** (never `fail`) on such a
> runtime, naming the `>=22.6.0` floor.

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

### Launch the editor (code-server)

Ascend's editing experience is delivered by a browser-based VS Code
([`code-server`](https://github.com/coder/code-server)) — Ascend orchestrates;
code-server provides the IDE. Launch **one** code-server instance against a
configured project folder through the harness:

```bash
PROJECT_PATH=/path/to/project ./harness edit   # preferred — single operating surface
npm run edit                                    # the underlying script ./harness edit execs
```

`./harness edit` is an **interactive handoff** (`mode: exec`, like `./harness
boot`/`dev`): the harness `exec`s `npm run edit`, which runs
`sh scripts/launch-editor.sh` — the single, dependency-light **launcher seam**
that owns every code-server-specific flag (PRD §5.7,
[ADR-0006](project/architecture/ADR/ADR-0006-code-server-launch-and-project-path-safety.md)).
Being a handoff it emits **no verdict** and writes no evidence; leave it running
and press **Ctrl-C** to stop. To resolve the command **without** launching the
editor, use `./harness edit --print` (prints `npm run edit`) or `./harness edit
--json` (a JSON handoff descriptor).

**Configuration** (provider-agnostic inputs; every code-server flag stays behind
the launcher, §5.7):

| Variable | Required | Default | Meaning |
|----------|----------|---------|---------|
| `PROJECT_PATH` | **yes** | — | The directory code-server opens. Must be an existing directory. |
| `EDITOR_PORT` | no | `8080` | Loopback port; the editor binds `127.0.0.1:${EDITOR_PORT}`. |

The instance binds **loopback only** (`127.0.0.1`) and runs with **`--auth
none`**. That posture is acceptable **only** for this local Prototype-0 spike
(authentication and non-local exposure are out of scope for #7); it must be
revisited before any shared or remote exposure.

**Prerequisite — install code-server yourself.** code-server is **not** bundled
with Node/npm and is absent in this devcontainer/CI. Install it before the demo,
e.g. the official one-line installer:

```bash
curl -fsSL https://code-server.dev/install.sh | sh
```

(or add a devcontainer feature). The launcher **does not install it** — if
`code-server` is not on `PATH` it fails fast with a clear message and a non-zero
exit (`code-server not found …`), which is a documented prerequisite, not a repo
defect.

**Invalid-path behaviour (AC4).** Before launching, the launcher validates
`PROJECT_PATH` with **read-only** checks and fails fast — printing a clear
message to **stderr** and exiting **non-zero** — in each of these cases, **before
any attempt to start code-server**:

| Case | Behaviour |
|------|-----------|
| `PROJECT_PATH` unset or empty | error naming `PROJECT_PATH`, exit `1` |
| `PROJECT_PATH` does not exist | error `… does not exist`, exit `1` (the path is **not** created) |
| `PROJECT_PATH` is a file, not a directory | error `… is not a directory`, exit `1` |
| `code-server` not installed | error `code-server not found …`, non-zero exit |

**Read-only safety guarantee (AC5).** The launcher **never** creates, deletes,
moves, renames, resets, or cleans `PROJECT_PATH` on any code path — validation
uses only non-mutating tests (no `mkdir`/`rm`/`mv`). Launching, and later
stopping, the editor does not modify the project directory itself (files you edit
*inside* the running editor change in place — that is expected editing, not the
launcher's footprint).

**Manual demo (AC1–AC3), on a code-server-provisioned host.** Because code-server
is a prerequisite, the browser/terminal acceptance criteria are demonstrated
manually:

1. Install code-server (above) and export `PROJECT_PATH` to a real local folder.
2. Run `PROJECT_PATH=<folder> ./harness edit`. **Record the startup command**
   (`code-server <folder> --bind-addr 127.0.0.1:8080 --auth none`) and **time the
   startup duration** (PRD §29 evidence).
3. Open `http://127.0.0.1:8080` in a browser → the editor loads with the
   **configured folder open** (AC2).
4. Open the **integrated terminal** and run a command (e.g. `pwd`, `ls`) → it runs
   in the configured folder (AC3).
5. Press **Ctrl-C** to stop; confirm the folder is unchanged (AC5).

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

> **code-server readiness is required (ADR-0008).** `./harness doctor` also probes
> the editor provider: when `command -v code-server` is empty it returns
> **`fail`** (not `degraded`), which makes `./harness verify` **`fail` (exit 1)**
> because `doctor` is a `verify` aggregate member. code-server is a required
> dependency for a stable environment and is provisioned in
> [`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json); the probe
> target is overridable for tests via `HARNESS_CODE_SERVER`. Node/`node_modules`
> checks stay `degraded` (never `fail`) — only code-server is fail-when-absent.

### Recording friction (self-attributed)

When a verb cannot prove something, record a **friction** entry answering the
KEY_QUESTION. Agents self-attribute with the **`--agent <name>` flag** (additive;
defaults to the `unknown` sentinel when omitted, which is also how legacy records
read):

```sh
./harness friction add --agent rpiv-research --verb test \
  --inference "No test runner exists" \
  --proof-gap "No npm test script or test files" \
  --suggested-closure "Wire the test verb in contract.yml"
./harness friction list --json          # each entry carries an "agent" field
```

## Documentation

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — pipeline workflow, how to contribute via GitHub Issues, and where artifacts belong
- [`AGENTS.md`](AGENTS.md) — agent definitions, guardrails, and pipeline specification
- [`docs/`](docs/) — application-specific documentation (API docs, user guides, etc.)
- [`project/`](project/) — architecture decisions, core-components, and per-issue pipeline artifacts
