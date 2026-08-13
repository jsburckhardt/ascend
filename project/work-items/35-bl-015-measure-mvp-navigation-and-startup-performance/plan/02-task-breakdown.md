# Task Breakdown: BL-015 Measure MVP navigation and startup performance

## Task T-1: Freeze the measurement plan, prerequisites, and exclusive ownership

- **Status:** Complete
- **Complexity:** Large
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-4, AC-6, AC-16, AC-19
- **Related ADRs:** ADR-260808-governed-engineering-harness; ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260806-rpiv-stage-contract; CORE-COMPONENT-260808-engineering-harness-delivery-contract; CORE-COMPONENT-260808-host-process-environment

### Description
Implement the BL-015 issue-scoped constants and schema. Atomically retain `plan.json` and its hash before any attempt timestamp. Reuse the BL-004 designated host checks, add fixture/baseline/Node/Chromium/browser-artifact checks, record load and memory without inventing eligibility thresholds, and own one mode-0600 active-run guard with stale-owner absence cleanup.

### Acceptance Criteria
- AC-1: One paved command checks and records the repository-documented designated-host prerequisites before any attempt, returns a prerequisite-specific nonzero result with zero attempts when they are not met, and otherwise runs one plan in this exact order: five cold-start attempts, ten warm-reconnect attempts, three three-project continuity runs, and fresh capacity cohorts of 3, 5, and 10. The command has a documented finite overall bound, performs no automatic retries, and retains every planned attempt or cohort record.
- AC-2: The retained measurement plan declares the host, fixtures, workload, project and section order, counts, timeouts, cache and prewarm rules, event definitions, clock precision and units, formulas, targets, and failure/disposition rules before the first attempt timestamp. Validation proves that every result uses that same declaration without post-run substitution.
- AC-4: The immutable pre-run plan fixes the exact project sequence for all five cold-start attempts; evidence matches that sequence without substitution. The attempts use no hidden prewarming, record browser context and cache state, and prove all run-attributed runtime resources absent before the next attempt.
- AC-6: The warm run contains exactly ten attempts in project order `A/B/C/A/B/C/A/B/C/A`, returns to Home between attempts, and never stops or replaces a runtime.
- AC-16: Missing fixtures, missing prior BL-004 baseline evidence, no usable raw samples, unavailable required browser artifacts, or an invalid or missing approval record produces a specific prerequisite, evidence, or disposition failure; no assigned value, empty summary, or success-shaped fallback is accepted.
- AC-19: Concurrent invocation cannot interleave attempts, combine run IDs or overwrite retained evidence. Controller or host interruption retains completed and partial records; a later invocation cannot reuse or merge them, and stale active ownership is rejected unless exact cleanup and an absence audit complete. Each rejection is bounded, nonzero, and leaves unrelated resources unchanged.

### Test Coverage
V-1 contract/prerequisite tests and V-8 concurrency/interruption tests must prove zero-attempt prerequisite failures, immutable order, finite bounds, no retry, stale-owner rejection, and unrelated-resource survival.

### Expected Evidence
A hashed pre-run plan, prerequisite records, guard events, controlled prerequisite failures, and interruption/stale-owner audit fixtures.

## Task T-2: Implement monotonic calculations and release disposition

- **Status:** Complete
- **Complexity:** Large
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-7, AC-12, AC-13, AC-14, AC-15, AC-17, AC-20, AC-22
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards; CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Create pure functions for phase derivation, conventional median, nearest-rank p95, maximum, failure/miss counting, Product Metrics 2–4, NFR results, approval validation, and overall disposition. Preserve ordered rows and separately retain sorted source IDs. Keep integer nanoseconds authoritative and thresholds immutable.

### Acceptance Criteria
- AC-7: All phase and total measurements use monotonic timestamps from one controller. Browser and server events are correlated through controller-observed events rather than by mixing wall clocks. Retained attempt rows and any observed success or failure totals remain in attempt order only; statistics numerically sort and use only each successful attempt’s measured total and each timed-out attempt’s configured timeout bound. A non-timeout failed attempt may retain its observed total in attempt order but does not enter median, p95, or maximum; it is counted separately as a failure and target miss. A pre-start failure has no fabricated duration and is counted separately as a failure and target miss. Median is the conventional median of the numerically sorted durations, averaging the two middle values for an even count. p95 is the nearest-rank value at `ceil(0.95 * n)` over that same complete statistical set of successful measured totals plus timed-out configured bounds; `n` is the count of that set, and for `n = 5` and `n = 10`, p95 is the maximum duration. Timestamp unit and precision, duration rounding, and these median/p95 formulas are predeclared and have finite calculation tests.
- AC-12: A retained machine-readable summary reports cold median, p95, maximum, failures (including pre-start failures), and target misses; warm median, p95, maximum, failures, identity-changes, and target misses; continuity successes from 0 through 3; capacity 3/5/10 readiness, workload, resource, and cleanup results; Product Metric 2 as continuity passed runs divided by three; Product Metric 3 as the declared warm-navigation statistics against 2,000 milliseconds; and Product Metric 4 as the declared cold-start statistics against 15,000 milliseconds. Every formula, duration source, and source attempt ID is machine-validated.
- AC-13: Cold NFR-002/Metric 4 is `met` only if exactly five attempts exist, there are zero failures including zero pre-start failures, and p95 is no more than 15,000 milliseconds. Warm NFR-001/Metric 3 is `met` only if exactly ten attempts exist, there are zero failures, all runtime identities remain unchanged, and p95 is no more than 2,000 milliseconds. Because p95 is the maximum for these counts, every timed attempt must be within the applicable target. Continuity Metric 2 is `met` only if exactly 3/3 runs pass with no state crossing or loss. Capacity NFR-003 is `met` only if the three-project gate passes completely; the 5 and 10 cohorts remain findings. Any required metric not `met` defaults to `blocker`.
- AC-14: `miss-accepted` cannot be chosen autonomously and is valid only with an explicit retained approval record created after measurement that names the approver, reason, risk, follow-up backlog ID, and the exact retained evidence hash. Without that record, the metric remains `blocker`. The overall release disposition is `blocker` if any required metric is `blocker`; otherwise it is `met`, with any valid `miss-accepted` metric counting as nonblocking. The exact failed target and disposition source are retained, and no threshold change is accepted.
- AC-15: A cold or warm failure, timeout, or artifact-capture failure retains all observed partial phases, any observed total, a declared finite failure classification, artifact status, and cleanup or reuse audit. A timeout contributes its configured timeout bound as its statistical total. A non-timeout failed attempt retains any observed total but excludes it from median, p95, and maximum and counts separately as a failure and target miss. A pre-start failure has no fabricated duration and counts separately as a failure and target miss. No failed or timed-out attempt is discarded or automatically retried.
- AC-17: The evidence validator rejects assigned or synthetic timings, missing or duplicate attempts, altered order, retries, mixed clocks, post-run plan changes, prewarmed cold identity, changed warm identity, omitted failures, incomplete cleanup, formula or source-ID mismatches, threshold substitution, an invalid missing or autonomously created `miss-accepted` record, unsafe public evidence, and capacity comparisons made with unlike methods.
- AC-20: Finite repository validation accepts one complete positive evidence set and rejects one controlled mutation for each named invalid class: missing/duplicate/order/retry, assigned or mixed-clock timing, plan or threshold substitution, cold/warm identity violation, omitted failure, timeout-bound, non-timeout failure inclusion, or pre-start duration violation, missing artifact, unsafe disclosure, median or nearest-rank p95 formula/source mismatch, invalid or autonomous approval, incorrect overall disposition, incomparable capacity method, and cleanup leakage. Formula cases include even-count median and nearest-rank p95 for n = 5 and n=10. Each rejection has an inspectable nonzero or invalid-evidence classification.
- AC-22: Independent recomputation from retained plan, attempt IDs, and raw samples exactly matches all phase totals, numerically sorted median/p95/maximum values, timeout-bound inclusion and non-timeout failure exclusion, failure and miss counts, continuity result, capacity table, Product Metric 2–4 values, per-metric dispositions, and overall release disposition.

### Test Coverage
V-2 and V-7 must cover odd/even median, n=5/n=10 nearest-rank p95, timeout inclusion, non-timeout and pre-start exclusion, rounding, source joins, met/blocker/miss-accepted, invalid approval, and threshold/overall-disposition mutations.

### Expected Evidence
Deterministic formula fixtures and recomputation JSON naming every source attempt and exact failed target.

## Task T-3: Build controller-observed cold and warm measurement attempts

- **Status:** Complete
- **Complexity:** Extra Large
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-3, AC-4, AC-5, AC-6, AC-8, AC-9, AC-15, AC-18
- **Related ADRs:** ADR-260810-full-page-browser-workbench-presentation; ADR-260812-browser-navigation-shell; ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Add a serial Playwright controller for cold A/B/C/A/B and warm A/B/C/A/B/C/A/B/C/A. Timestamp immediately before keyboard activation; observe lifecycle receipt, health, stable document, Explorer sentinel, terminal prompt, and usable completion from one `hrtime.bigint` controller. Enforce cold cache/absence and warm health/identity/Home-return rules. Capture bounded screenshot, trace chunk, safe network ledger, partial failure, and cleanup/reuse evidence per attempt.

### Acceptance Criteria
- AC-3: Each cold-start attempt measures from the controller-observed keyboard/user Open activation through separately defined runtime launch/readiness and stable-route document-readiness consequences to a workbench-usable consequence requiring both the expected Explorer sentinel and a ready terminal prompt. Each named consequence has a predeclared controller-observable event. Evidence retains every phase timestamp and duration plus total duration, and compares the required cold statistics with the unchanged 15,000 millisecond NFR-002 and Metric 4 target.
- AC-4: The immutable pre-run plan fixes the exact project sequence for all five cold-start attempts; evidence matches that sequence without substitution. The attempts use no hidden prewarming, record browser context and cache state, and prove all run-attributed runtime resources absent before the next attempt.
- AC-5: Each warm-reconnect attempt begins only after the existing health and readiness checks pass for a running runtime and measures from the controller-observed Open activation to the same workbench-usable consequence. Runtime PID, process-start identity, and port token remain unchanged. Evidence retains every phase and total and compares the required warm statistics with the unchanged 2,000 millisecond NFR-001 and Metric 3 target.
- AC-6: The warm run contains exactly ten attempts in project order `A/B/C/A/B/C/A/B/C/A`, returns to Home between attempts, and never stops or replaces a runtime.
- AC-8: Every cold and warm attempt records host and cgroup specifications, current pre-attempt load and memory in declared units, code-server/Chromium/Node versions, run/attempt/project IDs, runtime PID/start/port token, stable URL, browser context and cache state, phase timings, success or failure, screenshot/trace/network evidence from activation through cleanup or reuse, and cleanup or reuse result. Capture bounds are declared; unavailable or failed capture is retained as an explicit evidence failure rather than omitted.
- AC-9: Public artifacts, logs, screenshots, traces, network records, URLs, and process metadata expose no internal authority, internal port, canonical path, credential, or secret. Exact authority correlation is retained only in access-restricted, non-public storage, and public/restricted records remain unambiguously joined by safe identifiers.
- AC-15: A cold or warm failure, timeout, or artifact-capture failure retains all observed partial phases, any observed total, a declared finite failure classification, artifact status, and cleanup or reuse audit. A timeout contributes its configured timeout bound as its statistical total. A non-timeout failed attempt retains any observed total but excludes it from median, p95, and maximum and counts separately as a failure and target miss. A pre-start failure has no fabricated duration and counts separately as a failure and target miss. No failed or timed-out attempt is discarded or automatically retried.
- AC-18: Cleanup and reuse audits operate only on exact run-attributed resources and apply explicit boundary outcomes: after each cold attempt, its runtime and transient resources are absent; after each warm attempt, no duplicate or transient run-attributed resource remains while the expected healthy runtime identity and listener remain unchanged; after each continuity run, its owned resources are absent; after every section and the final run, all section-owned browser/process groups, proxy sockets, runtime PIDs/listeners, terminal commands, API/web services, databases, and fixtures are absent. Residual audits report measured zero where absence is required and exact expected identity counts where warm reuse is required, while pre-existing resources and an unrelated control listener survive unchanged until separate cleanup.

### Test Coverage
V-3 fake/controller tests and V-4 browser/artifact tests must cover all phases, identity rules, orders, cache/prewarm declarations, timeouts, capture failure, partial phases, no retry, public scans, and boundary audits.

### Expected Evidence
Five cold and ten warm attempt records plus per-attempt artifact manifests and exact cleanup/reuse audits.

## Task T-4: Repeat the exact BL-014 continuity proof three times

- **Status:** Complete
- **Complexity:** Extra Large
- **Dependencies:** T-1, T-3
- **Acceptance Criteria:** AC-9, AC-10, AC-18, AC-19, AC-21
- **Related ADRs:** ADR-260812-browser-navigation-shell; ADR-260812-in-process-workbench-reverse-proxy; ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260810-sqlite-persistence-lifecycle

### Description
Extract or invoke the existing BL-014 fixture and sequence runner without changing its B/C/A starts, 24 transitions, 14 workflows, state association, monotonic observations, or cleanup classes. Execute three fresh run IDs in order, no retry, and classify any crossing, loss, or unsupported required association as a failed run.

### Acceptance Criteria
- AC-9: Public artifacts, logs, screenshots, traces, network records, URLs, and process metadata expose no internal authority, internal port, canonical path, credential, or secret. Exact authority correlation is retained only in access-restricted, non-public storage, and public/restricted records remain unambiguously joined by safe identifiers.
- AC-10: The three-project continuity section executes the exact merged BL-014 switching sequence three times without retry. Every run retains project-specific terminal, editor, and runtime identity evidence; Product Metric 2 is continuity passed runs divided by three; any state crossing or loss is retained as a failure; and run-attributed resources are cleaned after each run.
- AC-18: Cleanup and reuse audits operate only on exact run-attributed resources and apply explicit boundary outcomes: after each cold attempt, its runtime and transient resources are absent; after each warm attempt, no duplicate or transient run-attributed resource remains while the expected healthy runtime identity and listener remain unchanged; after each continuity run, its owned resources are absent; after every section and the final run, all section-owned browser/process groups, proxy sockets, runtime PIDs/listeners, terminal commands, API/web services, databases, and fixtures are absent. Residual audits report measured zero where absence is required and exact expected identity counts where warm reuse is required, while pre-existing resources and an unrelated control listener survive unchanged until separate cleanup.
- AC-19: Concurrent invocation cannot interleave attempts, combine run IDs or overwrite retained evidence. Controller or host interruption retains completed and partial records; a later invocation cannot reuse or merge them, and stale active ownership is rejected unless exact cleanup and an absence audit complete. Each rejection is bounded, nonzero, and leaves unrelated resources unchanged.
- AC-21: One no-retry execution on the repository-documented designated host produces all 5 cold, 10 warm, 3 continuity, and 3/5/10 capacity records in the declared order, retains raw and summarized evidence, reports every target comparison and disposition, and completes the final residual audit.

### Test Coverage
V-5 must assert constant parity with BL-014, exactly three complete runs, all state/identity/network joins, no retries, Metric 2 numerator 0 through 3, per-run cleanup, interruption retention, and no cross-run IDs.

### Expected Evidence
Three continuity artifacts with complete BL-014 joins, pass/fail reasons, Metric 2 inputs, and zero residual audits.

## Task T-5: Run integrated 3/5/10 capacity with typed BL-004 deltas

- **Status:** Complete
- **Complexity:** Extra Large
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-9, AC-11, AC-16, AC-18, AC-21
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-filesystem-path-safety; CORE-COMPONENT-260810-sqlite-persistence-lifecycle; CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Adapt the coordinator to fresh integrated-product cohorts only. Reuse BL-004 probe, offsets, workload, units, process-tree calculations, completeness, attribution, and cleanup. Register byte-identical disposable BL-001 copies for distinct runtimes, include shared product-service overhead separately, freeze the three-member gate, keep 5/10 as findings, and render a baseline delta table with comparability classifications.

### Acceptance Criteria
- AC-9: Public artifacts, logs, screenshots, traces, network records, URLs, and process metadata expose no internal authority, internal port, canonical path, credential, or secret. Exact authority correlation is retained only in access-restricted, non-public storage, and public/restricted records remain unambiguously joined by safe identifiers.
- AC-11: The capacity section runs fresh integrated-product cohorts of 3, 5, and 10 using the same documented fixtures, workload, sampling schedule, method, units, readiness rules, and completeness semantics as BL-004. The three-member cohort is the NFR-003 MVP gate and passes only with three ready distinct runtimes, successful workloads, complete required samples, passing responsiveness checks, and complete cleanup; the five- and ten-member cohorts remain findings. Every partial failure remains attributable. Raw samples and a comparison table are retained, the prior BL-004 baseline is linked for delta comparison, and unlike methods are never silently compared.
- AC-16: Missing fixtures, missing prior BL-004 baseline evidence, no usable raw samples, unavailable required browser artifacts, or an invalid or missing approval record produces a specific prerequisite, evidence, or disposition failure; no assigned value, empty summary, or success-shaped fallback is accepted.
- AC-18: Cleanup and reuse audits operate only on exact run-attributed resources and apply explicit boundary outcomes: after each cold attempt, its runtime and transient resources are absent; after each warm attempt, no duplicate or transient run-attributed resource remains while the expected healthy runtime identity and listener remain unchanged; after each continuity run, its owned resources are absent; after every section and the final run, all section-owned browser/process groups, proxy sockets, runtime PIDs/listeners, terminal commands, API/web services, databases, and fixtures are absent. Residual audits report measured zero where absence is required and exact expected identity counts where warm reuse is required, while pre-existing resources and an unrelated control listener survive unchanged until separate cleanup.
- AC-21: One no-retry execution on the repository-documented designated host produces all 5 cold, 10 warm, 3 continuity, and 3/5/10 capacity records in the declared order, retains raw and summarized evidence, reports every target comparison and disposition, and completes the final residual audit.

### Test Coverage
V-6 must prove exact reused constants/formulas, 3/5/10 order, 18 distinct integrated runtimes, complete samples/workloads, three-member gate semantics, findings, partial failure attribution, baseline prerequisite failure, method classification, fixture integrity, and cleanup.

### Expected Evidence
Raw integrated run/samples/workloads files, 3/5/10 comparison, baseline hash/link, typed deltas, and final capacity residual audit.

## Task T-6: Orchestrate atomic evidence, artifacts, and exact final cleanup

- **Status:** Complete
- **Complexity:** Extra Large
- **Dependencies:** T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-1, AC-2, AC-8, AC-9, AC-12, AC-13, AC-14, AC-16, AC-18, AC-19, AC-21
- **Related ADRs:** ADR-260808-governed-engineering-harness; ADR-260812-browser-navigation-shell; ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260808-engineering-harness-delivery-contract; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260810-sqlite-persistence-lifecycle; CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Implement one finite coordinator and CLI that executes sections in fixed order, writes every planned record atomically, retains interruption and partial results, hashes immutable raw evidence, applies optional external approval only after measurement, and emits summary/comparison/disposition. Inventory all section-owned browser, proxy, runtime, command, service, database, fixture, and evidence resources; preserve pre-existing controls.

### Acceptance Criteria
- AC-1: One paved command checks and records the repository-documented designated-host prerequisites before any attempt, returns a prerequisite-specific nonzero result with zero attempts when they are not met, and otherwise runs one plan in this exact order: five cold-start attempts, ten warm-reconnect attempts, three three-project continuity runs, and fresh capacity cohorts of 3, 5, and 10. The command has a documented finite overall bound, performs no automatic retries, and retains every planned attempt or cohort record.
- AC-2: The retained measurement plan declares the host, fixtures, workload, project and section order, counts, timeouts, cache and prewarm rules, event definitions, clock precision and units, formulas, targets, and failure/disposition rules before the first attempt timestamp. Validation proves that every result uses that same declaration without post-run substitution.
- AC-8: Every cold and warm attempt records host and cgroup specifications, current pre-attempt load and memory in declared units, code-server/Chromium/Node versions, run/attempt/project IDs, runtime PID/start/port token, stable URL, browser context and cache state, phase timings, success or failure, screenshot/trace/network evidence from activation through cleanup or reuse, and cleanup or reuse result. Capture bounds are declared; unavailable or failed capture is retained as an explicit evidence failure rather than omitted.
- AC-9: Public artifacts, logs, screenshots, traces, network records, URLs, and process metadata expose no internal authority, internal port, canonical path, credential, or secret. Exact authority correlation is retained only in access-restricted, non-public storage, and public/restricted records remain unambiguously joined by safe identifiers.
- AC-12: A retained machine-readable summary reports cold median, p95, maximum, failures (including pre-start failures), and target misses; warm median, p95, maximum, failures, identity-changes, and target misses; continuity successes from 0 through 3; capacity 3/5/10 readiness, workload, resource, and cleanup results; Product Metric 2 as continuity passed runs divided by three; Product Metric 3 as the declared warm-navigation statistics against 2,000 milliseconds; and Product Metric 4 as the declared cold-start statistics against 15,000 milliseconds. Every formula, duration source, and source attempt ID is machine-validated.
- AC-13: Cold NFR-002/Metric 4 is `met` only if exactly five attempts exist, there are zero failures including zero pre-start failures, and p95 is no more than 15,000 milliseconds. Warm NFR-001/Metric 3 is `met` only if exactly ten attempts exist, there are zero failures, all runtime identities remain unchanged, and p95 is no more than 2,000 milliseconds. Because p95 is the maximum for these counts, every timed attempt must be within the applicable target. Continuity Metric 2 is `met` only if exactly 3/3 runs pass with no state crossing or loss. Capacity NFR-003 is `met` only if the three-project gate passes completely; the 5 and 10 cohorts remain findings. Any required metric not `met` defaults to `blocker`.
- AC-14: `miss-accepted` cannot be chosen autonomously and is valid only with an explicit retained approval record created after measurement that names the approver, reason, risk, follow-up backlog ID, and the exact retained evidence hash. Without that record, the metric remains `blocker`. The overall release disposition is `blocker` if any required metric is `blocker`; otherwise it is `met`, with any valid `miss-accepted` metric counting as nonblocking. The exact failed target and disposition source are retained, and no threshold change is accepted.
- AC-16: Missing fixtures, missing prior BL-004 baseline evidence, no usable raw samples, unavailable required browser artifacts, or an invalid or missing approval record produces a specific prerequisite, evidence, or disposition failure; no assigned value, empty summary, or success-shaped fallback is accepted.
- AC-18: Cleanup and reuse audits operate only on exact run-attributed resources and apply explicit boundary outcomes: after each cold attempt, its runtime and transient resources are absent; after each warm attempt, no duplicate or transient run-attributed resource remains while the expected healthy runtime identity and listener remain unchanged; after each continuity run, its owned resources are absent; after every section and the final run, all section-owned browser/process groups, proxy sockets, runtime PIDs/listeners, terminal commands, API/web services, databases, and fixtures are absent. Residual audits report measured zero where absence is required and exact expected identity counts where warm reuse is required, while pre-existing resources and an unrelated control listener survive unchanged until separate cleanup.
- AC-19: Concurrent invocation cannot interleave attempts, combine run IDs or overwrite retained evidence. Controller or host interruption retains completed and partial records; a later invocation cannot reuse or merge them, and stale active ownership is rejected unless exact cleanup and an absence audit complete. Each rejection is bounded, nonzero, and leaves unrelated resources unchanged.
- AC-21: One no-retry execution on the repository-documented designated host produces all 5 cold, 10 warm, 3 continuity, and 3/5/10 capacity records in the declared order, retains raw and summarized evidence, reports every target comparison and disposition, and completes the final residual audit.

### Test Coverage
V-4, V-8, and V-9 must prove every artifact status, public/restricted join, no overwrite/merge, controller interruption, failure retention, exact section boundaries, final zero residuals, and output/exit envelopes.

### Expected Evidence
Complete run directory, artifact manifest and hash, partial/interruption fixtures, summary/comparison, restricted join, and union residual audit.

## Task T-7: Validate evidence and independently recompute every result

- **Status:** Complete
- **Complexity:** Extra Large
- **Dependencies:** T-2, T-6
- **Acceptance Criteria:** AC-2, AC-7, AC-9, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-22
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards; CORE-COMPONENT-260806-agent-executable-acceptance-criteria; CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Implement strict structural, semantic, privacy, formula, source-ID, order, clock, identity, method-comparability, approval, disposition, and cleanup validators. Add an independent recomputer that consumes only the retained plan/raw rows/samples and rejects every named mutation without using summary values as inputs.

### Acceptance Criteria
- AC-2: The retained measurement plan declares the host, fixtures, workload, project and section order, counts, timeouts, cache and prewarm rules, event definitions, clock precision and units, formulas, targets, and failure/disposition rules before the first attempt timestamp. Validation proves that every result uses that same declaration without post-run substitution.
- AC-7: All phase and total measurements use monotonic timestamps from one controller. Browser and server events are correlated through controller-observed events rather than by mixing wall clocks. Retained attempt rows and any observed success or failure totals remain in attempt order only; statistics numerically sort and use only each successful attempt’s measured total and each timed-out attempt’s configured timeout bound. A non-timeout failed attempt may retain its observed total in attempt order but does not enter median, p95, or maximum; it is counted separately as a failure and target miss. A pre-start failure has no fabricated duration and is counted separately as a failure and target miss. Median is the conventional median of the numerically sorted durations, averaging the two middle values for an even count. p95 is the nearest-rank value at `ceil(0.95 * n)` over that same complete statistical set of successful measured totals plus timed-out configured bounds; `n` is the count of that set, and for `n = 5` and `n = 10`, p95 is the maximum duration. Timestamp unit and precision, duration rounding, and these median/p95 formulas are predeclared and have finite calculation tests.
- AC-9: Public artifacts, logs, screenshots, traces, network records, URLs, and process metadata expose no internal authority, internal port, canonical path, credential, or secret. Exact authority correlation is retained only in access-restricted, non-public storage, and public/restricted records remain unambiguously joined by safe identifiers.
- AC-12: A retained machine-readable summary reports cold median, p95, maximum, failures (including pre-start failures), and target misses; warm median, p95, maximum, failures, identity-changes, and target misses; continuity successes from 0 through 3; capacity 3/5/10 readiness, workload, resource, and cleanup results; Product Metric 2 as continuity passed runs divided by three; Product Metric 3 as the declared warm-navigation statistics against 2,000 milliseconds; and Product Metric 4 as the declared cold-start statistics against 15,000 milliseconds. Every formula, duration source, and source attempt ID is machine-validated.
- AC-13: Cold NFR-002/Metric 4 is `met` only if exactly five attempts exist, there are zero failures including zero pre-start failures, and p95 is no more than 15,000 milliseconds. Warm NFR-001/Metric 3 is `met` only if exactly ten attempts exist, there are zero failures, all runtime identities remain unchanged, and p95 is no more than 2,000 milliseconds. Because p95 is the maximum for these counts, every timed attempt must be within the applicable target. Continuity Metric 2 is `met` only if exactly 3/3 runs pass with no state crossing or loss. Capacity NFR-003 is `met` only if the three-project gate passes completely; the 5 and 10 cohorts remain findings. Any required metric not `met` defaults to `blocker`.
- AC-14: `miss-accepted` cannot be chosen autonomously and is valid only with an explicit retained approval record created after measurement that names the approver, reason, risk, follow-up backlog ID, and the exact retained evidence hash. Without that record, the metric remains `blocker`. The overall release disposition is `blocker` if any required metric is `blocker`; otherwise it is `met`, with any valid `miss-accepted` metric counting as nonblocking. The exact failed target and disposition source are retained, and no threshold change is accepted.
- AC-15: A cold or warm failure, timeout, or artifact-capture failure retains all observed partial phases, any observed total, a declared finite failure classification, artifact status, and cleanup or reuse audit. A timeout contributes its configured timeout bound as its statistical total. A non-timeout failed attempt retains any observed total but excludes it from median, p95, and maximum and counts separately as a failure and target miss. A pre-start failure has no fabricated duration and counts separately as a failure and target miss. No failed or timed-out attempt is discarded or automatically retried.
- AC-16: Missing fixtures, missing prior BL-004 baseline evidence, no usable raw samples, unavailable required browser artifacts, or an invalid or missing approval record produces a specific prerequisite, evidence, or disposition failure; no assigned value, empty summary, or success-shaped fallback is accepted.
- AC-17: The evidence validator rejects assigned or synthetic timings, missing or duplicate attempts, altered order, retries, mixed clocks, post-run plan changes, prewarmed cold identity, changed warm identity, omitted failures, incomplete cleanup, formula or source-ID mismatches, threshold substitution, an invalid missing or autonomously created `miss-accepted` record, unsafe public evidence, and capacity comparisons made with unlike methods.
- AC-18: Cleanup and reuse audits operate only on exact run-attributed resources and apply explicit boundary outcomes: after each cold attempt, its runtime and transient resources are absent; after each warm attempt, no duplicate or transient run-attributed resource remains while the expected healthy runtime identity and listener remain unchanged; after each continuity run, its owned resources are absent; after every section and the final run, all section-owned browser/process groups, proxy sockets, runtime PIDs/listeners, terminal commands, API/web services, databases, and fixtures are absent. Residual audits report measured zero where absence is required and exact expected identity counts where warm reuse is required, while pre-existing resources and an unrelated control listener survive unchanged until separate cleanup.
- AC-19: Concurrent invocation cannot interleave attempts, combine run IDs or overwrite retained evidence. Controller or host interruption retains completed and partial records; a later invocation cannot reuse or merge them, and stale active ownership is rejected unless exact cleanup and an absence audit complete. Each rejection is bounded, nonzero, and leaves unrelated resources unchanged.
- AC-20: Finite repository validation accepts one complete positive evidence set and rejects one controlled mutation for each named invalid class: missing/duplicate/order/retry, assigned or mixed-clock timing, plan or threshold substitution, cold/warm identity violation, omitted failure, timeout-bound, non-timeout failure inclusion, or pre-start duration violation, missing artifact, unsafe disclosure, median or nearest-rank p95 formula/source mismatch, invalid or autonomous approval, incorrect overall disposition, incomparable capacity method, and cleanup leakage. Formula cases include even-count median and nearest-rank p95 for n = 5 and n=10. Each rejection has an inspectable nonzero or invalid-evidence classification.
- AC-22: Independent recomputation from retained plan, attempt IDs, and raw samples exactly matches all phase totals, numerically sorted median/p95/maximum values, timeout-bound inclusion and non-timeout failure exclusion, failure and miss counts, continuity result, capacity table, Product Metric 2–4 values, per-metric dispositions, and overall release disposition.

### Test Coverage
V-7 runs one complete positive fixture and one controlled mutation for every AC-17/AC-20 class, including even median, n=5/n=10 p95, assigned/mixed timing, timeout/failure/pre-start handling, approval, disclosure, capacity comparability, and leakage.

### Expected Evidence
Versioned positive fixture, mutation ledger with nonzero classifications, and independent recomputation report.

## Task T-8: Expose root commands and document the operational contract

- **Status:** Complete
- **Complexity:** Large
- **Dependencies:** T-1, T-6, T-7
- **Acceptance Criteria:** AC-1, AC-23, AC-24
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260806-rpiv-stage-contract; CORE-COMPONENT-260808-engineering-harness-delivery-contract; CORE-COMPONENT-260808-development-standards

### Description
Add separate designated measurement, finite validator, and residual-audit recipes. Keep the expensive measurement out of normal `just verify`; include only short BL-015 validation/audit there. Document host, environment, fixtures, exact events, counts/order, cache/prewarm, clocks/formulas, failures, artifacts/redaction/retention, approvals, cleanup, targets, BL-004 deltas, and no-optimization scope.

### Acceptance Criteria
- AC-1: One paved command checks and records the repository-documented designated-host prerequisites before any attempt, returns a prerequisite-specific nonzero result with zero attempts when they are not met, and otherwise runs one plan in this exact order: five cold-start attempts, ten warm-reconnect attempts, three three-project continuity runs, and fresh capacity cohorts of 3, 5, and 10. The command has a documented finite overall bound, performs no automatic retries, and retains every planned attempt or cohort record.
- AC-23: Documentation records the command, designated host and environment, fixtures/workload, exact start/end definitions and usable consequence, attempt order/count, clock/formulas/statistics, cache/prewarm rules, failure and interruption treatment, unchanged targets and dispositions, evidence capture/redaction/retention, cleanup, observed results, BL-004 delta, and any approval/follow-up links.
- AC-24: The repository full-validation command and the root-command-interface regression gates for BL-004 and BL-010–014 pass. Missing or superseded required gates are reported as validation failures rather than silently skipped. The designated measurement remains serial and is not unintentionally duplicated inside ordinary unit or full-validation loops.

### Test Coverage
V-10 documentation and command-interface tests must compare docs to constants, prove measurement serialization and non-duplication, and execute all BL-004/010–014 recipe-presence and full-gate checks.

### Expected Evidence
Root command listing, documentation contract results, updated runbook/indexes/harness inventory, and no-migration/no-architecture-impact statement.

## Task T-9: Execute and retain the designated measurement

- **Status:** Complete
- **Complexity:** Extra Large
- **Dependencies:** T-3, T-4, T-5, T-6, T-7, T-8
- **Acceptance Criteria:** AC-3, AC-5, AC-8, AC-10, AC-11, AC-12, AC-13, AC-14, AC-18, AC-21, AC-22, AC-23
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260810-full-page-browser-workbench-presentation; ADR-260812-browser-navigation-shell; ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260810-sqlite-persistence-lifecycle; CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Run the paved command once on the documented designated host with no retry. Retain all 5 cold, 10 warm, 3 continuity, and 3/5/10 capacity evidence in order; validate and independently recompute it; record observed results and BL-004 deltas without optimization or threshold adjustment.

### Acceptance Criteria
- AC-3: Each cold-start attempt measures from the controller-observed keyboard/user Open activation through separately defined runtime launch/readiness and stable-route document-readiness consequences to a workbench-usable consequence requiring both the expected Explorer sentinel and a ready terminal prompt. Each named consequence has a predeclared controller-observable event. Evidence retains every phase timestamp and duration plus total duration, and compares the required cold statistics with the unchanged 15,000 millisecond NFR-002 and Metric 4 target.
- AC-5: Each warm-reconnect attempt begins only after the existing health and readiness checks pass for a running runtime and measures from the controller-observed Open activation to the same workbench-usable consequence. Runtime PID, process-start identity, and port token remain unchanged. Evidence retains every phase and total and compares the required warm statistics with the unchanged 2,000 millisecond NFR-001 and Metric 3 target.
- AC-8: Every cold and warm attempt records host and cgroup specifications, current pre-attempt load and memory in declared units, code-server/Chromium/Node versions, run/attempt/project IDs, runtime PID/start/port token, stable URL, browser context and cache state, phase timings, success or failure, screenshot/trace/network evidence from activation through cleanup or reuse, and cleanup or reuse result. Capture bounds are declared; unavailable or failed capture is retained as an explicit evidence failure rather than omitted.
- AC-10: The three-project continuity section executes the exact merged BL-014 switching sequence three times without retry. Every run retains project-specific terminal, editor, and runtime identity evidence; Product Metric 2 is continuity passed runs divided by three; any state crossing or loss is retained as a failure; and run-attributed resources are cleaned after each run.
- AC-11: The capacity section runs fresh integrated-product cohorts of 3, 5, and 10 using the same documented fixtures, workload, sampling schedule, method, units, readiness rules, and completeness semantics as BL-004. The three-member cohort is the NFR-003 MVP gate and passes only with three ready distinct runtimes, successful workloads, complete required samples, passing responsiveness checks, and complete cleanup; the five- and ten-member cohorts remain findings. Every partial failure remains attributable. Raw samples and a comparison table are retained, the prior BL-004 baseline is linked for delta comparison, and unlike methods are never silently compared.
- AC-12: A retained machine-readable summary reports cold median, p95, maximum, failures (including pre-start failures), and target misses; warm median, p95, maximum, failures, identity-changes, and target misses; continuity successes from 0 through 3; capacity 3/5/10 readiness, workload, resource, and cleanup results; Product Metric 2 as continuity passed runs divided by three; Product Metric 3 as the declared warm-navigation statistics against 2,000 milliseconds; and Product Metric 4 as the declared cold-start statistics against 15,000 milliseconds. Every formula, duration source, and source attempt ID is machine-validated.
- AC-13: Cold NFR-002/Metric 4 is `met` only if exactly five attempts exist, there are zero failures including zero pre-start failures, and p95 is no more than 15,000 milliseconds. Warm NFR-001/Metric 3 is `met` only if exactly ten attempts exist, there are zero failures, all runtime identities remain unchanged, and p95 is no more than 2,000 milliseconds. Because p95 is the maximum for these counts, every timed attempt must be within the applicable target. Continuity Metric 2 is `met` only if exactly 3/3 runs pass with no state crossing or loss. Capacity NFR-003 is `met` only if the three-project gate passes completely; the 5 and 10 cohorts remain findings. Any required metric not `met` defaults to `blocker`.
- AC-14: `miss-accepted` cannot be chosen autonomously and is valid only with an explicit retained approval record created after measurement that names the approver, reason, risk, follow-up backlog ID, and the exact retained evidence hash. Without that record, the metric remains `blocker`. The overall release disposition is `blocker` if any required metric is `blocker`; otherwise it is `met`, with any valid `miss-accepted` metric counting as nonblocking. The exact failed target and disposition source are retained, and no threshold change is accepted.
- AC-18: Cleanup and reuse audits operate only on exact run-attributed resources and apply explicit boundary outcomes: after each cold attempt, its runtime and transient resources are absent; after each warm attempt, no duplicate or transient run-attributed resource remains while the expected healthy runtime identity and listener remain unchanged; after each continuity run, its owned resources are absent; after every section and the final run, all section-owned browser/process groups, proxy sockets, runtime PIDs/listeners, terminal commands, API/web services, databases, and fixtures are absent. Residual audits report measured zero where absence is required and exact expected identity counts where warm reuse is required, while pre-existing resources and an unrelated control listener survive unchanged until separate cleanup.
- AC-21: One no-retry execution on the repository-documented designated host produces all 5 cold, 10 warm, 3 continuity, and 3/5/10 capacity records in the declared order, retains raw and summarized evidence, reports every target comparison and disposition, and completes the final residual audit.
- AC-22: Independent recomputation from retained plan, attempt IDs, and raw samples exactly matches all phase totals, numerically sorted median/p95/maximum values, timeout-bound inclusion and non-timeout failure exclusion, failure and miss counts, continuity result, capacity table, Product Metric 2–4 values, per-metric dispositions, and overall release disposition.
- AC-23: Documentation records the command, designated host and environment, fixtures/workload, exact start/end definitions and usable consequence, attempt order/count, clock/formulas/statistics, cache/prewarm rules, failure and interruption treatment, unchanged targets and dispositions, evidence capture/redaction/retention, cleanup, observed results, BL-004 delta, and any approval/follow-up links.

### Test Coverage
V-9 is the real serial designated episode. It must complete inside the finite bound, validate every public/restricted artifact and source join, finish the final residual audit, and either report truthful met/blocker outcomes or consume a valid external post-run approval.

### Expected Evidence
The content-addressed designated evidence directory, machine summary, comparison, recomputation match, residual audit, and observed documentation values.

## Task T-10: Run mutation, regression, and authoritative full gates

- **Status:** Complete
- **Complexity:** Large
- **Dependencies:** T-7, T-9
- **Acceptance Criteria:** AC-20, AC-22, AC-24
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260806-rpiv-stage-contract; CORE-COMPONENT-260808-engineering-harness-delivery-contract; CORE-COMPONENT-260808-development-standards

### Description
Run focused BL-015 contract/mutation/recomputation validation, all named BL-004 and BL-010–014 root gates, the short BL-015 residual audit, and `just verify`. Confirm the long designated command was not invoked by ordinary validation and report missing/superseded gates as failures.

### Acceptance Criteria
- AC-20: Finite repository validation accepts one complete positive evidence set and rejects one controlled mutation for each named invalid class: missing/duplicate/order/retry, assigned or mixed-clock timing, plan or threshold substitution, cold/warm identity violation, omitted failure, timeout-bound, non-timeout failure inclusion, or pre-start duration violation, missing artifact, unsafe disclosure, median or nearest-rank p95 formula/source mismatch, invalid or autonomous approval, incorrect overall disposition, incomparable capacity method, and cleanup leakage. Formula cases include even-count median and nearest-rank p95 for n = 5 and n=10. Each rejection has an inspectable nonzero or invalid-evidence classification.
- AC-22: Independent recomputation from retained plan, attempt IDs, and raw samples exactly matches all phase totals, numerically sorted median/p95/maximum values, timeout-bound inclusion and non-timeout failure exclusion, failure and miss counts, continuity result, capacity table, Product Metric 2–4 values, per-metric dispositions, and overall release disposition.
- AC-24: The repository full-validation command and the root-command-interface regression gates for BL-004 and BL-010–014 pass. Missing or superseded required gates are reported as validation failures rather than silently skipped. The designated measurement remains serial and is not unintentionally duplicated inside ordinary unit or full-validation loops.

### Test Coverage
V-7 and V-10 must pass at the implementation revision; V-10 records recipe-level exit results and full-gate evidence while preserving generated evidence and a clean tracked tree.

### Expected Evidence
Focused mutation report, independent recomputation match, regression-gate ledger, full validation transcript summary, final residual audit, and tracked-tree status.
