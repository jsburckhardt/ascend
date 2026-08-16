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
| ADR-260815-explicit-workbench-restart-control | Replace One Selected Workbench Runtime Through a Manager-Owned Restart Control | Accepted | 2026-08-15 |
| ADR-260815-per-project-lifecycle-activation | Serialize Project Home Lifecycle Activation Per Project | Accepted | 2026-08-15 |
| ADR-260815-api-restart-runtime-reconciliation | Reconcile Surviving Workbench Runtimes After an API Restart Through Host-Derived Exact Attribution | Accepted | 2026-08-15 |

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
| CORE-COMPONENT-260815-host-runtime-attribution-evidence | Host Runtime Attribution Evidence | Adopted | 2026-08-15 |

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
| 154 | Replace a selected workbench runtime only through one manager-owned restart operation | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 155 | Restrict restart eligibility to a running or current-process retained-failed entry | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 156 | Reject restart for a stopped, unmanaged, starting, stopping, or shutting-down project | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 157 | Claim the restart generation synchronously and join concurrent same-project restarts | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 158 | Confirm complete pre-restart absence before creating any replacement process | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 159 | Install one restarting entry spanning release and replacement, projected as Starting | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 160 | Prohibit any Stopped projection or released registered entry between restart generations | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 161 | Bound a restart by release, readiness, and settlement allowances armed at acceptance | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 162 | Retain a failed restart as Failed and keep it eligible for another explicit restart | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 163 | Terminate and audit a replacement whose startup or readiness fails, leaving zero residuals | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 164 | Serve restart from POST /api/projects/:id/runtime/restart with a bounded outcome vocabulary | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 165 | Emit only the three NFR-015 restart events from an accepted restart | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 166 | Add no proxy-side restart coordination and claim no session continuity across replacement | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 167 | Refuse a start during a restart with the bounded runtime-restarting failure | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 168 | Serialize Project Home restart activation per stable project ID | ADR-260815-per-project-lifecycle-activation | 2026-08-15 |
| 169 | Keep every other project's lifecycle controls enabled during a selected restart | ADR-260815-per-project-lifecycle-activation | 2026-08-15 |
| 170 | Discard a restart settlement whose per-project owner or project is no longer installed | ADR-260815-per-project-lifecycle-activation | 2026-08-15 |
| 171 | Offer Restart only for a project the authoritative projection reports Running or Failed | ADR-260815-per-project-lifecycle-activation | 2026-08-15 |
| 172 | Issue exactly one read-only runtime-state request per settled successful restart | ADR-260815-per-project-lifecycle-activation | 2026-08-15 |
| 173 | Present an explicit unknown restart outcome without retrying or assuming success | ADR-260815-per-project-lifecycle-activation | 2026-08-15 |
| 174 | Spend the remaining lifecycle-control deferral on explicit restart only | ADR-260815-public-runtime-state-projection | 2026-08-15 |
| 175 | Reject a selected stop during a restart with the bounded restart-in-progress category | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 176 | Await every in-flight restart before the manager shutdown ownership sweep | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 177 | Reuse the single termination sequencer unchanged for the restart release phase | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 178 | Project the restarting entry state as Starting without widening the public vocabulary | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 179 | Treat absent prior ownership records as an already-absent restart release | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 180 | Allow one restart-release termination and at most one replacement-failure cleanup per restart | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 181 | Prevent every stale prior-generation settlement from changing a successful replacement | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 182 | Surface a lost restart claim as an invariant fault without mutating, auditing, or emitting | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 183 | Prohibit every automatic restart retry, trigger, and recovery loop | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 184 | Emit exactly one runtime.restart.requested and one terminal restart event per accepted restart | CORE-COMPONENT-260808-structured-runtime-logging | 2026-08-15 |
| 185 | Prohibit stop, start, and health events from an explicit restart's internal phases | CORE-COMPONENT-260808-structured-runtime-logging | 2026-08-15 |
| 186 | Emit no restart lifecycle event for a restart request rejected before acceptance | CORE-COMPONENT-260808-structured-runtime-logging | 2026-08-15 |
| 187 | Fail a proxy-path start during a restart with the bounded restart-in-progress failure | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-15 |
| 188 | Keep the stable workbench route unchanged across a runtime replacement | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-15 |
| 189 | Retain project registration and directory contents on every restart outcome | CORE-COMPONENT-260808-filesystem-path-safety | 2026-08-15 |
| 190 | Publish runtime:runtime-restarting as a 503 workbench_restarting row in the workbench failure table | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 191 | Require every proxy-reachable runtime failure category to have a workbench failure table row | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-15 |
| 192 | Arm every restart deadline with the trusted synchronous scheduler, never a fallible sleep | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 193 | Abort a restart phase with a typed runtime failure so no deadline reports manager shutdown | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 194 | Settle a post-gate restart deadline as replacement-failed retaining restart-deadline-exceeded | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 195 | Keep a pre-gate restart deadline release-unconfirmed and launch no replacement | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 196 | Bound the restart replacement allowance by every configured collision attempt and its cleanup | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 197 | Keep the delivered launch configuration for restart replacements, including collision attempts | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 198 | Expose the trusted monotonic clock and deadline scheduler as one manager-injectable boundary | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 199 | Prohibit any fallible awaited primitive from bounding a restart phase, gate, or settlement | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 200 | Record an unaudited replacement as retained rather than claiming an unobserved absence | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 201 | Publish one workbench failure row for every proxied runtime category, closing the stopping and stop-unconfirmed gaps | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-15 |
| 202 | Enforce workbench failure table exhaustiveness with a mechanical union check, not prose | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-15 |
| 203 | Set the Project Home restart transport bound above the manager restart overall bound | ADR-260815-per-project-lifecycle-activation | 2026-08-15 |
| 204 | Create a pending replacement admission before every restart launch call | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 205 | Classify a retained failure holding an unresolved admission as pending, never as absent | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 206 | Block a retry's replacement gate until every pending predecessor admission resolves | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 207 | Settle a retry release-unconfirmed when a predecessor admission stays unresolved in the release bound | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 208 | Bound a pending-admission restart release phase by one quarantine termination per launch attempt | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 209 | Wrap restart launch callbacks so a post-settlement callback writes only quarantine state | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 210 | Key late restart ownership and cleanup records by exact identity and admission, not project ID | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 211 | Prohibit a late restart cleanup from overwriting the project's current cleanup evidence | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 212 | Observe an abandoned restart launch only through one detached late-settlement continuation | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 213 | Exclude every abandoned launch promise from the task sets manager shutdown drains | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 214 | Report unresolved restart admissions in the shutdown result instead of waiting on them | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 215 | Terminate each quarantined identity once and re-attempt it at most once under a claim | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 216 | Refine decision 163: claim a residual-free replacement only from a completed exact audit | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 217 | Refine decision 179: treat missing ownership as absent only when no admission is unresolved | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 218 | Refine decision 180: add quarantine termination cardinality to restart cleanup cardinality | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 219 | Raise the Project Home restart transport bound above the pending-admission restart ceiling | ADR-260815-per-project-lifecycle-activation | 2026-08-15 |
| 220 | Delete a restart ownership record by the exact identity its own cleanup audit names | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 221 | Leave exactly one ownership record for a project after a successful restart | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 222 | Abort a restart when a launch collision cleanup cannot confirm all three absences | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 223 | Publish restart-replacement-unconfirmed as a bounded failure category and a 503 workbench row | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 224 | Refine decision 210: key installed restart cleanup deletions by exact identity too | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 225 | Quarantine an unconfirmed replacement identity as audited-unconfirmed under the existing model | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 226 | Refine decision 216: prohibit a zero-residual claim while a quarantined identity stands | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 227 | Refine decision 180: write one project-keyed replacement cleanup record per phase | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 228 | Classify a project holding a quarantined residual and arm the release bound for reclaiming it | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 229 | Publish a 503 row for a restart failure retained from an unconfirmed replacement cleanup | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-15 |
| 230 | Classify a blocked restart replacement from its own typed phase-abort reason, never the launch error | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 231 | Record a self-quarantined replacement as quarantined-unconfirmed on every settlement branch | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 232 | Refine decision 222: block every replacement branch, not only the collision retry path | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 233 | Represent a withheld residual claim as null and a proven absence as integer zero | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 234 | Refine decision 226: encode the prohibited zero-residual claim as an explicit null residual value | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 235 | Refine decision 179: identify a retained failed entry's prior owned resources as one live handle | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 236 | Record validation-owned fixture teardown in its own field, separate from settlement residual knowledge | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 237 | Reconcile surviving workbench runtimes once per API process before serving the first request | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 238 | Prohibit persisting runtime identity, port, state, or release markers for reconciliation | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 239 | Adopt a survivor only under the complete host-derived attribution conjunction for one registered project | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 240 | Treat adoption as the sole ownership boundary and never signal an unadopted candidate | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 241 | Settle every registered project as adopted, absent, or unresolved within 15,000 ms | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 242 | Claim reconciliation absence only from a completed scan or a completed audit triple | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 243 | Publish reconcile-unconfirmed as a bounded failure category and one 503 workbench row | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 244 | Add the internal reconciling entry state and project it as Starting | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 245 | Emit exactly four reconciliation events and no start, stop, restart, or health event | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 246 | Reject Stop and Restart with reconcile-in-progress while a project's reconciliation is pending | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 247 | Reject Stop and Restart with reconcile-unresolved while a project's reconciliation is unresolved | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 248 | Refuse workbench acquisition before any launch while a project's reconciliation is unresolved | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 249 | Arm the reconciliation deadline with the trusted scheduler, never the injectable sleep | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 250 | Fail API startup explicitly when the reconciliation project-library list fails | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 251 | Redirect workbench child stderr to a per-runtime file descriptor instead of a parent pipe | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 252 | Derive the address-in-use classification from a bounded prefix of that stderr file | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 253 | Require uid, executable, argv, group leadership, listener inode, readiness, and identity stability together | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 254 | Refuse attribution when two candidates match one project or one candidate matches two | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 255 | Prohibit signalling, routing to, or counting any refused candidate as Ascend-owned | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 256 | Abandon every attribution observation at its deadline and never convert it to absence | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 257 | Keep attribution observation read-only, unprivileged, and free of PID exhaustion or indefinite waiting | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 258 | Inject attribution primitives behind one dependency surface so every refusal branch is provable | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 259 | Publish only bounded classes, project tokens, counts, and elapsed values as attribution evidence | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 260 | Report Stopped after reconciliation only from a positive absence observation | ADR-260815-public-runtime-state-projection | 2026-08-15 |
| 261 | Answer already-stopped for a project whose reconciliation positively established absence | ADR-260815-selected-runtime-stop-control | 2026-08-15 |
| 262 | Keep explicit Restart eligible for an adopted runtime under the unchanged restart contract | ADR-260815-explicit-workbench-restart-control | 2026-08-15 |
| 263 | Await a project's reconciliation settlement in workbench acquisition before resolving a target | ADR-260812-in-process-workbench-reverse-proxy | 2026-08-15 |
| 264 | Join concurrent acquisitions across a reconciliation boundary to one settlement and one outcome | CORE-COMPONENT-260812-stable-workbench-proxy | 2026-08-15 |
| 265 | Abort in-flight reconciliation at manager shutdown without claiming unobserved absence | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 266 | Prohibit a late reconciliation observation from changing a later generation's state | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 267 | Keep a workbench child's standard streams independent of its launching process lifetime | CORE-COMPONENT-260808-host-process-environment | 2026-08-15 |
| 268 | Store the per-runtime diagnostic file at mode 0600 inside its ephemeral runtime-data directory | CORE-COMPONENT-260808-filesystem-path-safety | 2026-08-15 |
| 269 | Prohibit reconciliation from creating, modifying, or deleting anything inside a project directory | CORE-COMPONENT-260808-filesystem-path-safety | 2026-08-15 |
| 270 | Route adopted identities through the unchanged termination sequencer and its bounds | ADR-260815-termination-sequencer-boundary | 2026-08-15 |
| 271 | Exclude finer reconciliation refusal classes from events and browser-visible surfaces | CORE-COMPONENT-260808-structured-runtime-logging | 2026-08-15 |
| 272 | Derive the expected workbench argv prefix from the installed runtime's real path and installation root | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 273 | Prohibit comparing a candidate's argv[0] to the configured executable path; supersedes decision 253's executable element | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 274 | Refuse the whole reconciliation pass when the installed-runtime identity cannot be resolved | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 275 | Attribute a runtime's loopback listener to an exactly observed conforming member of its own process group | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 276 | Decide candidacy by canonical-path and owner-token markers so path and token refusals stay reachable | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 277 | Evaluate the specific path, owner-token, and port checks before the wholesale argv byte-equality check | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 278 | Declare startup reconciliation a required boundary capability and invoke it unconditionally | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 279 | Prohibit automatic death observation for an adopted runtime and correct it only on demand | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 280 | Record a delivered corrective event on an adopted runtime as its own path's event, never a reconciliation event | CORE-COMPONENT-260808-structured-runtime-logging | 2026-08-15 |
| 281 | Measure the 15,000 ms reconciliation ceiling from the replacement API process spawn instant | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 282 | Bound internal reconciliation at 11,000 ms inside a declared 3,000 ms startup headroom and 1,000 ms response allowance; supersedes decision 241's internal bound | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 283 | Finalize a teardown claim only atomically from an independent re-observation with per-class probe completion | CORE-COMPONENT-260808-runtime-lifecycle-error-handling | 2026-08-15 |
| 284 | Isolate every marker-bearing negative control as the sole candidate for its own registered project | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 285 | Prohibit a marker-bearing control from living during a pass that must attribute that project's survivor | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 286 | Prove every marker-bearing control removed by independent re-observation before the survivor pass begins | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 287 | Prove a coexisting control's non-candidacy by computing both markers from its observed argv | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 288 | Settle every negative control through the production predicate, never by exemption or pre-classification | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 289 | Require every deterministic scenario row to be produced by executing production paths with an execution witness | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 290 | Require every claimed API generation to execute the repository's compiled API entry with host-observed evidence | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 291 | Prohibit placeholder, in-process, synthesized, or assigned API generations as restart evidence | ADR-260815-api-restart-runtime-reconciliation | 2026-08-15 |
| 292 | Record readiness-observation evidence per project, never in one shared row-level counter | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 293 | Require zero readiness observations for a project refused before readiness and at least one for a project that reached it | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 294 | Attribute every readiness observation from the primitive call ledger and fail closed when attribution is ambiguous | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-15 |
| 295 | Refuse `group-scan-incomplete` when a completed process-group enumeration omits the candidate leader | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-16 |
| 296 | Take the candidate leader identifier from the attribution boundary, never from the enumeration being tested | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-16 |
| 297 | Test process-group membership before any listener, descriptor, or readiness observation for that candidate | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-16 |
| 298 | Arm every reconciliation poll gap from the trusted scheduler and prohibit awaiting a fallible delay primitive | ADR-260815-api-restart-runtime-reconciliation | 2026-08-16 |
| 299 | Clamp every reconciliation poll gap inside its enclosing bounded window and abandon it on cancellation | ADR-260815-api-restart-runtime-reconciliation | 2026-08-16 |
| 300 | Permit bounded refusal-reason enum names in trusted inspection and in committed validation evidence | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-16 |
| 301 | Prohibit raw host values from every public surface and from every committed evidence artifact | CORE-COMPONENT-260815-host-runtime-attribution-evidence | 2026-08-16 |
