# Verify Summary — #8

## Feature Overview

**Issue:** #8 — Verify direct filesystem editing

Verification-and-documentation story (PRD §29 Prototype 0 item 5; §28.6 safety) confirming
that editing a file through the `code-server` launcher from issue #7 / ADR-0006 modifies the
original filesystem path directly and safely. The launcher/filesystem mechanics for AC1, AC2,
and AC4 are proven by new code-server-free `node:test` cases (TEST-L9..L12), all green, and the
zero-mutation guarantee (AC4) is fully verified. The real user-edit round trip (AC1–AC3) requires
a provisioned `code-server` host per ADR-0006 D7 and remains pending because `code-server` is
absent from this devcontainer/CI; a manual-demo guide and evidence templates are in place and no
live-editor evidence was fabricated. Scope is `issue`; no new ADR or core-component was created.

## Branch & PR

| Field | Value |
|-------|-------|
| Branch | `issue/8` |
| PR | [docs(#8): verify direct filesystem editing (automated backstop; live demo pending)](https://github.com/jsburckhardt/ascend/pull/21) |

## Commits

| Hash | Message |
|------|---------|
| 3037cbe | test(#8): add TEST-L9..L12 in-place-edit/no-copy/post-stop/workspace-state launcher assertions (T2,T3) |
| 4e18177 | docs(#8): verification & manual-demo guide + evidence templates + T5 no-ADR determination (T1,T4,T5) |
| 3fff847 | docs(#8): add research brief and plan artifacts for direct filesystem editing verification |
| 0634a9c | chore(#8): record edit-verb harness friction for on-disk edit observation gap |

## Acceptance Criteria

| Status | Criterion | Evidence |
|--------|-----------|----------|
| ⬜ not verifiable | A file edited in `code-server` shows the identical change in the original filesystem path | Mechanics green via TEST-L9/TEST-L10 (`tests/launcher/launch-editor.test.ts`); real editor round trip (TEST-M1) pending a provisioned code-server host |
| ⬜ not verifiable | Stopping the editor process leaves project files unchanged | Mechanics green via TEST-L11 (edit-then-stop snapshot); real stop demo (TEST-M2) pending a provisioned host |
| ⬜ not verifiable | Filesystem permission behaviour is documented | Capture procedure + AC3 record templates in `project/issues/8/implementation/README.md` §4.3/§5; actual values require live capture (TEST-M3) |
| ✅ passed | The operation must not delete, move, rename, reset, clean, or otherwise modify the project directory unless that filesystem mutation is the explicit purpose of the story | Verified by passing TEST-L9..L12 (in-place open, single-path edit, clean stop, no editor state in `PROJECT_PATH`) plus inherited ADR-0006 D5 read-only guarantee (DECISION-LOG #69) |

## ADRs & Core-Components

| ID | Title |
|----|-------|
| ADR-0006 | code-server launch, argument isolation, read-only project-path safety (D5/D6/D7) |
| ADR-0005 | application-serve runtime (`node:test` runner, zero third-party deps) |
| CORE-COMPONENT-0003 | engineering harness contract (`edit`/`test`/`verify` verbs; R16 regression suite; friction/KEY_QUESTION) |

No new ADRs or core-components were created; the DECISION-LOG is unchanged (last decision #72).

## Verification Results

| Category | Command | Status |
|----------|---------|--------|
| harness-verify | `./harness verify` | pass (degraded, exit 0: typecheck pass, test pass, doctor pass; lint/build unknown are pre-existing and unrelated to #8) |

## Generated At

2026-07-21T07:58:00Z
