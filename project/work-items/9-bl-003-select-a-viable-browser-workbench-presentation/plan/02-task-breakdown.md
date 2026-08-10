# Task Breakdown: BL-003: Select a viable browser workbench presentation

Tasks are dependency ordered. Completion requires listed acceptance, tests, and evidence.

## Task T-1: Pin comparison and evidence contracts

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-6, AC-8, AC-9, AC-11, AC-12, AC-14, AC-15, AC-17, AC-18
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-filesystem-path-safety; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260808-development-standards

### Description
Extend `workbench-proof-contract.ts` with the exact candidate tuple, six slots, viewport, ordered prerequisites, assertion IDs, event categories, schemas, dispositions, and comparison-scoped evidence paths. Reuse BL-001 snapshots and BL-002 commands. Separate retained evidence from disposable state; add no product route.

### Acceptance Criteria
- Exports contain only `embedded` and `full-page`; slots are embedded 1-3 then full-page 1-3.
- Prerequisite order/names match AC-2.
- Validators reject missing fields/artifacts, fabricated IDs, malformed medians, and unknown dispositions.
- Records omit clipboard content and represent not-started slots.

### Test Coverage
- V-1 pins all constants, schemas, fixture bytes, and median shape.
- V-6 checks every prerequisite failure, zero starts, and first stop reason.

### Expected Evidence
Focused contract output and passed/failed/not-started/complete schema fixtures.

## Task T-2: Capture and classify browser protocol evidence

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-7, AC-8, AC-9, AC-12
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260808-development-standards

### Description
Register one attempt-local observer before navigation. Capture all required response, request, console, page-error, and WebSocket events in order with repeats. Apply blocking precedence, separate totals, and WebSocket usability. Store raw evidence without protected content.

### Acceptance Criteria
- Listeners precede navigation and end with context cleanup.
- Every AC-8 family, overlap, and repeat is classified deterministically.
- Functional failure is distinct from retained warnings.
- A workbench WebSocket opens before interaction and remains usable through terminal completion.

### Test Coverage
- V-2 table-tests all event families, overlap, repetition, and lifecycle.
- V-3/V-8 validate real raw references and timing.

### Expected Evidence
Classifier output, occurrence fixtures, raw event references, and totals.

## Task T-3: Implement both proof-only presentations and the fixed scenario

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-1, AC-3, AC-4, AC-5, AC-6, AC-7, AC-9, AC-12, AC-26
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-filesystem-path-safety; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-structured-runtime-logging

### Description
Create exactly two small Playwright adapters over the same loopback workbench. Embedded uses a minimal test-owned Ascend frame surface; full-page keeps code-server top-level with only a proof header. Feed both to one scenario: one navigation, Explorer, Markdown Preview, keyboard focus transitions, one terminal, memory-only clipboard round-trip in unexecuted input, then merged BL-002 parity. Snapshot fixture tree and sentinel bytes per attempt.

### Acceptance Criteria
- Presentation is the only adapter-specific behavior.
- Actions occur once in issue order; polling only observes readiness/known Preview frame replacement.
- Clipboard is cleared, never executed/persisted, and only equality is recorded.
- Every functional outcome has an assertion ID and independent fixture evidence.

### Test Coverage
- V-3 runs both adapters with action counters/order.
- V-7 proves token absence and tree/sentinel integrity.
- V-8 runs all six real slots.

### Expected Evidence
Ordered assertions, status, WebSocket/parity references, clipboard flag, and fixture snapshots.

## Task T-4: Coordinate fresh attempts, records, and exact cleanup

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-3
- **Acceptance Criteria:** AC-2, AC-6, AC-10, AC-11, AC-12, AC-13, AC-14, AC-16, AC-17, AC-18, AC-26
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-filesystem-path-safety; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260806-agent-executable-acceptance-criteria; CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260806-rpiv-stage-contract; CORE-COMPONENT-260808-development-standards; CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description
Add a serial coordinator: prerequisites before ownership; run ID before navigation; fresh BL-001 group, empty context, and disposable per slot. Run once, retain one record on all outcomes, and always attempt exact command/context/group/PID/listener/disposable/fixture cleanup. Cleanup failure records one reason and blocks later slots. Do not use the existing fallback second stop in this path.

### Acceptance Criteria
- No process, context, state, listener, command, or disposable is reused.
- Operation/evidence/integrity/cleanup failures remain visible and fail the attempt.
- Cleanup failure blocks later slots, which have no run IDs.
- Each started slot has one complete record and reached monotonic timestamps.

### Test Coverage
- V-4 proves freshness, once-only calls, retained failures, cleanup order, stop, and absent IDs.
- V-6 covers stops; V-8 inspects real uniqueness/cleanup.

### Expected Evidence
Call logs, partial comparisons, distinct real identities, and cleanup results.

## Task T-5: Implement eligibility and deterministic selection

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1, T-4
- **Acceptance Criteria:** AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-21, AC-22, AC-25
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260806-agent-executable-acceptance-criteria; CORE-COMPONENT-260808-development-standards; CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
Implement a pure selector over validated records. Eligibility requires three complete passes. Aggregate blocking/non-blocking occurrences and middle integer elapsed value for eligible candidates. Select by eligibility, blocking, warning, then median in exact order; no fallback preference.

### Acceptance Criteria
- Fewer than three complete passes is ineligible.
- One eligible wins; two use first strict lower measure.
- Equal measures yield `selection tie`; zero eligible yields `no viable candidate`.
- Partial execution selects only an already-proven eligible candidate.

### Test Coverage
- V-5 covers single eligibility, each tie-breaker/dominance, tie, neither, missing artifact, partial stop.
- V-1 checks median/totals.

### Expected Evidence
Selector matrix with disposition, candidate, exit, eligibility, totals, medians, stop reason.

## Task T-6: Add bounded fault and safety validation

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-2, AC-5, AC-6, AC-10, AC-11, AC-12, AC-13, AC-16, AC-17, AC-18, AC-25, AC-26
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-filesystem-path-safety; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260806-agent-executable-acceptance-criteria; CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260806-rpiv-stage-contract; CORE-COMPONENT-260808-development-standards; CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description
Add deterministic seams around prerequisites, artifact writing, cleanup, terminal ownership, and scenario invocation. Prove all ordered prerequisite failures, no retry, missing-artifact ineligibility, cleanup stop, absent IDs, exact cleanup, memory-only clipboard, and independent fixture checks with finite records.

### Acceptance Criteria
- Every AC-26 case is finite and machine-readable.
- Faults cannot bypass cleanup or mutate/delete fixture.
- Invocation remains one after assertion, timeout, or transient error.
- First prerequisite failure allocates no attempt resources.

### Test Coverage
- V-6 covers prerequisite/evidence/cleanup/no-retry/not-started cases.
- V-7 covers clipboard/fixture; V-4 audits identities/disposables.

### Expected Evidence
Bounded focused output, partial records, cleanup audits, fixture snapshots.

## Task T-7: Run and retain the designated-host comparison

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2, T-3, T-4, T-5, T-6
- **Acceptance Criteria:** AC-23, AC-24
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-filesystem-path-safety; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description
Expose `just proof-workbench-presentation`; execute once on designated host with retries disabled and serial slots. Retain six attempts plus comparison when prerequisites/cleanup pass. Freeze comparison identity/disposition before architecture work.

### Acceptance Criteria
- Passing prerequisites/cleanup start six ordered attempts.
- Every reference resolves and facts/viewport are exact.
- Exit zero only for selected dispositions.
- Selection evidence exists before T-8.

### Test Coverage
- V-8 runs/validates paved command and resources.
- V-5 recomputes selection from evidence.

### Expected Evidence
Comparison, six attempts, raw references, command exit, final audit.

## Task T-8: Materialize only an evidence-backed ADR and update documentation

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-7
- **Acceptance Criteria:** AC-18, AC-21, AC-22, AC-23, AC-27
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-architecture-artifact-naming; CORE-COMPONENT-260806-rpiv-stage-contract; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description
Read frozen comparison. Only selection permits one UTC-dated `ADR-yymmdd-short-slug.md` from the exact template. Record desktop authority, candidates, scenario/evidence, eligibility/measures, selected/rejected alternatives, consequences, and non-authoritative tablet follow-up. Update decision log with imperative records. Rerun idempotently by comparison identity; fail conflict. Nonselection creates no Accepted ADR/log decision. Update runbook, discovery docs, harness governance/record if needed, and implementation evidence.

### Acceptance Criteria
- ADR occurs after selection and follows template exactly.
- One comparison yields one ADR/log registration without duplicate.
- Nonselection leaves no Accepted BL-003 ADR/selection record.
- Docs state AC-27 and match evidence while excluding integration/tablet acceptance.

### Test Coverage
- V-9 checks idempotence, conflict, template/log/decisions and no-ADR states.
- V-10 checks documentation consistency.

### Expected Evidence
Conditional ADR/log diff or no-ADR audit, docs/harness diff, consistency output.

## Task T-9: Integrate canonical gate and retain handoff evidence

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-8
- **Acceptance Criteria:** AC-28
- **Related ADRs:** ADR-260808-typescript-monorepo; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-agent-executable-acceptance-criteria; CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260806-rpiv-stage-contract; CORE-COMPONENT-260808-development-standards; CORE-COMPONENT-260808-engineering-harness-delivery-contract

### Description
Integrate bounded BL-003 validation into existing scripts/root gate, extending BL-001/2. Adjust documented harness deadlines only if measured runtime requires it. Run focused suites, paved comparison, then `just verify`; record AC-1 through AC-28 and documentation impact.

### Acceptance Criteria
- Root recipes remain raw command interface.
- Shared host/evidence suites are serial and finitely bounded.
- `just verify` exits zero.
- Implementation evidence maps every AC to command, result, artifact, observation.

### Test Coverage
- V-11 runs full gate after focused/paved validation.
- V-1 through V-10 rerun without duplicate ADR.

### Expected Evidence
Focused/paved/full output, exit/duration, cleanup audit, implementation AC mapping.
