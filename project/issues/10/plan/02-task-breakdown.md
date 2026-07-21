# Task Breakdown: Issue #10 — Review Prototype 0 evidence and record the decision

> This is a **review + documentation** story (`scope_type = issue`; **no ADRs, no
> core-components** created — every Prototype 0 architecture decision already exists
> as ADR-0002..0006 and CORE-COMPONENT-0002/0003 in `DECISION-LOG.md`; the record
> **recites** them). The issue states **"Tests: N/A — review and documentation
> story"**, so "test coverage" below means **document-validation / completeness
> checks** (defined in `03-test-plan.md` as VC1–VC8), not new code unit tests.
> Every task references the ADRs/core-components the record cites. Acceptance
> criteria (issue):
> - **AC1** — a Prototype 0 decision record exists with findings, measurements, and demo notes.
> - **AC2** — problems encountered and assumptions disproved are documented.
> - **AC3** — architecture decisions from Prototype 0 are recorded.
> - **AC4** — the record contains an explicit continue/change/stop decision with a next-step recommendation.
>
> **Confirmed deliverable path:** `docs/prototype-0/decision-record.md` (sibling of
> `docs/prototype-0/startup-and-resource-measurements.md`).
>
> **Dependency order:** T1 → T2 → T3 (final gate); T4 after T1.

---

## Task T1: Author the Prototype 0 decision record

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** None
- **Related ADRs:** ADR-0002 (baseline stack/layout — Q1/Q3), ADR-0003 (harness surface), ADR-0004 (mode:exec handoff), ADR-0005 (application-serve runtime — Q3), ADR-0006 (code-server launch / read-only safety — Q2/Q4) — all **cited, not created**
- **Related Core-Components:** CORE-COMPONENT-0002 (commit standards), CORE-COMPONENT-0003 (evidence/friction conventions; durable docs under `docs/`)

### Description
Create **`docs/prototype-0/decision-record.md`** with sections **§1–§9** per the
action-plan outline, populated with the **real, consolidated #3–#9 evidence** (no
placeholders/TODOs). Do **not** create or amend any ADR/core-component and do
**not** edit `DECISION-LOG.md` — the record **cites** existing decisions.

1. **§1 Header & context** — Prototype 0 objective and the four Questions (PRD
   Prototype 0 §Questions); links to feature #2, epic #1, PRD §28.1/§28.2/§29.
2. **§2 Findings (AC1)** — per-question answers, each citing concrete evidence
   paths:
   - **Q1** (independent repo, no DevDeck migration) → `project/issues/3/verify/summary.md`, `package.json`, `tsconfig.json`, `.nvmrc`, `README.md`; ADR-0002.
   - **Q2** (reliable code-server launch against an arbitrary path) →
     `project/issues/7/verify/summary.md`, `scripts/launch-editor.sh`,
     `tests/launcher/`; ADR-0006.
   - **Q3** (minimum environment) → `project/issues/5/verify/summary.md`,
     `project/issues/6/verify/summary.md`, `src/server.ts`, `docs/prototype-0/startup-and-resource-measurements.md`; ADR-0005.
   - **Q4** (safe in-place editing) → `project/issues/8/verify/summary.md`,
     `project/issues/8/implementation/README.md`, `tests/launcher/`; ADR-0006 D5.
3. **§3 Measurements (AC1)** — the #9 single-session baseline copied faithfully:
   startup **~0.65 s** (~30 ms internal), node-tree RSS **≈153 MiB** (≈218 MiB
   incl. wrappers), idle CPU **~0.0 %**, version **4.129.0**, resolved storage
   under `/home/vscode/.local/share/code-server`; link
   `startup-and-resource-measurements.md`; carry the "single idle session / not a
   benchmark" caveat.
4. **§4 Screenshots / demo notes (AC1)** — the #7 AC1–AC3 live launch and #8 live
   2026-07-21 edit/save round-trip + integrated terminal; note where captured
   evidence lives (`project/issues/7|8/implementation/`). No new screenshots.
5. **§5 Problems encountered (AC2)** — from `.harness/friction.jsonl`: `doctor`
   silent on editor-provider readiness; code-server absent in devcontainer/CI
   (launcher exits 127); no capture/measure verb.
6. **§6 Assumptions disproved / confirmed (AC2)** — code-server need not be a repo
   dependency; editing is in place (no import/copy); startup/idle cost modest for
   one session.
7. **§7 Architecture decisions (AC3)** — recite ADR-0002..0006 (IDs + titles +
   one-line summaries) and CORE-COMPONENT-0002/0003; link
   `project/architecture/ADR/DECISION-LOG.md` for the full derived list (D1–D72).
8. **§8 Next-step recommendation (AC4)** — recommendation regarding Prototype 1
   ("Host One Project Inside Ascend"), grounded in PRD Prototype 0 §Exit criteria.
9. **§9 Explicit decision (AC4)** — a clearly-labelled **continue / change / stop**
   statement with the rationale tying back to §2–§7.

### Acceptance Criteria
- `docs/prototype-0/decision-record.md` exists with §1–§9.
- **AC1:** §2 answers Q1–Q4 with citations, §3 records the #9 measurements, §4
  records the #7/#8 demo notes — all real, no placeholders.
- **AC2:** §5 documents problems from `.harness/friction.jsonl`; §6 documents
  assumptions disproved/confirmed.
- **AC3:** §7 recites **ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0006** by ID
  with titles + one-line summaries, and links `DECISION-LOG.md`.
- **AC4:** §8 gives a next-step recommendation for Prototype 1 and §9 states an
  explicit, clearly-labelled **continue / change / stop** decision.
- Measurement values in §3 **match** `docs/prototype-0/startup-and-resource-measurements.md`
  (no drift/overstatement).
- **No** ADR/core-component created or amended; `DECISION-LOG.md` unchanged (last
  decision remains #72). No file under `src/`, no `package.json`/lockfile, no
  launcher/harness file changed.

### Test Coverage (document-validation, not unit tests)
- Feeds **VC1** (AC1), **VC2** (AC2), **VC3** (AC3), **VC4** (AC4), and **VC5**
  (measurement fidelity) in `03-test-plan.md` — each confirms the required content
  is present, real, and non-placeholder.
- No automated unit test (Tests: N/A — no code added). Verification is
  doc-completeness review against §1–§9.

---

## Task T2: Register and link the decision record

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T1
- **Related ADRs:** ADR-0003 (single documented surface / discoverability), ADR-0002 (docs under `docs/`)
- **Related Core-Components:** CORE-COMPONENT-0003 (R1 truthful, discoverable docs)

### Description
Make the record **discoverable**: add a bullet under the existing **"Prototype 0
evidence"** heading in `docs/README.md` linking
`prototype-0/decision-record.md` with a short description (the Prototype 0
continue/change/stop decision record consolidating #3–#9). Confirm every in-record
relative link resolves: ADR-0002..0006 under
`../../project/architecture/ADR/`, `startup-and-resource-measurements.md` (sibling),
`../../project/architecture/ADR/DECISION-LOG.md`, the #3–#9 verify summaries under
`../../project/issues/<n>/`, and any PRD/README anchors.

### Acceptance Criteria
- `docs/README.md` links to `prototype-0/decision-record.md` under the "Prototype 0
  evidence" heading with a one-line description.
- All relative links in the record and the new `docs/README.md` entry resolve (no
  broken paths/anchors).
- Only `docs/` files touched; no application source, manifest, ADR, or
  `DECISION-LOG.md` changed.

### Test Coverage (document-validation, not unit tests)
- **VC6** (discoverable from `docs/README.md`) and **VC7** (all internal links
  resolve) in `03-test-plan.md`. Doc-review / link-check. No unit test.

---

## Task T3: Verify the harness gate and document completeness

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T1, T2
- **Related ADRs:** ADR-0003 (harness is the gate; exit-code contract), ADR-0002 (docs-only, no tooling added)
- **Related Core-Components:** CORE-COMPONENT-0003 (verdicts; degraded/exit-0 posture)

### Description
Confirm the change ships without regressing the gate or the codebase:
1. Run `./harness verify` (and/or `npm run typecheck`) and confirm it stays
   **degraded / exit 0** — the accepted Prototype-0 posture: `typecheck=pass`,
   `test=pass`, `doctor=pass`, `lint`/`build` remain `unknown`; nothing turns
   `fail`, because only `docs/` changed.
2. Confirm **no application source, manifest, ADR, or decision-log** changed:
   `git diff --name-only` shows changes limited to `docs/`, `project/issues/10/`,
   and (T4) the append-only friction log — `src/`, `package.json`,
   `package-lock.json`, `scripts/`, `.harness/contract.yml`, `harness`, and
   `project/architecture/**` are **untouched**.
3. Run the document-validation checks **VC1–VC7** (incl. the VC5 measurement
   cross-check against `docs/prototype-0/startup-and-resource-measurements.md`) and
   record the outcome in the issue implementation notes.

### Acceptance Criteria
- `./harness verify` returns **degraded** and **exits 0** (no new `fail`; no
  verdict regression from the docs-only change); `npm run typecheck` is clean.
- `git diff --name-only` shows only `docs/`, `project/issues/10/`, and the friction
  log — no `src/`/manifest/lockfile/launcher/harness/ADR/`DECISION-LOG.md` changes.
- VC1–VC7 all pass (every AC dimension present and non-placeholder; measurements
  match the #9 baseline; the record is linked and all links resolve).

### Test Coverage (document-validation, not unit tests)
- **VC8** (`./harness verify` degraded/exit 0 + no application source added), plus
  confirmation of **VC1–VC7** in `03-test-plan.md`. This task is the aggregate
  verification gate for the story.

---

## Task T4: Append friction resolution entry

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T1
- **Related ADRs:** ADR-0003 (harness surface)
- **Related Core-Components:** CORE-COMPONENT-0003 (R4/R20 friction conventions; append-only; KEY_QUESTION)

### Description
Append a **resolution** friction entry via `./harness friction add` (append-only;
never edit prior lines) recording what #10 had to infer that the harness could not
prove, per the research brief and this plan:
- The decision record's **deliverable path** (`docs/prototype-0/decision-record.md`)
  and its **section structure** had to be **inferred** — **no harness verb reviews
  prototype evidence or emits a continue/change/stop verdict**; the path/sections
  were derived from PRD §28.2/§29, `DECISION-LOG.md` (ADR-0002..0006), the #3–#9
  verify summaries, and `docs/prototype-0/startup-and-resource-measurements.md`.
- (Planning-environment note) `./harness orient`/`status` could not be run during
  planning because no shell/`./harness` execution tool was available; the verb
  surface was read from `.harness/contract.yml`.

The entry answers the KEY_QUESTION ("What did the agent have to infer that the
harness should have proved?") verbatim. This runs during implementation in a
shell-capable environment; planning does not execute it.

### Acceptance Criteria
- A new append-only `.harness/friction.jsonl` entry references #10 and records the
  prototype-review/decision-verdict gap and the inferred deliverable path/section
  structure (and the planning no-shell gap).
- No existing friction lines edited or removed; the entry answers the KEY_QUESTION.

### Test Coverage (document-validation, not unit tests)
- Manual review via `./harness friction list`. No automated assertion (append-only
  log). Not part of VC1–VC8 but required for CORE-COMPONENT-0003 R4/R20 compliance.
