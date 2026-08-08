# Action Plan: Adopt a governed engineering harness across RPIV delivery

## Feature
- **ID:** 3
- **Research Brief:** project/work-items/3-adopt-a-governed-engineering-harness-across-rpiv-delivery/research/00-research.md

## ADRs Created
- [ADR-260808-governed-engineering-harness](../../../architecture/ADR/ADR-260808-governed-engineering-harness.md) — adopts .harness as a governed repository-local adapter over root justfile recipes, selects non-persistent test-backed boot for the current scaffold, and separates immutable adoption evidence from current capability.

## Core-Components Created
- [CORE-COMPONENT-260808-engineering-harness-delivery-contract](../../../architecture/core-components/CORE-COMPONENT-260808-engineering-harness-delivery-contract.md) — defines reusable envelope, RPIV seam, observation, evidence, generated-flow, and skill-lock contracts without fragmenting the harness lifecycle into separate components.

## Acceptance Criteria

### Core
- **AC-1:** Repository-local harness governance enumerates boot and checks, interaction and observation methods, evidence locations, the four RPIV seam events, remaining back-pressure gaps, and exactly one L0–L4 maturity level.
- **AC-2:** When just verify exits zero, harness checks --json exits zero with one JSON envelope where command is checks, status is ok, and data.command is just verify; its nonzero path has status error, an error code and message, diagnostic details, and a non-empty next_action that tells the agent to rerun harness checks after correction.
- **AC-3:** A successful harness boot --json returns one JSON envelope where command is boot, status is ok, data.readiness is ready, data.proof is harness checks, data.mode is test-backed scaffold, data.start_command is just run, data.endpoints are http://127.0.0.1:5173 and http://127.0.0.1:3000, and data.duration_ms is a non-negative number; boot starts no persistent development server.
- **AC-4:** The adoption-time harnessability baseline is retained as Markdown, JSON, evidence, and schema artifacts; latest.json is byte-identical to the canonical report JSON; latest.md is byte-identical to the canonical report Markdown; and the report records baseline scores, ordered gaps, and proof ceiling.
- **AC-5:** Adoption and loop flow JSON mark governance, boot, lifecycle injection, retro drain/harvest, and readiness-duration improvement nodes done; regenerating their Markdown views produces no diff; each harness-change record names the gap or observation it resolves; and the excursion-schema retro entry remains open.
- **AC-6:** Each committed repository-local skill directory has one same-named root lock entry containing a 64-character lowercase hexadecimal computedHash, with no extra lock entries, and the harness installation lock contains one project-scoped packaged install for the declared agent target.
- **AC-7:** RPIV calls pre-flight after branch preparation, pre-coding after Plan validation, post-coding after a valid Implement handoff, and post-flight only after successful Verify; these advisory calls do not alter RPIV stage order, and a correction pass repeats pre-coding and post-coding around Implement.
- **AC-8:** During one implementer run, every configured trigger not already present in the observed-event set emits one harness observation with one configured kind; focused and full validation failures emit difficulty observations before correction; and a kind outside the configured list is rejected before command execution.
- **AC-9:** The implementer receives one JSON request containing branch_name, issue_number, plan_handoff, verification_feedback, and work_item_path, and has explicit Plan-owned or Implement-owned error outcomes when the uniquely resolved path, committed Plan artifacts, or current branch differs from the request.
- **AC-10:** For each planned task in dependency order, the implementer applies complete edits to existing or new application and test content, reruns focused validation, performs at most one correction attempt after a failure, and returns an Implement-owned error if focused validation still fails.
- **AC-11:** The implementer updates affected documentation or records a non-empty no-impact rationale tied to the planned tasks, runs full repository validation, performs at most one correction attempt after failure, and returns an Implement-owned error if full validation still fails.
- **AC-12:** Before handoff, the implementer records evidence for every acceptance ID and both validation stages, creates implementation notes, constructs staging and commit invocations without interpolating unquoted paths or messages, and reports the requested branch, resulting commit SHA, and clean-tree evidence; no implementation changes or a dirty final tree returns an Implement-owned error.
- **AC-13:** For both modified VS Code RPIV definitions, verification evaluates every APS LINT_CHECKS item that inspects written target-file content, plus all FIELD_REQUIREMENTS_VSCODE rules; checks that govern only the generator agent’s user-visible response are excluded; the evidence table names each included and excluded check with its rule text and result, and all included checks pass.
- **AC-14:** The legacy harness integration agent definition is absent, active RPIV definitions reference the engineering-harness lifecycle skill, and the formatting configuration excludes exactly the harness and repository-local skill asset trees added by this work while retaining its prior exclusions.

### Edge Cases
- **AC-15:** A nonzero checks result causes boot to return status error with code E_BOOT_CHECKS_FAILED, elapsed duration in diagnostic details, and a non-empty next_action to rerun harness boot; it cannot return data.readiness as ready.
- **AC-16:** A read-only execution-path matrix traces mismatched work-item path, stale Plan handoff, mismatched branch, unsupported observation kind, exhausted focused correction, exhausted full correction, absent implementation change, and dirty final tree to their explicit non-success branch and stage owner in the modified definitions.
- **AC-17:** Two sequential checks and boot runs at the same revision and installed dependency state produce identical status, readiness, proof, command, and endpoint values; timestamps, durations, and captured command output may differ; git diff for tracked content is unchanged and boot starts no development server.
- **AC-18:** Current governance distinguishes implemented test-backed checks and boot from the immutable adoption baseline, and lists database lifecycle, local/CI equivalence, executable architecture checks, and live-service readiness as unimplemented gaps.

### Verification
- **AC-19:** Harness discovery reports both boot and checks loaded without extension errors.
- **AC-20:** Two sequential harness checks --json and harness boot --json runs exit zero and satisfy the exact envelope assertions above; tracked-content diff is unchanged before and after, and process inspection confirms boot started no persistent server.
- **AC-21:** just verify exits zero and covers formatting, linting, type checking, tests, builds, and browser validation.
- **AC-22:** Repository-local schema validation accepts the harnessability report and both flow JSON files; byte comparison accepts both latest report aliases; and regenerating both flow Markdown files produces no diff.
- **AC-23:** One read-only evidence table records every assertion in the APS matrix, execution-path matrix, skill/lock inventory, installation lock, legacy-agent absence, lifecycle references, and formatting-exclusion delta; every assertion passes using repository files only.

## Acceptance Coverage

| AC | Implementation tasks | Tests or validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1 | V-1 | Governance section inventory, four fire-seam rows plus coding observation row, gap list, and one L3 match |
| AC-2 | T-1, T-6 | V-2 | Captured success and injected-failure checks envelopes with exit codes and exact field assertions |
| AC-3 | T-1, T-6 | V-3 | Captured boot success envelope, non-negative duration assertion, and before/after process-listener snapshot |
| AC-4 | T-2, T-6 | V-4 | Schema result, artifact inventory, canonical/latest hashes and cmp results, score/gap/proof assertions |
| AC-5 | T-2, T-6 | V-5 | Flow schema/show results, render --check results, done-node assertions, change-record resolves values, open retro status |
| AC-6 | T-3, T-6 | V-6 | Sorted skill/lock bijection, hash-format checks, and installation-lock assertion |
| AC-7 | T-4, T-6 | V-7 | Ordered coordinator seam and correction-route matrix with advisory/stage-order assertions |
| AC-8 | T-5, T-6 | V-8 | Observation trigger/kind/set-dedup/failure-order/unsupported-kind rows in the execution evidence table |
| AC-9 | T-4, T-5, T-6 | V-8 | Five-field request assertion and explicit path, handoff, and branch owner/outcome rows |
| AC-10 | T-5, T-6 | V-8 | Task-loop edit, dependency, focused rerun, one-correction, and terminal-error rows |
| AC-11 | T-5, T-6 | V-8 | Documentation/no-impact, full validation, one-correction, and terminal-error rows |
| AC-12 | T-5, T-6 | V-8 | Evidence/notes/safe-command/branch/SHA/clean-tree and no-change/dirty-tree rows |
| AC-13 | T-6 | V-9 | Per-rule APS table for both files, with included/excluded classification, exact rule text, and pass result |
| AC-14 | T-4, T-6 | V-10 | Git absence proof, lifecycle-reference search, and exact prettierignore before/after delta |
| AC-15 | T-1, T-6 | V-3 | Injected checks-child failure boot envelope with E_BOOT_CHECKS_FAILED, duration diagnostics, rerun action, and no ready data |
| AC-16 | T-5, T-6 | V-8 | Eight-row execution-path matrix with source location, non-success outcome, and Plan/Implement owner |
| AC-17 | T-1, T-6 | V-11 | Normalized sequential envelope comparison, unchanged tracked diff, and no-new-server snapshot |
| AC-18 | T-1, T-2 | V-1, V-4 | Governance current-vs-baseline statement and exact four unimplemented gap assertions |
| AC-19 | T-1, T-6 | V-12 | Doctor extension entries showing boot/checks loaded with zero failures/conflicts |
| AC-20 | T-1, T-6 | V-11 | Two checks and two boot captures, normalized equality, unchanged diff, and process evidence |
| AC-21 | T-6 | V-13 | just verify zero exit and output for format, lint, typecheck, tests, builds, and Playwright |
| AC-22 | T-2, T-6 | V-4, V-5 | Report/flow schema results, byte comparisons, and render drift checks |
| AC-23 | T-3, T-4, T-5, T-6 | V-6, V-8, V-9, V-10 | One consolidated read-only evidence table covering every named inventory and matrix assertion |

**Coverage proof:** 23 of 23 acceptance IDs have at least one dependency-ordered implementation task, one bounded validation entry, and one concrete expected-evidence definition. No acceptance ID is unmapped.

## Implementation Tasks

1. **T-1 — Validate and finish the governed harness nucleus (AC-1, AC-2, AC-3, AC-15, AC-18, AC-19, AC-20).** Treat the existing governance, boot/checks extensions, and instruction files as implemented work; inspect and make only evidence-driven corrections.
2. **T-2 — Validate and preserve baselines, flows, change records, and retros (AC-4, AC-5, AC-18, AC-22).** Keep adoption reports immutable and current-state artifacts separate; validate canonical JSON and generated views.
3. **T-3 — Validate repository-local skills and installation locks (AC-6, AC-23).** Cover every .agents/skills directory and both lockfile surfaces without normalizing unrelated skill content.
4. **T-4 — Validate and finish RPIV lifecycle replacement and formatting scope (AC-7, AC-9, AC-14, AC-23).** Preserve deletion of .github/agents/harness-cli-it.agent.md as intentional replacement by the governed CLI, local lifecycle skill, and active RPIV integration unless validation disproves that replacement.
5. **T-5 — Validate and finish implementer execution, correction, observation, and handoff contracts (AC-8, AC-9, AC-10, AC-11, AC-12, AC-16, AC-23).** Use static, read-only path analysis for agent behavior and correct only explicit contract gaps.
6. **T-6 — Produce consolidated evidence and run canonical validation (AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-19, AC-20, AC-21, AC-22, AC-23).** Record the issue-specific evidence table in implementation notes, run root justfile recipes plus bounded repository-local checks, and leave a clean committed handoff.
