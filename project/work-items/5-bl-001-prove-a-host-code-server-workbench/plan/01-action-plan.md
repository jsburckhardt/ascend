# Action Plan: BL-001: Prove a host code-server workbench

## Feature
- **ID:** 5
- **Research Brief:** `project/work-items/5-bl-001-prove-a-host-code-server-workbench/research/00-research.md`

## ADRs Created
- None. `ADR-260808-typescript-monorepo` already chooses direct host code-server processes, and existing lifecycle, path, process-environment, logging, command, development, and harness contracts cover this bounded proof.

## Core-Components Created
- None. This issue implements existing global contracts; it introduces no missing cross-cutting contract.

## Acceptance Criteria
- **AC-1:** One repository command starts one code-server as the configured user against an already-existing repository fixture's canonical path, emits a parseable PID plus loopback URL, and uses a documented readiness check and timeout.
- **AC-2:** One cleanup command accepts that handle, stops only that managed process within a timeout, and is idempotent after the process is absent.
- **AC-3:** Before/after evidence proves fixture tree membership and sentinel bytes are unchanged.
- **AC-4:** Evidence proves the managed process tree runs as non-root vscode and its TCP listeners use only 127.0.0.1 or ::1.
- **AC-5:** One bounded Chromium scenario connects through the emitted URL, finds a defined sentinel in Explorer, opens a defined Markdown fixture in Preview, and sees defined rendered text.
- **AC-6:** A defined Ubuntu-valid path containing spaces and one literal shell metacharacter reaches code-server as one argument and causes no defined injection sentinel side effect.
- **AC-7:** Missing code-server, nonexistent path, non-directory path, readiness timeout, and early exit each have a documented nonzero result and diagnostic.
- **AC-8:** Every validation path it actually executes, including the named failure cases, leaves no BL-001 managed process/listener and removes only BL-001 disposable artifacts.
- **AC-9:** One retained evidence record maps each BL-001 criterion to its command, exit result, and artifact, and records Ubuntu version, hostname, user, code-server 4.131.0, prerequisites, timeouts, cleanup, and observed result.
- **AC-10:** The configured repository full validation passes.

## Acceptance Coverage

| Criterion | Implementation tasks | Tests or validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1, T-2, T-3, T-4 | V-1, V-9 | Exit 0; one JSON handle with PID and URL; readiness result and elapsed time |
| AC-2 | T-2, T-3, T-4 | V-2 | Two successful stop results, bounded elapsed time, exact PID/URL absence, unrelated-process survival |
| AC-3 | T-1, T-3, T-4 | V-3 | Equal before/after relative-path lists and sentinel byte hashes |
| AC-4 | T-2, T-3, T-4 | V-4 | Exact process-tree user rows and loopback-only listener rows |
| AC-5 | T-1, T-4 | V-5 | Playwright pass with visible Explorer sentinel and rendered Markdown sentinel |
| AC-6 | T-1, T-2, T-3, T-4 | V-6 | NUL-delimited argv proof of one canonical path argument and absent injection sentinel |
| AC-7 | T-2, T-3 | V-7 | Five nonzero exits with stable condition-specific diagnostics |
| AC-8 | T-2, T-3, T-4, T-5 | V-2, V-7, V-9 | Per-case cleanup audit, no exact managed PID/listener, allowed disposable diff only |
| AC-9 | T-1, T-4, T-5 | V-8 | Committed `implementation/00-implementation.md` with all criteria, commands, exits, artifacts, facts, bounds, cleanup, and results |
| AC-10 | T-5 | V-9 | `timeout 120s just verify` exit 0 and post-gate zero-leak audit |

Coverage is complete: every AC ID maps to implementation, validation, and expected evidence before plan creation.

## Implementation Tasks

1. **T-1 — Fixture, host prerequisites, and proof contract (Medium):** Define one tracked space/semicolon fixture, sentinels, snapshots, finite disposable boundary, bounded timeouts, and the designated 4.131.0 host declaration. (AC-1, AC-3, AC-5, AC-6, AC-9)
2. **T-2 — Bounded lifecycle commands (Large):** Implement the API-owned runtime boundary and root start/stop recipes using direct argument arrays, loopback readiness, structured outcomes, exact-handle attribution, and idempotent bounded cleanup. (AC-1, AC-2, AC-4, AC-6, AC-7, AC-8)
3. **T-3 — Failure, attribution, and cleanup tests (Large):** Add fakes and Vitest coverage for the five failures, argv boundaries, ownership/listener audits, exact cleanup, and no second real code-server start. (AC-1, AC-2, AC-3, AC-4, AC-6, AC-7, AC-8)
4. **T-4 — Designated-host Chromium lifecycle (Large):** Run one serial real lifecycle, verify Explorer and Markdown Preview, collect host/process/listener/integrity evidence, and always stop by exact handle. (AC-1 through AC-9)
5. **T-5 — Integration, documentation, and retained evidence (Medium):** Add the proof to the canonical gate, update affected application and harness documentation without changing harness boot ownership, run the bounded full gate, audit cleanup, and retain the implementation record. (AC-8, AC-9, AC-10)
