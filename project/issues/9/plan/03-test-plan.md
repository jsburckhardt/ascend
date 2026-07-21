# Test Plan: Issue #9 — Capture startup and resource measurements

## Scope & references
- Feature: **#9**. ADR: **none created** (behaviour governed by **ADR-0006**; context
  ADR-0005/0004/0003/0002). Core-components: **none created** (evidence/friction
  governed by **CORE-COMPONENT-0003**).
- Deliverable: a Prototype-0 **evidence document** at
  **`docs/prototype-0/startup-and-resource-measurements.md`**.
- **Tests: N/A (issue statement) — "measurement and documentation story."** No
  application source is added, so **no new unit tests are expected or written**. This
  plan therefore defines **verification checks (VC1–VC8)**: document-completeness
  checks (one per acceptance criterion), a discoverability/link check, a
  gate-still-green check, and a no-source-added check. This is consistent with, and
  the justification for, the issue's "Tests: N/A": there is no new code surface to
  unit-test; correctness = the document records real evidence and the gate stays
  green.
- Harness verbs referenced, enumerated **from `.harness/contract.yml`** (14 verbs;
  **not executed during planning**): `help, orient, doctor, lint, test, build, boot,
  dev, edit, verify, status, clean, friction add, friction list`. #9 uses `edit`
  (capture, T1) and `verify` (gate, T4). Execution verbs
  (lint/test/build/boot/verify/clean/edit) are **NOT** run during planning.
- **Capability-gap note.** The planning environment exposes no shell/`./harness`
  execution tool (only file read/write), so `./harness orient`/`status` could not be
  run live; verbs were read from `.harness/contract.yml`. Additionally, no harness
  verb proves code-server readiness (`doctor` is silent; the launcher exits 127) and
  no capture/measure verb exists — recorded via `./harness friction add`
  (KEY_QUESTION), task **T5**.

## Acceptance-criteria → verification coverage
| Acceptance Criterion | Verification checks |
|---|---|
| **AC1** — startup command + startup duration documented | VC1 (+ VC5 environment, VC7 gate) |
| **AC2** — memory + idle CPU for one session documented | VC2 (+ VC5) |
| **AC3** — editor version + extension-storage + workspace-state recorded | VC3 (+ VC5) |
| **AC4** — behaviour after restart / invalid path / crash documented | VC4 |
| Cross-cutting — document discoverable / links resolve | VC6 |
| Cross-cutting — gate stays green (degraded / exit 0) | VC7 |
| Cross-cutting — no application source added (Tests: N/A justification) | VC8 |

---

## Check VC1: AC1 — startup command + startup duration recorded

- **Type:** Document-completeness verification
- **Task:** T1 (capture), T2 (author)
- **Priority:** High

### Setup
Open `docs/prototype-0/startup-and-resource-measurements.md` §3 (Startup).

### Steps
1. Confirm §3 records the **exact isolated startup command**, i.e. the argv the
   launcher execs: `code-server <PROJECT_PATH> --bind-addr 127.0.0.1:8080 --auth
   none` (or the `EDITOR_PORT` variant actually used).
2. Confirm §3 records a **measured startup duration** with a unit (e.g. seconds),
   captured via `time` and/or the "HTTP server listening" banner delta.
3. Confirm the command shown matches the seam in `scripts/launch-editor.sh` (single
   isolated invocation; no extra flags leaked in).

### Expected Result
§3 contains a real startup command matching the launcher and a real measured
duration — **no placeholder/TODO**. AC1 satisfied.

---

## Check VC2: AC2 — one-session memory + idle CPU recorded

- **Type:** Document-completeness verification
- **Task:** T1, T2
- **Priority:** High

### Setup
Open §4 (Resource usage).

### Steps
1. Confirm §4 records **host-process memory** (RSS) for one idle session with a unit
   (e.g. MB).
2. Confirm §4 records **idle CPU %** for one idle session.
3. Confirm §4 explicitly notes **host-process vs browser** memory (PRD §25 Risk 2)
   and which was measured (or states browser memory was out of scope for the
   baseline).

### Expected Result
§4 contains real memory and idle-CPU numbers with units and the host/browser
distinction — no placeholder. AC2 satisfied.

---

## Check VC3: AC3 — version + extension-storage + workspace-state recorded

- **Type:** Document-completeness verification
- **Task:** T1, T2
- **Priority:** High

### Setup
Open §5 (Version & storage).

### Steps
1. Confirm §5 records `code-server --version` output (a concrete version string).
2. Confirm §5 records the **actual resolved extension-storage path** on the measured
   host (e.g. `~/.local/share/code-server/extensions`, or the real resolved value).
3. Confirm §5 records the **actual resolved workspace-state / `User` path** (e.g.
   `~/.local/share/code-server/User` or `~/.config/code-server`).
4. Confirm the paths are described as **observed on the measured host**, not assumed
   documentation defaults.

### Expected Result
§5 contains the concrete version and the two resolved storage paths as observed —
no placeholder. AC3 satisfied.

---

## Check VC4: AC4 — restart / invalid-path / crash behaviour recorded

- **Type:** Document-completeness verification
- **Task:** T1, T2
- **Priority:** High

### Setup
Open §6 (Operational behaviour).

### Steps
1. **Restart:** confirm §6 records observed behaviour after restarting the same
   session (whether workspace/session state persists).
2. **Invalid path:** confirm §6 records the fail-fast, **read-only**, **non-zero**
   behaviour when `PROJECT_PATH` is invalid, cross-referencing `tests/launcher/`
   (TEST-L1..L4/L6) and the README invalid-path table.
3. **Crash:** confirm §6 records observed behaviour when the code-server process is
   killed (`kill <pid>`) — no supervision/restart per ADR-0006 D6, the exit code
   propagates.

### Expected Result
§6 documents all three behaviours (restart, invalid path, crash) as concrete
observations — no placeholder. AC4 satisfied.

---

## Check VC5: Measurement environment recorded (numbers interpretable)

- **Type:** Document-completeness verification
- **Task:** T1, T2
- **Priority:** High

### Setup
Open §2 (Measurement environment).

### Steps
1. Confirm §2 records host CPU/RAM/OS, `node --version`, and **`code-server
   --version`**.
2. Confirm §2 states code-server was **transiently provisioned** (never a repo
   dependency) and how, and names the measured project (empty vs populated) and the
   capture tools (`time`, `ps`/`/proc`/`top`).
3. Confirm the numbers are labelled a **Prototype-0 single-session baseline**, not a
   load benchmark.

### Expected Result
§2 makes the AC1–AC3 numbers interpretable and honestly scoped — no placeholder.

---

## Check VC6: Document is discoverable and links resolve

- **Type:** Discoverability / link verification
- **Task:** T3
- **Priority:** Medium

### Setup
Open `docs/README.md` and the new document.

### Steps
1. Confirm `docs/README.md` links to
   `docs/prototype-0/startup-and-resource-measurements.md` with a short description.
2. Follow every relative link in the new document (PRD refs, ADR-0006/0005/0004/0003/
   0002, README "Launch the editor" section, `tests/launcher/`) and the `docs/README.md`
   entry — confirm each resolves to a real path/anchor.

### Expected Result
The document is reachable from `docs/README.md` and all links resolve — no broken
links.

---

## Check VC7: `./harness verify` stays degraded / exit 0

- **Type:** Harness (aggregate gate)
- **Task:** T4
- **Priority:** High

### Setup
Docs-only change applied (no `src/`/manifest/launcher/harness edits);
`node_modules` present so `tsc --noEmit` can run.

### Steps
1. Run `./harness verify` (or `./harness verify --json`).
2. Read the overall verdict and exit code.

### Expected Result
`verify` returns **degraded** and **exits 0** — the accepted Prototype-0 posture:
`typecheck=pass`, `test=pass`, `doctor=pass`, `lint`/`build` remain `unknown`,
nothing `fail`. A docs-only change introduces no verdict regression.

---

## Check VC8: No application source added (Tests: N/A justification)

- **Type:** Repository-diff verification
- **Task:** T4
- **Priority:** High

### Setup
Completed change set on branch `issue/9`.

### Steps
1. Run `git diff --name-only` (against the base).
2. Confirm changed paths are limited to `docs/`, `project/issues/9/`, and the
   append-only friction log (`.harness/friction.jsonl`).
3. Confirm `src/`, `package.json`, `package-lock.json`, `scripts/launch-editor.sh`,
   `.harness/contract.yml`, and `harness` are **unchanged** (code-server never added
   as a dependency).

### Expected Result
No application source, manifest, lockfile, launcher, or harness file changed. Because
no code surface is added, **no new unit tests are required** — this is the concrete
justification for the issue's "Tests: N/A". Correctness is established by VC1–VC7
(document records real evidence) plus this no-source-added check.
