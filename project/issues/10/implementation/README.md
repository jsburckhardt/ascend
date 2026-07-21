# Implementation Notes — Issue #10

**Issue:** #10 — Review Prototype 0 evidence and record the decision
**Type:** Review + documentation story (PRD §28.2; §29 Prototype 0 item 7).
**Tests:** N/A (issue) — validation is by document-validation checks VC1–VC8
(see `project/issues/10/plan/03-test-plan.md`). No application source added.

## What was implemented

Executed tasks T1–T4 from `project/issues/10/plan/02-task-breakdown.md`:

- **T1 — Authored `docs/prototype-0/decision-record.md`** (sections §1–§9) from the
  real, consolidated #3–#9 evidence: header/context + the four Prototype 0
  questions (§1); per-question findings Q1–Q4 with evidence-path citations (§2);
  the #9 single-session measurement baseline copied faithfully with the
  "single idle session / not a benchmark" caveat (§3); #7/#8 live demo notes (§4);
  problems from `.harness/friction.jsonl` (§5); assumptions disproved/confirmed
  (§6); ADR-0002..0006 + CORE-COMPONENT-0002/0003 recited by ID with a
  DECISION-LOG link (§7); a Prototype 1 next-step recommendation grounded in the
  PRD exit criteria (§8); and an explicit **CONTINUE** decision with rationale and
  caveats (§9). No ADR/core-component/DECISION-LOG created or amended.
- **T2 — Linked the record from `docs/README.md`** under the existing "Prototype 0
  evidence" heading, matching the existing link/description style; the measurements
  link is retained.
- **T4 — Appended a friction resolution entry** via `./harness friction add`
  (verb `doctor`, severity `info`) recording that the deliverable path/section
  structure had to be inferred (no harness verb reviews prototype evidence or
  emits a continue/change/stop verdict; planning had no shell to run
  orient/status). Append-only; no prior lines edited.
- **T3 — Verified the gate and scope** (results below).

## Files created / modified

| File | Change |
|------|--------|
| `docs/prototype-0/decision-record.md` | **Created** — the Prototype 0 decision record (§1–§9). |
| `docs/README.md` | **Modified** — added a bullet linking the decision record under "Prototype 0 evidence". |
| `.harness/friction.jsonl` | **Appended** — one resolution entry for #10 (append-only). |
| `project/issues/10/implementation/README.md` | **Created** — these notes. |

No changes to `src/`, `package.json`, `package-lock.json`, `scripts/`,
`tests/`, `harness`, `.harness/contract.yml`, or `project/architecture/**`
(ADRs / `DECISION-LOG.md` — last decision remains #72).

## How each acceptance criterion is satisfied

| AC | Satisfied by | Pointer |
|----|--------------|---------|
| **AC1** — record with findings, measurements, demo notes | Decision record §2 (Q1–Q4 findings w/ citations), §3 (#9 measurements), §4 (#7/#8 demo notes) | `docs/prototype-0/decision-record.md` §2–§4 |
| **AC2** — problems + assumptions disproved | §5 (problems from `.harness/friction.jsonl`), §6 (assumptions disproved/confirmed) | `docs/prototype-0/decision-record.md` §5–§6 |
| **AC3** — architecture decisions recorded | §7 recites ADR-0002..0006 by ID + title + summary, names CC-0002/0003, links `DECISION-LOG.md` | `docs/prototype-0/decision-record.md` §7 |
| **AC4** — explicit continue/change/stop + next step | §8 next-step recommendation for Prototype 1; §9 explicit **CONTINUE** decision with rationale | `docs/prototype-0/decision-record.md` §8–§9 |

## Test-plan validation results (VC1–VC8)

| Check | Result | Notes |
|-------|--------|-------|
| **VC1** — record exists with findings + measurements + demo notes | **PASS** | File present; §2 answers Q1–Q4 with evidence paths; §3 measurements; §4 demo notes. Real content, no placeholders. |
| **VC2** — problems + assumptions documented | **PASS** | §5 draws concrete problems from `.harness/friction.jsonl`; §6 lists assumptions disproved/confirmed. |
| **VC3** — architecture decisions by ID | **PASS** | §7 recites ADR-0002, 0003, 0004, 0005, 0006 + CC-0002/0003 + DECISION-LOG link; nothing authored/amended. |
| **VC4** — explicit continue/change/stop + next step | **PASS** | §9 states an unambiguous **CONTINUE**; §8 gives a concrete Prototype 1 recommendation grounded in PRD exit criteria. |
| **VC5** — measurement fidelity vs #9 baseline | **PASS** | Cross-checked tokens `0.647`, `0.670`, `0.030`, `153 MiB`/`156,624`, `218 MiB`/`222,796`, `4.129.0`, storage path, `0.0 %` all present in both docs; caveat carried; no figure overstated. |
| **VC6** — discoverable from `docs/README.md` | **PASS** | Bullet added under "Prototype 0 evidence"; measurements link retained. |
| **VC7** — internal links resolve | **PASS** | All 17 relative links in the record resolve (ADR-0002..0006, DECISION-LOG, sibling measurements doc, #3/#5/#6 verify summaries, #7/#8 verify + implementation, `tests/launcher/`, `README.md`, `.harness/friction.jsonl`); all 3 links in `docs/README.md` resolve. |
| **VC8** — gate green + no application source added | **PASS** | `./harness verify` → **degraded, exit 0** (`typecheck=pass`, `test=pass`, `doctor=pass`, `lint`/`build` `unknown`, nothing `fail`). `git status` limited to `docs/`, `project/issues/10/`, and `.harness/friction.jsonl`. |

### VC8 harness output (with `node_modules` present)

```
Verification (aggregate)
========================
typecheck : pass (npm run typecheck, exit 0)
lint      : unknown (no lint command detected)
test      : pass
build     : unknown (no build command detected)
doctor    : pass
Verdict: degraded   (exit 0)
```

Note: in a fresh worktree `node_modules` is absent, so `tsc` is not found and
`typecheck` reports `fail` (exit 127 → `./harness verify` exit 1). This is the
documented fresh-worktree condition, not a regression from this docs-only change.
Running `npm install` (which only restores the already-committed toolchain)
yields the accepted `degraded`/exit-0 posture above. `npm install` incidentally
re-synced `package-lock.json` (pre-existing drift from `package.json`); that
change was reverted with `git checkout package-lock.json` so the lockfile is
**unchanged** by this issue.

## Harness usage (per stage rule)

- Used `./harness verify` as the deterministic gate (T3) and `./harness friction
  add` for the append-only resolution entry (T4) — no wrapped command called
  directly for a verb the harness provides.
- Capability gap recorded via `./harness friction add` (T4): no harness verb
  reviews prototype evidence or emits a continue/change/stop verdict, so the
  record's deliverable path and section structure were inferred from PRD
  §28.2/§29, `DECISION-LOG.md`, the #3–#9 verify summaries, and the #9
  measurements doc.
