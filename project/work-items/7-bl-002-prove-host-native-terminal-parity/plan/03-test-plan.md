# Test Plan: BL-002: Prove host-native terminal parity

## Test V-1: Fixed parity contract, normalization, and allowlist

- **Type:** Unit
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-4, AC-5, AC-6, AC-7
- **Priority:** Critical

### Setup
Load the extended BL-001 proof contract in Vitest. Prepare stream samples containing LF, CRLF, lone CR, leading/trailing whitespace, ANSI/control bytes, URLs, and version/update text. Prepare equal and differing `PATH` values with controlled executable resolutions.

### Steps
1. Assert the ordered tool list equals the six issue commands exactly.
2. Assert the identity/path probes and 5,000 ms command and 90,000 ms episode constants.
3. Normalize each sample in direct and integrated contexts.
4. Classify equal, resolution-equivalent differing, and resolution-changing `PATH` cases.
5. Attempt to add a non-allowlisted environment key and validate typed diagnostic shapes.

### Expected Result
Only line endings change; all other bytes and stream boundaries remain represented. Both contexts normalize identically. Only `PATH` is accepted, with the three documented classifications. Exact commands and timeout constants do not drift.

### Expected Evidence
Focused Vitest exit 0 with exact-list, normalization, allowlist, bounds, and diagnostic assertions.

## Test V-2: Shared direct and integrated command executor

- **Type:** Unit/Integration
- **Task:** T-2
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-5, AC-6
- **Priority:** Critical

### Setup
Create temporary fake executables with controlled stdout, stderr, line endings, exit 0, argv capture, cwd capture, and executable-resolution paths. Use the canonical BL-001 fixture path, including its space and semicolon.

### Steps
1. Execute identity/path and fixed-list specifications in direct mode.
2. Execute the same specifications in integrated mode through the same executor boundary.
3. Compare raw and normalized streams, exits, cwd, argv, hostname/user/path, and resolution records.
4. Write and parse direct/integrated raw artifacts and the episode references.
5. Inspect the environment evidence keys.

### Expected Result
Both contexts preserve exact argv and canonical cwd, separate streams, finite timeout, exit, raw content, and identical normalization. User is `vscode` in designated-host validation, integrated `pwd -P` matches launch path, tool results match, and only `PATH` is retained/classified.

### Expected Evidence
Focused test exit 0; temporary raw JSON examples; cwd/argv captures; comparison and environment classification rows.

## Test V-3: Missing executable fails before browser startup

- **Type:** Integration/Negative
- **Task:** T-2, T-4
- **Acceptance Criteria:** AC-7, AC-8
- **Priority:** Critical

### Setup
Provide a deterministic direct `PATH` missing one fixed-list executable. Spy on workbench start and browser-context creation. Ensure no prior live BL-001 handle exists.

### Steps
1. Invoke the parity orchestrator.
2. Capture its exit and diagnostic.
3. Inspect workbench/browser spies and generated disposition.
4. Audit that no command, runtime PID, or listener was created.

### Expected Result
The run exits nonzero before browser/workbench startup, names the missing executable, and records no handle/context. No unrelated process is touched.

### Expected Evidence
Nonzero result and structured missing-executable diagnostic; zero start/context calls; absence audit.

## Test V-4: Context-specific nonzero and per-command timeout failures

- **Type:** Integration/Negative
- **Task:** T-2, T-4
- **Acceptance Criteria:** AC-7, AC-8
- **Priority:** Critical

### Setup
Use fake executables that either exit with a known nonzero code or block beyond an injected short test timeout. Run each behavior in direct and integrated context. Start an unrelated control process.

### Steps
1. Exercise direct nonzero and integrated nonzero cases.
2. Exercise direct timeout and integrated timeout cases.
3. Capture diagnostics and process identities.
4. Run cleanup and audit tracked child absence and control survival.

### Expected Result
Every case returns nonzero and names the exact command and direct/integrated context; timeout cases also name the finite bound. Timed-out exact groups are absent and the control process remains alive.

### Expected Evidence
Four diagnostic snapshots, child identity/absence checks, cleanup results, and focused test exit 0.

## Test V-5: Designated-host Chromium terminal parity episode

- **Type:** End-to-End / Target Host
- **Task:** T-3, T-5
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-8, AC-9, AC-10
- **Priority:** Critical

### Setup
Use Ubuntu 24.04 devcontainer as non-root `vscode`, code-server 4.131.0, Playwright Chromium, the canonical BL-001 fixture, and all six installed fixed tools. Safely reject any prior live exact handle before removing stale generated evidence. Keep the worktree state stable during the episode.

### Steps
1. Run `just proof-terminal-parity`.
2. Preflight the six executables before browser/workbench startup.
3. Capture direct probes and commands from the canonical fixture.
4. Start the existing BL-001 runtime and explicit Chromium context; retain Explorer and Markdown checks.
5. Open exactly one integrated terminal and invoke integrated capture.
6. Compare identity, path, six commands, `PATH`, raw references, and normalized streams.
7. Close context, stop exact handle, audit terminal commands/PID/listener, and inspect episode disposition within 90,000 ms.

### Expected Result
The command exits 0. Hostnames and users match, users equal `vscode`, integrated `pwd -P` equals the launch path, all six exit/stdout/stderr pairs match after line-ending normalization, `PATH` is validly classified, raw references exist, and all cleanup checks pass.

### Expected Evidence
`test-results/bl-001/terminal-parity/direct.raw.json`, `integrated.raw.json`, and `episode.json`; paved command exit 0; Ubuntu/runtime hostname/user/shell/tool/code-server facts; browser/process cleanup fields.

## Test V-6: Overall timeout and post-start cleanup matrix

- **Type:** Integration/Negative
- **Task:** T-4
- **Acceptance Criteria:** AC-1, AC-8
- **Priority:** Critical

### Setup
Inject shortened overall bounds and controllable blocked operations into the same episode coordinator. Include scenarios after runtime start, after browser-context creation, during integrated execution, and during evidence writing. Track browser close, handle stop, listener, and command identities.

### Steps
1. Trigger each blocked/failing operation.
2. Allow the overall deadline to expire where applicable.
3. Observe nonzero disposition and execute `finally` cleanup.
4. Audit explicit browser closure, exact process-group stop, command absence, PID/listener absence, and unrelated-process survival.
5. Force a cleanup error and verify it remains visible.

### Expected Result
Overall timeout returns nonzero. Every resource that was opened is closed by exact ownership; no process-name kill or listener sweep occurs. Cleanup failure cannot become a success-shaped result.

### Expected Evidence
Scenario table with nonzero outcomes, operation order, exact cleanup calls/audits, and focused test exit 0.

## Test V-7: Documentation and retained evidence completeness

- **Type:** Documentation / Inspection
- **Task:** T-5
- **Acceptance Criteria:** AC-5, AC-6, AC-7, AC-8, AC-9, AC-10
- **Priority:** High

### Setup
Complete one passing target-host episode. Open root/API/docs/runbook/harness documentation, generated raw/episode artifacts, and `implementation/00-implementation.md`.

### Steps
1. Check prerequisites, exact six-command list, `just proof-terminal-parity`, 90,000/5,000 ms bounds, and diagnostics.
2. Check the line-ending-only normalization and `PATH` classification policy.
3. Check raw direct/integrated references, cleanup order, and observed designated-host result.
4. Trace AC-1 through AC-11 to commands, results, artifacts, and evidence.
5. Confirm no non-allowlisted environment value or terminal output appears in runtime logs.

### Expected Result
All discovery surfaces agree. The retained implementation record contains a complete AC map and host/tool/version/cleanup/disposition facts, while raw bounded output stays in referenced proof artifacts rather than runtime logs.

### Expected Evidence
Documentation diff/check output; completed retained AC matrix; referenced generated artifact paths; explicit API/schema/migration/deployment impact statement.

## Test V-8: Canonical full validation gate

- **Type:** Regression / Full Gate
- **Task:** T-5
- **Acceptance Criteria:** AC-11
- **Priority:** Critical

### Setup
Finish all implementation, tests, documentation, and retained evidence. Confirm no live BL-001 handle or terminal command remains from the paved run.

### Steps
1. Run `just verify` from repository root.
2. Observe formatting, lint, strict type checking, unit/integration coverage, builds, and Playwright E2E.
3. Confirm the canonical gate executes both real Chromium scenarios in the extended BL-001 sensor and completes within the harness wrapper.
4. Inspect final cleanup and working-tree artifacts.

### Expected Result
`just verify` exits 0; the extended terminal parity sensor passes once; all regression checks pass; no managed process/listener/terminal command remains.

### Expected Evidence
Full gate transcript with exit 0 and test counts; final terminal-parity episode cleanup/disposition; no leaked managed resources.

## Acceptance Coverage Check

| AC | Tests |
|---|---|
| AC-1 | V-1, V-5, V-6 |
| AC-2 | V-2, V-5 |
| AC-3 | V-2, V-5 |
| AC-4 | V-1, V-2, V-5 |
| AC-5 | V-1, V-2, V-5, V-7 |
| AC-6 | V-1, V-2, V-5, V-7 |
| AC-7 | V-1, V-3, V-4, V-7 |
| AC-8 | V-3, V-4, V-5, V-6, V-7 |
| AC-9 | V-5, V-7 |
| AC-10 | V-5, V-7 |
| AC-11 | V-8 |

All eleven stable criteria have executable validation and expected evidence. Target-host validation remains bounded to the designated Ubuntu 24.04 devcontainer.
