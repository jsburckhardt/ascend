# Verification Summary: Issue #7 — BL-002 Host-Native Terminal Parity

- **Work item:** `project/work-items/7-bl-002-prove-host-native-terminal-parity`
- **Branch:** `feat/7-prove-host-native-terminal-parity`
- **Implementation commit:** `b06de68ae165a0ae1f68890f9c487b803e1b213d`
- **Pull request:** https://github.com/jsburckhardt/ascend/pull/8
- **Base commit:** `fa32a6f920ef8043cb69652a85cf990882738518`

## Acceptance decisions

- **AC-1 — Passed.** The paved parity recipe runs the real Chromium sensors. The passing episode opens one integrated terminal at the canonical fixture with a 90,000 ms bound; the forced real scenario proves nonzero overall timeout and exact cleanup under a 20,000 ms injected bound.
- **AC-2 — Passed.** Regenerated raw and episode evidence records matching direct/integrated hostname and `vscode` user results; real E2E assertions pass.
- **AC-3 — Passed.** Regenerated integrated `pwd -P` equals the canonical launch path containing the fixture space and semicolon.
- **AC-4 — Passed.** Contract tests pin exactly the six required commands. Both contexts record canonical cwd, 5,000 ms bounds, exits, separate streams, normalization, and matching parity rows.
- **AC-5 — Passed.** Shared normalization changes only CRLF/lone CR to LF, preservation tests pass, and episode evidence references both raw artifacts.
- **AC-6 — Passed.** Only `PATH` is retained and classified. The regenerated differing paths are allowed because every fixed executable canonical resolution matches; equal and failure-causing cases are tested.
- **AC-7 — Passed.** Tests prove distinct typed pre-browser missing-executable, direct/integrated nonzero, direct/integrated per-command-timeout, and overall-timeout failures with required names and contexts.
- **AC-8 — Passed.** Coordinator tests and both real scenarios prove exact tracked-command cancellation, explicit browser close, exact workbench process-group stop, and separate command/PID/listener absence audits.
- **AC-9 — Passed.** Retained implementation evidence maps AC-1 through AC-11 and records commands, bounds, outputs, raw references, designated-host facts, tool/code-server versions, cleanup, and disposition.
- **AC-10 — Passed.** Root, API, documentation-index, runbook, harness governance, and harness-change documentation consistently describe the forced timeout-cleanup and passing parity scenarios and match committed behavior.
- **AC-11 — Passed.** Independent `just verify` exited 0.

## Validation results

- **Exact handoff — Passed:** branch and HEAD matched the Implement handoff; initial tree was clean.
- **Complete diff review — Passed:** all 23 changed files and 3,103 diff lines were inspected; scope remains within the BL-001 proof boundary and no ADR/core-component artifact change was needed.
- **Commit standards — Passed:** all four implementation commits use Conventional Commits and contain the required Copilot co-author trailer.
- **Documentation review — Passed:** applicable README, API, usage, architecture, operational, and harness documentation is accurate. No HTTP API/schema, configuration, data-format, migration, deployment, or production-operation change requires additional documentation.
- **`just verify` — Passed:** formatting, lint, strict typecheck, 34 API tests, 1 web test, API/web builds, and 3 Chromium tests passed.
- **Generated evidence review — Passed:** disposition passed; raw references resolve; all parity rows match; browser, command, exact-handle, and listener cleanup fields pass.

## Shipping

The verified branch was pushed, PR #8 was created, and all eleven Issue #7 acceptance checkboxes were updated only after every criterion passed.
