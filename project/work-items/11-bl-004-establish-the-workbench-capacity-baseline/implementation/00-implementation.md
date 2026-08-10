# Implementation Notes: BL-004 Workbench Capacity Baseline

## Scope

Implemented Issue #11 as an issue-local diagnostic extension of the merged BL-001 lifecycle. No product runtime manager, scheduler, quota, sleep policy, multi-host behavior, BL-010 outcome, BL-013 outcome, or presentation architecture change was introduced.

## Completed Tasks

- T-1: capacity constants, schemas, designated prerequisites, one-run-ID evidence, and exclusive active-run guard.
- T-2: strict `/proc` process-tree CPU/RSS/start identity inspection and exact PID/listener attribution audits.
- T-3: fixed `/usr/bin/true` probe, seven-second bounded workload, and exact anchored idle/active sampling.
- T-4: serial 1/3/5/10 coordinator, safety stop, cleanup/integrity, completeness, three-only gate, and findings.
- T-5: atomic JSON/Markdown retention, reproducible comparison, capacity and audit root recipes.
- T-6: finite controlled acceptance and fault matrix.
- T-7: designated-host baseline `e7757a3f-54ec-4ea7-9399-713e91f49719` and independent audit.
- T-8: README, runbook, harness inventory, documentation consistency test, and bounded final full-gate audit.

## Acceptance Evidence

- **AC-1:** `workbench-capacity-prerequisites.ts`, contract tests, and retained `run.json` record all eight ordered Ubuntu/user/repository/code-server/fixture/proc/cgroup checks before starts, one run ID, and the 1,200,000 ms bound. Controlled prerequisite failures retain a nonzero failure shape with no starts.
- **AC-2:** Coordinator tests assert exact 1/3/5/10 records and serial calls. Retained `run.json` has four ordered complete cohorts; cleanup and integrity close each cohort before the next.
- **AC-3:** Capacity starts use the unchanged BL-001 launcher with `startupTimeoutMs: 30_000`. Continuation tests retain failed reasons and still attempt later slots. The designated run has 19 terminal `ready` slots.
- **AC-4:** Source, tests, documentation, and retained evidence fix `/usr/bin/true` at 1,000 ms. Controlled pre-probe failure creates 19 ordered `unstarted` slots and 40 explicit safety-stop positions; every retained baseline probe passed.
- **AC-5:** Fake-clock tests assert idle offsets 0/1/2/3/4 seconds, nonreplacement misses, actual monotonic timestamps, and anchor plus exactly 5,000 ms end. The retained run has five idle positions per cohort with no absences.
- **AC-6:** All ready slots use `/usr/local/bin/node /workspaces/ascend/apps/api/src/workbench-capacity-workload.mjs`, 7,000 ms duration, 10,000 ms timeout, and 4,096-byte bound. `workloads.json` has complete identity/timing/exit/stream records for all 19 workloads.
- **AC-7:** Coordinator anchors active sampling only after every workload start attempt. Controlled zero-ready, nonoverlap, early timeout, and missed-position cases are explicit. The designated run has exactly five retained active positions per cohort and all workloads overlap them.
- **AC-8:** `workbench-proof-audit.ts` and sampling tests prove timestamp, root/member PIDs, tick-delta CPU percent, summed `VmRSS`, load 1/5/15, MemAvailable, used-memory formula, and per-host-sample probe fields. Retained host and cgroup-v2 facts are raw and unnormalized.
- **AC-9:** The retained evidence directory contains schema-validated `run.json`, `samples.json`, `workloads.json`, and reproducible `comparison.md` with all planned identity, count, resource, probe, cleanup, integrity, finding, gate, and disposition columns.
- **AC-10:** Completeness controls accept explicit member/sample findings and reject missing slots, reasons, ready metadata, positions, workloads, cleanup, or integrity. Every retained cohort has ten scheduled positions and final checks.
- **AC-11:** Exact cleanup tests use PID plus start ticks and listener inode/owner/port while preserving unrelated controls. Every designated cohort records passed process, listener, workload, tree-membership, and sentinel-hash checks.
- **AC-12:** Gate tests and comparison mark cohort one `not-applicable`; its result has no gate authority.
- **AC-13:** Strict blocker tests cover readiness, workload, samples, probes, cleanup, and integrity. The retained three-member row has 3 ready, 3 passing workloads, 10 complete host positions, complete tree samples, no unexpected exit, passed probes, distinct identities, and gate `passed`.
- **AC-14:** Controlled cohort-five start failure and cohort-ten workload failure remain findings while a passing three-member decision stays frozen. Retained five and ten rows both completed with no findings and do not own gate status.
- **AC-15:** Controlled gate, incomplete evidence, cleanup leak, fixture mutation, write collision, and overall-timeout paths are nonzero while keeping gate and disposition separate. The retained run has no exit reasons and overall `passed`.
- **AC-16:** Tests retain start, listener, process-inspection, workload timeout/overflow, nonoverlap, leak, and safety-stop reasons without success-shaped fallback or loss of earlier evidence.
- **AC-17:** Exclusive `wx` guard tests reject concurrent and stale active ownership without replacing the owner; mixed run IDs are rejected. Final audit reports `activeGuardAbsent:true`.
- **AC-18:** The final focused capacity matrix passed 25 controlled tests across contract, audit, sampling/workload, coordinator, evidence, designated evidence, and documentation suites. It covers continuation, safety stop, schedules, overlap, zero-ready, completeness, gate/findings, isolation, write collision, timeout, cleanup leakage, process inspection, and fixture mutation.
- **AC-19:** `just proof-workbench-capacity` retained run `e7757a3f-54ec-4ea7-9399-713e91f49719` in about 67 seconds. Cohort results were 1/1, 3/3, 5/5, and 10/10 ready; workload results 1/1, 3/3, 5/5, and 10/10 passed; all 40 host positions were retained; gate and overall disposition passed. `just proof-workbench-capacity-audit` independently reported one retained run, no active guard or attributed process/listener/workload, and unchanged fixture.
- **AC-20:** `README.md`, `docs/workbench-proof.md`, and `.harness/engineering-harness.md` record exact prerequisites, command/bounds, probe, workload, formulas, schedules, fields, completeness/gate/exit rules, isolation, evidence, cleanup, observed run, cgroup limits, and diagnostic-only exclusions. The documentation consistency test passed.
- **AC-21:** Final `just verify` exited zero: formatting, lint, strict type checks, 112 API tests with 80.22% branch coverage, web tests, builds, three passing and one skipped Playwright scenarios, then `workbench.capacity.audit` with `passed:true`, `attributedResourcesAbsent:true`, and `fixtureIntegrityUnchanged:true`.

## Designated Baseline Summary

| Cohort | Ready | Failed | Unstarted | Workloads passed/failed | Host positions retained/absent | Min available memory KiB | Three-member gate |
|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 1 | 0 | 0 | 1/0 | 10/0 | 22,096,872 | not applicable |
| 3 | 3 | 0 | 0 | 3/0 | 10/0 | 21,964,772 | passed |
| 5 | 5 | 0 | 0 | 5/0 | 10/0 | 21,833,472 | not applicable |
| 10 | 10 | 0 | 0 | 10/0 | 10/0 | 21,574,908 | not applicable |

Cgroup-v2 context: `cpu.max=max 100000`, effective CPUs `0-19`, and `max` for memory, memory-high, swap, and PID limits. Raw timestamps and resource values remain in the retained JSON; no missing sample was fabricated.

## Validation Evidence

- T-1: `just verify-focused apps/api/test/workbench-capacity-contract.test.ts` passed.
- T-2: focused capacity-audit plus BL-001 failure regression passed.
- T-3: focused sampling/workload plus audit tests passed.
- T-4: focused coordinator/sampling/audit tests passed.
- T-5: focused evidence/contract/coordinator tests passed.
- T-6: aggregate focused capacity matrix passed; later focused completeness and strict-gate additions also passed.
- T-7: designated evidence and evidence-recomputation tests passed; bounded audit passed.
- T-8: documentation and designated consistency tests passed.
- Full gate: final `just verify` passed and ended with the bounded BL-004 audit.

## Documentation Evidence

- `README.md`: adds paved capacity and audit commands, retained result, gate semantics, and diagnostic boundary.
- `docs/workbench-proof.md`: adds operational prerequisites, bounds, probe/workload, measurement method, schedules, records, completeness, gate/exit semantics, evidence interpretation, cleanup, cgroup context, observed result, and exclusions.
- `.harness/engineering-harness.md`: adds capacity signals/evidence and states that checks end with the short audit without rerunning the episode.
- `.prettierignore`: excludes immutable raw retained evidence from formatter mutation.
- API references/specifications: no impact; BL-004 adds no HTTP API.
- Configuration and migration guides: no impact; no product configuration, default, data, or migration contract changed.
- Architecture documentation: no contract change; implementation stays within the cited ADRs/core-components and keeps the accepted presentation decision unchanged.
- Deployment/runbooks: the affected operational runbook is `docs/workbench-proof.md`; no deployed runtime procedure changed.

Implementation evidence is recorded for Verify. Final acceptance remains owned by Verify.
