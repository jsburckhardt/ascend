# Implementation Notes: BL-004 Workbench Capacity Baseline

## Scope

This correction resolves the defects returned against commit 29707d3 and the later AC-21 branch-coverage return while remaining inside the accepted direct-host diagnostic architecture. The coverage follow-up adds only meaningful deadline-after-start cleanup, post-start listener-attribution failure, and failed evidence-rendering controls; it does not weaken thresholds, exclude files, or change runtime behavior. It does not add product scheduling, quotas, sleep policy, multi-host behavior, BL-010 or BL-013 outcomes, or change the browser presentation decision.

## Completed Tasks

- T-1: replaced detached deadline races with one cooperative AbortSignal and guard-held command finalization.
- T-2: retained failed-start, process-tree, and listener identities and made inspection failures explicit.
- T-3: propagated cancellation through probe, scheduled sleeps, workload spawn/run/finish, and exact workload cleanup.
- T-4: cleaned and audited all started/discovered members, retained cleanup failures, and added a run-wide final audit.
- T-5: retained honest timeout/partial evidence and split host/tree comparison completeness with missing reasons.
- T-6: added controlled spawn, early exit, attribution, stop/audit, cancellation, guard-lifetime, partial-evidence, no-background-work, deadline-after-start cleanup, post-start listener-attribution failure, and failed evidence-rendering tests.
- T-7: retained fresh designated run 853037e6-5dab-43cf-bcf8-61f1e8bbdb18.
- T-8: aligned README, runbook, harness inventory, task claims, consistency tests, and the final bounded audit.

## Acceptance Evidence

- **AC-1:** The CLI creates one 1,200,000 ms AbortController before guard acquisition, passes its signal through prerequisites and coordination, retains one run ID, and keeps prerequisite/fixture/isolation-specific nonzero paths with zero starts.
- **AC-2:** Coordinator controls and fresh evidence retain exact cohort order 1/3/5/10; later slots become explicit unstarted records after safety or unsafe cleanup stops.
- **AC-3:** Starts remain sequential with the 30,000 ms override. Ordinary failures continue; failed started slots retain runtime/PID/start/URL metadata when discovered.
- **AC-4:** The fixed /usr/bin/true 1,000 ms probe receives the shared abort signal at pre-cohort, scheduled, and post-cleanup boundaries; failures latch one safety reason.
- **AC-5:** Sampling controls retain exact five-position idle schedules, target/actual monotonic times, explicit misses/cancellation, and the normal anchor-plus-5,000 ms end.
- **AC-6:** Workload controls prove identical seven-second commands, ten-second bounds, one 4,096-byte combined stream cap, spawn/nonzero/timeout/overflow/cancelled results, and PID/start identity retention.
- **AC-7:** Active sampling anchors after every permitted workload start attempt, requires overlap, and retains five explicit zero-ready or cancellation absences.
- **AC-8:** Raw evidence retains Linux /proc host and process-tree fields/formulas; inspection and listener-attribution failures are explicit rather than success-shaped.
- **AC-9:** Fresh run 853037e6-5dab-43cf-bcf8-61f1e8bbdb18 contains run.json, samples.json, workloads.json, and comparison.md with one run ID, all slot identities, separate host/tree completeness, missing reasons, summaries, findings, gate, and disposition.
- **AC-10:** Structural validation accepts explicit incomplete cleanup only with details and a failed cohort, rejects omitted positions/results/audits, and requires a represented final cleanup audit.
- **AC-11:** Cohort cleanup covers every started/discovered failed or ready member plus workload identities; the run-wide final audit covers their union. Exact PID/start and listener inode/owner/port checks leave unrelated resources untouched.
- **AC-12:** One-member evidence remains plumbing with not-applicable gate status.
- **AC-13:** The fresh three-member cohort has 3/3 ready, distinct root/listener-owner PIDs and ports, 3/3 workloads, complete 10/0 host and 30/0 tree positions, passed probes/cleanup/integrity, and gate passed.
- **AC-14:** Controlled five/ten failures remain findings and do not rewrite the frozen three-member decision.
- **AC-15:** Timeout, incomplete cohort, cleanup/integrity/final-audit failure, gate failure, and evidence failure remain independently nonzero; timeout evidence retains overall-timeout and partialEvidenceRetained.
- **AC-16:** Spawn/early-exit, start inspection, listener attribution, scheduled inspection, stop, identity cleanup, and audit controls preserve prior evidence and produce failed states, findings, or cleanup details.
- **AC-17:** Exclusive ownership remains before starts; the deadline guard-lifetime test proves release occurs only after stopped coordination and evidence retention. Final audit reports the guard absent across three immutable runs.
- **AC-18:** The focused suite covers the named positive/negative matrix, including cooperative cancellation during and immediately after start, sample/workload cancellation, post-start listener-attribution failure, strict in-flight cleanup, guard held through completion, honest partial evidence, failed comparison evidence, and no delayed background mutation after return.
- **AC-19:** The fresh paved run completed all four cohorts in about 73 seconds: 19/19 ready, 19/19 workloads passed, host counts 10/0 each, tree counts 10/0, 30/0, 50/0, and 100/0, no missing reasons/findings, passing gate/disposition, and passing post-run audit.
- **AC-20:** README.md, docs/workbench-proof.md, and .harness/engineering-harness.md document cooperative cancellation, guard lifetime, failed identity retention, all-identity cleanup, failure semantics, split completeness counts, fresh run identity/results, and diagnostic-only exclusions.
- **AC-21:** The first post-return canonical full gate passes formatting, lint, strict type checks, 148 API tests with 931/1,157 API branches covered (80.46672428694902%; Vitest display 80.46%), web tests at 100% coverage, builds, three passing/one skipped Playwright scenarios, and a final audit with three retained runs, no active guard, no attributed resource, and unchanged fixture integrity.

## Fresh Designated Baseline

| Cohort | Ready | Failed | Unstarted | Workloads pass/fail | Host retained/absent | Trees retained/absent | Minimum available KiB | Gate |
|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 1 | 0 | 0 | 1/0 | 10/0 | 10/0 | 19,103,172 | not-applicable |
| 3 | 3 | 0 | 0 | 3/0 | 10/0 | 30/0 | 18,952,508 | passed |
| 5 | 5 | 0 | 0 | 5/0 | 10/0 | 50/0 | 18,602,712 | not-applicable |
| 10 | 10 | 0 | 0 | 10/0 | 10/0 | 100/0 | 18,467,380 | not-applicable |

The retained run reports no missing reasons or findings and finalCleanup complete/passed with process, listener, and workload identities absent.

## Validation Evidence

- Focused: just verify-focused for the coordinator and evidence test files passed 26 tests in two files after the coverage controls were added and again after formatting correction.
- Designated: just proof-workbench-capacity retained run 853037e6-5dab-43cf-bcf8-61f1e8bbdb18 with passing gate and disposition.
- Audit: just proof-workbench-capacity-audit passed with retainedRuns 3, activeGuardAbsent true, attributedResourcesAbsent true, and fixtureIntegrityUnchanged true.
- Full: the first post-return just verify passed all configured stages with 148 API tests, 931/1,157 API branches covered (80.46672428694902%; Vitest display 80.46%), three passing/one skipped Playwright scenarios, and the passing BL-004 audit. A repeat full run is part of the final handoff evidence.

## Documentation Evidence

- README.md: user-facing cancellation, guard, cleanup, comparison, audit, and observed baseline behavior.
- docs/workbench-proof.md: operational prerequisites, cancellation/deadline procedure, sampling/workload rules, partial evidence, all-identity cleanup, failure semantics, and fresh results.
- .harness/engineering-harness.md: governed checks/evidence inventory points to the fresh run and all-identity final audit.
- Task breakdown: no status change; all dependency-ordered tasks remain Complete and the implementation note records the additional AC-21 controls.
- README, API references/specifications, configuration, usage, migration, architecture, and operational documentation: no follow-up impact; these are test-only additions for already documented cancellation, cleanup, and evidence behavior, with no setup, contract, default, workflow, runtime procedure, or user-facing capability change.

Implementation evidence is recorded for Verify. Final acceptance remains owned by Verify.
