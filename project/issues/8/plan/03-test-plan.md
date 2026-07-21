# Test Plan: Verify direct filesystem editing (Issue #8)

Derived from `02-task-breakdown.md`. Covers the automated `node:test` cases that extend the
launcher no-mutation snapshot suite (code-server-free, stub-backed) and the manual
demonstration that proves AC1–AC3 on a provisioned host (ADR-0006 D7 verification split).

## Conventions & operating surface

- **Runner:** Node built-in `node:test`, run via `./harness test` (wraps `npm test`, which
  globs `tests/{app,launcher}/**/*.test.ts`). The automated cases also fold into
  `./harness verify` (CORE-COMPONENT-0003 R6 aggregate). *Planning does not run these verbs.*
- **Zero third-party dependency** (ADR-0005 D7): only `node:test`, `node:child_process`,
  `node:fs`, `node:crypto`, `node:os`, `node:path`.
- **Stub `code-server`:** the established `makeStub()` pattern puts a fake `code-server` on
  the child `PATH`, so tests prove **launcher/filesystem mechanics** with the real binary
  absent. Scope caveat (asserted in comments): a stub is NOT the real editor; the real
  user-edit round trip is proven by the manual demo (T4), not by these tests.
- **Reused helpers** (already in `tests/launcher/launch-editor.test.ts`): `snapshot()`,
  `makeProjectDir()`, `makeStub()`, `runLauncher()`, `stubArgv()`. Fixtures live under the OS
  temp dir, never the repo tree.
- **AC1 acceptance bar:** path-identity (identical change on the original **path**), not
  inode-identity — atomic save may change the inode while preserving the path.

## Coverage matrix

| Test | Type | Task | AC | code-server needed? |
|------|------|------|-----|---------------------|
| TEST-L9  | Automated (unit, mechanics) | T2 | AC1, AC4 | No (stub) |
| TEST-L10 | Automated (unit, mechanics) | T2 | AC1, AC4 | No (stub) |
| TEST-L11 | Automated (unit, mechanics) | T2 | AC2, AC4 | No (stub) |
| TEST-L12 | Automated (static) | T3 | AC4 | No (static read) |
| TEST-M1  | Manual demonstration | T4 | AC1 | **Yes** (provisioned host) |
| TEST-M2  | Manual demonstration | T4 | AC2 | **Yes** |
| TEST-M3  | Manual demonstration | T4 | AC3 | **Yes** |
| TEST-M4  | Manual demonstration | T4 | AC4 | **Yes** |

---

## Test TEST-L9: Launcher passes the exact PROJECT_PATH positional (no copy / in place)

- **Type:** Automated (`node:test`, mechanics)
- **Task:** T2
- **Priority:** High

### Setup
- `makeProjectDir()` → a fixture project (`README.md`, `sub/a.txt`) under the OS temp dir.
- `makeStub()` → a stub `code-server` on `PATH` that logs its argv and exits 0.
- Snapshot the fixture's **parent** directory entries before the run.

### Steps
1. `runLauncher({ projectPath: proj, pathDir: binDir })`.
2. Read `stubArgv(logPath)`.
3. Re-list the fixture's parent directory entries.

### Expected Result
- Exit status `0` (stub hands off).
- `stubArgv[0]` is the **exact** `proj` path passed in — not a copy, staging, or temp path.
- No new sibling/staging/copy directory appeared alongside the fixture (parent entry set
  unchanged).
- `snapshot(proj)` equals the pre-run snapshot (launcher touched nothing). Proves AC1
  "in place, not a copy" at the launch seam and AC4 non-mutation.

---

## Test TEST-L10: Simulated in-place edit lands on the same path; nothing else touched

- **Type:** Automated (`node:test`, mechanics)
- **Task:** T2
- **Priority:** High

### Setup
- `makeProjectDir()` → fixture project.
- A **custom stub `code-server`** that, when invoked, writes a known new content to
  `$PROJECT_PATH/README.md` (simulating a user save to the opened folder) then exits 0.
- `before = snapshot(proj)`; compute the expected post-edit snapshot = `before` with only the
  `README.md` entry's `hash` (and `size`/`mtimeMs`) updated to the edited content.

### Steps
1. `runLauncher({ projectPath: proj, pathDir: stubBinDir })` (stub receives `proj` positionally).
2. `after = snapshot(proj)`.
3. Diff `after` against `before`.

### Expected Result
- Exit status `0`.
- Exactly **one** entry differs: `README.md` (its SHA-256 hash changed).
- The changed entry is at the **same relative path** (`README.md`) — path-identity, no
  new/renamed file.
- Every other entry (`.`, `sub`, `sub/a.txt`) is byte-for-byte identical; none added/removed.
- Proves AC1 (edit lands on the original path) and AC4 (nothing else mutated) at the
  filesystem-mechanics level. Comment records that the stub stands in for the real editor.

---

## Test TEST-L11: Post-stop integrity — after the editor exits, only the intended edit persists

- **Type:** Automated (`node:test`, mechanics)
- **Task:** T2
- **Priority:** High

### Setup
- `makeProjectDir()` → fixture project.
- A stub `code-server` that writes the known edit to `$PROJECT_PATH/README.md` **then exits 0**
  (edit-then-stop, exercising the `exec` handoff exit path).
- `before = snapshot(proj)`; expected post-edit snapshot as in TEST-L10.

### Steps
1. `runLauncher(...)` and wait for it to return (process fully exited).
2. `afterStop = snapshot(proj)`.
3. Compare `afterStop` to the expected post-edit snapshot.

### Expected Result
- Launcher/stub exit status `0` (exit code propagates through the handoff, ADR-0006 D6).
- `afterStop` equals the expected post-edit snapshot exactly: the single intended edit
  persists; no file added, removed, reset, or otherwise changed by process stop.
- Proves AC2 (stopping the editor leaves files unchanged apart from the saved edit) at the
  mechanics level. Comment records the stub-vs-real scope caveat (real stop proven by TEST-M2).

---

## Test TEST-L12: Launcher writes no editor workspace-state into PROJECT_PATH

- **Type:** Automated (`node:test`, static — like TEST-L8)
- **Task:** T3
- **Priority:** Medium

### Setup
- Read `scripts/launch-editor.sh` source into a string (no launch, `code-server` not needed).

### Steps
1. Assert the script does **not** contain `--user-data-dir`.
2. Assert the script does **not** contain `--extensions-dir`.
3. Assert the script does **not** contain a `--config` (or `XDG_DATA_HOME`/`XDG_CONFIG_HOME`)
   value rooted under `$PROJECT_PATH`.

### Expected Result
- All assertions pass: the launcher introduces no flag that would place code-server
  workspace/editor state inside the project directory.
- Supports AC4 and the "workspace-state" open question — editor state stays outside
  `PROJECT_PATH` and is not mistaken for project mutation. The empirical default location is
  confirmed by TEST-M3.

---

## Test TEST-M1: Real edit shows the identical change on the original filesystem path

- **Type:** Manual demonstration (requires provisioned `code-server`)
- **Task:** T4
- **Priority:** High

### Setup
- A host with `code-server` installed (absent in this devcontainer/CI — ADR-0006 D7).
- A **disposable fixture directory** (NOT the repo) as `PROJECT_PATH`, with a known file,
  e.g. `note.txt` containing a recorded baseline line.
- Capture `stat note.txt` (path, inode, mode, mtime) and its content beforehand.

### Steps
1. `PROJECT_PATH=<fixture> ./harness edit` (exec handoff → `sh scripts/launch-editor.sh` →
   `code-server <fixture> --bind-addr 127.0.0.1:${EDITOR_PORT:-8080} --auth none`).
2. Open `127.0.0.1:8080` in the browser; open the folder; edit `note.txt` (add a known line);
   save.
3. On the host, `diff` the recorded baseline against the current `note.txt`; `stat note.txt`.

### Expected Result
- The host `note.txt` at the **same path** shows the exact change made in the browser.
- The save mechanism is recorded (in-place vs atomic write-temp+rename; note any inode
  change) — acceptance bar is **path-identity**, so an inode change from atomic save still
  passes AC1 as long as the path and content match.
- Evidence (diff + stat before/after) captured under `project/issues/8/implementation/`.

---

## Test TEST-M2: Stopping the editor process leaves project files unchanged

- **Type:** Manual demonstration (requires provisioned `code-server`)
- **Task:** T4
- **Priority:** High

### Setup
- Continue from TEST-M1 (fixture with the one saved edit).
- Record the full fixture tree state (e.g. `find` + `sha256sum` per file) post-edit.

### Steps
1. Stop the editor: `Ctrl-C` on the `./harness edit` exec handoff (or terminate the
   code-server process).
2. Re-record the fixture tree state (`find` + `sha256sum`).
3. Compare post-stop state to the post-edit state.

### Expected Result
- Post-stop tree equals the post-edit tree exactly: only the intended edit persists; stopping
  the editor deletes/moves/resets nothing.
- Exit code of the handoff is observed (propagated, ADR-0006 D6).
- Evidence captured under `project/issues/8/implementation/`.

---

## Test TEST-M3: Filesystem permission / ownership behaviour documented

- **Type:** Manual demonstration (requires provisioned `code-server`)
- **Task:** T4
- **Priority:** High

### Setup
- Continue from TEST-M1/M2.
- Record `ls -l` and `stat` (mode, uid, gid) of `note.txt` and the fixture directory
  **before** editing; note the uid `code-server` runs as; note the `PROJECT_PATH` type
  (real dir / bind-mount / symlink).

### Steps
1. After the save (TEST-M1), re-capture `ls -l` + `stat` (mode, uid, gid) of `note.txt`.
2. Identify the `code-server` workspace-state location (e.g. `~/.local/share/code-server`)
   and confirm it is **outside** `PROJECT_PATH`.
3. Record any mode/owner change on save and the observed save semantics.

### Expected Result
- A completed AC3 record exists under `project/issues/8/implementation/`: before/after mode
  and ownership, the running uid, the save mechanism, the workspace-state location (confirmed
  outside `PROJECT_PATH`), and the path type.
- Any surprising permission/ownership change is flagged for the T5 escalation checkpoint.
- This is a documentation gate, not pass/fail on specific bits — the deliverable is the
  captured, reviewed record.

---

## Test TEST-M4: The demo performs no project-directory mutation (AC4 / PRD §28.6)

- **Type:** Manual demonstration (safety confirmation)
- **Task:** T4
- **Priority:** High

### Setup
- The fixture directory under version awareness (e.g. a `git status`/`find` baseline) so any
  unintended change is detectable.

### Steps
1. Throughout TEST-M1..M3, run **no** destructive git/filesystem command against the project
   directory (`git clean`, `git reset --hard`, `rm`, `mv`, `rename` are prohibited).
2. After the demo, compare the fixture tree to its pre-demo baseline minus the single
   intended edit.

### Expected Result
- The only change to the project directory is the single intended edit; nothing was deleted,
  moved, renamed, reset, or cleaned. Confirms AC4 / PRD §28.6, complementing the inherited
  ADR-0006 D5 launcher guarantee and the automated no-mutation snapshots (TEST-L9..L11).
- Confirmation recorded under `project/issues/8/implementation/`.

---

## Exit criteria for the test plan

- **Automated (CI-safe, code-server-free):** TEST-L9..L12 green via `./harness test` /
  `./harness verify` with `code-server` absent. These are the standing regression backstop
  for AC1/AC2/AC4 mechanics (CORE-COMPONENT-0003 R16).
- **Manual (provisioned host):** TEST-M1..M4 executed and their evidence captured under
  `project/issues/8/implementation/`, satisfying ADR-0006 D7's manual half for AC1–AC3 and
  confirming AC4. If `code-server` cannot be provisioned this cycle, TEST-M1..M3 are recorded
  as manual-demo-pending (blocker cited against `.harness/friction.jsonl` `verb: edit`); the
  automated backstop and inherited ADR-0006 D5 still cover AC4.
- **Escalation:** any unexpected observation from TEST-M1..M4 feeds Task T5's ADR checkpoint.
