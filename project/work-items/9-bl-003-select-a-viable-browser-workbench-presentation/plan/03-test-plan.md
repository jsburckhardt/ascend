# Test Plan: BL-003: Select a viable browser workbench presentation

Bounded repository validation plus one designated-host comparison. BL-003 Playwright retries are disabled; passive observation never repeats an action or attempt.

## Test V-1: Comparison contract and record schemas

- **Type:** Unit
- **Task:** T-1, T-5
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-6, AC-8, AC-9, AC-11, AC-12, AC-14, AC-15, AC-18
- **Priority:** Critical

### Setup
Canonical BL-001 constants and valid/invalid records.

### Steps
1. Assert exact candidates, slots, prerequisites, viewport, IDs/status/dispositions.
2. Validate complete records; reject omitted fields/artifacts.
3. Assert fixture bytes and median.

### Expected Result
Exact fixtures pass; malformed, missing-artifact, fabricated-ID, unknown values fail.

### Expected Evidence
Focused output and schema expectations.

## Test V-2: Browser event capture and precedence

- **Type:** Unit
- **Task:** T-2
- **Acceptance Criteria:** AC-7, AC-8, AC-9, AC-12
- **Priority:** Critical

### Setup
Synthetic ordered streams for every policy family/WebSocket state.

### Steps
1. Feed all event kinds.
2. Include overlap/repeats.
3. Compare occurrence records/totals and functional separation.

### Expected Result
Every occurrence retained; blocking wins overlap; repeats count; non-blocking excludes blocking.

### Expected Evidence
Table output and event fixtures.

## Test V-3: Shared fixed scenario for both presentations

- **Type:** Browser integration
- **Task:** T-2, T-3
- **Acceptance Criteria:** AC-1, AC-3, AC-4, AC-5, AC-7, AC-9, AC-12
- **Priority:** Critical

### Setup
Both adapters over identical inputs with counters/no retries.

### Steps
1. Observe/navigate once.
2. Execute ordered Explorer, Preview, keyboard, terminal, clipboard, parity.
3. Compare inputs, order, status, WebSocket, counts.

### Expected Result
Only presentation differs; action counts are one and observations complete.

### Expected Evidence
Ordered assertions and counters.

## Test V-4: Freshness, no-retry, retention, and cleanup

- **Type:** Unit and integration
- **Task:** T-4, T-6
- **Acceptance Criteria:** AC-10, AC-11, AC-12, AC-13, AC-14, AC-16, AC-17, AC-26
- **Priority:** Critical

### Setup
Injected process/context/scenario/writer/cleanup seams with identities.

### Steps
1. Run pass and each failure family.
2. Count calls/inspect records.
3. Verify cleanup order, identities, disposable removal, later slots.

### Expected Result
Fresh records occur once; no retries; exact cleanup; cleanup failure stops later starts.

### Expected Evidence
Call logs, counters, partial comparisons, absence audits.

## Test V-5: Eligibility and ordered selector matrix

- **Type:** Unit
- **Task:** T-5, T-7
- **Acceptance Criteria:** AC-14, AC-15, AC-16, AC-19, AC-20, AC-21, AC-22, AC-24, AC-25
- **Priority:** Critical

### Setup
Six-slot fixtures controlling eligibility, counts, elapsed values.

### Steps
1. Test each single eligible.
2. Isolate tie-breakers/dominance.
3. Test tie, neither, missing artifact, partial stop.
4. Assert result/exit/totals/medians.

### Expected Result
Only rule-dictated result is returned.

### Expected Evidence
Complete selector table output.

## Test V-6: Ordered prerequisites and bounded faults

- **Type:** Unit and integration
- **Task:** T-1, T-4, T-6
- **Acceptance Criteria:** AC-2, AC-17, AC-18, AC-26
- **Priority:** Critical

### Setup
Ordered probes and finite injected failures without real attempts.

### Steps
1. Fail each prerequisite with later failures.
2. Assert first reason, zero starts, no IDs, nonzero no viable, no ADR.
3. Inject artifact/transient/timeout/cleanup failures; assert no retry.

### Expected Result
One exact stop reason and inspectable finite records.

### Expected Evidence
Focused output and comparison per case.

## Test V-7: Clipboard isolation and fixture integrity

- **Type:** Safety integration
- **Task:** T-3, T-4, T-6
- **Acceptance Criteria:** AC-5, AC-6, AC-13, AC-26
- **Priority:** Critical

### Setup
In-memory token, fixture snapshot, evidence/disposable roots.

### Steps
1. Type/copy/clear/paste/inspect unexecuted input.
2. Assert token absent from disk/evidence.
3. Compare tree/sentinel bytes.
4. Audit scoped removal.

### Expected Result
Clipboard equals, token absent, independent integrity passes, cleanup scoped.

### Expected Evidence
Clipboard boolean, absence check, snapshots, disposable audit.

## Test V-8: Designated-host six-attempt comparison

- **Type:** End-to-end
- **Task:** T-2, T-3, T-4, T-5, T-7
- **Acceptance Criteria:** AC-3, AC-4, AC-6, AC-7, AC-8, AC-10, AC-12, AC-13, AC-14, AC-15, AC-16, AC-23, AC-24
- **Priority:** Critical

### Setup
Ubuntu 24.04/vscode, merged proof, code-server 4.131.0, repository Chromium, 1440 by 900, no prior state.

### Steps
1. Run `just proof-workbench-presentation` once without retry.
2. Validate six records/references.
3. Recompute selection/exit.
4. Audit every resource.

### Expected Result
Six starts when prerequisites/cleanup pass; complete evidence dictates result.

### Expected Evidence
Six attempts, comparison, raw references, exit, audit.

## Test V-9: Conditional ADR materialization

- **Type:** Architecture validation
- **Task:** T-8
- **Acceptance Criteria:** AC-18, AC-21, AC-22, AC-23
- **Priority:** Critical

### Setup
Selected/tie/no-viable/prerequisite fixtures with isolated filesystem seams.

### Steps
1. Materialize selected twice.
2. Validate one template ADR/evidence/result/tablet/log/decisions.
3. Test conflict.
4. Run nonselection fixtures.

### Expected Result
Selected creates one ADR/log; conflict fails; nonselection creates none.

### Expected Evidence
Architecture validation and filesystem diffs.

## Test V-10: Documentation and result consistency

- **Type:** Documentation validation
- **Task:** T-8
- **Acceptance Criteria:** AC-23, AC-27
- **Priority:** High

### Setup
Final comparison/conditional ADR plus README, API/docs, harness docs.

### Steps
1. Check every rule/four dispositions.
2. Compare result/evidence/selection.
3. Assert tablet boundary/no integration.
4. Check harness configuration text.

### Expected Result
Docs completely match evidence, ADR presence, commands, and scope.

### Expected Evidence
Documentation test and reviewed diff.

## Test V-11: Canonical full verification gate

- **Type:** Full regression
- **Task:** T-9
- **Acceptance Criteria:** AC-28
- **Priority:** Critical

### Setup
V-1 through V-10 complete; no live owned resources; root recipes.

### Steps
1. Run focused suites.
2. Run paved comparison.
3. Run `just verify`.
4. Audit resources and record duration/exit.

### Expected Result
All checks pass and `just verify` exits zero.

### Expected Evidence
Full output, exit 0, duration, cleanup audit, implementation AC mapping.

## Acceptance Coverage Check

| AC ID | Implementation tasks | Tests or validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1, T-3 | V-1, V-3 | Pinned candidate tuple and records naming only embedded and full-page. |
| AC-2 | T-1, T-4, T-6 | V-1, V-6 | Ordered prerequisite assertions and first-failure record with zero attempts. |
| AC-3 | T-1, T-3 | V-1, V-3, V-8 | Records show identical fixture, launch configuration, Chromium, and viewport. |
| AC-4 | T-3 | V-3, V-8 | Ordered functional assertions and terminal parity references per attempt. |
| AC-5 | T-3, T-6 | V-3, V-7 | Clipboard passes while token is absent from records and fixture. |
| AC-6 | T-1, T-3, T-4, T-6 | V-1, V-7, V-8 | Independent before/after membership and sentinel-byte results. |
| AC-7 | T-2, T-3 | V-2, V-3, V-8 | Raw browser event artifacts and required WebSocket usability assertion. |
| AC-8 | T-2 | V-2, V-8 | Occurrence classifications, blocking precedence, separate counts, repeats. |
| AC-9 | T-2, T-3 | V-2, V-3 | Functional assertion failures remain distinct from retained warnings. |
| AC-10 | T-4 | V-4, V-8 | Distinct handles/groups, contexts, disposables, and prior-state audits. |
| AC-11 | T-1, T-4 | V-1, V-4 | Pre-navigation run IDs, one invocation, retained failed records. |
| AC-12 | T-1, T-2, T-4 | V-1, V-2, V-4, V-8 | Schema-valid attempt JSON with every field and artifact reference. |
| AC-13 | T-4 | V-4, V-7, V-8 | Context, command, group, PID, listener, disposable, fixture cleanup proof. |
| AC-14 | T-4, T-5 | V-4, V-5, V-8 | Eligibility requires three complete passes and rejects evidence/cleanup gaps. |
| AC-15 | T-1, T-5 | V-1, V-5, V-8 | Six ordered slots, facts, measures, eligibility, disposition, references. |
| AC-16 | T-4, T-5 | V-4, V-5, V-8 | Cleanup stops later slots and selector uses completed evidence. |
| AC-17 | T-4, T-5, T-6 | V-4, V-6 | Not-started slots lack run IDs and one exact stop reason is retained. |
| AC-18 | T-1, T-4, T-5, T-8 | V-1, V-6, V-9 | Prerequisite failure yields no viable candidate and no Accepted ADR. |
| AC-19 | T-5 | V-5 | Single-eligible fixtures return zero and exact selected disposition. |
| AC-20 | T-5 | V-5 | Blocking, warning, median precedence and first strict lower selection. |
| AC-21 | T-5, T-8 | V-5, V-9 | All-measures tie selects neither and creates no Accepted ADR. |
| AC-22 | T-5, T-8 | V-5, V-9 | No eligible candidate selects neither and creates no Accepted ADR. |
| AC-23 | T-7, T-8 | V-8, V-9, V-10 | Selection yields one idempotent Accepted ADR/log; nonselection none. |
| AC-24 | T-7 | V-8 | Designated run retains six attempts and comparison with rule-derived exit. |
| AC-25 | T-5, T-6 | V-5 | Finite selector matrix covers every required outcome. |
| AC-26 | T-3, T-4, T-6 | V-4, V-6, V-7 | Finite fault matrix retains inspectable safety records. |
| AC-27 | T-8 | V-10 | Docs, comparison, conditional ADR agree and preserve desktop/tablet boundary. |
| AC-28 | T-9 | V-11 | Root gate output shows just verify exit 0. |

All AC-1 through AC-28 map to implementation, validation, and evidence. V-8 is desktop-Chromium authoritative only. Tablet acceptance and later product integration are excluded.
