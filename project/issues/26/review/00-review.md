# Code Review: Retrospect captured harness friction into improvements and attribute friction to an agent

## Summary
- **Issue:** #26
- **Title:** Retrospect captured harness friction into improvements and attribute friction to an agent
- **Base Branch:** main
- **Feature Branch:** issue/26
- **Reviewer Model:** GPT-5.6 Sol
- **Review Cycle:** 1
- **Reviewed Commit:** 3f4bf29a47dfcebf600c70f001f582c52c417c23
- **Verdict:** REQUEST_CHANGES
- **Blocking Findings:** 1

## Repository Understanding
Ascend is a Soft Factory project driven by the RPIV pipeline (Research → Plan → Implement → Verify). Its
deterministic "operating surface" is a single POSIX `sh` script, `./harness`, whose contract is fixed by
CORE-COMPONENT-0003 (verbs, `pass|fail|degraded|unknown` verdicts, exit-code contract, evidence, and the
KEY_QUESTION friction subsystem). Architectural decisions live in ADRs; cross-cutting behaviour lives in
core-components; both are indexed in DECISION-LOG.md. This issue delivers four scope items:
- **A** agent-attributed friction (new additive `agent` field + `friction add --agent`),
- **B** an issue-scoped friction retrospect (prune resolved records, keep TEST-09 coverage anchors),
- **E** fixing the stale TEST-09 anchors, and
- **C** making `doctor`'s code-server readiness a required check that FAILS when absent and propagates
  through the `verify` aggregate.
Governance is recorded via ADR-0007, ADR-0008, CORE-COMPONENT-0003 (R18/R19), and DECISION-LOG #73–#87.

## Scope of Change
21 files. Core code: `harness` (write_friction `agent` field; `friction_add --agent`; `code_server_present`
seam; `compute_doctor`/`verb_doctor`/`resolve_member` code-server readiness). Tests: `tests/harness/run.sh`
(TEST-40..48, plus TEST-09/TEST-30 rewrites). Data: `.harness/friction.jsonl` (retrospect pruning). Config:
`.devcontainer/devcontainer.json` (provision code-server), `.github/soft-factory/verification.yml`
(comment/description accuracy only). Governance/docs: ADR-0007, ADR-0008, CORE-COMPONENT-0003, DECISION-LOG,
`README.md`, `.harness/README.md`, the four `rpiv-*.agent.md` self-attribution edits, and the
`project/issues/26/**` artifacts.

## Prior Finding Disposition
Not applicable — this is the first review cycle; no prior review report existed at the review path.

## Acceptance Criteria Assessment
Interpretation frozen against the issue's `ISSUE_ALIGNMENT` Refined Acceptance Criteria.

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Every friction record identifies exactly one agent (`unknown` when none) | Met | `write_friction` appends `agent` (default `unknown`) after `severity`; `friction_add` defaults `_fagent="unknown"`; TEST-40/41 pass. |
| Reviewing friction produces improvements shipped in #26 (not a persistent store) | Met | Retrospect implemented; harness improvements + DECISION-LOG #73–#87; matches ADR-0007. |
| Each improvement associable with a specific agent | Met | `agent` field + #26-attributed changes; conforms to R18. |
| Per-agent view of friction and resulting improvements | Met | `friction list` filtered on `agent`; field present/queryable. |
| Improvements remain retrievable, not duplicated by later reviews | Met | Verb-only dedupe (`ensure_friction`) + delete-on-fix; no persistent store to duplicate. |
| Pre-attribution friction readable, reads as `unknown`; consumers unchanged | Met | 11 legacy records with no `agent` field remain valid JSONL; additive field; TEST-40. |
| No-agent friction carries `unknown`, never empty/arbitrary | Met | Default sentinel `unknown` in both `write_friction` and `friction_add`. |
| Non-actionable review records "no action needed" and no items | Partially met (not exercised) | Documented workflow only; #26 retro found actionable items, so the empty path was not run. Consistent with refined AC framing; not treated as a blocking gap. |
| Same friction/agent not silently double-counted | Met | Verb-only dedupe + delete-on-fix; R18 keeps dedupe agent-agnostic. |
| Read/record failure surfaced with no partial/duplicated items | Met | Existing `persist_fail` (R14) reused on the friction/doctor/verify write paths. |
| A friction-capturing run yields a record with agent attribution | Met | TEST-41/42; `friction add --json` carries `agent`. |
| Actionable review yields ≥1 improvement associated with an agent | Met | #26 shipped harness changes tied to reviewed frictions/agents. |
| For a chosen agent, friction + resulting improvements listable together | Met | `friction list` filter on `agent` + #26 shipped changes. |

Net: the acceptance criteria are substantively satisfied at the design/behaviour level. The blocking issue
below is a delivered-artifact/regression-gate defect, not an unmet acceptance criterion.

## Architecture Conformance
- **ADR-0007 / R18 (agent attribution):** Conformant. `agent` is additive, appended last (after `severity`),
  defaults to the `unknown` sentinel; `--agent` is a named flag (not positional); dedupe remains verb-only.
  Verified by inspection and TEST-40/41/42.
- **ADR-0008 / R19 (code-server required):** Conformant. `code_server_present()` probes
  `command -v "${HARNESS_CODE_SERVER:-code-server}"`; absence sets `DOCTOR_VERDICT=fail` (not `degraded`);
  `doctor` is a `verify.aggregate` member (`aggregate: [lint, test, build, doctor]`) and `derive_overall`
  propagates any `fail` → `finish fail` → exit 1. The `HARNESS_CODE_SERVER` seam is a command name, and
  devcontainer provisions `ghcr.io/coder/devcontainer-features/code-server:1`. Verified by TEST-44/45/46.
- **R10 (idempotent agent-surface blocks):** Preserved — exactly one `HARNESS:BEGIN/END` block in each of the
  four `rpiv-*` stage agents and none in any other `.github/agents/*.agent.md` (confirmed by count).
- **Boundaries:** `.github/soft-factory/verification.yml` was NOT restructured (comment/description accuracy
  only — the restructure is the out-of-scope spin-out). No `src/` changes; no other `project/issues/<n>/`
  docs were rewritten (only `project/issues/26/**` added). JSON escaping uses `json_escape` on every field.

## Test Coverage Assessment
The new tests are genuine, not vacuous: TEST-40 asserts additive ordering (`"severity": "info", "agent":
"unknown"}` and full key set), TEST-41/42 assert flag/default/JSON behaviour, TEST-44/45/46 assert
present→pass(0) / absent→fail(1), exactly-one doctor friction on absence, and aggregate `fail`+exit 1 with a
present-case non-regression control. TEST-43 correctly asserts (does not skip) because the `rpiv-*` files
carry `--agent <own-name>`. These are well-designed.

**However, the delivered branch does not pass its own authoritative regression gate.** Running
`bash tests/harness/run.sh` at the reviewed commit (clean working tree, HEAD = 3f4bf29) yields
`Totals: PASS=50 FAIL=2 SKIP=0` (`Verdict: fail`), not the `PASS=52 FAIL=0 SKIP=0` recorded in
`project/issues/26/verify/summary.md`. `npm test` passes 15/0 (that suite does not touch `friction.jsonl`).
See finding F-01.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| F-01 | blocking | `.harness/friction.jsonl` lines 13–14 (committed in f36854e); manifests in `tests/harness/run.sh` TEST-09 (L273–283) and TEST-47 (L…“<=12”) | Two committed friction records — `verb=test, agent=rpiv-verifier` and `verb=lint, agent=unknown`, both ts `2026-07-24T01:40:38Z` — have empty `inference`/`proof_gap`/`suggested_closure`. This breaks TEST-09 (requires a non-empty `suggested_closure` on every committed seed line) and pushes the log to 14 records, breaking TEST-47's post-retrospect assertion of `<= 12`. The authoritative gate `bash tests/harness/run.sh` therefore reports FAIL=2 at the reviewed HEAD, contradicting the verify summary's `PASS=52 FAIL=0`. Records 1–12 (the 11 legacy records plus the single well-formed `rpiv-implementer` demonstration) already satisfy both invariants, so records 13–14 are stray empty-closure entries that were never pruned. | Remove the two empty-closure records (lines 13–14) so the log returns to 12 well-formed entries, then re-run `bash tests/harness/run.sh` and confirm `PASS=… FAIL=0`. Update `project/issues/26/verify/summary.md` so its recorded totals match the actual suite result. |
| F-02 | nit | `harness` L984 (`--agent) _fagent="${2:-unknown}"; shift 2`) | If `--agent` is passed as the final argument with no value, `shift 2` can error under strict POSIX `sh` when only one positional remains. This is the pre-existing pattern shared by `--verb`/`--inference`/etc., so it is not newly introduced and is low risk, but the `${2:-unknown}` default implies value-optional handling that `shift 2` does not fully support. | Optional: guard with `shift 2 2>/dev/null || shift $#` or validate arity, consistently across all `friction add` flags in a future cleanup. Not required for this issue. |

## Verdict Rationale
First review cycle. Applying the first-cycle gate: a blocking finding exists (F-01 — the delivered branch
fails its own authoritative regression suite at the reviewed commit, and the recorded verification totals are
inaccurate), so the verdict is **REQUEST_CHANGES**. The architecture (ADR-0007/ADR-0008/CORE-COMPONENT-0003
R18/R19), boundaries, code correctness of the `agent` field and code-server readiness logic, and the new
tests are otherwise sound; the fix is a small data-hygiene correction (remove two stray friction records) plus
a summary-accuracy update, after which the suite should return to green.

## Suggested Follow-ups
- Re-run `bash tests/harness/run.sh` as part of remediation and paste the true totals into the verify summary.
- Consider a lightweight harness guard (or test) that rejects committing seed friction records with an empty
  `suggested_closure`, so this class of regression is caught at write time rather than only in TEST-09.
- Address F-02's `shift` arity nit across all `friction add` flags in a future harness cleanup.

---

## Resolution (Review Cycle 1)

**F-01 (BLOCKING) — RESOLVED.** The two stray empty-`suggested_closure` friction records
(`.harness/friction.jsonl` lines 13–14, ts `2026-07-24T01:40:38Z`) that the harness auto-recorded
during the verifier's own `./harness` runs were removed, returning the committed log to 12 well-formed
records. Re-running the authoritative gate now yields:

```
Totals: PASS=52 FAIL=0 SKIP=0
Verdict: pass
```

TEST-09 (non-empty `suggested_closure` + verbatim KEY_QUESTION on every seed line) and TEST-47
(post-retrospect `<= 12` records) both pass. `npm test` remains 15/0. The test suite isolates its
mutations via `HARNESS_*`, so the committed friction log stays clean at 12 records.

**F-02 (nit) — acknowledged, deferred.** The `--agent … shift 2` last-arg arity edge case is
pre-existing and shared by other flags; no change made in this issue.
