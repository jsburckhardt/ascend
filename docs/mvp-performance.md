# MVP navigation and startup performance (BL-015)

## Command and host

Run once on the designated repository devcontainer:

    just measure-mvp-performance

Required facts are Ubuntu 24.04.4, hostname 03f809395a5d, user vscode UID 1000, the /workspaces/ascend checkout, code-server 4.131.0, Node 22, repository Chromium, readable proc and cgroup v2 data, BL-001 and BL-014 fixtures, the retained BL-004 raw baseline, and owner-writable ignored artifact storage. Current load and memory are recorded without an invented eligibility threshold. A failed prerequisite returns nonzero with zero attempts.

One mode-0600 guard rejects concurrent, malformed, or stale ownership. Stale ownership needs an exact zero-residual audit before removal. The overall bound is 2,400,000 ms. There are no automatic retries. Interruption retains completed and partial records under one unique run ID and later invocations never merge them.

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

The single no-retry run is `79479981-4b00-4596-a950-57dd9d2f53dd` (measurement hash `e1046427df028a35916ada79cf38dbae5d85c7e734a974d5f8db5a00920758df`). Cold completed 5/5 with median 10,222.644 ms, p95/maximum 11,702.568 ms, zero failures, and zero misses: met against 15,000 ms. Warm retained all 10 attempts; six successful values produced median 8,781.340 ms, p95/maximum 10,189.326 ms, while four later attempts retained bounded trace-capture failures. All ten warm attempts missed 2,000 ms, so NFR-001 Metric 3 is blocker. No approval or follow-up acceptance was supplied.

Continuity completed 3/3 fresh BL-014 runs with zero crossing/loss and zero cleanup residuals: met. Capacity completed 3/3, 5/5, and 10/10 ready runtimes and workloads with complete samples, responsiveness, and cleanup. Cohort 3 met the NFR-003 gate; cohorts 5 and 10 remain findings. The independent residual audit checked 42 exact browser, continuity, and capacity identities plus API/web/guard ownership and found zero residuals. Overall disposition is blocker.

The comparable deltas below are observed minus retained BL-004 run `853037e6-5dab-43cf-bcf8-61f1e8bbdb18`, calculated over the same ten host positions and all runtime-tree samples. CPU uses proc-tick percent and RSS/memory use KiB. Host totals include integrated product load; API/web attribution remains a separate directional-only comparison and is not presented as a runtime-tree delta.

| Cohort | Load-1 average BL-004 / BL-015 / delta | Minimum available KiB BL-004 / BL-015 / delta | Runtime CPU average % BL-004 / BL-015 / delta | Runtime RSS average KiB BL-004 / BL-015 / delta |
|---:|---:|---:|---:|---:|
| 3 | 3.185 / 5.135 / +1.950 | 18,952,508 / 12,558,236 / -6,394,272 | 0.150 / 0.129 / -0.021 | 196,565.73 / 198,167.60 / +1,601.87 |
| 5 | 2.885 / 4.576 / +1.691 | 18,602,712 / 12,052,440 / -6,550,272 | 0.059 / 0.197 / +0.138 | 197,117.28 / 197,893.52 / +776.24 |
| 10 | 2.513 / 3.963 / +1.450 | 18,467,380 / 12,029,992 / -6,437,388 | 0.030 / 0.078 / +0.048 | 196,899.64 / 198,117.80 / +1,218.16 |

The historical one-member row remains not-comparable. BL-015 performs no optimization and changes no target, API, migration, configuration default, or deployment topology.
