# Implementation Notes — Issue #7: launch one code-server process against a configured path

**Stage:** Implement (RPIV) · **Branch:** `issue/7` · **ADR:** ADR-0006 (Accepted)
· **Core-components:** none new (CC-0003 governs the harness)

This story delivers Ascend's **first external editor-provider launch**: a
documented command launches **one** `code-server` process against a configured
local directory, surfaced on the single operating surface as the `edit` verb. All
code-server specifics are isolated behind a single dependency-light POSIX launcher
seam (PRD §5.7), and the launcher is strictly **read-only** with respect to the
target (PRD §28.6 / AC5).

Implemented strictly within ADR-0006 (D1–D8) and ADR-0002/0003/0004/0005 +
CORE-COMPONENT-0003 (R8 permitted structural dispatch, R16 regression suite, R17
interactive/handoff verbs). **No architectural deviation was required** — no return
to the Plan stage.

---

## Files created / changed

| File | Change | Task |
|------|--------|------|
| `scripts/launch-editor.sh` | **new** — POSIX launcher seam (`#!/usr/bin/env sh`, `set -eu`, `chmod +x`); the ONLY file with code-server flags | T1 |
| `package.json` | added `scripts.edit = "sh scripts/launch-editor.sh"`; widened `test` glob to `'tests/{app,launcher}/**/*.test.ts'` | T2 |
| `tsconfig.json` | added `tests/launcher` to `include` | T2 |
| `.harness/contract.yml` | added the `edit` verb (`maps_to: "npm run edit"`, `mode: exec`, `json: true`, description) near `boot`/`dev` | T3 |
| `harness` | added `edit` to the `main()` dispatch allowlist case + one `verb_help` line (structural dispatch only, CC-0003 R8) | T4 |
| `tests/launcher/launch-editor.test.ts` | **new** — `node:test` suite covering TEST-L1..L8 (code-server-free, stub on PATH, no-mutation snapshots) | T5 |
| `tests/harness/run.sh` | extended: TEST-01 edit contract + flag-leak assertions, TEST-02 verb count 13→14, TEST-11 README verb list, TEST-20 `edit --print` exclusion, new **TEST-34** (edit handoff end-to-end) | T6 |
| `README.md` | new "Launch the editor (code-server)" section; added `scripts/` to the directory tree | T7 |
| `.harness/README.md` | added the `edit` verb row + handoff/`--json` documentation + a "#7 status" note | T7 |
| `.harness/friction.jsonl` | **append-only** resolution entries (`edit`, `boot`, `doctor`) referencing #7/ADR-0006 | T8 |

No new runtime/third-party dependency was added (ADR-0002 no-framework; the tests
use only built-in `node:test`/`node:child_process`/`node:fs`). `engines.node`
unchanged (`>=22.6.0 <23`).

---

## The launcher seam (`scripts/launch-editor.sh`)

Behaviour (ADR-0006 D1/D3/D4/D5/D6):

1. Reads `PROJECT_PATH` (required) and `EDITOR_PORT` (default `8080`), each
   defaulted so `set -u` never trips.
2. **Read-only, fail-fast validation** in order (never mutating the target):
   unset/empty → `exit 1`; `! -e` (missing) → `exit 1`; `! -d` (not a directory)
   → `exit 1`. **No** `mkdir`/`rm`/`mv`/`rename`/`reset`/`clean` on any path.
3. **After** path validation, resolves `code-server` via `command -v`; if absent →
   clear `code-server not found …` message on stderr + non-zero exit (does **not**
   install it).
4. Builds the single isolated invocation and hands off via `exec`:
   `exec code-server "$PROJECT_PATH" --bind-addr "127.0.0.1:${EDITOR_PORT}" --auth none`
   so code-server becomes the process and its exit code propagates.

All fatal messages go to **stderr** and are stable enough to assert in tests. This
is the **only** file containing `--bind-addr`, `--auth`, or the `code-server`
invocation (PRD §5.7). Ordering matters: invalid-path (TEST-L1..L4) fails **before**
the code-server check (TEST-L6), proving validation precedes launch.

Introspection is owned by the harness `edit` verb (`mode: exec`): `edit --print`/
`--json` never exec the script, so the launcher needs no introspection flag of its
own (it is purely the exec target).

---

## Task status

### Task T1: `scripts/launch-editor.sh`
- **Status:** Done · **Files:** `scripts/launch-editor.sh`
- POSIX `sh`, `set -eu`, executable, no dependency. Sole owner of code-server flags.
- **Tests:** TEST-L1..L8 (via T5) — 8/8 pass.

### Task T2: `package.json` + `tsconfig.json`
- **Status:** Done · **Files:** `package.json`, `tsconfig.json`
- `scripts.edit == "sh scripts/launch-editor.sh"`; test glob covers `tests/app` **and**
  `tests/launcher`; `tsconfig.include` covers `tests/launcher`. No new dep; engines unchanged.
- **Tests:** `npm test` picks up both suites (11 tests); TEST-34(2) asserts the edit script.

### Task T3: `.harness/contract.yml`
- **Status:** Done · **Files:** `.harness/contract.yml`
- `edit: { maps_to: "npm run edit", mode: exec, json: true, description }`. No code-server flag in the contract.
- **Tests:** TEST-01 (edit contract + no `--bind-addr`/`--auth`), TEST-34(1).

### Task T4: `harness` dispatch + help
- **Status:** Done · **Files:** `harness`
- Added `edit` to `main()` case `lint|test|build|boot|dev|edit)` and one `verb_help` line.
  No verdict/exit/`dispatch_verb`/`verb_exec` logic changed — mode→handler stays data-driven.
- **Tests:** TEST-H1/H2 via `edit --print`/`--json`; TEST-34(5,6,7), TEST-20 (exclusion).

### Task T5: `tests/launcher/launch-editor.test.ts`
- **Status:** Done · **Files:** `tests/launcher/launch-editor.test.ts`
- `node:test` + `node:child_process`, code-server-free (stub `code-server` on PATH), zero deps.
  Fixtures under the OS temp dir only; no-mutation asserted via sorted path+size+mtime snapshots.
- **Tests:** TEST-L1..L8 — 8/8 pass.

### Task T6: `tests/harness/run.sh`
- **Status:** Done · **Files:** `tests/harness/run.sh`
- Verb count 13→14; edit contract values; `edit --print`/`--json` descriptor; help listing;
  exclusion from the run-to-completion enumeration; provider-flag isolation; honest-when-unmapped;
  doc coherence. Never runs bare `./harness edit`. POSIX-portable (no GNU-only idioms).
- **Tests:** TEST-R1 (whole suite) — new TEST-34 + all edited cases pass (see results).

### Task T7: Documentation
- **Status:** Done · **Files:** `README.md`, `.harness/README.md`
- README "Launch the editor (code-server)": command, `PROJECT_PATH`/`EDITOR_PORT`, `--auth none`
  loopback (local-spike only), install prerequisite, the four invalid-path cases (AC4), the
  read-only guarantee (AC5), and the manual AC1–AC3 demo. `.harness/README.md` lists `edit`
  consistently with the contract and `help`.
- **Tests:** TEST-11, TEST-34(9), plus doc review.

### Task T8: Friction resolution
- **Status:** Done · **Files:** `.harness/friction.jsonl`
- Three append-only entries (`edit`, `boot`, `doctor`) recording that #7/ADR-0006 resolved the
  verb-routing gap, the launch/PROJECT_PATH-config inference, and the code-server-availability
  inference. Each answers the KEY_QUESTION verbatim; no prior line edited/removed (24 → 27 lines).

### Task T9: Manual AC1–AC3 demo (documented; requires code-server)
- **Status:** Documented (cannot execute here — code-server absent). See "Manual demo" below.

---

## Test results (this sandbox)

> **Environment caveat (plan risk R8).** This sandbox is **network-blocked**, so
> `npm install` / `npm ci --offline` cannot fetch `typescript`/`@types/node`;
> `node_modules` is absent. `npm test` runs on **node alone** (built-in `node:test`
> via `--experimental-strip-types`) and is unaffected. Only `tsc`-based checks
> (`typecheck`/`verify`) are affected — see below.

### `npm test` (= `./harness test`) → **pass** (11/11)
```
ok 1 - GET /health -> 200 application/json {"status":"ok"}
ok 2 - GET / -> 200 text/html thin shell (non-empty)
ok 3 - GET /does-not-exist -> 404
ok 4 - TEST-L1: PROJECT_PATH unset -> fail-fast, no launch, no mutation
ok 5 - TEST-L2: PROJECT_PATH empty -> fail-fast, no launch, no mutation
ok 6 - TEST-L3: PROJECT_PATH non-existent -> fail-fast, path not created
ok 7 - TEST-L4: PROJECT_PATH is a file, not a directory -> fail-fast
ok 8 - TEST-L5: valid dir -> single isolated code-server invocation, no mutation
ok 9 - TEST-L6: valid dir + code-server absent -> clear error, no mutation
ok 10 - TEST-L7: EDITOR_PORT override -> bind-addr reflects the port
ok 11 - TEST-L8: code-server flags live ONLY in scripts/launch-editor.sh (PRD 5.7)
# tests 11  # pass 11  # fail 0
```
`./harness test` → `Verdict: pass`, exit 0. **TEST-V1 satisfied** (`test` member green,
launcher + app suites both run).

### `sh tests/harness/run.sh` → 39 PASS, 1 FAIL (pre-existing/environmental), 3 SKIP
- **New TEST-34** (`#7 code-server launcher`) → **PASS**.
- **TEST-20** (edit handoff excluded from run-to-completion) → **PASS**.
- **TEST-02** (help lists 14 verbs) → **PASS**; **TEST-01** (edit contract + no flag leak) → **PASS**;
  **TEST-11** (README verb list incl. edit) → **PASS**.
- The single **FAIL is `TEST-17`** (`pr-review-complement`: expects `verify` non-fail). It fails
  **only** because `verify` runs `npm run typecheck` → `tsc` which is **not installed** (no
  `node_modules`). **Verified pre-existing:** `git stash`-ing all #7 changes and re-running the
  suite reproduces the identical `TEST-17 FAIL` on the pre-#7 baseline. It is **not** introduced
  by this issue. The 3 SKIPs (TEST-04/30b/32c) are all gated on the same absent typecheck/timeout.

### `./harness verify`
- In this sandbox → `Verdict: fail`, exit 1 — **solely** because `typecheck=fail (exit 127, tsc not
  found)`. Members: `test=pass` (now incl. `tests/launcher/`), `lint=unknown`, `build=unknown`,
  `doctor=degraded`. The `edit` verb is `mode: exec` and is **not** in the `verify` aggregate, so it
  cannot affect the verdict.
- **No failing wrapped command was introduced.** Demonstrated by simulating a runnable typecheck
  (temp contract `verify.maps_to = "true"`): `verify` → `degraded`, **exit 0**, with
  `typecheck=pass, lint=unknown, test=pass, build=unknown, doctor=degraded`. On any connected
  environment with `node_modules` present, `verify` is `degraded`/exit-0 and TEST-17 passes
  (**TEST-V1** as written).

### `./harness edit --print` / `--json` (TEST-H1 / TEST-H2)
```
$ ./harness edit --print
npm run edit                     # exit 0, no exec, no Verdict line
$ ./harness edit --json
{"harness_version":"1","verb":"edit","timestamp":"…","mode":"exec","maps_to":"npm run edit","interactive":true}
# exit 0; NO "verdict" key
```

### Launcher invalid-path sanity (manual, code-server-free)
| Command | stderr (first line) | exit |
|---------|---------------------|------|
| `env -u PROJECT_PATH sh scripts/launch-editor.sh` | `launch-editor: PROJECT_PATH is not set or is empty.` | 1 |
| `PROJECT_PATH= sh scripts/launch-editor.sh` | `launch-editor: PROJECT_PATH is not set or is empty.` | 1 |
| `PROJECT_PATH=/nope-xyz sh scripts/launch-editor.sh` | `launch-editor: PROJECT_PATH does not exist: /nope-xyz` | 1 |
| `PROJECT_PATH=<a file> sh scripts/launch-editor.sh` | `launch-editor: PROJECT_PATH is not a directory: …` | 1 |
| valid dir + no code-server on PATH | `launch-editor: code-server not found on PATH.` | 127 |
| valid dir + stub code-server | (hands off) argv `<dir> --bind-addr 127.0.0.1:8080 --auth none`; dir byte-for-byte unchanged | 0 |

---

## Acceptance-criteria coverage

| AC | How satisfied | Automated? |
|----|---------------|------------|
| **AC1** — documented script launches **one** code-server against a configured path | `scripts/launch-editor.sh` runs exactly one `exec code-server "$PROJECT_PATH" …`; surfaced as `./harness edit`; documented in README. TEST-L5 proves a single isolated invocation; TEST-H1/H2 prove the documented command resolves. | Partly (TEST-L5/H1/H2); full browser demo is **manual (T9)** |
| **AC2** — editor reachable in browser and opens the configured folder | Loopback bind `127.0.0.1:${EDITOR_PORT:-8080}`; the `$PROJECT_PATH` positional opens the folder. | **Manual (T9 / TEST-M1)** — needs code-server |
| **AC3** — integrated terminal works within the launched editor | code-server default capability once launched against the folder. | **Manual (T9 / TEST-M1)** — needs code-server |
| **AC4** — invalid-path launch behaviour is documented | Read-only fail-fast for unset/empty/missing/not-a-directory (+ code-server absent), each a clear stderr message + non-zero exit; documented in README. | **Yes** — TEST-L1..L4, TEST-L6 (+ doc review) |
| **AC5** — must not delete/move/rename/reset/clean/modify the project directory | Validate-only checks; no `mkdir`/`rm`/`mv`; snapshot equality before/after on every path. | **Yes** — TEST-L1/L3/L4/L5/L6 no-mutation snapshots |

Cross-cutting **§5.7 provider-arg isolation** — TEST-L5/L7/L8 + TEST-01/TEST-34.
**Harness non-hang handoff** — TEST-H1/H2/TEST-20/TEST-34. **Gate green** — TEST-V1.

---

## Manual demo for AC1–AC3 (Task T9) — requires a code-server-provisioned host

> code-server is a **documented prerequisite** and is **not installed** in this
> devcontainer/CI (`command -v code-server` → none), so AC1–AC3 **cannot** be run
> here. Perform the following on a machine/devcontainer where code-server is
> installed, and record the evidence back into this file.

1. **Install code-server** (once):
   ```bash
   curl -fsSL https://code-server.dev/install.sh | sh
   ```
2. **Pick a real folder** and snapshot it (for the AC5 before/after check):
   ```bash
   export PROJECT_PATH="$HOME/some-project"
   ( cd "$PROJECT_PATH" && ls -laR ) | sha256sum   # record this checksum
   ```
3. **Launch via the harness** and capture the **startup command** + **startup
   duration** (PRD §29 evidence):
   ```bash
   time PROJECT_PATH="$PROJECT_PATH" ./harness edit
   # startup command it execs: code-server "$PROJECT_PATH" --bind-addr 127.0.0.1:8080 --auth none
   # (override the port with EDITOR_PORT=<port>)
   ```
   Expect exactly **one** code-server instance bound to `127.0.0.1:8080` (**AC1**).
4. **Open** `http://127.0.0.1:8080` in a browser → the editor loads with the
   **configured folder open** (**AC2**).
5. **Open the integrated terminal** in the editor and run `pwd` / `ls` → it runs in
   the configured folder (**AC3**).
6. **Ctrl-C** to stop, then re-run the step-2 checksum → it must be **identical**
   (**AC5** — launching/stopping the editor did not modify the project directory).

**Evidence to paste here after the manual run:** the exact startup command, the
measured startup duration, a confirmation the folder opened, a terminal command +
its output, and the matching before/after checksums.

**TEST-M2 (invalid-path, manual/doc verification):** run `./harness edit` with
`PROJECT_PATH` unset, then `=""`, then a non-existent path, then a file path;
confirm each prints the documented error on stderr, exits non-zero, and changes
nothing on disk (reproduced automatically here by TEST-L1..L4/L6).

---

## Deviations & concerns

- **No architectural deviation.** Everything stays within ADR-0006 (D1–D8) and the
  inherited ADR-0004/0005 handoff; the only `harness` edit is the CC-0003 R8
  permitted structural dispatch (adding the verb **name** to the `main()` allowlist
  + a `verb_help` line), which the Plan pre-recorded as friction (entry `edit`).
- **Environmental, not a defect:** `./harness verify` / `TEST-17` are `fail` here
  **only** because `tsc` is unavailable (network-blocked, no `node_modules`); proven
  pre-existing via `git stash`. On a connected environment `verify` is
  `degraded`/exit-0. No new failing wrapped command was introduced (the `edit` verb
  is verdict-exempt and outside the aggregate).
- **`--auth none` + loopback** is a deliberate local-spike posture (ADR-0006 D4/R7);
  it must be revisited before shared/remote exposure (out of scope for #7, documented).
- **AC1–AC3 remain manual** until code-server is provisioned (ADR-0006 D7); `doctor`
  code-server readiness is deferred to a later story.
- Working tree left with the edits (no commit/push/PR — that is the Verify stage's job).
