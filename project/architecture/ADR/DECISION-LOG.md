# Decision Log

This file is the single registry of all architectural decisions and core-components in the project. Every new or modified ADR or core-component **must** be recorded here.

## ADRs

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-260808-typescript-monorepo | TypeScript Monorepo and Host Workbench Stack | Accepted | 2026-08-08 |
| ADR-260808-governed-engineering-harness | Governed Repository-Local Engineering Harness | Accepted | 2026-08-08 |
| ADR-260810-full-page-browser-workbench-presentation | Select the Full-Page Browser Workbench Presentation | Accepted | 2026-08-10 |

## Core-Components

| ID | Title | Status | Date |
|----|-------|--------|------|
| CORE-COMPONENT-260505-commit-standards | Commit Standards | Adopted | 2026-05-05 |
| CORE-COMPONENT-260806-rpiv-stage-contract | RPIV Stage Contract | Adopted | 2026-08-06 |
| CORE-COMPONENT-260806-project-command-interface | Project Command Interface | Adopted | 2026-08-06 |
| CORE-COMPONENT-260806-agent-executable-acceptance-criteria | Agent-Executable Acceptance Criteria | Adopted | 2026-08-06 |
| CORE-COMPONENT-260806-architecture-artifact-naming | Architecture Artifact Naming | Adopted | 2026-08-06 |
| CORE-COMPONENT-260808-structured-runtime-logging | Structured Runtime Logging | Adopted | 2026-08-08 |
| CORE-COMPONENT-260808-runtime-lifecycle-error-handling | Runtime Lifecycle and Error Handling | Adopted | 2026-08-08 |
| CORE-COMPONENT-260808-filesystem-path-safety | Filesystem Path Safety | Adopted | 2026-08-08 |
| CORE-COMPONENT-260808-host-process-environment | Host Process and Environment Handling | Adopted | 2026-08-08 |
| CORE-COMPONENT-260808-development-standards | TypeScript Development Standards | Adopted | 2026-08-08 |
| CORE-COMPONENT-260808-engineering-harness-delivery-contract | Engineering Harness Delivery Contract | Adopted | 2026-08-08 |
| CORE-COMPONENT-260810-sqlite-persistence-lifecycle | SQLite Persistence Lifecycle | Adopted | 2026-08-10 |

## Decisions

Short, actionable statements derived from ADRs and core-components. More than one decision can originate from a single source.

| # | Decision | Source | Date |
|---|----------|--------|------|
| 1 | Enforce Conventional Commits v1.0.0 on every commit message | CORE-COMPONENT-260505-commit-standards | 2026-05-05 |
| 2 | Require Conventional Commits format on PR titles | CORE-COMPONENT-260505-commit-standards | 2026-05-05 |
| 3 | Require the configured Copilot Co-authored-by trailer on AI-authored commits | CORE-COMPONENT-260505-commit-standards | 2026-05-05 |
| 4 | Require the RPIV implementer to commit implementation before verification | CORE-COMPONENT-260505-commit-standards | 2026-08-06 |
| 5 | Create the issue feature branch before RPIV Research starts | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-06 |
| 6 | Assign stable AC IDs and prove task, validation, and evidence coverage | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-06 |
| 7 | Use root justfile recipes for Implement and Verify validation by default | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-06 |
| 8 | Restrict Verify to acceptance decisions, GitHub updates, push, and PR creation | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-06 |
| 9 | Route verification defects to Implement or Plan by ownership | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-06 |
| 10 | Define project operating commands as root justfile recipes | CORE-COMPONENT-260806-project-command-interface | 2026-08-06 |
| 11 | Use the root justfile as the default command interface | CORE-COMPONENT-260806-project-command-interface | 2026-08-06 |
| 12 | Provide the just command runner in project development environments | CORE-COMPONENT-260806-project-command-interface | 2026-08-06 |
| 13 | Prohibit standalone verification config that duplicates the root justfile | CORE-COMPONENT-260806-project-command-interface | 2026-08-06 |
| 14 | Require Implement and Verify to run independent stage-boundary validation | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-06 |
| 15 | Require verify-focused and verify recipes in bootstrapped projects | CORE-COMPONENT-260806-project-command-interface | 2026-08-06 |
| 16 | Require acceptance criteria to be bounded, observable, and executable by configured agents | CORE-COMPONENT-260806-agent-executable-acceptance-criteria | 2026-08-06 |
| 17 | Require acceptance evidence to use safe, repeatable repository capabilities | CORE-COMPONENT-260806-agent-executable-acceptance-criteria | 2026-08-06 |
| 18 | Identify unavailable human or external prerequisites instead of encoding impossible agent tasks | CORE-COMPONENT-260806-agent-executable-acceptance-criteria | 2026-08-06 |
| 19 | Name architecture artifacts with their UTC creation date and descriptive slug | CORE-COMPONENT-260806-architecture-artifact-naming | 2026-08-06 |
| 20 | Use the full date-and-slug basename as the architecture artifact ID | CORE-COMPONENT-260806-architecture-artifact-naming | 2026-08-06 |
| 21 | Preserve artifact creation dates and distinguish same-day records by slug | CORE-COMPONENT-260806-architecture-artifact-naming | 2026-08-06 |
| 22 | Write implementation evidence to implementation/00-implementation.md | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-06 |
| 23 | Require Implement to update affected application documentation and Verify to inspect it | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-06 |
| 24 | Store RPIV artifacts under stable `project/work-items/<issue-number>-<short-description>/` paths | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-07 |
| 25 | Reuse an existing same-issue work-item directory before creating a new artifact path | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-07 |
| 26 | Build Ascend as a pnpm TypeScript monorepo with React/Vite and Fastify application packages | ADR-260808-typescript-monorepo | 2026-08-08 |
| 27 | Persist local project metadata with SQLite and Drizzle ORM | ADR-260808-typescript-monorepo | 2026-08-08 |
| 28 | Run one code-server process directly on the host for each active MVP project | ADR-260808-typescript-monorepo | 2026-08-08 |
| 29 | Delegate editing, terminals, exploration, previews, Git UI, and extensions to code-server | ADR-260808-typescript-monorepo | 2026-08-08 |
| 30 | Write simple structured runtime events to standard streams and use OpenTelemetry defaults for observability | CORE-COMPONENT-260808-structured-runtime-logging | 2026-08-08 |
| 31 | Centralize workbench process ownership and explicit lifecycle errors behind one runtime manager | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-08 |
| 32 | Canonicalize project paths and prohibit filesystem mutation during project close | CORE-COMPONENT-260808-filesystem-path-safety | 2026-08-08 |
| 33 | Launch workbenches as least-privilege host processes with deterministic user environments | CORE-COMPONENT-260808-host-process-environment | 2026-08-08 |
| 34 | Enforce strict TypeScript, automated formatting and linting, Vitest, Playwright, and 80 percent unit coverage | CORE-COMPONENT-260808-development-standards | 2026-08-08 |
| 35 | Adopt .harness as the repository-local engineering-harness governance and evidence root | ADR-260808-governed-engineering-harness | 2026-08-08 |
| 36 | Delegate harness checks to the root just verify recipe | ADR-260808-governed-engineering-harness | 2026-08-08 |
| 37 | Use non-persistent test-backed readiness until live-service lifecycle support exists | ADR-260808-governed-engineering-harness | 2026-08-08 |
| 38 | Preserve adoption baselines separately from current harness capability | ADR-260808-governed-engineering-harness | 2026-08-08 |
| 39 | Require harness checks and boot to return actionable machine-readable envelopes | CORE-COMPONENT-260808-engineering-harness-delivery-contract | 2026-08-08 |
| 40 | Inject advisory harness lifecycle calls at RPIV stage seams without reordering stages | CORE-COMPONENT-260808-engineering-harness-delivery-contract | 2026-08-08 |
| 41 | Capture configured implementation friction once and reject unsupported observation kinds | CORE-COMPONENT-260808-engineering-harness-delivery-contract | 2026-08-08 |
| 42 | Preserve harness evidence, flow, and skill-installation records as repository-local artifacts | CORE-COMPONENT-260808-engineering-harness-delivery-contract | 2026-08-08 |
| 43 | Use full-page code-server with a minimal Ascend header for authoritative desktop Chromium workbench presentation | ADR-260810-full-page-browser-workbench-presentation | 2026-08-10 |
| 44 | Reject embedded code-server presentation based on the retained ordered selection evidence | ADR-260810-full-page-browser-workbench-presentation | 2026-08-10 |
| 45 | Keep tablet validation non-authoritative and defer product routing and lifecycle integration | ADR-260810-full-page-browser-workbench-presentation | 2026-08-10 |
| 46 | Require closeable explicit-path database resources for all SQLite persistence | CORE-COMPONENT-260810-sqlite-persistence-lifecycle | 2026-08-10 |
| 47 | Apply committed ordered Drizzle migrations before persistence repositories operate | CORE-COMPONENT-260810-sqlite-persistence-lifecycle | 2026-08-10 |
| 48 | Isolate database tests and refuse the documented default database location | CORE-COMPONENT-260810-sqlite-persistence-lifecycle | 2026-08-10 |
