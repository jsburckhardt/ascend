---
record_kind: "retro"
harness_version: "0.13.0"
branch: "main"
repo: "https://github.com/jsburckhardt/ascend.git"
created_at: "2026-08-08T07:58:32.715Z"
agent: "agent"
plan_id: null
schema_version: "1.2"
retro_id: "2026-08-08T07:58:32Z-agent-d9b982"
started_at: "2026-08-08T07:54:48.793Z"
ended_at: "2026-08-08T07:58:32.716Z"
summary: "Captured a standalone harness-loop schema mismatch for upstream resolution."
entries:
  - id: DL-001
    kind: difficulty
    description: "The standalone harness-loop schema rejects the documented chore excursion type during Improve, so small approved fixes cannot be tracked using the prescribed flight-plan excursion shape."
    target: harness-itself
    severity: degrading
    suggested_encoding: "Allow chore excursion nodes in the harness-loop flow schema or document the supported substitute."
    fp: "d9b98218c5de"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-08T07:54:48.793Z"
system:
  compound:
    bubble_action: "all-save"
---

# Retro — improve excursion schema

The supported `improve` node type was used as a non-blocking workaround. The
schema/doctrine mismatch remains open for the upstream harness project.
