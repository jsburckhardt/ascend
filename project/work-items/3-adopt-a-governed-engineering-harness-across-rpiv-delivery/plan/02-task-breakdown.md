# Task Breakdown: Adopt a governed engineering harness across RPIV delivery

Implementation starts from the existing complete worktree. Do not rebuild or replace correct assets: validate each category, repair only demonstrated gaps, record evidence, and commit the resulting full issue scope.

## Task T-1: Validate and finish the governed harness nucleus

- **Status:** Complete — verifier correction preserves bounded stdout/stderr failure diagnostics; V-2 stdout-only negative path and focused verification pass
- **Complexity:** CS-3 (medium)
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-15, AC-18, AC-19, AC-20
- **Related ADRs:** ADR-260808-governed-engineering-harness, ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260806-agent-executable-acceptance-criteria, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging

### Description
Validate .harness/engineering-harness.md, both extension TypeScript files, and both verb instruction files as one command nucleus. Preserve root justfile ownership, the successful JSON contracts, actionable negative paths, test-backed non-persistent boot, current L3 statement, and the exact unimplemented gap boundary. Correct only behavior or documentation that fails V-1, V-2, V-3, V-11, or V-12.

### Acceptance Criteria
- AC-1 and AC-18 governance content is complete, current, and unambiguous about immutable baseline evidence.
- AC-2 and AC-15 checks and boot expose exact successful and failed envelope behavior.
- AC-3, AC-17, and AC-20 boot is deterministic in semantic fields and leaves no persistent server.
- AC-19 discovery loads both extensions without extension errors.

### Test Coverage
- Run V-1 static governance assertions.
- Run V-2 checks success and injected-failure envelope assertions.
- Run V-3 boot success and injected-child-failure assertions with process inspection.
- Participate in V-11 sequential determinism and V-12 discovery checks.
- Use temporary executable fixtures outside tracked content for negative paths; do not alter justfile or application files to manufacture failure.

### Expected Evidence
- Captured JSON envelopes and exit codes for checks and boot success/failure.
- Governance assertion table with source line references.
- Before/after tracked diff and process/listener snapshots.
- Doctor extension inventory showing two loaded and zero failed/conflicting extensions.

## Task T-2: Validate and preserve reports, flows, change records, and retros

- **Status:** Complete — validated with V-4, V-5, AC-22 mappings, and focused verification
- **Complexity:** CS-3 (medium)
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-4, AC-5, AC-18, AC-22
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260806-agent-executable-acceptance-criteria, CORE-COMPONENT-260808-structured-runtime-logging

### Description
Validate every .harness/reports/harnessability baseline, alias, evidence, summary, and schema artifact; both canonical flow JSON and generated Markdown views; both harness-change records; and both retro records. Keep the report fixed to main at f2f15f7 with its pre-adoption scores and L2 proof ceiling while current governance remains separate. Preserve the open excursion-schema entry.

### Acceptance Criteria
- AC-4 baseline artifacts are complete, schema-valid, and byte-identical at canonical/latest aliases.
- AC-5 required nodes and records are accurately represented and generated views have no drift.
- AC-18 current capability does not rewrite or contradict the immutable baseline.
- AC-22 report and flow schema checks and render checks pass.

### Test Coverage
- Run V-4 report schema, artifact, score, ordered-gap, proof-ceiling, and byte-comparison checks.
- Run V-5 flow schema/show, required-node status, render --check, change-record, and open-retro checks.
- Re-read governance after any correction to prove current/baseline separation.

### Expected Evidence
- Report schema validator result and canonical/latest SHA-256 pairs.
- Flow show/schema and render --check command results for adopt and loop.
- Node-status and record-resolution table.
- Open compound status for the excursion-schema retro entry.

## Task T-3: Validate repository-local skills and installation locks

- **Status:** Complete — stale skill discovery guidance removed; V-6 inventory, lock assertions, and focused verification pass
- **Complexity:** CS-2 (small)
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-6, AC-23
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Treat all nine committed .agents/skills directories and every contained skill, reference, template, schema, and example as in scope. Validate the root skills-lock.json as an exact directory-name bijection with lowercase 64-hex hashes, and validate .harness/skills.lock.json as one packaged project installation targeting github-copilot. Do not rewrite skill source paths because the issue constrains names and hashes, not portability of temporary source provenance.

### Acceptance Criteria
- AC-6 has no missing, duplicate, malformed, or extra root skill-lock entry.
- AC-6 installation metadata has exactly one project-scoped packaged github-copilot target.
- AC-23 records every skill and both lock surfaces in the consolidated evidence table.

### Test Coverage
- Run V-6 as a bounded Node inventory check over directory names and parsed JSON.
- Verify every computedHash against the lowercase hexadecimal pattern and exact length.
- Compare sorted directory and lock key arrays for exact equality.

### Expected Evidence
- Sorted nine-name skill inventory beside sorted lock keys.
- One pass row per skill hash.
- Parsed installation-lock row with install count, scope, source, and target.

## Task T-4: Validate and finish RPIV lifecycle replacement and formatting scope

- **Status:** Complete — validated with V-7, V-8 request assertions, V-10, and focused verification
- **Complexity:** CS-3 (medium)
- **Dependencies:** T-1, T-3
- **Acceptance Criteria:** AC-7, AC-9, AC-14, AC-23
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260505-commit-standards

### Description
Validate .github/agents/rpiv.agent.md lifecycle calls, correction routing, stable work-item handling, and five-field Implement request. Preserve .github/agents/harness-cli-it.agent.md deletion as intentional replacement: the deleted agent’s standalone ./harness and duplicated verification model is superseded by the installed governed harness CLI, .harness extensions/governance, repository-local eng-harness-flow skill, and root-justfile delegation. Validate .prettierignore adds only .agents and .harness while retaining every prior exclusion. Historical diagram text is not an active agent definition and remains documentation history unless a criterion fails.

### Acceptance Criteria
- AC-7 has exact seam placement, unchanged RPIV order, advisory result handling, and repeated correction seams.
- AC-9 coordinator emits exactly the canonical five-field JSON request.
- AC-14 active definitions reference eng-harness-flow, the legacy definition is absent, and formatting delta is exact.
- AC-23 includes lifecycle, legacy absence, and formatting rows.

### Test Coverage
- Run V-7 coordinator order and correction-route static assertions.
- Run the request portion of V-8.
- Run V-10 against filesystem state, Git history/diff, active agent searches, and prettierignore baseline delta.

### Expected Evidence
- Ordered seam/stage table with source locations.
- Canonical Implement request key list.
- Git deletion proof and replacement-surface references.
- Exact prettierignore two-line additive diff and retained exclusion list.

## Task T-5: Validate and finish implementer execution and handoff contracts

- **Status:** Complete — validated with V-8 execution matrix and focused verification
- **Complexity:** CS-4 (large)
- **Dependencies:** T-4
- **Acceptance Criteria:** AC-8, AC-9, AC-10, AC-11, AC-12, AC-16, AC-23
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260505-commit-standards, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging

### Description
Validate .github/agents/rpiv-implementer.agent.md as an executable contract: request/path/handoff guards, trigger capture and observed-event deduplication, allowed-kind rejection before execution, complete edit application, dependency ordering, focused and full single-correction bounds, documentation handling, evidence notes, safe staging/commit inference, branch/SHA/clean-tree handoff, and explicit non-success ownership. Make only contract-level corrections; application scaffold files remain inspection context and require no feature edits unless a validation demonstrates impact.

### Acceptance Criteria
- AC-8 captures every configured new event once, observes both validation failure paths before correction, and rejects unsupported kinds before tool use.
- AC-9 path and stale-Plan failures return to Plan; branch mismatch is Implement-owned.
- AC-10 and AC-11 each permit no more than one correction and terminate explicitly after the second failed validation.
- AC-12 records complete evidence, documentation disposition, safe command construction, commit identity, and clean handoff, with explicit no-change and dirty-tree errors.
- AC-16 traces all eight required failure cases to a non-success branch and stage owner.
- AC-23 includes all execution-path assertions.

### Test Coverage
- Run V-8 as a read-only parser/matrix over the modified coordinator and implementer definitions.
- Confirm process order, branch counts, correction rerun counts, and that unsupported-kind validation text precedes execute/runInTerminal.
- Do not invoke the implementer to edit or commit during this static contract test.

### Expected Evidence
- Eight-row execution-path matrix with case, source location, condition, outcome, and owner.
- Observation table listing all triggers/kinds and failure-order assertions.
- Task/documentation/validation/handoff contract rows tied to AC-8 through AC-12.
- Explicit application-code no-impact rationale based on inspected scaffold boundaries.

## Task T-6: Produce consolidated evidence and canonical validation handoff

- **Status:** Complete — verifier correction evidence recorded; bounded negative path plus focused and full validation pass
- **Complexity:** CS-4 (large)
- **Dependencies:** T-2, T-3, T-5
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-19, AC-20, AC-21, AC-22, AC-23
- **Related ADRs:** ADR-260808-governed-engineering-harness, ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260806-agent-executable-acceptance-criteria, CORE-COMPONENT-260806-architecture-artifact-naming, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260505-commit-standards, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging

### Description
Run the complete bounded validation sequence after any corrections. Create project/work-items/3-adopt-a-governed-engineering-harness-across-rpiv-delivery/implementation/00-implementation.md with one consolidated read-only evidence table. Include every AC ID, both validation stages, every APS and FIELD_REQUIREMENTS_VSCODE rule for both modified targets, included/excluded rationale, the execution-path matrix, all inventory checks, exact commands, exit codes, normalized repeatability results, tracked-diff/process evidence, documentation disposition, and resulting commit handoff. Use just verify-focused while correcting files and root just verify as the full gate; do not create a duplicate verification configuration.

### Acceptance Criteria
- AC-13 evaluates every applicable target-content rule and names generator-response-only exclusions with exact source rule text.
- AC-17 and AC-20 prove sequential semantic determinism, tracked-tree immutability, and no persistent server.
- AC-19, AC-21, and AC-22 have fresh successful command evidence.
- AC-23 consolidates all required matrices and inventories into one repository-only table.
- Every other assigned AC has concrete implementation evidence and both focused/full validation results before handoff.

### Test Coverage
- Run V-9 APS/FIELD matrix checks against both modified RPIV definitions.
- Run V-11 sequential checks/boot determinism and immutability checks.
- Run V-13 root just verify and retain the six gate categories in evidence.
- Rerun V-4, V-5, V-6, V-8, V-10, and V-12 after any correction.
- Run just verify-focused for changed TypeScript or test files; if no application/test file changes are needed, record the scoped static checks and concrete no-impact rationale before full validation.

### Expected Evidence
- One implementation-notes evidence table with a passing row for every required assertion and AC mapping.
- Complete APS included/excluded matrix for rpiv.agent.md and rpiv-implementer.agent.md.
- Fresh root and harness command outputs with exit codes and normalized comparisons.
- Documentation evidence for governance/architecture changes and no-impact rationale for unchanged application README/API/configuration/migration/operations surfaces.
- Requested branch, implementation commit SHA, and clean git status proof.
