# Code Review: Verify direct filesystem editing

## Summary
- **Issue:** #8
- **Title:** Verify direct filesystem editing
- **Base Branch:** main
- **Feature Branch:** issue/8
- **Reviewer Model:** GPT-5.6 Sol
- **Verdict:** APPROVE
- **Blocking Findings:** 0

## Repository Understanding

Ascend routes every change through the RPIV pipeline (Research → Plan → Implement →
Verify), governed by `AGENTS.md`. Architectural decisions live only in ADRs and reusable
cross-cutting behaviour only in core-components, both registered in the DECISION-LOG. The
single operating surface is `./harness` (ADR-0003 / CORE-COMPONENT-0003), which wraps
project commands and returns one verdict per verb.

Issue #8 is a Prototype-0 **verification-and-documentation** story built directly on the
code-server launcher delivered by issue #7 / **ADR-0006** (`scripts/launch-editor.sh`, the
`edit` `mode: exec` harness verb, and the `tests/launcher/` suite). Its purpose is to
confirm that editing through `code-server` mutates the *original* filesystem path in place
and safely, and to document the resulting permission behaviour. ADR-0006 D7
(DECISION-LOG #71) already fixes the verification split for this work: launch-behaviour ACs
(AC1–AC3) are proven by a **manual demonstration on a code-server-provisioned host**, while
the no-mutation guarantee (AC4) is proven by **code-server-free automated tests**. Scope is
`issue`; Research and Plan both correctly concluded no new ADR or core-component is required.

## Scope of Change

The changeset (`git diff origin/main...HEAD`, commits 8bc7b23, c05834a, 4db5476, 00658b4,
508b7d6) is documentation + one test file + one friction record — **no application source
or launcher script is modified**, honouring the ADR-0006 D5 read-only guarantee and the
plan's guardrail (only new test files permitted):

- `tests/launcher/launch-editor.test.ts` — adds TEST-L9..L12 plus two helpers
  (`makeEditingStub`, `diffSnapshots`); +181 lines.
- `project/issues/8/implementation/README.md` — T1 verification/manual-demo guide + T4
  evidence templates (`<PENDING>`) + T5 no-ADR determination.
- `project/issues/8/research/00-research.md`, `plan/01-03`, `verify/summary.md` — pipeline
  artifacts.
- `.harness/friction.jsonl` — one `verb: edit` capability-gap record.

## Acceptance Criteria Assessment
| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC1 — edited file shows the identical change on the original path | Backstop met; live demo pending (accepted) | TEST-L9 (exact `PROJECT_PATH` positional, no copy/stage) and TEST-L10 (single-path README.md edit lands in place) pass. Real editor round trip (TEST-M1) legitimately requires code-server, absent here per ADR-0006 D7; procedure documented, evidence template `<PENDING>`. |
| AC2 — stopping the editor leaves project files unchanged | Backstop met; live demo pending (accepted) | TEST-L11 (edit-then-stop snapshot: only the intended edit persists) passes. Real stop demo (TEST-M2) pending a provisioned host. |
| AC3 — filesystem permission behaviour documented | Procedure/template delivered; live values pending (accepted) | README §4.3/§5 provide a fillable before/after permission/ownership/uid/save-semantics/workspace-state record; actual observed values require the live capture (TEST-M3) and remain `<PENDING>`. |
| AC4 — no delete/move/rename/reset/clean/other mutation of the project dir | **Met** | TEST-L9..L12 pass (in-place open, single-path edit, clean stop, no editor-state flag rooted under `PROJECT_PATH`); inherited launcher guarantee ADR-0006 D5 / DECISION-LOG #69; launcher script confirmed validate-only (`scripts/launch-editor.sh:30-56`). Checked `[x]` on the issue. |

The verifier honestly left AC1–AC3 unchecked on the issue and fabricated no live-editor
evidence. AC1–AC3 are unmet only because of the accepted, pre-existing environment
constraint (code-server absent), not an implementation defect — consistent with ADR-0006 D7.

## Architecture Conformance

- **ADR-0006 D5 (read-only launcher):** upheld. No source/launcher mutation; the only code
  change is a new test file, exactly as the plan permits. `scripts/launch-editor.sh` uses
  non-mutating `test`-based validation and `exec` handoff only.
- **ADR-0006 D7 (verification split):** followed precisely — AC4 + mechanics automated,
  AC1–AC3 manual with pending templates, no overclaim.
- **ADR-0005 D7 (zero third-party deps, `node:test`):** upheld — new tests use only
  `node:test`, `node:child_process`, `node:fs`, `node:crypto`, `node:os`, `node:path`.
- **CORE-COMPONENT-0003:** new tests fold into `./harness test` / `./harness verify`
  (R16 regression suite); the `edit`-verb friction gap is recorded per R4. No harness verb
  wiring or verdict logic changed.
- **No new ADR/core-component:** T5 determination correctly records "no ADR required"; the
  DECISION-LOG is unchanged (last decision #72), matching the Research/Plan conclusion.

## Test Coverage Assessment

Corroborated locally (read-only): `./harness verify` → `degraded` (exit 0; `typecheck`
pass, `test` pass, `doctor` pass; `lint`/`build` `unknown` are pre-existing and unrelated to
#8). The launcher suite runs green: `# tests 15  # pass 15  # fail 0`, including TEST-L9
(ok 12), TEST-L10 (ok 13), TEST-L11 (ok 14), TEST-L12 (ok 15).

The automated backstop is well-targeted: `snapshot()` records path/type/mode/size/mtime +
SHA-256 + symlink target, and `diffSnapshots` asserts *exactly one* changed entry with none
added/removed, giving genuine path-identity and no-mutation coverage rather than a shallow
check. Each new test carries an explicit stub-is-not-the-real-editor scope caveat, so the
evidence is not overclaimed. Manual TEST-M1..M4 are specified with fillable evidence tables,
correctly deferred to a provisioned host.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| F1 | minor | `project/issues/8/implementation/README.md` §5–§6 | AC3's actual permission/ownership values and AC1/AC2 live evidence remain `<PENDING>`; the story is not end-to-end complete until the live-host demo (T4/TEST-M1..M4) is executed. This is correctly scoped and honestly disclosed per ADR-0006 D7, not an implementation defect. | Track the live-host manual demo as a required follow-up before the story is considered fully closed; fill §5/§6 templates on a provisioned host and re-check AC1–AC3 on the issue. |
| F2 | nit | `tests/launcher/launch-editor.test.ts:437-441` (TEST-L12 `--config` regex) | The `--config` / `XDG_*` static assertions are coarse regexes; they pass because the launcher sets none of these flags, but they would not catch every conceivable project-rooted-state variant. | Acceptable as a regression lock mirroring TEST-L8; no change required. Optionally tighten if a future launcher change introduces config paths. |
| F3 | nit | `tests/launcher/launch-editor.test.ts` (TEST-L10/L11) | Path-identity is asserted indirectly (the editing stub writes to `$1/README.md`; a wrong positional would fail the hash-change assertion) rather than also re-asserting `argv[0]`. TEST-L9 covers the positional directly, so coverage is adequate. | No change required. |

## Verdict Rationale

No blocking or major findings. The changeset is complete, correct, and within architectural
boundaries for everything that CAN be delivered in this environment: AC4 is fully verified
by passing automated tests plus the inherited ADR-0006 D5 guarantee, and the AC1/AC2/AC4
launch-and-edit mechanics are locked by a well-constructed, code-server-free snapshot suite
(15/15 green). AC1–AC3 remain unchecked only because the live code-server demo is
legitimately impossible in this devcontainer/CI — an accepted constraint established by the
team's own ADR-0006 D7, not a defect. The implementation did not fabricate live evidence and
did not overclaim: the manual demo is honestly marked `manual-demo-pending` with fillable
templates, and the issue leaves AC1–AC3 unchecked. Per the operator's explicit scoping, the
legitimately-pending live-host demo is not treated as a blocking defect. Verdict: **APPROVE**,
with F1 tracked as a required follow-up to fully close AC1–AC3 end-to-end.

## Suggested Follow-ups

1. Execute the T4 manual demonstration (TEST-M1..M4) on a code-server-provisioned host,
   fill the README §5/§6 evidence tables, and re-check AC1–AC3 on issue #8.
2. Consider the deferred `./harness doctor` code-server readiness diagnostic
   (degraded, never fail) noted in ADR-0006 D7 and the recorded `edit` friction entry, in a
   future story.

---

## Follow-up Resolution (2026-07-21, post-review)

**F1 is RESOLVED.** The T4 live demonstration (TEST-M1..M4) was executed against a
transiently-provisioned **code-server 4.129.0** (standalone release on `PATH`, not a repo
dependency, per ADR-0006 D7). A real browser (Chromium) drove the running Workbench to edit and
**save** `AC1.txt`, whose marker landed on the original path with the inode preserved (**AC1**); a
real integrated `zsh` terminal ran in the project cwd `/tmp/demo-proj8` emitting `TERMINAL_OK_42`;
pre/post-stop recursive `lstat`+SHA-256 snapshots were **byte-identical** (**AC2**); mode `0644`
and owner `vscode:vscode` were preserved with workspace-state kept outside `PROJECT_PATH`
(**AC3**); and the full-lifecycle diff showed 0 added/removed entries and only the intended edit
(**AC4**). Captured evidence is in `project/issues/8/implementation/README.md` §4.6/§5/§6 and the
`verify/summary.md` acceptance-criteria table. All four ACs are now met with real evidence; the
verdict stands at **APPROVE** with no remaining blocking follow-ups.
