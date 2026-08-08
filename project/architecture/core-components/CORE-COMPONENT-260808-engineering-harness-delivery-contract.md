# CORE-COMPONENT-260808-engineering-harness-delivery-contract: Engineering Harness Delivery Contract

## Status

Adopted

## Purpose

Define the reusable contract by which Ascend agents discover, execute, observe, and improve the engineering harness without replacing project commands or changing RPIV stage ownership.

## Scope

This component applies to .harness/ governance and extensions, repository-local skills and lockfiles, RPIV coordinator and implementer definitions, harness evidence and flow records, and validation of those surfaces. It does not define application product behavior or implement the remaining database, CI, architecture-sensor, or live-service gaps.

## Definition

### Rules
- The canonical governance file MUST enumerate boot, checks, interaction, observation, evidence, all RPIV lifecycle seams, current back-pressure gaps, and exactly one current L0–L4 maturity level.
- harness checks MUST delegate to root just verify and return one machine-readable success or actionable error envelope.
- harness boot MUST compose checks, report non-negative elapsed duration, claim readiness only after checks succeed, and leave no persistent development server.
- RPIV MUST call pre-flight after branch preparation, pre-coding after Plan validation, post-coding after a valid Implement handoff, and post-flight only after successful Verify.
- Harness seam calls MUST remain advisory and MUST NOT reorder or replace Research → Plan → Implement → Verify; an implementation correction MUST repeat pre-coding and post-coding around Implement.
- The implementer MUST capture each configured, previously unobserved friction event with an allowed observation kind; focused and full validation failures MUST be observed before correction, and unsupported kinds MUST be rejected before command execution.
- Adoption-time assessment artifacts MUST remain immutable baselines; governance, flow state, retrospectives, and harness-change records MUST represent current capability and trajectory separately.
- Canonical flow JSON MUST remain schema-valid, and generated Markdown views MUST be regenerated without drift.
- Every committed repository-local skill directory MUST have exactly one same-named integrity entry in the root skill lock, and the harness installation lock MUST declare the project-scoped packaged agent target.

### Interfaces
- Humans and agents discover boot and checks through the installed harness CLI and consume its JSON envelopes.
- RPIV invokes the eng-harness-flow host skill at pre-flight, pre-coding, post-coding, and post-flight seams; implementation-time capture uses harness observe.
- Current governance lives at .harness/engineering-harness.md; evidence lives under .harness/reports/ and .harness/records/.
- Repository-local skills live under .agents/skills/, with integrity in skills-lock.json and installation metadata in .harness/skills.lock.json.

### Expectations
- Repeated checks and boot runs at one revision and dependency state produce stable semantic verdict fields while timestamps, durations, and captured output may vary.
- Checks error envelopes identify the failed operation, retain the last 20 lines from each non-empty standard-error and standard-output stream in labeled diagnostic details, fall back to an explicit exit-code diagnostic when both streams are empty, and tell the agent to rerun harness checks after correction.
- The harness does not mutate tracked content during checks, boot, discovery, flow validation, or evidence inspection.
- Legacy agent-specific harness bootstrap definitions are removed after the governed CLI, skills, and lifecycle integration replace them.

## Rationale

One shared contract keeps command delegation, envelope behavior, RPIV seams, observation capture, evidence provenance, generated flow state, and skill installation coherent without fragmenting closely related harness rules across issue-scoped documents. The associated ADR owns the architectural choice to adopt this repository-local governed adapter; this component owns the reusable behavior that agents and validation must enforce.

## Usage Examples

~~~text
harness doctor --json
harness checks --json
harness boot --json
/eng-harness-flow --hook pre-coding
harness observe "Focused validation failed and required diagnosis." --kind difficulty
~~~

## Integration Guidelines

- Add project checks to root justfile recipes first, then expose them through harness envelopes.
- Update governance and add a harness-change record only when encoded capability changes.
- Preserve baseline assessment aliases byte-for-byte with their canonical report files.
- Validate agent definitions, flow renders, lock parity, envelopes, and tracked-tree immutability before handoff.

## Exceptions

- Users may decline advisory lifecycle guidance, but agents may not silently omit configured seam calls.
- Timestamps, durations, and bounded command-output excerpts may differ between otherwise deterministic runs.
- Live-service boot may replace test-backed boot only through a later ADR that defines process ownership, health, and cleanup.

## Enforcement

- [x] Automated checks
- [x] Code review checklist
- [x] Test coverage requirements

## Related ADRs

- [ADR-260808-governed-engineering-harness](../ADR/ADR-260808-governed-engineering-harness.md)
