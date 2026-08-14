# MVP performance result 03fab06c-14f6-46d3-b02d-399ed4657f0e

Overall release disposition: **blocker**

| Metric | Result | Median ms | p95 ms | Maximum ms | Failures | Misses |
|---|---|---:|---:|---:|---:|---:|
| NFR-002 / Metric 4 cold | met | 7261.495 | 7406.816 | 7406.816 | 0 | 0 |
| NFR-001 / Metric 3 warm | blocker | 5514.526 | 7342.974 | 7342.974 | 0 | 10 |

Continuity: 3/3 (met).
Capacity 3 gate: met. Capacity 5/10 remain findings.

## BL-004 delta classifications

- historical-1 load1Average: not-comparable — BL-015 has no fresh one-member cohort raw source
- historical-1 minimumAvailableMemoryKiB: not-comparable — BL-015 has no fresh one-member cohort raw source
- historical-1 runtimeCpuAveragePercent: not-comparable — BL-015 has no fresh one-member cohort raw source
- historical-1 runtimeRssAverageKiB: not-comparable — BL-015 has no fresh one-member cohort raw source
- 3 load1Average: directional-only — same raw host field and schedule but BL-015 includes integrated API and web service load; delta=4.992
- 3 minimumAvailableMemoryKiB: directional-only — same raw host field and schedule but BL-015 includes integrated API and web service load; delta=781736
- 3 runtimeCpuAveragePercent: comparable — identical BL-004 proc sampling field formula schedule units and runtime-tree scope; delta=-0.083921
- 3 runtimeRssAverageKiB: comparable — identical BL-004 proc sampling field formula schedule units and runtime-tree scope; delta=4341.066667
- 5 load1Average: directional-only — same raw host field and schedule but BL-015 includes integrated API and web service load; delta=5.138
- 5 minimumAvailableMemoryKiB: directional-only — same raw host field and schedule but BL-015 includes integrated API and web service load; delta=641420
- 5 runtimeCpuAveragePercent: comparable — identical BL-004 proc sampling field formula schedule units and runtime-tree scope; delta=-0.021582
- 5 runtimeRssAverageKiB: comparable — identical BL-004 proc sampling field formula schedule units and runtime-tree scope; delta=2623.68
- 10 load1Average: directional-only — same raw host field and schedule but BL-015 includes integrated API and web service load; delta=4.154
- 10 minimumAvailableMemoryKiB: directional-only — same raw host field and schedule but BL-015 includes integrated API and web service load; delta=219784
- 10 runtimeCpuAveragePercent: comparable — identical BL-004 proc sampling field formula schedule units and runtime-tree scope; delta=0.040275
- 10 runtimeRssAverageKiB: comparable — identical BL-004 proc sampling field formula schedule units and runtime-tree scope; delta=4082.88

Approval: none; misses remain blockers
