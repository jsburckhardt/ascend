# Action Plan: Review Prototype 0 evidence and record the decision

## Feature
- **ID:** 10
- **Research Brief:** project/issues/10/research/00-research.md

## Goal

Produce the mandatory **Prototype 0 decision record** required by PRD §28.2 and
listed as PRD §29 Prototype 0 item 7. This is the **review + synthesis endpoint**
of the Prototype 0 chain (#3–#9): it consolidates the scattered per-issue evidence
into one durable, discoverable artifact and records an **explicit continue /
change / stop decision** with a next-step recommendation for Prototype 1. It gates
whether Prototype 1 is planned (PRD §28.1; parent feature #2, umbrella epic #1).

This is a **review + documentation** story. Per the research brief
(`scope_type = issue`) it introduces **no new mechanism, seam, runtime, verb, ADR,
or core-component** — every Prototype 0 architecture decision already exists and is
registered as ADR-0002..ADR-0006 (plus CORE-COMPONENT-0002/0003) in
`project/architecture/ADR/DECISION-LOG.md`. The record **recites and references**
those decisions; it does not create or amend any of them. The issue states
**"Tests: N/A — review and documentation story."**

## ADRs Created

- **None.** #10 makes **no** architectural decision — it **records** decisions
  already made. Own inspection of `project/architecture/ADR/` (ADR-0002..0006, all
  Accepted) and `DECISION-LOG.md` (72 derived decisions D1–D72; **no** entry
  concerns a "prototype decision record") confirms there is no genuine, unavoidable
  architectural choice to formalize here. The one *decision* the record contains —
  continue/change/stop for Prototype 1 — is a **program / planning** decision
  (PRD §28.1/§28.2), not an architectural one. **No `DECISION-LOG.md` change is
  made** (last decision remains #72).

  *(The only conceivable ADR candidate — pinning a standing "prototype-review /
  decision-record convention" as a process contract — was considered and rejected:
  PRD §28.2 already defines the required contents, so a decision record is a
  documented process output, not a new architectural decision. Research recommends
  no ADR; this plan confirms none.)*

## Core-Components Created

- **None.** #10 adds no reusable, cross-cutting runtime behaviour or shared
  contract; it produces a one-off review artifact. "Tests: N/A" confirms there is
  no code contract to formalize. The commit and harness conventions it follows are
  already **CORE-COMPONENT-0002** (Commit Standards) and **CORE-COMPONENT-0003**
  (harness contract / evidence & friction conventions); this story reuses them.

## Context ADRs / core-components (authored by prior stories, cited by the record)

The decision record **recites** these (IDs + titles + one-line summaries) in its
Architecture-decisions section (AC3) and links `DECISION-LOG.md` for the full
derived list:

- **ADR-0002** — Ascend baseline technology stack and repository layout.
  TypeScript + Node.js 22 LTS + npm; `src/` layout; `npm install` single setup
  entry; no frameworks; **no DevDeck migration**. *(Answers Prototype 0 Q1 + Q3.)*
- **ADR-0003** — Adopt a repo-local engineering harness (`./harness`) as the single
  operating surface; one verdict per verb; evidence/friction conventions.
- **ADR-0004** — Interactive/handoff verbs (`mode: exec`) that hand off the process
  instead of returning a verdict (precedent reused by `boot` and `edit`).
- **ADR-0005** — Ascend application-serve runtime: dependency-free `node:http`
  server; `node --experimental-strip-types` runtime (Node ≥22.6.0 floor);
  `GET /health` + shell; `boot` handoff; `node:test` runner. *(Answers Q3.)*
- **ADR-0006** — code-server editor-provider launch, argument isolation, read-only
  project-path safety; one child process via a single launcher seam; `PROJECT_PATH`
  config; loopback bind; fail-fast read-only validation; exit-code passthrough, no
  supervision; code-server a documented prerequisite. *(Answers Q2 + Q4.)*
- **CORE-COMPONENT-0002** — Commit Standards (Conventional Commits, Co-authored-by).
- **CORE-COMPONENT-0003** — engineering harness contract, verdicts,
  evidence/friction conventions.

## Deliverable — confirmed target path

**`docs/prototype-0/decision-record.md`** — a **sibling** of the existing
`docs/prototype-0/startup-and-resource-measurements.md`.

**Justification (confirmed by own inspection, not invented):** the
`docs/prototype-0/` subdirectory **already exists** and already holds Prototype 0
evidence, and `docs/README.md` already curates a **"Prototype 0 evidence"** heading
that links the measurements doc. Placing the decision record as a sibling keeps all
durable, user-facing Prototype 0 artifacts together and discoverable, and lets the
record cite the measurements doc with a short relative link. The per-issue RPIV
artifacts stay under `project/issues/10/`; the durable record belongs under
`docs/`.

*Rejected alternative:* `docs/decisions/prototype-0.md` — introduces a **new**
`docs/decisions/` tree with no prior art, fragmenting Prototype 0 evidence away
from the established `docs/prototype-0/` folder. Prefer the convention already on
disk.

## Section outline (maps 1:1 to PRD §28.2 required contents and the 4 ACs)

| § | Section | PRD §28.2 requirement | AC | Evidence sources feeding it |
|---|---------|-----------------------|----|-----------------------------|
| 1 | **Header & context** | (framing) | — | Prototype 0 objective + the four Questions (PRD Prototype 0 §Questions); links to feature #2, epic #1, PRD §28.1/§28.2/§29 |
| 2 | **Findings** — per-question answers Q1–Q4 | findings | **AC1** | Q1 independent repo → #3 (`project/issues/3/verify/summary.md`, `package.json`, `tsconfig.json`, `.nvmrc`, `README.md`; ADR-0002); Q2 reliable code-server launch → #7 (`project/issues/7/verify/summary.md`, `scripts/launch-editor.sh`; ADR-0006); Q3 minimum environment → #5/#6/#9 (ADR-0005; `src/server.ts`); Q4 safe in-place editing → #8 (`project/issues/8/verify/summary.md`, `tests/launcher/`) |
| 3 | **Measurements** | measurements | **AC1** | #9 single-session baseline (`docs/prototype-0/startup-and-resource-measurements.md`): startup ~0.65 s, RSS ≈153 MiB, idle CPU ~0 %, version 4.129.0, resolved storage paths — carry the "single idle session / not a benchmark" caveat |
| 4 | **Screenshots / demo notes** | screenshots/demo notes | **AC1** | #7 AC1–AC3 live launch (`project/issues/7/implementation/README.md`); #8 live 2026-07-21 edit/save round-trip + integrated terminal (`project/issues/8/verify/summary.md`, `project/issues/8/implementation/README.md`). Note where captured evidence lives; no new screenshots required |
| 5 | **Problems encountered** | problems encountered | **AC2** | `.harness/friction.jsonl` (across #7/#8/#9): `doctor` silent on editor-provider readiness; code-server absent in devcontainer/CI (launcher exits 127); no capture/measure verb |
| 6 | **Assumptions disproved / confirmed** | assumptions disproved | **AC2** | code-server need not be a repo dependency (documented prerequisite worked); editing is **in place** (no import/copy) — #8; startup/idle cost modest for one session — #9 |
| 7 | **Architecture decisions** | architecture decisions | **AC3** | Recite ADR-0002..0006 (IDs + titles + one-line summaries) + CORE-COMPONENT-0002/0003; link `project/architecture/ADR/DECISION-LOG.md` for D1–D72 |
| 8 | **Next-step recommendation** | next-step recommendation | **AC4** | Recommendation regarding Prototype 1 ("Host One Project Inside Ascend"), grounded in PRD Prototype 0 §Exit criteria being met per #7/#8/#9 |
| 9 | **Explicit decision** | continue/change/stop decision | **AC4** | A clearly-labelled **continue / change / stop** statement (the actual call is the human decider's, made in the record) |

## AC → document section → verification mapping

| AC | Document section(s) | Verification check (03-test-plan) |
|----|---------------------|-----------------------------------|
| AC1 — record exists with findings + measurements + demo notes | §2, §3, §4 | VC1 |
| AC2 — problems encountered + assumptions disproved documented | §5, §6 | VC2 |
| AC3 — Prototype 0 architecture decisions recorded (by ID) | §7 | VC3 |
| AC4 — explicit continue/change/stop + next-step recommendation | §8, §9 | VC4 |
| (fidelity) measurement numbers match the #9 baseline | §3 | VC5 |
| discoverable / internal links resolve | §1 links + `docs/README.md` | VC6 |
| harness gate still green (degraded / exit 0), typecheck clean | — | VC7 |
| no application source added (Tests: N/A justification) | — | VC8 |

## `docs/README.md` index update

`docs/README.md` already has a **"Prototype 0 evidence"** section listing the
measurements doc. This story **adds a second bullet** under that same heading
linking `prototype-0/decision-record.md` with a one-line description (the Prototype
0 continue/change/stop decision record consolidating #3–#9), so the record is
discoverable alongside the measurements it cites (see task T2).

## Implementation Tasks (outline — full detail in 02-task-breakdown.md)

- **T1 (M)** — **Author `docs/prototype-0/decision-record.md`** with sections §1–§9
  above, populated from the **real #3–#9 evidence** (no placeholders): findings
  citing evidence paths, measurements copied faithfully from the #9 baseline,
  demo notes for #7/#8, problems from `.harness/friction.jsonl`, assumptions
  disproved/confirmed, ADR-0002..0006 recited, a next-step recommendation, and an
  explicit continue/change/stop decision. [Cites ADR-0002..0006; CC-0002/0003]
- **T2 (XS)** — **Register/link** the record from `docs/README.md` under the
  existing "Prototype 0 evidence" heading; confirm every in-document relative link
  (ADRs, `startup-and-resource-measurements.md`, PRD refs, #3–#9 verify summaries,
  `DECISION-LOG.md`) resolves. [ADR-0003; CC-0003 R1 truthful/discoverable docs]
- **T3 (S)** — **Verify the gate and document completeness**: confirm
  `./harness verify` stays **degraded / exit 0** and `npm run typecheck` is clean
  (docs-only change), confirm `src/`/`package.json`/lockfile/launcher/harness are
  untouched, cross-check the measurement numbers against the #9 baseline, and run
  the document-completeness checks VC1–VC6. [ADR-0003; CC-0003 verdicts]
- **T4 (XS)** — Append a **friction resolution** entry via `./harness friction add`
  recording that #10 resolved the research inference (the decision record's
  deliverable path and section structure had to be inferred — no harness verb
  reviews prototype evidence or emits a continue/change/stop verdict). Append-only;
  never edit prior lines. [CC-0003 R4/R20 friction/KEY_QUESTION]

**Dependency order:** T1 → T2 → T3 (final gate); T4 after T1.

## Harness verbs referenced

Enumerated **from `.harness/contract.yml`** (14 verbs): `help, orient, doctor,
lint, test, build, boot, dev, edit, verify, status, clean, friction add,
friction list`. This story uses `verify` (final gate, T3) and `friction add`
(T4), plus `orient`/`status` for scoping. **No execution verb
(lint/test/build/boot/verify/clean/edit) is run during planning** — planning does
not execute tasks.

**Capability gap (recorded via `./harness friction add`, KEY_QUESTION: "What did
the agent have to infer that the harness should have proved?").** The planning
environment exposes no shell/`./harness` execution tool (only file read/write and
`git`/`curl`/`gh`), so `./harness orient` and `./harness status` could **not** be
run live during planning; the verb surface was read deterministically from
`.harness/contract.yml` and the `harness` script instead. Separately, **no harness
verb reviews prototype evidence or emits a continue/change/stop verdict**, so the
decision record's deliverable path (`docs/prototype-0/decision-record.md`) and its
section set were derived from PRD §28.2/§29, `DECISION-LOG.md` (ADR-0002..0006),
the #3–#9 verify summaries, and `docs/prototype-0/startup-and-resource-measurements.md`.
These inferences are the subject of the T4 friction entry.
