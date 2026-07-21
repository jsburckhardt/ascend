# Task Breakdown: Issue #9 — Capture startup and resource measurements

> This is a **measurement + documentation** story (`scope_type = issue`; **no ADRs,
> no core-components** created). The issue states **"Tests: N/A — measurement and
> documentation story"**, so "test coverage" below means **document-completeness /
> verification checks** (defined in `03-test-plan.md` as VC1–VC8), not new code unit
> tests. Every task references the ADRs/core-components that govern the behaviour
> being measured (nothing new is authored). Acceptance criteria (issue): **AC1**
> startup command + duration documented; **AC2** memory + idle CPU for one session
> documented; **AC3** editor version + extension-storage + workspace-state recorded;
> **AC4** behaviour after restart, with an invalid path, and on editor crash
> documented.
>
> **Confirmed evidence-document path:** `docs/prototype-0/startup-and-resource-measurements.md`.
>
> **Dependency order:** T1 → T2 → T3 → T4 (final gate); T5 after T1.

---

## Task T1: Capture raw startup and resource measurements (transient code-server)

- **Status:** Not started
- **Complexity:** M (manual; requires a code-server-provisioned host)
- **Dependencies:** None
- **Related ADRs:** ADR-0006 (D4 config, D5 read-only fail-fast, D6 exec handoff / no supervision, D7 documented prerequisite + transient provisioning), ADR-0004 (mode:exec handoff), ADR-0005 (code-server is a separate process from the Ascend node:http server)
- **Related Core-Components:** CORE-COMPONENT-0003 (evidence/friction conventions; honest gaps for absent code-server)

### Description
On an environment where code-server can be **transiently provisioned** (it is
absent in this devcontainer/CI; `command -v code-server` → none; the launcher exits
**127**), gather the raw numbers for **one idle session** launched through the
sanctioned seam. **Do not add code-server as a repo dependency** (ADR-0006 D7) — use
`curl -fsSL https://code-server.dev/install.sh | sh` or a standalone release on
`PATH` (the #7 pattern, e.g. 4.129.0 at `/tmp/cs/bin`).

Capture and record (in the issue implementation notes) each of:
1. **Environment metadata:** host CPU/RAM/OS, `node --version`,
   `code-server --version`, provisioning method, and the measured project directory
   (empty vs populated).
2. **Startup (AC1):** run `PROJECT_PATH=<dir> ./harness edit`; record the exact
   argv the launcher execs (`code-server <dir> --bind-addr 127.0.0.1:8080 --auth
   none`) and the **startup duration** via `time` and/or the "HTTP server listening"
   banner timestamp delta.
3. **Resource usage (AC2):** at idle after load, record host-process **RSS** and
   **idle CPU %** (`ps -o rss,pcpu`, `/proc/<pid>/status`, or `top -b -n1`); note
   host-process vs browser memory (PRD §25 Risk 2) and which was measured.
4. **Version & storage (AC3):** `code-server --version`; the **actual resolved**
   extension-storage path and workspace-state/`User` path on the measured host (not
   documentation defaults).
5. **Operational behaviour (AC4):** restart the session (does state persist?);
   point `PROJECT_PATH` at an invalid target (confirm fail-fast, read-only,
   non-zero — cross-check `tests/launcher/` TEST-L1..L4/L6); `kill <pid>` the running
   code-server and record the observed exit (no supervision/restart per ADR-0006 D6).
6. Stop with Ctrl-C; confirm the project directory is byte-for-byte unchanged
   (ADR-0006 D5 read-only guarantee).

### Acceptance Criteria
- All six items above are captured as **concrete recorded values** (real numbers,
  real resolved paths, real observed behaviour) — **no placeholders/TODOs**.
- code-server is provisioned **transiently**; `package.json`, `package-lock.json`,
  and the devcontainer are **unchanged** (code-server never added as a dependency).
- Measurements are taken through `./harness edit` (the sanctioned seam), not by
  invoking `code-server` directly, so the recorded startup command matches the
  launcher's isolated argv.
- The measured host/environment is recorded alongside the numbers so they are
  interpretable as a Prototype-0 single-session baseline.

### Test Coverage (verification, not unit tests)
- Feeds **VC1–VC5** in `03-test-plan.md` (each AC dimension + environment metadata
  must be present and non-placeholder in the document authored in T2).
- No automated unit test (Tests: N/A). Verification is that T2's document contains
  these captured values; the raw capture is reviewed against this task's checklist.

---

## Task T2: Author the evidence document

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T1 (needs the captured values)
- **Related ADRs:** ADR-0006 (behaviour being documented), ADR-0002 (dependency-light; no capture tooling added), ADR-0005 (separate process), ADR-0004 (handoff)
- **Related Core-Components:** CORE-COMPONENT-0003 (durable evidence lives under docs/; truthful docs)

### Description
Create **`docs/prototype-0/startup-and-resource-measurements.md`** (introduce the
`docs/prototype-0/` subdirectory) with sections **§1–§7** per the action plan
outline, populated with the **real captured values from T1**:
- **§1 Purpose & scope** — one idle session baseline; explicitly *not* a
  multi-session load benchmark; links to PRD §18/§25/§29 and ADR-0006.
- **§2 Measurement environment** — host CPU/RAM/OS, Node + code-server versions,
  transient-provisioning method, measured project (empty vs populated), capture
  tools; label the numbers a Prototype-0 baseline.
- **§3 Startup (AC1)** — exact isolated startup command + measured startup duration.
- **§4 Resource usage (AC2)** — host-process RSS + idle CPU %; host vs browser note.
- **§5 Version & storage (AC3)** — `code-server --version`; resolved extension-storage
  path; resolved workspace-state/`User` path (actual, on the measured host).
- **§6 Operational behaviour (AC4)** — restart, invalid-path (cross-reference
  `tests/launcher/` + README table), and crash (`kill`, no supervision) behaviour.
- **§7 Caveats & follow-ups** — non-representativeness caveat; deferred `doctor`
  readiness probe + capture verb; pointer to the Prototype 0 review (PRD §29 item 7).

Do **not** modify application source (`src/`), `package.json`, the lockfile, the
launcher, or the harness — this task writes documentation only.

### Acceptance Criteria
- `docs/prototype-0/startup-and-resource-measurements.md` exists with §1–§7.
- **AC1** §3 records the exact `code-server … --bind-addr 127.0.0.1:8080 --auth none`
  command and a measured startup duration.
- **AC2** §4 records one-session host memory (RSS) and idle CPU %, noting host vs
  browser.
- **AC3** §5 records `code-server --version` and the two resolved storage paths
  observed on the measured host.
- **AC4** §6 documents restart, invalid-path (fail-fast/read-only/non-zero), and
  crash (no supervision, exit propagates) behaviour.
- All values are **real captured measurements**, not placeholders; the document is
  labelled a Prototype-0 single-session baseline with its measurement environment.
- No file under `src/`, no `package.json`/lockfile, no launcher/harness file is
  changed by this task.

### Test Coverage (verification, not unit tests)
- **VC1** (AC1), **VC2** (AC2), **VC3** (AC3), **VC4** (AC4), **VC5** (environment)
  in `03-test-plan.md` — each confirms the required recorded evidence is present and
  non-placeholder.
- Doc-review checklist against §1–§7. No new unit test (Tests: N/A — no code added).

---

## Task T3: Register and link the evidence document

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T2
- **Related ADRs:** ADR-0003 (single documented surface / discoverability), ADR-0002 (docs under docs/)
- **Related Core-Components:** CORE-COMPONENT-0003 (R1 truthful, discoverable docs)

### Description
Make the new document **discoverable**: add a link to
`docs/prototype-0/startup-and-resource-measurements.md` from `docs/README.md`
(e.g. a "Prototype 0 evidence" entry). Confirm every in-document link
(PRD sections, ADR-0006/0005/0004/0003/0002, README "Launch the editor" section,
`tests/launcher/`) resolves to a real path/anchor.

### Acceptance Criteria
- `docs/README.md` links to the new document with a short description.
- All relative links in the new document and the `docs/README.md` entry resolve
  (no broken paths/anchors).
- No application source changed; only `docs/` files touched.

### Test Coverage (verification, not unit tests)
- **VC6** in `03-test-plan.md` — document is linked from `docs/README.md` and all
  links resolve. Doc-review / link-check. No unit test.

---

## Task T4: Verify the harness gate and document completeness

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T2, T3
- **Related ADRs:** ADR-0003 (harness is the gate; exit-code contract), ADR-0006 (D7 verification posture; code-server not a dependency), ADR-0002
- **Related Core-Components:** CORE-COMPONENT-0003 (verdicts, degraded/exit-0 posture)

### Description
Confirm the change ships without regressing the gate or the codebase:
1. Run `./harness verify` and confirm it stays **degraded / exit 0** (the accepted
   Prototype-0 posture) — because only `docs/` changed, `typecheck=pass`,
   `test=pass`, `doctor=pass`, `lint`/`build` remain `unknown`; nothing turns `fail`.
2. Confirm **no application source was added or changed**: `git status`/`git diff`
   shows changes limited to `docs/`, `project/issues/9/`, and (T5) the append-only
   friction log — `src/`, `package.json`, `package-lock.json`, `scripts/`,
   `.harness/contract.yml`, and `harness` are **untouched** (code-server was never
   added as a dependency).
3. Run the document-completeness checks **VC1–VC6** and record the outcome in the
   issue implementation notes.

### Acceptance Criteria
- `./harness verify` returns **degraded** and **exits 0** (no new `fail`; no verdict
  regression from the docs-only change).
- `git diff --name-only` shows only `docs/`, `project/`, and the friction log —
  no `src/`/manifest/lockfile/launcher/harness changes.
- VC1–VC6 all pass (each AC dimension is present and non-placeholder; the document
  is linked and links resolve).

### Test Coverage (verification, not unit tests)
- **VC7** (`./harness verify` degraded/exit 0), **VC8** (no application source
  added), plus confirmation of **VC1–VC6** in `03-test-plan.md`. This task is the
  aggregate verification gate for the story.

---

## Task T5: Append friction resolution entries

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T1
- **Related ADRs:** ADR-0006 (D7 documented prerequisite), ADR-0003 (harness surface)
- **Related Core-Components:** CORE-COMPONENT-0003 (R4/R9 friction conventions; append-only)

### Description
Append **resolution** friction entries via `./harness friction add` (append-only;
never edit prior lines) recording what #9 had to infer that the harness could not
prove, per the research brief:
- Measurement required a **transiently-provisioned code-server** because **no
  harness verb proves editor-provider readiness** (`doctor` is silent; the launcher
  exits 127 when code-server is absent).
- The concrete **PRD §18 evidence dimensions** and the **`docs/` deliverable path**
  were inferred (no capture/measure verb exists to prove them).
- (Planning-environment note) `./harness orient`/`status` could not be run during
  planning because no shell/`./harness` execution tool was available; the verb
  surface was read from `.harness/contract.yml`.

Each entry answers the KEY_QUESTION ("What did the agent have to infer that the
harness should have proved?") verbatim. This runs during implementation in a
shell-capable environment; planning does not execute it.

### Acceptance Criteria
- New append-only `friction.jsonl` entries reference #9/ADR-0006 and record the
  code-server-readiness gap, the inferred evidence dimensions + docs path, and the
  planning no-shell gap.
- No existing friction lines edited or removed; each entry answers the KEY_QUESTION.

### Test Coverage (verification, not unit tests)
- Manual review via `./harness friction list`. No automated assertion (append-only
  log). Not part of VC1–VC8 but required for CC-0003 R4/R9 compliance.
