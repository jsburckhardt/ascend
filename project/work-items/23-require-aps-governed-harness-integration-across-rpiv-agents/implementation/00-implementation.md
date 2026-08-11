# Implementation Notes: Issue #23

## Completed Tasks

- **T-0:** Stabilized cancellation/early-exit/readiness-timeout classification at the proven workbench sensor boundary.
- **T-1:** Added and applied one reusable `RPIV_HARNESS_PROFILE` to APS create, update, and lint behavior.
- **T-2:** Added coordinator-only serialized lifecycle seams, transition identity, correction recurrence, typed dispatch, and explicit failure gating; correction seam errors now halt locally and propagate the same typed `SEAM_FAILURE` used by initial seams.
- **T-3:** Added equivalent governed observation state machines and typed evidence to all four leaf workers without tool expansion.
- **T-4:** Added the read-only contract matrix, local command-boundary proof, lifecycle sensor, parsed correction control/data-flow traces, and 26 deterministic negative fixtures, including a correction seam that incorrectly returns generic verification evidence.
- **T-5:** Aligned RPIV architecture, governance, agent maps, and contributor documentation.
- **T-6:** Added `verify-rpiv-harness`, delegated to it from `just verify`, and refreshed the generated 114-row matrix and 26-fixture report under `test-results/issue-23/`.

## Acceptance Evidence

- **AC-1:** `.github/agents/aps-v1.2.2.agent.md` defines exactly one `RPIV_HARNESS_PROFILE`, names the coordinator and four workers, and applies it in generation/update plus lint inference; matrix rules `PROFILE_SINGLE_REUSABLE`, `PROFILE_TARGETS`, and `PROFILE_APPLICATION` pass.
- **AC-2:** `.github/agents/rpiv.agent.md` exclusively owns lifecycle execution; all workers contain only their observation state machine. Coordinator and four worker role rows pass in the matrix.
- **AC-3:** `rpiv-router` orders branch preparation, pre-flight, Research, Plan validation, pre-coding, Implement handoff validation, post-coding, Verify success, and post-flight. `LIFECYCLE_INITIAL_ORDER` passes.
- **AC-4:** `route-verification-failure` increments attempts, routes Plan correction through Plan → pre-coding → Implement → post-coding → Verify, and returns immediately when either correction seam fails; parsed pre/post traces prove the next stage is not executed.
- **AC-5:** `run-lifecycle-seam` uses the adapter-registered `vscode/runCommand` tool with lexicographically ordered `arguments`/`command` parameters, the exact hook argv, and only the `eng-harness-flow` front door; slash-command tool IDs and marker-only substitutes fail executable fixtures.
- **AC-6:** Host, skill, invocation, empty, malformed, and non-success classes set typed hook, target-stage, attempt, host-error, and result evidence before dispatch. Initial and correction router branches return `PIPELINE_ERROR` with `details=SEAM_FAILURE`; the generic-result fixture fails `CORRECTION_SEAM_FAILURE_PROPAGATION`.
- **AC-7:** `WORKER_TRIGGER_PARITY` passes for Research, Plan, Implement, and Verify with the ordered eight-trigger list.
- **AC-8:** `WORKER_KIND_PARITY`, `WORKER_REAL_OBSERVE`, and `WORKER_LITERAL_SHELL` pass for all workers; the local stub receives shell-sensitive text byte-for-byte as one description argument.
- **AC-9:** Each worker declares after-context, after-primary-work, after-validation, and stage-completion checkpoints, immediate explicit-failure capture, and successful tuple deduplication; applicable worker rules pass.
- **AC-10:** Worker evidence distinguishes `captured` from unavailable, empty, malformed, failed, and invalid-input attempts while retaining pending events; `WORKER_RETRY_EVIDENCE` passes for all workers.
- **AC-11:** Frontmatter snapshots remain unchanged for all workers, no worker has dispatch tools, and no worker executes a lifecycle hook; `WORKER_LEAST_PRIVILEGE` and `WORKER_NO_LIFECYCLE` pass four times each.
- **AC-12:** Coordinator identity is `<hook>|<target-stage>|<coordinator-stage-attempt>` with success-only deduplication; worker identity is the exact successful trigger/description/kind tuple. The lifecycle sensor proves retry, dedup, changed-attempt, and overlap outcomes.
- **AC-13:** Workers reject descriptions below 10 characters and unsupported kinds before execution, encode POSIX literals, and retain malformed output; local argv and negative fixtures pass.
- **AC-14:** `ACTIVE_SEAM` rejects overlap before invocation or dispatch and clears on recovered invocation failure, invalid result, or success; executable transition/result-gating assertions and the serialization-gap fixture pass.
- **AC-15:** Architecture and guidance preserve advisory-to-human wording while agent definitions require every lifecycle and observation attempt; documentation matrix rows pass.
- **AC-16:** APS inventory plus `correctionSeamFailureTraces` parse the actual coordinator call graph, failure guards, local returns, downstream dispatches, and router return details for both correction seams.
- **AC-17:** All five targets pass section order, instruction vocabulary, symbol length/uniqueness, process signature/RUN mapping, grammatical RUN/USE IDs, registered and frontmatter-allowed tools, lexicographic parameter and `WHERE` keys, VS Code frontmatter, and deprecated-field inventory rows.
- **AC-18:** `test-results/issue-23/rpiv-harness-contract-matrix.json` contains 114 deterministic rows and 39 rules across APS, five RPIV targets, documentation, and executable regressions, with zero failures; target hashes are unchanged by validation.
- **AC-19:** Twenty-six fixtures under `tests/contracts/fixtures/rpiv-harness/` each fail for exactly its expected rule. `correction-seam-generic-result.json` sets typed seam failure evidence but returns generic `VERIFY_RESULT`, and fails only `CORRECTION_SEAM_FAILURE_PROPAGATION`. The inspectable report is `test-results/issue-23/rpiv-harness-negative-fixtures.json`.
- **AC-20:** Six executable regression rows parse actual process calls and assert issue/work-item resolution, Research → Plan → Implement → Verify handoffs, validation delegation, documentation ownership, commit handoff, and Verify shipping behavior without relying on documentation keywords.
- **AC-21:** `CORE-COMPONENT-260806-rpiv-stage-contract.md` is the selected sufficient cross-cutting contract; decision records 49–52 and the coordinator/four-worker injection map are present. Documentation consistency rows pass with no contrary ownership statement in the scoped tracked guidance.
- **AC-22:** Phase 0 gives an already-aborted signal classification priority, captures exact child identity before cooperative termination, and gives intentional early exit a bounded 2,000 ms sensor budget. Focused tests prove Error, string, and opaque cancellation reasons, `cancelled`, exit code 23 `early-exit`, and live `readiness-timeout` while keeping branch coverage deterministic above the full-gate threshold; final `just verify` exits 0.

## Documentation Evidence

- `README.md` documents initial/correction typed seam failure behavior, the 26-fixture inventory, 114-row matrix, and `just verify-rpiv-harness` workflow.
- `AGENTS.md` records coordinator-only lifecycle ownership, four leaf observers, failure behavior, and unchanged stage responsibilities.
- `CONTRIBUTING.md` documents lifecycle seam order, correction recurrence, stage blocking, and typed hook/stage/host/result failure evidence.
- `LLM.txt` identifies the lifecycle coordinator and four observation-capable leaf agents.
- `.harness/engineering-harness.md` maps all lifecycle hooks only to the coordinator and coding observation to each worker.
- `project/architecture/core-components/CORE-COMPONENT-260806-rpiv-stage-contract.md` and `project/architecture/ADR/DECISION-LOG.md` retain the Plan-selected contract and decisions 49–52.
- No API, product configuration, data migration, deployment, or runtime operations documentation changed: Phase 0 changes only a test-backed proof sensor and Issue #23 changes agent/governance behavior rather than Ascend product contracts.
- No ADR or core-component edit is required: the adopted RPIV stage contract already mandates seam-specific correction gating, and this correction brings executable flow and evidence back into that existing boundary.

## Validation Evidence

- `just verify-focused apps/api/test/workbench-proof-runtime.test.ts apps/api/test/workbench-proof-failures.test.ts --reporter=verbose` — 2 files, 12 tests passed.
- `just verify-focused tests/contracts/rpiv-harness-contract.test.ts --reporter=verbose` — 1 file, 5 tests passed.
- `just verify-rpiv-harness` — repeated passes; 114 matrix rows, 39 rules, zero failures, 26 expected negative-fixture failures.
- Initial `just verify` attempts exposed and cleared a formatting defect. A later full run reached Playwright but reported one transient owned-cleanup false result with no residual process; the clean full-gate retry passed that scenario and the complete gate.
- Final `just verify` — exit 0; format, lint, typecheck, 308 API tests, 139 web tests, 5 RPIV contract tests, 48 registration tests, builds, 5 passed/1 skipped Playwright tests, and capacity audit passed.

## Observation Evidence

- Captured verifier-feedback backtracking as `COORD-039`.
- Captured unavailable inspection tools and targeted-edit retries as `DL-231`, `DL-232`, `DL-233`, `DL-235`, `DL-241`, and `DL-242`.
- Captured focused/full validation failures before correction as `DL-234`, `DL-236`, `DL-237`, and `DL-238`.
- Captured formatting-gate failure and retry friction as `DL-243`, `COORD-040`, and `DL-244`.
- Captured the transient E2E cleanup failure and clean retry as `DL-245` and `COORD-041`.
- Captured full-gate waits exceeding 30 seconds as `INS-041`, `INS-043`, and `INS-044`.
- All qualifying events were successfully captured through the real `harness observe` executable; no pending failed attempts remain at stage completion.

Implementation evidence is complete for handoff. Final acceptance remains owned by Verify.
