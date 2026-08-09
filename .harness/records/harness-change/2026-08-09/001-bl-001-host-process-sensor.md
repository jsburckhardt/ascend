---
record_kind: "harness-change"
harness_version: "0.13.0"
branch: "feat/5-prove-host-code-server-workbench"
repo: "https://github.com/jsburckhardt/ascend.git"
created_at: "2026-08-09T01:40:00.000Z"
agent: "agent"
plan_id: "issue-5-t-5"
schema_version: "1.0"
resolves: "BL-001 host-process safety sensor gap"
change_type: "sensor"
target: "harness checks via just verify"
---

# Harness change — added the BL-001 host-process sensor

The canonical `just verify` gate, and therefore `harness checks`, now executes five bounded fake lifecycle failures plus one real designated-host code-server Chromium episode. The sensor records exact process ownership, argument boundaries, loopback listeners, fixture integrity, and finally-style exact-handle cleanup without changing non-persistent harness boot ownership.
