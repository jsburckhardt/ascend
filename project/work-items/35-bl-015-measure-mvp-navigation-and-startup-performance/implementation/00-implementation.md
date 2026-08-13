# Implementation Notes: Issue 35 / BL-015

## Scope and completed tasks

Tasks T-1 through T-10 are complete in dependency order. The implementation adds the immutable plan and guard, monotonic statistics, serial browser controller, exact BL-014 continuity coordinator, integrated BL-004-compatible capacity runner, atomic evidence and recomputation, strict validator and residual audit, root recipes, documentation, one designated run, and regression gates. No threshold, optimization, migration, API contract, configuration default, or deployment topology changed.

## Designated measurement

- Run ID: `79479981-4b00-4596-a950-57dd9d2f53dd`
- Measurement hash: `e1046427df028a35916ada79cf38dbae5d85c7e734a974d5f8db5a00920758df`
- Command executions: one `just measure-mvp-performance`; no retry
- Elapsed: 590,183 ms of the frozen 2,400,000 ms bound
- Cold A/B/C/A/B: 5 records; median 10,222.644 ms; p95 and maximum 11,702.568 ms; 0 failures; 0 misses; Metric 4 `met`
- Warm A/B/C/A/B/C/A/B/C/A: 10 records; six successful statistical values; median 8,781.340 ms; p95 and maximum 10,189.326 ms; four retained trace-capture failures; 10 misses; Metric 3 `blocker`
- Continuity: 3/3 exact fresh BL-014 executions; Metric 2 `met`
- Capacity: 3/3, 5/5, and 10/10 ready runtimes and passing workloads with complete samples, responsiveness, and cleanup; cohort 3 `met`; cohorts 5 and 10 findings
- Approval: none; no autonomous `miss-accepted` result
- Overall disposition: `blocker`
- Recomputation: `matched: true`
- Residual audit: complete, zero residuals; independent audit checked 42 exact identities and five mode-0600 restricted files

The raw phase rows retain the exact controller observations. Early cold and warm rows show negative runtime-health-to-document adjacent deltas because the server callback was observed after an already visible browser consequence; no timestamp was reassigned. The controller now waits for the observed health event before recording later browser consequences for any future run. The one designated run was not repeated or rewritten.

## Acceptance evidence

- **AC-1:** `plan.json`, the exclusive mode-0600 owner guard, and the CLI enforce one bounded cold/warm/continuity/capacity sequence. Run status records one complete 590,183 ms episode.
- **AC-2:** The plan hash `ed85cb7c5a010e573518cdd34f9c2ae22b1cb9eb76aa594e661ae6e9d9294679` precedes all rows and freezes orders, targets, timeouts, fixtures, formulas, and zero retries.
- **AC-3:** All five cold rows retain activation, launch request, health, document, Explorer, terminal, usable timestamps, adjacent phases, total, target, artifacts, and absence boundary. Cold p95 is 11,702.568 ms against unchanged 15,000 ms.
- **AC-4:** Cold order is exactly A/B/C/A/B; every attempt used a fresh context and no prewarmed runtime. Every exact process and listener boundary reports zero residuals.
- **AC-5:** All ten warm rows retain the same consequence set after prestart, and every A/B/C PID/start/port identity digest remains unchanged. Warm p95 is 10,189.326 ms against unchanged 2,000 ms.
- **AC-6:** Warm order is exactly A/B/C/A/B/C/A/B/C/A in one retained context with keyboard Home returns and no lifecycle replacement.
- **AC-7:** Every timestamp is integer `process.hrtime.bigint` nanoseconds from one controller. Statistics use only successful totals plus timeout bounds, numeric sorting, conventional median, and nearest-rank p95 with source IDs.
- **AC-8:** `attempts.json` records host/cgroup, load, memory KiB, Node/Chromium/code-server versions, safe IDs, cache state, phase data, outcome, artifact state, and boundary. Exact authorities and network paths remain restricted; public network paths are hashed.
- **AC-9:** Public evidence passes the unsafe-disclosure validator. Exact browser, continuity, and capacity joins are ignored mode-0600 files under `test-results/bl-015/<runId>`.
- **AC-10:** `continuity.json` contains three no-retry invocations of `tests/e2e/session-switching.spec.ts`, three distinct execution IDs, complete identity evidence, 3/3 success, and per-run cleanup.
- **AC-11:** `capacity.json` retains fresh integrated 3/5/10 slots, all raw host/runtime-tree samples and workloads, exact BL-004 method constants, typed comparable/directional/not-comparable rows, and the frozen cohort-3 gate. `docs/mvp-performance.md` records observed BL-004 deltas.
- **AC-12:** `summary.json` reports cold/warm median, p95, maximum, failures and misses, continuity fraction, capacity results, all metric dispositions, and overall blocker.
- **AC-13:** The unchanged gate formulas produce cold `met`, warm `blocker`, continuity `met`, and capacity-3 `met`; warm failures and all ten misses remain visible.
- **AC-14:** Summary approval is null. No command creates approval, no target changed, and the required warm miss therefore keeps overall disposition `blocker`.
- **AC-15:** Warm attempts 7 through 10 retain `artifact-capture-failed`, their observed totals, null statistical totals, failed trace status, successful screenshot/network status, and exact reuse boundaries. Nothing was omitted or retried.
- **AC-16:** BL-004 runtime-tree values are comparable, integrated host/service overhead is directional-only, and the historical one-member row is not-comparable.
- **AC-17:** The validator mutation matrix rejects order/retry, assigned timing, clock, plan/threshold, identity, failure treatment, artifact, privacy, formulas/source, approval, comparability, hash, recomputation, and cleanup mutations with stable classes.
- **AC-18:** All 15 attempt boundaries, three continuity cleanups, three capacity cohort cleanups, and the final union audit report zero residuals. Independent checks cover browser, API/web, runtime/listener, continuity, capacity, restricted modes, and guard absence.
- **AC-19:** Guard tests cover active, stale, absent, malformed, conflicting, wrong-owner, and insufficient-audit states; CLI tests retain prerequisite and partial evidence without section interleaving.
- **AC-20:** Focused positive/negative suites include formula, timeout, non-timeout, prestart, artifact-failure, approval, privacy, comparability, cleanup, renderer, and guard fixtures. Final API branch coverage is 80.27 percent.
- **AC-21:** The single designated command produced 5 cold, 10 warm, 3 continuity, and 3/5/10 capacity records in exact plan order within its bound, then wrote summary, recomputation, and complete residual evidence.
- **AC-22:** `recomputation.json` lists all 15 source attempt IDs, repeats all statistics/metrics/capacity outcomes, has the exact measurement hash, and reports `matched: true`.
- **AC-23:** `docs/mvp-performance.md` documents host, command, fixture/workload, events, order, clock/formulas, failure treatment, targets, artifacts/privacy, cleanup, observed values, BL-004 deltas, blocker disposition, and absent approval.
- **AC-24:** The root `just verify` completed format, lint, type, coverage tests, build, E2E, BL-004, BL-010 through BL-014, BL-015 validator, and BL-015 residual gates without invoking the long measurement.

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

- Focused BL-015: `just verify-focused apps/api/test/mvp-performance*.test.ts` passed; the final BL-015 set includes 25 tests across nine files.
- Evidence validator: `just verify-mvp-performance` returned `status: ok` for the retained run and hash.
- Residual audit: `just proof-mvp-performance-residual-audit` returned `status: ok`, 42 identities, modes 600, and absent API/web/guard ownership.
- Coverage preflight: `just test` passed with API branch coverage 80.20 percent in preflight.
- Authoritative full gate: final `just verify` passed with 88 API files passed, one skipped, 447 tests passed, two skipped, API branch coverage 80.32 percent, and all configured E2E/regression/residual stages passing.
- Governed boot: `harness boot` returned `status: ok`, readiness `ready`, and duration 407,457 ms without leaving development servers running.

## Observation evidence

Captured observations include DL-764 through DL-792 for unavailable tools, quoting/backtracking, focused/full failures, privacy correction, formatting, flaky timing, and coverage work; INS-148 through INS-152 for long measurement/full/boot waits; and WIN-054 for safe shell rejection. The observation buffer retained each successful capture. No pending failed observation attempt remains known.

Implementation evidence is recorded for Verify. Final acceptance remains owned by Verify.
