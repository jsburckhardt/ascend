# Implementation Notes: BL-003 Browser Workbench Presentation Selection

## Completed Tasks

- T-1: Pinned comparison, prerequisite, slot, assertion, record, and disposition contracts.
- T-2: Added ordered browser-event capture, semantic/status-based blocking precedence, retained-adjacency reconciliation for proven Preview placeholder replacement, genuinely blocking abort regressions, warning counts, repeat retention, and WebSocket usability.
- T-3: Added exactly two proof adapters and one fixed no-retry scenario with memory-only clipboard handling and BL-002 parity.
- T-4: Added ordered prerequisites, serial fresh-attempt coordination, retained records, partial slots, and cleanup-stop behavior.
- T-5: Added complete-pass eligibility that requires readable referenced artifacts and deterministic blocking, warning, and median selection.
- T-6: Added bounded prerequisite, fault, no-retry, clipboard, integrity, missing-artifact, and cleanup validation.
- T-7: Ran six fresh designated Ubuntu/Chromium attempts and retained attempt records, browser events, twelve terminal artifacts, and regenerated comparison evidence.
- T-8: Regenerated the evidence-backed Accepted ADR idempotently from the actual selected candidate, updated the decision log, and corrected affected documentation.
- T-9: Integrated root recipes, retained-evidence validation, focused validation, and the canonical full gate.

## Acceptance Evidence

- AC-1: workbench-presentation-contract.ts exports only embedded and full-page; comparison.json contains only their six ordered slots. Contract and scenario focused tests passed.
- AC-2: comparison.json records all six ordered prerequisite checks as passed before starts; safety tests inject each first failure and prove zero starts.
- AC-3: every attempt sharedInputs records the same BL-001 fixture, code-server 4.131.0, Chromium 151.0.7922.34, and 1440 by 900 viewport.
- AC-4: all six attempt functional maps pass document, Explorer, Markdown, Preview, keyboard, terminal, clipboard, and BL-002 parity assertions in the shared scenario order.
- AC-5: clipboard-round-trip is true in all attempts; the scenario retains only a boolean, and the safety test proves the unique token is absent from results and fixture bytes.
- AC-6: all six records report fixturePresent, treeMembershipEqual, and sentinelBytesEqual true from independent before/after snapshots.
- AC-7: six retained browser-events JSON files contain responses, request/console/page/WebSocket events; every attempt passes workbench-websocket-usable.
- AC-8: browser-event tests prove a Preview fake.html net::ERR_ABORTED remains blocking by default and becomes non-blocking only with an immediately following successful same-URL document response plus a passing Preview assertion. Failed responses, failed Preview assertions, non-document responses, and other required resources remain blocking. The regenerated comparison retains embedded totals 3/30 and full-page totals 0/36 for blocking/non-blocking occurrences.
- AC-9: classifier tests keep functional failures separate; each attempt has distinct functional assertion and browser-event evidence fields.
- AC-10: attempt freshness fields show six distinct BL-001 handle run IDs, PIDs/groups, browser context IDs, and disposable areas with priorStateAbsent true.
- AC-11: all six pre-navigation run IDs are unique; scenario and safety tests prove failed actions, transient errors, and timeouts are invoked once without retry.
- AC-12: implementation/evidence/attempts contains six schema-valid started records with final status, errors, timing, assertions, references, counts, cleanup, integrity, and exact Chromium version; all twelve referenced terminal JSON artifacts under test-results/bl-003/raw are materialized and readable.
- AC-13: every attempt cleanup field is true for context, commands, process group, PID, listener, disposable, and unchanged fixture.
- AC-14: contract and selector tests reject non-empty references to absent files as well as empty evidence and cleanup gaps. comparison.json marks both candidates eligible only after three complete passes with readable artifacts.
- AC-15: comparison.json contains exactly six ordered slots, host/tool/viewport facts, eligibility, retained counts, three elapsed values, medians, disposition, and six references.
- AC-16: coordinator and selector focused tests prove cleanup failure stops later starts and still selects an already eligible candidate.
- AC-17: focused prerequisite/cleanup tests prove remaining slots are not started without run IDs and retain exactly one ordered stop reason.
- AC-18: every prerequisite failure fixture returns no viable candidate semantics with zero starts; conditional ADR tests prove nonselection creates no ADR.
- AC-19: selector matrix passes embedded-only and full-page-only eligible outcomes with zero selected exits.
- AC-20: selector matrix isolates all three tie-breakers. The regenerated result selected full-page at the first strict difference, 0 blocking versus 3.
- AC-21: selector and ADR tests prove equal measures return selection tie, nonzero, with no selected candidate or ADR.
- AC-22: selector and ADR tests prove zero eligible candidates return no viable candidate, nonzero, with no selected candidate or ADR.
- AC-23: ADR-260810-full-page-browser-workbench-presentation.md records desktop authority, candidates, scenario, evidence, measures, selected/rejected options, and tablet boundary. Repeated materialization returned created false; DECISION-LOG.md has one ADR row and decisions 43-45.
- AC-24: just proof-workbench-presentation ran the final real designated comparison in 1.4 minutes; all six fresh slots started and passed, all twelve terminal artifacts are readable, cleanup did not stop, and disposition was full-page selected.
- AC-25: workbench-presentation-selector.test.ts covers both single-eligible outcomes, all ordered tie-breakers, dominance, tie, neither, missing artifact, and partial stop.
- AC-26: coordinator, safety, scenario, contract, and ADR focused tests cover every ordered prerequisite failure, no retry, missing evidence, cleanup stop, absent IDs, exact cleanup seams, memory-only clipboard, and separate tree/sentinel integrity.
- AC-27: README.md, docs/README.md, docs/workbench-proof.md, .harness/engineering-harness.md, the regenerated Accepted ADR, and decision log match comparison b1000003-0000-4000-8000-000000000009, including regenerated 3/30 and 0/36 totals, the narrowly evidenced Preview placeholder replacement rule, and retained raw-artifact requirements.
- AC-28: the final just verify run exited zero; formatting, lint, type checks, 89 unit/component tests with coverage, builds, and Playwright completed with 3 passed and the designated-only comparison test skipped by the ordinary gate.

## Documentation Evidence

- README.md and docs/README.md now discover the paved command, selected full-page result, authoritative desktop boundary, and excluded integration scope.
- docs/workbench-proof.md now documents prerequisites, candidates, viewport, fixed scenario, fresh/no-retry rules, event counts, evidence, cleanup/integrity, stop reasons, eligibility, tie-breakers, dispositions, and the retained result.
- .harness/engineering-harness.md now discovers the designated sensor, retained BL-003 comparison, and twelve terminal artifacts.
- ADR-260810-full-page-browser-workbench-presentation.md and DECISION-LOG.md record the architecture decision and actionable consequences.
- No API reference impact: BL-003 adds no HTTP API, route, or product behavior.
- No configuration or migration impact: no application option, default, data shape, or deployment procedure changed; generated proof-path overrides remain internal attempt-local environment wiring.

## Validation Results

- T-1 through T-8 each passed just verify-focused with their mapped suites.
- Corrected focused run: just verify-focused with the eight designated presentation test files, 8 files and 54 tests passed.
- Final designated run: just proof-workbench-presentation, 1 test passed in 1.4 minutes and retained full-page selected evidence with six fresh run IDs and twelve readable terminal artifacts.
- ADR idempotence: just materialize-workbench-presentation returned created false on the repeated invocation.
- Full gate: the initial and first corrective just verify runs exposed repository-formatting drift; after loading the repository formatter configuration, the final just verify exited zero. Unit/component tests reported 88 API plus 1 web pass, and Playwright reported 3 passed with 1 designated-only skip in 41.5 seconds.

Implementation evidence is recorded for Verify review; final acceptance remains owned by Verify.
