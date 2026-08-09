# Task Breakdown: BL-001: Prove a host code-server workbench

## Task T-1: Establish fixture, host prerequisites, and proof contract

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-3, AC-5, AC-6, AC-9
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-development-standards

### Description

- Add one tracked BL-001 project fixture. Its canonical Ubuntu path must contain a space and literal semicolon, and it must contain a distinct Explorer filename sentinel and Markdown rendered-text sentinel.
- Define deterministic tree-membership and sentinel-byte snapshots, an injection-sentinel candidate, and a finite disposable root under `test-results/bl-001` that excludes fixture content.
- Document fixed prerequisites: Ubuntu 24.04, hostname `03f809395a5d`, user `vscode` uid 1000, repository `/workspaces/ascend`, and `/home/vscode/.local/bin/code-server` 4.131.0.
- Define 15-second startup, 10-second stop, 60-second browser, and 120-second full-gate bounds. Reconcile the devcontainer and application documentation from code-server 4.117.0 to 4.131.0.

### Acceptance Criteria

- **AC-1:** The tracked fixture, canonicalization rule, HTTP readiness probe, and startup timeout are defined once.
- **AC-3:** The snapshot records every relative fixture path and byte hashes for the defined sentinels.
- **AC-5:** Explorer and Markdown Preview expected values are explicit and stable.
- **AC-6:** The fixture canonical path includes a space and `;`, and the injection sentinel is absent initially.
- **AC-9:** Host facts, prerequisites, bounds, and disposable paths are documented without secrets.

### Test Coverage

- Add a Vitest fixture-contract test for canonical path, relative membership, sentinel bytes, metacharacter presence, and injection-sentinel absence.
- Add a static configuration/documentation check for the 4.131.0 prerequisite.
- T-4 must import these constants instead of duplicating them.

### Expected Evidence

- Tracked fixture and sentinel files.
- Passing fixture-contract test and baseline snapshot.
- Documentation diff showing designated host facts and finite bounds.

## Task T-2: Implement bounded workbench lifecycle commands

- **Status:** Completed
- **Complexity:** Large
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-4, AC-6, AC-7, AC-8
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards

### Description

- Add a small single-owner runtime-management module under `apps/api/src` plus thin CLI adapters and root `just` proof-start/proof-stop recipes. Do not add API routes or web UI.
- Validate and canonicalize the fixture directory. Spawn the designated executable directly as `vscode`, without a shell, using an argument array with `127.0.0.1:0`, auth disabled, telemetry/update checks/workspace trust disabled, isolated user and extension data, and the fixture as one positional argument.
- Put each launch in a dedicated process group. Parse the emitted loopback URL, poll a bounded HTTP readiness check while monitoring early exit, and emit exactly one versioned JSON stdout handle containing PID and URL. Emit bounded non-sensitive structured events on stderr.
- Store minimal PID/URL/process-identity state only inside the disposable root. Make proof-stop read the handle from stdin, require exact state and process identity before signaling, stop only that process group, wait up to 10 seconds with bounded escalation, and return success when the exact process is already absent.
- Restrict deletion to the declared disposable run directory and injection-sentinel candidate. Never kill by process name or sweep listeners.

### Acceptance Criteria

- **AC-1:** Start exits 0 only after HTTP readiness and emits one parseable PID/loopback-URL handle within 15 seconds.
- **AC-2:** Stop targets only the exact managed group, is bounded, and succeeds when repeated after absence.
- **AC-4:** The process inherits the current `vscode` identity with no elevation and binds only to loopback.
- **AC-6:** The canonical path is one array entry; no shell evaluates its semicolon.
- **AC-7:** Validation, spawn, timeout, and early-exit failures are nonzero and condition-specific.
- **AC-8:** Every error path invokes exact-handle cleanup and only allowlisted artifact removal.

### Test Coverage

- Unit-test path validation, handle schema, URL parsing, readiness polling, safe diagnostics, identity matching, and idempotent stop.
- Integration-test a dedicated fake process group for stop, escalation, and unrelated-process survival.
- Assert diagnostics contain no fixture bytes, environment secrets, or raw protected command output.

### Expected Evidence

- Passing runtime-manager and CLI tests.
- Success handle and structured failure records.
- Exact process-state and cleanup audit showing no broad kill or removal.

## Task T-3: Cover failures, argument safety, and cleanup boundaries

- **Status:** Completed
- **Complexity:** Large
- **Dependencies:** T-2
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-6, AC-7, AC-8
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-development-standards

### Description

- Add dependency-injected fake executables: one exits early with a defined code and one remains alive without becoming ready. Use short test-only deadlines while preserving the 15-second production proof bound.
- Table-test exactly five startup failures: missing executable, nonexistent project path, regular-file project path, readiness timeout, and early exit. Require nonzero CLI results and stable diagnostics containing the relevant executable, path, timeout, or exit result.
- Capture spawned arguments as NUL-delimited values and prove the full canonical space/semicolon path is one entry. Check the injection sentinel before and after.
- After every row, audit only PIDs and URLs created by that row, assert no managed process group/listener remains, compare the disposable membership to its allowlist, and leave unrelated processes/listeners untouched.

### Acceptance Criteria

- **AC-1:** Success behavior remains covered without starting a second real code-server.
- **AC-2:** Targeted and repeated stop tests pass while an unrelated control process survives.
- **AC-3:** Snapshot helpers preserve fixture membership and sentinel hashes.
- **AC-4:** Audit helpers report only exact managed descendants and listeners.
- **AC-6:** NUL-delimited argv proves one canonical path argument and no injection side effect.
- **AC-7:** All five rows are nonzero, bounded, and diagnostic.
- **AC-8:** Finally-style cleanup and post-row audits report no managed leak or undeclared removal.

### Test Coverage

- Vitest table test for all five named failures.
- Linux process-group integration test for exact stop, escalation, idempotence, and unrelated-process survival.
- Argument-capture, fixture/disposable snapshot, listener-attribution, and injection-sentinel tests.

### Expected Evidence

- Five-row pass summary with exit and diagnostic schema.
- Per-row PID/URL cleanup verdict and disposable diff.
- NUL-delimited argv and absent injection-sentinel evidence.

## Task T-4: Automate one designated-host Chromium lifecycle

- **Status:** Completed
- **Complexity:** Large
- **Dependencies:** T-2, T-3
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-development-standards

### Description

- Add one serial Playwright Chromium scenario with a 60-second overall bound. Invoke proof-start, parse its handle, and put exact-handle proof-stop in `finally`.
- Before start, capture fixture membership/hashes, disposable membership, and injection-sentinel absence. While ready, walk exact descendants through `/proc`, record each user identity and NUL-delimited argv, and attribute the handle port to loopback TCP listeners only.
- Navigate to the emitted URL, use stable accessible VS Code workbench controls to find the Explorer sentinel, open the Markdown fixture, invoke native Markdown Preview, and assert rendered sentinel text.
- Stop once, verify process/listener absence, stop again for idempotence, compare all before/after snapshots, and emit a bounded machine-readable episode record under `test-results/bl-001`.
- Do not test Ascend routing, terminal parity, concurrent starts, interruption/recovery, or broader fault injection.

### Acceptance Criteria

- **AC-1:** Exactly one real code-server reaches readiness and emits the handle.
- **AC-2:** Exact-handle stop and repeated stop both succeed.
- **AC-3:** Fixture membership and bytes match before and after.
- **AC-4:** Every managed process is non-root `vscode`; every managed TCP listener is loopback.
- **AC-5:** Chromium proves Explorer sentinel, Markdown Preview, and rendered text.
- **AC-6:** Actual argv preserves the one path argument and no injection sentinel appears.
- **AC-7:** The same configured suite includes the five passing failure rows from T-3.
- **AC-8:** Finally cleanup and final audit report no managed leak and only declared disposable changes.
- **AC-9:** The machine record contains all fields needed by the retained implementation record.

### Test Coverage

- One Playwright test against actual code-server 4.131.0. The completed Verify correction retries only the transient detached-frame transition while the Markdown Preview webview is replaced, within the existing bounded exact-text poll; other browser errors still fail.
- Host audit assertions for OS, hostname, user, binary/version, `/proc` tree, argv, and TCP addresses.
- Before/after fixture/disposable/injection assertions and unconditional exact-handle cleanup.

### Expected Evidence

- Playwright pass and failure-only trace/screenshot paths.
- Structured episode record with handle, readiness, host facts, process tree, listeners, argv, snapshots, and cleanup.
- No remaining BL-001 run state or injection sentinel.

## Task T-5: Integrate, document, validate, and retain evidence

- **Status:** Completed
- **Complexity:** Medium
- **Dependencies:** T-1, T-2, T-3, T-4
- **Acceptance Criteria:** AC-8, AC-9, AC-10
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description

- Wire the five fake failure cases into `pnpm test` and the one real browser lifecycle into `pnpm test:e2e`; keep existing tests. Thus one `just verify` run executes exactly one real success lifecycle plus the five named failures.
- Keep harness boot non-persistent and test-backed. Update `.harness/engineering-harness.md` signals/evidence and add a harness-change record because `harness checks` gains a bounded host-process sensor; do not change live-service boot ownership or endpoints.
- Update root, API, and operational documentation with exact commands, prerequisites, handle schema, readiness/stop bounds, disposable set, diagnostics, cleanup, and troubleshooting.
- Run `timeout 120s just verify` noninteractively. In a final step that runs after success or failure, audit every emitted handle for absent process/listener, verify fixture integrity, and remove only declared BL-001 disposables.
- Complete `project/work-items/5-bl-001-prove-a-host-code-server-workbench/implementation/00-implementation.md` as the retained evidence record with all AC IDs, commands, exits, artifacts, host facts, prerequisites, bounds, cleanup, and observed results.

### Acceptance Criteria

- **AC-8:** Every configured path has finally cleanup, and the post-gate audit finds no exact-handle leak or undeclared removal.
- **AC-9:** The committed implementation record completely maps AC-1 through AC-10 and contains all required host and lifecycle facts.
- **AC-10:** The bounded configured full gate exits 0.

### Test Coverage

- Execute every entry in `03-test-plan.md`, including `timeout 120s just verify`; no focused command substitutes for the full gate.
- Inspect the evidence record for every AC ID and required fact.
- Run exact-handle process/listener, fixture, injection-sentinel, and disposable audits after the full gate.

### Expected Evidence

- `timeout 120s just verify` exit 0 and gate summary.
- Post-gate zero-leak and disposable-boundary report.
- Committed implementation evidence record plus harness governance/change-record diff.
