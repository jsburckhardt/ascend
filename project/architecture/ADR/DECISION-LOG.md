# Decision Log

This file is the single registry of all architectural decisions and core-components in the project. Every new or modified ADR or core-component **must** be recorded here.

## ADRs

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-0002 | Ascend baseline technology stack and repository layout | Accepted | 2026-07-14 |
| ADR-0003 | Adopt a repo-local engineering harness (`./harness`) as the operating surface for humans and agents | Accepted | 2026-07-20 |
| ADR-0004 | Interactive/handoff verbs in the engineering harness (`./harness dev`) | Accepted | 2026-07-20 |
| ADR-0005 | Ascend application-serve runtime (HTTP server, TypeScript runtime execution, and `boot` lifecycle) | Accepted (refined 2026-07-21: Node ≥22.6.0 runtime floor) | 2026-07-21 |
| ADR-0006 | code-server editor-provider launch, argument isolation, and read-only project-path safety | Accepted (§7/Decision #71 superseded in part by ADR-0008, 2026-07-23) | 2026-07-21 |
| ADR-0007 | Agent-attributed friction and issue-scoped retrospect (no persistent improvement store) | Accepted | 2026-07-23 |
| ADR-0008 | code-server readiness is a required `doctor` check that fails when absent | Accepted | 2026-07-23 |

## Core-Components

| ID | Title | Status | Date |
|----|-------|--------|------|
| CORE-COMPONENT-0002 | Commit Standards | Adopted | 2026-05-05 |
| CORE-COMPONENT-0003 | Engineering harness contract, verdicts, and evidence/friction conventions | Adopted (amended 2026-07-20 R17; 2026-07-23 R18/R19) | 2026-07-20 |

## Decisions

Short, actionable statements derived from ADRs and core-components. More than one decision can originate from a single source.

| # | Decision | Source | Date |
|---|----------|--------|------|
| 1 | Enforce Conventional Commits v1.0.0 on every commit message | CORE-COMPONENT-0002 | 2026-05-05 |
| 2 | Require Conventional Commits format on PR titles | CORE-COMPONENT-0002 | 2026-05-05 |
| 3 | Require Co-authored-by trailer on all AI-authored commits | CORE-COMPONENT-0002 | 2026-05-05 |
| 4 | Adopt TypeScript as the implementation language for Ascend | ADR-0002 | 2026-07-14 |
| 5 | Use Node.js 22 LTS as the runtime, pinned via package.json engines and .nvmrc | ADR-0002 | 2026-07-14 |
| 6 | Use npm as the package manager with a committed package-lock.json | ADR-0002 | 2026-07-14 |
| 7 | Require package.json and tsconfig.json as the minimal project manifest | ADR-0002 | 2026-07-14 |
| 8 | Place all application source under the src/ directory | ADR-0002 | 2026-07-14 |
| 9 | Use `npm install` from the repo root as the single documented setup entry point | ADR-0002 | 2026-07-14 |
| 10 | Prohibit application frameworks and features at bootstrap, deferring to later prototypes | ADR-0002 | 2026-07-14 |
| 11 | Prohibit migrating DevDeck code, config, or conventions into the repository | ADR-0002 | 2026-07-14 |
| 12 | Adopt `./harness` as the mandatory first-choice operating surface for humans and agents | ADR-0003 | 2026-07-20 |
| 13 | Wrap existing project commands in the harness; never reimplement or invent a build system | ADR-0003 | 2026-07-20 |
| 14 | Implement the harness as a dependency-light, portable POSIX shell script | ADR-0003 | 2026-07-20 |
| 15 | Wrap `npm run typecheck` under the harness `verify` verb only, not `lint` or `build` | ADR-0003 | 2026-07-20 |
| 16 | Create `.github/soft-factory/verification.yml` running `./harness verify` as the canonical gate | ADR-0003 | 2026-07-20 |
| 17 | Add the harness-usage rule only to the RPIV stage agents (`rpiv-research`/`rpiv-planner`/`rpiv-implementer`/`rpiv-verifier`); the `ship` orchestrator, `AGENTS.md`, and non-stage agents run no harness | ADR-0003 | 2026-07-20 |
| 18 | Return exactly one verdict — pass, fail, degraded, or unknown — from every harness verb | CORE-COMPONENT-0003 | 2026-07-20 |
| 19 | Exit non-zero only on `fail`; exit 0 for pass, degraded, and unknown | CORE-COMPONENT-0003 | 2026-07-20 |
| 20 | Record every honest capability gap as a friction entry answering the KEY_QUESTION verbatim | CORE-COMPONENT-0003 | 2026-07-20 |
| 21 | Write a timestamped evidence record under `.harness/evidence/` on every `verify` run | CORE-COMPONENT-0003 | 2026-07-20 |
| 22 | Support `--json` with a stable schema on every machine-facing harness verb | CORE-COMPONENT-0003 | 2026-07-20 |
| 23 | Declare verb-to-command mappings in `.harness/contract.yml` so verbs are wired by data | CORE-COMPONENT-0003 | 2026-07-20 |
| 24 | Require exactly one marker-delimited, idempotent harness block inside `<instructions>` on each consuming agent surface, and none on non-consumers | CORE-COMPONENT-0003 | 2026-07-20 |
| 25 | Commit `contract.yml`, `README.md`, and `friction.jsonl`; git-ignore `.harness/evidence/` run output | CORE-COMPONENT-0003 | 2026-07-20 |
| 26 | Derive `verify`'s verdict by iterating contract-declared member checks, not a hard-coded list | ADR-0003, CORE-COMPONENT-0003 | 2026-07-20 |
| 27 | Apply fixed verify aggregate rule: any fail⇒fail, all pass⇒pass, all unknown⇒unknown, else degraded | CORE-COMPONENT-0003 | 2026-07-20 |
| 28 | ~~Include `doctor` in the verify aggregate; it may degrade but never fail it~~ — **SUPERSEDED by ADR-0008 (2026-07-23)** for the code-server case: `doctor` now fails when code-server is absent | ADR-0003, CORE-COMPONENT-0003 | 2026-07-20 |
| 29 | Read every wrapped command from `maps_to`; prohibit hard-coded verb-to-command wiring | CORE-COMPONENT-0003 | 2026-07-20 |
| 30 | Wire `clean` via `clean.maps_to`; run a mapped clean command instead of ignoring it | CORE-COMPONENT-0003 | 2026-07-20 |
| 31 | Emit exactly one terminal `Verdict:` line from every human verb form, including help and friction list | CORE-COMPONENT-0003 | 2026-07-20 |
| 32 | Escape JSON with POSIX-only constructs; prohibit GNU-only sed idioms | CORE-COMPONENT-0003 | 2026-07-20 |
| 33 | Test harness portability on a non-GNU userland with multiline and control-character inputs | CORE-COMPONENT-0003 | 2026-07-20 |
| 34 | Generate collision-safe evidence filenames and write evidence atomically | CORE-COMPONENT-0003 | 2026-07-20 |
| 35 | Return `fail` when a required evidence or friction record cannot be persisted | CORE-COMPONENT-0003 | 2026-07-20 |
| 36 | Validate the complete supported Node range declared by `engines.node` (enforce both bounds); report out-of-range Node as unsupported (degraded) | CORE-COMPONENT-0003 | 2026-07-20 |
| 37 | Maintain a durable executable harness regression suite enforcing CORE-COMPONENT-0003 | CORE-COMPONENT-0003 | 2026-07-20 |
| 38 | Add a `./harness dev` verb that execs `npm run dev` as a process handoff | ADR-0004 | 2026-07-20 |
| 39 | Introduce interactive/handoff verbs that hand off the process instead of returning a verdict | ADR-0004 | 2026-07-20 |
| 40 | Keep `boot` unmapped and reserved for issue #6 app-serve and health | ADR-0004 | 2026-07-20 |
| 41 | Prohibit mapping long-running watch/serve commands into the run-to-completion capability handler | ADR-0004 | 2026-07-20 |
| 42 | Declare interactive/handoff verbs with `mode: exec` in `.harness/contract.yml` as data | CORE-COMPONENT-0003 | 2026-07-20 |
| 43 | Exempt `mode: exec` handoff verbs from the single-verdict, exit-code, and evidence rules | CORE-COMPONENT-0003 | 2026-07-20 |
| 44 | Require handoff verbs to expose a non-exec `--print`/`--json` introspection form that exits 0 | CORE-COMPONENT-0003 | 2026-07-20 |
| 45 | Exclude `mode: exec` verbs from run-to-completion enumeration in the harness regression suite | CORE-COMPONENT-0003 | 2026-07-20 |
| 46 | Propagate the exec'd command's exit code for handoff verbs instead of a verdict mapping | CORE-COMPONENT-0003 | 2026-07-20 |
| 47 | Use Node built-in `node:http` for the app-serve HTTP server; prohibit web frameworks | ADR-0005 | 2026-07-21 |
| 48 | Execute `src/` TypeScript at runtime via `node --experimental-strip-types` (requires Node ≥22.6.0); add no build/emit step | ADR-0005 | 2026-07-21 |
| 49 | Add `@types/node` as a compile-time-only devDependency to typecheck Node built-ins | ADR-0005 | 2026-07-21 |
| 50 | Constrain `src/` to strip-types-safe TypeScript (no enum, namespace, or parameter properties) | ADR-0005 | 2026-07-21 |
| 51 | Add an `npm run start` script running `node --experimental-strip-types src/main.ts` | ADR-0005 | 2026-07-21 |
| 52 | Wire `boot` as a `mode: exec` handoff mapped to `npm run start` via contract data only | ADR-0005 | 2026-07-21 |
| 53 | Serve `GET /health` as `200 application/json` with body `{"status":"ok"}` | ADR-0005 | 2026-07-21 |
| 54 | Serve `GET /` as a thin `200 text/html` shell and return `404` for other routes | ADR-0005 | 2026-07-21 |
| 55 | Default the server port to 3000, overridable via the `PORT` environment variable | ADR-0005 | 2026-07-21 |
| 56 | Adopt Node built-in `node:test` as the Prototype-0 test runner; add no test framework | ADR-0005 | 2026-07-21 |
| 57 | Wire the harness `test` verb to `npm test`, moving it from unknown to pass in `verify` | ADR-0005 | 2026-07-21 |
| 58 | Keep `./harness dev` as the typecheck watch; document `./harness boot` as the shell+health start command | ADR-0005 | 2026-07-21 |
| 59 | Keep the service health/HTTP contract issue-local at Prototype 0; create no core-component | ADR-0005 | 2026-07-21 |
| 60 | Require Node ≥22.6.0 (<23) as the supported runtime floor; `--experimental-strip-types` is unavailable before 22.6.0 | ADR-0005 | 2026-07-21 |
| 61 | Report `doctor` degraded (never fail) when running Node is major 22 and minor < 6, since 22.0–22.5 cannot run the app | ADR-0005, CORE-COMPONENT-0003 | 2026-07-21 |
| 62 | Launch code-server as a host child process via a single POSIX shell launcher script (`scripts/launch-editor.sh`) | ADR-0006 | 2026-07-21 |
| 63 | Isolate every code-server-specific flag (`<path>`, `--bind-addr`, `--auth none`, config) behind the one launcher seam | ADR-0006 | 2026-07-21 |
| 64 | Configure the editor's target directory via the `PROJECT_PATH` environment variable | ADR-0006 | 2026-07-21 |
| 65 | Bind the editor loopback-only at `127.0.0.1:${EDITOR_PORT:-8080}` with `--auth none` for the local spike | ADR-0006 | 2026-07-21 |
| 66 | Surface the launcher as a new `edit` harness verb declared `mode: exec` in contract data | ADR-0006 | 2026-07-21 |
| 67 | Register the `edit` verb name in the harness `main()` dispatch allowlist and `verb_help` text | ADR-0006 | 2026-07-21 |
| 68 | Validate `PROJECT_PATH` and fail-fast with non-zero exit on unset/empty/missing/non-directory paths | ADR-0006 | 2026-07-21 |
| 69 | Prohibit the launcher from creating, deleting, moving, renaming, resetting, or cleaning the project directory | ADR-0006 | 2026-07-21 |
| 70 | Propagate code-server's exit code through the `edit` handoff; add no process supervision | ADR-0006 | 2026-07-21 |
| 71 | ~~Treat code-server as a documented prerequisite; verify AC1–AC3 by manual demonstration, AC4–AC5 by automated tests~~ — **SUPERSEDED IN PART by ADR-0008 (2026-07-23)**: code-server is now a required dependency probed by `doctor` and provisioned in the devcontainer | ADR-0006 | 2026-07-21 |
| 72 | Prohibit building a speculative `EditorProvider` abstraction at Prototype 0; create no core-component | ADR-0006 | 2026-07-21 |
| 73 | Add an additive `agent` field to the friction record, appended after `severity` | ADR-0007 | 2026-07-23 |
| 74 | Default the friction `agent` to the `unknown` sentinel for omitted, legacy, and no-agent records; perform no on-disk backfill | ADR-0007 | 2026-07-23 |
| 75 | Add an `--agent <name>` flag (not positional) to `./harness friction add` | ADR-0007 | 2026-07-23 |
| 76 | Keep friction dedupe verb-only; add no agent-aware deduplication | ADR-0007 | 2026-07-23 |
| 77 | Update each RPIV stage agent's HARNESS block to self-attribute friction via `--agent <agent-name>` | ADR-0007 | 2026-07-23 |
| 78 | Run the friction retrospect as an issue-scoped, delete-on-fix activity; add no new verb or persistent improvement store | ADR-0007 | 2026-07-23 |
| 79 | Delete the 21 resolved friction records plus #23 on fix (22 total); keep the 9 still-true records | ADR-0007 | 2026-07-23 |
| 80 | Retain one boot and one test friction anchor so TEST-09 seed coverage stays green after deletions | ADR-0007 | 2026-07-23 |
| 81 | Probe code-server presence in `doctor`; return `fail` (exit non-zero) when absent, not `degraded` | ADR-0008 | 2026-07-23 |
| 82 | Fail the `verify` aggregate when `doctor` fails on missing code-server, with no aggregate-logic change | ADR-0008 | 2026-07-23 |
| 83 | Provision code-server in `.devcontainer/devcontainer.json` so `verify` can pass | ADR-0008 | 2026-07-23 |
| 84 | Update `verification.yml`'s outdated "degraded/unknown non-blocking" comment for accuracy only (sequence with #27) | ADR-0008 | 2026-07-23 |
| 85 | Require every friction record to carry an `agent` field read as `unknown` when absent (R18) | CORE-COMPONENT-0003 | 2026-07-23 |
| 86 | Guarantee the friction `agent` field is additive and backward-compatible per R7/R8 (R18) | CORE-COMPONENT-0003 | 2026-07-23 |
| 87 | Require `doctor` to fail, not degrade, when code-server is absent (R19) | CORE-COMPONENT-0003 | 2026-07-23 |
