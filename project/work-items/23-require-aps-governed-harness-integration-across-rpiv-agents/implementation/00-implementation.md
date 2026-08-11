# Implementation Notes: Issue #23

## Completed Tasks

- **T-0:** Stabilized cancellation/early-exit/readiness-timeout classification at the proven workbench sensor boundary.
- **T-1:** Added and applied one reusable `RPIV_HARNESS_PROFILE` to APS create, update, and lint behavior.
- **T-2:** Added coordinator-only serialized lifecycle seams, transition identity, correction recurrence, typed dispatch, and explicit failure gating.
- **T-3:** Added equivalent governed observation state machines and typed evidence to all four leaf workers without tool expansion.
- **T-4:** Added the read-only contract matrix, local command-boundary proof, lifecycle sensor, and 18 deterministic negative fixtures.
- **T-5:** Aligned RPIV architecture, governance, agent maps, and contributor documentation.
- **T-6:** Added `verify-rpiv-harness`, delegated to it from `just verify`, and retained the generated matrix under `test-results/issue-23/`.

## Acceptance Evidence

- **AC-1:** `.github/agents/aps-v1.2.2.agent.md` defines exactly one `RPIV_HARNESS_PROFILE`, names the coordinator and four workers, and applies it in generation/update plus lint inference; matrix rules `PROFILE_SINGLE_REUSABLE`, `PROFILE_TARGETS`, and `PROFILE_APPLICATION` pass.
- **AC-2:** `.github/agents/rpiv.agent.md` exclusively owns lifecycle execution; all workers contain only their observation state machine. Coordinator and four worker role rows pass in the matrix.
- **AC-3:** `rpiv-router` orders branch preparation, pre-flight, Research, Plan validation, pre-coding, Implement handoff validation, post-coding, Verify success, and post-flight. `LIFECYCLE_INITIAL_ORDER` passes.
- **AC-4:** `route-verification-failure` increments attempts and routes Plan correction through Plan → pre-coding → Implement → post-coding → Verify; `LIFECYCLE_CORRECTION` and both correction fixtures pass.
- **AC-5:** `run-lifecycle-seam` uses only ``/eng-harness-flow --hook <SEAM_HOOK> --json``; matrix and source scans find no child harness skill or standalone `INVOKE` DSL.
- **AC-6:** Host, skill, invocation, empty, malformed, and non-success classes set a seam-specific pipeline error before dispatch; `LIFECYCLE_FAILURE_GATING` and related negative fixtures pass.
- **AC-7:** `WORKER_TRIGGER_PARITY` passes for Research, Plan, Implement, and Verify with the ordered eight-trigger list.
- **AC-8:** `WORKER_KIND_PARITY`, `WORKER_REAL_OBSERVE`, and `WORKER_LITERAL_SHELL` pass for all workers; the local stub receives shell-sensitive text byte-for-byte as one description argument.
- **AC-9:** Each worker declares after-context, after-primary-work, after-validation, and stage-completion checkpoints, immediate explicit-failure capture, and successful tuple deduplication; applicable worker rules pass.
- **AC-10:** Worker evidence distinguishes `captured` from unavailable, empty, malformed, failed, and invalid-input attempts while retaining pending events; `WORKER_RETRY_EVIDENCE` passes for all workers.
- **AC-11:** Frontmatter snapshots remain unchanged for all workers, no worker has dispatch tools, and no worker executes a lifecycle hook; `WORKER_LEAST_PRIVILEGE` and `WORKER_NO_LIFECYCLE` pass four times each.
- **AC-12:** Coordinator identity is `<hook>|<target-stage>|<coordinator-stage-attempt>` with success-only deduplication; worker identity is the exact successful trigger/description/kind tuple. The lifecycle sensor proves retry, dedup, changed-attempt, and overlap outcomes.
- **AC-13:** Workers reject descriptions below 10 characters and unsupported kinds before execution, encode POSIX literals, and retain malformed output; local argv and negative fixtures pass.
- **AC-14:** `ACTIVE_SEAM` rejects overlap before invocation or dispatch and clears only after explicit result handling; `LIFECYCLE_SERIALIZATION` and the overlap fixture pass.
- **AC-15:** Architecture and guidance preserve advisory-to-human wording while agent definitions require every lifecycle and observation attempt; documentation matrix rows pass.
- **AC-16:** APS `LINT_CHECKS` and the reusable profile explicitly include placement, host/frontmatter/tool availability, lifecycle/correction order, no-hook workers, parity, literal execution, checkpoints, retry evidence, and typed interfaces.
- **AC-17:** All five targets pass section order, instruction vocabulary, symbol length/uniqueness, backticked IDs, lexicographic `WHERE` keys, VS Code frontmatter, and deprecated-field inventory rows. Overlength APS and Verify symbols were renamed without semantic change.
- **AC-18:** `test-results/issue-23/rpiv-harness-contract-matrix.json` contains 96 deterministic rows across APS, five RPIV targets, documentation, and regression, with zero failures; target hashes are unchanged by validation.
- **AC-19:** Eighteen fixtures under `tests/contracts/fixtures/rpiv-harness/` each fail for exactly its expected rule, covering required hook, correction, leakage, kind, command, checkpoint, input, shell, output, retention, availability, overlap, host, tool, dedup, and profile defects.
- **AC-20:** The `RPIV_REGRESSION` row retains issue/work-item, Research → Plan → Implement → Verify, validation delegation, documentation, commit, and PR ownership markers; typed dispatch changes only expose the existing handoffs plus observation evidence.
- **AC-21:** `CORE-COMPONENT-260806-rpiv-stage-contract.md` is the selected sufficient cross-cutting contract; decision records 49–52 and the coordinator/four-worker injection map are present. Documentation consistency rows pass with no contrary ownership statement in the scoped tracked guidance.
- **AC-22:** Phase 0 gives an already-aborted signal classification priority, captures exact child identity before cooperative termination, and gives intentional early exit a bounded 2,000 ms sensor budget. Focused tests prove `cancelled`, exit code 23 `early-exit`, and live `readiness-timeout`; final `just verify` exits 0.

## Documentation Evidence

- `README.md` documents the APS-governed RPIV split and `just verify-rpiv-harness` developer workflow.
- `AGENTS.md` records coordinator-only lifecycle ownership, four leaf observers, failure behavior, and unchanged stage responsibilities.
- `CONTRIBUTING.md` documents lifecycle seam order, correction recurrence, explicit host failure, and worker observation boundaries.
- `LLM.txt` identifies the lifecycle coordinator and four observation-capable leaf agents.
- `.harness/engineering-harness.md` maps all lifecycle hooks only to the coordinator and coding observation to each worker.
- `project/architecture/core-components/CORE-COMPONENT-260806-rpiv-stage-contract.md` and `project/architecture/ADR/DECISION-LOG.md` retain the Plan-selected contract and decisions 49–52.
- No API, product configuration, data migration, deployment, or runtime operations documentation changed: Phase 0 changes only a test-backed proof sensor and Issue #23 changes agent/governance behavior rather than Ascend product contracts.

## Validation Evidence

- `just verify-focused apps/api/test/workbench-proof-runtime.test.ts apps/api/test/workbench-proof-failures.test.ts --reporter=verbose` — 2 files, 12 tests passed.
- `just verify-focused tests/contracts/rpiv-harness-contract.test.ts --reporter=verbose` — 1 file, 4 tests passed.
- `just verify-rpiv-harness` — repeated passes; 96 matrix rows, zero failures, 18 expected negative-fixture failures.
- `just verify` — exit 0; format, lint, typecheck, 308 API tests, 139 web tests, 4 RPIV contract tests, 48 registration tests, builds, 5 passed/1 skipped Playwright tests, and capacity audit passed.

Implementation evidence is complete for handoff. Final acceptance remains owned by Verify.
