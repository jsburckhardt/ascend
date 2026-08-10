# Implementation Notes: Issue #7 — BL-002 Host-Native Terminal Parity

## Completed tasks

- T-1: Extended the BL-001 command, normalization, timeout, environment, and diagnostic contract.
- T-2: Added the shared bounded direct/integrated executor, preflight, process identity cleanup, and atomic raw evidence.
- T-3: Extended the single BL-001 Chromium episode with one explicit browser context and one integrated terminal while retaining Explorer and Markdown Preview coverage.
- T-4: Added missing/nonzero/per-command-timeout/overall-timeout/artifact/post-browser failure and cleanup tests.
- T-5: Added just proof-terminal-parity, updated discovery/runbook/harness documentation, retained evidence, and ran focused, paved, and full validation.

## Acceptance evidence

- **AC-1:** just proof-terminal-parity exited 0 with two Chromium scenarios. The passing episode used one existing BL-001 workbench and one terminal creation action against the canonical fixture, recorded the 90,000 ms production bound, and completed in 19,028 ms. The real integrated-terminal timeout scenario used a 20,000 ms injected bound and returned terminal-episode-timeout nonzero.
- **AC-2:** direct/integrated hostname normalized stdout both equal 03f809395a5d plus LF; direct/integrated id -un both equal vscode plus LF. Episode parity passed.
- **AC-3:** integrated pwd -P normalized stdout equals /workspaces/ascend/tests/fixtures/bl-001/workbench project;BL-001 plus LF, matching the canonical launch path.
- **AC-4:** The exact ordered list is git --version; git status --short; gh --version; tmux -V; docker --version; copilot --version. Every direct/integrated row records cwd, 5,000 ms timeout, exit, separate raw/normalized streams, and process identity. All exits/stdout/stderr matched. Observed version stdout: git 2.52.0; gh 2.97.0; tmux 3.7b; Docker 29.7.2-1; Copilot CLI 1.0.79-9. git status --short also matched.
- **AC-5:** normalizeTerminalOutput changes only CRLF/lone CR to LF and has preservation tests for whitespace, control bytes, URLs, and version text. Episode references test-results/bl-001/terminal-parity/direct.raw.json and integrated.raw.json.
- **AC-6:** Evidence retains only PATH. Direct/integrated PATH text differed and was classified allowed difference because git, gh, tmux, docker, and copilot resolved identically to /usr/local/bin/git, /usr/bin/gh, /usr/local/bin/tmux, /usr/bin/docker, and /usr/local/bin/copilot. Failure-causing resolution differences are tested nonzero.
- **AC-7:** Tests prove terminal-executable-missing before start/browser calls; terminal-command-nonzero for direct and integrated with command/context/exit; terminal-command-timeout for both contexts with command/context/bound; and terminal-episode-timeout. All are nonzero typed failures.
- **AC-8:** The real timeout scenario published the in-progress integrated command PID/start identity to runTerminalParityEpisode, whose cancelTrackedCommands step terminated and audited that exact group before browser close and exact-handle stop. It asserted terminal command, browser context, workbench PID, and listener absence. Passing episode cleanup separately records browserContextClosed=true, terminalCommandsAbsent=true, exactHandleAbsent=true, listenerAbsent=true, firstStopExit=0, and repeatedStopExit=0; no broad kill is used.
- **AC-9:** Generated episode.json records Ubuntu 24.04.4 LTS, host 03f809395a5d, vscode uid 1000, /bin/zsh, code-server 4.131.0, fixed tool results, all bounds/comparisons/raw references, cleanup, elapsed time, and disposition=passed. Raw output stays in generated proof artifacts, not lifecycle logs.
- **AC-10:** README.md now states that the full gate runs two real workbench Chromium scenarios—the forced integrated-terminal timeout cleanup scenario and the passing terminal-parity scenario—matching the committed gate. Root, API, docs, runbook, harness discovery, and the harness-change record otherwise document prerequisites, command list, PATH policy, normalization, paved command, bounds, diagnostics, evidence, cleanup, and the designated-host result.
- **AC-11:** just verify exited 0 after this README correction: format, lint, strict typecheck, 34 API tests and 1 web test with thresholds (80.92% API branch coverage), builds, and 3 Chromium E2E tests passed. The canonical gate passed one forced real timeout cleanup scenario and one passing parity episode.

## Validation

- T-1 focused: just verify-focused — exit 0; 19 tests passed.
- T-2 focused after corrections: just verify-focused — exit 0; 22 tests passed.
- T-3 focused: just verify-focused — exit 0; 22 tests passed.
- T-4 focused: just verify-focused — exit 0; 25 tests passed.
- T-5/final focused: just verify-focused — exit 0; 34 tests passed.
- Verify correction focused: just verify-focused — exit 0; 35 tests passed.
- README documentation correction focused: just verify-focused — exit 0; 35 tests passed; just format-check — exit 0, with all matched files formatted.
- Paved target host after correction: just proof-terminal-parity — exit 0; 2 Chromium tests passed (forced timeout cleanup and passing parity).
- README documentation correction full: just verify — exit 0; formatting/lint/typecheck, 34 API tests, 1 web test, builds, and 3 Chromium tests passed.

## Documentation impact

Updated root, API, documentation index, operational runbook, and harness discovery; added a harness-change record because canonical checks gained the BL-002 sensor. The prior Verify correction changed only docs/workbench-proof.md to correct the episode path and match the committed cancellation/PID/listener behavior. This correction changes only README.md so its full-gate summary precisely names the two committed real workbench Chromium scenarios. No HTTP API/schema changed, so no API specification update is needed. No configuration option/default, data format, breaking behavior, migration, deployment procedure, or production runtime operation changed, so configuration, migration, and deployment notes are not required. No ADR or core-component contract changed: implementation remains within the accepted direct-host BL-001 lifecycle, path, logging, command-interface, and harness boundaries.

Final acceptance remains owned by Verify.
