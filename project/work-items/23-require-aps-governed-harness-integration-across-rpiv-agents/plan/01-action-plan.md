# Action Plan: Require APS-governed harness integration across RPIV agents

## Feature
- **ID:** 23
- **Research Brief:** project/work-items/23-require-aps-governed-harness-integration-across-rpiv-agents/research/00-research.md

## ADRs Created
- None. The accepted governed-harness architecture remains sufficient; no new architectural decision is required.

## Core-Components Created
- None.
- **Updated:** [CORE-COMPONENT-260806-rpiv-stage-contract](../../../architecture/core-components/CORE-COMPONENT-260806-rpiv-stage-contract.md) is sufficient and now defines the single APS RPIV harness profile boundary, coordinator-only lifecycle ownership, ordered and serialized seams, all-worker observation capture, least privilege, deduplication, and failure evidence.
- **Decision log:** [DECISION-LOG.md](../../../architecture/ADR/DECISION-LOG.md) records actionable decisions 49–52 for this update.
- **Related existing contract:** [CORE-COMPONENT-260808-engineering-harness-delivery-contract](../../../architecture/core-components/CORE-COMPONENT-260808-engineering-harness-delivery-contract.md) continues to define repository harness envelopes, evidence, and command delegation; it does not replace the RPIV stage boundary.

## Acceptance Criteria

### Core
- **AC-1:** `.github/agents/aps-v1.2.2.agent.md` contains one explicit, reusable RPIV harness-profile contract that is applied when generating, updating, or linting the RPIV coordinator and Research, Plan, Implement, and Verify workers.
- **AC-2:** The harness profile assigns lifecycle orchestration only to the coordinator, assigns qualifying friction capture to every stage worker, and preserves the existing Research, Plan, Implement, and Verify responsibility boundaries.
- **AC-3:** On the initial pass, the coordinator’s executable flow attempts real `eng-harness-flow` pre-flight after branch preparation, pre-coding after the existing Plan handoff validation succeeds and before Implement, post-coding after the existing Implement handoff validation succeeds and before Verify, and post-flight only after successful Verify.
- **AC-4:** Every Implement correction cycle repeats pre-coding before Implement and post-coding before Verify, and a Plan correction returns through the same required downstream seams.
- **AC-5:** Every lifecycle-seam attempt uses the single `eng-harness-flow` front door with a supported executable command shape; no child harness skill or unsupported `INVOKE` DSL appears in the RPIV definitions.
- **AC-6:** An unavailable host skill, unavailable tool, or non-success result at any lifecycle seam produces an explicit pipeline error that identifies the seam and prevents the next stage from being dispatched; no success-shaped fallback is reported.
- **AC-7:** Research, Plan, Implement, and Verify each define the same bounded friction triggers: retry or backtrack, tool wait over 30 seconds, unexpectedly empty search, ambiguous failure, inferred-only runtime behavior, eyeballed constraint, hidden setup, and magic-wand reflex.
- **AC-8:** Each stage worker accepts the same governed observation kinds—coordination, confusion, difficulty, gift, improvement-suggestion, insight, magic-wand, and win—rejects every other kind before execution, and passes non-empty shell-sensitive description text as a literal value to a real executable `harness observe` path.
- **AC-9:** Each stage worker defines finite capture checkpoints that attempt every pending qualifying event by stage completion and attempt explicit failures immediately when they match one of the eight qualifying triggers and observation is available. Within one worker execution, an event with the same trigger, description, and kind is captured at most once; a change to any of those values remains independently capturable.
- **AC-10:** Each stage’s evidence distinguishes successful capture from an unavailable, empty, malformed, or failed observation result; failed attempts preserve the qualifying event and failure details for the next declared checkpoint and never become a success-shaped fallback.
- **AC-11:** Research, Plan, Implement, and Verify never invoke pre-flight, pre-coding, post-coding, or post-flight. Harness integration does not expand their current frontmatter tool lists, does not grant agent or subagent dispatch, and uses their existing terminal-execution capability only for their own `harness observe` action.

### Edge Cases
- **AC-12:** Repeated observation checkpoints do not duplicate an already successful event capture. A lifecycle transition is identified by its hook, target stage, and coordinator stage-attempt number: retries of that transition do not duplicate its successful call, while each incremented correction attempt receives its own required lifecycle call.
- **AC-13:** Empty descriptions and invalid observation kinds are rejected before command execution; shell-sensitive descriptions are preserved literally, and empty or malformed command output is recorded as a failed attempt without losing the event.
- **AC-14:** Lifecycle seam calls are serialized: an overlapping or repeated transition cannot dispatch the next stage or start a second seam call until the active call has an explicit result.
- **AC-15:** Harness guidance remains advisory to the human, but the coordinator and stage workers do not silently skip required lifecycle calls or observation attempts.

### Verification
- **AC-16:** APS generated-agent validation explicitly checks harness-profile placement, executable command shape, host, tool, and frontmatter availability, lifecycle order, correction-cycle seams, the stage no-hook boundary, and friction-trigger and observation-kind parity.
- **AC-17:** The RPIV coordinator and all four stage workers each pass the full APS target-file lint inventory, including section order, instruction discipline, symbols, IDs, `where` ordering, formats, VS Code frontmatter and tool allowlists, worker input/output contracts, and the harness profile.
- **AC-18:** A repository-local, read-only contract-evidence matrix covers every harness-profile rule against `.github/agents/aps-v1.2.2.agent.md`, the RPIV coordinator, and all four stage workers and produces inspectable pass/fail evidence.
- **AC-19:** Contract evidence includes deterministic negative fixtures that fail for missing or misordered lifecycle hooks, missing correction seams, stage lifecycle-hook leakage, unsupported observation kinds, fake observation commands, and absent capture checkpoints. These checks are repository-local, read-only, and require no production access, external account, or unsupported host.
- **AC-20:** Repository-local regression evidence shows that the existing RPIV issue parsing, work-item resolution, stage order and handoffs, validation delegation, documentation evidence, commit handoff, and Verify pull-request contracts retain their prior outcomes except for the required harness calls and evidence.
- **AC-21:** Plan records whether the existing RPIV stage core-component is sufficient or one cross-cutting harness contract is required. The selected contract records coordinator lifecycle ownership, seam order, the worker no-hook boundary, and observation-failure evidence; `project/architecture/ADR/DECISION-LOG.md` registers every affected contract and its decisions, and a repository-local search of tracked documentation for the RPIV agent names, lifecycle hook names, `eng-harness-flow`, and `harness observe` finds no statement that assigns lifecycle ownership or seam order contrary to the selected contract.
- **AC-22:** The repository’s declared full-validation recipe completes successfully and its command result is retained as inspectable evidence.

## Acceptance Coverage

Coverage is complete: every AC ID maps to implementation, validation, and retained evidence.

| AC | Implementation task(s) | Test or validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1 | V-1, V-4 | APS profile constant/process and passing profile-placement matrix rows |
| AC-2 | T-2, T-3, T-5 | V-2, V-3, V-7 | Role matrix showing coordinator-only lifecycle and four leaf observers |
| AC-3 | T-2 | V-2 | Ordered initial-pass seam trace with validated handoff boundaries |
| AC-4 | T-2 | V-2, V-5 | Passing Implement/Plan correction traces and failing missing-seam fixture |
| AC-5 | T-1, T-2, T-4 | V-1, V-2, V-5 | Front-door command-shape rows and zero child-skill or `INVOKE` findings |
| AC-6 | T-2, T-4 | V-2, V-5 | Host-missing, tool-missing, malformed, and non-success pipeline-error cases |
| AC-7 | T-3 | V-3, V-4 | Eight-trigger parity rows for each worker |
| AC-8 | T-3 | V-3, V-5 | Allowed-kind parity, invalid-kind preflight rejection, and literal shell-text proof |
| AC-9 | T-3 | V-3, V-5 | Checkpoint, immediate-failure, tuple-dedup, and changed-tuple cases |
| AC-10 | T-3 | V-3, V-5 | Typed success/failure evidence and pending-event retry cases |
| AC-11 | T-3, T-4 | V-3, V-5 | Unchanged worker tool snapshots, no dispatch tools, and no-hook rows |
| AC-12 | T-2, T-3 | V-2, V-3 | Transition-attempt identity and worker successful-tuple dedup cases |
| AC-13 | T-3 | V-3, V-5 | Empty/kind rejection, shell-literal round trip, malformed-output retry evidence |
| AC-14 | T-2 | V-2, V-5 | Active-seam serialization and overlap rejection trace |
| AC-15 | T-2, T-3, T-5 | V-2, V-3, V-7 | Advisory wording plus mandatory-attempt matrix rows |
| AC-16 | T-1, T-4 | V-1, V-4 | Explicit generated-agent harness checks in APS lint output |
| AC-17 | T-1, T-2, T-3, T-4 | V-1, V-4 | Full APS inventory result for all five targets |
| AC-18 | T-4, T-6 | V-4 | Generated `test-results/issue-23/rpiv-harness-contract-matrix.json` |
| AC-19 | T-4 | V-5 | Deterministic negative-fixture report with expected rule failures |
| AC-20 | T-2, T-3, T-4 | V-6 | Prior-contract regression matrix with only harness deltas allowed |
| AC-21 | T-5 | V-7 | Updated RPIV stage contract, decisions 49–52, and contradiction-search report |
| AC-22 | T-0, T-6 | V-0, V-8 | Stable race regression plus retained successful `just verify` result |

## Implementation Tasks

1. **T-0 — Stabilize the full-validation prerequisite (Phase 0)** (`AC-22`): make the research-proven cancellation/early-exit boundary deterministic with the smallest runtime/test change needed; do not alter workbench product semantics.
2. **T-1 — Define and apply the reusable APS RPIV harness profile** (`AC-1`, `AC-5`, `AC-16`, `AC-17`): encode target placement, host-skill and terminal tool availability, executable shapes, lifecycle/worker rules, and full APS lint checks.
3. **T-2 — Harden coordinator lifecycle orchestration and worker interfaces** (`AC-2`–`AC-6`, `AC-12`, `AC-14`–`AC-17`, `AC-20`): add attempt identity, serialization, failure gating, correction recurrence, and one-for-one typed stage contracts without moving stage responsibilities.
4. **T-3 — Add governed friction capture to every leaf worker** (`AC-2`, `AC-7`–`AC-13`, `AC-15`–`AC-17`, `AC-20`): add common triggers/kinds, finite checkpoints, safe literal observation execution, result validation, retryable failure evidence, and successful-tuple deduplication using existing tools only.
5. **T-4 — Build the read-only RPIV contract validator and negative fixtures** (`AC-1`, `AC-5`–`AC-20`): evaluate the APS profile and five targets, emit the complete matrix, and prove deterministic failure of each required defect fixture.
6. **T-5 — Align governance and tracked documentation** (`AC-2`, `AC-11`, `AC-15`, `AC-21`): preserve the Plan-selected RPIV stage contract, update harness injection/agent maps, and eliminate contradictory ownership or seam-order statements.
7. **T-6 — Integrate repository validation and retain evidence** (`AC-17`–`AC-20`, `AC-22`): expose the focused contract recipe through the root `justfile`, include it in `just verify`, and retain focused, matrix, regression, and full-gate results in implementation notes.
