# Implementation — Issue #8: Verify direct filesystem editing

> Verification-and-documentation story (PRD §29 Prototype 0, item 5). Built on the
> code-server launcher from issue #7 / **ADR-0006** (`scripts/launch-editor.sh`, harness
> `edit` verb, `tests/launcher/launch-editor.test.ts`). Scope is `issue`; **no new ADR or
> core-component** is required (Research/Plan confirmed). This document is both the T1
> **verification & manual-demo guide** and the T4 **evidence record** (filled on a
> provisioned host; currently `manual-demo-pending` — see §7).

## 0. Acceptance criteria (from the issue)

- **AC1** — A file edited in `code-server` shows the identical change in the original filesystem path.
- **AC2** — Stopping the editor process leaves project files unchanged.
- **AC3** — Filesystem permission behaviour is documented.
- **AC4** — The operation must not delete, move, rename, reset, clean, or otherwise modify the
  project directory unless that filesystem mutation is the explicit purpose of the story
  (PRD §28.6; inherited from ADR-0006 D5 / DECISION-LOG #69).

**AC1 acceptance bar — path-identity, NOT inode-identity.** The bar is "identical change in the
original filesystem **path**". Editors commonly save via atomic write-temp+rename, which changes
the inode while preserving the path and content. Such a save **still satisfies AC1** as long as
the same path holds the edited content. The observed save mechanism is recorded in §4.

## 1. What was delivered

| Task | Deliverable | Status |
|------|-------------|--------|
| **T1** | This guide: manual-demo procedure + AC3 permission/ownership/save-semantics/workspace-state templates + AC4 demo-safety rules | Done |
| **T2** | Automated `node:test` cases **TEST-L9, TEST-L10, TEST-L11** in `tests/launcher/launch-editor.test.ts` (stub-backed, code-server-free) | Done, green |
| **T3** | Automated static case **TEST-L12** (launcher writes no editor state into `PROJECT_PATH`) | Done, green |
| **T4** | Manual demo on a provisioned host (TEST-M1..M4), evidence captured in §3–§6 | **manual-demo-pending** (code-server absent here — §7) |
| **T5** | Escalation determination against ADR-0006 D5/D7 | **No ADR required** (automated backstop revealed no surprise) — §8 |

## 2. Verification split (ADR-0006 D7)

`code-server` is a documented prerequisite that is **absent in this devcontainer/CI**
(`command -v code-server` → none; not in `node_modules/.bin`; `.devcontainer/` declares no
editor feature). Therefore:

- **Automated half (CI-safe, code-server-free):** launcher/filesystem **mechanics** are proven by
  stub-backed `node:test` snapshot assertions — TEST-L9..L12 — that run green with code-server
  absent. These are the standing regression backstop for AC1/AC2/AC4 *at the launch seam*.
- **Manual half (provisioned host):** the **real user-edit round trip** (AC1–AC3) is proven by a
  manual demonstration (TEST-M1..M4) whose evidence is captured below. A stub is **not** the real
  editor; the automated tests deliberately do not overclaim (each carries a scope-caveat comment).

Recorded harness capability gap for this split: `.harness/friction.jsonl` (`verb: edit`) —
*`./harness doctor` proves only Node/toolchain health, not editor-provider readiness or on-disk
edit behaviour; no harness verb observes a user edit landing on the same path, process-stop
integrity, or resulting permissions.* No new gap emerged during implementation.

## 3. Automated backstop — how the mechanics are proven (TEST-L9..L12)

Run via `./harness test` (wraps `npm test`, globs `tests/{app,launcher}/**/*.test.ts`); folds into
`./harness verify`. Zero third-party deps (ADR-0005 D7): `node:test`, `node:child_process`,
`node:fs`, `node:crypto`, `node:os`, `node:path`. All reuse the existing `snapshot()` helper
(recursive path/type/mode/size/mtime + SHA-256 + symlink target, via `lstatSync`).

| Test | Proves (mechanics) | AC |
|------|--------------------|-----|
| **TEST-L9**  | Launcher hands code-server the **exact** `PROJECT_PATH` positional; no sibling/staging/copy dir appears alongside the fixture; target untouched. → "in place, not a copy" at the launch seam. | AC1, AC4 |
| **TEST-L10** | A stub that simulates a save writes `$PROJECT_PATH/README.md`; snapshot diff shows **exactly one** entry changed, at the **same relative path**, none added/removed, every other entry byte-for-byte identical. → edit lands on the original path; nothing else mutated. | AC1, AC4 |
| **TEST-L11** | Edit-then-stop stub (exits 0 through the `exec` handoff): after the process returns, only the intended edit persists; process stop adds/removes/resets nothing. | AC2, AC4 |
| **TEST-L12** | Static read of `scripts/launch-editor.sh` (like TEST-L8): no `--user-data-dir`, `--extensions-dir`, or project-rooted `--config`/`XDG_*` flag → the launcher writes no editor workspace-state into `PROJECT_PATH`. | AC4 |

**Scope caveat (in each test's comments):** the stub stands in for the real editor; it proves
launcher/filesystem mechanics only. The real user-edit round trip is proven by TEST-M1..M4 below.

Latest run: `# tests 15  # pass 15  # fail 0` — see §7 for the exact command/output.

---

## 4. Manual demonstration procedure (T4 — TEST-M1..M4)

Execute on a host where `code-server` is provisioned. Use a **disposable fixture directory** as
`PROJECT_PATH` — **NOT** the repo. All commands below are real (`./harness edit`, `diff`, `stat`,
`ls -l`, `find`, `sha256sum`); none invents a harness verb outside `.harness/contract.yml`.

### 4.0 Prepare a disposable fixture

```sh
FIX=$(mktemp -d)
printf 'baseline line 1\n' > "$FIX/note.txt"
# Baseline captures (fill the tables in §5/§6 from this):
ls -l "$FIX" "$FIX/note.txt"
stat "$FIX/note.txt"                 # path, inode, mode, uid/gid, mtime
find "$FIX" -type f -exec sha256sum {} +   # whole-tree baseline
id -u; id -un                        # the uid code-server will run as
```

### 4.1 TEST-M1 — edit lands on the original path (AC1)

1. `PROJECT_PATH="$FIX" ./harness edit`
   (the `mode: exec` handoff → `npm run edit` → `sh scripts/launch-editor.sh` →
   `exec code-server "$FIX" --bind-addr 127.0.0.1:${EDITOR_PORT:-8080} --auth none`).
2. Open `http://127.0.0.1:8080` (or your `EDITOR_PORT`) in a browser; open the folder; edit
   `note.txt` (add a known line, e.g. `edited via code-server`); **save**.
3. On the host, still in the fixture:
   ```sh
   diff <(printf 'baseline line 1\n') "$FIX/note.txt"   # shows the added line
   stat "$FIX/note.txt"                                  # compare inode/mtime to baseline
   ```
4. **Record the save mechanism:** compare the inode from step 3 to the §4.0 baseline. Same inode
   → in-place write; changed inode → atomic write-temp+rename. **Either passes AC1** (path-identity).

### 4.2 TEST-M2 — stopping the editor leaves files unchanged (AC2)

1. Record the post-edit tree: `find "$FIX" -type f -exec sha256sum {} +`.
2. Stop the editor: `Ctrl-C` on the `./harness edit` exec handoff (or terminate the code-server
   process by its PID). Observe the propagated exit code (ADR-0006 D6).
3. Re-record: `find "$FIX" -type f -exec sha256sum {} +`.
4. **Compare** post-stop vs post-edit: they must be identical — only the intended edit persists;
   nothing deleted/moved/reset by stopping.

### 4.3 TEST-M3 — permission / ownership behaviour (AC3)

1. Re-capture after the save: `ls -l "$FIX/note.txt"` and `stat "$FIX/note.txt"` (mode, uid, gid).
2. Locate code-server's **workspace-state** (open tabs/layout — default `~/.local/share/code-server`
   and `~/.config/code-server`) and confirm it is **outside** `$FIX`:
   ```sh
   ls -ld ~/.local/share/code-server ~/.config/code-server 2>/dev/null
   find "$FIX" -name '.*code-server*' -o -name 'User' 2>/dev/null   # expect: nothing
   ```
3. Note the `PROJECT_PATH` **type** (real dir / bind-mount / symlink): `mount | grep "$FIX"` or
   `readlink -f "$FIX"`.
4. Fill the §5 record; flag any mode/owner change on save for the §8 (T5) checkpoint.

### 4.4 TEST-M4 — no project-directory mutation (AC4)

1. Throughout M1–M3, run **none** of the destructive commands in §4.5.
2. After the demo, compare the fixture tree to its §4.0 baseline **minus** the single intended edit:
   the only difference must be `note.txt`'s added line. Record confirmation in §6.

### 4.5 AC4 demo-safety — **DO NOT RUN** against the project directory

The demo *observes*; it mutates only the single intended edit. Never run, against `PROJECT_PATH`:

- `git clean` (any form) &nbsp;·&nbsp; `git reset --hard` &nbsp;·&nbsp; `rm` / `rm -rf`
- `mv` &nbsp;·&nbsp; `rename` &nbsp;·&nbsp; `mkdir`/`rmdir` of project contents
- any command that deletes, moves, renames, resets, or cleans the target.

(The launcher itself already honours this by construction — ADR-0006 D5, proven by TEST-L1..L12.)

---

## 5. AC3 record — permissions / ownership / save-semantics / workspace-state (fillable)

> Fill from the §4.0 baseline and §4.3 captures on the provisioned host. `<PENDING>` until T4 runs.

| Property | Before edit | After edit |
|----------|-------------|------------|
| `ls -l note.txt` (perms, owner, group) | `<PENDING>` | `<PENDING>` |
| `stat` mode (octal) | `<PENDING>` | `<PENDING>` |
| `stat` uid / gid | `<PENDING>` | `<PENDING>` |
| `stat` inode | `<PENDING>` | `<PENDING>` |
| `stat` mtime | `<PENDING>` | `<PENDING>` |

| Observation | Value |
|-------------|-------|
| uid/username code-server ran as (`id -u` / `id -un`) | `<PENDING>` |
| Save mechanism (in-place write vs atomic write-temp+rename) | `<PENDING>` |
| Inode changed on save? (informational; AC1 bar is path-identity) | `<PENDING>` |
| Mode/owner change on save? (flag for §8 if yes) | `<PENDING>` |
| code-server workspace-state location | `<PENDING>` (expected `~/.local/share/code-server`, `~/.config/code-server`) |
| Workspace-state outside `PROJECT_PATH`? | `<PENDING>` (expected **yes**) |
| `PROJECT_PATH` type (dir / bind-mount / symlink) | `<PENDING>` |

## 6. AC1/AC2/AC4 evidence (fillable)

> Paste raw `diff` / `stat` / `find`+`sha256sum` output captured on the provisioned host.

- **AC1 (TEST-M1)** — edit appears at the identical original path:
  ```
  <PENDING: diff + stat before/after>
  ```
- **AC2 (TEST-M2)** — post-stop tree equals post-edit tree; propagated exit code:
  ```
  <PENDING: find+sha256sum post-edit vs post-stop; exit code>
  ```
- **AC4 (TEST-M4)** — only the single intended edit; no destructive command run:
  ```
  <PENDING: tree diff vs baseline minus the one edit>
  ```

## 7. Environment limitations & run log

- **`code-server` is ABSENT** in this devcontainer/CI (ADR-0006 D7). The live editor demo
  (TEST-M1..M3, the real AC1/AC2/AC3 round trip) therefore **cannot be run here** and is marked
  **manual-demo-pending**; §5/§6 hold `<PENDING>` templates to be filled on a provisioned host.
  Blocker cross-referenced against `.harness/friction.jsonl` (`verb: edit`). No live evidence is
  fabricated.
- **`node_modules`** was installed for the test runner (`npm install`); the runner itself uses only
  Node built-ins (`node:test`).
- **Automated backstop executed here and green:**

  ```
  $ ./harness test
  test: pass (wrapped: npm test)
  Verdict: pass

  $ npm test   # excerpt
  ok 12 - TEST-L9: launcher opens the exact PROJECT_PATH in place (no copy/stage)
  ok 13 - TEST-L10: simulated in-place edit lands on README.md; nothing else changes
  ok 14 - TEST-L11: after the editor exits, only the intended edit persists (AC2)
  ok 15 - TEST-L12: launcher sets no flag placing editor state inside PROJECT_PATH
  # tests 15  # pass 15  # fail 0
  ```
- **`./harness verify`** → `degraded`, solely because `lint` and `build` are `unknown` (no such
  command is wired — pre-existing, unrelated to #8). `typecheck: pass`, `test: pass`, `doctor: pass`.

## 8. T5 escalation determination

**No ADR required.** The automated backstop (TEST-L9..L12) confirms the inherited ADR-0006 D5
guarantee at the launch/filesystem-mechanics level and surfaced **no** unexpected mutation,
ownership, or workspace-state behaviour: edits land in place on the exact path, stopping is clean,
nothing else is touched, and the launcher introduces no flag that would place editor state inside
`PROJECT_PATH`. Nothing here demands a design change, so:

- The DECISION-LOG remains unchanged (last decision #72, ADR-0006).
- The existing `.harness/friction.jsonl` `verb: edit` entry remains the sufficient record of the
  editor-provisioning / on-disk-observation harness gap; no new friction entry is added.

**Conditional re-open (safety valve, ADR-0006 D7):** if the live demo (T4) later observes an
*unexpected* mutation, ownership rewrite, permission change, or workspace-state written *inside*
`PROJECT_PATH`, the pipeline must return to Plan and **propose** `ADR-0007-<slug>.md` (copied from
the ADR template, referencing ADR-0006), update the DECISION-LOG with the ADR row + ≥1 imperative
decision record, and record any new harness gap via `./harness friction add`.

## 9. Traceability (AC → evidence)

| AC | Automated backstop | Manual demo | Status |
|----|--------------------|-------------|--------|
| AC1 edit on original path | TEST-L9, TEST-L10 | TEST-M1 (§6) | Backstop green; live demo pending |
| AC2 stop leaves files unchanged | TEST-L11 | TEST-M2 (§6) | Backstop green; live demo pending |
| AC3 permission behaviour documented | — | TEST-M3 (§5) | Template ready; live capture pending |
| AC4 no project-dir mutation (§28.6) | TEST-L9..L12 + ADR-0006 D5 (inherited) | TEST-M4 (§6) | Backstop green; demo-safety rules in §4.5 |

## 10. References

- **ADR-0006** — code-server launch, argument isolation, read-only project-path safety
  (D3 argument isolation, D5 read-only/no-mutation, D6 `exec` handoff, D7 verification split).
- **ADR-0005** — application-serve runtime (`node:test` runner, zero third-party deps).
- **CORE-COMPONENT-0003** — engineering harness contract (`edit`/`test`/`verify` verbs; R16
  regression suite; R4 friction/KEY_QUESTION; evidence conventions).
- **DECISION-LOG** — #69 (prohibit launcher project-dir mutation), #71 (verification split),
  #72 (defer `EditorProvider` abstraction).
- **PRD** — §5.2/§142.7 filesystem as source of truth; §5.7 provider-flag isolation; §28.6
  read-only safety; §29 Prototype 0.
