# Task Breakdown: BL-014 Preserve Sessions While Switching Among Projects

## Task T-0: Stabilize proxy failure-event classification under concurrency

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** None
- **Acceptance Criteria:** AC-13, AC-17
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-development-standards

### Description
Replace the failure-matrix shared `events.length = 0` plus immediate lookup with execution-correlated observation and bounded event settlement. Correlate each real stable-route request or upgrade to the expected project token, transport, and failure classification, and await the matching emitted event before advancing. Do not move event emission, change public failures, add product retries, or weaken the 23-row executable matrix. Add controlled concurrent traffic so late events from another execution cannot satisfy or erase a row.

### Acceptance Criteria
- AC-13: Every failure classification is derived from its executed request or upgrade and cannot be assigned from the table.
- AC-17: Focused, repeated-contention, and full-concurrency runs produce the same classification/event result without retry.

### Test Coverage
- Update `apps/api/test/workbench-route-acceptance.test.ts` with unique execution correlation and bounded event waits.
- Add negative coverage for missing, late, duplicate, wrong-token, wrong-transport, and wrong-classification events.
- Run the route test repeatedly beside competing Vitest work and through the normal full package test topology.

### Expected Evidence
- Focused and contention command results with zero retries.
- Twenty-three uniquely correlated event records with exact classification and cleanup.
- Diff showing no product proxy response/event semantic change.

## Task T-1: Make terminal-parity readiness and timeout evidence based

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** None
- **Acceptance Criteria:** AC-13, AC-17
- **Related ADRs:** ADR-260808-governed-engineering-harness, ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-development-standards

### Description
Instrument the designated BL-001 terminal-parity episode by monotonic phase: prerequisite/direct capture, workbench start, exact owned listener and health consequence, browser workbench readiness, terminal creation, one command dispatch, command evidence, and cleanup. Replace the three-dispatch `startTerminalCommandOnce` loop with one lock-guarded dispatch followed by one bounded evidence wait. Retain cleanup reserve and partial failure timing. Derive committed per-step and overall bounds from retained standalone and full-contention measurements plus an explicit margin; do not hide retry inside helper, Playwright, harness, or recipe.

### Acceptance Criteria
- AC-13: Readiness and timeout rows are executed, measured, bounded, and rejected when assigned, missing, retried, or over bound.
- AC-17: The designated terminal parity gate and full validation pass under contention with one dispatch and Playwright retries zero.

### Test Coverage
- Unit-test timing schema, exact listener/HTTP readiness, early exit, cancellation, timeout, cleanup reserve, and negative mutations.
- Run designated proof standalone and repeatedly with controlled CPU/test contention.
- Run `just verify` and `harness boot` to exercise the same declared bounds in full order.

### Expected Evidence
- Retained per-step monotonic timing and readiness consequences.
- `dispatchCount: 1`, `playwrightRetries: 0`, and no wrapper rerun.
- Bound derivation recording measured contention maxima and fixed margin.
- Exact terminal command, browser context, process, listener, and fixture cleanup.

## Task T-2: Define three fixtures and BL-014 evidence contracts

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-0, T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-4, AC-13, AC-14
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260806-agent-executable-acceptance-criteria, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Create one source-owned definition for exactly three disposable Git fixtures A, B, and C. Give each a stable ID/name, branch, committed known file/editor sentinel, distinct untracked status file, Git config sentinel, and expected terminal values. Define the A counter executable and its 250 ms cadence, visible sequence format, disposable output, PID identity, and 90-second maximum. Define versioned matrix, browser, restricted, and residual schemas before implementing the scenario.

### Acceptance Criteria
- AC-1: Fixture generation accepts exactly A/B/C and records all initial identity and workbench dimensions.
- AC-2: The A command contract has one increasing sequence, 250 ms cadence, disposable output, and a ≤90 second bound.
- AC-4: B/C expected cwd, root, branch, status, file, and sentinel values are pairwise distinct.
- AC-13: Validators reject assigned/static identity or state, duplicate starts, token swaps, and unchanged sequence constants.
- AC-14: Schemas require complete transition/project mappings, manifests, safe public data, and restricted authority ownership.

### Test Coverage
- Unit-test fixture cardinality, Git manifest generation, command bounds, and pairwise distinct values.
- Mutation-test all required evidence rejection cases plus missing transitions/resources and unsafe values.
- Validate public/restricted file names, ignore status, regular-file type, and mode `0600` for exact authority evidence.

### Expected Evidence
- Executed fixture manifest for exactly three projects.
- Versioned schema and negative-mutation matrix.
- Public-safe digest/token contract and one declared restricted artifact contract.

## Task T-3: Execute navigation, history, Home, no-stop, and reuse matrices

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-2
- **Acceptance Criteria:** AC-3, AC-7, AC-8, AC-9, AC-13
- **Related ADRs:** ADR-260812-browser-navigation-shell, ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-development-standards

### Description
Add execution-backed component and API matrix rows for A/B/C stable URL generation, keyboard Open focus, exactly one card per fixture, native Back/Forward, five Projects/Open re-entries, and per-ID manager reuse. Instrument lifecycle calls so each Home action proves zero stop and shutdown invocation. Preserve the existing Open/Close UI boundary and native full-document navigation; add no router or lifecycle control.

### Acceptance Criteria
- AC-3: The exact A→Home→B→Home→C→Home→A keyboard sequence records URL/focus/count/identity fields and zero Home lifecycle calls.
- AC-7: Exactly five Open re-entry rows are distinguished from history, reload, and direct reconnection rows and all five are reuse.
- AC-8: Home renders A/B/C once, has expected keyboard focus, and exposes no Stop/Restart control; Close is present but never invoked.
- AC-9: One Back/Forward execution changes surfaces without a start, stop, identity change, or cross-state row.
- AC-13: Matrices execute navigation generation, history, no-stop, and per-ID reuse through their production boundaries.

### Test Coverage
- React component events with keyboard activation and focus assertions.
- Browser History event matrix with exact URL and generation order.
- Fastify/runtime matrix with three launches, project-local reuse, zero stop/shutdown, and event IDs.
- Negative mutations for duplicate card/entry/start, direct-assigned count, wrong focus, and history counted as Open.

### Expected Evidence
- Versioned component/API matrix with unique execution and event IDs.
- Exact five-entry Open ledger and separate history/reconnection ledgers.
- Three launches total, all later project-local acquisitions reused, zero lifecycle calls from Home.

## Task T-4: Build the designated three-project browser harness

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-2
- **Acceptance Criteria:** AC-1, AC-2, AC-4, AC-12, AC-15
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260810-full-page-browser-workbench-presentation, ADR-260812-in-process-workbench-reverse-proxy, ADR-260812-browser-navigation-shell
- **Related Core-Components:** CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Create disposable A/B/C repositories from T-2 definitions, an isolated SQLite library, in-process API/runtime/proxy owners, one exact web process group, and an unrelated control listener. Register all three, open them through Home in B, C, A order so A is displayed after all initial starts, and capture initial Explorer/editor/terminal/Git state and immutable runtime identity. Instrument safe lifecycle/proxy events and every Workbench socket before navigation begins.

### Acceptance Criteria
- AC-1: Exactly three projects register and start once through Home/Open; all required initial evidence is observed.
- AC-2: A known file and one visible counter command start before switching.
- AC-4: B/C distinct files and bounded terminal proofs execute before re-entry.
- AC-12: Entry sockets/events are token-attributed and stable-prefix classified without public authority leakage.
- AC-15: Every harness owner exposes exact cleanup identity and audit boundaries.

### Test Coverage
- Designated Chromium setup uses one worker and zero retries.
- Assert fixture and SQLite creation, exact start order/count, runtime ownership, socket role capture, and control listener identity.
- Exercise setup failure paths through the same cleanup owner.

### Expected Evidence
- Initial A/B/C restricted identity records and public digests/classes.
- One Management and one ExtensionHost classification per successful initial workflow, subject to observed protocol evidence.
- Pre-scenario manifests and owned-resource inventory.

## Task T-5: Execute switching, liveness, return, history, and reconnect flows

- **Status:** Complete
- **Complexity:** Very High
- **Dependencies:** T-3, T-4
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12
- **Related ADRs:** ADR-260810-full-page-browser-workbench-presentation, ADR-260812-browser-navigation-shell, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-host-process-environment

### Description
Using keyboard-only Projects/Open interactions, execute A→Home→B→Home→C→Home→A, then revisit B and C once each. Take at least two A liveness/output samples through exact process/file sensors while A is away and without browser interaction. Insert one separately classified Back/Forward sequence. On return verify A identity, PID, later visible sequence, file, cwd, Git, and sentinel. Verify B/C retained state on the fourth and fifth Open re-entries. Separately reload A, clear all client storage/cache/service workers in a fresh direct B context, close B, prove A/C usability, and reopen B with the same runtime.

### Acceptance Criteria
- AC-1–AC-4: Initial state and exact keyboard switching use only the three declared projects and their distinct values.
- AC-5: Two independent away samples retain A PID and strictly advance output.
- AC-6: A returns on its original runtime and command with later visible state and no second start.
- AC-7: Exactly five Open re-entries retain B/C/A/B/C state and use reuse only.
- AC-8: All Home interactions remain keyboard usable and invoke no Close/Stop/Restart.
- AC-9: Back/Forward is bounded and recorded outside the five Open count.
- AC-10: A reload and storage-cleared B direct link reuse the runtime and produce one closed server-state outcome plus separate browser-local editor classification.
- AC-11: B client close does not stop B; A/C remain usable; B reopen reuses identity/state.
- AC-12: Every entry/reconnection has safely attributed events and Management/ExtensionHost socket roles.

### Test Coverage
- One designated Chromium scenario with finite named steps and cleanup reserve.
- Browser assertions for keyboard focus, URLs, file/tab/terminal visibility, storage/cache/service workers, and exact entry counts.
- OS/runtime assertions for identity, command liveness, file sequence, lifecycle counts, and listener ownership.
- Cross-project negative scans and socket/event attribution checks at every workflow.

### Expected Evidence
- Ordered transition ledger with exact URLs/focus/counts and safe identity digests.
- Two A away samples and return values proving strict advancement.
- Exactly five Open re-entry rows; separate reload/history/direct-link/client-close rows.
- One closed `restored` or `unsupported` server-owned restoration outcome used consistently for fresh and reopen checks.

## Task T-6: Materialize privacy-safe and restricted evidence

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-5
- **Acceptance Criteria:** AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Write public evidence containing only safe tokens, route shapes, classes, counts, timings, and digests. Write exactly one ignored regular mode-0600 restricted artifact for exact PID/start/port/path values needed for independent proof and cleanup. Validate complete project/transition joins and classify code-server server-state restoration without treating browser-local editor state as server-owned. Do not retain commands, terminal output, socket payloads, credentials, reconnection tokens, raw canonical paths, or internal authority publicly.

### Acceptance Criteria
- AC-5–AC-12: All behavioral observations are joined to the correct project, transition, event, socket, and identity.
- AC-13: Validators reject synthetic, duplicated, misattributed, unchanged, missing, and over-bound evidence.
- AC-14: Retained evidence is complete and policy compliant, including away, reconnect, manifests, and cleanup placeholders.

### Test Coverage
- Positive validation of actual matrix/browser/restricted artifacts.
- Negative mutations for static identity, duplicate start, cross-token event/socket, unchanged sequences, ambiguous restoration outcome, missing map dimension, unsafe authority, and assigned cleanup.
- Git-ignore, permission, file-type, and public repository scan checks.

### Expected Evidence
- Versioned public matrix/browser artifacts with zero protected matches.
- One valid restricted authority artifact at mode `0600`.
- Validator mutation report proving every required rejection.

## Task T-7: Prove exact cleanup and residual absence

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-5, T-6
- **Acceptance Criteria:** AC-11, AC-14, AC-15
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260810-sqlite-persistence-lifecycle, CORE-COMPONENT-260808-filesystem-path-safety

### Description
Terminate the A counter and any remaining bounded command by exact PID/start identity, close all pages/contexts/sockets, stop proxy before runtimes, stop all three runtime groups/listeners and web/API services, close/remove only owned SQLite artifacts, compare pre/post fixture manifests, then remove fixtures. Audit each project and each declared resource class independently. Preserve the unrelated control listener through owned cleanup, record its unchanged identity, then close it separately.

### Acceptance Criteria
- AC-11: B client close remains client-local before global cleanup.
- AC-14: Measured cleanup and pre/post manifest equality are joined into retained evidence.
- AC-15: Every project/resource residual is measured zero and the unrelated listener is unchanged until separate cleanup.

### Test Coverage
- Cleanup executes on pass, assertion failure, timeout, setup failure, and client-close paths.
- Residual validator rejects missing owner, assigned zero, nonpositive before count, wrong cleanup order, surviving PID/listener/socket/database/fixture, or changed control listener.
- Run residual audit immediately after focused and full gates.

### Expected Evidence
- Three zero project partitions and complete zero resource-class matrix.
- Exact runtime/process-group/listener/socket/command/service/database/fixture audits.
- Equal manifests, absent disposable counter output, and control survival/cleanup records.

## Task T-8: Document persistence ownership, limits, and operations

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-6, T-7
- **Acceptance Criteria:** AC-16
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260812-browser-navigation-shell, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Update README surfaces, docs index, runtime and stable-routing runbooks, and add a BL-014 switching runbook. Record exact sequence, no-stop semantics, code-server versus browser ownership, restored-or-unsupported outcome, finite commands/bounds, artifacts, cleanup, and observed result. Remove factual BL-014 deferrals from application docs while retaining BL-015 and lifecycle exclusions. Record the architecture no-impact rationale. If implementation changes session ownership, stop and return to Plan for an ADR/core-component/decision-log update before proceeding.

### Acceptance Criteria
- AC-16: All required behavior, ownership, commands, bounds, evidence, cleanup, outcome, and exclusions are documented accurately.

### Test Coverage
- Documentation contract tests assert exact command names, sequence/counts, ownership limits, artifact paths, cleanup, and deferrals.
- Search for stale BL-014 deferred claims in application docs and classify architecture scope text separately.
- Verify links and README/docs index discoverability.

### Expected Evidence
- Documentation diff and passing documentation tests.
- Explicit no schema/API/config/deployment migration statement.
- Explicit no architecture artifact/log change rationale unless Plan is re-entered.

## Task T-9: Add paved gate and run authoritative regressions

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-0, T-1, T-2, T-3, T-4, T-5, T-6, T-7, T-8
- **Acceptance Criteria:** AC-17
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260806-rpiv-stage-contract

### Description
Add root recipes for the BL-014 unit/matrix/browser gate and independent residual audit, then place the gate after Phase 0 prerequisites in `just verify`. Run proxy and terminal stability regressions repeatedly under controlled contention, run the new no-retry designated scenario, then execute BL-010, BL-011, BL-012, BL-013, `just verify`, and `harness boot`. Regenerate BL-012 mutable evidence only through its designated gate and never cite residual-test fixtures as BL-014 proof.

### Acceptance Criteria
- AC-17: Full repository validation and all BL-010–013 gates complete successfully with BL-014, no hidden or Playwright retry, and clean residuals.

### Test Coverage
- `just verify-project-runtime`, `just verify-workbench-route`, `just verify-home-workbench`, `just verify-project-runtime-isolation`, the new BL-014 gate, and every residual audit.
- Repeated Phase 0 and BL-014 runs under contention with recorded wall/step timing.
- `just verify` and `harness boot` from the committed implementation tree.

### Expected Evidence
- Command/result table with durations, retry counts, and artifact paths.
- Passing residual audits after focused and full runs.
- Clean tracked-tree and generated-evidence ownership report.
