# Task Breakdown: Issue #7 — launch one code-server process against a configured path

> Every task references ADR-0006 (this story's decisions) and, where relevant,
> ADR-0003/0004/0005 and CORE-COMPONENT-0003. Acceptance criteria (issue): **AC1**
> documented script launches one instance against a configured path; **AC2** editor
> reachable + opens the folder; **AC3** integrated terminal works; **AC4** invalid-path
> behaviour documented; **AC5** launch must not delete/move/rename/reset/clean/modify
> the project directory.

## Task T1: Author the editor launcher script `scripts/launch-editor.sh`

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** None
- **Related ADRs:** ADR-0006 (D1 shell launcher, D3 isolation, D4 config, D5 read-only fail-fast, D6 crash/exit), ADR-0002 (dependency-light), ADR-0004 (exec handoff)
- **Related Core-Components:** CORE-COMPONENT-0003 (R1 wrap-never-reimplement, R12 POSIX portability)

### Description
Create `scripts/launch-editor.sh`, a dependency-light **POSIX shell** launcher that is the
**single seam** owning all code-server specifics (PRD §5.7). It runs `set -u`, then:
1. **Validate `PROJECT_PATH` (read-only, fail-fast; PRD §28.6/AC5).** In order: unset/empty →
   error + `exit 1`; not present (`! -e`) → error + `exit 1`; present but not a directory
   (`! -d`) → error + `exit 1`. Use only non-mutating tests; **never** `mkdir`/`mkdir -p`,
   `rm`, `mv`, `rename`, `reset`, or `clean` the target.
2. **Resolve code-server** via `command -v code-server`; if absent → clear
   "code-server not found — install it (see README)" on stderr + non-zero exit (documented
   prerequisite; not a repo defect).
3. **Build the isolated invocation** — all provider flags live here only:
   `code-server "$PROJECT_PATH" --bind-addr "127.0.0.1:${EDITOR_PORT:-8080}" --auth none`.
4. **Hand off** via `exec` so code-server becomes the process and its exit code propagates
   (ADR-0004 #46). No supervision/restart/health probing.

Print each fatal validation message to **stderr**; keep messages stable enough to assert in
tests. Do **not** place any code-server flag in `src/`, `.harness/contract.yml`, or `harness`.

### Acceptance Criteria
- `scripts/launch-editor.sh` exists, is POSIX `sh`, adds no dependency, and is the only file
  containing code-server flags (`--bind-addr`, `--auth`, the `code-server` invocation).
- Unset/empty/non-existent/not-a-directory `PROJECT_PATH` each print a clear stderr message
  and exit **non-zero**, **before** any attempt to launch code-server.
- The script performs **no** filesystem mutation of `PROJECT_PATH` (no create/delete/move/
  rename/reset/clean) on any code path.
- On a valid directory it invokes `code-server "$PROJECT_PATH" --bind-addr 127.0.0.1:${EDITOR_PORT:-8080} --auth none` and `exec`s it (exit code propagates).
- A missing `code-server` binary yields a clear error + non-zero exit.

### Test Coverage
- **TEST-L1..L4** (invalid-path fail-fast), **TEST-L5** (valid dir → isolated args, via a
  stub `code-server`), **TEST-L6** (code-server absent → error), **TEST-L7** (`EDITOR_PORT`
  override), **TEST-L8** (static: no flag leakage) — all in `tests/launcher/` (T5).
- No-mutation is asserted by TEST-L1/L5/L6 snapshotting the target dir before/after.

---

## Task T2: `package.json` — add the `edit` script and widen the test glob

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T1
- **Related ADRs:** ADR-0006 (D2 harness surfacing, D7 verification split), ADR-0005 (D7 node:test), ADR-0002 (dependency-light)
- **Related Core-Components:** CORE-COMPONENT-0003 (R1 wrap existing command)

### Description
Add `"edit": "sh scripts/launch-editor.sh"` to `scripts` (the command the harness `edit` verb
wraps, mirroring `boot`→`npm run start`). Widen the `test` script glob so the new launcher
suite is run by `npm test`/`./harness test`/`verify`: change
`node --test --experimental-strip-types 'tests/app/**/*.test.ts'` to cover **both**
`tests/app` and `tests/launcher` (e.g. `'tests/{app,launcher}/**/*.test.ts'`). Do **not** add
any runtime dependency; `engines.node` stays `>=22.6.0 <23`.

### Acceptance Criteria
- `scripts.edit` is exactly `sh scripts/launch-editor.sh`.
- The `test` script glob includes `tests/launcher/**/*.test.ts` (and still `tests/app/`).
- No new dependency added; `engines.node` unchanged.
- `tsconfig.json` `include` covers `tests/launcher/` (if it enumerates test globs).

### Test Coverage
- **TEST-V1** confirms `npm test`/`./harness test` picks up `tests/launcher/` and `verify`
  stays exit-0/degraded. **TEST-R1** (regression suite) stays green.

---

## Task T3: Wire `.harness/contract.yml` — new `edit` verb (`mode: exec`)

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T2
- **Related ADRs:** ADR-0006 (D2), ADR-0004 (mode:exec), ADR-0005 (boot precedent)
- **Related Core-Components:** CORE-COMPONENT-0003 (R8 data-driven wiring, R17 mode:exec handoff)

### Description
Add a new verb block to `.harness/contract.yml` (**data**): `edit: { maps_to: "npm run edit",
mode: exec, json: true, description: "Launch code-server against $PROJECT_PATH (interactive
handoff; execs npm run edit)" }`. Place it near `boot`/`dev`. Contain **no** code-server flag
here (§5.7) — only `npm run edit`. Do not change any other verb.

### Acceptance Criteria
- `edit.maps_to == "npm run edit"`, `edit.mode == exec`, `edit.json == true`.
- No code-server-specific flag appears anywhere in `contract.yml`.
- `./harness edit --print` prints `npm run edit` and exits 0 **without executing** it (once
  T4 lands the routing). `./harness edit --json` emits a handoff descriptor (mode `exec`,
  `maps_to`, `interactive: true`, **no** `verdict` key).
- `./harness orient` verb count reflects the added verb.

### Test Coverage
- **TEST-H1** (`edit --print` no-hang), **TEST-H2** (`edit --json` descriptor). Regression
  **TEST-R1** asserts the contract values and verb count.

---

## Task T4: `harness` script — add `edit` to the dispatch allowlist + help

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T3
- **Related ADRs:** ADR-0006 (D2), ADR-0003 (single operating surface)
- **Related Core-Components:** CORE-COMPONENT-0003 (R8 permitted structural dispatch, R17 handoff)

### Description
The harness `main()` routes only allowlisted verb **names** (`lint|test|build|boot|dev`), so a
new name is **not** purely data-only. Make the **minimal structural-dispatch** edit: add
`edit` to the `dispatch_verb` case (`lint|test|build|boot|dev|edit) dispatch_verb "$_verb"
"$JSON" "$@" ;;`) and add one `edit` line to `verb_help`. Do **not** change any verdict/exit
handler, `dispatch_verb`, or `verb_exec` logic — the `mode`→handler selection stays
data-driven (R8/R17). This is permitted by R8 ("structural dispatch that routes a verb name to
its handler function is permitted"). Logged as friction (T8).

### Acceptance Criteria
- `./harness edit --print` routes to the handoff handler (no "Unknown verb" / exit 2).
- Only the `main()` dispatch case and `verb_help` text change; no handler/verdict logic edited.
- All pre-existing verbs behave identically (regression suite green).
- `./harness help` lists `edit` as an interactive handoff that emits no verdict.

### Test Coverage
- **TEST-H1/H2** exercise routing via `edit --print`/`--json`. **TEST-R1** confirms no
  regression and that `edit` is excluded from run-to-completion enumeration.

---

## Task T5: Author the launcher validation suite `tests/launcher/launch-editor.test.ts`

- **Status:** Not started
- **Complexity:** L
- **Dependencies:** T1 (needs the script), T2 (glob)
- **Related ADRs:** ADR-0006 (D3 isolation, D5 read-only fail-fast, D6 crash/exit, D7 verification split), ADR-0005 (D7 node:test)
- **Related Core-Components:** CORE-COMPONENT-0003 (R16 durable tests)

### Description
Create `tests/launcher/launch-editor.test.ts` using built-in `node:test` + `node:child_process`
(zero deps, code-server-free). Each test spawns `sh scripts/launch-editor.sh` via
`spawnSync('sh', [scriptPath], { env })`, controlling `PROJECT_PATH`/`EDITOR_PORT`/`PATH`, and
asserts exit code, stderr, argument isolation, and **no target mutation**. Techniques:
- **Temp fixtures** created under the OS temp dir (never the repo); a helper snapshots a
  directory (sorted relative paths + sizes + mtimes) to assert byte-for-byte no-mutation.
- **Stub `code-server`:** a temp executable named `code-server` that appends its argv to a log
  file and exits 0, prepended to `PATH`, so the valid-path case runs without real code-server
  and lets tests assert the exact isolated invocation.
- **Absent code-server:** run with a `PATH` that excludes any `code-server`.

Cases: L1 unset, L2 empty, L3 non-existent, L4 file-not-dir, L5 valid dir + stub (isolated
args + no mutation), L6 valid dir + no code-server (error + no mutation), L7 `EDITOR_PORT`
override, L8 static grep (no flag leakage). No test binds a real port or launches real
code-server (the stub exits immediately).

### Acceptance Criteria
- `tests/launcher/launch-editor.test.ts` exists and passes under
  `node --test --experimental-strip-types`; zero third-party deps.
- Covers TEST-L1..L8 (see test plan); each mutation-sensitive case asserts the target dir is
  unchanged (snapshot equality).
- The stub-based valid-path test asserts the exact argv:
  `["<PROJECT_PATH>", "--bind-addr", "127.0.0.1:8080", "--auth", "none"]` (and `:<EDITOR_PORT>`
  for L7).
- No test binds a real TCP port, launches real code-server, or leaves a child process running.
- All fixtures live under the OS temp dir and are removed in teardown (repo tree untouched).

### Test Coverage
- This task **is** the code for **TEST-L1..L8**, executed via `./harness test` / `npm test`
  (**TEST-V1**) and included in `verify`.

---

## Task T6: Update the harness regression suite (`tests/harness/run.sh`)

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T1, T2, T3, T4
- **Related ADRs:** ADR-0006 (D2), ADR-0004 (mode:exec), ADR-0005 (boot handoff precedent)
- **Related Core-Components:** CORE-COMPONENT-0003 (R16 regression suite, R17 handoff enumeration)

### Description
Extend `tests/harness/run.sh` for the new `edit` verb — **never run bare `./harness edit`**
(it would exec the launcher / bind a port); assert via `edit --print`/`--json`. Specific edits
(mirroring the existing `dev`/`boot` handoff assertions):
- **Verb count / `orient`:** update the expected verb count (13 → 14).
- **Contract assertions:** `edit.maps_to == "npm run edit"`, `edit.mode == exec`.
- **Introspection:** `./harness edit --print` prints `npm run edit`, exits 0, no hang;
  `./harness edit --json` descriptor has `mode:"exec"`, `maps_to:"npm run edit"`,
  `interactive:true`, **no** `verdict` key.
- **Run-to-completion enumeration (R17.5):** ensure any "one `Verdict:` line per verb" loop
  **excludes** `edit` (like `dev`/`boot`); add a `edit --print` assertion instead.
- **Help/routing:** assert `./harness help` lists `edit` and that `./harness edit --print`
  does not hit the "Unknown verb" (exit 2) path.
Guard any assertion so the suite completes non-interactively, leaves the tree clean, and never
binds a port.

### Acceptance Criteria
- `sh tests/harness/run.sh` runs to completion, all cases pass, **no hang**, no leaked port.
- New assertions cover `edit` contract values, `--print`/`--json`, help listing, and exclusion
  from run-to-completion enumeration.
- The suite never executes bare `./harness edit`.
- Pre-existing cases stay green (no regression from the `main()` allowlist edit).

### Test Coverage
- **TEST-R1** (whole suite green, no hang) is the acceptance test for this task.

---

## Task T7: Documentation — README + `.harness/README.md`

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T1, T4
- **Related ADRs:** ADR-0006 (D1,D4,D5,D6,D7), ADR-0003 (single operating surface)
- **Related Core-Components:** CORE-COMPONENT-0003 (R1 truthful operating surface)

### Description
Add a README section **"Launch the editor (code-server)"** (sibling to "Run the application")
and update `.harness/README.md` to document the new `edit` verb truthfully:
- **Command:** `PROJECT_PATH=/path/to/project ./harness edit` (preferred) / `npm run edit`
  (underlying); it is an interactive handoff (`mode: exec`) that emits no verdict — Ctrl-C to
  stop; introspect with `edit --print`/`--json`.
- **Configuration:** `PROJECT_PATH` (required), `EDITOR_PORT` (default 8080, loopback bind),
  `--auth none` posture and that it is **local-spike only** (revisit before remote exposure).
- **AC4 invalid-path behaviour (document each case):** unset/empty/non-existent/not-a-directory
  → clear error + non-zero exit, no changes to the filesystem.
- **AC5 safety:** the launcher is strictly read-only w.r.t. `PROJECT_PATH`; stopping the editor
  does not modify project files.
- **Prerequisite/provisioning:** code-server is **not** bundled — document how to install it
  (e.g. the official install script or a devcontainer feature) and that the launcher fails fast
  with guidance if it is absent.
- **Manual demo (AC1–AC3):** the steps to launch, open the folder in the browser, and use the
  integrated terminal; note to capture startup command + startup duration (PRD §29 evidence).
Keep README, `.harness/README.md`, and `help`/`orient` mutually consistent.

### Acceptance Criteria
- README documents `./harness edit`, `PROJECT_PATH`/`EDITOR_PORT`, the invalid-path behaviour
  (all four cases), the read-only guarantee, the code-server prerequisite, and the manual demo.
- `.harness/README.md` lists the `edit` verb consistently with the contract and `help` output.
- No contradiction between README, `.harness/README.md`, `.harness/contract.yml`, and `help`.

### Test Coverage
- Doc review (checklist) + **TEST-M1** (manual demo follows the documented command) and
  **TEST-M2** (documented invalid-path behaviour reproduced). **TEST-H1/H2** confirm the
  documented command matches the contract.

---

## Task T8: Friction resolution entries (research #22/#23 + verb-routing gap)

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T3, T4
- **Related ADRs:** ADR-0006 (D1,D2,D5,D7)
- **Related Core-Components:** CORE-COMPONENT-0003 (R4/R9 friction conventions)

### Description
The research stage logged inference entries #22 (boot/launch-vs-script + `PROJECT_PATH`) and
#23 (doctor/code-server availability); the Plan stage logged the new `edit` verb-routing gap.
Append **resolution** entries via `./harness friction add` (append-only; never edit prior
lines) recording that #7/ADR-0006 resolved them: the launcher is `scripts/launch-editor.sh`
surfaced as a `mode: exec` `edit` verb wired by contract data (+ minimal `main()` allowlist
edit); `PROJECT_PATH`/`EDITOR_PORT` config; code-server is a documented prerequisite with
manual AC1–AC3 verification and automated AC4–AC5 tests. (Planning does not execute; this runs
during implementation in a shell-capable env.)

### Acceptance Criteria
- New append-only `friction.jsonl` entries reference #7/ADR-0006 and resolve the launch/config,
  provisioning, and verb-routing inferences.
- No existing friction lines edited or removed; each entry answers the KEY_QUESTION verbatim.

### Test Coverage
- Manual review of `./harness friction list`. No automated assertion (append-only log).

---

## Task T9: Manual demonstration of AC1–AC3 (code-server provisioned)

- **Status:** Not started
- **Complexity:** S (manual)
- **Dependencies:** T1–T7
- **Related ADRs:** ADR-0006 (D1,D4,D6,D7)
- **Related Core-Components:** —

### Description
On an environment with code-server provisioned (per T7 docs), demonstrate the acceptance
criteria that cannot be automated here: set `PROJECT_PATH` to a real local folder, run
`./harness edit`, open the served URL in a browser, confirm the **configured folder opens**,
open the **integrated terminal** and run a command in that folder, then Ctrl-C to stop.
Capture the **startup command** and **startup duration** (PRD §29 evidence) and confirm the
project directory is **unchanged** after stopping (AC5). Record the evidence in the issue
implementation notes.

### Acceptance Criteria
- `./harness edit` launches exactly **one** code-server instance against `PROJECT_PATH` (AC1).
- The editor is reachable in the browser and opens the configured folder (AC2).
- The integrated terminal works within the launched editor (AC3).
- Startup command + startup duration are recorded; the project directory is byte-for-byte
  unchanged before/after the demo (AC5).

### Test Coverage
- **TEST-M1** (manual browser + terminal demo) and **TEST-M2** (documented invalid-path
  behaviour) are the acceptance tests for this task.
