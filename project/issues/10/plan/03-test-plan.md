# Test Plan: Issue #10 — Review Prototype 0 evidence and record the decision

## Scope & references
- Feature: **#10**. ADR: **none created** (the record **recites** ADR-0002..0006,
  all already Accepted). Core-components: **none created** (commit/evidence
  conventions governed by CORE-COMPONENT-0002/0003).
- Deliverable: the Prototype 0 **decision record** at
  **`docs/prototype-0/decision-record.md`** (sibling of
  `docs/prototype-0/startup-and-resource-measurements.md`).
- **Tests: N/A (issue statement) — "review and documentation story."** No
  application source is added, so **no new unit tests are expected or written**.
  This plan therefore defines **document-validation checks (VC1–VC8)**: one
  pass/fail check per acceptance criterion, a measurement-fidelity cross-check, a
  discoverability check, an internal-link check, and a gate-still-green /
  no-source-added check. This is the concrete justification for "Tests: N/A":
  there is no new code surface to unit-test; correctness = the record captures real
  #3–#9 evidence, cites the existing decisions, states an explicit decision, and the
  gate stays green.
- Harness verbs referenced, enumerated **from `.harness/contract.yml`** (14 verbs;
  **not executed during planning**): `help, orient, doctor, lint, test, build,
  boot, dev, edit, verify, status, clean, friction add, friction list`. #10 uses
  `verify` (gate, T3) and `friction add` (T4). Execution verbs
  (lint/test/build/boot/verify/clean/edit) are **NOT** run during planning.
- **Capability-gap note.** The planning environment exposes no shell/`./harness`
  execution tool (only file read/write and `git`/`curl`/`gh`), so
  `./harness orient`/`status` could not be run live; verbs were read from
  `.harness/contract.yml`. Additionally, no harness verb reviews prototype evidence
  or emits a continue/change/stop verdict, so the record's path/section set were
  inferred — recorded via `./harness friction add` (KEY_QUESTION), task **T4**.

## Acceptance-criteria → verification coverage
| Acceptance Criterion | Verification checks |
|---|---|
| **AC1** — record exists with findings, measurements, and demo notes | VC1 (+ VC5 measurement fidelity, VC8 gate) |
| **AC2** — problems encountered + assumptions disproved documented | VC2 |
| **AC3** — Prototype 0 architecture decisions recorded (by ID) | VC3 |
| **AC4** — explicit continue/change/stop + next-step recommendation | VC4 |
| Cross-cutting — measurement numbers match the #9 baseline | VC5 |
| Cross-cutting — record discoverable from `docs/README.md` | VC6 |
| Cross-cutting — internal links resolve | VC7 |
| Cross-cutting — gate stays green + no application source added | VC8 |

---

## Check VC1: AC1 — record exists with findings + measurements + demo notes

- **Type:** Document-validation (pass/fail)
- **Task:** T1
- **Priority:** High

### Setup
Open `docs/prototype-0/decision-record.md`.

### Steps
1. Confirm the file **exists** at `docs/prototype-0/decision-record.md`.
2. Confirm a **Findings** section (§2) answers **all four** Prototype 0 Questions
   (Q1 independent repo; Q2 reliable code-server launch; Q3 minimum environment;
   Q4 safe in-place editing), each citing a concrete #3–#9 evidence path.
3. Confirm a **Measurements** section (§3) records the #9 single-session baseline
   (startup, RSS, idle CPU, version, storage) with the "single idle session / not a
   benchmark" caveat.
4. Confirm a **Screenshots / demo notes** section (§4) records the #7 (AC1–AC3 live
   launch) and #8 (live edit/save round-trip + terminal) demonstrations and points
   to where captured evidence lives.

### Expected Result
**PASS** if all four sub-sections are present with real content (no placeholder/
TODO) and each finding cites an evidence path; otherwise **FAIL**. AC1 satisfied.

---

## Check VC2: AC2 — problems encountered + assumptions disproved recorded

- **Type:** Document-validation (pass/fail)
- **Task:** T1
- **Priority:** High

### Setup
Open §5 (Problems encountered) and §6 (Assumptions disproved / confirmed).

### Steps
1. Confirm §5 documents concrete problems drawn from `.harness/friction.jsonl`
   (e.g. `doctor` silent on editor-provider readiness; code-server absent in
   devcontainer/CI → launcher exits 127; no capture/measure verb).
2. Confirm §6 documents assumptions **disproved and/or confirmed** (e.g. code-server
   need not be a repo dependency; editing is in place, no import/copy; startup/idle
   cost modest for one session).

### Expected Result
**PASS** if both §5 and §6 contain concrete, evidence-grounded statements (no
placeholder); otherwise **FAIL**. AC2 satisfied.

---

## Check VC3: AC3 — Prototype 0 architecture decisions recorded by ID

- **Type:** Document-validation (pass/fail)
- **Task:** T1
- **Priority:** High

### Setup
Open §7 (Architecture decisions).

### Steps
1. Confirm §7 recites **each** of **ADR-0002, ADR-0003, ADR-0004, ADR-0005,
   ADR-0006** by ID, with its title and a one-line summary.
2. Confirm §7 also names **CORE-COMPONENT-0002** and **CORE-COMPONENT-0003**.
3. Confirm §7 links `project/architecture/ADR/DECISION-LOG.md` for the full derived
   decision list (D1–D72).
4. Confirm the record **does not** create or amend any ADR/core-component and does
   not edit `DECISION-LOG.md` (it cites, not authors).

### Expected Result
**PASS** if all five ADR IDs (plus the two core-components and the DECISION-LOG
link) are present and nothing new was authored; otherwise **FAIL**. AC3 satisfied.

---

## Check VC4: AC4 — explicit continue/change/stop decision + next-step recommendation

- **Type:** Document-validation (pass/fail)
- **Task:** T1
- **Priority:** High

### Setup
Open §8 (Next-step recommendation) and §9 (Explicit decision).

### Steps
1. Confirm §9 contains an **explicit, clearly-labelled** decision that is exactly
   one of **continue / change / stop** for Prototype 1 (not implied, not ambiguous).
2. Confirm §8 gives a **next-step recommendation** regarding Prototype 1 ("Host One
   Project Inside Ascend"), grounded in the PRD Prototype 0 §Exit criteria and the
   §2–§7 evidence.
3. Confirm the decision's rationale ties back to the findings/measurements/problems
   above (evidence-based, not asserted).

### Expected Result
**PASS** if §9 states an unambiguous continue/change/stop call and §8 gives a
concrete next-step recommendation; otherwise **FAIL**. AC4 satisfied.

---

## Check VC5: Measurement fidelity — numbers match the #9 baseline

- **Type:** Cross-document consistency (pass/fail)
- **Task:** T1, T3
- **Priority:** High

### Setup
Open §3 of the record and `docs/prototype-0/startup-and-resource-measurements.md`.

### Steps
1. Confirm the startup figure (~0.65 s wall-clock; ~30 ms internal) in §3 matches
   the measurements doc §3.
2. Confirm the memory figure (node-tree RSS ≈153 MiB; ≈218 MiB incl. wrappers) and
   idle CPU (~0.0 %) match the measurements doc §4.
3. Confirm the version (`4.129.0`) and resolved storage paths under
   `/home/vscode/.local/share/code-server` match the measurements doc §5.
4. Confirm no figure is **overstated** and the "single idle session / not a
   benchmark" caveat is carried over.

### Expected Result
**PASS** if every figure in §3 is consistent with the #9 baseline and caveated;
any drift or overstatement is **FAIL**.

---

## Check VC6: Record is discoverable from `docs/README.md`

- **Type:** Discoverability (pass/fail)
- **Task:** T2
- **Priority:** Medium

### Setup
Open `docs/README.md`.

### Steps
1. Confirm `docs/README.md` links to `prototype-0/decision-record.md` under the
   existing **"Prototype 0 evidence"** heading with a short description.
2. Confirm the existing measurements-doc link is retained (not replaced).

### Expected Result
**PASS** if the decision record is reachable from `docs/README.md` alongside the
measurements doc; otherwise **FAIL**.

---

## Check VC7: Internal links resolve

- **Type:** Link verification (pass/fail)
- **Task:** T2
- **Priority:** Medium

### Setup
Open `docs/prototype-0/decision-record.md` and the `docs/README.md` entry.

### Steps
1. Follow every relative link in the record: ADR-0002..0006 under
   `../../project/architecture/ADR/`, `startup-and-resource-measurements.md`
   (sibling), `../../project/architecture/ADR/DECISION-LOG.md`, the #3–#9 verify
   summaries under `../../project/issues/<n>/verify/summary.md`, and any README/PRD
   anchors.
2. Confirm each resolves to a real path/anchor (no broken links).

### Expected Result
**PASS** if all relative links resolve; any broken link is **FAIL**.

---

## Check VC8: Gate stays green + no application source added

- **Type:** Harness (aggregate gate) + repository-diff (pass/fail)
- **Task:** T3
- **Priority:** High

### Setup
Docs-only change applied (no `src/`/manifest/launcher/harness/ADR edits);
`node_modules` present so `tsc --noEmit` can run.

### Steps
1. Run `./harness verify` (or `./harness verify --json`) and read the overall
   verdict and exit code; optionally run `npm run typecheck`.
2. Run `git diff --name-only` against the base.
3. Confirm changed paths are limited to `docs/`, `project/issues/10/`, and the
   append-only friction log (`.harness/friction.jsonl`).
4. Confirm `src/`, `package.json`, `package-lock.json`, `scripts/`,
   `.harness/contract.yml`, `harness`, and `project/architecture/**` (incl.
   `DECISION-LOG.md`) are **unchanged**.

### Expected Result
**PASS** if `./harness verify` returns **degraded** and **exits 0**
(`typecheck=pass`, `test=pass`, `doctor=pass`, `lint`/`build` remain `unknown`,
nothing `fail`) and the diff shows only `docs/`, `project/issues/10/`, and the
friction log. Because no code surface is added, **no new unit tests are required** —
this is the concrete justification for the issue's "Tests: N/A". Correctness is
established by VC1–VC7 (the record captures real evidence, cites existing decisions,
and states an explicit decision) plus this no-source-added check.
