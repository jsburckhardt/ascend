## Verify Report - #41

**Scope:** BL-018 - Restart a running or failed workbench
**Branch:** `feat/41-restart-running-or-failed-workbench`
**Implementation Commit:** `c91fd51205ed94b8c8665f2454606b6e237dd6bc`
**Pull Request:** https://github.com/jsburckhardt/ascend/pull/42

## Acceptance Decisions

| ID | Status | Concrete evidence |
| --- | --- | --- |
| AC-1 | Passed | Exact release-before-replacement manager contract and designated three-generation runtime episode passed. |
| AC-2 | Passed | Manager and matrix cover retained failed entries and all five prior-resource classes. |
| AC-3 | Passed | Contract proof maps internal `restarting` only to public `Starting`; public vocabulary remains four states. |
| AC-4 | Passed | Designated episode proves held HTTP/WebSocket closure and stable-route reachability for replacements. |
| AC-5 | Passed | Matrix and designated proof retain registration plus fixture metadata, content, modes, and timestamps. |
| AC-6 | Passed | Global `value.close !== undefined` guard and hook/component regressions make cross-project Restart inert while preserving peer Close during a pending Restart. |
| AC-7 | Passed | Manager, route, browser, matrix, and guard coverage prove accepted event pairs, pre-admission silence, and safe disclosure. |
| AC-8 | Passed | Incomplete release settles retryable `restart-release-unconfirmed` without replacement launch. |
| AC-9 | Passed | Bounded replacement failures retain actionable failures, install no successor, and encode withheld residual claims as `null`. |
| AC-10 | Passed | Eight concurrent callers join one operation, release, admission, replacement, event pair, and result. |
| AC-11 | Passed | Three sequential generations leave one ownership record after each settlement and zero audited residuals. |
| AC-12 | Passed | Fixed bounded refusal covers unknown, stopped, transitioning, and shutdown cases without unintended mutation. |
| AC-13 | Passed | Two-project matrix cases preserve the unrelated project's identity, route, registration, fixture, and controls. |
| AC-14 | Passed | Generation guards quarantine or ignore late release, launch, health, connection, and cleanup settlements. |
| AC-15 | Passed | Unknown browser settlement remains explicit and permits only a fresh read-only observation. |
| AC-16 | Passed | The fixed 64-scenario catalog, guards, and mutation cases execute through the canonical gate. |
| AC-17 | Passed | Retained matrix SHA-256 matches and independent residual audit reports all seven residual classes at zero. |
| AC-18 | Passed | README, API, route, browser, runtime, routing, session, workbench-proof, and index documentation match behavior. |
| AC-19 | Passed | The one required canonical `just verify` run completed successfully. |
| AC-20 | Passed | Proof uses only repository-local fixtures, local code-server, loopback listeners, root recipes, and bounded timers. |

## Validation Results

- `just verify` passed once from the exact clean implementation handoff. It completed formatting, lint, type checks, package tests, builds, browser proofs, BL-018 deterministic coverage, the designated restart episode, and residual audits.
- The designated BL-018 episode passed: one real code-server start plus three replacement generations, with stale HTTP/WebSocket closure.
- The separate BL-018 residual audit passed: every checked residual class was zero, `unresolvedAdmissions` and `quarantinedIdentities` were empty, and `teardownResidualCount` was zero.
- The implementation handoff branch and SHA matched exactly before validation. The tree was clean before this verification-summary file was created.
- The completed task breakdown SHA-256 is `d5c1e1b9dd85102ea62058015828509c9847fb8ed605d181c9efe14859c6d5bd`.
- The retained matrix SHA-256 is `fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880`.
- Post-gate inspection found no directories under the disposable runtime root and no test-owned runtime listener or process residue. Host editor infrastructure was excluded from the test-owned residual determination.

## Documentation and Architecture Review

- The full branch diff is within Issue #41 scope and conforms to the restart, per-project lifecycle, runtime-state, selected-stop, and termination-sequencer ADRs plus the lifecycle, logging, filesystem-safety, and stable-proxy core-components.
- Restart documentation accurately describes eligibility, bounds, lifecycle projection, connection behavior, accessibility, privacy, evidence, cleanup, and BL-019/BL-020 boundaries.
- The revision-6 AC-6 correction changed no published documentation contract and required no new architecture artifact: the governing ADR already defines the global no-open-Close-dialog admission rule.

## GitHub Delivery

- Issue #41 acceptance-criteria block updated: all 20 criteria are checked without changing their text.
- Feature branch pushed normally without force.
- Pull request #42 created from the required template with title `feat(runtime): restart selected workbenches` and all AC decisions.

## Observation Evidence

- `DL-040`: bounded review required partitioning large delivery artifacts.
- `DL-041`: listener inspection fallback required a non-ripgrep command in this host.
- `DL-042`: the integrated canonical evidence gate required an extended wait.
- `DL-043`: the unavailable patch helper was captured; repository metadata was created with a standard patch application instead.
- `DL-044`: a verification-summary patch hunk count was corrected before staging.

## Status

Accepted and shipped pending coordinator review and merge.
