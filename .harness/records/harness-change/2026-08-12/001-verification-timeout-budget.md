---
record_kind: "harness-change"
harness_version: "0.13.0"
branch: "feat/29-connect-home-workbench"
repo: "https://github.com/jsburckhardt/ascend.git"
created_at: "2026-08-12T11:18:00.000Z"
agent: "agent"
plan_id: "issue-29-t-0"
schema_version: "1.0"
resolves: "stale fixed harness verification timeout"
change_type: "reliability"
target: "harness checks and harness boot"
---

# Harness change — bounded verification timeout

`harness checks` and the test-backed `harness boot` continue to delegate exactly to the root `just verify` recipe. The wrapper now uses a finite 600,000 ms default and accepts `ASCEND_HARNESS_VERIFY_TIMEOUT_MS` values from 120,001 through 3,600,000 ms. Boot derives the same configured checks budget and adds 10,000 ms of finite wrapper overhead so it cannot kill a valid longer check at the former 150-second ceiling. Deterministic injected-clock contracts prove simulated 121-second checks and boot success plus an over-budget error without a real wait, while retaining bounded actionable output envelopes.
