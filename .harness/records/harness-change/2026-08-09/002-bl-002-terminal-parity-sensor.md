---
record_kind: "harness-change"
harness_version: "0.13.0"
branch: "feat/7-prove-host-native-terminal-parity"
repo: "https://github.com/jsburckhardt/ascend.git"
created_at: "2026-08-09T04:27:00.000Z"
agent: "agent"
plan_id: "issue-7-t-5"
schema_version: "1.0"
resolves: "BL-002 host-native terminal parity sensor gap"
change_type: "sensor"
target: "harness checks via just verify"
---

# Harness change — extended BL-001 with terminal parity

The canonical `just verify` gate, and therefore `harness checks`, now runs two real BL-001 designated-host Chromium scenarios: one forced integrated-terminal timeout-cleanup scenario and one passing terminal-parity scenario with Explorer, Markdown Preview, and bounded direct-vs-integrated hostname, user, canonical cwd, fixed-tool, and PATH-resolution parity. Both scenarios retain exact terminal-command, process, browser-context, and listener cleanup, without changing non-persistent harness boot ownership.
