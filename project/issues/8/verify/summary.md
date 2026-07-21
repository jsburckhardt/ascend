# Verify Summary — #8

## Feature Overview

**Issue:** #8 — Verify direct filesystem editing

Verification-and-documentation story (PRD §29 Prototype 0 item 5; §28.6 safety) confirming
that editing a file through the `code-server` launcher from issue #7 / ADR-0006 modifies the
original filesystem path directly and safely. The launcher/filesystem mechanics for AC1, AC2,
and AC4 are proven by new code-server-free `node:test` cases (TEST-L9..L12), all green, and the
zero-mutation guarantee (AC4) is fully verified. The **real user-edit round trip (AC1–AC3) was
demonstrated live on 2026-07-21** against a transiently-provisioned code-server 4.129.0 (not a
repo dependency, per ADR-0006 D7): a real browser drove the running Workbench to edit and save a
file, a real integrated terminal ran in the project cwd, and before/after-stop snapshots proved
byte-identity — all four ACs are met with captured evidence (impl README §4.6/§5/§6). Scope is
`issue`; no new ADR or core-component was created.

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
| ✅ passed | A file edited in `code-server` shows the identical change in the original filesystem path | **Live demo 2026-07-21** (code-server 4.129.0, transient): editor edit of `AC1.txt` saved via Ctrl+S landed the marker on the original path `/tmp/demo-proj8/AC1.txt`, inode preserved — impl README §4.6/§6. Mechanics also green via TEST-L9/TEST-L10 |
| ✅ passed | Stopping the editor process leaves project files unchanged | **Live demo**: pre-stop vs post-stop recursive `lstat`+SHA-256 snapshots byte-identical (incl. mtime+inode); SIGTERM freed the port with no stray process — §4.6/§6. Mechanics also green via TEST-L11 |
| ✅ passed | Filesystem permission behaviour is documented | **Live demo**: mode `0644` and owner `vscode:vscode` preserved through edit; in-place write (inode unchanged); workspace-state under transient `HOME`, outside `PROJECT_PATH`; `PROJECT_PATH` a real dir — impl README §5 |
| ✅ passed | The operation must not delete, move, rename, reset, clean, or otherwise modify the project directory unless that filesystem mutation is the explicit purpose of the story | **Live demo**: full-lifecycle diff vs initial snapshot showed 0 added / 0 removed entries and only the intended `AC1.txt` edit, no mode/owner/type change on any entry — §4.6/§6. Also verified by passing TEST-L9..L12 plus inherited ADR-0006 D5 (DECISION-LOG #69) |

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

2026-07-21T07:58:00Z (updated 2026-07-21T10:50:00Z after the live AC1–AC3 demonstration)
