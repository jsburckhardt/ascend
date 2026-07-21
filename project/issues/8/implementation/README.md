# Implementation — Issue #8: Verify direct filesystem editing

> Verification-and-documentation story (PRD §29 Prototype 0, item 5). Built on the
> code-server launcher from issue #7 / **ADR-0006** (`scripts/launch-editor.sh`, harness
> `edit` verb, `tests/launcher/launch-editor.test.ts`). Scope is `issue`; **no new ADR or
> core-component** is required (Research/Plan confirmed). This document is both the T1
> **verification & manual-demo guide** and the T4 **evidence record**. The live demo was
> **executed on 2026-07-21** against a transiently-provisioned code-server 4.129.0 (NOT a repo
> dependency); real captured evidence is in §4.6, §5, and §6.

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
| **T4** | Manual demo on a provisioned host (TEST-M1..M4), evidence captured in §4.6/§5/§6 | **Done, live** (code-server 4.129.0 provisioned transiently 2026-07-21) |
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

### 4.6 T4 Live Demonstration Evidence (captured 2026-07-21)

The manual demo was **executed successfully** against a real code-server instance. Results below
are captured, not simulated.

- **Transient, non-dependency provisioning:** code-server **4.129.0**
  (`77baee7fe06f7031d45e6acf903c9b4b329e10c4 with Code 1.129.0`, linux-amd64 standalone release)
  was provisioned **transiently** at `/tmp/cs/bin/code-server` and placed on `PATH` — it was
  **NOT** added as a repository dependency (honours ADR-0006 D7). Tarball SHA-256
  `889b09ff3a167a293f53cb68a5a7f38dbab6bd2b50d7a5951c757e56ba51a2b0`.
  (Note: the configured Microsoft npm proxy tops out at code-server 4.117.0, so exact version
  4.129.0 was taken from the coder standalone release channel — the same channel and version the
  issue #7 delivery used; still transient, still not a repo dependency.)
- **Host:** Linux x86_64, Node `v22.17.1`, user `vscode` (uid/gid 1000). Transient
  `HOME=/tmp/demo8-home` (VS Code `user-data-dir` `/tmp/demo8-home/.local/share/code-server`).
- **Fixture (disposable, NOT the repo):** `/tmp/demo-proj8` with `AC1.txt` (32 B), `README.md`
  (15 B), `src/app.ts` (20 B), all `0644 vscode:vscode`.
- **Launch via the unmodified repo launcher seam:**
  `HOME=/tmp/demo8-home PATH=/tmp/cs/bin:$PATH PROJECT_PATH=/tmp/demo-proj8 EDITOR_PORT=8123 sh scripts/launch-editor.sh`,
  which `exec`'d `code-server /tmp/demo-proj8 --bind-addr 127.0.0.1:8123 --auth none`
  (`scripts/launch-editor.sh:61`; this is exactly the innermost command that `./harness edit` →
  `npm run edit` resolves to). Server logged `HTTP server listening on http://127.0.0.1:8123/`
  and `Authentication is disabled`; `GET /` → `302 …?folder=/tmp/demo-proj8`; `GET /healthz` → `200`.
- **AC1 (edit lands on the original path):** a real browser (Chromium, provisioned transiently)
  drove the running Workbench — opened `AC1.txt`, typed the unique marker
  `EDITED_VIA_CODE_SERVER_4129_1784629650` at end-of-file; the editor tab showed **dirty=true**;
  **Ctrl+S** → **dirty=false**. The original on-disk path `/tmp/demo-proj8/AC1.txt` then contained
  the marker line (grep count = 1). See §6.
- **Integrated terminal in the project cwd:** Command Palette → *Terminal: Create New Terminal*
  opened a real `zsh` PTY; running `pwd; whoami; echo TERMINAL_OK_$((6*7))` produced
  `/tmp/demo-proj8` (cwd = the opened project folder) / `vscode` / `TERMINAL_OK_42` — the shell
  arithmetic evaluated, proving a genuine interactive shell in the project cwd. Output was
  redirected outside the fixture, so the project tree stayed clean.
- **AC2 (stop leaves files unchanged):** a full recursive snapshot (`lstat` + SHA-256, including
  mode/uid/gid/inode/mtime) taken immediately **before** stopping equalled the snapshot taken
  immediately **after** stopping — **byte-identical**. Stopping (`SIGTERM` to the code-server PID)
  freed port `8123` with no stray process; nothing on disk changed. See §6.
- **AC4 (no destructive mutation):** across the full launch→edit→terminal→stop lifecycle, the
  fixture had **0 removed** entries, **0 added** entries, and the **only** change vs the initial
  snapshot was `AC1.txt`'s content (the single intended edit) — no delete/move/rename/reset/clean,
  and no mode/owner/type change on any entry. See §6.

---

## 5. AC3 record — permissions / ownership / save-semantics / workspace-state

> Captured live on 2026-07-21 against code-server 4.129.0 (fixture `/tmp/demo-proj8`, file `AC1.txt`).

| Property | Before edit | After edit |
|----------|-------------|------------|
| `ls -l` (perms, owner, group) | `-rw-r--r-- vscode vscode` | `-rw-r--r-- vscode vscode` |
| `stat` mode (octal) | `0644` | `0644` |
| `stat` uid / gid | `1000 / 1000` (vscode) | `1000 / 1000` (vscode) |
| `stat` inode | `3395949` | `3395949` (unchanged) |
| `stat` size | `32` | `71` |
| `stat` mtime | `2026-07-21 10:25:19` | `2026-07-21 10:44:48` |

| Observation | Value |
|-------------|-------|
| uid/username code-server ran as (`id -u` / `id -un`) | `1000` / `vscode` |
| Save mechanism (in-place write vs atomic write-temp+rename) | **In-place write** — inode preserved (`3395949` → `3395949`) |
| Inode changed on save? (informational; AC1 bar is path-identity) | **No** (in-place; AC1 satisfied by path-identity regardless) |
| Mode/owner change on save? (flag for §8 if yes) | **No** — mode `0644` and owner `vscode:vscode` unchanged |
| code-server workspace-state location | `/tmp/demo8-home/.local/share/code-server`, `/tmp/demo8-home/.config/code-server` (transient `HOME`) |
| Workspace-state outside `PROJECT_PATH`? | **Yes** — under `HOME`, never inside `/tmp/demo-proj8` |
| `PROJECT_PATH` type (dir / bind-mount / symlink) | real directory (`/tmp/demo-proj8`) |

## 6. AC1/AC2/AC4 evidence (captured live 2026-07-21)

- **AC1 (TEST-M1)** — edit made in the editor appears at the identical original path:
  ```
  # editor tab state driven via the running Workbench:
  tab dirty before save: true   ->   Ctrl+S   ->   tab dirty after save: false

  # on-disk /tmp/demo-proj8/AC1.txt after the editor save (cat -A):
  line-1 original$
  line-2 original$
  $
  EDITED_VIA_CODE_SERVER_4129_1784629650
  # grep -c EDITED_VIA_CODE_SERVER_4129_1784629650  ->  1

  # stat before -> after (same path, same inode = in-place write):
  before: ino=3395949 mode=644 owner=vscode:vscode size=32
  after : ino=3395949 mode=644 owner=vscode:vscode size=71
  ```
- **AC2 (TEST-M2)** — post-stop tree equals pre-stop tree; clean shutdown:
  ```
  AC2 stop byte-identical (recursive lstat+SHA-256, incl mtime+inode): PASS
  stop = SIGTERM to code-server PID  ->  port 8123 free, no stray process
  ```
- **AC4 (TEST-M4)** — only the single intended edit; no destructive command run:
  ```
  Lifecycle diff  (initial snapshot S0  ->  after-stop):
    removed entries : none
    added entries   : none
    changed entries : AC1.txt  {"sha256":[68b4b9f4…, 32f9f92a…], "size":[32, 71]}
    only AC1.txt content changed          : PASS
    no mode/owner/type change on ANY entry: PASS
  ```

## 7. Environment limitations & run log

- **`code-server` was provisioned transiently for the live demo.** It is **absent by default** in
  this devcontainer/CI (ADR-0006 D7 — a documented prerequisite, not a repo dependency). For the
  T4 demo it was provisioned transiently (code-server **4.129.0** standalone at `/tmp/cs/bin` on
  `PATH`) purely to exercise AC1–AC3 live; it is **not** committed and **not** a dependency. The
  automated launcher suite (§below) remains code-server-free by stubbing `code-server` on `PATH`.
  No live evidence is fabricated (see §4.6/§5/§6).
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
| AC1 edit on original path | TEST-L9, TEST-L10 | TEST-M1 (§4.6/§6) | **Met (live 2026-07-21)** — marker saved to the original path, inode preserved |
| AC2 stop leaves files unchanged | TEST-L11 | TEST-M2 (§4.6/§6) | **Met (live)** — pre/post-stop snapshots byte-identical |
| AC3 permission behaviour documented | — | TEST-M3 (§5) | **Met (live)** — mode/owner preserved; in-place write; workspace-state outside `PROJECT_PATH` |
| AC4 no project-dir mutation (§28.6) | TEST-L9..L12 + ADR-0006 D5 (inherited) | TEST-M4 (§4.6/§6) | **Met (live)** — 0 added/removed, only the intended edit, no perm/owner change |

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
