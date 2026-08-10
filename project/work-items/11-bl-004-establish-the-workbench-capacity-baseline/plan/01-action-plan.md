# Action Plan: BL-004: Establish the workbench capacity baseline

## Feature
- **ID:** 11
- **Research Brief:** project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/research/00-research.md

## ADRs Created
- None. BL-004 measures the already accepted direct-host, one-workbench-per-active-project approach. It does not choose a product runtime manager, scheduler, quota, sleep policy, multi-host design, or capacity policy. Existing ADRs are sufficient.

## Core-Components Created
- None. The cohort runner, sampling rules, workload, and evidence schema are bounded diagnostic behavior for Issue #11, not reusable cross-cutting product contracts. Existing host-process, lifecycle, path-safety, logging, command-interface, development, RPIV, and harness contracts govern implementation.

## Acceptance Criteria
### Core
- **AC-1:** One paved repository command checks and records the documented designated Ubuntu host prerequisites, code-server 4.131.0, and non-root `vscode` execution before member starts; uses a documented finite overall timeout; assigns one unique run ID to all retained output; and returns a prerequisite-specific nonzero result without starting a member when a prerequisite fails.
- **AC-2:** The command processes cohort records in the exact order 1, 3, 5, and 10. Member starts for a cohort cannot begin until the prior cohort cleanup and fixture-integrity result is complete; after a safety stop, later cohorts still receive ordered records with their slots explicitly `unstarted`.
- **AC-3:** Within each cohort, every requested member is attempted sequentially with a 30-second readiness timeout. Each slot ends as `ready`, `failed` with reason, or `unstarted` with reason; a member start failure is recorded and later requested members are still attempted unless the responsiveness safety stop has occurred.
- **AC-4:** One host responsiveness probe definition and finite timeout are fixed in repository documentation and copied into run evidence. The probe runs before each cohort, with every scheduled host sample in both sampling windows, and after cleanup. On its first failure, no further member starts occur anywhere in the run, every not-yet-attempted slot in the current and later cohorts is recorded `unstarted` with that failure reason, and cleanup begins for already managed members.
- **AC-5:** Idle stabilization lasts exactly 5 seconds after all permitted start attempts finish. The five idle positions are scheduled from a monotonic window anchor at offsets 0, 1, 2, 3, and 4 seconds for every ready process tree and the host; actual timestamps are retained, a missed position is not replaced, and its record is explicitly absent with reason.
- **AC-6:** Every ready member is assigned the same single repository-defined terminal workload command used for every member and cohort. Each workload is bounded to 5 through 10 seconds, has a documented finite maximum output size, and retains its complete command text, PID, start time, end time, exit result, stdout, and stderr.
- **AC-7:** The active window is anchored only after workload start has been attempted for every ready member. Its five positions are scheduled at monotonic offsets 0, 1, 2, 3, and 4 seconds; all ready-member workloads must overlap each retained active position, actual timestamps are retained, and a missed or non-overlapped position is not replaced and is explicitly absent with reason. When no member is ready, all five host and process-tree active positions are explicitly absent with `no ready workload` as the reason.
- **AC-8:** Every process-tree sample records timestamp, root PID, aggregate CPU percent, aggregate RSS KiB, and member PIDs. Every host sample records timestamp, load average, available memory KiB, used memory KiB, and that sample’s responsiveness-probe result. One measurement method is used consistently for the complete run and documented without prescribing its utility.
- **AC-9:** Retained run evidence contains host, code-server, cohort, slot, run ID, PID, port/listener, and readiness metadata; raw sample JSON; a workload result for every ready member; and a concise comparison table showing each cohort’s requested/ready/failed/unstarted counts, workload pass/fail counts, sample completeness, host and process-tree resource summaries, responsiveness result, cleanup/integrity result, findings, and gate status.
- **AC-10:** A cohort result is complete only when every requested slot has a terminal state with reason where applicable, all scheduled idle and active positions are samples or explicit absences with reason, every ready member has a workload result, and cleanup plus fixture-integrity checks finish. A failed member or an explicitly absent sample may be a complete finding, not a successful member.
- **AC-11:** Cleanup after every cohort confirms every PID and listener attributed to that run is absent and the merged BL-001 fixture tree membership and sentinel hashes match their before-cohort values. Cleanup does not claim or remove unrelated host processes, listeners, or fixture content.

### Edge Cases
- **AC-12:** The one-member cohort is proof plumbing with no independent success threshold: its member outcome is a finding when the cohort record is complete, and it does not determine MVP acceptance.
- **AC-13:** The three-member cohort is the only MVP gate. It passes only when all three members are ready, each workload exits successfully, each listener has a distinct PID/port and passes the documented readiness check, no managed member exits between readiness and the beginning of intentional cleanup, all five idle and all five active positions contain samples for each ready process tree and the host, and every required responsiveness probe passes. Any gate failure records a blocker and makes the paved command nonzero.
- **AC-14:** Five- and ten-member start, workload, unexpected-exit, responsiveness, and resource failures are retained as findings and never rewrite the recorded three-member gate decision when their cohort records are complete.
- **AC-15:** The paved command is nonzero when the three-member gate fails, any cohort record is incomplete, cleanup or fixture integrity is incomplete or fails, evidence cannot be retained, or the overall timeout expires. Incomplete five- or ten-member evidence therefore makes the command nonzero even after a passing three-member gate, without changing that gate decision.
- **AC-16:** A failed start, port/listener conflict, workload failure, unexpected exit, process-inspection failure, or unavailable sample remains attributable to its cohort and slot, preserves previously collected evidence, and cannot be reported as a ready or successful member. Scheduled evidence unavailable after a responsiveness safety stop is explicitly absent with the stop reason.
- **AC-17:** Concurrent paved-command invocation or pre-existing run-owned state is deterministically rejected with a documented nonzero result before member starts unless complete run isolation and unambiguous attribution are proven; evidence from different run IDs is never combined.

### Verification
- **AC-18:** Finite repository validation uses controlled evidence to prove correct and incorrect outcomes for sequential continuation after member failure, probe-triggered safety stop and `unstarted` slots, exact anchored sample positions and fields, workload overlap and early exit, zero-ready cohorts, cohort completeness, the three-member gate, five/ten finding semantics, concurrent-run isolation, evidence-write failure, overall timeout, cleanup failure, managed-resource leakage, and fixture mutation; each negative control returns the documented nonzero or finding result.
- **AC-19:** One run on the repository-documented designated Ubuntu host invokes the paved command, processes all four ordered cohort records, retains raw JSON and the comparison table, reports the independent three-member gate and overall exit disposition, and finishes with no run-attributed PID, listener, or terminal workload and unchanged BL-001 fixture membership and sentinel hashes.
- **AC-20:** Documentation records the designated Ubuntu host prerequisites, paved command and overall timeout, probe and timeout, workload command, duration, and output bound, measurement method, cohort and partial-result rules, sample schedule and fields, gate and exit semantics, comparison fields, evidence interpretation, run isolation, cleanup, and the observed run identity and baseline without claiming runtime scheduling, quotas, multi-host support, BL-010, or BL-013 outcomes.
- **AC-21:** The configured repository full-validation command exits zero, and its final bounded audit reports no run-attributed resource leak or BL-001 fixture-integrity change.

## Acceptance Coverage
| AC ID | Implementation tasks | Tests or validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1, T-5 | V-1, V-7 | Prerequisite records, one capacity run ID in every artifact, 1,200,000 ms bound, zero starts, and prerequisite-specific exit. |
| AC-2 | T-1, T-4 | V-2, V-7 | Ordered 1/3/5/10 records, serial call log, prior cleanup/integrity completion, and synthesized later `unstarted` slots. |
| AC-3 | T-2, T-4 | V-2, V-7 | Sequential start-attempt records with 30,000 ms bounds and continued later attempts after ordinary failure. |
| AC-4 | T-3, T-4 | V-2, V-3, V-7 | Fixed probe records at pre-cohort, host positions, and post-cleanup plus latched safety-stop evidence. |
| AC-5 | T-3 | V-3, V-7 | Monotonic idle anchor, target offsets 0-4, actual times, exact five-second end, and explicit missed records. |
| AC-6 | T-3 | V-3, V-7 | Identical seven-second workload command records with bounded streams, identity, timing, and exit. |
| AC-7 | T-3, T-4 | V-3, V-7 | Post-start active anchor, overlap decisions, explicit misses/non-overlap, and five `no ready workload` positions. |
| AC-8 | T-2, T-3 | V-3, V-7 | Raw `/proc` and host-derived sample records with required fields and documented formulas. |
| AC-9 | T-1, T-5 | V-4, V-8 | Schema-valid manifest, raw samples/workloads JSON, and complete Markdown comparison table. |
| AC-10 | T-1, T-4, T-5 | V-4, V-6 | Completeness validator accepts explicit findings and rejects every missing terminal state/result/position/cleanup check. |
| AC-11 | T-2, T-4 | V-5, V-7, V-8 | Exact PID/start identity and listener inode/owner absence plus before/after BL-001 snapshots; unrelated controls survive. |
| AC-12 | T-4 | V-6, V-8 | One-member row marked plumbing/finding with no gate authority. |
| AC-13 | T-4 | V-6, V-8 | Strict three-member gate matrix, blocker list, independent decision, and nonzero failed-gate exit. |
| AC-14 | T-4, T-5 | V-6, V-8 | Five/ten failures remain findings while the frozen three-member decision is unchanged. |
| AC-15 | T-4, T-5 | V-6, V-7 | Exit-disposition matrix for gate, incomplete record, cleanup/integrity, write failure, and timeout. |
| AC-16 | T-2, T-3, T-4 | V-2, V-3, V-5, V-7 | Attributable typed failures and explicit absences preserve earlier evidence without success-shaped fallback. |
| AC-17 | T-1, T-5 | V-1, V-7 | Exclusive active-run guard rejects concurrent/stale active state before starts and never merges run IDs. |
| AC-18 | T-6 | V-7 | Controlled finite fault matrix covers every named positive/negative case and expected nonzero-or-finding result. |
| AC-19 | T-7 | V-8 | Retained designated-host run manifest, samples, workloads, comparison, exit, and final exact cleanup/integrity audit. |
| AC-20 | T-8 | V-9 | Runbook and harness documentation test matches constants and observed retained baseline while preserving exclusions. |
| AC-21 | T-8 | V-10 | `just verify` exit 0 followed by bounded audit output proving no attributed resources or fixture change. |

Coverage proof: all 21 issue criteria occur once in the stable catalog. Every AC row names implementation tasks, finite validation, and inspectable expected evidence; therefore acceptance coverage is complete before artifact creation.

## Implementation Tasks
1. **T-1 — Define the capacity contract, prerequisites, records, and run isolation** (AC-1, AC-2, AC-9, AC-10, AC-15, AC-17)
2. **T-2 — Extend BL-001 lifecycle inspection and exact attribution** (AC-3, AC-8, AC-11, AC-16)
3. **T-3 — Implement the fixed probe, workload, and anchored sampler** (AC-4, AC-5, AC-6, AC-7, AC-8, AC-16)
4. **T-4 — Coordinate ordered cohorts, cleanup, completeness, gate, and findings** (AC-2, AC-3, AC-4, AC-7, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16)
5. **T-5 — Add atomic evidence retention, comparison rendering, and paved commands** (AC-1, AC-9, AC-10, AC-14, AC-15, AC-17)
6. **T-6 — Add bounded controlled validation for the complete behavior matrix** (AC-18)
7. **T-7 — Run and retain the designated-host baseline** (AC-19)
8. **T-8 — Document the baseline and integrate the bounded full-gate audit** (AC-20, AC-21)

## Approach and Scope Boundaries
- Add issue-local capacity modules beside the proof code (`workbench-capacity-contract`, `-sampling`, `-workload`, and `-coordinator`) plus a thin CLI. Extend BL-001 primitives instead of introducing a product runtime manager.
- Keep BL-001 defaults unchanged. Capacity starts call `startWorkbenchProof` sequentially with `startupTimeoutMs: 30_000` and a capacity-owned member state root. The outer capacity run ID is present in every retained artifact; each BL-001 handle ID is retained separately as a subordinate member-runtime identity.
- Use a fixed host responsiveness probe of direct argument-array `/usr/bin/true` with a 1,000 ms timeout. Latch the first failure globally. Continue required pre-cohort and post-cleanup probe records, but create explicit stop-reason absences instead of collecting later scheduled samples after the safety stop.
- Use one repository script through `process.execPath` as the exact terminal workload: seven seconds, one fresh process group per ready member, canonical fixture cwd, and at most 4 KiB total stdout plus stderr. Start every ready-member workload before anchoring the active window. No Chromium is added to this host-capacity measurement.
- Schedule each window from `performance.now()`: auxiliary baselines precede the anchor; positions target anchor + 0/1/2/3/4 seconds; a position not begun before the next one-second boundary is absent and never replaced; idle ends at anchor + 5 seconds. Active samples require every associated workload identity to be live at capture.
- Read one consistent Linux `/proc` method for the run. Aggregate CPU percent is process CPU-tick delta divided by monotonic elapsed time and clock ticks, not normalized by the 20 logical CPUs. Aggregate RSS is summed from current attributed PIDs. Host load retains 1/5/15-minute values; available memory is `MemAvailable`; used memory is `MemTotal - MemAvailable`. Record cgroup-v2 limits as host context because this host has no finite CPU, memory, swap, or PID ceiling.
- Attribute cleanup by PID plus `/proc` start identity and by captured listener inode/owner/port. Never kill by name, sweep ports, or claim a rapidly reused unrelated port. Preserve all observed attributed identities for the final absence audit and compare the merged BL-001 fixture membership and sentinel hashes before/after every cohort.
- Use a 1,200,000 ms overall designated-run timeout. All operation failures flow to cleanup and atomic evidence finalization. Historical retained evidence is immutable; only a fixed active-run guard and active state are concurrency blockers.
- Retain one designated run below `project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence/<runId>/` as `run.json`, `samples.json`, `workloads.json`, and `comparison.md`. Runtime logs contain only structured metadata, never workload output.
- One member is plumbing, three is the only gate, and five/ten are findings. Cohort completeness and overall disposition remain independent from member success and from the frozen three-member gate.
- Keep the expensive 1/3/5/10 host run behind `just proof-workbench-capacity`. Add controlled tests and a short final leak/integrity audit to `just verify`; do not rerun the full capacity episode in every regression gate.
- Do not infer scheduling, quotas, sleeping, product lifecycle policy, multi-host behavior, BL-010, or BL-013 from this diagnostic. The accepted full-page presentation ADR is unaffected.

## Architecture Impact
- **New ADRs:** None.
- **New core-components:** None.
- **Decision log:** No change required because no architecture artifact is created or modified.
- **Existing architecture applied:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness; ADR-260810-full-page-browser-workbench-presentation (scope boundary); and the existing host-process, lifecycle, path-safety, structured-logging, project-command, development, harness-delivery, agent-acceptance, and RPIV core-components.
