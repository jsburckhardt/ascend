# Research Brief: Verify direct filesystem editing

## GitHub Issue
- **Issue:** #8
- **Title:** Verify direct filesystem editing

## Scope Classification
- **Scope Type:** issue

This is a **verification-and-documentation** story (PRD §29 Prototype 0, item 5).
It exercises the launcher already delivered by issue #7 / ADR-0006 and records what
happens on disk when a contributor edits through `code-server`. It introduces **no
new runtime capability, no new provider seam, and no new abstraction** — so it is a
plain `issue`, not an `architecture_decision` or a `core_component`.

## Problem Statement

Prototype 0 asks (PRD §1438 "Questions", verbatim): *"Does editing through
`code-server` modify the existing project files directly and safely?"* Ascend's
whole premise (PRD §5.2) is that **the filesystem remains the source of truth** and
that projects *"can remain in their existing filesystem locations without being
imported, copied, or moved"* (PRD §142.7). Issue #7 gave us a launcher
(`scripts/launch-editor.sh`, harness `edit` verb) that opens **one** `code-server`
instance against a configured `PROJECT_PATH`, and ADR-0006 D5 guarantees the
*launcher's own* footprint on the target is nil. What has **not** yet been observed
is the round trip of an actual **user edit**: that a change made in the browser
editor lands on the *same* on-disk file (same path/inode, in place — not a copy or
shadow workspace), that stopping the editor process leaves the project bytes intact,
and what filesystem **permissions / ownership** result. This story closes that
observation gap and documents the safety caveats, satisfying the PRD §28.6 read-only
safety criterion for a lifecycle-adjacent operation.

## Existing Context

**Directly reused (do not re-litigate):**

- **ADR-0006 — code-server launch, argument isolation, read-only project-path
  safety** (`project/architecture/ADR/ADR-0006-...md`). Governs the launcher this
  story drives. Key inherited guarantees:
  - D3/D4: the folder is configured via `PROJECT_PATH`; the editor binds loopback
    only at `127.0.0.1:${EDITOR_PORT:-8080}` with `--auth none` (local-spike posture).
  - D5: **read-only, validate-only** launch — the launcher issues no
    `mkdir`/`rm`/`mv`/`rename`/`reset`/`clean` against the target on any code path;
    this already satisfies the launcher side of this issue's AC4/§28.6.
  - D6: `mode: exec` handoff — code-server runs as a child process and its exit code
    propagates; no supervision/restart.
  - D7: **verification split** — because code-server is a documented prerequisite
    that is **absent in this devcontainer/CI**, launch-behaviour ACs are proven by a
    **manual demonstration** while no-mutation/argument behaviours are proven by
    **code-server-free automated tests**. This story inherits exactly that split.
- **`scripts/launch-editor.sh`** — the single launcher seam. Opens the real
  `PROJECT_PATH` directory in place (`exec code-server "$PROJECT_PATH" --bind-addr
  ... --auth none`); it neither copies nor stages the tree, which is *why* edits are
  expected to hit the original files.
- **`tests/launcher/launch-editor.test.ts` (TEST-L1..L8)** — asserts fail-fast exit
  codes, the exact isolated argv, provider-flag isolation (PRD §5.7), and a
  recursive structural **snapshot** (path/type/mode/size/mtime + SHA-256 content
  hash + symlink target, via `lstatSync`) proving the *launcher* leaves the target
  byte-for-byte unchanged on every path. This is the reusable evidence pattern for
  AC4 and is a strong basis for an AC2 (post-stop integrity) automated check.
- **ADR-0005** — `mode: exec` handoff + `PORT`/`node:test` precedents (inherited via
  ADR-0006).
- **CORE-COMPONENT-0003** — harness contract; the `edit` verb is wired as contract
  data + a permitted structural dispatch entry (R8/R17). No harness change is
  expected for this story.

**Repository facts grounded via `./harness orient` / `./harness doctor`:**

- Stack: TypeScript + Node 22 + npm (ADR-0002); operating surface is `./harness`;
  `verify` wraps `npm run typecheck`; `test` wraps `npm test` (which now globs
  `tests/launcher/`). `orient` verdict: **pass**.
- `doctor` verdict: **degraded** — `node_modules` missing (`npm install` not yet run)
  and, per ADR-0006 D7, **`code-server` is not installed** (`command -v code-server`
  → none; not in `node_modules/.bin`; `.devcontainer/` declares no editor feature).
  `doctor` proves only Node/toolchain health, **not** editor-provider readiness. This
  gap was recorded via `./harness friction add --verb edit` (see Risks).

**Existing ADRs reviewed:** ADR-0001 (template), ADR-0002 (baseline stack/layout),
ADR-0003 (harness), ADR-0004 (interactive/handoff verbs), ADR-0005 (app-serve
runtime), ADR-0006 (code-server launch/safety) — plus DECISION-LOG.md decisions
#1–#72.

**Existing core-components reviewed:** CORE-COMPONENT-0001 (template),
CORE-COMPONENT-0002 (commit standards), CORE-COMPONENT-0003 (engineering harness
contract). None require change.

## Proposed ADRs

**None required.** No new architectural decision is needed. This story observes and
documents the behaviour of an already-decided seam (ADR-0006). The "edits land in
place" behaviour is an inherent property of code-server opening the real
`PROJECT_PATH` — it is a *verification finding*, not a design choice. The read-only
launch guarantee (AC4/§28.6) is already ADR-0006 D5/D9 and DECISION-LOG #69. Should
verification surface an *unexpected* mutation, ownership, or permission behaviour
that demands a design change (e.g. a wrapper to normalize ownership, or a decision to
run code-server as a specific uid), the Plan stage should escalate and **propose**
an ADR at that point — but the Research position is that none is anticipated.

## Proposed Core-Components

**None required.** No reusable cross-cutting contract emerges from a
single-provider, single-consumer verification story. ADR-0006 D8/DECISION-LOG #72
already deferred an `EditorProvider` abstraction as speculative (PRD §28.7); nothing
in #8 changes that calculus.

## Acceptance Criteria (from issue)

Extracted verbatim from the issue body's `ACCEPTANCE_CRITERIA` markers:

- [ ] A file edited in `code-server` shows the identical change in the original filesystem path
- [ ] Stopping the editor process leaves project files unchanged
- [ ] Filesystem permission behaviour is documented
- [ ] The operation must not delete, move, rename, reset, clean, or otherwise modify the project directory unless that filesystem mutation is the explicit purpose of the story

Mapping notes for the Plan stage (proposed, not prescriptive):

- **AC1 (edit lands on the original path)** — proven by **manual demonstration** on a
  code-server-provisioned host: edit a fixture file in the browser editor, then
  `diff`/`stat` the same host path and confirm the identical change on the same
  inode (no copy/shadow). Cannot be auto-verified without provisioning code-server
  (ADR-0006 D7).
- **AC2 (stop leaves files unchanged)** — manual: stop the editor (Ctrl-C on the
  `mode: exec` handoff) and confirm the tree matches its post-edit state (only the
  intended edit persists; nothing else is touched). The `tests/launcher` snapshot
  helper is a candidate for an automated "launcher/stop leaves target unchanged"
  assertion, but the *user-edit* half remains manual.
- **AC3 (permission behaviour documented)** — record `ls -l`/ownership before and
  after, note any mode/owner changes, and capture the code-server workspace-state
  location (Observability). Documentation deliverable, not a pass/fail gate.
- **AC4 (no project-dir mutation / §28.6)** — inherited from ADR-0006 D5 and the
  `tests/launcher` zero-mutation snapshot; the demo must also not `git clean`/reset
  or otherwise mutate the repo. This is the standard PRD §28.6 safety criterion.

## Risks and Open Questions

- **Provisioning gap (highest impact on schedule).** `code-server` is absent here and
  in CI (ADR-0006 D7), so AC1–AC3 **cannot be auto-verified** — they need a manual
  demo on a provisioned environment, with captured evidence under
  `project/issues/8/implementation/`. Recorded as harness friction (`--verb edit`):
  *doctor proves only Node/toolchain health, not editor-provider readiness or on-disk
  edit behaviour.*
- **Ownership / permission surprises (issue "Risks").** Running code-server under a
  different uid, via a container, or with a restrictive umask could change file
  ownership or mode on save. Open question: which user/uid the demo runs code-server
  as, and whether that alters ownership of edited files. Must be observed and
  documented (AC3), not assumed.
- **In-place vs. workspace-state.** code-server persists *editor* state (open tabs,
  layout) separately from the *project files*. Open question: where that
  workspace-state lands (Observability asks to record it) and confirmation that it is
  **outside** `PROJECT_PATH`, so it is not mistaken for project mutation under AC4.
- **Save semantics.** Editors may save via atomic replace (write-temp + rename),
  which changes the inode even though the path is unchanged. AC1 says "identical
  change in the original filesystem **path**" — the Plan should decide whether
  path-identity (not inode-identity) is the acceptance bar and document the save
  mechanism observed.
- **Symlinked / mounted `PROJECT_PATH`.** If the demo path is a bind-mount or symlink
  (common in devcontainers), edits may surface differently on host vs. container.
  Recommend documenting the exact path type used in the demo.
- **AC4 safety during the demo itself.** The verification procedure must avoid any
  destructive git/filesystem command (`git clean`, `reset --hard`, `rm`, `mv`) on the
  project directory — the demo observes, it does not mutate beyond the single
  intended edit.

## Handoff to Plan

- Scope is `issue`; **no ADR** and **no core-component** are required (propose an ADR
  only if verification uncovers an unexpected mutation/ownership behaviour needing a
  design change).
- Plan should produce a **manual demonstration procedure** (AC1–AC3) plus, where
  cheap, an **automated launcher/stop no-mutation assertion** reusing the
  `tests/launcher` snapshot pattern (AC2/AC4), and a **documentation deliverable**
  capturing permissions, ownership, save semantics, and workspace-state location.
- All work lands under `project/issues/8/`; evidence under
  `project/issues/8/implementation/`. Do not modify source under the read-only
  launcher guarantee unless a new automated test is the explicit deliverable.
