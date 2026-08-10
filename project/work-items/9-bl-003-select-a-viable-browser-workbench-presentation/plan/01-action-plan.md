# Action Plan: BL-003: Select a viable browser workbench presentation

## Feature
- **ID:** 9
- **Research Brief:** project/work-items/9-bl-003-select-a-viable-browser-workbench-presentation/research/00-research.md

## ADRs Created
- None during Plan. The presentation decision is deferred until T-7 produces selection evidence. T-8 may create one Accepted ADR from the required template only for `embedded selected` or `full-page selected`; `selection tie`, `no viable candidate`, and prerequisite failure create no Accepted ADR.

## Core-Components Created
- None. This bounded proof is not a reusable cross-cutting product contract. Existing runtime, path, host-process, logging, command, development, RPIV, and harness contracts govern delivery.

## Acceptance Criteria
### Core
- **AC-1:** Exactly two candidates are compared: (1) code-server embedded in an Ascend surface and (2) full-page code-server with a minimal Ascend header; no third presentation enters the comparison.
- **AC-2:** Before any attempt starts, prerequisites are checked in this exact order: Ubuntu 24.04, non-root `vscode` user, merged BL-001/BL-002 proof capabilities and canonical fixture, code-server 4.131.0, repository-declared Chromium desktop build, and creation of a 1440 by 900 viewport; the first failed check determines the prerequisite stop reason.
- **AC-3:** Both candidates use the same BL-001 canonical fixture, code-server configuration, Chromium executable/version, and 1440 by 900 viewport for every attempt; presentation is the only candidate-specific variable.
- **AC-4:** Every attempt executes the same fixed scenario once in this order: navigate the candidate and receive a final document HTTP status from 200 through 399; find the BL-001 Explorer sentinel; open the known Markdown fixture; observe its rendered Preview sentinel in the editor webview; use keyboard-only workbench actions to focus Explorer, enter and leave the Preview, and open one integrated terminal; complete the clipboard step; then run the BL-002 identity, canonical-path, and exact fixed tool commands with their existing parity assertions.
- **AC-5:** The clipboard step creates a unique per-attempt token only in memory, types it into unexecuted terminal input, copies it, clears the input, pastes it, and observes the exact token in terminal input; the token is never executed or written to the fixture.
- **AC-6:** Fixture integrity is independently proven for every attempt by exact before/after comparison of the complete BL-001 fixture tree membership and every sentinel byte sequence defined by the merged BL-001 proof.
- **AC-7:** Every attempt captures all document and subresource HTTP responses, request failures, console warnings/errors, page errors, and WebSocket open/error/close events; at least one workbench WebSocket opens before workbench interaction and has no error or unexpected close before the terminal commands complete.
- **AC-8:** Browser events are counted deterministically with blocking precedence: a blocking browser protocol violation is each browser-reported blocked, refused, denied, or policy-enforced failure involving frame navigation, CSP/frame-ancestors/X-Frame-Options, origin/CORS, mixed content, sandbox/permission, cookie/storage access, a required workbench or Preview resource, WebSocket handshake/transport, or a WebSocket close before terminal completion; a non-blocking warning is each console warning/error, HTTP status of 400 or greater, request failure, or WebSocket warning/close that is not blocking and does not prevent a functional assertion. Every occurrence meeting either definition is retained once, blocking occurrences are excluded from the non-blocking count, and repeated occurrences are counted separately.
- **AC-9:** A functional assertion fails when its required observable outcome is absent, including document navigation, Explorer, Preview webview, keyboard focus/action, clipboard, terminal parity, or required WebSocket usability; browser events that do not prevent those outcomes remain retained for ordered comparison.
- **AC-10:** An attempt is fresh and independently started only when it has a new BL-001 process handle and process group, a new browser context with empty per-attempt browser state, a new candidate-disposable area, and no process, context, terminal command, listener, or disposable state retained from a prior attempt.
- **AC-11:** A unique run ID is recorded before candidate navigation; each started attempt runs the fixed scenario at most once, no failed assertion, transient error, or timeout is retried, and every started attempt is retained whether it passes or fails.
- **AC-12:** Each started attempt retains one machine-readable record with artifact references for candidate, slot, run ID, exact Chromium version, start status `started`, final status `passed` or `failed`, all failed assertion identifiers and errors, monotonic navigation-start and scenario-completion milliseconds when reached, every functional/evidence/cleanup/integrity assertion, raw browser-event evidence, both warning counts, exact cleanup results, and fixture-integrity results.
- **AC-13:** Cleanup is attempted after every started attempt and passes only when the browser context is closed, every terminal command started by the attempt is absent, the exact BL-001 process group, PID, and listener are absent, only that attempt disposable area is removed, and the fixture remains present and unchanged.
- **AC-14:** Each candidate is eligible only when all three of its independently started fresh no-retry attempts have final status `passed`, with every functional, required-evidence, cleanup, and integrity assertion passing; a missing required artifact or cleanup failure makes the attempt fail and candidate ineligible.
- **AC-15:** One comparison record contains exactly six ordered slots — embedded 1 through 3, then full-page 1 through 3 — and records Ubuntu version, runtime hostname, user, Chromium name/version, code-server version, viewport, candidate eligibility, total retained counts for both warning categories, all three elapsed navigation-to-scenario-completion values and their middle-value median for each eligible candidate, final disposition, and references to every started attempt.

### Edge Cases
- **AC-16:** Cleanup failure stops execution before any later slot starts; selection is still evaluated from completed eligibility evidence, so one already-eligible candidate is selected, while zero eligible candidates produce `no viable candidate`.
- **AC-17:** If execution stops before all six attempts start, every remaining slot is `not started` and has no run ID; the comparison records exactly one stop reason as either `prerequisite failure:<first-failed-prerequisite>` or `cleanup failure:<candidate>/<attempt>`, and never fabricates a run ID.
- **AC-18:** A prerequisite failure starts no attempt, makes both candidates ineligible, returns nonzero with exact disposition `no viable candidate`, and creates no Accepted ADR.
- **AC-19:** If exactly one candidate is eligible, it is selected, the comparison exits zero, and the exact disposition is `embedded selected` or `full-page selected`.
- **AC-20:** If both candidates are eligible, selection applies these tie-breakers in exact order: (1) fewer total retained blocking browser protocol violation occurrences across its three attempts, (2) fewer total retained non-blocking console/request/WebSocket warning occurrences across its three attempts, and (3) lower middle-value median of the three integer monotonic elapsed times from navigation start to fixed-scenario completion; the first strictly lower value selects the candidate.
- **AC-21:** If both eligible candidates tie on all three ordered measures, the comparison returns nonzero with exact disposition `selection tie`, selects neither, and creates no Accepted ADR.
- **AC-22:** If neither candidate is eligible, the comparison returns nonzero with exact disposition `no viable candidate`, selects neither, and creates no Accepted ADR.
- **AC-23:** At completion, exactly one Accepted ADR for BL-003 exists only when a candidate was selected; it records desktop-Chromium authority, both candidates, the fixed scenario, comparison-evidence references, eligibility and ordered tie-breaker results, the selected candidate, the rejected alternative, and tablet validation as a separate non-authoritative follow-up, and repeating selection from the same comparison record creates no duplicate Accepted ADR.

### Verification
- **AC-24:** The designated-host comparison starts all six attempts when prerequisites and cleanup pass, retains the six attempt records plus comparison record, and exits with the disposition dictated by the eligibility and selection rules.
- **AC-25:** Bounded repository validation proves the exact selector outcomes for embedded-only eligible, full-page-only eligible, each of the three ordered tie-breakers, `selection tie`, and `no viable candidate`.
- **AC-26:** Bounded repository validation proves missing-artifact ineligibility, cleanup-failure stop and missing slots, each ordered prerequisite failure, no-retry behavior, absent fabricated run IDs, exact cleanup, clipboard-memory-only behavior, and separate fixture tree/sentinel-byte integrity; each case has a finite exit result and inspectable record.
- **AC-27:** Documentation states the ordered prerequisites, exact two candidates, 1440 by 900 viewport, fixed scenario, fresh/no-retry attempt and eligibility rules, event-count rules, required attempt/comparison evidence, cleanup and integrity rules, stop reasons, tie-breaker order, four exact final dispositions, authoritative desktop Chromium result, and separate non-authoritative tablet follow-up, and its reported result matches the comparison record and any Accepted ADR.
- **AC-28:** `just verify` exits zero.

## Acceptance Coverage
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

Coverage proof: all 28 issue criteria occur exactly once in the stable catalog, and every row names implementation, validation, and expected evidence.

## Implementation Tasks
1. **T-1 — Pin comparison and evidence contracts** (AC-1, AC-2, AC-3, AC-6, AC-8, AC-9, AC-11, AC-12, AC-14, AC-15, AC-17, AC-18)
2. **T-2 — Capture and classify browser protocol evidence** (AC-7, AC-8, AC-9, AC-12)
3. **T-3 — Implement both proof-only presentations and the fixed scenario** (AC-1, AC-3, AC-4, AC-5, AC-6, AC-7, AC-9, AC-12, AC-26)
4. **T-4 — Coordinate fresh attempts, records, and exact cleanup** (AC-2, AC-6, AC-10, AC-11, AC-12, AC-13, AC-14, AC-16, AC-17, AC-18, AC-26)
5. **T-5 — Implement eligibility and deterministic selection** (AC-14 through AC-22, AC-25)
6. **T-6 — Add bounded fault and safety validation** (AC-2, AC-5, AC-6, AC-10 through AC-13, AC-16 through AC-18, AC-25, AC-26)
7. **T-7 — Run and retain the designated-host comparison** (AC-23, AC-24)
8. **T-8 — Materialize only an evidence-backed ADR and update documentation** (AC-18, AC-21, AC-22, AC-23, AC-27)
9. **T-9 — Integrate the canonical gate and retain handoff evidence** (AC-28; final coverage check for AC-1 through AC-27)

## Approach and Scope Boundaries
- Extend merged BL-001/BL-002 proof modules, exact cleanup, fixture snapshots, terminal executor, and Playwright sensor rather than building parallel infrastructure.
- Keep exactly two proof-only adapters. Embedded supplies a minimal test-owned Ascend shell around code-server; full-page keeps code-server top-level and supplies only the minimal proof header. Do not add Project Home behavior, stable routing/proxying, runtime management, lifecycle UI, polished UI, or tablet acceptance.
- Presentation is the only adapter variable. Both use the same fresh BL-001 launch/configuration, fixture, Chromium/version, 1440 by 900 context, scenario, observers, terminal parity, bounds, and cleanup.
- No-retry means no repeated scenario action or attempt. Passive bounded observation may refresh the known detached Preview frame, but never repeats navigation, keyboard/clipboard actions, terminal execution, failed assertions, or an attempt. Disable Playwright retries and retain first-attempt artifacts.
- Retain evidence below BL-003 while removing only per-attempt disposable state. Keep clipboard tokens in memory and record only pass/fail. Keep terminal output in ignored proof artifacts and out of logs.
- Run the pure selector even after cleanup stop. Create architecture only after a frozen selected comparison, idempotently by comparison identity.
