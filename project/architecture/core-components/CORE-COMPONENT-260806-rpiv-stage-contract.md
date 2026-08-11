# CORE-COMPONENT-260806-rpiv-stage-contract: RPIV Stage Contract

## Status

Adopted

## Purpose

Define durable ownership, evidence, validation, and handoff boundaries across the RPIV delivery pipeline.

## Scope

This contract applies to the RPIV coordinator, all four RPIV stage agents, the APS-generated RPIV harness profile, their work-item artifacts, and pull requests.

## Definition

### Rules
- RPIV MUST create or confirm the issue feature branch before Research starts.
- The RPIV coordinator MUST be the sole owner of pre-flight, pre-coding, post-coding, and post-flight lifecycle orchestration.
- The coordinator MUST attempt pre-flight after branch preparation, pre-coding after a valid Plan handoff, post-coding after a valid Implement handoff, and post-flight only after successful Verify.
- Every Implement correction attempt MUST repeat pre-coding before Implement and post-coding before Verify; a Plan correction MUST re-enter the same downstream sequence.
- Lifecycle transitions MUST be serialized and identified by hook, target stage, and coordinator stage-attempt number; only a successful call for the same identity may be deduplicated.
- Every lifecycle attempt MUST use the eng-harness-flow host-skill front door and MUST block downstream dispatch with a seam-specific pipeline error when the host skill, invocation capability, or successful result is unavailable.
- The APS generator MUST apply one reusable RPIV harness profile when generating, updating, or linting the coordinator and all four workers.
- Research, Plan, Implement, and Verify MUST capture only retry or backtrack, tool wait over 30 seconds, unexpectedly empty search, ambiguous failure, inferred-only runtime behavior, eyeballed constraint, hidden setup, and magic-wand reflex events.
- Every worker MUST accept only coordination, confusion, difficulty, gift, improvement-suggestion, insight, magic-wand, and win observations and MUST execute a real harness observe command with literal non-empty description text.
- Every worker MUST attempt explicit qualifying failures immediately when observation is available and MUST retry every pending event at finite checkpoints through stage completion.
- A worker MUST deduplicate only successfully captured events with an identical trigger, description, and kind tuple during one execution.
- A worker MUST retain unavailable, empty, malformed, and failed observation attempts with the event and failure details until a later checkpoint succeeds or the stage hands off failure evidence.
- Stage workers MUST NOT invoke lifecycle hooks, gain dispatch capability, or expand their frontmatter tools for harness capture.
- Every RPIV stage MUST resolve an existing work-item directory by issue-number prefix before choosing an artifact path.
- Every RPIV stage MUST preserve an existing work-item directory name.
- Research MUST reuse the existing work-item directory when one matches the issue-number prefix.
- Research MUST create `project/work-items/<ISSUE_NUMBER>-<SHORT_DESCRIPTION>/` only when no matching directory exists.
- Research MUST derive `<SHORT_DESCRIPTION>` as lowercase ASCII kebab-case from the GitHub Issue title when creating the directory.
- Research MUST fail when more than one work-item directory matches the issue-number prefix.
- Plan, Implement, and Verify MUST require exactly one existing work-item directory.
- Research MUST record constraints, risks, relevant architecture, acceptance criteria, and repository findings only.
- Plan MUST assign stable `AC-*` IDs and map each criterion to tasks, validation, and expected evidence.
- Implement MUST execute dependency-ordered tasks, maintain tests and affected application documentation, run configured validation, record evidence, and commit.
- Implement MUST cover applicable README, API, configuration, usage, migration, architecture, operational, and deployment documentation.
- Implement MUST record documentation evidence or a concrete no-impact rationale.
- Verify MUST inspect the exact implementation commit and independently verify affected application documentation.
- Verify MUST return missing, stale, inaccurate, or inconclusive application documentation to Implement.
- Verify MUST decide acceptance, update GitHub, push, and create the pull request.
- Implement and Verify MUST use root `justfile` recipes for validation by default.
- Implement MUST run `just verify-focused` while building and `just verify` before handoff by default.
- Verify MUST rerun `just verify` independently by default.
- Verify MUST return code or test defects to Implement.
- Verify MUST return plan, architecture, scope, or acceptance coverage defects to Plan.

### Interfaces
- Plan hands Implement the acceptance catalog, tasks, test plan, ADRs, and core-components.
- The coordinator invokes lifecycle seams through the host skill mechanism and validates an explicit result before dispatching the target stage.
- Every stage worker uses its existing terminal capability for its own harness observe calls and reports capture status in its typed stage result.
- Repository-local contract validation reads the APS profile and all five RPIV definitions without mutating them.
- Implement writes task completion, validation results, and `AC-*` evidence to `project/work-items/<ISSUE_NUMBER>-<SHORT_DESCRIPTION>/implementation/00-implementation.md`.
- Implement hands Verify the branch, commit SHA, clean-tree proof, `AC-*` evidence, documentation evidence, and validation results.
- Every action plan, task breakdown, test plan, implementation note, verification summary, and pull request carries stable `AC-*` IDs.

### Expectations
- Stage agents do not perform responsibilities owned by another stage.
- Harness guidance remains advisory to humans, while agents never silently omit required lifecycle or observation attempts.
- Harness integration preserves worker least privilege and the Research, Plan, Implement, and Verify input, output, and ownership boundaries.
- Contract evidence covers profile placement, host and tool availability, seam order, correction cycles, worker parity, negative fixtures, and prior RPIV behavior.
- Verify does not author application documentation or repair documentation defects.
- Failed verification causes correction and downstream re-execution before acceptance.
- GitHub acceptance checkboxes are updated only by Verify after independent acceptance.

## Rationale

Explicit ownership prevents premature acceptance claims, duplicated validation logic, stale documentation, uncommitted handoffs, and gaps between issue criteria and delivery evidence. Human-readable, stable work-item paths make repository artifacts understandable without coupling their location to later issue-title edits.

## Usage Examples

```text
AC-1 -> Task T-1 -> Test V-1 -> Expected evidence -> Implementation evidence -> Verify decision
Behavior change -> Documentation requirement -> Committed documentation -> Verify documentation decision
```

## Integration Guidelines

- Keep the APS RPIV harness profile, stage prompts, harness governance, and AGENTS.md aligned with this contract.
- Keep lifecycle orchestration in the coordinator and observation execution in leaf workers.
- Resolve an existing work-item path before reading or writing stage artifacts.
- Keep default validation behavior and executable project command bodies in the root `justfile`.
- Document any adopted command wrapper and update stage agents before they consume it.
- Preserve acceptance criterion order when assigning stable IDs.
- Include the Implement handoff commit SHA in verification records.
- Include documentation changes or a no-impact rationale in implementation and verification records.

## Exceptions

- None.

## Enforcement

- [ ] Automated checks
- [x] Code review checklist
- [x] Test coverage requirements

## Related ADRs

- [ADR-260808-governed-engineering-harness](../ADR/ADR-260808-governed-engineering-harness.md)
