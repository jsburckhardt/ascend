# Research Brief: Review Prototype 0 evidence and record the decision

## GitHub Issue
- **Issue:** #10
- **Title:** Review Prototype 0 evidence and record the decision

## Scope Classification
- **Scope Type:** issue

**Rationale.** Issue #10 is PRD §29 Prototype 0 item 7 ("Review Prototype 0
evidence and record the decision") and the mandatory decision story required by
PRD §28.2. It is a **review + documentation** story whose sole deliverable is a
single durable artifact — the **Prototype 0 decision record**. It introduces
**no new architectural decision** and **no new cross-cutting core-component**:

- **The decisions being recorded already exist.** Every Prototype 0 architecture
  decision is already accepted and registered in
  `project/architecture/ADR/DECISION-LOG.md` as **ADR-0002 … ADR-0006** (see
  "Proposed ADRs" for the enumeration). The decision record **recites and
  references** them; it does not create or amend any of them.
- **The evidence already exists.** The consolidated inputs are the shipped
  artifacts of the six preceding Prototype 0 stories (#3–#9): their
  `project/issues/<n>/verify/summary.md` summaries, their
  `implementation/README.md` notes, and the captured measurements in
  `docs/prototype-0/startup-and-resource-measurements.md`. #10 reads and
  synthesises them; it produces no new code, runtime, seam, or verb.
- **No new mechanism = no irreversible choice.** Nothing about writing a decision
  record forces a foundational, hard-to-reverse commitment. The one *decision*
  it contains — continue / change / stop for Prototype 1 — is a **program /
  planning** decision (governed by PRD §28.1/§28.2), **not** an architectural one
  that would warrant an ADR.
- **"Tests: N/A"** by the issue's own statement — the artifact is a document, so
  there is no new code surface and therefore no new component contract.

This mirrors the classification used for the sibling review/documentation stories
**#8** ("Verify direct filesystem editing" — `issue`, no new ADR/core-component)
and **#9** ("Capture startup and resource measurements" — `issue`, no new
ADR/core-component). #10 is the pure *synthesis* endpoint of that chain: it
consumes decided mechanisms and recorded evidence and writes prose plus an
explicit decision.

> **No decision is made here.** Research proposes; Plan and the human decider make
> the actual continue/change/stop call and record it. This brief only surveys the
> evidence and the existing decisions the record must cite.

### Grounding evidence (harness + on-disk, not inferred)
- `./harness orient` → **`pass`**: Stack "TypeScript + Node.js 22 (LTS) + npm"
  (ADR-0002); operating face `./harness`; contract `.harness/contract.yml`
  (14 verbs); evidence under `.harness/evidence/`; friction at
  `.harness/friction.jsonl`.
- `./harness doctor` → **`degraded`**: `node v22.17.1` (≥22.6.0 true) but
  `node_modules: false` (run `npm install`). Consistent with a fresh worktree; not
  a blocker for a documentation story.
- **No execution verbs were run** (research inspects; it does not lint/test/build/
  boot/verify/clean). There is likewise **no harness verb** that reviews prototype
  evidence or emits a continue/change/stop verdict — the decision record's
  location and section set had to be inferred from PRD §28.2/§29 and on-disk
  prior art; this inference is recorded as a `./harness friction add` entry
  (verb `doctor`, info).

## Problem Statement

PRD §28.2 mandates that **every** prototype ends with a decision story producing:
findings, measurements, screenshots/demo notes, problems encountered, assumptions
disproved, architecture decisions, a next-step recommendation, and an **explicit
continue, change, or stop decision**. PRD §29 lists this as Prototype 0 item 7,
and it **gates whether Prototype 1 is planned** (PRD §28.1: later prototypes are
added only after a prototype-review decision; parent feature #2, umbrella epic #1).

Prototype 0 asked four questions (PRD Prototype 0 §Questions):

1. Can Ascend be developed independently (no DevDeck migration)?
2. Can `code-server` be launched reliably against an arbitrary local path?
3. What is the minimum environment required?
4. Does editing through `code-server` modify existing project files directly and
   safely?

The evidence to answer these now exists across #3–#9, but it is **scattered**
across per-issue artifacts. This story must **consolidate** that evidence into one
durable decision record and record the explicit next-step decision, so the program
can proceed to Prototype 1 (or change/stop) on an evidence-based footing rather
than by assumption (the issue's stated Risk: "Proceeding without evidence-based
justification").

**In scope** (issue §Scope): a decision record containing findings, measurements,
demo notes, problems encountered, assumptions disproved, architecture decisions,
a next-step recommendation, and an explicit continue/change/stop decision.

**Out of scope** (issue §Out of Scope): starting Prototype 1 work (only planned
*after* this decision); MVP hardening.

## Existing Context

### Prototype 0 evidence surveyed (concrete file paths)

The decision record consolidates the shipped artifacts of the six preceding
Prototype 0 stories. All were inspected:

| Story | Question answered / outcome | Primary evidence paths |
|-------|----------------------------|------------------------|
| **#3 Bootstrap the repository** | Ascend is an independent greenfield Node.js + TypeScript baseline (no DevDeck migration). Manifest (`package.json` + `tsconfig.json`), Node 22 pinned via `engines`/`.nvmrc`, committed `package-lock.json`, `src/` placeholder, README stating the product boundary. Decision: **ADR-0002**. | `project/issues/3/verify/summary.md`, `project/issues/3/implementation/README.md`, `package.json`, `tsconfig.json`, `.nvmrc`, `README.md` |
| **#4 Engineering harness CLI** | Repo-local `./harness` is the single operating surface; dependency-light POSIX script wrapping existing commands, one verdict per verb, evidence + friction conventions. Decisions: **ADR-0003**, **CORE-COMPONENT-0003**. | `project/issues/4/verify/summary.md`, `harness`, `.harness/contract.yml`, `.harness/README.md`, `project/architecture/core-components/CORE-COMPONENT-0003-engineering-harness-contract.md` |
| **#5 Dev + validation commands** | `./harness dev` (interactive `mode: exec` handoff → `npm run dev`, `tsc --noEmit --watch`) and `./harness verify` (wraps `npm run typecheck`) are invokable through the harness. Decision: **ADR-0004**; mode-authoritative dispatch. | `project/issues/5/verify/summary.md`, `project/issues/5/implementation/README.md`, `project/architecture/ADR/ADR-0004-interactive-handoff-verbs.md` |
| **#6 Health endpoint + app shell** | Minimal dependency-free `node:http` server: `GET /health` → `200 {"status":"ok"}`, `GET /` → thin HTML shell, `404` otherwise; runs under `node --experimental-strip-types` (no framework, no build step). `boot` (`mode: exec` → `npm run start`) and `test` (→ `npm test`) wired. Decision: **ADR-0005**. | `project/issues/6/verify/summary.md`, `project/issues/6/implementation/README.md`, `src/server.ts`, `src/main.ts` |
| **#7 Launch code-server against a path** | First editor-provider integration: `scripts/launch-editor.sh` launches **one** `code-server` against `PROJECT_PATH`, surfaced as `./harness edit` (`mode: exec` → `npm run edit`); all code-server flags isolated behind the single launcher seam; read-only fail-fast path validation; exit-code passthrough, no supervision. AC1–AC3 demonstrated live; AC4–AC5 by code-server-free tests. Decision: **ADR-0006**. | `project/issues/7/verify/summary.md`, `project/issues/7/implementation/README.md`, `scripts/launch-editor.sh`, `tests/launcher/` |
| **#8 Verify direct filesystem editing** | Editing through code-server modifies the original path **in place** and **safely**: AC1/AC2/AC4 proven by `node:test` (TEST-L9..L12) + a live 2026-07-21 round-trip (real browser edit/save, integrated terminal in project cwd, byte-identical before/after-stop snapshots). Zero-mutation guarantee holds. No new ADR/core-component. | `project/issues/8/verify/summary.md`, `project/issues/8/implementation/README.md`, `tests/launcher/` |
| **#9 Startup + resource measurements** | Single idle `code-server` session baseline: startup **~0.65 s** wall-clock to port bind (~30 ms internal), node-tree RSS **≈153 MiB** (≈218 MiB incl. wrappers), idle CPU **~0.0 %**, version **4.129.0**, storage under `/home/vscode/.local/share/code-server` (`extensions/`, `User/`); restart re-binds cleanly with state persisted; invalid path fails read-only non-zero; `kill -9` frees the port with no supervision (ADR-0006 D6). No new ADR/core-component. | `docs/prototype-0/startup-and-resource-measurements.md`, `project/issues/9/verify/summary.md`, `project/issues/9/implementation/README.md`, `docs/README.md` |

**Cross-cutting evidence surfaces also inspected:**
- `docs/README.md` — application-docs index; already links the Prototype 0
  measurements doc under a "Prototype 0 evidence" heading (the natural home to
  also link the decision record).
- `docs/prototype-0/` — the **existing** Prototype 0 docs subdirectory (currently
  holds `startup-and-resource-measurements.md`); strong prior-art for placing the
  decision record as a sibling.
- `.harness/friction.jsonl` — the honest capability gaps recorded across #7/#8/#9
  (chiefly: `doctor` proves only Node/toolchain health, not editor-provider
  readiness; code-server is a documented prerequisite absent in the
  devcontainer/CI). These are the raw material for the record's "problems
  encountered" and "assumptions disproved" sections.
- `PRD.md` §25 Risk 2 (resource usage) and §18 (evidence dimensions) — the risk
  framing the measurements feed.

### ADRs (all read; `project/architecture/ADR/`)
- **ADR-0002** — Ascend baseline technology stack and repository layout *(Accepted 2026-07-14)*.
- **ADR-0003** — Adopt a repo-local engineering harness (`./harness`) *(Accepted 2026-07-20)*.
- **ADR-0004** — Interactive/handoff verbs in the engineering harness (`./harness dev`) *(Accepted 2026-07-20)*.
- **ADR-0005** — Ascend application-serve runtime (HTTP server, TS runtime execution, `boot`) *(Accepted; refined 2026-07-21: Node ≥22.6.0 floor)*.
- **ADR-0006** — code-server editor-provider launch, argument isolation, and read-only project-path safety *(Accepted 2026-07-21)*.
- ADR-0001 is the template.

### Core-components (all read; `project/architecture/core-components/`)
- **CORE-COMPONENT-0002** — Commit Standards (Conventional Commits, Co-authored-by) *(Adopted 2026-05-05)*.
- **CORE-COMPONENT-0003** — Engineering harness contract, verdicts, evidence/friction conventions *(Adopted 2026-07-20, amended R17)*.
- CORE-COMPONENT-0001 is the template.

### Decision log (`project/architecture/ADR/DECISION-LOG.md`)
Read in full. Registers ADR-0002..0006 and CORE-COMPONENT-0002/0003, plus 72
derived decisions (D1–D72). **No entry concerns a "prototype decision record"**,
so #10 does not collide with an existing decision — it references the existing
ADRs and adds a review artifact, not a new architectural decision.

### Recommended location + outline for the decision record (for Plan to confirm)

**Recommended path:** `docs/prototype-0/decision-record.md`

Justification from observed repo convention (not invented): a `docs/prototype-0/`
subdirectory **already exists** and already holds Prototype 0 evidence
(`startup-and-resource-measurements.md`), and `docs/README.md` already curates a
"Prototype 0 evidence" section. Placing the decision record as a **sibling** under
`docs/prototype-0/` keeps all Prototype 0 durable, user-facing artifacts together
and discoverable, and lets the record cite the measurements doc with a short
relative link. The per-issue RPIV artifacts remain under `project/issues/10/`; the
durable record belongs under `docs/`.

*Rejected alternative:* `docs/decisions/prototype-0.md` — introduces a **new**
`docs/decisions/` tree with no existing prior art, fragmenting Prototype 0
evidence away from the already-established `docs/prototype-0/` folder. Prefer the
convention already on disk.

**Proposed outline** (maps 1:1 to PRD §28.2's required contents — Plan to finalise):

1. **Header / context** — Prototype 0 objective and the four questions (PRD
   Prototype 0); links to feature #2 and epic #1.
2. **Findings** — per-question answers (Q1 independent repo; Q2 reliable
   code-server launch; Q3 minimum environment; Q4 safe in-place editing), each
   citing the #3–#9 evidence paths above.
3. **Measurements** — the #9 single-session baseline (startup ~0.65 s, RSS
   ≈153 MiB, idle CPU ~0 %, version 4.129.0, storage paths), with the "single
   idle session / not a benchmark" caveat, linking
   `docs/prototype-0/startup-and-resource-measurements.md`.
4. **Screenshots / demo notes** — the #7 (AC1–AC3 live launch) and #8 (live
   edit/save round-trip + terminal) demonstrations; note where captured evidence
   lives.
5. **Problems encountered** — from `.harness/friction.jsonl` (e.g. `doctor` is
   silent on editor-provider readiness; code-server absent in devcontainer/CI;
   no capture/measure verb).
6. **Assumptions disproved / confirmed** — e.g. code-server need not be a repo
   dependency (documented prerequisite worked); editing is in place (no import/
   copy); startup/idle cost is modest for one session.
7. **Architecture decisions** — recite ADR-0002..0006 (IDs + titles + one line
   each; see "Proposed ADRs").
8. **Next-step recommendation** — recommendation regarding Prototype 1
   ("Host One Project Inside Ascend").
9. **Explicit decision** — a clearly labelled **continue / change / stop**
   statement (the actual call is the decider's, not Research's).

## Proposed ADRs

**None required.** #10 makes no architectural decision — it **records** decisions
already made. The record must **cite** (not create) the Prototype 0 architecture
decisions, which already exist and are registered in `DECISION-LOG.md`:

- **ADR-0002 — Ascend baseline technology stack and repository layout.**
  TypeScript + Node.js 22 LTS + npm; `src/` layout; `npm install` as the single
  setup entry point; no frameworks; no DevDeck migration. *(Answers Prototype 0
  Q1 + Q3.)*
- **ADR-0003 — Adopt a repo-local engineering harness (`./harness`).** `./harness`
  is the mandatory operating surface wrapping existing commands; one verdict per
  verb; evidence/friction conventions.
- **ADR-0004 — Interactive/handoff verbs (`./harness dev`).** `mode: exec`
  handoff verbs that hand off the process instead of returning a verdict
  (precedent reused by `boot` and `edit`).
- **ADR-0005 — Ascend application-serve runtime.** Dependency-free `node:http`
  server; `node --experimental-strip-types` runtime (Node ≥22.6.0 floor); `GET
  /health` + shell; `boot` handoff; `node:test` runner. *(Answers Q3.)*
- **ADR-0006 — code-server launch, argument isolation, read-only project-path
  safety.** One code-server child process via a single launcher seam; all
  provider flags isolated; `PROJECT_PATH` config; loopback bind; fail-fast
  read-only path validation; exit-code passthrough, no supervision; code-server
  as a documented prerequisite. *(Answers Q2 + Q4.)*

*(If Plan/decider judges that a lightweight "prototype-review / decision-record
convention" is worth pinning as a standing process contract, that is the only
conceivable ADR candidate — but Research recommends **no ADR**: PRD §28.2 already
defines the required contents, so a decision record is a documented process
output, not a new architectural decision.)*

## Proposed Core-Components

**None required.** #10 adds no reusable, cross-cutting runtime behaviour or shared
contract; it produces a one-off review artifact. "Tests: N/A" (issue) confirms
there is no code contract to formalise. The commit and harness conventions it
follows are already CORE-COMPONENT-0002 and CORE-COMPONENT-0003.

## Acceptance Criteria (from issue)

Extracted verbatim from the issue body (between the
`<!-- ACCEPTANCE_CRITERIA_START -->` / `<!-- ACCEPTANCE_CRITERIA_END -->` markers):

- [ ] A Prototype 0 decision record exists with findings, measurements, and demo notes
- [ ] Problems encountered and assumptions disproved are documented
- [ ] Architecture decisions from Prototype 0 are recorded
- [ ] The record contains an explicit continue, change, or stop decision with a next-step recommendation

**Note for Plan/Verify (Tests: N/A).** The issue states "N/A — review and
documentation story." Verification should focus on **document-completeness** —
confirming the decision record covers every AC dimension with real content citing
the #3–#9 evidence (not placeholders) — rather than on code unit tests. Each AC
maps to a required section of the record:

| AC | Required content in the decision record |
|----|------------------------------------------|
| AC1 | Findings (Prototype 0 Q1–Q4 answered), measurements (the #9 baseline), and demo notes (#7/#8 live demonstrations), each citing evidence paths |
| AC2 | Problems encountered (from `.harness/friction.jsonl`) and assumptions disproved/confirmed |
| AC3 | Prototype 0 architecture decisions recited — ADR-0002..0006 (IDs + titles + one-line summaries) |
| AC4 | An explicit, clearly-labelled **continue / change / stop** decision plus a next-step recommendation for Prototype 1 |

## Risks and Open Questions

**Risks**
- **Proceeding without evidence-based justification** *(issue's own stated risk).*
  A decision recorded without genuinely consolidating #3–#9 evidence would defeat
  the purpose. **Mitigation:** the record must cite the concrete evidence paths in
  the survey table above for every finding/measurement.
- **Evidence drift / staleness.** The #9 measurements are a single-shot,
  environment-specific baseline (explicitly caveated in that doc). **Mitigation:**
  carry the same "single idle session / not a benchmark" caveat into the record;
  do not overstate the numbers.
- **Decision authority.** Research must not make the continue/change/stop call.
  **Mitigation:** the record is written by Plan/Implementer and the actual
  decision is the human decider's; this brief only proposes structure and cites
  evidence.
- **Path/convention choice.** Placing the record in a new tree (e.g.
  `docs/decisions/`) would fragment Prototype 0 evidence. **Mitigation:** use the
  existing `docs/prototype-0/` folder (recommended above) and confirm in Plan.

**Open questions (for Plan/decider — not decided here)**
1. **Exact deliverable path** — Research recommends
   `docs/prototype-0/decision-record.md` (sibling of the existing measurements
   doc). Confirm the final filename/location and whether `docs/README.md` should
   link it under the existing "Prototype 0 evidence" heading.
2. **The decision itself** — continue vs change vs stop for Prototype 1. Research
   surfaces that all Prototype 0 exit criteria (PRD Prototype 0 §Exit criteria)
   appear met per #7/#8/#9 evidence, which points toward *continue*, but the call
   is the decider's, made in the record.
3. **Demo-note fidelity** — should the record embed/link the #7/#8 live-demo
   evidence captured under `project/issues/7|8/implementation/`, or re-summarise
   it? (No new screenshots need to be produced; "demo notes" suffice per §28.2.)
4. **Scope of "architecture decisions recorded"** — recite only ADR-0002..0006,
   or also the derived DECISION-LOG entries (D1–D72) and CORE-COMPONENT-0002/0003?
   Research recommends the five ADRs (+ the two core-components) with one-line
   summaries and a link to `DECISION-LOG.md` for the full derived list.

**Unknowns the harness could not prove (recorded as friction).** A `friction add`
entry (verb `doctor`, info) records that Research had to **infer** the decision
record's deliverable path and section structure: no harness verb reviews prototype
evidence or emits a continue/change/stop verdict, so the location
(`docs/prototype-0/decision-record.md`) and the required section set were derived
from PRD §28.2/§29, `DECISION-LOG.md` (ADR-0002..0006), the #3–#9 verify
summaries, and `docs/prototype-0/startup-and-resource-measurements.md`, rather than
proven by any verb.
