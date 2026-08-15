# Decision Log

This file is the single registry of all architectural decisions and core-components in the project. Every new or modified ADR or core-component **must** be recorded here.

## ADRs

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-260808-typescript-monorepo | TypeScript Monorepo and Host Workbench Stack | Accepted | 2026-08-08 |
| ADR-260808-governed-engineering-harness | Governed Repository-Local Engineering Harness | Accepted | 2026-08-08 |
| ADR-260810-full-page-browser-workbench-presentation | Select the Full-Page Browser Workbench Presentation | Accepted | 2026-08-10 |
| ADR-260812-in-process-workbench-reverse-proxy | In-Process Stable Workbench Reverse Proxy | Accepted | 2026-08-12 |
| ADR-260812-browser-navigation-shell | Separate Browser Navigation Shell from Workbench Transport | Accepted | 2026-08-12 |
| ADR-260815-public-runtime-state-projection | Report Public Runtime State Through a Read-Only Projection | Accepted | 2026-08-15 |
| ADR-260815-selected-runtime-stop-control | Release One Selected Workbench Runtime Through a Manager-Owned Stop Control | Accepted | 2026-08-15 |
| ADR-260815-termination-sequencer-boundary | Prove Termination Sequencing Through an Injectable Primitive Boundary | Accepted | 2026-08-15 |

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
| 56 | Cancel orphaned project starts only when their caller wait count reaches zero | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-12 |
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
| 83 | Serve top-level stable workbench navigations through an Ascend-owned bootstrap shell | ADR-260812-browser-navigation-shell | 2026-08-12 |
| 84 | Acquire upstream workbench documents through the same stable URL with an internal marker | ADR-260812-browser-navigation-shell | 2026-08-12 |
| 85 | Preserve native document navigation for Home, Projects, refresh, Back, and Forward | ADR-260812-browser-navigation-shell | 2026-08-12 |
| 86 | Preserve BL-011 transport semantics for marked document loads, descendants, and WebSockets | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 87 | Render top-level route and load failures accessibly at the unchanged stable URL | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 88 | Replace failed shell entries on Retry without adding browser history | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 89 | Authenticate trusted front-door authority metadata with one aligned private token and refuse malformed pairs before runtime resolution | ADR-260812-browser-navigation-shell | 2026-08-12 |
| 90 | Key every project lifecycle entry only by its stable project ID | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-12 |
| 91 | Include stable route and opaque owner token in every immutable running snapshot | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-12 |
| 92 | Use one opaque project token across runtime and proxy event attribution | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-12 |
| 93 | Reject proxy snapshots that mismatch the persisted project or stable route or are not the exact manager-owned running object | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 94 | Attribute proxy resource inventories and audits by opaque project token | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-12 |
| 95 | Report public runtime state through a read-only projection endpoint | ADR-260815-public-runtime-state-projection | 2026-08-15 |
| 96 | Keep runtime state out of the four-field project payload and its validators | ADR-260815-public-runtime-state-projection | 2026-08-15 |
| 97 | Refresh public runtime state on demand without polling, streaming, or background health loops | ADR-260815-public-runtime-state-projection | 2026-08-15 |
| 98 | Expose exactly one of Stopped, Starting, Running, or Failed on every public surface | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 99 | Project every public runtime state from the runtime manager in one synchronous pass | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 100 | Report retained runtime failures as Failed instead of Stopped | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 101 | Disclose only bounded failure categories in public runtime reports | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 102 | Report an unavailable public runtime report explicitly instead of substituting a state | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 103 | Announce each public runtime-state transition with exactly one NFR-015 catalog event | CORE-COMPONENT-260808-structured-runtime-logging | 2026-08-15 |
| 104 | Report post-readiness runtime exits as runtime.health.changed and emit no non-catalog lifecycle event | CORE-COMPONENT-260808-structured-runtime-logging | 2026-08-15 |
| 105 | Route every running-to-failed transition through one guarded compare-and-set operation | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 106 | Reject runtime reports that do not match the authoritative ordered project list revision | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 107 | Request public runtime state exactly once per authoritative project-list revision | ADR-260815-public-runtime-state-projection | 2026-08-15 |
| 108 | Release a selected project workbench only through one manager-owned stop operation | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 109 | Serve selected stop from POST /api/projects/{id}/runtime/stop with a bounded result vocabulary | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 110 | Claim the exact running generation synchronously before releasing a workbench runtime | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 111 | Report a stop that cannot confirm release as Failed instead of Stopped | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 112 | Refuse a workbench start while that project's selected stop is in flight | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 113 | Request public runtime state exactly once more after each settled stop, without polling | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 114 | Exclude release mode, termination audits, and process identity from every public stop result | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 115 | Reject a stop for a project with no manager-owned runtime as a bounded non-success | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 116 | Return an already-stopped success only for a project released by a confirmed stop | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 117 | Sequence graceful and force termination through one exported injectable sequencer | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 118 | Build the production process adapter over the default termination primitives | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 119 | Enforce the configured stop audit allowance and cancellation inside every termination | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 120 | Revalidate the exact owned root identity before every termination signal | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 121 | Report an unconfirmed release as its own termination outcome instead of escalated | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 122 | Limit owned-descendant attribution to the owned process group and record its ceiling | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 123 | Report an in-flight selected stop as Running until its release is confirmed | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 124 | Join concurrent stops for one project into one in-flight release operation | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 125 | Terminate only the exact claimed runtime generation and never its replacement or a peer | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 126 | Confirm selected stop through exact process, owned process-group, and listener absence | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 127 | Await every in-flight selected stop before manager shutdown audits ownership | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 128 | Re-attempt shutdown cleanup unless a prior audit confirms that exact identity absent | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 129 | Cancel and settle a selected stop whose termination exceeds its documented overall bound | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 130 | Recheck the exact installed entry and generation after every awaited reuse observation | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 131 | Surface a lost stop claim as an invariant fault without mutating, auditing, or emitting | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 132 | Keep lifecycle transition targets separate from entry states and snapshot states | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 133 | Emit exactly one runtime.stop.requested and one terminal catalog event per accepted stop | CORE-COMPONENT-260808-structured-runtime-logging | 2026-08-15 |
| 134 | Prohibit runtime.stop.failed and every other non-catalog stop lifecycle event | CORE-COMPONENT-260808-structured-runtime-logging | 2026-08-15 |
| 135 | Keep route-level stop records operational and never read them as lifecycle events | CORE-COMPONENT-260808-structured-runtime-logging | 2026-08-15 |
| 136 | Retain project registration, metadata, and directory contents on every selected stop outcome | CORE-COMPONENT-260808-filesystem-path-safety | 2026-08-15 |
| 137 | Limit the lifted lifecycle-control deferral to selected stop only | ADR-260815-public-runtime-state-projection | 2026-08-15 |
| 138 | Bound every awaited termination primitive with the sequencer's own deadline signal | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 139 | Abandon any termination primitive still pending at the sequencer deadline | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 140 | Derive no absence, signal, or outcome from an abandoned primitive observation | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 141 | Allow one stop-phase termination and at most one stop-phase cleanup audit per generation | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 142 | Re-attempt a retained unconfirmed generation exactly once in the manager shutdown sweep | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 143 | Arm every termination deadline with a trusted synchronous scheduler primitive | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 144 | Exclude the deadline scheduler from the fallible awaited termination primitive contract | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 145 | Abort a termination on entry when its caller signal is already aborted | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 146 | Start the graceful and force windows at their own delivered termination signals | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 147 | Bound pre-signal termination observation with the audit allowance and never signal past it | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 148 | Report an unconfirmed release rather than shorten a selected stop's graceful opportunity | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 149 | Return a delivered-or-refused result from every termination signal primitive | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 150 | Rethrow every termination signal error other than the expected target-gone race | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 151 | Open a termination phase window only from a confirmed delivered signal | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 152 | Measure every termination phase, deadline, and elapsed value on a monotonic clock | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 153 | Record no delivered signal or escalation for a refused termination signal | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
