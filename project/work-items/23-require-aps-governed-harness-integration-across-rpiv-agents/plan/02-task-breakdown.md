# Task Breakdown: Require APS-governed harness integration across RPIV agents

## Task T-0: Stabilize full-validation classification (Phase 0 prerequisite)

- **Status:** Complete
- **Complexity:** Small
- **Dependencies:** None
- **Acceptance Criteria:** AC-22
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260806-project-command-interface

### Description
Make only the research-proven `startWorkbenchProof` cancellation/early-exit test boundary deterministic so the full gate can prove this issue. Prioritize an already-aborted signal over a process exit caused by cooperative cancellation and keep the bounded early-exit fixture distinguishable from a genuine readiness timeout under full-suite load. Do not change workbench APIs, successful runtime behavior, harness scope, or product acceptance.

### Acceptance Criteria
- AC-22 can be proven by a repeatable successful full-validation run.
- Cancellation remains `cancelled`, intentional fast exit remains `early-exit`, and a live non-ready process remains `readiness-timeout`.
- The change is the minimum prerequisite and introduces no Issue #23 product behavior.

### Test Coverage
- Add or tighten deterministic Vitest race cases in the existing workbench proof runtime/failure suites.
- Run V-0 focused classification tests before any RPIV harness work.
- Rerun V-8 through the root full-validation recipe after all tasks.

### Expected Evidence
- Focused Vitest output identifying the cancellation, early-exit, and readiness-timeout cases.
- A narrowly scoped diff in `apps/api/src/workbench-proof-runtime.ts` and its existing tests.
- Final retained `just verify` exit status and command summary.

## Task T-1: Define and apply the reusable APS RPIV harness profile

- **Status:** Complete (verifier corrections applied)
- **Complexity:** Medium
- **Dependencies:** T-0
- **Acceptance Criteria:** AC-1, AC-5, AC-16, AC-17
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Add one explicit RPIV harness-profile contract to `.github/agents/aps-v1.2.2.agent.md`. Apply it in create, update, and lint flows for exactly the coordinator plus Research, Plan, Implement, and Verify. Load the VS Code subagent guide for these targets. Define the VS Code host as the lifecycle host, the repository-local `eng-harness-flow` skill as the only lifecycle front door, existing terminal execution as the worker observation tool, required request/response mappings, output validation, frontmatter least privilege, and all full APS target-file checks. Rename pre-existing overlength symbols where required for full lint without changing their meanings.

### Acceptance Criteria
- Preserve AC-1, AC-5, AC-16, and AC-17 exactly as cataloged in the action plan.
- The profile names all five targets and differentiates coordinator lifecycle placement from worker observation placement.
- The profile rejects unregistered/fake tools, child harness skills, unsupported DSL, absent host capability, tool expansion, and incomplete typed interfaces.

### Test Coverage
- V-1 validates profile placement and application paths in APS.
- V-4 runs the full positive profile and APS inventory matrix.
- V-5 includes fake command and profile omission fixtures.

### Expected Evidence
- Diff of the APS profile constant, generator application process, and expanded lint inventory.
- Per-target profile applicability rows in the generated matrix.
- Full APS lint report with no hard errors for each RPIV target.

## Task T-2: Harden coordinator lifecycle orchestration and typed handoffs

- **Status:** Complete (verifier corrections applied)
- **Complexity:** Large
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-5, AC-6, AC-12, AC-14, AC-15, AC-16, AC-17, AC-20
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
Refactor the coordinator definition without changing Research → Plan → Implement → Verify ownership. Invoke the supported host skill shape `/eng-harness-flow --hook <hook> --json` only through the VS Code host skill mechanism, validate host/skill availability and explicit success, and fail with the seam identity before dispatch on unavailable, empty, malformed, or non-success results. Track serialized active seams and transition identities `(hook, target stage, coordinator stage-attempt number)`. Deduplicate only a completed success for the same transition, increment attempts for correction cycles, and route Plan corrections through the complete downstream sequence. Replace hidden free-form worker inputs with one-for-one dispatch arguments and captured typed outputs while retaining existing handoff validation.

### Acceptance Criteria
- Preserve every listed AC ID and all pre-existing stage and correction responsibilities.
- Initial and correction seam order is executable and validated before downstream dispatch.
- No lifecycle failure is advisory-shaped to the pipeline, even though resulting human guidance remains advisory.

### Test Coverage
- V-2 covers initial order, Plan and Implement correction paths, attempt identity, success deduplication, serialization, and all seam result failures.
- V-5 proves missing/misordered hooks and correction seams fail.
- V-6 proves issue parsing, work-item resolution, stage order, handoffs, and correction ownership remain stable.

### Expected Evidence
- Positive initial and correction traces with hook, target, attempt, result, and dispatch order.
- Pipeline-error snapshots for missing host, unavailable skill/tool, empty/malformed output, non-success, and overlap.
- Typed coordinator-to-worker request/response mapping table for all four workers.

## Task T-3: Add governed observation capture to all leaf workers

- **Status:** Complete
- **Complexity:** Large
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-2, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-15, AC-16, AC-17, AC-20
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260808-host-process-environment

### Description
Give Research, Plan, Implement, and Verify one equivalent bounded observation state machine while preserving each stage workflow and current frontmatter tools. Use the eight ordered triggers and eight governed kinds. Reject invalid kinds and blank or shorter-than-CLI descriptions before execution. Encode shell-sensitive descriptions as one POSIX literal argument and invoke the real `harness observe` executable through existing `execute/runInTerminal`. Capture and validate command results. Keep unsuccessful events pending with failure details; retry at declared finite checkpoints and immediately for explicit matching failures when observation is available. Deduplicate only successful identical `(trigger, description, kind)` tuples during one worker run. Return typed observation evidence without granting lifecycle, agent, or subagent capability.

### Acceptance Criteria
- Preserve every listed AC ID and each workers existing RPIV responsibility and write boundary.
- Every pending event receives a final stage-completion attempt; success and each failure shape remain distinguishable.
- No worker contains lifecycle hook invocation text in executable processes.

### Test Coverage
- V-3 exercises all worker parity, checkpoints, immediate capture, successful-tuple deduplication, changed tuples, input rejection, shell-literal round trips, malformed output, and retry persistence.
- V-5 proves unsupported kinds, fake observation commands, lifecycle leakage, and absent checkpoints fail.
- V-6 confirms worker input/output and stage outcome regressions remain unchanged apart from observation evidence.

### Expected Evidence
- Four worker matrix rows for every trigger, kind, checkpoint, result shape, and unchanged tool list.
- Captured argv proof for descriptions containing spaces, quotes, dollar signs, semicolons, and command-substitution characters.
- Typed stage evidence showing successful and pending failed observations separately.

## Task T-4: Build read-only contract validation and negative fixtures

- **Status:** Complete (verifier corrections applied)
- **Complexity:** Large
- **Dependencies:** T-2, T-3
- **Acceptance Criteria:** AC-1, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards

### Description
Create a repository-local Vitest contract validator under `tests/contracts/` that reads the APS generator and all five RPIV definitions, evaluates every profile rule, evaluates the complete APS target inventory, and emits a deterministic pass/fail matrix at `test-results/issue-23/rpiv-harness-contract-matrix.json`. Keep target validation read-only. Add static negative fixtures for missing/misordered lifecycle hooks, missing correction seams, worker hook leakage, unsupported kinds, fake observation execution, and absent capture checkpoints, plus host/tool/output and overlap failures needed by the profile.

### Acceptance Criteria
- Preserve all mapped AC IDs and report each rule against every applicable target.
- Every required negative fixture fails for its expected rule and no unrelated rule is needed to make it fail.
- Validation needs only repository files and local test tooling; it performs no production, account, network, or unsupported-host operation.

### Test Coverage
- V-4 validates all positive targets and matrix completeness.
- V-5 table-drives every deterministic negative fixture and expected diagnostic.
- V-6 validates retained RPIV contracts as positive regression rows.

### Expected Evidence
- Inspectable JSON matrix with rule ID, target, status, and source evidence.
- Negative fixture report mapping fixture names to exact expected failures.
- Tracked-tree before/after status proving the validator changed no tracked target.

## Task T-5: Align harness governance and RPIV documentation

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-3, T-4
- **Acceptance Criteria:** AC-2, AC-11, AC-15, AC-21
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description
Retain the Plan-stage update to `CORE-COMPONENT-260806-rpiv-stage-contract.md` and decision records 49–52. Update `.harness/engineering-harness.md`, `AGENTS.md`, `CONTRIBUTING.md`, `LLM.txt`, and only other tracked RPIV/harness guidance found by the consistency scan so they agree that the coordinator owns lifecycle seams and all leaf workers only observe their own friction. Preserve stage responsibilities, command ownership, and advisory-to-human language. If implementation reveals a required architecture deviation, return to Plan rather than editing the selected contract ad hoc.

### Acceptance Criteria
- Preserve AC-2, AC-11, AC-15, and AC-21 exactly as cataloged.
- No tracked statement assigns a lifecycle hook or seam order to a worker or bypasses `eng-harness-flow`.
- The decision log remains complete and uses actionable imperative records sourced to the updated component.

### Test Coverage
- V-7 searches tracked documentation for agent names, hook names, `eng-harness-flow`, and `harness observe`, then applies ownership assertions.
- V-4 validates architecture/profile matrix rows.
- V-6 confirms the documented RPIV responsibilities remain stable.

### Expected Evidence
- Documentation diff and zero-contradiction search report.
- Core-component diff plus decision-log records 49–52.
- Injection map naming all four workers for coding observation while retaining coordinator fire hooks.

## Task T-6: Integrate validation and retain delivery evidence

- **Status:** Complete (verifier corrections applied)
- **Complexity:** Medium
- **Dependencies:** T-0, T-4, T-5
- **Acceptance Criteria:** AC-17, AC-18, AC-19, AC-20, AC-22
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260806-rpiv-stage-contract

### Description
Add a focused root `justfile` recipe for the RPIV contract suite and delegate to it from `just verify` without duplicating command ownership elsewhere. Run focused tests while building, run the positive matrix, negative fixtures, and regression inventory, then run the declared full gate. Record command, exit status, relevant counts, matrix path, architecture/documentation result, and AC evidence in `implementation/00-implementation.md`. Generated matrix output may live under ignored `test-results/`; checks must not mutate tracked agent or documentation files.

### Acceptance Criteria
- Preserve AC-17 through AC-20 and AC-22 exactly as cataloged.
- The focused recipe is discoverable through `just --list`, and `just verify` remains authoritative.
- A successful full-gate result is retained and can be tied to the implementation commit.

### Test Coverage
- V-4, V-5, and V-6 run through the focused root recipe.
- V-8 runs `just verify` after a clean focused pass.
- Verify independently reruns V-8 from the committed handoff.

### Expected Evidence
- Root recipe listing and successful focused contract output.
- Complete matrix and negative/regression summaries.
- Retained `just verify` command result, commit SHA, and clean-tree proof.
