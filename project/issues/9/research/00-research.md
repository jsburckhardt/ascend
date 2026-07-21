# Research Brief: Capture startup and resource measurements

## GitHub Issue
- **Issue:** #9
- **Title:** Capture startup and resource measurements

## Scope Classification
- **Scope Type:** issue

**Rationale.** Issue #9 is PRD §29 Prototype 0 item 6 ("Capture startup and
resource measurements"). It is a **measurement + documentation** story whose
sole deliverable is an evidence document: it produces *observations about* the
already-shipped code-server launcher (issue #7 / ADR-0006), not any new durable
mechanism. Nothing about it forces a foundational, hard-to-reverse choice:

- The **thing being measured is already decided and built.** The launch command,
  argument isolation, the loopback bind, and the read-only project-path safety
  are all fixed by **ADR-0006** and implemented in `scripts/launch-editor.sh`,
  surfaced as the harness `edit` verb (`mode: exec`, `npm run edit`). #9 only runs
  it and records what happens.
- **code-server as a documented prerequisite** (not a repo dependency) is settled
  by **ADR-0006 D6/D7**; #9 inherits that decision and its transient-provisioning
  demonstration pattern from #7 (code-server 4.129.0 provisioned to `/tmp/cs`,
  never added as a dependency).
- **Evidence/friction conventions** (where deterministic evidence and honest gaps
  live) are settled by **CORE-COMPONENT-0003**; application docs live under
  `docs/` per `docs/README.md`. #9 reuses these, it does not redefine them.
- **"Tests: N/A"** by the issue's own statement — the artifact is a document, so
  there is no new code surface and therefore no new component contract to define.

This mirrors the classification logic used for **#7** (`issue`, because it reused
decided mechanisms and introduced no comparable irreversible mechanism). #9 is
even further from an architectural decision than #7 was: #7 at least *introduced*
the first editor-provider seam (and flagged an optional ADR); #9 introduces
**no seam, no runtime, no verb** — it consumes them and writes prose + numbers.

> **No decision is made here.** Research proposes; Plan/decider decides. Two
> non-blocking, decision-adjacent observations are surfaced below (a possible
> future `doctor` code-server-readiness diagnostic, and a possible future
> capture/measure harness verb) — both are explicitly **deferred**, not decided,
> and neither is required to ship #9.

### Grounding evidence (harness + on-disk, not inferred)
- `./harness orient` → **`pass`**: Stack "TypeScript + Node.js 22 (LTS) + npm"
  (ADR-0002); operating face `./harness`; contract `.harness/contract.yml` (14
  verbs). The `edit` verb wraps `npm run edit` → `sh scripts/launch-editor.sh`.
- `./harness doctor` → **`degraded`**: `node v22.17.1` (≥22.6.0 true), but
  `node_modules: false` (run `npm install`). Doctor reports **only** Node/toolchain
  health — it is **silent on code-server readiness** (there is no editor-provider
  probe), so it cannot prove the prerequisite this story needs.
- `command -v code-server` → **absent** in this environment. `scripts/launch-editor.sh`
  (lines 52–56) exits **127** with clear guidance when code-server is not on PATH,
  so the launcher **cannot be started here** to capture live measurements without
  first transiently provisioning code-server (the #7 approach).
- `.harness/friction.jsonl` already records (from #7) that `doctor` proves only
  Node/toolchain health, not editor-provider readiness — directly relevant to #9.

## Problem Statement

Ascend needs a **documented baseline of startup and resource measurements for a
single `code-server` session**, so that the upcoming Prototype 0 review/decision
story (PRD §29 item 7) and the later resource-usage risk analysis (PRD §25
**Risk 2**: "Resource usage may be too high") have real evidence — not guesses —
about what one editor session costs before any multi-session strategy is chosen.

PRD Risk 2's mitigation ("measure process memory", "measure browser memory") and
its runtime-model decision options ("one runtime per open project" … "one runtime
only, switching folders") explicitly depend on knowing the per-session cost. This
story provides that first data point. The **single-runtime** vs **per-session**
choice is out of scope here (that is Prototype 3 / the review story); #9 only
supplies the baseline evidence for one session.

**In scope** (issue + PRD §18 "Evidence to capture"):
- The **startup command** and **startup duration** for one session.
- **Memory use** and **idle CPU** for one session.
- **Editor version**, **extension storage location**, **workspace-state location**.
- Observed **behaviour after restart**, **with an invalid path**, and **on editor
  crash**.

**Out of scope** (issue + PRD §29 non-goals):
- **Multi-session** measurement (Prototype 3).
- **Automated performance dashboards**.
- Making the runtime-model decision itself (Prototype 0 review / Prototype 3).

### How the measurements are gathered (given code-server is not installed)
code-server is a **documented prerequisite** and is **absent** in this
devcontainer/CI (`command -v code-server` → none; the launcher exits 127). The
measurements must therefore be captured against a **transiently-provisioned**
code-server, exactly as issue #7 did for its AC1–AC3 live demo:

- **Provision transiently, never as a dependency** (ADR-0006 D7): e.g.
  `curl -fsSL https://code-server.dev/install.sh | sh` (or the standalone release
  placed on `PATH`, as #7 did with 4.129.0 at `/tmp/cs/bin`). Do **not** add
  code-server to the repo.
- **Launch through the sanctioned seam:** `PROJECT_PATH=<dir> ./harness edit`,
  which execs `code-server "$PROJECT_PATH" --bind-addr 127.0.0.1:${EDITOR_PORT:-8080} --auth none`.
  This exact **startup command** is what AC1 asks to be documented.
- **Startup duration:** wrap the launch in `time` and/or read code-server's own
  startup banner → "HTTP server listening" timestamp delta (the #7 demo captured
  ~0.03s to bind / ~1s to first HTTP).
- **Memory / idle CPU:** observe the code-server process tree at idle (e.g. `ps`
  RSS and `%CPU`, `/proc/<pid>/status`, or `top -b -n1`) after the editor has
  loaded and is doing nothing. Distinguish the **host process** memory from
  **browser** memory (PRD §25 Risk 2 lists both) and note which was measured.
- **Version / storage paths:** `code-server --version`; the default
  extension-storage (`~/.local/share/code-server/extensions`) and
  workspace-state / `User/` (`~/.local/share/code-server/User`, or
  `~/.config/code-server`) locations — **record the actual resolved paths on the
  measured host**, not assumed ones.
- **Restart / invalid-path / crash behaviour:** restart the same session and note
  whether state persists; point `PROJECT_PATH` at an invalid target (the launcher
  fails fast, read-only, non-zero — already covered by `tests/launcher/` TEST-L1..L4/L6
  and documented in the README invalid-path table); kill the code-server process
  and record observed behaviour (no supervision/restart per ADR-0006 D6, so the
  handed-off process simply exits and its code propagates).

### Proposed evidence-document location
Per `docs/README.md`, application docs live under `docs/`. The deliverable ("Add
a Prototype 0 measurements/evidence document") should be a single Markdown file,
**proposed path** (for Plan to confirm):
`docs/prototype-0/startup-and-resource-measurements.md`
(alternative flat form: `docs/prototype-0-measurements.md`). The per-issue RPIV
artifacts remain under `project/issues/9/`; the durable, user-facing evidence
document belongs under `docs/` where the review/decision story can cite it.

## Existing Context

**ADRs (all read; `project/architecture/ADR/`):**
- **ADR-0006 — code-server editor-provider launch, argument isolation, and
  read-only project-path safety** *(directly governs this story).* Fixes the
  launch command, the single-launcher argument-isolation seam (PRD §5.7),
  fail-fast read-only path validation, `exec` handoff with no supervision, and
  **D7**: code-server is a **documented prerequisite**, not a bundled dependency.
  #9 measures the behaviour this ADR defines; it introduces no change to it.
- **ADR-0005 — application-serve runtime** (`boot`, Node ≥22.6.0). Establishes the
  `mode: exec` handoff precedent that `edit` reuses; the Ascend `node:http` server
  is a **separate** process from code-server (no integration at Prototype 0).
- **ADR-0004 — interactive/handoff verbs** (`mode: exec`). The category `edit`
  belongs to; relevant because measuring a long-running handoff process differs
  from measuring a run-to-completion command.
- **ADR-0003 — repo-local engineering harness** (`./harness` is the operating
  surface; wrap, never reinvent).
- **ADR-0002 — baseline stack & layout** (TypeScript + Node 22 + npm; no
  frameworks; source under `src/`).
- ADR-0001 is the template.

**Core-components (all read; `project/architecture/core-components/`):**
- **CORE-COMPONENT-0003 — Engineering harness contract, verdicts, and
  evidence/friction conventions.** Governs where deterministic evidence lives
  (`.harness/evidence/`) and how honest gaps are recorded as friction — relevant
  because #9's *inputs* (no code-server present, no measure verb) are honest gaps.
- **CORE-COMPONENT-0002 — Commit Standards** (Conventional Commits, Co-authored-by).
- CORE-COMPONENT-0001 is the template.

**Decision log (`.../ADR/DECISION-LOG.md`):** read; ADR-0006 registered
(Accepted 2026-07-21). No decision in the log concerns measurement/evidence
capture, so #9 does not collide with an existing decision.

**Source & prior artifacts inspected:**
- `scripts/launch-editor.sh` — the launcher (command, flags, fail-fast validation,
  127-on-missing-code-server, `exec` handoff).
- `.harness/contract.yml` — `edit: { maps_to: "npm run edit", mode: exec, json: true }`.
- `README.md` §"Launch the editor (code-server)" — configuration (`PROJECT_PATH`,
  `EDITOR_PORT`), the install-prerequisite note, and the invalid-path table.
- `PRD.md` §29 (Prototype 0 evidence & exit criteria), §18 (Evidence to capture),
  §25 Risk 2 (resource-usage risk + runtime-model options).
- **Issue #7 artifacts** (`project/issues/7/`) — the house style for RPIV briefs
  and, in `implementation/README.md`, the **exact transient-provisioning +
  manual-measurement protocol** #9 should reuse (code-server 4.129.0 to `/tmp/cs`,
  `time ./harness edit`, startup-banner timestamps, before/after snapshot).
- `docs/README.md` — application docs location for the deliverable.

## Proposed ADRs

**None required.** #9 makes no architectural decision: it measures behaviour
already decided by ADR-0006 and produces a document. No new mechanism, seam, or
runtime is introduced.

*Non-blocking, deferred observations (surfaced, not decided):*
- A future story **may** add a `doctor` **code-server-readiness diagnostic**
  (degraded, never fail) so the prerequisite is proved rather than inferred — this
  was already deferred by ADR-0006 D7 and is **not** in scope for #9.
- A future story **may** introduce a harness **capture/measure verb** to make
  resource measurement repeatable — speculative at Prototype 0 and **out of scope**.

If Plan/decider judges the *measurement methodology* itself (what to measure, how,
and the acceptance thresholds for "representative") to be a durable convention
worth pinning, that would be the only candidate for a lightweight ADR — Research
flags it but recommends **no ADR**, since the methodology is one-off Prototype-0
spike evidence, not a standing contract.

## Proposed Core-Components

**None required.** #9 adds no reusable, cross-cutting runtime behaviour or shared
contract; it produces a one-off evidence document. No new component surface is
created, and "Tests: N/A" confirms there is no code contract to formalize.

## Acceptance Criteria (from issue)

Extracted verbatim from the issue body (between the
`<!-- ACCEPTANCE_CRITERIA_START -->` / `<!-- ACCEPTANCE_CRITERIA_END -->` markers):

- [ ] Startup command and startup duration are documented
- [ ] Memory use and idle CPU for one session are documented
- [ ] Editor version, extension storage location, and workspace-state location are recorded
- [ ] Behaviour after restart, with an invalid path, and on editor crash is documented

**Note for Plan/Test (Tests: N/A).** The issue states "N/A — measurement and
documentation story." Verification should therefore focus on
**document-completeness** — confirming the evidence document covers **every** AC
dimension with real captured values (not placeholders) — rather than on code
unit tests. Each AC maps to a required section of the evidence document:

| AC | Required evidence in the document |
|----|-----------------------------------|
| AC1 | Exact `code-server` startup command (the isolated `--bind-addr`/`--auth` argv) + measured startup duration for one session |
| AC2 | One-session memory (host process RSS; note browser vs host per Risk 2) + idle CPU % |
| AC3 | `code-server --version`; resolved extension-storage path; resolved workspace-state / `User` path (actual, on the measured host) |
| AC4 | Observed behaviour after restart, with an invalid `PROJECT_PATH` (fail-fast/read-only), and on editor-process crash (no supervision/restart per ADR-0006 D6) |

## Risks and Open Questions

**Risks**
- **Non-representative measurements** *(issue's own stated risk).* A single idle
  session on an unspecified host may not reflect real usage. **Mitigation:** record
  the measurement environment (CPU, RAM, OS, code-server version, empty vs
  populated project) alongside the numbers, and label them explicitly as a
  Prototype-0 *baseline* for one idle session, not a load benchmark.
- **Environment cannot run the editor as-is.** code-server is absent here and the
  launcher exits 127; measurements **cannot** be captured in this
  devcontainer/CI without transient provisioning. **Mitigation:** reuse the #7
  transient-install protocol; do **not** add code-server as a dependency (ADR-0006 D7).
- **Storage-path assumptions.** Extension-storage and workspace-state locations
  vary by code-server version/OS/`XDG` settings. **Mitigation:** record the
  **actual resolved paths** observed on the measured host, not documentation defaults.
- **"Editor crash" ambiguity.** What constitutes a representative crash (SIGKILL of
  code-server vs an in-editor renderer crash) affects the observed behaviour.
  **Mitigation:** Plan should pick a concrete, reproducible crash simulation
  (e.g. `kill <pid>`) and document exactly what was done.

**Open questions (for Plan/decider — not decided here)**
1. **Exact deliverable path** under `docs/` — proposed
   `docs/prototype-0/startup-and-resource-measurements.md`; confirm the final path
   and whether a `docs/prototype-0/` subdirectory is introduced.
2. **Measurement host & method** — which host/devcontainer provisions code-server,
   and which tool captures memory/CPU (`ps` / `/proc` / `top`). Should the
   before/after and metric-capture steps be codified (e.g. a helper script under
   `scripts/`) or kept as a documented manual runbook (as #7's AC1–AC3 were)?
3. **Host vs browser memory** — PRD §25 Risk 2 lists both; confirm whether #9's
   baseline must include browser memory or host-process memory only (the AC says
   "memory use for one session").
4. **How AC4 restart/crash behaviour is evidenced** — reuse the existing
   `tests/launcher/` invalid-path coverage as the invalid-path evidence, or
   re-capture it live in the document? (Restart/crash behaviour has no automated
   coverage today and must be observed manually.)

**Unknowns the harness could not prove (recorded as friction).** A `friction add`
entry (verb `doctor`) records that Research had to **infer** (a) that measurement
requires a transiently-provisioned code-server (no harness verb proves
editor-provider readiness — `doctor` is silent on it and the launcher exits 127),
and (b) the concrete PRD §18 evidence dimensions and the `docs/` deliverable path,
since no capture/measure verb exists to prove them.
