# Decision Log

This file is the single registry of all architectural decisions and core-components in the project. Every new or modified ADR or core-component **must** be recorded here.

## ADRs

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-260808-typescript-monorepo | TypeScript Monorepo and Host Workbench Stack | Accepted | 2026-08-08 |
| ADR-260808-governed-engineering-harness | Governed Repository-Local Engineering Harness | Accepted | 2026-08-08 |
| ADR-260810-full-page-browser-workbench-presentation | Select the Full-Page Browser Workbench Presentation | Accepted | 2026-08-10 |
| ADR-260812-in-process-workbench-reverse-proxy | In-Process Stable Workbench Reverse Proxy | Accepted | 2026-08-12 |

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
| CORE-COMPONENT-260812-stable-workbench-proxy | Stable Workbench Proxy Boundary | Adopted | 2026-08-12 |

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
| 49 | Require the RPIV coordinator to serialize lifecycle seams before stage dispatch | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-11 |
| 50 | Require every RPIV worker to capture governed friction without lifecycle orchestration | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-11 |
| 51 | Apply one APS harness profile to all RPIV agent generation and linting | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-11 |
| 52 | Preserve failed observation events for retry at finite worker checkpoints | CORE-COMPONENT-260806-rpiv-stage-contract | 2026-08-11 |
| 53 | Keep runtime identities, ports, handles, and state only in runtime-manager memory | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-11 |
| 54 | Coalesce concurrent starts and reuse only health-checked running workbenches | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-11 |
| 55 | Enforce bounded loopback binding, health readiness, collision retries, and exact cleanup | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-11 |
| 56 | Cancel caller waits independently and reserve shared cancellation for manager shutdown | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-11 |
| 57 | Emit bounded redacted lifecycle diagnostics and timing without raw canonical paths | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-11 |
| 58 | Use application-owned in-process proxying for stable workbench HTTP and WebSocket traffic | ADR-260812-in-process-workbench-reverse-proxy | 2026-08-12 |
| 59 | Use Node HTTP streams and direct ws dependency for proxy transport | ADR-260812-in-process-workbench-reverse-proxy | 2026-08-12 |
| 60 | Resolve proxy upstreams only from persisted projects and BL-010 runtime snapshots | ADR-260812-in-process-workbench-reverse-proxy | 2026-08-12 |
| 61 | Disable generic code-server port-proxy routes behind stable workbench routing | ADR-260812-in-process-workbench-reverse-proxy | 2026-08-12 |
| 62 | Shut down proxy operations before runtime processes and persistence owners | ADR-260812-in-process-workbench-reverse-proxy | 2026-08-12 |
| 63 | Require all Ascend-owned browser workbench traffic under the stable project prefix | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 64 | Validate workbench project IDs as one bounded route-safe segment | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 65 | Strip hop-by-hop and client forwarding headers before trusted loopback forwarding | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 66 | Rewrite same-runtime redirects, cookie paths, and service-worker scope under stable prefix | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 67 | Remove cookie Domain attributes and reject redirects to other authorities | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 68 | Enforce five-second proxy timeouts and exact typed precommitment failures | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 69 | Preserve HTTP streams and WebSocket ordering with explicit backpressure | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 70 | Convert abnormal WebSocket termination without transmitting reserved close code 1006 | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 71 | Close proxy-owned streams and sockets before BL-010 runtime shutdown | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 72 | Exclude internal authorities and protected payloads from browser and logging surfaces | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 73 | Restrict raw authority evidence to one owner-readable ignored local artifact | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 74 | Preserve BL-010 as the sole runtime process owner | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 75 | Classify Ascend transport separately from isolated VS Code Markdown webview resources | ADR-260812-in-process-workbench-reverse-proxy | 2026-08-12 |
| 76 | Disable extension marketplace access during deterministic designated workbench proof | ADR-260812-in-process-workbench-reverse-proxy | 2026-08-12 |
| 77 | Inventory three Management and three ExtensionHost sockets across three fresh workflows | ADR-260812-in-process-workbench-reverse-proxy | 2026-08-12 |
| 78 | Allow only HTTPS vscode-remote+<encoded-authority>.vscode-resource.vscode-cdn.net Markdown resources | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 79 | Reject malformed webview URLs, Open VSX, and every unclassified external origin | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 80 | Fail unknown, missing, retrying, external, or internal-port WebSocket observations | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 81 | Emit only bounded host classes for public browser evidence | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 82 | Treat vscode-remote+ as opaque VS Code label syntax, never wildcard permission | ADR-260812-in-process-workbench-reverse-proxy | 2026-08-12 |
