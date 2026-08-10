# Action Plan: BL-002: Prove host-native terminal parity

## Feature
- **ID:** 7
- **Research Brief:** `project/work-items/7-bl-002-prove-host-native-terminal-parity/research/00-research.md`

## ADRs Created
- None. This issue validates the accepted direct-host code-server architecture; it makes no new architectural choice.
- Relevant: `ADR-260808-typescript-monorepo`, `ADR-260808-governed-engineering-harness`.

## Core-Components Created
- None. The bounded issue-level sensor fits the existing host environment, path safety, lifecycle, logging, command, development, and harness contracts.
- Relevant: `CORE-COMPONENT-260808-host-process-environment`, `CORE-COMPONENT-260808-filesystem-path-safety`, `CORE-COMPONENT-260808-runtime-lifecycle-error-handling`, `CORE-COMPONENT-260808-structured-runtime-logging`, `CORE-COMPONENT-260806-project-command-interface`, `CORE-COMPONENT-260808-development-standards`, and `CORE-COMPONENT-260808-engineering-harness-delivery-contract`.
- `project/architecture/ADR/DECISION-LOG.md` remains unchanged.

## Acceptance Criteria
- **AC-1:** One paved repository command starts the merged BL-001 workbench against its canonical fixture directory, opens one integrated terminal through bounded Chromium automation, runs the fixed command list, and has one documented overall timeout that returns nonzero when exceeded.
- **AC-2:** In the same run, normalized direct and integrated outputs for `hostname` and `id -un` match, and both user results equal `vscode`.
- **AC-3:** The integrated terminal result for `pwd -P` equals the canonical fixture path supplied when the BL-001 workbench was launched.
- **AC-4:** The fixed tool command list is exactly `git --version`, `git status --short`, `gh --version`, `tmux -V`, `docker --version`, and `copilot --version`; direct and integrated invocations run from the canonical fixture directory, their exit results and normalized stdout/stderr match, and evidence records each finite timeout, exit result, stdout, and stderr.
- **AC-5:** The repository documents one content-preserving normalization applied identically to direct and integrated results and retains references to both raw results.
- **AC-6:** Only a repository-defined environment allowlist needed for tool resolution is compared; each allowlisted variable receives an `equal`, documented `allowed difference`, or `unexplained failure-causing difference` result, and any unexplained failure-causing difference makes the paved command nonzero without retaining non-allowlisted environment values.
- **AC-7:** A missing fixed-list executable produces one documented pre-browser nonzero result naming the executable; an executable that exists but returns nonzero produces a distinct nonzero result naming the command and whether the failure was direct or integrated; a per-command timeout is also nonzero and names the command and context.
- **AC-8:** Every executed success or named-failure path stops the exact BL-001 process group, confirms its PID and listener are absent, closes any opened browser context, and leaves no terminal command started by the validation running.
- **AC-9:** One retained evidence record maps every criterion to commands, timeouts, exits, normalized outputs, raw artifact references, and results, and records Ubuntu version, runtime hostname, user, shell, fixed-list tool versions, code-server version, cleanup outcome, and overall disposition.
- **AC-10:** Documentation records prerequisites, the exact fixed command list, allowed environment differences, the exact paved command, timeout, diagnostics, cleanup, and the observed designated-host result.
- **AC-11:** `just verify` exits zero.

## Acceptance Coverage

| AC | Implementation task(s) | Tests or validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1, T-3, T-5 | V-1, V-5 | Paved command, 90,000 ms overall bound, one terminal observation, exit/disposition |
| AC-2 | T-1, T-2, T-3 | V-2, V-5 | Raw and normalized `hostname`/`id -un` rows and `vscode` assertions |
| AC-3 | T-1, T-2, T-3 | V-2, V-5 | Launch path and integrated `pwd -P` comparison |
| AC-4 | T-1, T-2, T-3 | V-1, V-2, V-5 | Exact ordered list; per-context cwd, timeout, exit, stdout, stderr, and parity rows |
| AC-5 | T-1, T-2, T-5 | V-1, V-2, V-7 | Line-ending-only normalization tests/docs and direct/integrated raw artifact references |
| AC-6 | T-1, T-2, T-3, T-5 | V-1, V-2, V-5, V-7 | `PATH`-only allowlist, executable resolution, classification, and no extra environment keys |
| AC-7 | T-1, T-2, T-4, T-5 | V-3, V-4, V-7 | Distinct missing/nonzero/timeout codes with executable, command, context, and nonzero exit |
| AC-8 | T-2, T-3, T-4 | V-4, V-5, V-6 | Browser-close result; tracked command identities absent; exact PID/listener absent |
| AC-9 | T-2, T-3, T-5 | V-5, V-7 | Generated episode/raw files plus retained `implementation/00-implementation.md` AC map |
| AC-10 | T-5 | V-7 | Updated root/API/docs/runbook/harness discovery text and target-host observation |
| AC-11 | T-5 | V-8 | `just verify` exit 0 and full gate summary |

Coverage proof: every AC appears in task, validation, and evidence columns before these plan artifacts are written.

## Implementation Tasks
- **T-1 — Extend the BL-001 parity contract (AC-1–AC-7).** Define the exact probes/list, `PATH`-only comparison, 5,000 ms command bound, 90,000 ms episode bound, line-ending-only normalization, evidence shapes, and typed failures within the existing proof suite.
- **T-2 — Add bounded execution and evidence capture (AC-2–AC-9).** Reuse canonical paths and argument-array spawning; preflight fixed executables before browser startup; capture separate raw streams and exact child identities; classify `PATH`; write atomic generated evidence below `test-results/bl-001/terminal-parity/`.
- **T-3 — Extend the passing BL-001 Chromium scenario (AC-1–AC-6, AC-8, AC-9).** Reuse the existing launcher, fixture, handle, process audit, and browser sensor; explicitly own one browser context, open one terminal, run the integrated helper, compare results, and retain Explorer/Markdown coverage.
- **T-4 — Prove named failures and bounded cleanup (AC-1, AC-7, AC-8).** Cover missing executable, direct/integrated nonzero, direct/integrated timeout, overall timeout, artifact error, and browser-opened failure; verify context-rich diagnostics and exact cleanup without process-name kills.
- **T-5 — Expose, document, retain, and validate the sensor (AC-1, AC-5–AC-11).** Add `just proof-terminal-parity`, include the same extended sensor in `just verify`, update application and harness documentation, record target-host evidence in Implement, and run focused, paved, and full validation.

## Scope Guardrails
- Extend the API-owned BL-001 proof modules, canonical fixture, exact handle lifecycle, and one Chromium sensor; do not add a second launcher, fixture, process manager, or harness.
- Keep BL-003/010/014/017+ work out: no presentation comparison, stable Ascend routing, concurrent runtime, persistence, lifecycle UI, recovery, production operation, alternate-host portability, tool installation, broad security work, or exhaustive environment comparison.
- Normalize only line endings (`CRLF` and lone `CR` to `LF`) in both contexts. Do not trim, sort, strip control bytes, rewrite versions, or merge streams.
- Compare and retain only `PATH`. Classify a differing `PATH` as allowed only when all fixed executable canonical resolutions are identical; otherwise classify it as failure-causing and fail. Retain no other environment values.
- Treat command output as bounded proof artifacts, not runtime logs. Use argument arrays and never shell-interpolate the fixture path.
