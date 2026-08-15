---
record_kind: "retro"
harness_version: "0.13.0"
branch: "feat/37-report-accurate-runtime-state-and-health"
repo: "https://github.com/jsburckhardt/ascend.git"
created_at: "2026-08-15T01:52:42.493Z"
agent: "agent"
plan_id: "feat/37-report-accurate-runtime-state-and-health"
schema_version: "1.2"
retro_id: "2026-08-15T01:52:42Z-agent-c42a9c2"
started_at: "2026-08-14T08:20:21.681Z"
ended_at: "2026-08-15T01:52:42.493Z"
summary: "Saved all 22 pending coordinator and Implement observations from BL-015 shipping through BL-016 implementation."
entries:
  - id: DL-001
    kind: difficulty
    description: "GitHub authentication rejected the active CLI account."
    fp: "db7798d504e2"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T08:20:21.681Z"
  - id: DL-002
    kind: difficulty
    description: "Canonical repository validation required a multi-minute wait."
    fp: "cf3196cc6c15"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T08:28:55.341Z"
  - id: DL-003
    kind: difficulty
    description: "Required apply_patch executable unavailable while preparing verifier PR metadata."
    fp: "9b8eac5c879b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T10:13:28.357Z"
  - id: DL-004
    kind: difficulty
    description: "The first BL-016 issue draft exhausted its review loop because checkpoint semantics were ambiguous and validation wording prescribed structure"
    target: skill
    severity: degrading
    workaround: "redraft around observable state invariants and request one bounded independent critique"
    suggested_encoding: "add an issue-generator fixture for four-state lifecycle reporting stories"
    fp: "f03d62d7aaf8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T23:43:28.846Z"
  - id: DL-005
    kind: difficulty
    description: "GitHub CLI authentication expired again between BL-015 shipping and BL-016 issue creation, blocking the ticket boundary"
    target: tooling
    severity: blocking
    workaround: "reauthenticate gh and rerun the already reviewed issue create call"
    suggested_encoding: "add a non-secret gh auth preflight before each backlog ticket starts"
    fp: "80c7a20bb99a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T23:45:48.894Z"
  - id: DL-006
    kind: difficulty
    description: "Terminal lacks rg although repository guidance prescribes it."
    fp: "2cb7edbcd46b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T00:07:51.871Z"
  - id: DL-007
    kind: difficulty
    description: "Broad runtime evidence inventory exceeded terminal output limits."
    fp: "171e63e74049"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T00:09:16.375Z"
  - id: DL-008
    kind: difficulty
    description: "Required apply_patch executable is unavailable for research artifact creation."
    fp: "3778dd8a1e22"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T00:10:39.696Z"
  - id: DL-009
    kind: difficulty
    description: "The BL-016 Research artifact ended after its first architecture reference and omitted the required risk register despite reporting both in its handoff"
    target: skill
    severity: degrading
    workaround: "validate artifact sections and append only the missing evidence before Plan"
    suggested_encoding: "add a Research handoff check for required headings and complete file termination"
    fp: "7740ebdb4c9b"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T00:12:28.380Z"
  - id: DL-010
    kind: difficulty
    description: "The Copilot skill host accepts only the eng-harness-flow name and rejects the exact required --hook pre-coding --json invocation"
    target: harness-itself
    severity: degrading
    workaround: "load the skill by name and execute the selected pre-coding module against the accepted plan"
    suggested_encoding: "add structured arguments to the Skill tool or a first-class lifecycle hook invocation surface"
    fp: "4c9f5d2a9ecd"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T00:46:51.463Z"
  - id: DL-011
    kind: difficulty
    description: "The preferred rg search executable is unavailable during Implement context loading despite repository guidance."
    fp: "86bedd0ab7cb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T00:50:21.611Z"
  - id: DL-012
    kind: difficulty
    description: "The required apply_patch editing helper is unavailable, so Implement must use git apply for reviewable unified patches."
    fp: "c9771c114931"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T00:53:19.265Z"
  - id: DL-013
    kind: difficulty
    description: "The first git apply fallback rejected the unified patch because hand-counted hunk lengths were inconsistent."
    fp: "af101480646a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T00:54:02.485Z"
  - id: DL-014
    kind: difficulty
    description: "Focused route validation failed because Fastify autoload could not resolve a sibling route source import."
    fp: "0916d6d48865"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T01:02:04.189Z"
  - id: DL-015
    kind: difficulty
    description: "The runtime-state hook depended on revision object identity and retriggered requests for equivalent authoritative revisions."
    fp: "99e0865148f8"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T01:08:52.550Z"
  - id: DL-016
    kind: difficulty
    description: "The first runtime unavailability placement changed the established Project Home keyboard focus order by inserting Retry before Open."
    fp: "99f5f12c9f97"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T01:11:23.611Z"
  - id: DL-017
    kind: difficulty
    description: "A successful project mutation briefly paired the new project list with stale runtime reports before the next revision effect."
    fp: "2de1bfbd31af"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T01:13:22.166Z"
  - id: DL-018
    kind: difficulty
    description: "The source guard inspected only the projection body, so an async modifier before the method name escaped the first mutation check."
    fp: "6784180f0c05"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T01:25:34.447Z"
  - id: INS-001
    kind: insight
    description: "The isolation scenario incorrectly treated the healthy peer runtime exit watcher as residual background work instead of owned live-state work."
    fp: "939946523bbf"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T01:29:08.991Z"
  - id: DL-019
    kind: difficulty
    description: "The first repository format check rejected thirteen newly added BL-016 source and test files that required the existing Prettier formatter."
    fp: "5ed0fe41dbe1"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T01:34:40.079Z"
  - id: DL-020
    kind: difficulty
    description: "The required BL-012 regression passed component coverage but its designated real-process episode exceeded the existing ten-second cleanup bound after prior designated work."
    fp: "54eb8b44119e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T01:38:25.175Z"
  - id: DL-021
    kind: difficulty
    description: "The final task-status guard used an over-specific Markdown pattern and stopped before staging."
    fp: "6add89f3e39a"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-15T01:50:39.223Z"
system:
  compound:
    bubble_action: "all-save"
---

# Retro - BL-016 runtime-state implementation

All pending coordinator and Implement observations were retained for cross-session recurrence analysis.
