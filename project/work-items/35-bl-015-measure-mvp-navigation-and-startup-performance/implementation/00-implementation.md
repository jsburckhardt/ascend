# Implementation Notes: Issue 35 / BL-015

## Scope and completed tasks

Tasks T-1 through T-10 are complete in dependency order. The implementation adds the immutable plan and guard, monotonic statistics, serial browser controller, exact BL-014 continuity coordinator, integrated BL-004-compatible capacity runner, atomic evidence and recomputation, strict validator and residual audit, root recipes, documentation, one designated run, and regression gates. No threshold, optimization, migration, API contract, configuration default, or deployment topology changed.

## Recovery and designated measurement

- Interrupted run ID: `965db988-d727-464f-940e-0d276743c485`
- Recovery decision: retained as failed partial evidence; not resumable and never merged
- Retained interrupted records: cold attempts 1–4; cold-5 remained the sole in-progress node
- Invalidated interrupted record: zero-byte `005-cold-5-B.json`, classified `invalid-json`, digest-recorded, and quarantined
- Interrupted cleanup: zero same-run processes before/after, exact stale fixture root removed, zero-byte cold-5 screenshot/trace digest-recorded and removed, zero residuals, exact stale guard cleared
- Authoritative run ID: `03fab06c-14f6-46d3-b02d-399ed4657f0e`
- Plan hash: `fbef2984622899e1521dc9e6818102ef623af444472d2e929124074a1aff0eaf`
- Measurement hash: `27bf78da25201a9033ea18369523d9dffef15d4b11e69e8026962bc432f09cc5`
- Command executions after recovery: one `just measure-mvp-performance`; no retry
- Elapsed: 442,382 ms of the frozen 2,400,000 ms bound
- Host identity: immutable designated host/cgroup matched at start and end
- Cold A/B/C/A/B: 5 records; median 7,261.495 ms; p95 and maximum 7,406.816 ms; 0 failures; 0 misses; Metric 4 `met`
- Warm A/B/C/A/B/C/A/B/C/A: 10 records; median 5,514.526 ms; p95 and maximum 7,342.974 ms; 0 failures; 0 identity changes; 10 misses; Metric 3 `blocker`
- Continuity: 3/3 exact fresh BL-014 executions; Metric 2 `met`
- Capacity: 3/3, 5/5, and 10/10 ready runtimes and passing workloads with complete samples, responsiveness, and cleanup; cohort 3 `met`; cohorts 5 and 10 findings
- Approval: none; no autonomous `miss-accepted` result
- Overall disposition: `blocker`
- Recomputation: every phase, source duration, statistic, capacity value/delta, metric, and disposition independently matched
- Residual audit: complete, zero residuals; 42 exact identities and 42 mode-0600 restricted files

The authoritative run contains nonnegative, ordered adjacent phase durations from one controller clock; no timestamp was reassigned. The correction and measurement changed no target and performed no optimization.

## Acceptance evidence

- **AC-1:** `plan.json`, the exclusive mode-0600 owner guard, and the CLI enforce one bounded cold/warm/continuity/capacity sequence. The interrupted run status records failed partial recovery, while the authoritative run status records one complete 442,382 ms episode.
- **AC-2:** The authoritative plan hash `fbef2984622899e1521dc9e6818102ef623af444472d2e929124074a1aff0eaf` precedes all rows and freezes orders, targets, timeouts, fixtures, formulas, and zero retries.
- **AC-3:** All five cold rows retain activation, launch request, health, document, Explorer, terminal, usable timestamps, adjacent phases, total, target, artifacts, and absence boundary. Cold p95 is 7,406.816 ms against unchanged 15,000 ms.
- **AC-4:** Cold order is exactly A/B/C/A/B; every attempt used a fresh context and no prewarmed runtime. Every exact process and listener boundary reports zero residuals.
- **AC-5:** All ten warm rows retain the same consequence set after prestart, and every A/B/C PID/start/port identity digest remains unchanged. Warm p95 is 7,342.974 ms against unchanged 2,000 ms.
- **AC-6:** Warm order is exactly A/B/C/A/B/C/A/B/C/A in one retained context with keyboard Home returns and no lifecycle replacement.
- **AC-7:** Every timestamp is integer `process.hrtime.bigint` nanoseconds from one controller. Statistics use only successful totals plus timeout bounds, numeric sorting, conventional median, and nearest-rank p95 with source IDs.
- **AC-8:** `attempts.json` records host/cgroup, load, memory KiB, Node/Chromium/code-server versions, safe IDs, cache state, phase data, outcome, artifact state, and boundary. Exact authorities and network paths remain restricted; public network paths are hashed.
- **AC-9:** Public evidence passes the unsafe-disclosure validator. Exact browser, continuity, and capacity joins are ignored mode-0600 files under `test-results/bl-015/<runId>`.
- **AC-10:** `continuity.json` contains three no-retry invocations of `tests/e2e/session-switching.spec.ts`, three distinct execution IDs, complete identity evidence, 3/3 success, and per-run cleanup.
- **AC-11:** `capacity.json` retains fresh integrated 3/5/10 slots, all raw host/runtime-tree samples and workloads, exact BL-004 method constants, typed comparable/directional/not-comparable rows, and the frozen cohort-3 gate. `docs/mvp-performance.md` records observed BL-004 deltas.
- **AC-12:** `summary.json` reports cold/warm median, p95, maximum, failures and misses, continuity fraction, capacity results, all metric dispositions, and overall blocker.
- **AC-13:** The unchanged gate formulas produce cold `met`, warm `blocker`, continuity `met`, and capacity-3 `met`; zero warm failures and all ten misses remain visible.
- **AC-14:** Summary approval is null. No command creates approval, no target changed, and the ten warm misses therefore keep overall disposition `blocker`.
- **AC-15:** The real interrupted run retains four complete checkpoints and one explicitly invalid cold-5 checkpoint without fabrication; the authoritative run retains all 15 successful attempt records and artifacts with no retry. Controlled timeout, non-timeout, pre-start, and artifact-capture failures remain covered by finite fixtures.
- **AC-16:** BL-004 runtime-tree values are comparable, integrated host/service overhead is directional-only, and the historical one-member row is not-comparable.
- **AC-17:** The validator mutation matrix rejects order/retry, assigned timing, clock, plan/threshold, identity, failure treatment, artifact, privacy, formulas/source, approval, comparability, hash, recomputation, and cleanup mutations with stable classes.
- **AC-18:** All 15 authoritative attempt boundaries, three continuity cleanups, three capacity cohort cleanups, and the final union audit report zero residuals. Independent checks cover browser, API/web, runtime/listener, continuity, capacity, restricted modes, and guard absence.
- **AC-19:** Guard tests cover active, stale, absent, malformed, conflicting, wrong-owner, and insufficient-audit states. The machine-restart recovery retains four valid records, quarantines only the corrupt in-progress record, removes exact stale resources after audit, and requires a distinct new run ID.
- **AC-20:** Focused positive/negative suites include formula, timeout, non-timeout, prestart, artifact-failure, approval, privacy, comparability, cleanup, renderer, and guard fixtures. The correction executes retained pre-start, cold/warm timeout, partial non-timeout, empty-statistic, pre-aborted continuity, and strict corrupt-journal branches; final API branch coverage is 80.44 percent.
- **AC-21:** The fresh authoritative designated command produced 5 cold, 10 warm, 3 continuity, and 3/5/10 capacity records in exact plan order within its bound, then wrote summary, recomputation, and complete residual evidence.
- **AC-22:** `recomputation.json` lists all 15 source attempt IDs and independently matched all phase totals, statistics, capacity raw-source deltas, metrics, dispositions, and measurement hash.
- **AC-23:** `docs/mvp-performance.md` documents host, command, stale-run recovery, fixture/workload, events, order, clock/formulas, failure treatment, targets, artifacts/privacy, cleanup, interrupted and authoritative run IDs, raw-source BL-004 deltas, blocker disposition, and absent approval.
- **AC-24:** Verify exposed a suite-order coverage failure at 79.99 percent and one BL-014 active-tab timeout. Later full-gate runs exposed BL-011 event-settlement contention and a BL-013 browser-reconnect race caused by terminating runtime B before closing its browser context. Implement added behavioral BL-015 failure coverage without changing thresholds, bounded the single BL-011 correlated-event observation without retry, and closed B's context before its external crash. The final root `just verify` passed with API branch coverage at 80.44 percent, BL-013 passing in 32.2 seconds with zero residuals, and BL-014 passing in 1.6 minutes with complete residual cleanup. The gate completed format, lint, type, coverage tests, build, E2E, BL-004, BL-010 through BL-014, BL-015 validator, and BL-015 residual checks without invoking the long measurement.

## Documentation evidence

- `README.md`: adds the user-facing BL-015 measurement and validation commands.
- `docs/README.md`: indexes the BL-015 operational runbook.
- `docs/mvp-performance.md`: provides setup, behavior, formulas, usage, privacy/retention, cleanup, observed results, deltas, and disposition.
- `.harness/engineering-harness.md`: inventories the governed measure, validator, and residual checks.
- `justfile`: exposes the three Issue 35 recipes and includes only finite validator/audit work in `verify`.
- API documentation: no public API contract changed, so no OpenAPI or reference update is required.
- Configuration and migration documentation: no option, default, schema, data, or breaking change occurred; no migration note is required.
- Architecture documentation: implementation stays within the referenced ADR and core-component boundaries, so no ADR or core-component contract changed.
- Operations/deployment: no runtime deployment procedure changed; the new one-time designated procedure is fully documented in the runbook.

## Validation evidence

- Focused BL-015 correction: contract, continuity, and evidence suites passed 17 tests across three files; the final BL-015 set includes 27 tests across nine files.
- Evidence validator: `just verify-mvp-performance` returned `status: ok` for the retained run and hash.
- Residual audit: `just proof-mvp-performance-residual-audit` returned `status: ok`, 42 identities, modes 600, and absent API/web/guard ownership.
- Coverage preflight: `just test` passed with API branch coverage 80.20 percent in preflight.
- Authoritative correction gate: final `just verify` passed with 88 API files passed, one skipped, 460 tests passed, two skipped, API branch coverage 80.44 percent, BL-013 passing under suite load in 32.2 seconds, BL-014 passing in 1.6 minutes, and all configured E2E/regression/residual stages passing.
- Governed boot: `harness boot` returned `status: ok`, readiness `ready`, and duration 479,197 ms without leaving development servers running.

## Observation evidence

Captured observations include DL-764 through DL-792 for unavailable tools, quoting/backtracking, focused/full failures, privacy correction, formatting, flaky timing, and coverage work; INS-148 through INS-152 for long measurement/full/boot waits; and WIN-054 for safe shell rejection. The correction also captured CONF-002 for the documented-versus-installed observation-kind mismatch, DL-007 for the BL-013 context/termination race, and DL-008 for the large-history insights pipe failure. Ten correction observations were preserved in `.harness/records/retro/2026-08-14/002-bl-015-verification-correction.md`; the record parsed with zero malformed or unsupported entries, then the transient buffer cleared completely.

Implementation evidence is recorded for Verify. Final acceptance remains owned by Verify.
