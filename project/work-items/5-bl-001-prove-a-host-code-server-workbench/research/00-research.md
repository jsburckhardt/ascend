# Research Brief: BL-001: Prove a host code-server workbench

## GitHub Issue
- **Issue:** #5
- **Title:** BL-001: Prove a host code-server workbench
- **Work Item:** project/work-items/5-bl-001-prove-a-host-code-server-workbench

## Scope Classification
- **Scope Type:** issue

## Problem Statement
Ascend depends on a host-native code-server workbench, but the repository has no bounded, repeatable proof of one complete start, browser-use, and cleanup lifecycle. Issue #5 limits the proof to the designated Ubuntu 24.04 devcontainer and its installed standalone code-server, defines the PID and loopback URL together as the cleanup handle, and bounds validation to one successful lifecycle plus five named startup failures. Concurrent starts, interruption and recovery, broader fault injection, and data-integrity claims beyond fixture membership and sentinel bytes are outside this issue.

## Acceptance Criteria

**Core**
- [ ] One repository command starts one code-server as the configured user against an already-existing repository fixture's canonical path, emits a parseable PID plus loopback URL, and uses a documented readiness check and timeout.
- [ ] One cleanup command accepts that handle, stops only that managed process within a timeout, and is idempotent after the process is absent.
- [ ] Before/after evidence proves fixture tree membership and sentinel bytes are unchanged.
- [ ] Evidence proves the managed process tree runs as non-root vscode and its TCP listeners use only 127.0.0.1 or ::1.
- [ ] One bounded Chromium scenario connects through the emitted URL, finds a defined sentinel in Explorer, opens a defined Markdown fixture in Preview, and sees defined rendered text.
- [ ] A defined Ubuntu-valid path containing spaces and one literal shell metacharacter reaches code-server as one argument and causes no defined injection sentinel side effect.

**Failure and cleanup**
- [ ] Missing code-server, nonexistent path, non-directory path, readiness timeout, and early exit each have a documented nonzero result and diagnostic.
- [ ] Every validation path it actually executes, including the named failure cases, leaves no BL-001 managed process/listener and removes only BL-001 disposable artifacts.

**Evidence**
- [ ] One retained evidence record maps each BL-001 criterion to its command, exit result, and artifact, and records Ubuntu version, hostname, user, code-server 4.131.0, prerequisites, timeouts, cleanup, and observed result.
- [ ] The configured repository full validation passes.

## Repository Findings
- GitHub Issue #5 contains one structured acceptance-criteria block delimited by `ACCEPTANCE_CRITERIA_START` and `ACCEPTANCE_CRITERIA_END`, with ten unchecked criteria in the order reproduced above. Its body also declares `just verify` as the canonical full-validation command and defines the finite success/failure and cleanup boundaries.
- `PRD.md` identifies proving a host workbench as Slice 1 and treats host-native terminal behavior as the highest-risk requirement. Relevant requirements include exact canonical-directory launch (`FR-005`/`AC-008`), Explorer and Markdown Preview (`FR-006`, `FR-007`, `AC-009`, `AC-010`), configured-user host execution (`FR-008`, `AC-011` through `AC-013`), loopback binding (`NFR-007`), path validation (`NFR-008`), non-root permissions (`NFR-009`), Chromium usability (`NFR-019`), and host-environment compatibility (`NFR-020`).
- `README.md` and `docs/README.md` describe host-native persistent workbenches as intended product behavior, while both identify the repository as an initial scaffold. `docs/README.md` says the devcontainer pins code-server 4.117.0; `.devcontainer/devcontainer.json` likewise requests feature version 4.117.0.
- The current API has no workbench lifecycle boundary. `apps/api/src/app.ts::app` only autoloads plugins and routes; `apps/api/src/server.ts::startServer` only starts Fastify; `apps/api/src/routes/root.ts` only exposes the API health response. `apps/api/src/db/schema.ts::projects` stores project metadata and a unique `canonicalPath`, but no runtime handle or process state.
- The current web application is a static project-home scaffold. `apps/web/src/App.tsx::App` renders an Open Project button and empty-state copy, with no project opening or workbench interaction.
- Existing automated coverage is scaffold-only: `apps/api/test/routes/root.test.ts` checks API health, `apps/api/test/plugins/support.test.ts` checks the support decoration, `apps/web/src/App.test.tsx` checks project-home rendering, and `tests/e2e/project-home.spec.ts` checks the same project-home surface in Chromium. `playwright.config.ts` starts only the Vite web application at `127.0.0.1:5173`; it does not start or navigate a standalone code-server.
- The root `justfile` exposes `setup`, `run`, `test`, `test-e2e`, `lint`, `format-check`, `type-check`, `build`, `verify-focused`, and `verify`. Its `verify` recipe runs formatting, linting, type checking, unit tests, builds, and Playwright E2E in sequence. There is currently no workbench start or cleanup recipe.
- `.harness/extensions/checks/extension.ts` delegates `harness checks` to `just verify` with a 120-second wrapper timeout. `.harness/extensions/boot/extension.ts` composes checks with a 150-second timeout and explicitly reports `mode: test-backed scaffold`; `.harness/engineering-harness.md` states that boot leaves no development server running and lists live-service startup and host-process safety sensors as gaps. The adoption report at `.harness/reports/harnessability/latest.md` records the host workbench lifecycle as unimplemented at its 2026-08-08 baseline; later harness-change records show checks and test-backed boot were subsequently added.
- No tracked path matching fixture/test-data/sample or sentinel naming was found, and no tracked BL-001 disposable-artifact declaration or retained issue evidence exists. The root `.gitignore` excludes common generated paths including `dist/`, `coverage/`, `playwright-report/`, `test-results/`, databases, and logs; `apps/api/.gitignore` additionally excludes PID files. Ignored filesystem state is therefore broader than tracked source state.
- Designated-host inspection on 2026-08-09 confirmed `/etc/os-release` reports Ubuntu 24.04.4 LTS, `hostname` reports `03f809395a5d`, and `id` reports `uid=1000(vscode)` with primary group `vscode`. `/workspaces/ascend` resolves as the canonical repository path and is owned by `vscode:vscode`.
- `/home/vscode/.local/bin/code-server` is a `vscode`-owned symlink to `/home/vscode/.local/lib/code-server-4.131.0/bin/code-server`; the executable reports `4.131.0` with Code 1.131.0. Its local help exposes a positional project path plus bind-address, authentication, configuration, user-data, extension-data, telemetry, and update-check options.
- The designated host currently contains unrelated VS Code Remote server processes under `/home/vscode/.vscode-server` and loopback listeners owned by those processes. No process from the standalone `/home/vscode/.local/lib/code-server-4.131.0` installation was observed. This existing host activity is outside any BL-001 cleanup handle.
- The active branch is `feat/5-prove-host-code-server-workbench`. Before this brief was created, no `project/work-items/5-*` directory existed and the working tree was clean, so the title-derived stable path is `project/work-items/5-bl-001-prove-a-host-code-server-workbench`.

## Constraints
- The proof host is fixed by Issue #5: Ubuntu 24.04 devcontainer, hostname `03f809395a5d`, user `vscode`, and standalone code-server 4.131.0 at `/home/vscode/.local/bin/code-server`. These are prerequisites, not portability requirements.
- Scope is one workbench lifecycle. Concurrent starts are assigned to BL-010; interruption and recovery are assigned to BL-017 through BL-019; general fault injection beyond the five named startup failures is excluded.
- The issue defines the PID and loopback URL together as the cleanup handle and requires cleanup to target only the managed process, be bounded and idempotent, leave no managed listener, and remove only the finite disposable set declared before validation.
- Data-integrity scope is limited to fixture tree membership and sentinel bytes. Existing directories remain user-owned and must not be copied, moved, renamed, deleted, or otherwise modified by lifecycle cleanup (`PRD.md`; `CORE-COMPONENT-260808-filesystem-path-safety.md`).
- Project paths must exist, be readable directories, be canonicalized server-side, and reach child processes without shell interpolation. `CORE-COMPONENT-260808-filesystem-path-safety.md` prohibits concatenating untrusted paths into shell commands; `CORE-COMPONENT-260808-host-process-environment.md` requires child-process argument arrays.
- Workbenches must run directly on the Ascend host as the configured OS user without privilege escalation, use a deterministic documented environment, start against the canonical project directory, and bind to loopback (`ADR-260808-typescript-monorepo.md`; `CORE-COMPONENT-260808-host-process-environment.md`).
- Lifecycle ownership and failures must remain explicit: one internal boundary owns process operations, broad catches and success-shaped fallbacks are prohibited, and stop semantics are idempotent where allowed (`CORE-COMPONENT-260808-runtime-lifecycle-error-handling.md`).
- Runtime records must be structured on standard streams and must not include source, terminal, command-output, credential, secret, or other protected development content (`CORE-COMPONENT-260808-structured-runtime-logging.md`; `PRD.md` NFR-010).
- The root `justfile` remains the default repository command interface, raw operating command bodies belong there, and `just verify` is the configured full gate (`CORE-COMPONENT-260806-project-command-interface.md`; Issue #5).
- The configured development standards require strict TypeScript, formatting, linting, type checking, Vitest coverage thresholds, Playwright for browser workflows, builds, and the full root validation gate (`CORE-COMPONENT-260808-development-standards.md`).
- The browser workflow is bounded to a modern Chromium desktop client; stable Ascend routing, proxy behavior, concurrent workbenches, and recovery are not part of this issue.

## Relevant ADRs and Core-Components
- `project/architecture/ADR/ADR-260808-typescript-monorepo.md` (Accepted): establishes direct host code-server processes, initially one runtime per active project, and delegates Explorer, previews, terminals, Git UI, extensions, and editing to code-server.
- `project/architecture/ADR/ADR-260808-governed-engineering-harness.md` (Accepted): keeps root `justfile` commands canonical, makes harness checks delegate to `just verify`, and limits the current harness boot contract to non-persistent test-backed readiness until live-service lifecycle support exists.
- `project/architecture/core-components/CORE-COMPONENT-260808-host-process-environment.md` (Adopted): governs least-privilege host execution, deterministic environments, canonical working directories, argument-array invocation, and loopback binding.
- `project/architecture/core-components/CORE-COMPONENT-260808-filesystem-path-safety.md` (Adopted): governs canonical path validation, exact launch directories, traversal rejection, and non-destructive handling of user-owned directories.
- `project/architecture/core-components/CORE-COMPONENT-260808-runtime-lifecycle-error-handling.md` (Adopted): governs centralized process ownership, explicit lifecycle outcomes, actionable failures, and idempotent stop semantics.
- `project/architecture/core-components/CORE-COMPONENT-260808-structured-runtime-logging.md` (Adopted): governs stable structured lifecycle records, startup timing, actionable failures, and sensitive-content exclusions.
- `project/architecture/core-components/CORE-COMPONENT-260806-project-command-interface.md` and `CORE-COMPONENT-260808-development-standards.md` (Adopted): govern root command ownership and the configured focused/full validation surfaces.
- `project/architecture/core-components/CORE-COMPONENT-260806-agent-executable-acceptance-criteria.md` and `CORE-COMPONENT-260806-rpiv-stage-contract.md` (Adopted): require bounded repository-executable criteria, stable work-item reuse, and a Research artifact limited to findings, constraints, architecture, and risks.
- `project/architecture/ADR/DECISION-LOG.md` registers both relevant ADRs and all listed core-components. Decisions 28 through 34 cover direct host code-server execution, delegated IDE behavior, structured runtime events, centralized lifecycle ownership, path safety, least-privilege host execution, and TypeScript validation; decisions 35 through 42 govern the repository-local harness.

## Risks and Open Questions
- Repository documentation and devcontainer configuration name code-server 4.117.0, while Issue #5 and the live designated host require and provide 4.131.0. The tracked environment declaration therefore does not currently describe the observed proof binary.
- No already-existing repository fixture, canonical fixture path, Explorer sentinel, Markdown fixture/rendered text, shell-metacharacter path, injection sentinel, or finite BL-001 disposable-artifact set is currently defined in tracked files.
- No repository command currently starts or cleans up a standalone code-server, and no application source currently owns its PID, URL, readiness, listener, timeout, early-exit, or cleanup state.
- Concrete readiness, startup, cleanup, and failure timeout values are not stated by Issue #5. `PRD.md` gives a 15-second cold-start target, while harness wrapper timeouts are 120 and 150 seconds for different operations; their relationship to BL-001 is unspecified.
- The effective standalone code-server authentication and configuration inputs on the designated host are unknown. Sensitive configuration values were intentionally not inspected, and CLI configuration may affect direct browser reachability or generated state.
- Existing VS Code Remote processes and loopback listeners make broad code-server name matching or blanket listener cleanup unsafe; attribution must remain bounded to the Issue #5 cleanup handle.
- The complete process tree and filesystem side effects created by standalone code-server 4.131.0 on this host have not yet been observed. This leaves the exact disposable boundary and distinction between managed descendants and unrelated editor processes unresolved.
- The installed code-server/Code UI version and current Playwright dependency may expose selectors, first-run prompts, workspace-trust state, update checks, extension state, or persisted user state that affect the bounded Chromium interaction; current repository coverage does not characterize these conditions.
- It is unresolved whether the existing harness boot contract remains strictly scaffold-only during BL-001 or becomes affected by this issue; the accepted harness ADR says live-service boot requires a later architectural decision defining ownership, health, and cleanup.
- The issue requires one retained evidence record but does not identify its repository location or format. Research cannot infer that artifact contract without planning.
