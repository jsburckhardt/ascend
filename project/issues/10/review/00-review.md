# Code Review: Review Prototype 0 evidence and record the decision

## Summary
- **Issue:** #10
- **Title:** Review Prototype 0 evidence and record the decision
- **Base Branch:** main
- **Feature Branch:** docs/10-prototype-0-decision-record
- **Reviewer Model:** GPT-5.6 Sol
- **Verdict:** APPROVE
- **Blocking Findings:** 0

## Repository Understanding
Ascend is a greenfield orchestration product driven by the RPIV pipeline
(Research → Plan → Implement → Verify) and a repo-local engineering harness
(`./harness`, ADR-0003). Prototype 0 (PRD §29) establishes the smallest viable
greenfield baseline — an independent Node 22 + TypeScript repo (ADR-0002), a
dependency-free `node:http` app shell (ADR-0005), and a single-seam code-server
launcher (ADR-0006). PRD §28.2 mandates that **every** prototype closes with a
decision story that records findings, measurements, problems, disproved
assumptions, architecture decisions, and an explicit continue/change/stop call.
Issue #10 is exactly that mandatory review-and-synthesis story for Prototype 0 —
a documentation deliverable, not application code. Whether Prototype 1 is planned
is gated on this record.

## Scope of Change
This is a documentation / decision-record story (`scope_type = issue`). The
changeset is correctly limited to non-source artifacts:

- `docs/prototype-0/decision-record.md` — **new**, the deliverable (§1–§9, 297 lines).
- `docs/README.md` — **modified**, adds a discoverability bullet under "Prototype 0 evidence".
- `.harness/friction.jsonl` — **appended** (2 append-only entries for #10; no prior lines edited).
- `project/issues/10/**` — RPIV artifacts (research, plan, implementation, verify).

Verified via `git diff --name-only origin/main...HEAD`: no `src/`, `scripts/`,
`tests/`, `harness`, `.harness/contract.yml`, `package.json`,
`package-lock.json`, or `project/architecture/**` (including `DECISION-LOG.md`)
paths were touched. No new ADR or core-component was authored — as expected.

## Acceptance Criteria Assessment
| Criterion | Status | Evidence |
|-----------|--------|----------|
| A Prototype 0 decision record exists with findings, measurements, and demo notes | MET | `decision-record.md` §2 (Q1–Q4 findings, each citing #3–#9 evidence paths), §3 (#9 single-session measurement baseline), §4 (#7/#8 live demo notes). Real content, no placeholders. |
| Problems encountered and assumptions disproved are documented | MET | §5 draws four concrete problems from `.harness/friction.jsonl` (doctor silent on editor readiness; code-server absent → exit 127; no capture verb; no review verb); §6 records one disproved ("code-server must be a repo dependency") and three confirmed assumptions. |
| Architecture decisions from Prototype 0 are recorded | MET | §7 recites ADR-0002..ADR-0006 by ID, title, and one-line summary, names CORE-COMPONENT-0002/0003, and links `DECISION-LOG.md`. Titles match the log; nothing authored or amended (last decision remains #72). |
| Explicit continue/change/stop decision + next-step recommendation | MET | §9 states an unambiguous, clearly-labelled **Decision: CONTINUE** with evidence-based rationale and caveats; §8 gives a concrete next-step recommendation to plan Prototype 1 ("Host One Project Inside Ascend"), grounded in the PRD Prototype 0 exit criteria. |

All four acceptance criteria are met with substantive, evidence-grounded content.

## Architecture Conformance
- **No boundary violations.** The record makes no new architectural decision and
  introduces no mechanism, verb, runtime, ADR, or core-component. It recites and
  references the existing Accepted decisions. `DECISION-LOG.md` is unchanged and
  its last decision remains #72, matching the record's own claim.
- **ADR/title fidelity.** ADR-0002..ADR-0006 IDs and titles in §7 match
  `project/architecture/ADR/DECISION-LOG.md`. ADR-0003's title is lightly
  abbreviated in the one-line summary table (drops "for humans and agents"); this
  is cosmetic and acceptable for a summary column.
- **Governing conventions honoured.** The `degraded`/exit-0 posture cited (§5,
  §7) is consistent with CORE-COMPONENT-0003; friction entries are append-only
  per the harness evidence conventions.

## Test Coverage Assessment
The issue explicitly states "Tests: N/A — review and documentation story," and
the test plan (`03-test-plan.md`) correctly substitutes eight document-validation
checks (VC1–VC8) for unit tests, since no code surface is added. I independently
corroborated the material checks:

- **VC1–VC4 (acceptance criteria):** confirmed by direct reading of §2–§9 — see table above.
- **VC5 (measurement fidelity):** every figure in §3 (`0.647 s`, `0.670 s`,
  `~0.030 s`, `≈153 MiB`/`156,624 KiB`, `≈218 MiB`/`222,796 KiB`, `~0.0 %`,
  `4.129.0`, storage paths) matches `docs/prototype-0/startup-and-resource-measurements.md`
  exactly. No figure is overstated or contradictory, and the "single idle
  session / not a benchmark" caveat is carried over verbatim (§3 caveat block).
- **VC6 (discoverability):** `docs/README.md` links the record under "Prototype 0
  evidence"; the existing measurements link is retained (verified in diff).
- **VC7 (internal links):** all 22 relative links in the record and all 3 in
  `docs/README.md` resolve to real paths on disk (verified with a link-resolution
  pass). No broken links.
- **VC8 (scope / gate):** `git diff --name-only` confirms the change is limited to
  `docs/`, `project/issues/10/`, and the append-only friction log; no source or
  lockfile drift. The verifier's recorded `./harness verify → degraded, exit 0`
  is the accepted docs-only posture per `.github/soft-factory/verification.yml`.

Additional factual cross-checks: the #8 live-demo claims in §4 (2026-07-21,
code-server 4.129.0, `/tmp/demo-proj8/AC1.txt`, inode preserved, byte-identical
post-stop snapshots, mode `0644`, owner `vscode:vscode`) match
`project/issues/8/verify/summary.md`. The PRD Prototype 1 title in §8 ("Host One
Project Inside Ascend") matches `PRD.md`.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| F1 | nit | `docs/prototype-0/decision-record.md` §8 (line ~251) | The Prototype 1 reference is cited as "PRD §1515", which is the source-line number where `# Prototype 1: Host One Project Inside Ascend` appears, not a PRD section number (elsewhere the record cites `§28.2`, `§29`). The title itself is correct. | Optionally normalise the citation to a section anchor (e.g. "PRD Prototype 1") for consistency. Non-blocking. |
| F2 | nit | `docs/prototype-0/decision-record.md` §7 (ADR-0003 row) | ADR-0003's title is abbreviated versus the full `DECISION-LOG.md` title ("…as the operating surface" vs "…as the operating surface for humans and agents"). | Acceptable as a one-line summary; no action required. |

No blocking, major, or minor findings. Both findings are cosmetic nits and are
neither implementer nor planner concerns that would gate merge.

## Verdict Rationale
The deliverable satisfies all four acceptance criteria with real,
evidence-grounded content. The measurements are faithful to the #9 baseline with
no overstatement, the four Prototype 0 questions are answered with concrete #3–#9
evidence citations, the architecture decisions are recited correctly by ADR ID
and title (matching the unchanged `DECISION-LOG.md`, last decision #72), and an
explicit **CONTINUE** decision with a concrete Prototype 1 next-step
recommendation is present and clearly labelled. The changeset is correctly scoped
to docs and RPIV artifacts — no application source, ADR, core-component, or
lockfile was modified — and `docs/README.md` discoverability is updated. All
internal links resolve. Only two cosmetic nits were found, neither of which
blocks. Verdict: **APPROVE**.

## Suggested Follow-ups
- (Optional, non-blocking) Address nit F1 by citing PRD Prototype 1 by section
  rather than line number.
- (Program-level, already captured as friction) A future `./harness` prototype-
  review/decision verb (degraded, never fail) that checks a decision record exists
  per prototype would close the recorded proof gap; this is correctly deferred and
  out of scope for #10.
- Prototype 1 planning should carry forward the two deferred, non-blocking
  measurement gaps the record flags: a browser/renderer memory profile and a
  multi-session resource picture (PRD §25 Risk 2).

APPROVE
