# MVP navigation and startup performance (BL-015)

## Command and host

Run once on the designated repository devcontainer:

    just measure-mvp-performance

Required facts are Ubuntu 24.04.4, hostname 03f809395a5d, user vscode UID 1000, the /workspaces/ascend checkout, code-server 4.131.0, Node 22, repository Chromium, readable proc and cgroup v2 data, BL-001 and BL-014 fixtures, the retained BL-004 raw baseline, and owner-writable ignored artifact storage. Current load and memory are recorded without an invented eligibility threshold. A failed prerequisite returns nonzero with zero attempts.

One mode-0600 guard rejects concurrent, malformed, or stale ownership. Stale ownership needs an exact zero-residual audit before removal. Each attempt is journaled atomically, and exact recovery ownership is persisted in ignored mode-0600 storage. A stale interrupted run is finalized without resuming or merging it; valid checkpoints remain, an incomplete or corrupt checkpoint is explicitly quarantined, and stale incomplete artifacts are removed only after their digest and size are recorded. When recovering evidence created before exact recovery ownership was available, pass the already-inspected fixture root explicitly:

    just measure-mvp-performance --recover-interrupted RUN_ID --fixture-root /tmp/ascend-bl015-navigation-EXACT

The recovery command requires the exact stale guard, zero same-run processes, and a zero-residual cleanup audit before guard removal. It returns a retained-partial/new-run-required disposition. The overall bound is 2,400,000 ms. There are no automatic retries. Interruption retains completed and partial records under one unique run ID and later invocations never merge them.

## Immutable order

Before the first activation, plan.json freezes this serial order:

1. Cold A/B/C/A/B: five attempts.
2. Warm A/B/C/A/B/C/A/B/C/A: ten attempts after exact B/C/A runtime setup.
3. Three fresh complete BL-014 runs, each with 24 transitions, 14 workflow joins, and 12 cleanup classes.
4. Fresh integrated capacity cohorts 3/5/10, totalling 18 distinct disposable copies.

A/B/C use the BL-014 Git fixture definitions. Capacity copies are byte-identical to BL-001 and separately registered because canonical paths are unique.

## Navigation timing

One Playwright controller uses integer process.hrtime.bigint nanoseconds. Activation is timestamped immediately before keyboard Enter is sent to the focused Home Open control. The controller then observes runtime-start request receipt, health-backed runtime readiness receipt, stable document plus .monaco-workbench, exact Explorer sentinel, and a new terminal prompt containing the canonical fixture path and branch with input focused. Workbench usable is the later of Explorer and terminal readiness. Browser and server wall clocks never enter durations.

Cold attempts have a 45,000 ms bound, fresh context, cleared browser state, no runtime prestart, and exact process/listener absence. Warm attempts have a 15,000 ms bound, one retained context, a passed running-runtime precheck, unchanged PID/start/port token, and keyboard Home return without stop or replacement. Artifact capture is bounded to 5,000 ms, cold cleanup to 10,000 ms, and warm reuse audit to 5,000 ms.

Each attempt records host/cgroup and load/memory, Node/Chromium/code-server versions, safe IDs, stable path, cache state, phase timestamps/durations, total, outcome, artifact status, and boundary audit. Screenshots, traces, authorities, canonical paths, and exact joins remain only in ignored test-results/bl-015 RUN_ID storage at mode 0600. Tracked evidence contains safe IDs and hashes, including hashed network paths, not internal authority, internal port, canonical path, credential, or secret.

## Statistics and dispositions

Attempt rows remain in plan order. Statistics separately sort successful totals and timeout bounds. Timeout contributes its configured bound. Non-timeout failures retain observed totals but are excluded from median, p95, and maximum. Pre-start failures have no duration and are excluded. Both remain failures and misses. Artifact failure is explicit; nothing is discarded or retried.

Median is conventional and averages the middle pair for even counts. p95 is nearest rank at ceil of 0.95 times n; for five and ten values it is maximum. Presentation divides nanoseconds by 1,000,000 and rounds to three decimals, while formulas retain integers. Metric 2 is continuity passes divided by three.

Targets stay cold 15,000 ms and warm 2,000 ms. Cold is met only with exactly 5, no failures, and p95 at or below target. Warm is met only with exactly 10, no failures or identity changes, and p95 at or below target. Continuity requires 3/3 with no crossing or loss. Capacity 3 is the NFR-003 gate; 5 and 10 are findings. Any miss defaults to blocker.

The command never creates approval. miss-accepted requires an external post-run approver, reason, risk, BL follow-up, later timestamp, and exact measurement hash. Otherwise the metric stays blocker. Threshold adjustment is forbidden; any required blocker makes overall blocker.

## BL-004 comparison and cleanup

Capacity reuses the BL-004 /usr/bin/true 1,000 ms probe, 0/1/2/3/4-second idle and active positions, 7,000 ms Node workload, 10,000 ms bound, 4,096-byte bound, proc CPU-tick and RSS KiB formulas, load/memory units, completeness, attribution, and cleanup. Runtime-tree rows are comparable. API/web overhead is directional-only. Historical one-member data is not comparable to a fresh BL-015 cohort. Every delta is typed comparable, directional-only, or not-comparable.

Cold boundaries require zero owned runtime residuals. Warm requires exactly the expected identity and no duplicate. Continuity and capacity clean before the next run. Final audit covers browser/process groups, proxy work, runtimes/listeners, terminal commands, API/web listeners, databases, fixtures, and evidence owners while unrelated controls survive.

## Evidence and validation

Tracked evidence is retained under the Issue 35 implementation/evidence/RUN_ID directory: plan, prerequisites, attempts, artifact manifest, continuity, capacity raw data/comparison, summary, independent recomputation, run status, and residual audit. Exact joins remain ignored under test-results/bl-015/RUN_ID.

    just verify-mvp-performance
    just proof-mvp-performance-residual-audit
    just verify

The finite validator accepts the complete run and rejects missing/duplicate/order/retry, timing/clock, plan/threshold, identity, failure treatment, artifact/privacy, formula/source, approval/disposition, comparability, and cleanup mutations. Ordinary validation never invokes the designated measurement.

## Observed result

The machine-restarted run `965db988-d727-464f-940e-0d276743c485` is retained as failed partial evidence, not merged into any later result. Cold attempts 1–4 remain complete. The zero-byte cold-5 checkpoint was classified `invalid-json` and quarantined; its zero-byte screenshot and trace were digest-recorded and removed. The recovery audit found no same-run process, removed only `/tmp/ascend-bl015-navigation-PyUl3L`, observed zero residuals, and cleared the exact stale guard. The controller is non-resumable, so a new run was required.

The authoritative single no-retry run is `03fab06c-14f6-46d3-b02d-399ed4657f0e` (measurement hash `27bf78da25201a9033ea18369523d9dffef15d4b11e69e8026962bc432f09cc5`). It completed in 442,382 ms. Start and end host/cgroup identities both matched the immutable declaration. Cold completed 5/5 with median 7,261.495 ms, p95/maximum 7,406.816 ms, zero failures, and zero misses: met against 15,000 ms. Warm completed 10/10 with median 5,514.526 ms, p95/maximum 7,342.974 ms, zero failures and identity changes, but all ten attempts missed 2,000 ms, so NFR-001 Metric 3 is blocker. No approval or follow-up acceptance was supplied.

Continuity completed 3/3 fresh BL-014 runs with zero crossing/loss and zero cleanup residuals: met. Capacity completed 3/3, 5/5, and 10/10 ready runtimes and workloads with complete samples, responsiveness, and cleanup. Cohort 3 met the NFR-003 gate; cohorts 5 and 10 remain findings. The independent residual audit checked 42 exact browser, continuity, and capacity identities plus API/web/guard ownership, checked 42 restricted files at mode 0600, and found zero residuals. Overall disposition is blocker.

The deltas below are observed minus retained BL-004 run `853037e6-5dab-43cf-bcf8-61f1e8bbdb18`, computed directly from raw source-run samples. Runtime CPU/RSS fields are comparable because method, schedule, units, formulas, and runtime-tree scope match. Host load and available-memory fields are directional-only because BL-015 includes integrated API/web service overhead. Historical cohort 1 is explicitly not-comparable because BL-015 has no fresh one-member cohort.

| Cohort | Load-1 average BL-004 / BL-015 / delta | Minimum available KiB BL-004 / BL-015 / delta | Runtime CPU average % BL-004 / BL-015 / delta | Runtime RSS average KiB BL-004 / BL-015 / delta |
|---:|---:|---:|---:|---:|
| 3 | 3.185 / 8.177 / +4.992 | 18,952,508 / 19,734,244 / +781,736 | 0.150369 / 0.066448 / -0.083921 | 196,565.733333 / 200,906.800000 / +4,341.066667 |
| 5 | 2.885 / 8.023 / +5.138 | 18,602,712 / 19,244,132 / +641,420 | 0.059327 / 0.037745 / -0.021582 | 197,117.280000 / 199,740.960000 / +2,623.680000 |
| 10 | 2.513 / 6.667 / +4.154 | 18,467,380 / 18,687,164 / +219,784 | 0.029937 / 0.070212 / +0.040275 | 196,899.640000 / 200,982.520000 / +4,082.880000 |

BL-015 performs no optimization and changes no target, API, migration, configuration default, or deployment topology.

**BL-020 close has no deployment-topology impact on these measurements.** Close runs inside the same single local host with one API process and loopback-only runtimes, and it introduces no new process, port, service, or host requirement, so the cold, warm, continuity, and capacity procedures, targets, and comparability rules above are unchanged. Close is not measured here: it neither starts a runtime nor participates in a navigation timing, and the designated close proof runs under its own recipe.
