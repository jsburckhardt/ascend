# Implementation Notes: BL-004 Workbench Capacity Baseline

## Scope

Corrected the Issue #11 sensor contract returned by Verify at 41183a1. The correction remains an issue-local diagnostic extension of BL-001 and does not introduce product runtime management, scheduling, quotas, sleeping, multi-host behavior, BL-010 or BL-013 outcomes, or a presentation architecture change.

## Completed Tasks

- T-1: corrected command-wide deadline, setup failure classification, records, completeness, and run isolation.
- T-2: corrected readiness and later process/listener attribution plus exact identity cleanup.
- T-3: corrected exact-offset 5,000 ms windows and one combined workload output bound.
- T-4: corrected ready-state transitions, listener-owner gate uniqueness, findings, completeness, and overall disposition.
- T-5: retained corrected raw evidence and comparison through the existing paved commands.
- T-6: added the missing controlled negative matrix and cleanup assertions.
- T-7: regenerated the designated 1/3/5/10 baseline as run 532abfdb-c970-4979-9da2-ec9ef99a295a.
- T-8: aligned README, runbook, harness inventory, consistency tests, and the full-gate audit.

## Acceptance Evidence

- **AC-1:** proof-workbench-capacity.ts starts one absolute 1,200,000 ms deadline before ownership acquisition and bounds prerequisites, fixture snapshots, coordination, evidence writing, and guard release. Eleven CLI controls prove prerequisite result 2, fixture result 3, deadline result 4, isolation result 5, and zero starts for setup failures.
- **AC-2:** coordinator controls retain exact 1/3/5/10 order and synthesize terminal unstarted slots after a latched stop; the corrected run contains four ordered records.
- **AC-3:** starts remain sequential with 30,000 ms readiness bounds and ordinary start failure continuation. Unexpected exits now transition readiness-achieved slots to failed instead of remaining counted ready.
- **AC-4:** the fixed /usr/bin/true 1,000 ms probe remains at pre-cohort, scheduled host positions, and post-cleanup boundaries. Findings now include every failed pre, scheduled, and post probe.
- **AC-5:** sleepUntil prevents early timer wakeups. Unit and designated evidence prove all actual starts are at or after targets 0/1/2/3/4 and every idle end is at least anchor plus 5,000 ms.
- **AC-6:** all members retain the same seven-second workload contract. The combined-output fixture proves stdout plus stderr together retain at most 4,096 bytes and overflow is failure-shaped.
- **AC-7:** active anchors remain after all workload start attempts, every active end is at least anchor plus 5,000 ms, overlap is required, and zero-ready positions remain explicit absences.
- **AC-8:** raw Linux /proc host and process-tree fields and formulas remain unchanged; scheduled process timestamps now report their actual collection time rather than the pre-probe position time.
- **AC-9:** corrected evidence run 532abfdb-c970-4979-9da2-ec9ef99a295a contains run.json, samples.json, workloads.json, and reproducible comparison.md with one run ID and complete host/member/listener metadata.
- **AC-10:** validation now requires each host and every readiness-achieved slot tree at every target to be a sample or explicit absence. Missing tree entries and strict deadline breach make cohort completeness false.
- **AC-11:** each slot accumulates every PID/start identity and listener inode/owner/port discovered at readiness, baselines, scheduled sampling, and final inspection. Cleanup applies exact identity checks and audits every accumulated process, workload, descendant, and listener owner.
- **AC-12:** the corrected one-member row remains not-applicable for gate authority.
- **AC-13:** the three-member gate now explicitly requires distinct root PIDs, listener-owner PIDs, and ports. The repeated-owner control fails readiness/gate, while the corrected run records 3/3 ready and gate passed.
- **AC-14:** five/ten complete failures remain findings and do not rewrite the frozen three-member result; controlled tests retain this separation.
- **AC-15:** strict deadline breach, incomplete tree evidence, gate failure, cleanup/integrity failure, fixture failure, and evidence-write failure all remain nonzero independently. The corrected run has no exit reasons.
- **AC-16:** findings now include failed/unstarted slots, workloads, unexpected exits, host/sample absences, missing tree records, process-tree failures, every probe failure, cleanup/integrity failure, incomplete evidence, and timeout. No unexpected-exit member remains ready.
- **AC-17:** active ownership remains exclusive and historical evidence remains separate. The final audit reports activeGuardAbsent true across two retained immutable runs.
- **AC-18:** the complete focused capacity suite passes 42 tests across audit, CLI, contract, coordinator, designated evidence, documentation, evidence validation, and sampling. Added negative controls cover prerequisite/fixture failures, immediate/in-flight/whole-command deadlines, combined output, explicit and missing trees, later identities, listener-owner uniqueness, unexpected exits, missing evidence, and probe/process failures.
- **AC-19:** the designated paved run completed in about 71 seconds with ready results 1/1, 3/3, 5/5, and 10/10; workload pass results 1/1, 3/3, 5/5, and 10/10; 40/40 host positions and all 190 readiness-achieved tree positions retained; no findings; gate passed; overall passed. The post-run audit reports no attributed resource and unchanged fixture.
- **AC-20:** README.md, docs/workbench-proof.md, and .harness/engineering-harness.md now describe strict command scope and classifications, at-or-after timing and both 5,000 ms windows, combined output, readiness-achieved completeness, accumulated attribution, owner-PID gate uniqueness, findings, state transitions, and corrected observed run.
- **AC-21:** just verify exits zero with formatting, lint, strict types, 130 API tests at 80.40 percent branch coverage, web tests, builds, three passing and one skipped Playwright scenarios, and a final passing BL-004 audit with two retained runs and no leak or fixture change.

## Corrected Designated Baseline

| Cohort | Ready | Failed | Unstarted | Workloads pass/fail | Host positions | Minimum available KiB | Gate |
|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 1 | 0 | 0 | 1/0 | 10/0 | 21,992,676 | not-applicable |
| 3 | 3 | 0 | 0 | 3/0 | 10/0 | 21,851,460 | passed |
| 5 | 5 | 0 | 0 | 5/0 | 10/0 | 21,841,364 | not-applicable |
| 10 | 10 | 0 | 0 | 10/0 | 10/0 | 21,585,816 | not-applicable |

Cgroup-v2 context remains cpu.max=max 100000, effective CPUs 0-19, and max memory, memory-high, swap, and PID limits. Raw values and honest timing remain in retained JSON.

## Validation Evidence

- Focused controlled and designated suite: just verify-focused over all eight capacity test files passed 42 tests after the correction set.
- Designated command: just proof-workbench-capacity retained run 532abfdb-c970-4979-9da2-ec9ef99a295a with passed gate and overall disposition.
- Cleanup audit: just proof-workbench-capacity-audit passed with retainedRuns 2, activeGuardAbsent true, attributedResourcesAbsent true, and fixtureIntegrityUnchanged true.
- Full gate: just verify passed with 130 API tests, 80.40 percent branch coverage, builds, browser tests, and the final cleanup audit.
- E2E stabilization: the existing terminal sensors now open the same integrated terminal through the command palette, wait for shell readiness, focus it, and then perform their unchanged timeout/parity workflows.

## Documentation Evidence

- README.md: corrected user-facing deadline, timing, output, attribution, findings, readiness, and observed-run summary.
- docs/workbench-proof.md: corrected operational setup classifications, both window contracts, combined output, per-target completeness, findings, exact cleanup attribution, gate semantics, and retained baseline interpretation.
- .harness/engineering-harness.md: points the governed evidence inventory to the corrected designated run; harness checks still delegate to just verify and do not rerun the cohort episode.
- API references/specifications: no impact; no HTTP API was added or changed.
- Configuration/migration guides: no impact; no product configuration, default, data, or migration contract changed.
- Architecture documentation: no contract change; all corrections remain within the cited ADR and core-component boundaries.
- Deployment/runbooks: docs/workbench-proof.md is the affected operational runbook; no deployed runtime procedure changed.
- Existing terminal-proof documentation: no semantic impact; the stabilization changes only how the sensor invokes the already documented single integrated terminal.

Implementation evidence is recorded for Verify. Final acceptance remains owned by Verify.
