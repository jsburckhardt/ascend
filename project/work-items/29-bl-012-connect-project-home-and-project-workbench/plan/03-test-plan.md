# Test Plan: BL-012 Connect Project Home and Project Workbench

## Test V-0: Harness verification-budget contract

- **Type:** Unit/contract
- **Task:** T-0
- **Acceptance Criteria:** AC-24, AC-28
- **Priority:** Phase 0 / Critical

### Setup
Load the checks extension through an injectable fake `ctx.exec`, fake clock/deadline adapter, and temporary configuration. Do not run a real 120-second sleep.

### Steps
1. Assert the documented default is finite, valid, and suitable for current `just verify`.
2. Run a fake `just verify` result with simulated elapsed time greater than 120 seconds but inside the budget.
3. Run an over-budget fake result and invalid configuration rows.
4. Assert exactly `just verify` is delegated and success/error tail envelopes remain bounded and actionable.
5. Run harness contract validation; later run real `harness checks`/`harness boot` through V-10.

### Expected Result
The beyond-120-second row succeeds, the over-budget row fails deterministically without wall-clock waiting, invalid budgets are rejected, and the root recipe remains unchanged.

### Expected Evidence
Configured budget, simulated elapsed values, invocation argv/count, envelope fields, near-zero test duration, and passing harness contract output.

## Test V-1: Stable route and navigation-shell contract matrix

- **Type:** Unit/API integration
- **Task:** T-1, T-4
- **Acceptance Criteria:** AC-1, AC-9, AC-10, AC-11, AC-12
- **Priority:** Critical

### Setup
Construct Fastify with spy project library/runtime/proxy boundaries and the real shared parser. Supply marked and unmarked requests, controlled response types, and finite injected bounds.

### Steps
1. Execute valid base shell navigation and same-URL marked document acquisition.
2. Execute valid descendants and query preservation without shell classification.
3. Execute decode failure, empty ID, encoded slash/backslash/NUL, sibling path, and 129-character ID.
4. Execute unknown and representative safe acquisition failures.
5. Assert Vite stable-route HTTP/WebSocket forwarding configuration and one browser origin.
6. Assert the marker cannot alter target selection and the duplicate parser is removed.

### Expected Result
Valid top-level entry receives the shell then marked acquisition; descendants retain BL-011; malformed rows have zero lookup/start; unknown/failure rows remain at the stable URL and expose only safe shell outcomes.

### Expected Evidence
Versioned rows with raw-shape class, parser result, shell/acquisition/descendant class, lookup/start/proxy counts, URL, status/code, and cleanup.

## Test V-2: Project Home navigation, history, and accessibility matrix

- **Type:** Unit/component
- **Task:** T-2, T-5
- **Acceptance Criteria:** AC-1, AC-7, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19
- **Priority:** Critical

### Setup
Render Project Home with fake project transport, fake full-document navigator/history ledger, deferred generation barriers, fake focus/scroll support, and long/metacharacter project fixtures.

### Steps
1. Execute normal pointer and keyboard Open and compare exact URL/history outcomes.
2. Release exactly eight repeated activations against one stopped ID and inspect pending status/focus.
3. Execute Home, Back, Forward, refresh, and Retry ledger operations.
4. Settle stale success and stale failure after newer Home and Retry owners.
5. Render long/metacharacter names and paths and inspect DOM/control inventory.
6. Assert accessible names, live announcements, logical tab order, visible-focus classes, and one-time focus targets.

### Expected Result
Every named component row has deterministic URL, one accepted history entry where applicable, one generation, stable focus, inert text, and zero stale mutation or implicit failed start.

### Expected Evidence
Finite component matrix with execution IDs, action type, navigation count, URL, history length, generation, status text, focus target/version, announcement, and inert-text/leak outcomes.

## Test V-3: Workbench shell, header, focus, and stale-generation contract

- **Type:** Unit/component/document integration
- **Task:** T-3, T-4
- **Acceptance Criteria:** AC-3, AC-12, AC-15, AC-17
- **Priority:** Critical

### Setup
Use representative code-server HTML/CSP headers, shell bootstrap dependencies, controlled marked acquisition responses, fake timers, and a DOM environment capable of document replacement and focus checks.

### Steps
1. Decorate only a top-level successful HTML acquisition and assert full-page, not iframe, presentation.
2. Verify Projects keyboard operation, visible focus, `/` destination, and prohibited control/value inventory.
3. Render each fixed error class and the shell-owned document timeout.
4. Activate Retry and Projects and inspect generation/history/start counts.
5. Settle old acquisition success/failure after a newer owner and inspect DOM, URL, focus, error, and live region.
6. Validate CSP-compatible assets and no decoration of descendants/binary responses.

### Expected Result
One minimal header appears only on the top-level workbench; errors are accessible at the unchanged URL; Retry replaces the generation without history duplication; stale settlements are inert.

### Expected Evidence
Decoration/CSP matrix, control inventory, focus/announcement ledger, timeout bound/outcome, history delta, and stale-mutation count.

## Test V-4: Executable API route, runtime, and recovery matrix

- **Type:** API/integration
- **Task:** T-1, T-4, T-5
- **Acceptance Criteria:** AC-2, AC-10, AC-11, AC-12, AC-14, AC-20
- **Priority:** Critical

### Setup
Start real Fastify route handling against controlled project library, BL-010 manager/fake process, BL-011 proxy/fake upstream, barriers, and short injected bounds. Record lookup, start, launch, generation, and cleanup counters.

### Steps
1. Execute valid stopped then running ID and compare launch/reuse identity.
2. Release exactly eight activation/acquisition requests for one stopped ID.
3. Execute every malformed class and unknown/closed ID.
4. Execute one runtime-start failure, upstream-proxy failure, and document-load timeout.
5. Execute one explicit Retry and one Projects recovery as applicable.
6. Validate exact safe public outcomes, generation counters, and zero resources after each row.

### Expected Result
Stopped starts once, running reuses, eight join one generation, malformed rows perform no lookup/start, unknown performs no start, failures recover only explicitly, and every row has finite cleanup.

### Expected Evidence
API matrix containing execution ID, input class, lookup/start/launch counts, runtime identity class, generation, public error, recovery, bounds, and post-row audit.

## Test V-5: Main three-cycle browser continuity and history workflow

- **Type:** Designated Playwright browser
- **Task:** T-3, T-6
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-9, AC-18, AC-21, AC-22, AC-23, AC-24
- **Priority:** Critical

### Setup
Use desktop Chromium, one isolated API/web pair, one SQLite database, one repository-defined BL-001 project fixture with known file and Markdown fixture, one unrelated control listener, and exactly one terminal command that writes a counter every 250 ms for no more than 30 seconds to one disposable untracked file. Predeclare operation/startup/document/recovery/overall/cleanup bounds.

### Steps
1. Start at Home and Open Workbench entry 1; verify header, Explorer, known file, native Markdown Preview, canonical terminal directory, and start the one marker command.
2. Record runtime identity, command PID, and counter; activate Projects to Home and prove both identities remain live.
3. Open entry 2, verify filename and advanced counter, and refresh exactly once.
4. Back exactly once to Home and Forward exactly once to revisit entry 2.
5. Activate Projects, then Open entry 3; perform no other Workbench entry, refresh, Back, or Forward action.
6. Record final URL/surface, request/socket inventory, counter, fixture manifest, and cleanup inputs.

### Expected Result
The ledger is exactly Home/W1/Home/W2/refresh/Back Home/Forward W2/Home/W3; there are three Workbench entries, one refresh, one Back/Forward pair, one reused runtime, one live marker process, restored filename, advanced counter, and usable workbench capabilities.

### Expected Evidence
Ordered action/history ledger; exact runtime and terminal identities; before/after counters; visible filename; Explorer/Preview/canonical-directory results; safe document/request/socket roles; applied bounds; no-authority scans.

## Test V-6: Storage-empty deep link and refresh continuity

- **Type:** Designated Playwright browser
- **Task:** T-3, T-6
- **Acceptance Criteria:** AC-2, AC-6, AC-8, AC-9, AC-23, AC-24
- **Priority:** High

### Setup
Keep the V-5 backend/runtime alive. Create a new Chromium context with empty storage state, cleared cookies/cache, no service workers, and no prior page. Reuse the same stable URL and finite bounds.

### Steps
1. Direct-navigate exactly once to the stable workbench URL.
2. Verify runtime identity, Explorer sentinel, canonical terminal directory, and bounded marker progress.
3. Refresh exactly once and repeat the same observations.
4. Inventory top-level, descendant, and WebSocket traffic and close the context.

### Expected Result
Both loads use the same runtime identity and stable prefix without prior client storage, expose the required capabilities, and add no duplicate runtime.

### Expected Evidence
Storage/service-worker precondition record, navigation/refresh counts, two identity tuples, capability outcomes, counter values, traffic classes, bounds, and context cleanup.

## Test V-7: Controlled four-case browser failure episode

- **Type:** Playwright browser/integration
- **Task:** T-4, T-7
- **Acceptance Criteria:** AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-17, AC-18, AC-19, AC-20, AC-24
- **Priority:** Critical

### Setup
Start isolated web/API processes with dependency-injected one-shot barriers for unknown ID, runtime start failure, upstream proxy failure, and shell document timeout. Use one fresh bounded context and no product fault route.

### Steps
1. Execute each of the four cases exactly once.
2. Inspect unchanged URL, safe shell, announcement, heading focus, control order, lookup/start/generation/history counts.
3. Use exactly one applicable Retry or Projects action for each case and record result.
4. During one case, settle an older success and older failure after a newer Home/Retry owner.
5. Confirm Back/Forward does not implicitly start a retained failed entry.
6. Close each case and audit exact resources.

### Expected Result
Four and only four controlled cases complete; each uses one recovery action, retains the stable URL and safe UI, obeys generation/history rules, suppresses stale completion, and leaves zero resources.

### Expected Evidence
Four-row episode with fault boundary, URL, generation, recovery action/result, start count, history delta, focus/announcement, stale outcome, bounds, and cleanup.

## Test V-8: Traffic, privacy, identity, and accessibility evidence validation

- **Type:** Evidence/security/accessibility contract
- **Task:** T-3, T-6, T-7, T-8
- **Acceptance Criteria:** AC-3, AC-9, AC-16, AC-17, AC-23, AC-24, AC-26
- **Priority:** Critical

### Setup
Consume unfiltered in-memory observations from V-2 through V-7 plus safe classifiers/scanners already established by BL-011. Seed protected sentinels only through controlled channels and retain no payload contents.

### Steps
1. Classify every top-level document, descendant request, query shape, and WebSocket.
2. Verify required Management, ExtensionHost, and integrated-terminal channels.
3. Scan browser URLs, responses, logs, generated evidence, and committed artifacts for raw/encoded internal authorities and protected sentinels.
4. Validate exact stable-ID routing against long/metacharacter display values.
5. Validate accessible names, tab order, visible focus, announcements, one-time focus, and stale-focus suppression.
6. Reject missing/unbounded/raw evidence fixtures.

### Expected Result
All Ascend-owned workbench traffic stays same-origin under the encoded prefix, required channels work, display identity is inert, accessibility outcomes pass, and public/committed evidence contains no protected data.

### Expected Evidence
Bounded safe traffic inventories, role counts, identity/text matrix, accessibility ledger, scan counts of zero, and negative evidence-validator results.

## Test V-9: Exact cleanup and independent residual audit

- **Type:** Cleanup/failure-path/system
- **Task:** T-6, T-7, T-8
- **Acceptance Criteria:** AC-21, AC-24, AC-25, AC-26, AC-28
- **Priority:** Critical

### Setup
Track exact context/page IDs, terminal PID/output path, proxy resources, runtime PID/start identity/listener, API/web process groups/listeners, isolated database/sidecars, fixture manifest, and unrelated control listener. Include success, assertion failure, startup failure, timeout, and interrupted cleanup paths with finite bounds.

### Steps
1. Terminate the exact terminal command PID and remove only its output file.
2. Close contexts/pages and proxy operations before runtime and persistence shutdown.
3. Stop exact API/web process groups with bounded escalation and remove only owned database/fixture allocations.
4. Compare tracked fixture manifest with pre-run state.
5. Confirm all owned identities absent and the unrelated listener alive.
6. Run a separate residual-audit command after focused and full validation.

### Expected Result
Every owned resource is absent, tracked fixture content is unchanged, the disposable marker is absent, the unrelated listener survives, and residual audit passes independently.

### Expected Evidence
Complete cleanup inventory with before/after identities/counts, stop outcomes, fixture digest/manifest equality, control-listener survival, bounds, and residual status.

## Test V-10: Documentation, focused gate, full gate, and scope audit

- **Type:** Documentation/validation/audit
- **Task:** T-0, T-8
- **Acceptance Criteria:** AC-24, AC-26, AC-27, AC-28, AC-29
- **Priority:** Release gate

### Setup
Use a clean tracked tree after implementation. Capture tracked-file and fixture hashes. Make the root `verify-home-workbench`, residual audit, `just verify`, `harness checks`, and `harness boot` available with documented finite budgets.

### Steps
1. Run documentation contract tests and search for obsolete deferred Open/BL-012 statements.
2. Run `just verify-home-workbench` and the standalone BL-012 residual audit.
3. Run unchanged canonical `just verify` and then the harness wrappers under the configured budget.
4. Compare tracked tree/fixture hashes and inspect generated AC-indexed evidence.
5. Audit dependencies, routes, controls, schema, and diff for every excluded feature.

### Expected Result
Documentation is complete and current; focused/full/harness validation exits zero; tracked content is unchanged; residual evidence is inspectable and privacy-safe; excluded scope and migrations are absent.

### Expected Evidence
Documentation matrix, obsolete-search result, command exit/duration records, before/after hashes, AC-1 through AC-29 evidence index, residual audit, dependency/control/schema/diff scope report.


## Implement correction validation — AC-24 and AC-28

V-5, V-6, V-9, and V-10 use one shared 220,000 ms no-retry overall bound, equal to the sum of the declared setup (5,000), API (15,000), web (10,000), runtime (30,000), workbench (30,000), terminal (15,000), three-entry (25,000), history (25,000), deep-link (35,000), evidence (5,000), and cleanup (10,000) bounds plus a 15,000 ms margin. Each execution retains step start, end, duration, applied bound, and outcome. A step or overall excess fails, cleanup still runs against exact identities, and the residual audit rejects incomplete timing or cleanup evidence. V-10 requires three consecutive standalone just verify-home-workbench executions with Playwright retries fixed at zero before the canonical just verify and harness boot runs. Each standalone execution is followed immediately by the residual audit. Readiness evidence records log-hint and exact owned-listener/HTTP-ready timestamps separately, and regression fakes cover delayed listening after Local output, never-listening timeout, early exit, cancellation, and exact cleanup.
