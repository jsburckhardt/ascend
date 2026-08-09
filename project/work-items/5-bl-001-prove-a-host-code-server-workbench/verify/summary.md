# Verification Summary: BL-001: Prove a host code-server workbench

- **Issue:** #5
- **Work item:** `project/work-items/5-bl-001-prove-a-host-code-server-workbench`
- **Verified branch:** `feat/5-prove-host-code-server-workbench`
- **Implementation commit:** `a1ed289036a112a01b0171189a04e28c38a9e3e5`
- **Base commit:** `7e08d97d386c1816ac652d0e212438d7f743fe81`
- **Pull request:** https://github.com/jsburckhardt/ascend/pull/6
- **Result:** Accepted

## Acceptance Decisions

- **AC-1 — Passed.** The start recipe emitted one versioned PID/loopback-URL handle after documented HTTP readiness within the startup bound.
- **AC-2 — Passed.** Exact-handle stop and repeated stop exited 0, exact process/listener absence was recorded, and an unrelated process survived integration coverage.
- **AC-3 — Passed.** Before/after fixture membership and sentinel hashes were identical.
- **AC-4 — Passed.** Managed process rows were non-root `vscode` uid/euid 1000 and attributed listeners were loopback-only.
- **AC-5 — Passed.** Five consecutive standalone E2E runs passed 10/10 tests; the full gate also observed Explorer, native Markdown Preview, and exact rendered text.
- **AC-6 — Passed.** The canonical space/semicolon fixture path appeared as one argv entry and the injection sentinel remained absent.
- **AC-7 — Passed.** The five named startup failures returned nonzero, condition-specific diagnostics with cleanup assertions.
- **AC-8 — Passed.** Failure and browser paths used exact cleanup; final evidence reported no managed process/listener, unchanged fixture/injection state, and allowlisted disposables only.
- **AC-9 — Passed.** The retained implementation record maps every criterion to command, result, artifact, host facts, prerequisites, bounds, cleanup, and observation.
- **AC-10 — Passed.** The configured full validation gate passed.

## Validation Results

- **Command interface — Passed.** Root `justfile` exposes `verify-focused` and `verify`.
- **Focused validation — Passed.** `just verify-focused`: 7 files and 13 tests passed.
- **Standalone E2E stability — Passed.** Five consecutive `just test-e2e` runs: 10/10 Playwright tests passed.
- **Full validation — Passed.** Independent `just verify`: formatting, lint, typecheck, 13 unit/integration tests, build, and 2 Playwright tests passed.
- **Cleanup evidence — Passed.** Final episode recorded exact-handle absence, two successful stops, equal fixture snapshots, absent injection sentinel, and only declared disposable artifacts.

## Scope, Architecture, Commits, and Documentation

The complete 27-file branch diff was reviewed against the action plan and test plan. It remains limited to the bounded BL-001 proof and complies with the referenced direct-host, path-safety, lifecycle, structured-logging, command-interface, development, and harness contracts. No ADR or core-component addition was required.

Both implementation commits use Conventional Commit subjects and contain the required Copilot co-author trailer.

Documentation review passed for README, API, configuration, usage, architecture/harness, operational, and deployment-impact coverage. No API specification or migration applies because no HTTP route, schema, data, default, or production deployment contract changed. The runbook matches the committed handle schema, readiness, timeouts, diagnostics, cleanup, generated evidence, and narrow detached-frame retry behavior.
