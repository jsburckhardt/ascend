---
record_kind: "retro"
harness_version: "0.13.0"
branch: "feat/35-measure-mvp-performance"
repo: "https://github.com/jsburckhardt/ascend.git"
created_at: "2026-08-14T08:16:07.316Z"
agent: "agent"
plan_id: "35-bl-015-measure-mvp-navigation-and-startup-performance"
schema_version: "1.2"
retro_id: "2026-08-14T08:16:07.316Z-agent-487e2094"
started_at: "2026-08-14T07:05:37.901Z"
ended_at: "2026-08-14T08:17:19.689Z"
summary: "retro --drain BL-015 verification correction save (10 entries)"
entries:
  - id: "DL-001"
    kind: "difficulty"
    description: "GitHub CLI issue retrieval failed with HTTP 401 during verifier context loading."
    fp: "0bc0edc80ecc"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T07:05:37.901Z"
  - id: "CONF-001"
    kind: "confusion"
    description: "Evidence inventory command used an invalid source path and required correction."
    fp: "b717b48c2d01"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T07:06:29.677Z"
  - id: "DL-002"
    kind: "difficulty"
    description: "Required ripgrep executable is unavailable for verifier implementation inspection."
    fp: "3a6d95076344"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T07:06:57.501Z"
  - id: "DL-003"
    kind: "difficulty"
    description: "Canonical just verify failed during verifier validation and requires implementation triage."
    fp: "59a440849019"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T07:15:39.642Z"
  - id: "DL-004"
    kind: "difficulty"
    description: "The BL-015 failure-path test initially used an eyeballed warm timeout instead of the frozen contract value, causing a focused backtrack."
    fp: "5391a2e59bfb"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T07:22:42.524Z"
  - id: "DL-005"
    kind: "difficulty"
    description: "Governed boot reran the canonical suite and exposed a suite-load race where the workbench route acceptance test observed zero correlated lifecycle events despite its exact-one contract."
    fp: "c4151fbe3718"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T07:35:00.693Z"
  - id: "DL-006"
    kind: "difficulty"
    description: "Canonical verification reached BL-013 and found a suite-load race where externally terminating B did not transition the runtime manager from running to failed within its 30-second observation bound."
    fp: "db6d4aea6a46"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T07:44:30.574Z"
  - id: "CONF-002"
    kind: "confusion"
    description: "Installed harness 0.13.0 rejects the eng-harness-flow documented command observation kind and only advertises its legacy kind set"
    fp: "f746786cc54e"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T07:56:46.982Z"
  - id: "DL-007"
    kind: "difficulty"
    description: "BL-013 external crash proof killed a runtime before closing its browser context, allowing suite-load reconnect traffic to race the expected failed transition"
    fp: "487e209498de"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T07:56:52.648Z"
  - id: "DL-008"
    kind: "difficulty"
    description: "harness retro insights --json emitted an unfinished JSON document while validating the BL-015 drain"
    target: harness-itself
    severity: degrading
    workaround: "inspect the raw envelope and validate the retro record independently"
    suggested_encoding: "make retro insights stream or bound large historical records without truncating JSON"
    fp: "16636da59de5"
    disposition: kept
    system:
      compound:
        status: open
        source: agent-self
        first_seen_at: "2026-08-14T08:17:19.689Z"
---

# Retro - BL-015 verification correction

The final correction stabilized coverage and the BL-011 through BL-014 regression gates without weakening their acceptance contracts. GitHub authentication remains unavailable, and the installed harness observation-kind surface differs from the current flow doctrine.
