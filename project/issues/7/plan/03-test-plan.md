# Test Plan: Issue #7 — launch one code-server process against a configured path

## Scope & references
- Feature: #7. ADR: **ADR-0006**. New core-components: **none** (CC-0003 governs the harness).
- Runner: built-in **`node:test`** + `node:child_process` (drives the shell launcher), zero new
  deps (ADR-0005 D7); launcher is POSIX shell (ADR-0006 D1). Tests are **code-server-free** — a
  stub `code-server` on `PATH` stands in for the real binary, so the automated gate stays green
  in CI where code-server is absent.
- Harness verbs referenced (from `.harness/contract.yml` + `harness` script; **not executed
  during planning**): `edit` (new), `boot, dev, test, verify, help, orient, status, doctor,
  lint, build, clean, friction add/list`. Execution verbs (lint/test/build/boot/verify/clean/
  edit) are NOT run in planning.
- **Capability-gap note:** the sandbox has no shell, so `./harness orient`/`status` could not be
  run live; verbs were enumerated from the contract + script. The new-verb-routing gap (a new
  `mode: exec` verb name needs a minimal `main()` allowlist edit) is recorded via
  `./harness friction add` (KEY_QUESTION) — friction entry `edit`.

## Acceptance-criteria → test coverage
| Acceptance Criterion | Tests |
|---|---|
| AC1 — documented script launches **one** code-server against a configured path | TEST-H1, TEST-H2, TEST-L5, TEST-M1, doc-review (T7) |
| AC2 — editor reachable in browser and opens the configured folder | TEST-M1 |
| AC3 — integrated terminal works within the launched editor | TEST-M1 |
| AC4 — launch behaviour when the configured path is invalid is documented | TEST-L1, TEST-L2, TEST-L3, TEST-L4, TEST-L6, TEST-M2, doc-review (T7) |
| AC5 — operation must not delete/move/rename/reset/clean/modify the project directory | TEST-L1, TEST-L5, TEST-L6, TEST-M1 |

Cross-cutting: **§5.7 provider-arg isolation** — TEST-L5, TEST-L7, TEST-L8;
**harness non-hang handoff** — TEST-H1, TEST-H2, TEST-R1; **gate stays green** — TEST-V1.

---

## Test TEST-L1: `PROJECT_PATH` unset → fail-fast, no mutation

- **Type:** Integration (node:test → shell launcher)
- **Task:** T5 (script from T1)
- **Priority:** High

### Setup
Create a temp fixture dir; snapshot it (relative paths + sizes + mtimes). Spawn
`sh scripts/launch-editor.sh` with `PROJECT_PATH` **removed** from `env` and a `PATH` that
includes a stub `code-server` (to prove validation fails *before* launch).

### Steps
1. `spawnSync('sh', [scriptPath], { env })`.
2. Capture exit code + stderr.
3. Re-snapshot the fixture dir (and confirm the stub's argv log is empty).

### Expected Result
Non-zero exit; stderr names the unset/empty `PROJECT_PATH` cause; the stub was **never**
invoked; the fixture snapshot is unchanged (no mutation).

---

## Test TEST-L2: `PROJECT_PATH` empty → fail-fast

- **Type:** Integration (node:test → shell launcher)
- **Task:** T5
- **Priority:** High

### Setup
As TEST-L1 but `PROJECT_PATH=""`.

### Steps
1. Spawn the launcher.
2. Capture exit code + stderr.

### Expected Result
Non-zero exit; clear stderr message; no launch; no mutation.

---

## Test TEST-L3: `PROJECT_PATH` non-existent → fail-fast

- **Type:** Integration (node:test → shell launcher)
- **Task:** T5
- **Priority:** High

### Setup
`PROJECT_PATH=<temp>/does-not-exist-<rand>` (guaranteed absent); stub `code-server` on `PATH`.

### Steps
1. Spawn the launcher.
2. Capture exit code + stderr.
3. Confirm the path was **not** created (no `mkdir`).

### Expected Result
Non-zero exit; stderr clearly states the path does not exist; the path is still absent
afterwards (launcher created nothing); stub never invoked.

---

## Test TEST-L4: `PROJECT_PATH` is a file, not a directory → fail-fast

- **Type:** Integration (node:test → shell launcher)
- **Task:** T5
- **Priority:** High

### Setup
Create a temp **file**; set `PROJECT_PATH` to it; stub `code-server` on `PATH`.

### Steps
1. Spawn the launcher.
2. Capture exit code + stderr.
3. Confirm the file is unchanged (size/mtime).

### Expected Result
Non-zero exit; stderr states the target is not a directory; the file is unchanged; stub never
invoked.

---

## Test TEST-L5: valid dir + stub code-server → isolated args, no mutation

- **Type:** Integration (node:test → shell launcher)
- **Task:** T5 (script from T1)
- **Priority:** High

### Setup
Create a temp fixture dir with a couple of files; snapshot it. Create a stub executable
`code-server` (appends its `argv` to a log, exits 0); prepend its dir to `PATH`. Set
`PROJECT_PATH` to the fixture dir (no `EDITOR_PORT`).

### Steps
1. Spawn `sh scripts/launch-editor.sh`.
2. Read the stub's argv log.
3. Re-snapshot the fixture dir.

### Expected Result
The stub was invoked exactly once with argv
`["<PROJECT_PATH>", "--bind-addr", "127.0.0.1:8080", "--auth", "none"]` (proves single-instance
launch + §5.7 isolated flags); exit code is the stub's (0); the fixture snapshot is **unchanged**
(AC5 — launcher mutated nothing).

---

## Test TEST-L6: valid dir + code-server absent → clear error, no mutation

- **Type:** Integration (node:test → shell launcher)
- **Task:** T5
- **Priority:** High

### Setup
Valid temp fixture dir (snapshot it); `PATH` scrubbed of any `code-server`.

### Steps
1. Spawn the launcher with a valid `PROJECT_PATH`.
2. Capture exit code + stderr.
3. Re-snapshot the fixture dir.

### Expected Result
Non-zero exit; stderr clearly states code-server was not found (documented prerequisite); the
fixture snapshot is unchanged (AC5 holds even on the failure path).

---

## Test TEST-L7: `EDITOR_PORT` override → bind-addr reflects the port

- **Type:** Integration (node:test → shell launcher)
- **Task:** T5
- **Priority:** Medium

### Setup
Valid fixture dir; stub `code-server` on `PATH`; `EDITOR_PORT=9443`.

### Steps
1. Spawn the launcher.
2. Read the stub's argv log.

### Expected Result
Stub argv contains `--bind-addr 127.0.0.1:9443` (port isolation works and stays behind the
launcher seam, §5.7); still `--auth none`; still exactly one invocation.

---

## Test TEST-L8: provider-argument isolation (static, no leakage)

- **Type:** Static / grep assertion (node:test)
- **Task:** T5
- **Priority:** Medium

### Setup
Read the repo files.

### Steps
1. Assert code-server flag tokens (`--bind-addr`, `--auth`, and the `code-server` invocation)
   appear **only** in `scripts/launch-editor.sh`.
2. Assert they do **not** appear in `src/`, `.harness/contract.yml`, or the `harness` script
   (the contract's `edit` verb maps only to `npm run edit`).

### Expected Result
All code-server specifics are isolated to the single launcher seam (PRD §5.7); the core and the
harness stay provider-agnostic.

---

## Test TEST-H1: `./harness edit --print` resolves the command, no hang

- **Type:** Harness (introspection)
- **Task:** T3, T4, T6
- **Priority:** High

### Setup
Wired contract (T3) + routing (T4) in a shell environment.

### Steps
1. Run `./harness edit --print`.
2. Capture stdout + exit code.

### Expected Result
Prints the resolved `npm run edit` (does **not** exec the launcher); exits 0; returns
immediately (no code-server started, no port bound, no hang).

---

## Test TEST-H2: `./harness edit --json` handoff descriptor

- **Type:** Harness (introspection)
- **Task:** T3, T4
- **Priority:** Medium

### Setup
Wired contract + routing.

### Steps
1. `./harness edit --json`.
2. Parse the JSON descriptor.

### Expected Result
Descriptor shows `maps_to: "npm run edit"`, `mode: "exec"`, `interactive: true`, and **no**
`verdict` key (R17.4); exit 0; no execution.

---

## Test TEST-R1: harness regression suite green, no hang

- **Type:** Regression (harness suite)
- **Task:** T6
- **Priority:** High

### Setup
Updated `tests/harness/run.sh` (T6); wired contract + routing.

### Steps
1. `sh tests/harness/run.sh`.
2. Observe pass/fail + completion.

### Expected Result
All cases pass; the suite completes with **no hang** and no leaked port; the new `edit`
assertions pass (contract values, `--print`/`--json`, help listing, exclusion from
run-to-completion enumeration, updated verb count); the suite never execs bare `./harness edit`;
pre-existing cases stay green.

---

## Test TEST-V1: `./harness verify` stays exit-0/degraded with launcher tests wired

- **Type:** Harness (aggregate gate)
- **Task:** T2, T5
- **Priority:** High

### Setup
`node_modules` present (`typescript` + `@types/node`); `test` glob widened (T2); launcher suite
authored (T5).

### Steps
1. `./harness test` → capture the verdict (runs `tests/app/` **and** `tests/launcher/`).
2. `./harness verify --json` → read `test` + overall verdict + exit code.

### Expected Result
`./harness test` → **pass** (launcher + app suites pass). `verify` shows `test=pass` and stays
**degraded / exit 0** (lint/build still `unknown`, none fail); it turns `fail` only if a test or
typecheck fails. The launcher tests keep the gate green **without** code-server installed.

---

## Test TEST-M1: manual demo — launch, open folder, terminal works

- **Type:** Manual
- **Task:** T7, T9
- **Priority:** High

### Setup
Provision code-server per the README (install script / devcontainer feature). Pick a real local
folder and export `PROJECT_PATH` to it; snapshot the folder (e.g. `ls -laR` / a checksum).

### Steps
1. Run the documented command `PROJECT_PATH=<folder> ./harness edit`; note the **startup
   command** and time the **startup duration** (PRD §29 evidence).
2. Open the served URL (`http://127.0.0.1:8080`) in a browser → confirm the editor loads and
   the **configured folder is open** (AC2).
3. Open the **integrated terminal** in the editor and run a command (e.g. `pwd`, `ls`) → confirm
   it runs in the configured folder (AC3).
4. Ctrl-C to stop; re-snapshot the folder.

### Expected Result
Exactly one code-server instance serves the configured folder (AC1); the editor is reachable and
opens the folder (AC2); the integrated terminal works (AC3); startup command + duration are
recorded; the folder snapshot is **unchanged** before/after (AC5 — stopping the editor does not
modify project files).

---

## Test TEST-M2: documented invalid-path behaviour reproduced (AC4)

- **Type:** Manual / doc verification
- **Task:** T7, T9
- **Priority:** Medium

### Setup
Follow the README "invalid path" documentation.

### Steps
1. Run `./harness edit` with `PROJECT_PATH` **unset**, then `=""`, then a **non-existent** path,
   then a **file** path (four runs).
2. Observe the message + exit status for each; confirm the target filesystem is untouched.

### Expected Result
Each case matches the documented behaviour: a clear error on stderr + a non-zero exit, with **no**
filesystem change (no directory created, nothing deleted/moved). Confirms AC4 documentation is
accurate and AC5 holds on every failure path.
