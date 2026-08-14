# Test Plan: BL-015 Measure MVP navigation and startup performance

## Test V-1: Measurement contract, immutable plan, prerequisites, and guard

- **Type:** Unit / contract
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-2, AC-4, AC-6, AC-7, AC-14, AC-16, AC-19
- **Priority:** Critical

### Setup
Use deterministic clocks, filesystem fixtures, prerequisite adapters, and active/stale guard fixtures; do not start real workbenches.

### Steps
1. Validate the exact section/project orders, counts, targets, bounds, event definitions, and plan hash.
2. Execute each prerequisite failure and assert a specific nonzero result with zero attempts.
3. Mutate plan/order/hash after the first attempt boundary and assert rejection.
4. Exercise concurrent, stale, interrupted, and cleaned-stale guard paths.

### Expected Result
Only a complete immutable plan is accepted; all prerequisite and ownership failures are bounded, retained, nonzero, and leave controls unchanged.

### Expected Evidence
Contract test report, plan fixture/hash, prerequisite failure rows, and guard/interruption audit.

## Test V-2: Statistics, formulas, metrics, and disposition

- **Type:** Unit / property table
- **Task:** T-2
- **Acceptance Criteria:** AC-7, AC-12, AC-13, AC-14, AC-15, AC-17, AC-20, AC-22
- **Priority:** Critical

### Setup
Build integer-nanosecond attempt fixtures for success, timeout, non-timeout failure, pre-start failure, identity change, and approvals.

### Steps
1. Verify conventional odd/even median and three-decimal presentation rounding.
2. Verify nearest-rank p95 for n=5 and n=10 equals maximum.
3. Include timeout bounds; exclude non-timeout and pre-start failures from statistics while counting misses.
4. Recompute Metrics 2–4, NFRs, met/blocker/miss-accepted, and overall disposition.
5. Reject source, formula, threshold, timestamp, hash, approval, and disposition mutations.

### Expected Result
All formula outputs and source IDs match independently calculated values; every invalid disposition is rejected.

### Expected Evidence
Finite formula table, source-ID ledger, approval fixtures, and disposition mutation results.

## Test V-3: Cold and warm monotonic controller matrix

- **Type:** Integration / controlled browser
- **Task:** T-3
- **Acceptance Criteria:** AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-15, AC-18
- **Priority:** Critical

### Setup
Use controlled runtime, browser-event, artifact, and clock adapters with the real controller state machine; reserve real Chromium for V-9.

### Steps
1. Run five cold slots and ten warm slots in exact order.
2. Observe activation then each phase and usable consequence from one controller clock.
3. Exercise timeout, non-timeout, pre-start, artifact, cleanup, and reuse failures without retry.
4. Mutate cold prewarm/cache and warm PID/start/port/Home/stop behavior.
5. Confirm rows remain in attempt order while statistical IDs sort separately.

### Expected Result
Positive attempts contain complete ordered phases and identity/cache evidence; each controlled violation remains attributable and invalidates the metric.

### Expected Evidence
Controller matrix, attempt fixtures, partial-phase records, and identity/cleanup mutation ledger.

## Test V-4: Artifacts, disclosure, failure retention, and boundary cleanup

- **Type:** Integration / security
- **Task:** T-3, T-6
- **Acceptance Criteria:** AC-8, AC-9, AC-15, AC-16, AC-17, AC-18
- **Priority:** Critical

### Setup
Generate representative screenshots, trace archives, network ledgers, public manifests, restricted joins, and exact owned-resource audits.

### Steps
1. Retain bounded artifacts for successful, failed, timed-out, and pre-start attempts.
2. Scan public files, archive entries, logs, URLs, and process metadata for protected values.
3. Validate the one safe-ID join to a regular owner-readable mode-0600 restricted file.
4. Fail unavailable/missing capture explicitly.
5. Audit cold absence, warm expected identity, and section/final cleanup while controls survive.

### Expected Result
No public protected value is found; every artifact and cleanup state is explicit and every controlled leak or omission is rejected.

### Expected Evidence
Artifact manifest, archive/public scans, restricted-file mode check, failure fixtures, and residual audits.

## Test V-5: Three exact BL-014 continuity runs

- **Type:** Integration / browser contract
- **Task:** T-4
- **Acceptance Criteria:** AC-10, AC-18, AC-19, AC-21
- **Priority:** Critical

### Setup
Reuse the BL-014 constants and deterministic sequence helpers with three fresh execution and resource owners.

### Steps
1. Assert constant parity for fixtures, initial order, transitions, workflows, state checks, and resource classes.
2. Execute three complete no-retry runs.
3. Retain project terminal/editor/runtime identity joins and classify crossing/loss/unsupported association.
4. Calculate successes divided by three.
5. Clean and audit each run before the next.

### Expected Result
Exactly three isolated complete sequence records determine Metric 2; no retry, cross-run join, omitted loss, or residual is accepted.

### Expected Evidence
Three continuity records, parity assertion, Metric 2 inputs, and per-run residual audits.

## Test V-6: Integrated capacity compatibility and BL-004 delta

- **Type:** Integration / host-method contract
- **Task:** T-5
- **Acceptance Criteria:** AC-11, AC-16, AC-17, AC-18, AC-21
- **Priority:** Critical

### Setup
Use controlled integrated runtimes plus exact BL-004 sampling/workload exports and the retained baseline hash; run real cohorts in V-9.

### Steps
1. Assert exact probe, offsets, workload, units, readiness, and completeness parity.
2. Run controlled 3/5/10 cohorts with distinct byte-identical fixture copies.
3. Exercise partial starts, workload/sample/probe failures, baseline absence, fixture drift, and cleanup leakage.
4. Verify only cohort 3 gates and 5/10 remain findings.
5. Recompute deltas and reject missing or false comparability classifications.

### Expected Result
The capacity validator accepts only complete attributable integrated records and an explicit method-aware BL-004 comparison.

### Expected Evidence
Compatibility manifest, controlled raw samples/workloads, gate/findings table, delta matrix, and cleanup fixtures.

## Test V-7: Complete evidence mutation matrix

- **Type:** Unit / validator
- **Task:** T-7
- **Acceptance Criteria:** AC-2, AC-7, AC-9, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-22
- **Priority:** Critical

### Setup
Start with one complete generated positive fixture and clone it once per isolated mutation.

### Steps
Reject missing/duplicate/order/retry, assigned/mixed-clock timing, plan/threshold substitution, cold/warm identity violations, omitted failure, timeout-bound errors, non-timeout inclusion, pre-start duration, missing artifact, unsafe disclosure, median/p95/source mismatch, invalid/autonomous approval, wrong overall disposition, incomparable capacity, and cleanup leakage. Include interruption, source-hash, and post-run plan mutations.

### Expected Result
The positive fixture passes and every named mutation returns a stable nonzero invalid-evidence classification.

### Expected Evidence
Versioned mutation ledger with fixture ID, mutation, expected class, observed class, and exit result.

## Test V-8: Concurrent invocation, interruption, and union residual audit

- **Type:** Integration / lifecycle
- **Task:** T-1, T-6
- **Acceptance Criteria:** AC-1, AC-15, AC-18, AC-19
- **Priority:** Critical

### Setup
Use exact PID/start/listener/file owners, barriers, an unrelated control listener, and simulated controller termination.

### Steps
1. Race two invocations and assert no interleaving, overwrite, or combined IDs.
2. Interrupt at pre-start and each section family; retain completed and partial records.
3. Reject stale ownership until exact cleanup and absence audit pass.
4. Verify cold, warm, continuity, capacity, section, and final boundary outcomes.
5. Keep pre-existing and control resources unchanged until separate cleanup.

### Expected Result
All owned resources are measured absent or exactly reused, interrupted evidence remains unique, and unrelated resources survive.

### Expected Evidence
Concurrency envelopes, interruption artifacts, stale-owner audit, union residual report, and control identity proof.

## Test V-9: Designated serial no-retry measurement

- **Type:** System / designated host
- **Task:** T-9
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-18, AC-21, AC-22, AC-23
- **Priority:** Critical

### Setup
Use the repository-documented Ubuntu designated host after V-1 through V-8 pass. Acquire one run guard and do not invoke Playwright retry.

### Steps
1. Run `just measure-mvp-performance` once.
2. Confirm plan precedes all attempts and order is cold5, warm10, continuity3, capacity3/5/10.
3. Validate all attempt, artifact, identity, continuity, capacity, summary, disposition, and cleanup records.
4. Run independent recomputation against raw evidence.
5. Record observed results and BL-004 deltas without changing targets.

### Expected Result
One bounded run retains every planned record and truthful met/blocker/miss-accepted outcomes, then ends with a complete residual audit.

### Expected Evidence
Content-addressed designated run, public/restricted manifests, summary, comparison, recomputation, and final audit.

## Test V-10: Documentation, regression gates, and authoritative full validation

- **Type:** Documentation / regression / full
- **Task:** T-8, T-10
- **Acceptance Criteria:** AC-20, AC-22, AC-23, AC-24
- **Priority:** Critical

### Setup
Use the implementation revision after the designated evidence and observed runbook values are retained.

### Steps
1. Run documentation/command contract tests and verify long-measurement non-duplication.
2. Run BL-004 audit and BL-010, BL-011, BL-012, BL-013, and BL-014 root gates; fail missing recipes.
3. Run focused BL-015 validators and independent recomputation.
4. Run `just verify` and the BL-015 residual audit.
5. Confirm generated evidence is preserved and tracked source remains clean after validation.

### Expected Result
All required gates pass, recomputation matches, docs match constants/results, and ordinary validation never duplicates the designated measurement.

### Expected Evidence
Recipe ledger, docs contract output, full-validation summary, recomputation report, residual audit, and tree status.

## Acceptance Coverage Check

All AC-1 through AC-24 appear in at least one test above. V-9 is the only long designated measurement; V-10 proves ordinary full validation does not invoke it.
