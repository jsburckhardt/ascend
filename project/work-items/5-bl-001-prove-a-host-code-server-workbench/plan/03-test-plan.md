# Test Plan: BL-001: Prove a host code-server workbench

Live validation is fixed to Ubuntu 24.04, hostname `03f809395a5d`, user `vscode`, repository `/workspaces/ascend`, and `/home/vscode/.local/bin/code-server` 4.131.0. Every command is noninteractive and bounded. Cleanup uses only exact handles emitted by the test; process-name kills, broad listener sweeps, and interference with unrelated VS Code Remote processes are prohibited.

## Test V-1: Start one designated-host workbench and prove readiness

- **Type:** Host integration
- **Task:** T-2, T-4
- **Acceptance Criteria:** AC-1
- **Priority:** Critical

### Setup
- Verify all designated host facts and clear only the declared BL-001 disposable root. Confirm no prior BL-001 handle is live.

### Steps
1. Invoke the root proof-start recipe under the 15-second startup deadline.
2. Parse stdout as exactly one versioned JSON object with integer PID and loopback URL.
3. Confirm the PID remains live and an HTTP GET to the URL returns the documented ready status.

### Expected Result
The command exits 0 only after readiness and emits one parseable handle for one code-server.

### Expected Evidence
- Command, exit 0, handle JSON, readiness status, and elapsed milliseconds.

## Test V-2: Stop only the managed process and prove idempotence

- **Type:** Host integration
- **Task:** T-2, T-3, T-4
- **Acceptance Criteria:** AC-2, AC-8
- **Priority:** Critical

### Setup
- Use the V-1 handle and start an unrelated control process outside the managed process group.

### Steps
1. Pipe the exact handle to proof-stop under the 10-second deadline.
2. Assert the exact process tree and URL listener are absent and the control process survives.
3. Pipe the same handle to proof-stop again.

### Expected Result
Both stops exit 0 within the bound; only the managed group is stopped.

### Expected Evidence
- Stop exits/timings, exact PID/URL absence, and control PID survival.

## Test V-3: Prove fixture membership and byte integrity

- **Type:** Consequence and integrity
- **Task:** T-1, T-3, T-4
- **Acceptance Criteria:** AC-3
- **Priority:** Critical

### Setup
- Capture sorted fixture-relative paths and hashes of every defined sentinel before V-1.

### Steps
1. Run the complete real start, browser, and stop scenario.
2. Capture the same path list and byte hashes after cleanup.
3. Compare both structures exactly.

### Expected Result
No fixture path is added, removed, or renamed, and sentinel bytes are unchanged.

### Expected Evidence
- Before/after path arrays, hash maps, and equality verdict.

## Test V-4: Audit process identities and loopback listeners

- **Type:** Host safety integration
- **Task:** T-2, T-3, T-4
- **Acceptance Criteria:** AC-4
- **Priority:** Critical

### Setup
- Keep the V-1 workbench ready and use only its handle for attribution.

### Steps
1. Walk descendants from the handle PID through `/proc` parent relationships.
2. Record real/effective user IDs and names for every managed process.
3. Attribute the handle port and managed sockets; record every TCP listener address.

### Expected Result
Every managed process is non-root `vscode` uid 1000 and every managed listener is `127.0.0.1` or `::1`.

### Expected Evidence
- Exact PID/PPID/user rows and listener address/port/owner rows.

## Test V-5: Use Explorer and native Markdown Preview in Chromium

- **Type:** Playwright E2E
- **Task:** T-1, T-4
- **Acceptance Criteria:** AC-5
- **Priority:** Critical

### Setup
- Navigate Playwright Chromium to the V-1 URL with the isolated BL-001 user-data directory and a 60-second overall deadline.

### Steps
1. Wait for the VS Code workbench and open Explorer through stable accessible controls.
2. Assert the defined Explorer filename sentinel is visible.
3. Open the Markdown fixture, invoke `Markdown: Open Preview`, and assert the rendered-text sentinel is visible.

### Expected Result
The bounded browser scenario proves the selected fixture in Explorer and native Markdown rendering without manual input.

### Expected Evidence
- Playwright pass plus failure-only trace/screenshot under `test-results/bl-001`.

## Test V-6: Prove one path argument and no shell injection

- **Type:** Host safety integration
- **Task:** T-1, T-2, T-3, T-4
- **Acceptance Criteria:** AC-6
- **Priority:** Critical

### Setup
- Use the canonical fixture path containing a space and literal semicolon. Confirm the defined injection sentinel is absent.

### Steps
1. Start through the argument-array launcher.
2. Read NUL-delimited `/proc/<pid>/cmdline` entries for the managed launch.
3. Assert the complete canonical fixture path is one entry and check injection-sentinel absence before and after stop.

### Expected Result
The path is one argument, no shell is invoked, and no injection sentinel is created.

### Expected Evidence
- NUL-delimited argv array, canonical path equality, and before/after sentinel absence.

## Test V-7: Exercise the five named startup failures

- **Type:** Table-driven CLI integration
- **Task:** T-2, T-3
- **Acceptance Criteria:** AC-7, AC-8
- **Priority:** Critical

### Setup
- Use temporary per-row run directories, injected fake executable/readiness seams, and short test-only deadlines.

### Steps
1. Run with a missing code-server executable.
2. Run with a nonexistent project path.
3. Run with a readable regular file as project path.
4. Run a fake child that remains alive but never becomes ready.
5. Run a fake child that exits early with a defined nonzero code.
6. After each row, audit the exact row PID/URL and disposable diff.

### Expected Result
Each row is bounded and nonzero, emits a condition-specific diagnostic with relevant executable/path/timeout/exit data, and leaves no row-managed process/listener or undeclared artifact change.

### Expected Evidence
- Five-row command, exit, diagnostic, cleanup, and artifact-diff table.

## Test V-8: Inspect the retained BL-001 evidence record

- **Type:** Evidence review
- **Task:** T-1, T-4, T-5
- **Acceptance Criteria:** AC-9
- **Priority:** High

### Setup
- Complete a clean designated-host validation and populate `implementation/00-implementation.md` from the bounded machine record.

### Steps
1. Confirm AC-1 through AC-10 each map to a command, exit result, artifact, and observed result.
2. Confirm Ubuntu version, hostname, user/UID, executable path, code-server 4.131.0, prerequisites, all timeouts, disposable boundary, and cleanup results.
3. Confirm no secret, credential, source content beyond defined fixture sentinels, terminal content, or raw protected command output is retained.

### Expected Result
One committed record is complete, internally consistent, and safe to retain.

### Expected Evidence
- `project/work-items/5-bl-001-prove-a-host-code-server-workbench/implementation/00-implementation.md` with a complete AC review checklist.

## Test V-9: Run the full repository gate and prove zero leak

- **Type:** Full validation and cleanup audit
- **Task:** T-4, T-5
- **Acceptance Criteria:** AC-1, AC-8, AC-10
- **Priority:** Critical

### Setup
- Confirm no BL-001 handle is live, the injection sentinel is absent, and only the declared disposable root may be cleared.

### Steps
1. Run `timeout 120s just verify` from `/workspaces/ascend`.
2. Record the exit and format, lint, type, unit/integration, build, and Playwright summaries.
3. In a finally-equivalent post-gate step, audit every handle created by the run for absent process group and URL listener; verify fixture/injection state and the disposable allowlist.

### Expected Result
The full gate exits 0 after exactly one real success lifecycle plus the five fake failure paths, and the final audit finds no BL-001 managed process/listener, fixture mutation, injection side effect, or undeclared artifact removal.

### Expected Evidence
- Full-gate exit 0 and suite summary.
- Post-gate PID/URL/fixture/injection/disposable zero-leak report.
