---
record_kind: "harness-change"
harness_version: "0.13.0"
branch: "main"
repo: "https://github.com/jsburckhardt/ascend.git"
created_at: "2026-08-08T07:55:52.051Z"
agent: null
plan_id: null
schema_version: "1.0"
resolves: "2026-08-08T07:49:16Z-agent-327885:SUGG-001"
change_type: "sensor"
target: "harness boot duration_ms envelope field"
---

# Harness change — boot now reports its checks duration

`harness boot --json` now reports `data.duration_ms`, removing its dependency on
ambient timing utilities and making HEALTHY/SLOW classification deterministic.
