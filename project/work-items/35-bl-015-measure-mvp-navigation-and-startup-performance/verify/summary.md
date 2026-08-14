# Verify Report - #35

**Branch:** `feat/35-measure-mvp-performance`  
**Accepted implementation commit:** `8b0f7b4f5d400fd808bf39ecadf8f66af8952148`  
**Pull request:** #36 — https://github.com/jsburckhardt/ascend/pull/36

## Acceptance Decisions

All acceptance criteria were independently accepted against the exact implementation commit before this shipping-only continuation.

- **AC-1 — Passed:** The bounded exclusive command retained one prerequisite-checked cold/warm/continuity/capacity plan and guard record.
- **AC-2 — Passed:** Immutable pre-run `plan.json` and plan hash `fbef2984622899e1521dc9e6818102ef623af444472d2e929124074a1aff0eaf` precede all authoritative attempt rows and prevent substitution.
- **AC-3 — Passed:** Five cold rows retain controller-observed activation through Explorer and terminal-prompt usability; p95 is `7,406.816 ms` against `15,000 ms`.
- **AC-4 — Passed:** Cold order is `A/B/C/A/B`, with fresh contexts, cache evidence, no prewarm, and zero owned-resource boundaries.
- **AC-5 — Passed:** Ten warm rows retain pre-health and unchanged PID/start/port identities; p95 `7,342.974 ms` is retained against the unchanged `2,000 ms` target.
- **AC-6 — Passed:** The retained warm ledger is `A/B/C/A/B/C/A/B/C/A`, returns Home between attempts, and records no runtime replacement.
- **AC-7 — Passed:** Integer `process.hrtime.bigint` controller timestamps, ordered rows, source IDs, conventional median, and nearest-rank p95 are machine-validated.
- **AC-8 — Passed:** Attempt manifests retain declared host, identity, context/cache, phase, artifact, and cleanup/reuse evidence with explicit capture status.
- **AC-9 — Passed:** Public disclosure validation found zero protected matches; all 42 exact joins are access-restricted mode-`0600` artifacts.
- **AC-10 — Passed:** `continuity.json` retains three exact fresh BL-014 runs with identity evidence, 3/3 success, and per-run cleanup.
- **AC-11 — Passed:** Fresh integrated capacity cohorts 3/5/10 retain raw samples, workloads, BL-004-compatible comparison rows, and complete cleanup; cohort 3 passes and 5/10 are findings.
- **AC-12 — Passed:** The machine-readable summary retains all cold, warm, continuity, capacity, metric, and source-ID fields.
- **AC-13 — Passed:** Unchanged formulas produce cold `met`, warm `blocker`, continuity `met`, and capacity-3 `met`; all ten warm target misses remain visible.
- **AC-14 — Passed:** Approval is null, no autonomous `miss-accepted` path exists, and the retained overall disposition is `blocker`.
- **AC-15 — Passed:** The interrupted record retains partial evidence without fabrication; controlled timeout, non-timeout, pre-start, and capture-failure fixtures prove failure treatment without retries.
- **AC-16 — Passed:** Prerequisite, baseline, artifact, approval, and evidence failures return specific non-success classifications without assigned fallback values.
- **AC-17 — Passed:** The strict mutation matrix rejects timing, order, retry, identity, formula, disclosure, approval, comparability, and cleanup violations.
- **AC-18 — Passed:** All authoritative attempt, continuity, capacity, and final audits report zero owned residuals with required warm identity reuse.
- **AC-19 — Passed:** Guard and recovery evidence covers active/stale/conflicting ownership, retained interruption records, exact cleanup, and distinct run IDs.
- **AC-20 — Passed:** Finite positive and negative validation covers every named invalid class, including even median and n=5/n=10 nearest-rank p95 cases.
- **AC-21 — Passed:** The one no-retry designated-host run retained 5 cold, 10 warm, 3 continuity, and 3/5/10 capacity records in plan order within `442,382 ms`.
- **AC-22 — Passed:** Independent recomputation matched every phase total, statistic, raw-source delta, metric, disposition, and measurement hash.
- **AC-23 — Passed:** README and performance runbook document the command, host, definitions, formulas, retention, cleanup, observed results, deltas, and blocker disposition.
- **AC-24 — Passed:** Independent root `just verify` passed at the accepted implementation SHA: API 88 files, 460 passed, 2 skipped, 80.55% branch coverage; web 11 files, 152 passed; BL-004 through BL-014 gates, BL-015 validator, and residual audit all passed without re-running the long measurement.

## Scope, Architecture, and Documentation Decisions

- **Scope:** Passed. The accepted branch diff is limited to BL-015 measurement, evidence, validation, root command, test, and documentation work.
- **Architecture:** Passed. No ADR or core-component contract changed; the implementation remains within the referenced monorepo, harness, presentation, proxy, runtime-lifecycle, and command-interface boundaries.
- **Documentation:** Passed. README and `docs/mvp-performance.md` accurately cover command usage, designated host, fixtures/workload, observable definitions, ordering, formulas, cache/prewarm rules, failure/interruption treatment, unchanged targets, evidence retention/redaction, cleanup, BL-004 delta, observed results, and the blocker disposition. API, configuration, migration, architecture, operational deployment, and release procedure documentation have explicit no-impact or applicable coverage as appropriate.

## Validation Result

The independently accepted root `just verify` result at `8b0f7b4f5d400fd808bf39ecadf8f66af8952148` was: API 88 files, 460 passed, 2 skipped, 80.55% branch coverage; web 11 files, 152 passed; all BL-004 through BL-014 gates, the BL-015 validator, and the BL-015 residual audit passed. This shipping continuation did not rerun the long designated measurement.

## Measured Release Disposition

- **Authoritative run:** `03fab06c-14f6-46d3-b02d-399ed4657f0e`
- **Measurement hash:** `27bf78da25201a9033ea18369523d9dffef15d4b11e69e8026962bc432f09cc5`
- **Cold:** `met`; five attempts, zero failures, median `7,261.495 ms`, p95/max `7,406.816 ms`, target `15,000 ms`.
- **Warm:** `blocker`; ten attempts, zero execution failures, zero identity changes, ten target misses, median `5,514.526 ms`, p95/max `7,342.974 ms`, unchanged target `2,000 ms`.
- **Continuity:** `met`; 3/3 exact fresh BL-014 runs.
- **Capacity:** cohort 3 `met`; cohorts 5 and 10 are findings, with complete readiness, workload, samples, responsiveness, and cleanup.
- **Overall:** `blocker`. There is no approval record, no autonomous `miss-accepted` result, and no target change. This issue records the measured outcome; it does not optimize performance.

## Shipping Evidence

- Issue #35 acceptance markers and all criterion text were preserved; all 24 accepted boxes are checked.
- PR #36 was created against `main` from `feat/35-measure-mvp-performance` with every AC verdict/evidence, documentation status, validation result, and blocker disposition.
- The accepted implementation branch was pushed normally at `8b0f7b4f5d400fd808bf39ecadf8f66af8952148` before this verifier-only summary commit.
- Verify changed no application source code, tests, or application documentation.

## Observation Evidence

- `DL-003` (`difficulty`): the required `apply_patch` executable was unavailable while preparing ephemeral PR metadata; the event was captured via `harness observe`. No lifecycle hook was invoked.

