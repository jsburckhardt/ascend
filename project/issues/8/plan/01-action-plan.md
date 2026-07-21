# Action Plan: Verify direct filesystem editing

## Feature
- **ID:** 8
- **Research Brief:** project/issues/8/research/00-research.md

## Summary

Issue #8 is a **verification-and-documentation** story (PRD §29 Prototype 0, item 5).
It closes the observation gap left by issue #7 / ADR-0006: does editing a file through
`code-server` modify the *existing* project file **in place** and **safely**? The
launcher (`scripts/launch-editor.sh`, harness `edit` verb) already opens the real
`PROJECT_PATH` directory positionally (no copy/stage), and ADR-0006 D5 guarantees the
launcher's own footprint on the target is nil. This story proves and documents the
**user-edit round trip** and the resulting **filesystem permission/ownership** behaviour.

The plan centres on two things, exactly as the research handoff prescribes:
1. **Automated tests** — extend the `tests/launcher/` no-mutation snapshot approach
   (TEST-L1..L8) with code-server-free assertions that cover, at the launcher/
   filesystem-mechanics level, "edits land in place on the same path", "nothing else is
   touched", "stopping the editor leaves files unchanged", and "no editor workspace-state
   is written into the project directory". A **stub `code-server`** on `PATH` stands in
   for the real binary (the established pattern), so these stay green in CI.
2. **A documentation deliverable** — a manual demonstration procedure plus a filesystem
   permission/ownership/save-semantics/workspace-state observation record (AC3), executed
   on a provisioned host where the real editor exists (ADR-0006 D7 verification split).

## ADRs Created

**None.** No new architectural decision is required, and I concur with the research
brief's conclusion.

Reasoning (recorded so it is not re-litigated):
- **"Edits land in place"** is an *inherent property* of `code-server` opening the real
  `PROJECT_PATH` directory (the launcher passes the path positionally with no copy/stage;
  see `scripts/launch-editor.sh:61` and TEST-L5). It is a **verification finding**, not a
  design choice.
- **The read-only / no-mutation launch guarantee (AC4 / PRD §28.6)** is *already* decided:
  ADR-0006 D5 and DECISION-LOG #69 ("Prohibit the launcher from creating, deleting, moving,
  renaming, resetting, or cleaning the project directory").
- **The verification split** (AC1–AC3 manual demo on a provisioned host; AC4 + mechanics
  automated) is *already* decided: ADR-0006 D7 and DECISION-LOG #71.
- No new runtime capability, provider seam, or cross-cutting behaviour is introduced.

**Conditional escalation (Task T5):** Per the research handoff and ADR-0006 D7, if the
manual demo surfaces an **unexpected** mutation, ownership, or permission behaviour that
demands a design change (e.g. code-server rewriting file ownership under a different uid,
or persisting workspace-state *inside* `PROJECT_PATH`), the plan escalates: a new ADR is
**proposed** from the embedded ADR template, the DECISION-LOG is updated, and ≥1 decision
record is added. Research anticipates none; this is a safety valve, not a planned artifact.

## Core-Components Created

**None.** No reusable cross-cutting contract emerges from a single-provider,
single-consumer verification story. ADR-0006 D8 / DECISION-LOG #72 already deferred an
`EditorProvider` abstraction as speculative (PRD §28.7); nothing in #8 changes that.

## Decision Log

No entries added — no ADR or core-component was created. The DECISION-LOG remains as-is
(last decision #72, ADR-0006). It will be updated **only** if Task T5 escalates.

## Operating Surface (harness)

Verbs enumerated from `.harness/contract.yml` (the authoritative data `./harness orient`
surfaces; the harness is not executable in this planning-only context). Relevant real verbs:

| Verb | Role in this issue | Notes |
|------|--------------------|-------|
| `./harness orient` | Scope the stack / setup entry point | native, `--json` |
| `./harness status` | Scope current repo/contract state | native, `--json` |
| `./harness doctor` | Environment health (Node/toolchain) | **degraded** here: `node_modules` missing + `code-server` absent; proves Node health only, not editor readiness |
| `./harness test` | Run the `node:test` launcher + app suites | wraps `npm test`; runs `tests/{app,launcher}/**` — the automated tests (T2/T3) land here |
| `./harness verify` | Aggregate static gate | wraps `npm run typecheck`; folds in `test` — the automated backstop for AC4/mechanics |
| `./harness edit` | Launch code-server (manual demo, AC1–AC3) | `mode: exec` handoff → `npm run edit` → `sh scripts/launch-editor.sh`; requires a provisioned `code-server` |
| `./harness friction add` | Record an inferred capability gap (KEY_QUESTION) | the #8 `edit` gap is already recorded (`.harness/friction.jsonl` line 28); no new gap in planning |

Execution verbs (`lint`, `test`, `build`, `boot`, `verify`, `clean`) are **not run** during
planning; tasks reference them as the commands the implementer/verifier will execute.

**Harness capability gap:** already recorded by Research on 2026-07-21T07:39:12Z
(`.harness/friction.jsonl` line 28, `verb: edit`): *doctor proves only Node/toolchain
health, not editor-provider readiness or on-disk edit behaviour; no harness verb observes
a user edit landing on the same inode, process-stop integrity, or resulting permissions.*
No new gap emerged during planning, so no duplicate entry is added.

## Implementation Tasks

Ordered by dependency (blocked tasks follow their dependencies). Full detail, acceptance
criteria, and test-coverage requirements are in `02-task-breakdown.md`.

- **T1 — Author the filesystem-editing verification & manual-demo guide** (docs; AC1–AC4).
  Manual demo procedure + AC3 permission/ownership/save-semantics/workspace-state
  observation record + AC4 demo-safety rules. Establishes the evidence templates the
  manual run (T4) fills in. _Complexity: M._
- **T2 — Extend `tests/launcher/` with in-place-edit / no-copy / post-stop no-mutation
  tests** (automated; AC1, AC2, AC4). Adds TEST-L9..L11 using a stub `code-server`,
  reusing the existing `snapshot()` helper. _Complexity: M. Depends on: none (references
  T1 framing)._
- **T3 — Add the static workspace-state-isolation assertion** (automated; AC4). Adds
  TEST-L12 proving the launcher passes no flag that would place editor state inside
  `PROJECT_PATH`. _Complexity: S. Depends on: T2 (same test file; ordered to avoid conflict)._
- **T4 — Execute the manual demo on a provisioned host and capture evidence** (manual;
  AC1, AC2, AC3). Requires a real `code-server`; fills the T1 templates with `diff`/`stat`/
  `ls -l` proof, save-mechanism observation, and workspace-state location. _Complexity: M.
  Depends on: T1, and T2/T3 as automated backstop._
- **T5 — Escalation checkpoint: propose an ADR only if unexpected behaviour surfaced**
  (decision gate; AC3/AC4). Evaluate T4 findings against ADR-0006 D5/D7; propose an ADR +
  DECISION-LOG entry + ≥1 decision record **only if** unexpected mutation/ownership/
  permission behaviour was observed; otherwise record "no ADR required" with evidence
  references. _Complexity: S. Depends on: T4._

## Traceability (AC → tasks → evidence)

| AC | Proven by | Tasks | Evidence location |
|----|-----------|-------|-------------------|
| AC1 edit lands on original path | Manual demo (primary) + automated in-place-edit mechanics (backstop) | T4, T2 | `project/issues/8/implementation/` + `tests/launcher/` |
| AC2 stop leaves files unchanged | Manual demo (primary) + automated post-stop no-mutation (backstop) | T4, T2 | `project/issues/8/implementation/` + `tests/launcher/` |
| AC3 permission behaviour documented | Documentation deliverable + captured observations | T1, T4 | `project/issues/8/implementation/` |
| AC4 no project-dir mutation (§28.6) | ADR-0006 D5 (inherited) + no-mutation snapshot + workspace-state isolation + demo-safety rules | T2, T3, T1 | `tests/launcher/` + `project/issues/8/implementation/` |

## Guardrails

- **Do not modify source under the read-only launcher guarantee** except where a new
  automated **test file** is the explicit deliverable (T2/T3, under `tests/launcher/`).
  `scripts/launch-editor.sh` and `src/` are not changed.
- **AC4 during the demo itself:** the manual procedure must never run a destructive
  git/filesystem command (`git clean`, `git reset --hard`, `rm`, `mv`, `rename`) against
  the project directory. The demo observes; it mutates only the single intended edit.
- **Save-semantics decision (open question in research):** AC1's bar is **path-identity**
  ("identical change in the original filesystem **path**"), not inode-identity — editors
  may save via atomic write-temp+rename, which changes the inode while preserving the path.
  T1/T4 document the observed save mechanism explicitly.
- All work lands under `project/issues/8/`; captured evidence under
  `project/issues/8/implementation/`.
