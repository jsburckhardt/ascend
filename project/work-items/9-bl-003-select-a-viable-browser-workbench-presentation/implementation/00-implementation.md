# Implementation Notes: BL-003 Browser Workbench Presentation Selection

## Completed Tasks

- T-1: Pinned comparison, prerequisite, slot, assertion, record, and disposition contracts.
- T-2: Added ordered browser-event capture, blocking precedence, warning counts, repeat retention, and WebSocket usability.
- T-3: Added exactly two proof adapters and one fixed no-retry scenario with memory-only clipboard handling and BL-002 parity.
- T-4: Added ordered prerequisites, serial fresh-attempt coordination, retained records, partial slots, and cleanup-stop behavior.
- T-5: Added complete-pass eligibility and deterministic blocking, warning, and median selection.
- T-6: Added bounded prerequisite, fault, no-retry, clipboard, integrity, missing-artifact, and cleanup validation.
- T-7: Ran the designated Ubuntu/Chromium comparison and retained six attempt records, browser events, and comparison evidence.
- T-8: Materialized the evidence-backed Accepted ADR idempotently, updated the decision log, and updated affected documentation.
- T-9: Integrated root recipes, retained-evidence validation, focused validation, and the canonical full gate.

## Acceptance Evidence

- AC-1: workbench-presentation-contract.ts exports only embedded and full-page; comparison.json contains only their six ordered slots. Contract and scenario focused tests passed.
- AC-2: comparison.json records all six ordered prerequisite checks as passed before starts; safety tests inject each first failure and prove zero starts.
- AC-3: every attempt sharedInputs records the same BL-001 fixture, code-server 4.131.0, Chromium 151.0.7922.34, and 1440 by 900 viewport.
- AC-4: all six attempt functional maps pass document, Explorer, Markdown, Preview, keyboard, terminal, clipboard, and BL-002 parity assertions in the shared scenario order.
- AC-5: clipboard-round-trip is true in all attempts; the scenario retains only a boolean, and the safety test proves the unique token is absent from results and fixture bytes.
- AC-6: all six records report fixturePresent, treeMembershipEqual, and sentinelBytesEqual true from independent before/after snapshots.
- AC-7: six retained browser-events JSON files contain responses, request/console/page/WebSocket events; every attempt passes workbench-websocket-usable.
- AC-8: browser-event table tests cover every policy family, overlap, precedence, and repeats. The comparison retains embedded totals 9/30 and full-page totals 6/36 for blocking/non-blocking occurrences.
- AC-9: classifier tests keep functional failures separate; each attempt has distinct functional assertion and browser-event evidence fields.
- AC-10: attempt freshness fields show six distinct BL-001 handle run IDs, PIDs/groups, browser context IDs, and disposable areas with priorStateAbsent true.
- AC-11: all six pre-navigation run IDs are unique; scenario and safety tests prove failed actions, transient errors, and timeouts are invoked once without retry.
- AC-12: implementation/evidence/attempts contains six schema-valid started records with final status, errors, timing, assertions, references, counts, cleanup, integrity, and exact Chromium version.
- AC-13: every attempt cleanup field is true for context, commands, process group, PID, listener, disposable, and unchanged fixture.
- AC-14: selector tests reject missing evidence and cleanup gaps. comparison.json marks both candidates eligible only after three complete passes.
- AC-15: comparison.json contains exactly six ordered slots, host/tool/viewport facts, eligibility, retained counts, three elapsed values, medians, disposition, and six references.
- AC-16: coordinator and selector focused tests prove cleanup failure stops later starts and still selects an already eligible candidate.
- AC-17: focused prerequisite/cleanup tests prove remaining slots are not started without run IDs and retain exactly one ordered stop reason.
- AC-18: every prerequisite failure fixture returns no viable candidate semantics with zero starts; conditional ADR tests prove nonselection creates no ADR.
- AC-19: selector matrix passes embedded-only and full-page-only eligible outcomes with zero selected exits.
- AC-20: selector matrix isolates all three tie-breakers. The real result selected full-page at the first strict difference, 6 blocking versus 9.
- AC-21: selector and ADR tests prove equal measures return selection tie, nonzero, with no selected candidate or ADR.
- AC-22: selector and ADR tests prove zero eligible candidates return no viable candidate, nonzero, with no selected candidate or ADR.
- AC-23: ADR-260810-full-page-browser-workbench-presentation.md records desktop authority, candidates, scenario, evidence, measures, selected/rejected options, and tablet boundary. Repeated materialization returned created false; DECISION-LOG.md has one ADR row and decisions 43-45.
- AC-24: just proof-workbench-presentation ran the real designated comparison in 1.3 minutes; all six slots started and passed, cleanup did not stop, and disposition was full-page selected.
- AC-25: workbench-presentation-selector.test.ts covers both single-eligible outcomes, all ordered tie-breakers, dominance, tie, neither, missing artifact, and partial stop.
- AC-26: coordinator, safety, scenario, contract, and ADR focused tests cover every ordered prerequisite failure, no retry, missing evidence, cleanup stop, absent IDs, exact cleanup seams, memory-only clipboard, and separate tree/sentinel integrity.
- AC-27: README.md, docs/README.md, docs/workbench-proof.md, .harness/engineering-harness.md, the Accepted ADR, and decision log state the complete contract and match comparison b1000003-0000-4000-8000-000000000009.
- AC-28: the final just verify run exited zero; formatting, lint, type checks, 81 unit/component tests with coverage, builds, and Playwright completed with 3 passed and the designated-only comparison test skipped by the ordinary gate.

## Documentation Evidence

- README.md and docs/README.md now discover the paved command, selected full-page result, authoritative desktop boundary, and excluded integration scope.
- docs/workbench-proof.md now documents prerequisites, candidates, viewport, fixed scenario, fresh/no-retry rules, event counts, evidence, cleanup/integrity, stop reasons, eligibility, tie-breakers, dispositions, and the retained result.
- .harness/engineering-harness.md now discovers the designated sensor and retained BL-003 evidence.
- ADR-260810-full-page-browser-workbench-presentation.md and DECISION-LOG.md record the architecture decision and actionable consequences.
- No API reference impact: BL-003 adds no HTTP API, route, or product behavior.
- No configuration or migration impact: no application option, default, data shape, or deployment procedure changed; generated proof-path overrides remain internal attempt-local environment wiring.

## Validation Results

- T-1 through T-8 each passed just verify-focused with their mapped suites.
- Final focused run: just verify-focused, 18 files and 81 tests passed.
- Designated run: just proof-workbench-presentation, 1 test passed in 1.3 minutes and retained full-page selected evidence.
- ADR idempotence: just materialize-workbench-presentation returned created false on the repeated invocation.
- Full gate: the first just verify identified formatting edits; after deterministic formatting, the final just verify exited zero. Playwright reported 3 passed and 1 designated-only skip in 38.0 seconds.

Implementation evidence is recorded for Verify review; final acceptance remains owned by Verify.
