# Implementation Notes: Issue 33 / BL-014

## Scope delivered

Implemented Phase 0 deterministic proxy-event correlation and evidence-backed terminal-parity timing, followed by the planned A/B/C session-switching, reconnection, evidence, residual-audit, documentation, and paved-validation work. Runtime lifecycle and session ownership remain unchanged; BL-015 performance benchmarking and lifecycle controls remain excluded.

## Completed tasks

- T-0 through T-9 are complete in dependency order.
- The root justfile exposes verify-focused, verify, the repeated Phase 0 gate, the BL-014 designated gate, and the independent BL-014 residual audit.
- Playwright execution uses one worker and zero retries. Terminal command and proxy classification paths use one attempt with bounded evidence settlement.

## Acceptance evidence

### AC-1

The designated Chromium artifact at test-results/bl-014/session-switching/switching-browser.json records exactly A, B, and C, each with initialStartCount 1, three distinct identity digests, stable safe project tokens, and project-specific file, Git, and sentinel digests. Exact PID/start/port/path identities are retained only in the mode-0600 restricted-authority artifact.

### AC-2

apps/api/src/session-switching-contract.ts defines one repository counter at 250 ms cadence with a 60000 ms maximum, below the 90000 ms limit. tests/e2e/session-switching.spec.ts dispatches it once and records its exact PID/start identity privately. Executed visible/away/return sequences advanced through 13, 36, and 80.

### AC-3

The browser test executes keyboard A to Home to B to Home to C to Home to A, followed by B and C revisits. The component and API matrices execute exact focus, URL, and per-ID reuse boundaries. The retained lifecycle ledger reports Home/Close/Stop/Restart/Shutdown counts all zero.

### AC-4

Disposable Git fixtures define distinct known files, branches, untracked status files, Git configuration sentinels, and terminal sentinels. The designated browser opens each file and executes bounded cwd, repository-root, branch, status, and sentinel terminal assertions. Public file/Git/sentinel digests are pairwise project-specific.

### AC-5

Two A-away samples were read from disposable output without A browser interaction. They retain one PID digest and strictly increase from sequence 13 to 36.

### AC-6

A returns with its original identity digest and one initial start, the known A file visible, A-specific terminal/Git/cwd/sentinel checks, and visible sequence 80, later than both away samples.

### AC-7

The exact Projects/Open re-entry ledger is B, C, A, B, C. Every row reports reused true and startCount, stopCount, and shutdownCount zero. History, reload, fresh-context, client-close, and reopen operations are retained separately.

### AC-8

apps/web/src/session-switching-component.test.tsx executes keyboard Open actions, lists each A/B/C card once, retains expected focus, exposes existing Open/Close actions, and proves no Stop or Restart control. No lifecycle UI was added.

### AC-9

One native Back/Forward episode is recorded outside Open counts. The designated scenario asserts the correct surfaces and unchanged B identity; no lifecycle exit event is observed.

### AC-10

The artifact reports one A reload and one fresh B context. Cookies/origin storage start empty, cache and origin data are cleared, and service workers are blocked. B reconnects to its original runtime. The observed serverStateOutcome and browserEditorOutcome are both unsupported; no broader restoration claim is made.

### AC-11

One B client-context close reports bClientCloseStopCount 0. A and C identities remain usable, and reopening B reuses its original identity. Reopen restoration is classified with the same closed restored-or-unsupported rule.

### AC-12

Thirteen token-attributed workflow rows record 13 Management and 11 ExtensionHost role observations, zero unknown roles, stable-prefix routing, and zero public authority leaks. Reused ExtensionHost channels explain Management-only reconnection rows without changing runtime identity.

### AC-13

The proxy failure matrix correlates each executed request or upgrade by event cursor, project token, transport, and classification and requires exactly one event within one 5000 ms settlement wait plus a 25 ms duplicate quiet window. Terminal parity retains eight monotonic real phases, dispatchCount 1, and playwrightRetries 0. Contract tests reject missing, static, duplicated, cross-token, unchanged, unsafe, retried, over-bound, and assigned-cleanup mutations.

### AC-14

Public evidence is versioned and contains safe tokens, classes, counts, and digests. Exact authorities exist in exactly one ignored regular mode-0600 artifact. The public privacy scan reports zero literal matches. Transition/project, away, reconnect, manifest, and measured cleanup dimensions validate as complete.

### AC-15

The final residual artifact reports A/B/C project residuals zero. Concrete before-to-after inventories are: terminal commands 1 to 0, browser contexts 3 to 0, pages 3 to 0, proxy operations 13 to 0, runtime groups 3 to 0, listeners 5 to 0, sockets 24 to 0, web service 1 to 0, API service 1 to 0, database files 1 to 0, and fixtures 3 to 0. Fixture manifests are equal and the unrelated control listener remains unchanged until separately closed.

### AC-16

README.md, docs/README.md, docs/session-switching.md, docs/project-runtime.md, docs/stable-workbench-routing.md, docs/workbench-proof.md, apps/api/src/routes/README.md, and .harness/engineering-harness.md document the exact workflow, ownership, no-stop behavior, bounded commands, evidence policy, cleanup, unsupported observed restoration result, and BL-015/lifecycle exclusions. Documentation contract tests pass.

### AC-17

Repeated Phase 0, designated terminal, BL-014, prior BL-010 through BL-013, full repository, residual, and harness readiness commands passed with no hidden or Playwright retry. Harness boot returned readiness ready in 522627 ms within its 610000 ms checks bound.

## Focused and designated validation

- just verify-focused apps/api/test/workbench-route-acceptance.test.ts --reporter=verbose: passed, 4 tests.
- just verify-session-switching-phase0 invoked three times; its two-run contention recipe produced six passing Phase 0 executions.
- just proof-terminal-parity: passed, 2 Chromium tests in about 1.1 minutes; retained eight real bounded timing phases, one dispatch, and exact readiness consequence.
- just verify-focused for session contracts, residual contract, route acceptance, and terminal timing: passed, 10 tests.
- just verify-session-switching: passed unit/component/API matrix, one no-retry Chromium scenario in about 1.7 minutes, and residual audit.
- Focused capacity and keyboard contention corrections: passed, 10 and 2 tests respectively.
- BL-010, BL-011, BL-012, and BL-013 designated/regression gates and their residual audits passed during implementation and full validation.

## Full validation

- Final just verify: passed with exit 0 after the last implementation edit.
- Final harness boot: status ok, readiness ready, duration 522627 ms, checks bound 610000 ms.
- Final just proof-session-switching-residual-audit: status ok, restricted mode 600, every project/resource residual zero.
- Validation retries remain zero; finite contention bounds were corrected instead of re-executing commands internally.

## Documentation impact

Changed application and operational documentation listed under AC-16. The API route documentation only clarifies existing behavior; there is no API contract, schema, configuration, default, deployment, or migration change. No ADR, core-component contract, or decision-log update is required because in-memory runtime ownership, code-server server-session ownership, stable routing, and client-local disconnect semantics are unchanged.

## Regression corrections

- Settled the BL-010 virtual process-exit mock during termination so shutdown cannot hang.
- Made BL-013 numeric protected-value scans honor numeric boundaries, avoiding timing-decimal false positives.
- Added finite one-attempt full-contention bounds for short capacity classification workloads and the component keyboard matrix.
- Replaced assigned BL-014 cleanup zeros with concrete inventories and exact post-cleanup audits.

## Observation evidence

Captured through the real harness observe executable: DL-702 through DL-720, COORD-077 through COORD-082, INS-139 through INS-141, SUGG-019, WIN-043 through WIN-049, and CONF-106 through CONF-107. These records cover unavailable inspection tools, edit/format backtracks, designated waits, restoration/socket insights, full-contention failures, finite-bound corrections, successful full validation, and successful harness readiness.

Implementation evidence is complete; final acceptance remains owned by Verify.
