# Test Plan: Require APS-governed harness integration across RPIV agents

## Test V-0: Deterministic cancellation and early-exit classification

- **Type:** Focused Vitest regression
- **Task:** T-0
- **Acceptance Criteria:** AC-22
- **Priority:** Phase 0 / Blocking

### Setup
Use the existing fake code-server modes and disposable run roots in `workbench-proof-runtime.test.ts` and `workbench-proof-failures.test.ts`. Do not require real code-server or alter product fixtures.

### Steps
1. Exercise cooperative cancellation at the child identity/readiness boundary.
2. Exercise intentional fast exit with its bounded startup budget.
3. Exercise a live process that never becomes ready.
4. Run the two focused files together through `just verify-focused` and confirm exact cleanup.

### Expected Result
Cancellation reports `cancelled`, fast exit reports `early-exit` with exit code 23, timeout reports `readiness-timeout`, and each case removes its exact process group and run directory.

### Expected Evidence
Focused command output with named passing cases, zero residual-process assertions, and the narrow Phase-0 diff.

## Test V-1: APS harness-profile placement and full lint application

- **Type:** Static contract integration
- **Task:** T-1
- **Acceptance Criteria:** AC-1, AC-5, AC-16, AC-17
- **Priority:** Critical

### Setup
Load the normative APS references, VS Code adapter, subagent guide, `.github/agents/aps-v1.2.2.agent.md`, and the five RPIV target files through the repository contract validator.

### Steps
1. Assert one reusable RPIV profile names exactly the coordinator and four workers.
2. Assert generate, update, and lint paths apply the profile.
3. Assert profile checks cover placement, host/skill/tool/frontmatter availability, executable command shapes, order, corrections, no-hook workers, trigger/kind parity, and typed interfaces.
4. Run every normative and APS-agent target lint check, including symbol length, IDs, `where` ordering, formats, section discipline, frontmatter field order, tools, allowlists, and one-for-one worker contracts.

### Expected Result
The APS generator and all five targets pass every applicable full-inventory rule with no hard lint errors; no child harness skill, fake tool, or unsupported `INVOKE` appears.

### Expected Evidence
Per-rule/per-target lint rows in the matrix and source locations for the profile and its three application paths.

## Test V-2: Coordinator lifecycle order, correction, failure, and serialization

- **Type:** Static executable-flow contract test
- **Task:** T-2
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-5, AC-6, AC-12, AC-14, AC-15, AC-16, AC-20
- **Priority:** Critical

### Setup
Parse the coordinator processes into ordered actions and evaluate transitions with synthetic explicit host-skill results. No lifecycle skill or stage agent is actually dispatched by this read-only test.

### Steps
1. Trace branch → pre-flight → Research → valid Plan → pre-coding → Implement → valid handoff → post-coding → Verify → success → post-flight.
2. Trace one Implement correction and one Plan correction with incremented stage-attempt numbers.
3. Retry the same transition after a recorded success and then execute an incremented correction attempt.
4. Simulate an active overlapping seam and a repeated transition before result capture.
5. Inject unavailable host, unavailable skill/tool, empty output, malformed output, and each non-success result at every seam.
6. Verify worker dispatch begins only after explicit successful seam validation.

### Expected Result
Initial and correction calls occur in required order; only an identical successful transition deduplicates; incremented attempts receive new calls; overlap cannot start or dispatch; every failure returns a seam-specific pipeline error.

### Expected Evidence
Ordered transition traces and error snapshots carrying hook, target stage, attempt number, result class, and blocked dispatch.

## Test V-3: Four-worker friction capture parity and edge behavior

- **Type:** Static plus local command-boundary contract test
- **Task:** T-3
- **Acceptance Criteria:** AC-2, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-15, AC-16, AC-17, AC-20
- **Priority:** Critical

### Setup
Evaluate Research, Plan, Implement, and Verify with a stub executable at the real `harness observe` process boundary that records argv and returns controlled valid, unavailable, empty, malformed, and failed envelopes. Preserve each committed frontmatter tool list as the baseline.

### Steps
1. Compare the ordered eight triggers and eight allowed kinds in every worker.
2. Reject blank/too-short descriptions and invalid kinds before any process execution.
3. Send descriptions containing spaces, single/double quotes, dollar signs, semicolons, backticks, and command-substitution syntax; compare recorded argv byte-for-byte.
4. Exercise immediate explicit-failure capture and every declared finite checkpoint through stage completion.
5. Repeat one successful tuple, then vary trigger, description, and kind independently.
6. Return unavailable, empty, malformed, and failed results, verify retained pending evidence, then succeed at a later checkpoint.
7. Assert no worker lifecycle hooks, dispatch tool, new frontmatter tool, or responsibility expansion.

### Expected Result
All workers behave identically at the observation boundary, preserve literal descriptions, execute each successful tuple at most once, keep changed tuples capturable, retry failures without false success, and remain least-privilege leaf workers.

### Expected Evidence
Worker parity table, recorded argv samples, checkpoint traces, typed success/failure records, and before/after frontmatter tool snapshots.

## Test V-4: Complete positive RPIV contract-evidence matrix

- **Type:** Repository-local read-only matrix validation
- **Task:** T-1, T-4, T-5, T-6
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-20
- **Priority:** Critical

### Setup
Run the focused RPIV contract recipe from the repository root with clean tracked targets. Capture pre-run hashes of APS, all five RPIV files, architecture, and governance documents.

### Steps
1. Evaluate every harness-profile rule against each applicable target.
2. Evaluate the complete APS target inventory for all five RPIV definitions.
3. Evaluate retained RPIV behavior rows.
4. Write deterministic generated evidence under `test-results/issue-23/`.
5. Compare tracked target hashes and normalize matrix ordering.

### Expected Result
Every applicable row passes, every profile rule has at least one target row, all five targets have complete APS inventory rows, and tracked target hashes remain unchanged.

### Expected Evidence
`test-results/issue-23/rpiv-harness-contract-matrix.json`, focused command output, target hashes, and matrix completeness counts.

## Test V-5: Deterministic negative RPIV harness fixtures

- **Type:** Negative fixture suite
- **Task:** T-2, T-3, T-4
- **Acceptance Criteria:** AC-4, AC-5, AC-6, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-16, AC-19
- **Priority:** Critical

### Setup
Use tracked, minimal fixtures under `tests/contracts/fixtures/rpiv-harness/`. The validator reads fixtures only and uses no network, account, production service, or actual host-skill invocation.

### Steps
1. Validate fixtures with a missing lifecycle hook and a misordered hook.
2. Validate a missing Implement correction seam and incomplete Plan downstream route.
3. Validate worker lifecycle-hook leakage and dispatch/tool-list expansion.
4. Validate an unsupported kind and a fake/narrated observation command.
5. Validate absent stage-completion checkpoints and incorrect successful-tuple deduplication.
6. Validate blank descriptions, unsafe shell handling, empty/malformed output treated as success, and lost failed events.
7. Validate unavailable seam result and overlapping active seam fixtures.

### Expected Result
Each fixture fails deterministically with its expected profile rule ID and actionable diagnostic; the positive target remains passing and no fixture mutation occurs.

### Expected Evidence
Negative-fixture result table containing fixture, expected rule, actual rule, pass/fail, and diagnostic.

## Test V-6: Existing RPIV behavior regression inventory

- **Type:** Static regression contract test
- **Task:** T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-2, AC-20
- **Priority:** High

### Setup
Capture the pre-change contracts from the research brief and selected RPIV core-component. Compare semantic rows rather than brittle whole-file snapshots.

### Steps
1. Check GitHub issue parsing and structured criteria validation.
2. Check unique issue-prefix work-item resolution and stable path preservation.
3. Check Research → Plan → Implement → Verify order and artifact handoffs.
4. Check root `justfile` validation delegation and documentation evidence ownership.
5. Check Implement commit/clean-tree handoff and Verify acceptance, checkbox, push, and PR ownership.
6. Assert only required harness calls, observation evidence, and typed interface exposure differ.

### Expected Result
Every prior outcome remains present with the same owner and order; no worker gains another stage responsibility and no validation or shipping responsibility moves.

### Expected Evidence
Regression matrix with baseline rule, current source location, status, and permitted harness-only delta.

## Test V-7: Architecture, governance, and documentation consistency

- **Type:** Documentation and architecture validation
- **Task:** T-5
- **Acceptance Criteria:** AC-2, AC-11, AC-15, AC-21
- **Priority:** High

### Setup
Search tracked documentation and agent definitions for all RPIV agent names, lifecycle hook names, `eng-harness-flow`, `harness observe`, orchestration terms, and seam ordering.

### Steps
1. Confirm the updated RPIV stage core-component records coordinator ownership, exact seam order, worker no-hook boundary, and observation-failure evidence.
2. Confirm decision records 49–52 exist, use imperative verbs, and source the updated component.
3. Confirm harness governance maps four lifecycle fire hooks only to the coordinator and coding observations to all four workers.
4. Inspect every search hit for contradictory lifecycle ownership, seam order, tool expansion, or silent-skip guidance.

### Expected Result
The selected existing component is sufficient, architecture and decision-log records are complete, and no tracked statement contradicts the coordinator/worker boundary or ordered front door.

### Expected Evidence
Zero-contradiction search report, architecture source links, decision-log rows, and updated governance injection map.

## Test V-8: Declared full repository validation

- **Type:** Full validation gate
- **Task:** T-0, T-6
- **Acceptance Criteria:** AC-17, AC-18, AC-19, AC-20, AC-22
- **Priority:** Blocking

### Setup
Complete V-0 through V-7, use the issue feature branch, and run from the repository root. The root `justfile` remains the sole command owner.

### Steps
1. Run `just --list` and confirm the focused RPIV contract recipe plus `verify-focused` and `verify` are exposed.
2. Run the focused RPIV contract recipe and retain matrix/fixture/regression summaries.
3. Run `just verify` once for Implement handoff.
4. Record command, exit status, relevant suite counts, evidence paths, commit SHA, and working-tree status.
5. Require Verify to rerun `just verify` independently against the handoff commit.

### Expected Result
The declared full gate completes with exit code 0, includes the RPIV contract suite, retains all existing format/lint/type/unit/build/E2E/audit gates, and produces no tracked-file mutation.

### Expected Evidence
Implementation and Verify command records, successful exit status, suite summary, matrix path, implementation commit SHA, and clean-tree proof.
