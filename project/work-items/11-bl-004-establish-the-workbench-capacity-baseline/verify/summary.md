# Verification Summary: Issue #11

- Work item: project/work-items/11-bl-004-establish-the-workbench-capacity-baseline
- Branch: feat/11-establish-workbench-capacity-baseline
- Implementation commit: 8f475be30729b963a264dd8ae27dada3dd5a734b
- Base commit: f705ce38a22e820412050eda31972798724be39f
- Pull request: https://github.com/jsburckhardt/ascend/pull/12
- Status: Accepted

## Handoff and Diff Review

The exact branch and implementation commit matched the Implement handoff with a clean tree. The complete branch diff was reviewed against the action plan, task breakdown, test plan, accepted ADRs, and applicable core-component contracts. Scope and architecture passed. All four implementation commits use Conventional Commit subjects and include the required Co-authored-by trailer.

The handoff commit adds only controlled deadline-after-start cleanup, post-start listener-attribution failure, and failed evidence-rendering tests plus implementation evidence updates. It changes no application behavior or coverage threshold.

## Acceptance Decisions

| ID | Status | Evidence |
|---|---|---|
| AC-1 | Passed | Fixed prerequisite contract, 1,200,000 ms deadline, one run ID, and zero-start specific failure controls. |
| AC-2 | Passed | Exact ordered 1/3/5/10 coordination and synthesized unstarted records are asserted. |
| AC-3 | Passed | Serial 30,000 ms starts, terminal states, and ordinary-failure continuation are asserted. |
| AC-4 | Passed | Fixed 1,000 ms probe schedule, first-failure latch, global stop, and cleanup are covered. |
| AC-5 | Passed | Five idle offsets, monotonic anchoring, explicit misses, and 5,000 ms boundary are covered. |
| AC-6 | Passed | One 7,000 ms workload, 10,000 ms bound, shared 4,096-byte cap, and complete results are covered. |
| AC-7 | Passed | Post-start active anchor, workload overlap, early exit, misses, and zero-ready positions are covered. |
| AC-8 | Passed | Required process-tree and host fields and documented Linux /proc formulas are retained and tested. |
| AC-9 | Passed | Designated run 853037e6-5dab-43cf-bcf8-61f1e8bbdb18 has complete, reproducible raw and comparison evidence. |
| AC-10 | Passed | Validators accept explicit findings and reject each omitted completeness boundary. |
| AC-11 | Passed | Exact attributed PID/listener cleanup, unrelated survival, and fixture equality are tested and audited. |
| AC-12 | Passed | One-member cohort remains non-gating plumbing. |
| AC-13 | Passed | Strict three-member gate matrix is covered and the designated 3/3 gate passed. |
| AC-14 | Passed | Five/ten failures remain findings without changing the frozen three-member gate. |
| AC-15 | Passed | Every specified nonzero condition is independently controlled and asserted. |
| AC-16 | Passed | Typed attributable failures preserve evidence and never become success-shaped. |
| AC-17 | Passed | Concurrent/stale guard rejection, mixed-ID rejection, and guard lifetime are covered. |
| AC-18 | Passed | The finite positive/negative matrix includes the three meaningful coverage follow-up paths and clean cleanup evidence. |
| AC-19 | Passed | Designated evidence contains all cohorts, 19/19 ready workloads, passing gate/disposition, and clean audit. |
| AC-20 | Passed | README, runbook, and harness documentation match constants, evidence, semantics, and exclusions. |
| AC-21 | Passed | Independent full gate exited zero and ended with a clean bounded audit. |

## Documentation Review

Passed. README usage, the BL-004 operational runbook, and harness discovery/evidence inventory match committed behavior and retained evidence. No HTTP API, product configuration, migration, architecture decision, or deployment contract changed; separate updates in those categories are not applicable. The diagnostic does not claim scheduling, quotas, sleep policy, multi-host support, BL-010, BL-013, or a presentation change.

## Validation Results

- just verify: passed independently at implementation commit 8f475be30729b963a264dd8ae27dada3dd5a734b.
- API: 25 files, 148 tests passed; 932/1,157 branches covered (80.553%).
- Web: 1 test passed with 100% coverage.
- Build: API and web passed.
- Playwright: 3 passed, 1 designated presentation scenario skipped.
- Final capacity audit: passed; 3 retained runs, active guard absent, attributed resources absent, and fixture integrity unchanged.
- Final pre-summary tree audit: clean.

## Shipping

The verified branch was pushed, pull request #12 was opened, and all 21 GitHub acceptance checkboxes were checked only after every criterion passed.
