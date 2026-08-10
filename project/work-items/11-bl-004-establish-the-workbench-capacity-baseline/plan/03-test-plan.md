# Test Plan: BL-004: Establish the workbench capacity baseline

Validation is bounded and simple-first: deterministic unit/integration controls use injected clocks and short process bounds; the real 1/3/5/10 episode runs once through its separate paved command; the ordinary full gate ends with a short audit and does not repeat the expensive baseline.

## Test V-1: Capacity contract, prerequisites, and run isolation

- **Type:** Unit and CLI integration
- **Task:** T-1, T-5
- **Acceptance Criteria:** AC-1, AC-17
- **Priority:** Critical

### Setup
Valid host/prerequisite fixtures, each prerequisite failure, distinct historical evidence, an active guard, stale active state, and mixed run-ID records.

### Steps
1. Assert exact host checks, constants, 20-minute bound, run-ID fields, and prerequisite order.
2. Fail each prerequisite and inspect start count, typed result, and retained failure manifest.
3. Invoke two coordinators against one active guard; then present stale active state.
4. Validate historical evidence coexistence and reject cross-run references.

### Expected Result
Prerequisites pass or fail specifically before starts; concurrent/stale active ownership is deterministically nonzero; historical evidence is untouched; all retained output has one outer run ID.

### Expected Evidence
Focused output, prerequisite matrix, zero-start counters, ownership diagnostics, and valid/rejected manifest fixtures.

## Test V-2: Ordered cohort starts, continuation, and responsiveness stop

- **Type:** Unit integration
- **Task:** T-2, T-4
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-16
- **Priority:** Critical

### Setup
Injected four-cohort coordinator with call log, controlled ready/start-failure/listener-conflict outcomes, and probe failures before starts and during each window.

### Steps
1. Run all-ready cohorts and assert exact 1/3/5/10 order and serial attempts.
2. Fail a member start and listener attribution; assert later members still start with 30,000 ms bounds.
3. Fail the pre-cohort probe and one scheduled host probe.
4. Inspect current/later slots, scheduled absences, cleanup order, post-cleanup probes, and preserved prior records.

### Expected Result
Only the first responsiveness failure latches a safety stop; no later member starts; every slot remains attributable and terminal; ordinary failures continue; no failure is success-shaped.

### Expected Evidence
Ordered call traces, slot records/reasons, probe records, safety-stop reason, start counts, and cleanup trace.

## Test V-3: Anchored windows, process/host samples, and workloads

- **Type:** Unit and short process integration
- **Task:** T-2, T-3
- **Acceptance Criteria:** AC-4, AC-5, AC-6, AC-7, AC-8, AC-16
- **Priority:** Critical

### Setup
Fake monotonic/wall clocks, controlled `/proc` snapshots, host memory/load fixtures, probe outcomes, bounded workload children, and zero-ready/early-exit/missed-position scenarios.

### Steps
1. Schedule idle targets at 0-4 and finish at anchor + 5 seconds.
2. Start each workload, then anchor active targets at 0-4.
3. Advance on time, beyond a target boundary, and beyond workload exit.
4. Recompute CPU tick deltas, RSS sums, memory formula, and load values.
5. Run zero-ready, output overflow, timeout, nonzero, spawn, cancellation, and inspection-failure cases.

### Expected Result
Exactly five positions per window are samples or explicit non-replacement absences; active samples retain only when all associated workloads overlap; all required fields/formulas and complete workload result shapes are present.

### Expected Evidence
Schedule tables, raw sample fixtures, workload result fixtures, formula assertions, timestamps, overlap/absence reasons, and bounded process audits.

## Test V-4: Evidence schemas, completeness, and comparison rendering

- **Type:** Unit and filesystem integration
- **Task:** T-1, T-4, T-5
- **Acceptance Criteria:** AC-9, AC-10
- **Priority:** Critical

### Setup
Complete cohort/run/raw fixtures plus variants missing each slot state, reason, sample/absence, workload result, cleanup, integrity, raw reference, or comparison field.

### Steps
1. Validate and atomically round-trip a complete evidence tree.
2. Regenerate the Markdown table from JSON and compare byte-for-byte.
3. Remove each required element in turn.
4. Validate explicit member/sample findings that still satisfy completeness.

### Expected Result
Complete explicit findings pass; any omitted requirement fails; the table contains every required count, summary, result, finding, gate, and disposition and references one run ID.

### Expected Evidence
Schema matrix, temporary `run.json`/`samples.json`/`workloads.json`/`comparison.md`, rejection diagnostics, and reproducibility assertion.

## Test V-5: Exact cleanup, leakage, and fixture integrity

- **Type:** Linux safety integration
- **Task:** T-2, T-4
- **Acceptance Criteria:** AC-11, AC-16
- **Priority:** Critical

### Setup
Short-lived managed process groups and listener identities, one unrelated control process/listener, captured fixture snapshot, and controlled process/listener leak and fixture mutation.

### Steps
1. Capture every attributed PID/start identity and listener inode/owner/port.
2. Stop workloads and BL-001 handles in coordinator order; audit all identities.
3. Prove the unrelated control survives and port reuse is not claimed.
4. Inject a surviving managed identity, cleanup error, missing process inspection, tree change, and sentinel change.
5. Restore fixture in `finally` and rerun the audit.

### Expected Result
Only exact owned resources are stopped; each leak/mutation is attributable and nonzero/incomplete as specified; unrelated resources survive; final fixture equals the original snapshot.

### Expected Evidence
Identity/listener before-after records, cleanup error fixtures, unrelated-control liveness, fixture comparisons, and final clean audit.

## Test V-6: Completeness, three-only gate, findings, and exit matrix

- **Type:** Unit
- **Task:** T-4, T-5
- **Acceptance Criteria:** AC-10, AC-12, AC-13, AC-14, AC-15, AC-16
- **Priority:** Critical

### Setup
Complete four-cohort fixtures varying readiness, listeners, workloads, unexpected exits, samples, probes, cleanup, integrity, evidence writes, and timeout.

### Steps
1. Vary the one-member result while keeping records complete.
2. Fail each strict three-member gate condition separately and together.
3. Apply equivalent start/workload/exit/probe/resource failures to five and ten.
4. Make five/ten incomplete, then inject cleanup/integrity/write/overall-timeout failures.
5. Recompute blockers, findings, gate, completeness, and command exit.

### Expected Result
One never gates; only three decides MVP; complete five/ten failures remain findings and never alter that decision; all AC-15 conditions independently make the overall command nonzero.

### Expected Evidence
Table-driven gate/exit matrix with blockers, findings, frozen three-member decision, completeness, and overall disposition.

## Test V-7: Controlled finite acceptance and fault matrix

- **Type:** Aggregate focused validation
- **Task:** T-1, T-2, T-3, T-4, T-5, T-6
- **Acceptance Criteria:** AC-18
- **Priority:** Critical

### Setup
V-1 through V-6 fixtures and seams; fake time for production-length bounds; short real child-process bounds only for Linux ownership checks.

### Steps
1. Run sequential continuation and probe-triggered stop controls.
2. Run exact schedule/field, overlap/early-exit, zero-ready, and completeness controls.
3. Run gate, five/ten finding, concurrent/stale state, write, and timeout controls.
4. Run cleanup failure, managed leak, process-inspection failure, and fixture mutation controls.
5. Assert each negative control has its documented nonzero or complete-finding result and run a final leak/integrity audit.

### Expected Result
Every AC-18 case is finite, deterministic, inspectable, and produces exactly its specified outcome with no residual test resource or fixture change.

### Expected Evidence
Named focused-suite output, control-to-result matrix, elapsed bounds, and final clean audit.

## Test V-8: Designated-host 1/3/5/10 baseline

- **Type:** Designated-host end-to-end
- **Task:** T-5, T-7
- **Acceptance Criteria:** AC-19
- **Priority:** Critical

### Setup
Documented Ubuntu 24.04.4 host `03f809395a5d`, non-root `vscode` uid 1000, repository `/workspaces/ascend`, code-server 4.131.0, readable `/proc`, no active BL-004 ownership, and unchanged BL-001 fixture.

### Steps
1. Run `just proof-workbench-capacity` once under its 1,200,000 ms bound.
2. Validate ordered cohorts/slots and every raw/table reference.
3. Recompute completeness, resource summaries, three-member gate, findings, and overall exit from raw JSON.
4. Run `just proof-workbench-capacity-audit` and inspect exact resources and fixture.

### Expected Result
All four ordered records and complete retained artifacts exist; reported gate and overall disposition match raw evidence; no attributed PID/listener/workload remains and fixture membership/hashes are unchanged.

### Expected Evidence
Immutable `implementation/evidence/<runId>/` JSON/Markdown files, paved exit/duration, recomputation output, and audit result.

## Test V-9: Documentation, constants, evidence, and scope consistency

- **Type:** Documentation validation
- **Task:** T-8
- **Acceptance Criteria:** AC-20
- **Priority:** High

### Setup
Final source constants, root recipes, retained run, `docs/workbench-proof.md`, and `.harness/engineering-harness.md`.

### Steps
1. Assert all prerequisite, timeout, probe, workload, measurement, schedule, partial/completeness, gate/exit, comparison, isolation, cleanup, and interpretation text.
2. Compare documented observed run ID/facts/results to retained evidence.
3. Assert the root and harness command surfaces are accurate.
4. Assert no scheduling, quota, multi-host, BL-010, or BL-013 claim and no change to the BL-003 presentation decision.

### Expected Result
Documentation exactly describes executable behavior and observed evidence while preserving diagnostic-only scope.

### Expected Evidence
Passing documentation consistency test and reviewed documentation/harness diff.

## Test V-10: Canonical full verification and final bounded audit

- **Type:** Full regression
- **Task:** T-8
- **Acceptance Criteria:** AC-21
- **Priority:** Critical

### Setup
V-1 through V-9 complete, retained designated evidence present, no active capacity ownership, and root recipes available.

### Steps
1. Run `just verify` once.
2. Confirm existing format, lint, type, unit, build, and Playwright stages remain green.
3. Inspect the final bounded BL-004 audit envelope for active state, attributed PIDs/listeners/workloads, and BL-001 fixture equality.
4. Record exit and duration in implementation evidence.

### Expected Result
The canonical gate exits zero and ends with an explicit clean resource/fixture audit; it does not rerun the expensive 1/3/5/10 episode.

### Expected Evidence
`just verify` output, exit 0, duration, final audit envelope, and implementation AC mapping.

## Acceptance Coverage Check

| AC ID | Implementation tasks | Tests or validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1, T-5 | V-1, V-7 | Prerequisite matrix, one-run-ID artifacts, finite bound, zero-start nonzero failures. |
| AC-2 | T-1, T-4 | V-2, V-7 | Exact cohort/slot call order and post-stop synthesized records. |
| AC-3 | T-2, T-4 | V-2, V-7 | Serial 30-second-attempt records and continuation after ordinary failure. |
| AC-4 | T-3, T-4 | V-2, V-3, V-7 | Probe schedule/results and latched safety-stop evidence. |
| AC-5 | T-3 | V-3, V-7 | Idle anchor/targets/actuals/end and explicit misses. |
| AC-6 | T-3 | V-3, V-7 | Same bounded seven-second command and complete result per ready member. |
| AC-7 | T-3, T-4 | V-3, V-7 | Active post-start anchor, overlap proof, and explicit zero-ready/missed records. |
| AC-8 | T-2, T-3 | V-3, V-7 | Required process/host sample fields and formula checks. |
| AC-9 | T-1, T-5 | V-4, V-8 | Complete raw JSON, metadata, workloads, and comparison table. |
| AC-10 | T-1, T-4, T-5 | V-4, V-6 | Completeness acceptance/rejection matrix. |
| AC-11 | T-2, T-4 | V-5, V-7, V-8 | Exact absence, unrelated survival, and before/after fixture proof. |
| AC-12 | T-4 | V-6, V-8 | One-member plumbing finding with no gate effect. |
| AC-13 | T-4 | V-6, V-8 | Strict three-member gate/blocker matrix and retained decision. |
| AC-14 | T-4, T-5 | V-6, V-8 | Five/ten findings with unchanged three-member decision. |
| AC-15 | T-4, T-5 | V-6, V-7 | Independent nonzero-condition matrix and overall disposition. |
| AC-16 | T-2, T-3, T-4 | V-2, V-3, V-5, V-7 | Typed attributable failures/absences with preserved evidence. |
| AC-17 | T-1, T-5 | V-1, V-7 | Pre-start active-state rejection and mixed-run rejection. |
| AC-18 | T-6 | V-7 | Every named finite positive/negative control and clean final audit. |
| AC-19 | T-7 | V-8 | Designated retained run, independent recomputation, and exact final audit. |
| AC-20 | T-8 | V-9 | Documentation/source/evidence consistency and exclusion proof. |
| AC-21 | T-8 | V-10 | Full gate exit 0 and final bounded clean audit. |

All AC-1 through AC-21 map to implementation, finite validation, and expected evidence. V-8 is the only full 1/3/5/10 host episode; V-10 remains bounded by reusing retained evidence and running only the final audit.
