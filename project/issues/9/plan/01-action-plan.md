# Action Plan: Capture startup and resource measurements

## Feature
- **ID:** 9
- **Research Brief:** project/issues/9/research/00-research.md

## Goal

Produce a **Prototype 0 evidence document** that records the startup and resource
cost of **one** idle `code-server` session launched through the sanctioned seam
(`PROJECT_PATH=<dir> ./harness edit` → `scripts/launch-editor.sh` →
`code-server "$PROJECT_PATH" --bind-addr 127.0.0.1:${EDITOR_PORT:-8080} --auth none`).
The document gives the upcoming Prototype 0 review (PRD §29 item 7) and the
resource-usage risk analysis (PRD §25 **Risk 2**) real numbers — not guesses —
for a single session before any multi-session/runtime-model strategy is chosen.

This is a **measurement + documentation** story. Per the research brief
(`scope_type = issue`) it introduces **no new mechanism, seam, runtime, or verb**;
it consumes the launcher/verb already decided by **ADR-0006** (issue #7) and
records observations. The issue states **"Tests: N/A — measurement and
documentation story."**

## ADRs Created

- **None.** This story makes no architectural decision. The thing being measured
  (the launch command, argument isolation, loopback bind, read-only project-path
  safety, `exec` handoff with no supervision, code-server as a *documented
  prerequisite* not a bundled dependency) is fixed by **ADR-0006** and implemented
  in `scripts/launch-editor.sh`. Own inspection of the launcher, the harness
  contract, and the README confirms the seam already exists on this branch — there
  is no genuine, unavoidable architectural decision to record. The research
  explicitly ruled one out (PRD §28.7 / ADR-0002 forbid speculative abstractions
  at Prototype 0). **No DECISION-LOG.md change is made.**

  *Deferred, non-blocking observations (surfaced by research, NOT decided here):*
  a future `doctor` code-server-readiness diagnostic, and a future capture/measure
  harness verb. Both are out of scope for #9.

## Core-Components Created

- **None.** #9 adds no reusable, cross-cutting runtime behaviour or shared
  contract; it produces a one-off evidence document. "Tests: N/A" confirms there
  is no code contract to formalize. Evidence/friction conventions are already
  governed by **CORE-COMPONENT-0003**; this story reuses them.

## Context ADRs / core-components (authored by prior stories, referenced only)

- **ADR-0006** — code-server launch, argument isolation, read-only project-path
  safety. *Directly governs the behaviour being measured.* D4 (config via
  `PROJECT_PATH`/`EDITOR_PORT`, loopback + `--auth none`), D5 (read-only fail-fast
  on invalid path), D6 (`exec` handoff, no supervision → crash simply propagates
  exit code), D7 (code-server is a documented prerequisite; provision transiently,
  never as a dependency).
- **ADR-0005** — application-serve runtime (`boot`). Establishes the `mode: exec`
  handoff precedent `edit` reuses; the Ascend `node:http` server is a **separate**
  process from code-server (no integration at Prototype 0) — relevant when
  isolating which process the memory/CPU numbers describe.
- **ADR-0004** — interactive/handoff verbs (`mode: exec`). `edit` belongs to this
  category; measuring a long-running handoff differs from a run-to-completion verb.
- **ADR-0003** — repo-local engineering harness (`./harness` is the single
  operating surface; the measurements are taken through it, not by reinventing it).
- **ADR-0002** — baseline stack & layout; forbids speculative frameworks — the
  reason this story stays a document and adds no capture tooling.
- **CORE-COMPONENT-0003** — harness contract, verdicts, evidence/friction
  conventions. The story's *inputs* (no code-server present, no measure verb) are
  honest gaps recorded as friction; the durable evidence lives under `docs/`.

## Evidence document — confirmed target path

**`docs/prototype-0/startup-and-resource-measurements.md`** (the research's
proposed path is **confirmed**; a `docs/prototype-0/` subdirectory is introduced
so later Prototype-0 evidence documents can sit beside it). The per-issue RPIV
artifacts stay under `project/issues/9/`; the durable, user-facing evidence
document belongs under `docs/` where the review/decision story can cite it, per
`docs/README.md`.

### Section outline (each AC maps to one required section)

| Section | Content | AC |
|---------|---------|----|
| **1. Purpose & scope** | One idle session baseline for Prototype 0; explicitly *not* a multi-session load benchmark; links to PRD §18/§25/§29 and ADR-0006. | — |
| **2. Measurement environment** | Host CPU/RAM/OS, Node version, **code-server version**, how code-server was transiently provisioned (never a repo dependency), the measured project (empty vs populated), and the capture tools used (`time`, `ps`/`/proc`/`top`). Labels the numbers a Prototype-0 *baseline*. | (context for all) |
| **3. Startup** | The exact isolated startup command (`code-server <path> --bind-addr 127.0.0.1:8080 --auth none`) and the measured **startup duration** (wall-clock via `time` and/or the "HTTP server listening" banner delta). | **AC1** |
| **4. Resource usage (one session, idle)** | Host-process **memory** (RSS) and **idle CPU %** after load; explicitly notes host-process vs browser memory (PRD §25 Risk 2 lists both) and which was measured. | **AC2** |
| **5. Version & storage locations** | `code-server --version`; the **actual resolved** extension-storage path and workspace-state/`User` path observed on the measured host (not documentation defaults). | **AC3** |
| **6. Operational behaviour** | Observed behaviour **after restart** (does session/workspace state persist?), **with an invalid `PROJECT_PATH`** (fail-fast, read-only, non-zero — cross-referencing `tests/launcher/` TEST-L1..L4/L6 and the README invalid-path table), and **on editor crash** (`kill <pid>` — no supervision/restart per ADR-0006 D6, so the handed-off process exits and its code propagates). | **AC4** |
| **7. Caveats & follow-ups** | Non-representativeness caveat; deferred `doctor` readiness probe and capture verb; pointer to the Prototype 0 review story (PRD §29 item 7). | — |

## Measurement procedure (how the numbers are gathered)

code-server is **absent** in this devcontainer/CI (`command -v code-server` →
none; the launcher exits **127** with guidance). Measurements are therefore
captured against a **transiently-provisioned** code-server, exactly as issue #7
did for its AC1–AC3 demo:

1. **Provision transiently, never as a dependency** (ADR-0006 D7): e.g.
   `curl -fsSL https://code-server.dev/install.sh | sh`, or the standalone release
   placed on `PATH` (as #7 did with 4.129.0 at `/tmp/cs/bin`). **Do not** add
   code-server to `package.json`/`package-lock.json` or the devcontainer.
2. **Record the environment first** (§2): host CPU/RAM/OS, `node --version`,
   `code-server --version`, the measured project directory (empty vs populated).
3. **Startup (AC1):** launch through the seam
   `PROJECT_PATH=<dir> ./harness edit`; wrap in `time` and/or read code-server's
   startup banner → first `HTTP server listening` timestamp delta. Record the
   exact argv the launcher execs (it is the only file holding code-server flags).
4. **Memory / idle CPU (AC2):** once the editor has loaded and is idle, observe
   the code-server process tree (`ps -o rss,pcpu`, `/proc/<pid>/status`, or
   `top -b -n1`). Record host-process RSS + idle CPU %; note browser memory
   separately if measured, else state it was out of scope for the baseline.
5. **Version / storage paths (AC3):** `code-server --version`; resolve the actual
   extension-storage dir (default `~/.local/share/code-server/extensions`) and
   workspace-state/`User` dir (`~/.local/share/code-server/User` or
   `~/.config/code-server`) **on the measured host** — record what exists, not the
   default doc value.
6. **Restart / invalid-path / crash (AC4):** restart the same session and note
   whether state persists; point `PROJECT_PATH` at an invalid target and record
   the fail-fast, read-only, non-zero behaviour (cross-reference `tests/launcher/`
   TEST-L1..L4/L6 + the README table — no need to re-derive it, but confirm it);
   `kill <pid>` the running code-server and record the observed exit (no
   supervision/restart per ADR-0006 D6).
7. **Stop** with Ctrl-C; confirm the project directory is unchanged (read-only
   guarantee, ADR-0006 D5).

## AC → document section → verification mapping

| AC | Document section | Verification check (03-test-plan) |
|----|------------------|-----------------------------------|
| AC1 — startup command + startup duration documented | §3 Startup | VC1 |
| AC2 — memory + idle CPU for one session documented | §4 Resource usage | VC2 |
| AC3 — editor version, extension-storage, workspace-state recorded | §5 Version & storage | VC3 |
| AC4 — behaviour after restart / invalid path / crash documented | §6 Operational behaviour | VC4 |
| (context) environment recorded so numbers are interpretable | §2 Environment | VC5 |
| Document discoverable / linked; links resolve | `docs/README.md` link | VC6 |
| Harness gate still green (degraded / exit 0) | — | VC7 |
| No application source added (`src/` untouched) | — | VC8 |

## Implementation Tasks (outline — full detail in 02-task-breakdown.md)

- **T1 (M, manual)** — Provision code-server transiently and **capture the raw
  measurements** for one idle session (startup command+duration, host memory+idle
  CPU, version+resolved storage paths, restart/invalid-path/crash behaviour, and
  the environment metadata). Record raw values in the issue implementation notes.
  [ADR-0006 D4,D5,D6,D7; ADR-0004; CC-0003 evidence conventions]
- **T2 (M)** — **Author the evidence document**
  `docs/prototype-0/startup-and-resource-measurements.md` (§1–§7 above) populated
  with the **real captured values** from T1 (no placeholders), labelled a
  Prototype-0 single-session baseline. [ADR-0006; ADR-0002; CC-0003]
- **T3 (XS)** — **Register/link** the new document from `docs/README.md` so it is
  discoverable, and confirm all in-document links (PRD/ADR/README/`tests/launcher/`)
  resolve. [CC-0003 R1 truthful docs; ADR-0003]
- **T4 (S)** — **Verify the gate and document completeness**: confirm
  `./harness verify` remains **degraded / exit 0** (no source changed → no verdict
  regression), confirm `src/` and `package.json`/lockfile are untouched (code-server
  never added as a dependency), and run the document-completeness checks VC1–VC6.
  [ADR-0003; ADR-0006 D7; CC-0003]
- **T5 (XS)** — Append **friction resolution** entries via `./harness friction add`
  recording that #9 resolved the research inferences (measurement required a
  transiently-provisioned code-server because no harness verb proves editor
  readiness; the PRD §18 evidence dimensions and the `docs/` deliverable path were
  inferred). Append-only; never edit prior lines. [CC-0003 R4,R9]

**Dependency order:** T1 → T2 → T3 → T4; T5 after T1. T4 is the final gate.

## Harness verbs referenced

Enumerated **from `.harness/contract.yml`** (14 verbs): `help, orient, doctor,
lint, test, build, boot, dev, edit, verify, status, clean, friction add,
friction list`. This story uses `edit` (to capture the live measurements, T1) and
`verify` (final gate, T4), plus `friction add` (T5) and `orient`/`status` for
scoping. **No execution verb (lint/test/build/boot/verify/clean/edit) is run
during planning** — planning does not execute tasks.

**Capability gap (would be recorded via `./harness friction add`, KEY_QUESTION:
"What did the agent have to infer that the harness should have proved?").** The
planning environment exposes no shell/`./harness` execution tool (only file
read/write), so `./harness orient` and `./harness status` could **not** be run
live during planning; the verb surface was read deterministically from
`.harness/contract.yml` and the `harness` script instead. Separately, no harness
verb proves **code-server readiness** (`doctor` is silent on it; the launcher
exits 127 when it is absent) and no **capture/measure** verb exists — so T1 must
transiently provision code-server and measure manually. These inferences are the
subject of the T5 friction entries.
