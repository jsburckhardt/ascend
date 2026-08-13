# MVP performance result 79479981-4b00-4596-a950-57dd9d2f53dd

Overall release disposition: **blocker**

| Metric | Result | Median ms | p95 ms | Maximum ms | Failures | Misses |
|---|---|---:|---:|---:|---:|---:|
| NFR-002 / Metric 4 cold | met | 10222.644 | 11702.568 | 11702.568 | 0 | 0 |
| NFR-001 / Metric 3 warm | blocker | 8781.340 | 10189.326 | 10189.326 | 4 | 10 |

Continuity: 3/3 (met).
Capacity 3 gate: met. Capacity 5/10 remain findings.

## BL-004 delta classifications

- historical-1: not-comparable — BL-015 has no fresh one-member cohort
- 3: comparable — runtime-tree samples reuse BL-004 probe offsets workload units formulas and completeness
- 3: directional-only — integrated API and web overhead is additional to the BL-004 raw-runtime method
- 5: comparable — runtime-tree samples reuse BL-004 probe offsets workload units formulas and completeness
- 5: directional-only — integrated API and web overhead is additional to the BL-004 raw-runtime method
- 10: comparable — runtime-tree samples reuse BL-004 probe offsets workload units formulas and completeness
- 10: directional-only — integrated API and web overhead is additional to the BL-004 raw-runtime method

Approval: none; misses remain blockers
