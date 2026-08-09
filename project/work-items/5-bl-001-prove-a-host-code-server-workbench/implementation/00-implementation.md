# Implementation: BL-001: Prove a host code-server workbench

## Scope

Implemented Issue #5 on the designated host within the approved direct-host code-server, path-safety, lifecycle, logging, command-interface, development, RPIV, and harness contracts. No API route, web UI, persistent harness boot service, concurrency behavior, recovery behavior, or architecture contract was added.

## Completed Tasks

- **T-1:** Added the tracked space/semicolon fixture, recursive membership and sentinel-hash contract, fixed host prerequisites, disposable boundary, and 4.131.0 declaration.
- **T-2:** Added the API-owned direct-spawn runtime, thin start/stop CLIs, root recipes, versioned handle, redirect-aware HTTP readiness, exact process identity, bounded group termination, and structured diagnostics.
- **T-3:** Added fake-process, five-failure, argument, environment, process/listener attribution, escalation, unrelated-process survival, idempotence, and cleanup tests.
- **T-4:** Added one serial real Chromium lifecycle with Explorer, native Markdown Preview, host/process/listener/argv evidence, fixture integrity, and unconditional exact-handle cleanup.
- **T-5:** Integrated unit and E2E coverage into the canonical gate, documented operation and governance, retained this evidence, and ran the full gate.

## Designated Host and Bounds

- Host: Ubuntu 24.04.4 LTS, hostname `03f809395a5d`.
- User: non-root `vscode`, uid 1000.
- Repository: `/workspaces/ascend`.
- Executable: `/home/vscode/.local/bin/code-server`, code-server 4.131.0 (Code 1.131.0).
- Prerequisites: Node.js 22, pnpm 10.34.5, `just`, code-server 4.131.0, and Playwright Chromium.
- Bounds: startup 15,000 ms; stop 10,000 ms; browser 60,000 ms; full-gate target 120,000 ms.
- Disposable boundary: `test-results/bl-001`; run-local state is below `runs/<runId>`. The fixture is outside the disposable boundary.

## Validation Results

| Scope | Command | Exit/result |
|---|---|---|
| T-1 focused | `just verify-focused apps/api/test/workbench-proof-contract.test.ts` | 0; 2 tests passed |
| T-2 focused | `just verify-focused apps/api/test/workbench-proof-runtime.test.ts` | 0; lifecycle tests passed |
| T-3 focused | `just verify-focused apps/api/test/workbench-proof-runtime.test.ts apps/api/test/workbench-proof-failures.test.ts apps/api/test/workbench-proof-contract.test.ts` | 0; failure and cleanup tests passed |
| T-4 focused | `just verify-focused` with all proof Vitest files | 0 |
| T-4 browser | `just test-e2e` | 0; 2 tests passed, including one real lifecycle |
| T-5 focused | `just verify-focused` with all four proof Vitest files | 0; 10 tests passed |
| Full gate | `just verify` | 0; format, lint, typecheck, 13 unit/integration tests, build, and 2 Playwright tests passed |

The generated final episode was `test-results/bl-001/episode.json` (ignored). It recorded start/stop/repeated-stop exits 0, readiness, one real handle, `observedResult: passed`, equal fixture snapshots, absent injection sentinel, and `exactHandleAbsent: true`.

## Acceptance Evidence

### AC-1 — Start, handle, and readiness

- Command/result: `just proof-start`, exercised by `just test-e2e` and `just verify`, exited 0 after HTTP readiness (documented accepted range 200–399) within the 15-second bound.
- Artifact: `apps/api/src/workbench-proof-runtime.ts`, `apps/api/src/cli/proof-start.ts`, root `justfile`, and generated episode `commands.start`/`handle`.
- Observed result: exactly one stdout JSON handle contained version 1, PID, `http://127.0.0.1:<port>/`, run ID, and start-time identity; the final real run reached readiness once.

### AC-2 — Exact bounded idempotent stop

- Command/result: the unchanged handle was piped to `just proof-stop` twice; both final episode exits were 0.
- Artifact: runtime exact-state/start-time checks, dedicated process-group termination, `workbench-proof-runtime.test.ts`, `workbench-proof-failures.test.ts`, and episode `cleanup`.
- Observed result: first stop removed the managed group within 10 seconds, repeated stop reported absence, and the unrelated control process survived.

### AC-3 — Fixture integrity

- Command/result: fixture contract tests and the real browser episode compared recursive path membership and sentinel SHA-256 hashes before and after; exit 0.
- Artifact: `workbench-proof-contract.ts`, tracked fixture, contract test, and episode `fixture`.
- Observed result: paths were `EXPLORER-SENTINEL-BL-001.txt`, `nested`, `nested/FIXTURE-MEMBERSHIP.txt`, and `WORKBENCH-PREVIEW.md`; before/after sentinel hashes were equal.

### AC-4 — User and loopback attribution

- Command/result: the real lifecycle walked exact `/proc` descendants and socket inodes; unit integration repeated attribution with the fake; exits 0.
- Artifact: `workbench-proof-audit.ts`, failure/cleanup test, and episode `processes`/`listeners`.
- Observed result: all final managed rows were `vscode` uid/euid 1000 and the attributed listener was only `127.0.0.1` (the helper also covers `::1`).

### AC-5 — Chromium Explorer and Markdown Preview

- Command/result: `just test-e2e` and the E2E portion of `just verify` exited 0.
- Artifact: `tests/e2e/workbench-proof.spec.ts` and episode `browser`.
- Observed result: Chromium found `EXPLORER-SENTINEL-BL-001.txt`, opened `WORKBENCH-PREVIEW.md`, invoked the native accessible Preview action, and observed `BL-001 Markdown Preview Rendered Sentinel`.

### AC-6 — Argument-array metacharacter safety

- Command/result: fake NUL capture and real `/proc/<pid>/cmdline` assertions passed in focused and full gates.
- Artifact: fixture path `/workspaces/ascend/tests/fixtures/bl-001/workbench project;BL-001`, runtime argv, fake capture, and episode `argvPathPreserved`.
- Observed result: the full canonical path appeared exactly once as one argument; `test-results/bl-001/injection-sentinel` was absent before and after.

### AC-7 — Five startup failures

- Command/result: `workbench-proof-failures.test.ts` table ran exactly missing executable, nonexistent path, regular-file path, readiness timeout, and early exit; all expected CLI exits were nonzero and the test exited 0.
- Artifact: structured `runtime.start.failed` assertions and fake PID/argv seams.
- Observed result: codes were `executable-missing`, `project-missing`, `project-not-directory`, `readiness-timeout`, and `early-exit`; details retained only executable/path/timeout/exit facts and no environment marker or raw child output.

### AC-8 — Cleanup and disposable boundary

- Command/result: every fake row, stop integration, browser `finally`, and full-gate E2E cleanup audit passed.
- Artifact: runtime error cleanup, exact-handle audit helper, E2E `finally`, episode `cleanup`, and runbook cleanup section.
- Observed result: final exact PID/start identity and URL listener were absent, stop/repeated-stop exits were 0, fixture/injection state was unchanged, and disposable membership contained only allowed `runs`/episode artifacts. No process-name kill or broad listener sweep exists.

### AC-9 — Retained evidence

- Command/result: this committed record was checked against AC-1 through AC-10 and the generated episode.
- Artifact: this file plus `docs/workbench-proof.md`; generated machine evidence remains ignored under `test-results/bl-001/episode.json`.
- Observed result: host/version/prerequisite facts, commands, exits, artifacts, timeouts, cleanup, and observed results are mapped without credentials, source contents beyond named fixture sentinels, terminal contents, or raw protected child output.

### AC-10 — Configured full gate

- Command/result: final `just verify` exited 0.
- Artifact: configured root `justfile` gate.
- Observed result: formatting, lint, strict type checking, coverage (all thresholds at least 80%), unit/integration tests, builds, and two Chromium tests passed; the BL-001 episode performed one real lifecycle and its final zero-leak audit passed.

## Documentation Evidence

- `README.md`: added the user-facing proof commands and linked the operational runbook.
- `apps/api/README.md`: documented the CLI handle/readiness/stop/failure contract and explicitly records that no HTTP API route changed.
- `docs/README.md`: added the designated-host validation capability while preserving non-persistent harness boot ownership.
- `docs/workbench-proof.md`: added setup prerequisites, fixed configuration, usage examples, timeouts, diagnostics, artifacts, cleanup, validation, and troubleshooting.
- `.devcontainer/devcontainer.json`: reconciled the declared code-server version to 4.131.0.
- `.harness/engineering-harness.md` and `.harness/records/harness-change/2026-08-09/001-bl-001-host-process-sensor.md`: documented the new bounded host-process sensor and evidence without changing boot endpoints or persistence.
- Architecture impact: no ADR or core-component contract changed; implementation stays within existing direct-host, lifecycle, path, environment, logging, command, RPIV, and harness contracts. Harness governance explanatory documentation was updated.
- Migration impact: none. The proof is additive, introduces no data migration, HTTP API change, breaking configuration change, or deployment migration.
- Operational/deployment impact: the runbook documents designated-host operation and cleanup; production deployment procedures are otherwise unchanged.

This record reports implementation evidence only. Independent final acceptance remains owned by Verify.
