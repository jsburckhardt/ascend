# Task Breakdown: BL-004: Establish the workbench capacity baseline

Tasks are dependency ordered. Completion requires the listed acceptance outcomes, explicit test coverage, and expected evidence.


## Implementation correction after 29707d3

The Complete statuses below include the returned defect correction: one cooperative AbortSignal now reaches member start/readiness, probe, sampling, workload, and coordination; the active guard remains held through stopped coordination, all-started cleanup, run-wide audit, partial evidence retention, and release. Failed-start and failed-attribution slots preserve discovered metadata and participate in cleanup. Stop, inspection, listener-attribution, and audit failures are explicit. Comparison evidence separates host and process-tree retained/absent counts with missing reasons. Controlled coverage now includes spawn and early-exit identity, inspection/listener attribution, stop/audit failure, cancellation during start/sample/workload, deadline cleanup/guard lifetime, partial evidence, and no background work after return. T-7 and T-8 use retained run 853037e6-5dab-43cf-bcf8-61f1e8bbdb18.

## Task T-1: Define the capacity contract, prerequisites, records, and run isolation

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-9, AC-10, AC-15, AC-17
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260808-development-standards

### Description
Create an issue-local capacity contract with exact cohorts `[1, 3, 5, 10]`, 30,000 ms member readiness, 1,200,000 ms overall timeout, host/prerequisite facts, slot/sample/workload/cleanup schemas, completeness rules, gate/disposition fields, and retained paths. Add an exclusive active-run guard before capacity run allocation or member start; reject concurrent or stale active ownership rather than deleting or merging it. Preserve one outer run ID in every artifact and retain subordinate BL-001 runtime IDs under their slots.

### Acceptance Criteria
- Ordered constants, statuses, reasons, sample positions, comparison columns, and validators represent every AC-1/2/9/10/15/17 outcome.
- Ubuntu 24.04.4 host identity, hostname, `vscode` uid 1000, repository, code-server executable/version, fixture, `/proc` readability, and cgroup-v2 context are checked and recorded before starts.
- The first failed prerequisite returns a typed nonzero outcome, retains a same-run failure manifest where writable, and records zero member starts.
- Existing historical evidence is immutable; only active ownership blocks a run, and no record may reference two capacity run IDs.

### Test Coverage
- V-1 pins constants and validates successful, failed-prerequisite, concurrent, stale-state, malformed, and mixed-run records.
- V-4 exercises completeness/evidence validators.
- V-7 injects prerequisite and isolation failures under finite fake dependencies.

### Expected Evidence
- Focused contract/isolation test output.
- Valid and rejected record fixtures showing one run ID, ordered cohorts, no starts on prerequisite/ownership rejection, and typed reasons.

## Task T-2: Extend BL-001 lifecycle inspection and exact attribution

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-3, AC-8, AC-11, AC-16
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-filesystem-path-safety; CORE-COMPONENT-260808-development-standards

### Description
Extend the merged BL-001 proof without changing its 15-second default: capacity callers pass the 30-second override and capacity-owned run root. Add strict `/proc` inspection results that retain failures instead of silently skipping them, process PID/start-time identity, cumulative CPU ticks, RSS, tree membership, and listener inode/owner/port. Add exact identity-aware absence audits and unexpected-root-exit observations. Keep BL-001 argument-array launch, non-root environment, loopback binding, state validation, and exact process-group stop.

### Acceptance Criteria
- Every capacity slot is attempted serially and ends `ready`, `failed:<reason>`, or `unstarted:<reason>`; ordinary failure cleanup cannot block the next attempt.
- A slot is `ready` only after 200-399 readiness and one attributable loopback listener with a distinct PID/port are retained.
- Process inspection returns data or an attributable typed failure; capacity code never converts a missing/racing process into a sample or success.
- Cleanup audits exact PID/start identities and captured listener identities without claiming unrelated processes or ports.

### Test Coverage
- V-2 proves 30-second override, sequential continuation, listener conflict/failure, and typed slot states.
- V-3 validates process fields used by samples.
- V-5 uses live fake groups/listeners and an unrelated control to prove scoped cleanup.
- V-7 covers inspection failure, unexpected exit, and resource leakage controls.

### Expected Evidence
- BL-001 regression plus focused capacity lifecycle/audit output.
- Captured process/listener fixtures and absence reports proving exact attribution and unrelated survival.

## Task T-3: Implement the fixed probe, workload, and anchored sampler

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-4, AC-5, AC-6, AC-7, AC-8, AC-16
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260808-development-standards

### Description
Implement direct `/usr/bin/true` responsiveness probing with a 1,000 ms timeout, a repository-owned seven-second terminal workload launched by argument array through `process.execPath`, and a total 4 KiB stdout/stderr cap. Implement monotonic idle/active schedulers at offsets 0-4 seconds, explicit missed/non-overlap/no-ready/safety-stop absences, and one `/proc` measurement method. Idle remains open to anchor + 5 seconds. Active anchors only after all ready-member workload starts have been attempted.

Calculate aggregate process CPU as attributed CPU-tick delta over monotonic elapsed time and clock ticks without logical-CPU normalization; sum attributed RSS KiB. Parse all three load averages and `MemTotal`/`MemAvailable`, with used memory equal to total minus available. Preserve actual wall and monotonic timestamps, root PID, member PIDs, probe result, workload process identity/times/exit/streams, and reasons.

### Acceptance Criteria
- Probe execution and evidence are identical at pre-cohort, every retained host position, and post-cleanup; its first failure latches one global safety reason.
- Each window has exactly five target positions; late, failed, non-overlapped, no-ready, and safety-stop positions are explicit and are never replacement samples.
- Every ready member has exactly one workload result on pass, early exit, timeout, spawn, output-overflow, or cancellation.
- No terminal output enters structured logs; complete bounded output remains only in workload evidence.

### Test Coverage
- V-3 uses a fake monotonic clock and controlled process/probe/workload readers to prove every position, field, formula, overlap, early exit, zero-ready result, and output limit without real five-second waits.
- V-7 injects probe, process-inspection, workload, and overall abort failures.

### Expected Evidence
- Deterministic schedule tables with anchors, targets, actual times, samples, and absences.
- Workload result fixtures for success and every terminal failure shape.
- Sample fixtures containing all AC-8 fields and exact formula expectations.

## Task T-4: Coordinate ordered cohorts, cleanup, completeness, gate, and findings

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-7, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-filesystem-path-safety; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260806-agent-executable-acceptance-criteria; CORE-COMPONENT-260808-development-standards

### Description
Build one serial coordinator around injected BL-001 start/stop, fixture snapshot, probe, workload, sampler, clock, and writer seams. For each cohort: snapshot fixture, pre-probe, attempt permitted slots, idle sample, start all workloads, active sample, await/cancel workloads, inspect unexpected exits, stop exact owned resources, audit every attributed identity/listener, compare fixture, post-probe, validate completeness, then permit the next cohort. After safety stop, retain all later cohorts and slots in order with explicit reasons and no starts.

Compute the one-member plumbing finding, strict three-member gate/blockers, five/ten findings, and overall disposition separately. Freeze the three-member decision before later findings. Drive all paths, including overall timeout and operation errors, through cleanup and best-effort evidence finalization without success-shaped fallback.

### Acceptance Criteria
- No cohort starts before prior cleanup and integrity are complete; every requested slot and scheduled position has one terminal record.
- Cleanup failure or incomplete integrity remains visible and blocks unsafe later starts while ordered records are still synthesized.
- Three passes only under every AC-13 condition; one never gates; five/ten never rewrite the three decision.
- Overall exit follows AC-15 independently of cohort/member findings and preserves all evidence collected before failure.

### Test Coverage
- V-2 verifies serial calls, continuation, safety stop, synthesized records, and ordering.
- V-4 verifies completeness on explicit findings and every missing element.
- V-5 verifies cleanup/integrity sequencing and failure retention.
- V-6 table-tests one/three/five/ten semantics and overall exits.
- V-7 covers the complete controlled negative matrix.

### Expected Evidence
- Coordinator call-order traces and complete partial-record fixtures.
- Gate/blocker/finding/overall disposition matrix.
- Cleanup/integrity records for every cohort, including stopped and synthesized cohorts.

## Task T-5: Add atomic evidence retention, comparison rendering, and paved commands

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-4
- **Acceptance Criteria:** AC-1, AC-9, AC-10, AC-14, AC-15, AC-17
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260808-engineering-harness-delivery-contract; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-development-standards

### Description
Add thin capacity and audit CLIs plus root recipes `proof-workbench-capacity` and `proof-workbench-capacity-audit`. Atomically retain `run.json`, `samples.json`, `workloads.json`, and `comparison.md` below the run-ID evidence directory. Validate all files before success, render every required comparison field, and emit stable structured metadata diagnostics. Evidence-write failure stays nonzero after cleanup; temporary files and the active guard are removed only when safely attributable.

### Acceptance Criteria
- Root `justfile` remains the only raw command interface and the paved run applies the documented overall timeout.
- Every retained file contains/references one capacity run ID; all JSON validates and the Markdown table is reproducible from it.
- Comparison rows include required counts, workload/sample/resource/probe/cleanup/integrity/findings/gate fields and independent overall disposition.
- Writer, rendering, or final-validation failure cannot return zero or erase earlier valid evidence.

### Test Coverage
- V-1 checks recipe/CLI constants and run isolation.
- V-4 round-trips manifests/raw files/table and injects missing/malformed artifacts.
- V-6 checks table/gate/exit consistency.
- V-7 injects atomic-write and timeout failures.

### Expected Evidence
- Focused CLI/writer/renderer output.
- A complete temporary evidence tree and failure trees with typed nonzero diagnostics and no cross-run references.

## Task T-6: Add bounded controlled validation for the complete behavior matrix

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-18
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-agent-executable-acceptance-criteria; CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260808-development-standards; CORE-COMPONENT-260808-engineering-harness-delivery-contract; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-filesystem-path-safety

### Description
Create finite fake clocks, fake member starters, process/listener fixtures, bounded workload processes, faulting writers, and fixture mutation controls. Cover every AC-18 item with deterministic tests and documented expected nonzero or finding semantics. Use real short-lived child groups only where exact Linux identity/cleanup cannot be proven in pure tests; enforce short per-test bounds and `finally` cleanup.

### Acceptance Criteria
- Every named AC-18 positive/negative control has an explicit assertion for slot/sample/cohort/gate/overall result.
- Tests do not wait for production five-, seven-, thirty-second, or twenty-minute bounds; injected clocks and shorter overrides preserve semantics.
- Any test-owned process, listener, active guard, temporary evidence, or fixture mutation is removed/restored in `finally` and audited.
- The focused suite exits zero only after all controls and final leak/integrity checks pass.

### Test Coverage
- V-7 is the aggregate controlled matrix and invokes focused V-1 through V-6 suites.

### Expected Evidence
- Named focused test output covering continuation, safety stop, schedules, overlap, zero-ready, completeness, gate/findings, concurrency, writes, timeout, cleanup/leak, and mutation.
- Final controlled-suite absence and fixture-equality audit.

## Task T-7: Run and retain the designated-host baseline

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-6
- **Acceptance Criteria:** AC-19
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-filesystem-path-safety; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260806-project-command-interface

### Description
On the documented Ubuntu host as `vscode`, prove no active BL-004 ownership, invoke `just proof-workbench-capacity` once, allow all four ordered cohort records to complete under the 20-minute bound, and retain its immutable evidence directory. Independently rerun the bounded audit and validate/recompute table, three-member gate, findings, and overall exit from raw JSON. Do not normalize away host/cgroup background constraints.

### Acceptance Criteria
- Evidence records exact designated host/code-server/cgroup facts and all 1/3/5/10 slots.
- Raw samples and workloads resolve, comparison matches them, and the gate/overall results are independently recomputable.
- Final audit finds no attributed member/workload PID or listener and no fixture membership/hash change.
- The observed result is reported as a diagnostic baseline, not a product scheduling or quota decision.

### Test Coverage
- V-8 executes and validates the one designated-host episode and independent audit.

### Expected Evidence
- `implementation/evidence/<runId>/run.json`, `samples.json`, `workloads.json`, and `comparison.md`.
- Paved command exit/duration and post-run audit output.

## Task T-8: Document the baseline and integrate the bounded full-gate audit

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-5, T-6, T-7
- **Acceptance Criteria:** AC-20, AC-21
- **Related ADRs:** ADR-260808-governed-engineering-harness; ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260808-engineering-harness-delivery-contract; CORE-COMPONENT-260808-development-standards; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260806-rpiv-stage-contract

### Description
Update the workbench proof runbook and harness discovery/evidence inventory with the exact command, bounds, probe, workload, formulas, schedules, partial/completeness/gate/exit semantics, run isolation, evidence paths, cleanup, observed run identity/results, and scope exclusions. Add documentation consistency tests. Append the short BL-004 audit to the existing `just verify` sequence after ordinary validation; do not put the expensive designated run in the full regression gate. Record implementation and documentation evidence in the RPIV implementation artifact.

### Acceptance Criteria
- Documentation covers every AC-20 item and exactly matches source constants and retained evidence.
- Harness checks still delegate to `just verify`; harness boot remains non-persistent and no architecture claim changes.
- `just verify` exits zero and its final bounded audit explicitly reports no BL-004 attributed resource and unchanged BL-001 fixture integrity.
- Implementation evidence maps AC-1 through AC-21 to commands, artifacts, observations, documentation, and final results.

### Test Coverage
- V-9 validates documentation/source/evidence consistency and exclusions.
- V-10 runs the canonical full gate and final audit.

### Expected Evidence
- Runbook/harness diffs and passing documentation test.
- `just verify` exit 0, duration, final audit envelope, and complete implementation AC mapping.
