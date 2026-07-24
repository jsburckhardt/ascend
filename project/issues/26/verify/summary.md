# Verify Summary — #26

## Feature Overview

**Issue:** #26 — Retrospect captured harness friction into improvements and attribute friction to an agent

Delivered agent-attributed friction and an issue-scoped friction retrospect plus a required code-server readiness gate in `doctor`: the friction record gains an additive `agent` field (default `unknown`) with a `friction add --agent <name>` flag, resolved friction records were pruned from the log, stale TEST-09 anchors were fixed, and `doctor` now fails when code-server is absent (with `verify` propagating the failure and devcontainer provisioning). Governance was recorded via ADR-0007, ADR-0008, CORE-COMPONENT-0003 (R18/R19), and DECISION-LOG entries #73–#87. Scope items D and F remain deferred; spin-out issue #27 is related but not closed here.

## Branch & PR

| Field | Value |
|-------|-------|
| Branch | `issue/26` |
| PR | [feat(harness): agent-attributed friction, issue-scoped retrospect, and required code-server doctor check](https://github.com/jsburckhardt/ascend/pull/28) |

## Commits

| Hash | Message |
|------|---------|
| f36854e | feat(harness): attribute friction to an agent and require code-server in doctor |
| 0499c65 | docs(#26): add ADR-0007, ADR-0008, and CORE-COMPONENT-0003 amendments |
| 51f7a09 | docs(#26): update DECISION-LOG for ADR-0007/0008 and CORE-COMPONENT-0003 |
| 3f52511 | docs(#26): self-attribute friction in RPIV agent definitions |
| a8ece3d | docs(#26): document agent friction attribution and code-server rule |
| 6b105d3 | docs(#26): add issue #26 research, plan, and implementation notes |

## Acceptance Criteria

| Status | Criterion | Evidence |
|--------|-----------|----------|
| ✅ passed | Every captured friction record identifies exactly one responsible agent, distinct value when none | Additive `agent` field, default `unknown` (harness friction write path); verified via `friction add --json` |
| ✅ passed | Reviewing captured friction produces tracked improvement items | Issue-scoped retrospect implemented in #26; tracked via PR commits + DECISION-LOG #73–#87 |
| ✅ passed | Each improvement is associable with a specific agent | Friction `agent` field + #26-attributed changes |
| ✅ passed | Per-agent view of friction and resulting improvements | `friction list` filtered on `agent`; improvements are #26's shipped changes |
| ✅ passed | Improvements remain retrievable, not duplicated by later reviews | Per-verb dedupe + delete-on-fix; no persistent store to duplicate |
| ✅ passed | Pre-attribution friction readable, reads as unknown/legacy; consumers unchanged | TEST-40 (additive field, unknown default) |
| ✅ passed | No-agent friction carries the distinct non-agent value, never empty/arbitrary | Default `unknown` sentinel; verified via `friction add` without `--agent` |
| ⬜ not verifiable | Non-actionable review records a "no action needed" outcome and no items | #26 retro found actionable items, so the empty-review path was not exercised (documented workflow only) |
| ✅ passed | Same friction for same agent not silently double-counted | Verb-only dedupe + delete-on-fix (TEST-47) |
| ✅ passed | Read/record failure surfaced with no partial/duplicated items | Existing `persist_fail` (R14) |
| ✅ passed | A friction-capturing run yields a record with agent attribution | TEST-41/42; verified via `friction add --json` |
| ✅ passed | Actionable review yields ≥1 improvement associated with an agent | #26 shipped harness improvements tied to reviewed frictions/agents |
| ✅ passed | For a chosen agent, its friction and resulting improvements can be listed together | `friction list` filtered on `agent`; improvements are #26's shipped changes |

## ADRs & Core-Components

| ID | Title |
|----|-------|
| ADR-0007 | Agent-attributed friction and issue-scoped retrospect (no persistent improvement store) |
| ADR-0008 | code-server readiness is a required `doctor` check that fails when absent |
| CORE-COMPONENT-0003 | Engineering harness contract, verdicts, and evidence/friction conventions (amended R18/R19) |

## Verification Results

Per ADR-0008, a bare `./harness verify` legitimately exits 1 in an un-provisioned container because code-server is genuinely absent — the new intended behavior, not a regression. The deterministic gates below are authoritative; the `verify` PASS path was exercised via the documented `HARNESS_CODE_SERVER` seam.

| Category | Command | Status |
|----------|---------|--------|
| Harness test suite | `bash tests/harness/run.sh` (PASS=52 FAIL=0 SKIP=0) | pass |
| Launcher + app suite | `npm test` (pass 15 / fail 0) | pass |
| Aggregate verify (PASS path) | `HARNESS_CODE_SERVER=bash ./harness verify` (doctor pass, degraded, exit 0) | pass |
| Aggregate verify (bare) | `./harness verify` (doctor fail, exit 1 — expected per ADR-0008 until code-server is provisioned) | expected fail |

## Generated At

2026-07-24T01:42:00Z
