# Task Breakdown: Verify direct filesystem editing (Issue #8)

Derived from `01-action-plan.md`. Every task has acceptance criteria, explicit test
coverage requirements, and references to the relevant ADRs and core-components
(chiefly **ADR-0006** and **CORE-COMPONENT-0003**). Tasks are ordered by dependency.

Legend — **Status:** `todo`. **Complexity:** relative (S < M < L).

> Standing constraint for every task: honour ADR-0006 D5 (read-only launcher) and issue
> AC4 / PRD §28.6 — do not delete, move, rename, reset, clean, or otherwise mutate the
> project directory; the only permitted source change is adding new **test files** under
> `tests/launcher/` (T2/T3).

---

## Task T1: Author the filesystem-editing verification & manual-demo guide

- **Status:** todo
- **Complexity:** M
- **Dependencies:** none
- **Related ADRs:** ADR-0006 (D5 read-only launch, D6 exec handoff, D7 verification split), ADR-0005 (PORT/EDITOR_PORT precedent)
- **Related Core-Components:** CORE-COMPONENT-0003 (R4 friction/KEY_QUESTION, evidence conventions; `edit` verb contract)

### Description
Author `project/issues/8/implementation/README.md` — the verification guide and manual
demonstration procedure that frames every AC and the evidence to capture. It MUST:

- **Manual demo procedure (AC1, AC2):** step-by-step using the real operating surface —
  set `PROJECT_PATH` to a disposable fixture directory (NOT the repo), run
  `PROJECT_PATH=<dir> ./harness edit` (the `mode: exec` handoff → `sh scripts/launch-editor.sh`),
  open the folder in the browser at `127.0.0.1:${EDITOR_PORT:-8080}`, edit a known fixture
  file, save, then on the host `diff`/`stat` the same path to confirm the identical change;
  then stop the editor (Ctrl-C on the exec handoff) and re-`diff` to confirm only the
  intended edit persists.
- **Permission/ownership record template (AC3):** `ls -l` + `stat` (mode, uid/gid) of the
  fixture file and its directory **before** and **after** the edit, plus the uid the demo
  ran `code-server` as; a place to note any mode/owner change on save.
- **Save-semantics note (AC1 open question):** record whether the observed save was
  in-place write vs atomic write-temp+rename (inode change), and state that AC1's bar is
  **path-identity**, not inode-identity.
- **Workspace-state location (AC3 / AC4 open question):** record where `code-server`
  persists *editor* state (open tabs/layout — typically `~/.local/share/code-server`) and
  confirm it is **outside** `PROJECT_PATH`, so it is not mistaken for project mutation.
- **Path-type caveat:** record the exact `PROJECT_PATH` type used (real dir vs bind-mount
  vs symlink), since edits may surface differently on host vs container.
- **AC4 demo-safety rules:** an explicit "do not run" list — no `git clean`, `git reset
  --hard`, `rm`, `mv`, `rename` against the project directory during the demo.
- **Provisioning prerequisite:** state that `code-server` is absent in this devcontainer/CI
  (ADR-0006 D7) and the demo must run on a provisioned host; cross-reference the recorded
  harness friction (`.harness/friction.jsonl`, `verb: edit`).

### Acceptance Criteria
- [ ] `project/issues/8/implementation/README.md` exists and contains all sections above.
- [ ] The procedure uses only harness/real commands (`./harness edit`, `diff`, `stat`,
      `ls -l`) and invents no harness verb outside `.harness/contract.yml`.
- [ ] The AC3 permission/ownership record is a fillable before/after template, not prose.
- [ ] The document explicitly states AC1's acceptance bar is path-identity (not inode).
- [ ] The AC4 "do not run" destructive-command list is present and unambiguous.
- [ ] References ADR-0006 D5/D6/D7 and the read-only guarantee (DECISION-LOG #69, #71).

### Test Coverage
- **Documentation task — no automated unit test.** Verification is by review-checklist
  (CORE-COMPONENT-0003 code-review checklist): a reviewer confirms every AC-mapped section
  and the demo-safety list are present. No `node:test` coverage is required or possible for
  a procedure document. The procedure itself is exercised (and thereby validated) by T4.

---

## Task T2: Extend `tests/launcher/` with in-place-edit / no-copy / post-stop no-mutation tests

- **Status:** todo
- **Complexity:** M
- **Dependencies:** none (references T1 for framing; ordered before T3 which touches the same file)
- **Related ADRs:** ADR-0006 (D3 argument isolation, D5 read-only/no-mutation, D7 automated-test half), ADR-0005 (D7 `node:test` runner, zero third-party deps)
- **Related Core-Components:** CORE-COMPONENT-0003 (R16 durable regression suite; `test`/`verify` verb contract)

### Description
Add code-server-free `node:test` cases to `tests/launcher/launch-editor.test.ts` (TEST-L9..L11),
reusing the existing `snapshot()`, `makeProjectDir()`, `makeStub()`, and `runLauncher()`
helpers. A **stub `code-server`** on `PATH` stands in for the real editor — the tests prove
launcher/filesystem **mechanics**, not the real editor's behaviour (that stays manual, T4).
Each test carries a comment stating this scope limit so the evidence is not overclaimed.

- **TEST-L9 — path-identity / no-copy:** on a valid dir, assert the launcher hands
  `code-server` the **exact** `PROJECT_PATH` positional it was given (already partly TEST-L5),
  AND that no sibling/temp copy or staging directory is created anywhere the test can observe
  (the fixture's parent contains no new entries; `PROJECT_PATH` is unchanged). Proves AC1's
  "in place, not a copy" at the launch seam.
- **TEST-L10 — in-place edit lands on the same path, nothing else touched:** use a stub
  `code-server` that writes a known modification to `$PROJECT_PATH/README.md` (simulating a
  user save). Snapshot before/after; assert **exactly one** entry changed (README.md hash
  differs), the changed entry is at the **same relative path**, and every other entry
  (including `sub/a.txt`) is byte-for-byte identical with none added/removed. Proves the
  "identical change on the original path + AC4 nothing-else-mutated" model.
- **TEST-L11 — post-stop integrity:** use a stub `code-server` that makes the edit then
  exits 0 (edit-then-stop). After the process returns, assert the tree equals its expected
  post-edit state — only the intended edit persists; the launcher/exec handoff adds or
  removes nothing on stop. Proves AC2 at the mechanics level.

### Acceptance Criteria
- [ ] TEST-L9, TEST-L10, TEST-L11 added to `tests/launcher/launch-editor.test.ts`.
- [ ] Tests use only Node built-ins (`node:test`, `node:child_process`, `node:fs`,
      `node:crypto`) — zero third-party dependency (ADR-0005 D7).
- [ ] Tests are **code-server-free** (stub on `PATH`) and pass with `code-server` absent.
- [ ] TEST-L10 asserts single-entry change + path-identity + no add/remove via the existing
      `snapshot()` deep-equality helper.
- [ ] TEST-L11 asserts post-exit tree matches the expected post-edit snapshot exactly.
- [ ] Each new test comments that a stub stands in for the real editor and that the real
      user-edit round trip is proven manually (ADR-0006 D7).
- [ ] `./harness test` (wraps `npm test`, globs `tests/{app,launcher}/**`) includes the new
      tests, and they join the `./harness verify` aggregate (CORE-COMPONENT-0003 R6).

### Test Coverage
- **Adds automated `node:test` cases TEST-L9, TEST-L10, TEST-L11** — this task *is* test
  authoring. Coverage requirement: the three new cases run green via `./harness test` /
  `./harness verify` with `code-server` absent, and each asserts a non-mutation or
  path-identity invariant using the recursive `snapshot()` (path/type/mode/size/mtime +
  SHA-256 + symlink target). Detailed steps in `03-test-plan.md`.

---

## Task T3: Add the static workspace-state-isolation assertion

- **Status:** todo
- **Complexity:** S
- **Dependencies:** T2 (same test file; ordered after to avoid a reader/writer conflict)
- **Related ADRs:** ADR-0006 (D3 provider-argument isolation, D5 read-only), PRD §5.7
- **Related Core-Components:** CORE-COMPONENT-0003 (R16 regression suite)

### Description
Add TEST-L12, a **static** assertion (in the spirit of TEST-L8) that
`scripts/launch-editor.sh` passes **no** flag that would place `code-server` workspace/
editor state *inside* `PROJECT_PATH` — i.e., the launcher does not set `--user-data-dir`,
`--extensions-dir`, or a `--config`/`XDG_*` path rooted under `PROJECT_PATH`. This supports
AC4 and the research "workspace-state" open question: editor state must live **outside** the
project directory so it is never mistaken for project mutation. (The real default location
is confirmed empirically in the manual demo, T4; this test locks the launcher's contribution.)

### Acceptance Criteria
- [ ] TEST-L12 added to `tests/launcher/launch-editor.test.ts`.
- [ ] Asserts the launcher script contains no `--user-data-dir`, `--extensions-dir`, or
      project-rooted `--config` flag (regex over the script source, like TEST-L8).
- [ ] Passes with `code-server` absent (static read of the script; no launch).
- [ ] Comments cross-reference the manual workspace-state observation (T1/T4) as the
      empirical complement.

### Test Coverage
- **Adds automated static `node:test` case TEST-L12.** Coverage requirement: the case runs
  green via `./harness test` and asserts the launcher introduces no project-scoped editor-
  state flag. Steps in `03-test-plan.md`.

---

## Task T4: Execute the manual demo on a provisioned host and capture evidence

- **Status:** todo
- **Complexity:** M
- **Dependencies:** T1 (procedure + templates), T2 & T3 (automated backstop should be green first)
- **Related ADRs:** ADR-0006 (D6 exec handoff, D7 manual-demo verification of AC1–AC3, D4 loopback bind/EDITOR_PORT)
- **Related Core-Components:** CORE-COMPONENT-0003 (evidence conventions; `edit` verb `mode: exec`)

### Description
On a host where `code-server` is provisioned (absent in this devcontainer/CI — ADR-0006 D7),
execute the T1 procedure against a **disposable fixture directory** and capture evidence
under `project/issues/8/implementation/`:

- **AC1:** edit a known fixture file in the browser editor, save, then `diff`/`stat` the
  same host path; capture the before/after content and the identical change on the same
  **path**. Record the observed save mechanism (in-place vs atomic rename) and note inode
  behaviour.
- **AC2:** stop the editor (Ctrl-C on the `./harness edit` exec handoff); re-`diff`/`stat`;
  capture proof that only the intended edit persists and nothing else changed.
- **AC3:** capture `ls -l` + `stat` (mode, uid/gid) before/after, the uid `code-server` ran
  as, any ownership/mode change on save, the `code-server` workspace-state location (and
  confirmation it is outside `PROJECT_PATH`), and the `PROJECT_PATH` type (dir/bind-mount/
  symlink).
- **AC4:** confirm — and record — that no destructive git/filesystem command was run against
  the project directory during the demo.

If `code-server` cannot be provisioned for this cycle, record that blocker explicitly
(cross-referencing `.harness/friction.jsonl` `verb: edit`) and mark AC1–AC3 as
**manual-demo-pending**; the automated backstop (T2/T3) and inherited ADR-0006 D5 guarantee
still stand for AC4.

### Acceptance Criteria
- [ ] Evidence artifacts captured under `project/issues/8/implementation/` (diff/stat output,
      `ls -l` before/after, workspace-state path, save-mechanism note).
- [ ] AC1 proven: the edit appears at the identical original **path** (path-identity bar).
- [ ] AC2 proven: after stop, only the intended edit persists; tree otherwise unchanged.
- [ ] AC3 documented: permissions, ownership, uid, save semantics, workspace-state location,
      and path type all recorded.
- [ ] AC4 confirmed: no destructive command run; the demo mutated only the single edit.
- [ ] Any provisioning blocker is explicitly recorded (not silently skipped).

### Test Coverage
- **Manual verification (no automated test).** This is the ADR-0006 D7 manual half; it
  cannot be auto-verified without provisioning `code-server`. The automated backstop for the
  mechanics is T2/T3; the acceptance gate here is captured evidence reviewed against the T1
  templates (CORE-COMPONENT-0003 evidence + review-checklist conventions).

---

## Task T5: Escalation checkpoint — propose an ADR only if unexpected behaviour surfaced

- **Status:** todo
- **Complexity:** S
- **Dependencies:** T4
- **Related ADRs:** ADR-0006 (D5 read-only guarantee, D7 verification split, D8 no new core-component); ADR-0001 (template) if escalation triggers
- **Related Core-Components:** CORE-COMPONENT-0003 (friction/KEY_QUESTION); would-be new core-component only if a cross-cutting rule emerges (not anticipated)

### Description
Evaluate the T4 findings against the inherited guarantees. Decide the architectural outcome:

- **Expected outcome (no surprise):** edits land in place, stopping is clean, permissions/
  ownership are unchanged, and workspace-state is outside `PROJECT_PATH`. Then **no ADR is
  required**; record that conclusion with a one-line rationale and evidence references. The
  DECISION-LOG is unchanged.
- **Escalation trigger:** if T4 observed an **unexpected** mutation, ownership rewrite,
  permission change, or workspace-state written *inside* `PROJECT_PATH` that demands a design
  change (e.g. a uid-normalizing wrapper, or a decision to pin the code-server uid), then:
  1. Create a new ADR from the embedded ADR template (copy, never edit the template):
     next sequential number `ADR-0007-<slug>.md` under `project/architecture/ADR/`.
  2. Reference ADR-0006 as the related/superseded-context ADR.
  3. Update `project/architecture/ADR/DECISION-LOG.md`: add the ADR row and ≥1 decision
     record (imperative, verifiable) in the Decisions table.
  4. Record a friction entry via `./harness friction add` for any harness gap the surprise
     exposed (KEY_QUESTION).

### Acceptance Criteria
- [ ] A written determination exists: either "no ADR required" (with rationale + evidence
      refs) or a created `ADR-0007-<slug>.md`.
- [ ] If an ADR was created, it follows the embedded ADR template exactly, references
      ADR-0006, and the DECISION-LOG has the ADR row + ≥1 imperative decision record.
- [ ] If no ADR: DECISION-LOG is unchanged and the "no ADR required" rationale cites the
      T4 evidence.
- [ ] Any harness capability gap uncovered by the demo is recorded as friction (or the
      existing `verb: edit` entry is cited as still-sufficient).

### Test Coverage
- **Decision-gate task — no automated test.** Verification is by review: confirm the
  determination is recorded and, if escalated, that the ADR + DECISION-LOG update + decision
  record exist and conform to the template. No `node:test` applies to a governance decision.

---

## Dependency order

```
T1 ─┬─────────────► T4 ──► T5
    │               ▲
T2 ─┼──► T3 ────────┘
    └─(backstop for T4)
```

T1, T2 have no blockers and may proceed in parallel. T3 follows T2 (same file). T4 needs
T1 (procedure) and the T2/T3 backstop. T5 follows T4.
