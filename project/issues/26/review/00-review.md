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


---

# Review Cycle 2

## Summary
- **Issue:** #26
- **Title:** Retrospect captured harness friction into improvements and attribute friction to an agent
- **Base Branch:** main
- **Feature Branch:** issue/26
- **Reviewer Model:** GPT-5.6 Sol
- **Review Cycle:** 2
- **Reviewed Commit:** e07b496d5bef0e35dbec7336b328c0a194a8d699
- **Last Reviewed Commit (cycle 1):** 3f4bf29a47dfcebf600c70f001f582c52c417c23
- **Verdict:** APPROVE
- **Blocking Findings:** 0

## Scope of Re-review
Scoped to the remediation delta since the cycle-1 reviewed commit (`3f4bf29...e07b496`), which is exactly two commits:
- `03263cd fix(harness): drop stray empty-closure friction records from retrospect log` — data-only removal of the two stray empty-`suggested_closure` records from `.harness/friction.jsonl`.
- `e07b496 docs(#26): record local-code-reviewer verdict and F-01 resolution` — adds the cycle-1 review report + resolution note only.

Delta `--stat`: `.harness/friction.jsonl` (2 deletions) and `project/issues/26/review/00-review.md` (128 insertions). **No `harness` source, no `tests/**`, no `src/**`, and no `.github/soft-factory/verification.yml` were touched in the delta** — confirming the fix is data-only and did not weaken or alter any test assertion or harness logic to force a pass.

## Prior Finding Disposition
| ID | Cycle-1 Severity | Disposition | Evidence |
|----|------------------|-------------|----------|
| F-01 | blocking | **Resolved** | `.harness/friction.jsonl` is now exactly 12 records; every line is valid JSONL with a non-empty `suggested_closure` and the verbatim KEY_QUESTION (validated programmatically). The two stray records (ts `2026-07-24T01:40:38Z`, empty inference/proof_gap/closure) are removed by `03263cd`. Authoritative gate `bash tests/harness/run.sh` now reports `Totals: PASS=52 FAIL=0 SKIP=0` / `Verdict: pass`; TEST-09 and TEST-47 both PASS. |
| F-02 | nit | **Unresolved (accepted / deferred)** | `--agent … shift 2` last-arg arity edge case is pre-existing and shared by sibling flags; intentionally deferred, no change expected. Remains a non-blocking COMMENT follow-up. |

## Re-verification Performed
- **Friction log integrity:** 12 records; all well-formed; non-empty `suggested_closure` + verbatim KEY_QUESTION on every line; no empty-inference/empty-closure stray records remain.
- **Authoritative gate:** `bash tests/harness/run.sh` → `PASS=52 FAIL=0 SKIP=0`, `Verdict: pass`. TEST-09 (seed friction covers gaps + verbatim KQ + closures) PASS; TEST-47 (log shrank, 12 records) PASS.
- **App suite:** `npm test` → 15 pass / 0 fail.
- **Tree cleanliness:** `git status --porcelain` empty after both suites — the regression suite isolates its mutations via `HARNESS_*` and does not dirty the committed `.harness/friction.jsonl`.
- **No test/logic weakening:** delta name-only diff touches no `harness`/`tests/`/`src/`/`verification.yml` file; fix is record removal + review doc only.
- **Cycle-1 solid areas (unchanged in delta, re-spot-checked):** code-server present-path `HARNESS_CODE_SERVER=bash ./harness doctor` exits 0 (present→pass per ADR-0008); R10 one-block invariant holds — exactly one `HARNESS:BEGIN` block in each of the four `rpiv-*` agents and none in any other agent; agent-field additivity/ordering and code-server fail-not-degrade + exit-1 aggregate propagation continue to pass via TEST-40..46. Boundaries intact: no `verification.yml` restructure, no `src` changes, no other issues docs rewritten.

## Acceptance Criteria Assessment (frozen cycle-1 interpretation)
The cycle-1 interpretation (against the issue ISSUE_ALIGNMENT refined criteria) is reused unchanged. All criteria assessed "Met" in cycle 1 remain Met — none regressed, since the delta only removed malformed data and added the review doc. The single "Partially met (not exercised)" criterion (non-actionable review records "no action needed" with no items) remains documented-but-not-exercised; consistent with the frozen framing and explicitly non-blocking.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| — | — | — | No new findings introduced by the remediation delta. | — |
| F-02 | nit (follow-up) | `harness` (`--agent) _fagent=default unknown; shift 2`) | Carried forward from cycle 1: pre-existing last-arg `shift 2` arity edge case shared across `friction add` flags. Not introduced by this issue; non-blocking. | Address across all `friction add` flags in a future harness cleanup. |

## Verdict Rationale
Applying the re-review gate: the sole cycle-1 blocking finding (F-01) is genuinely resolved (data-only fix; authoritative gate green at HEAD `e07b496`), no blocking finding exists, and no acceptance criterion that previously passed is now unmet. The only residual item (F-02) is a pre-existing nit tracked as a COMMENT follow-up. Verdict: **APPROVE**.

## Suggested Follow-ups
- Consider a harness write-time guard (or test) rejecting seed friction records with an empty `suggested_closure`, so this regression class is caught at record time rather than only in TEST-09. (The two stray records were auto-recorded by the harness during the verifier own `./harness` runs — a lightweight guard would prevent recurrence.)
- Address F-02 `shift` arity nit across all `friction add` flags in a future harness cleanup.
