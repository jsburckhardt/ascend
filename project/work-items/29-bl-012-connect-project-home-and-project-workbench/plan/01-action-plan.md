# Action Plan: BL-012 Connect Project Home and Project Workbench

## Feature
- **ID:** 29
- **Research Brief:** `project/work-items/29-bl-012-connect-project-home-and-project-workbench/research/00-research.md`

## ADRs Created
- [`ADR-260812-browser-navigation-shell`](../../../architecture/ADR/ADR-260812-browser-navigation-shell.md) — separates the top-level browser navigation shell from marked BL-011 document acquisition and descendant transport.

## Core-Components Created
- None.
- Updated [`CORE-COMPONENT-260812-stable-workbench-proxy`](../../../architecture/core-components/CORE-COMPONENT-260812-stable-workbench-proxy.md) to define the top-level shell exception, accessible error translation, same-URL Retry generation, and unchanged descendant transport.

## Acceptance Criteria

### Core
- **AC-1:** Project Home is served at `/`; activating Open for a registered project navigates to exactly `/projects/{encodeURIComponent(stableId)}/workbench/`, with one trailing slash and no query or fragment for normal entry, and opens the workbench for that same persisted project identity.
- **AC-2:** A stopped project is started once for entry, while a healthy running project is reused; returning from Home, refreshing, revisiting through browser history, and direct navigation do not create a duplicate runtime for the same stable ID.
- **AC-3:** The full-page workbench includes a minimal Ascend header with a keyboard-operable Projects action that navigates to `/`; it exposes no Stop, Restart, Close, runtime-status, PID, listener, internal-port, or other runtime-identity control or value.
- **AC-4:** Projects navigation returns to Project Home without intentionally stopping or replacing the project runtime, and a bounded continuity observation proves that the exact runtime identity and its active terminal process remain alive while Home is displayed.
- **AC-5:** While the exact in-memory runtime identity is reused without restart, reopening the same project restores the one known file left open in the editor, demonstrated by its visible filename, and restores the one terminal marker with its disposable counter measurably advanced; no broader editor-layout, selection, undo, extension, or arbitrary workspace-state persistence is claimed.
- **AC-6:** The connected workbench exposes the selected project Explorer sentinel, opens the repository-defined Markdown fixture in the native workbench preview, and provides an integrated terminal that reports the registered canonical project directory and executes the bounded marker command with visible counter progress.
- **AC-7:** The designated history workflow creates exactly three Workbench history entries separated by Home visits, performs exactly one workbench document refresh, and performs exactly one Back-then-Forward pair that revisits an existing entry without adding a duplicate; the final visible surface and URL match the traversed history entry.
- **AC-8:** A fresh browser context that shares the running backend but clears storage, cookies, cache, and service workers direct-navigates to the stable workbench URL exactly once and refreshes exactly once; both loads retain the same runtime identity, display the Explorer sentinel, report the registered canonical directory in the integrated terminal, and execute the bounded marker command with visible counter progress without relying on prior client storage.
- **AC-9:** After the upstream workbench document begins, descendant asset, fetch, query, and WebSocket URLs under the stable workbench prefix continue under BL-011 semantics and are not interpreted as top-level Project Home or workbench route changes.

### Edge Cases
- **AC-10:** A decode failure, empty ID, encoded slash, encoded backslash, encoded NUL, a sibling path outside workbench descendants such as `/projects/{encodedId}/other/`, or decoded ID longer than 128 characters renders a route error and performs zero project lookup and zero runtime start.
- **AC-11:** An unknown or already-closed stable ID remains unchanged in the address bar and renders an accessible error document inside the Ascend shell with a Projects link; it performs no runtime start and does not redirect.
- **AC-12:** A runtime-start failure, upstream-proxy failure, or workbench document-load timeout leaves the same stable URL visible and renders the Ascend error shell; Retry starts one new generation for that same stable ID, while Projects navigates to `/` without starting another generation.
- **AC-13:** Exactly one controlled browser failure episode covers one unknown ID, one runtime-start failure, one upstream-proxy failure, and one document-load timeout; each case uses exactly one Retry or Projects recovery action as applicable, records the resulting URL and generation, and makes no exhaustive-failure claim.
- **AC-14:** Exactly eight concurrent or repeated activation requests for one stopped stable ID join one start generation and produce at most one Workbench history entry for the accepted navigation; the pending state has an accessible status, repeated activation does not move focus unexpectedly, and keyboard activation has the same URL and history outcome as pointer activation.
- **AC-15:** A late success or failure from an older entry or Retry generation cannot replace the document, URL, focus, error, or announcement owned by a newer Home navigation or workbench generation.
- **AC-16:** Long and metacharacter-bearing project names and canonical-path display values remain complete inert text; they cannot change the encoded stable-ID route, create markup or script, expose internal details, or select another project.
- **AC-17:** Home Open, workbench Projects, Retry, and error-shell Projects controls have accessible names, visible keyboard focus, and logical tab order; route or load errors are announced, focus moves to the new surface or error heading once, and stale generations do not steal focus.
- **AC-18:** Browser history contains no duplicate entry from refresh, joined activations, Retry settlement, or stale completion, and Back or Forward never causes a malformed, unknown, or failed project generation to start implicitly.

### Verification
- **AC-19:** A finite web-component matrix records normal Open, eight joined activations, pending interaction, stale success, stale failure, Home, Back, Forward, refresh, Retry, long/metacharacter display identity, accessible announcements, and focus restoration with deterministic URL, history-length, generation, and focus outcomes.
- **AC-20:** A finite API matrix records valid stopped and running IDs; every listed malformed-route class; one unknown/closed ID; one runtime-start failure; one upstream-proxy failure; and one document-load timeout, including lookup count, start count, generation, public error outcome, and recovery result for each case.
- **AC-21:** The main browser scenario uses exactly one repository-defined project fixture containing one known file and one Markdown fixture, plus exactly one terminal command that writes an increasing timestamp or counter every 250 ms for at most 30 seconds to one disposable output file outside tracked fixture content; evidence records the command PID and counter values before and after a Home visit, and teardown terminates that exact PID and removes that exact output file.
- **AC-22:** The main browser scenario follows this bounded order: start at Home; Open Workbench entry 1; Projects to Home; Open Workbench entry 2; refresh once; Back to Home; Forward to revisit entry 2; Projects to Home; Open Workbench entry 3; no other Workbench history entry, refresh, Back, or Forward action occurs.
- **AC-23:** The designated browser evidence inventories every observed top-level document, descendant request, and WebSocket by bounded safe classification; all Ascend-owned traffic remains on the Ascend origin under the encoded stable prefix, required Management, ExtensionHost, and integrated-terminal channels remain usable, and no browser-visible URL, response, log, or committed evidence contains an internal port or authority.
- **AC-24:** Every browser scenario and matrix declares finite per-operation, startup, document-load, recovery, overall, and cleanup bounds before execution and records the applied bounds and outcome; validation uses no unavailable account, production service, manual judgment, indefinite observation, or destructive action.
- **AC-25:** Teardown evidence inventories the exact browser contexts and pages, terminal command PID and disposable output, proxy sockets, runtime PID and listener, API and web process groups and listeners, database and sidecars, and fixture manifest; all owned resources are absent, tracked fixture content matches its pre-run manifest, and one unrelated listener remains alive at the final checkpoint.
- **AC-26:** Retained evidence maps each criterion to inspectable component, API, browser, history, runtime-identity, traffic, accessibility, fixture-integrity, and cleanup outcomes without retaining source contents, terminal contents, credentials, secrets, raw internal authorities, or personal data.
- **AC-27:** User-facing and operational documentation describes the `/` and stable workbench URLs, Projects and Retry behavior, route and load errors, finite validation bounds, evidence interpretation, and cleanup procedure, and removes obsolete statements that Open performs no navigation or workbench request.
- **AC-28:** The repository-provided focused validation for Project Home/workbench connection and the full repository validation both pass from a clean tracked tree and produce inspectable evidence; a final independent residual audit confirms the cleanup inventory and tracked-fixture manifest.
- **AC-29:** Scope remains limited to connecting one Project Home project to its existing workbench and back; multi-project coordination, lifecycle controls, custom editor, terminal, Explorer or Markdown implementations, public authentication, public networking, TLS, multi-host routing, persisted runtime identity, and runtime-status UI are not added.

## Acceptance Coverage

| AC | Implementation tasks | Tests or validation | Expected evidence |
|---|---|---|---|
| AC-1 | T-1, T-2 | V-1, V-2, V-5 | Exact normal-entry URL, persisted ID, navigation count |
| AC-2 | T-1, T-3, T-6 | V-4, V-5, V-6 | One start generation and one reused runtime identity |
| AC-3 | T-3 | V-3, V-5 | Header control inventory, keyboard result, prohibited-value scan |
| AC-4 | T-3, T-6 | V-5 | Runtime and terminal PID continuity while Home is visible |
| AC-5 | T-3, T-6 | V-5 | Visible known filename and advanced counter on reopened runtime |
| AC-6 | T-3, T-6 | V-5, V-6 | Explorer, Markdown Preview, canonical-directory, and counter outcomes |
| AC-7 | T-2, T-6 | V-2, V-5 | Exact history ledger and final URL/surface |
| AC-8 | T-3, T-6 | V-6 | Storage-empty direct-load/refresh ledger and identity equality |
| AC-9 | T-1, T-3, T-6 | V-1, V-5, V-6, V-8 | Safe descendant/request/socket classifications under stable prefix |
| AC-10 | T-1, T-4 | V-1, V-4, V-7 | Route matrix with zero lookup/start counters |
| AC-11 | T-4 | V-1, V-4, V-7 | Unchanged URL, accessible shell, zero start, Projects recovery |
| AC-12 | T-4, T-7 | V-4, V-7 | Same-URL error rows and one-generation Retry/Projects results |
| AC-13 | T-4, T-7 | V-7 | Four-case, one-action controlled failure episode |
| AC-14 | T-2, T-5 | V-2, V-4 | Eight-activation call, generation, history, status, and focus counts |
| AC-15 | T-2, T-4, T-5 | V-2, V-3, V-7 | Stale success/failure suppressed across URL, document, focus, and live region |
| AC-16 | T-2, T-5 | V-2, V-8 | Exact inert text and stable-ID route evidence with leak scan |
| AC-17 | T-2, T-4, T-5 | V-2, V-3, V-7, V-8 | Accessible names, focus order, announcements, one-time focus ledger |
| AC-18 | T-2, T-4, T-5 | V-2, V-5, V-7 | History-length ledger and zero implicit failed starts |
| AC-19 | T-5 | V-2 | Versioned finite component matrix artifact covering every named row |
| AC-20 | T-5 | V-4 | Versioned finite API matrix with counts, generation, errors, recovery |
| AC-21 | T-6, T-8 | V-5, V-9 | Exact fixture, terminal PID, counter before/after, removal result |
| AC-22 | T-6 | V-5 | Ordered action ledger with exact 3/1/1 counts |
| AC-23 | T-6, T-8 | V-5, V-6, V-8 | Classified documents/requests/sockets and zero-authority scan |
| AC-24 | T-0, T-5, T-6, T-7, T-8 | V-0 through V-10 | Predeclared bound manifest and bounded outcome per execution |
| AC-25 | T-8 | V-9 | Complete owned-resource inventory, clean manifest, surviving control listener |
| AC-26 | T-8 | V-8, V-9, V-10 | AC-indexed retained evidence with protected-content scans |
| AC-27 | T-8 | V-10 | Documentation matrix and obsolete-statement search |
| AC-28 | T-0, T-8 | V-0, V-10 | Focused/full exit-zero records, clean-tree hashes, residual audit |
| AC-29 | T-1, T-2, T-3, T-4, T-8 | V-10 | Diff/control/dependency inventory proving excluded scope absent |

**Coverage proof:** all 29 criteria have at least one implementation task, one test or validation entry, and one expected evidence outcome before these artifacts were written.

## Implementation Tasks
1. **T-0 — Repair the harness verification budget** (`AC-24`, `AC-28`): replace the stale fixed 120-second wrapper with a documented configurable/default budget suitable for current `just verify`; preserve delegation and prove a command can exceed 120 seconds using a deterministic accelerated contract.
2. **T-1 — Establish the same-origin navigation-shell route** (`AC-1`, `AC-2`, `AC-9`, `AC-10`, `AC-29`): add stable HTTP/WebSocket forwarding at the web front door, canonical route parsing, top-level shell distinction, and same-URL marked document acquisition without changing BL-011 descendant semantics.
3. **T-2 — Connect Home Open to native browser navigation and history** (`AC-1`, `AC-7`, `AC-14`–`AC-19`, `AC-29`): use the persisted ID only, own pending/stale activation state, permit one accepted full-document navigation, and preserve keyboard, focus, text, and history outcomes without adding a router dependency.
4. **T-3 — Deliver the minimal full-page header and continuity behavior** (`AC-2`–`AC-6`, `AC-8`, `AC-9`, `AC-15`, `AC-17`, `AC-29`): decorate only the acquired top-level workbench document with Projects, preserve code-server capabilities, and expose no lifecycle or runtime identity UI.
5. **T-4 — Implement accessible route/load errors and generation-safe recovery** (`AC-10`–`AC-13`, `AC-15`, `AC-17`, `AC-18`, `AC-20`, `AC-29`): map safe failures into the unchanged-URL shell, distinguish Retry from Projects, bound document load, and suppress stale generations.
6. **T-5 — Build finite component and API acceptance matrices** (`AC-14`–`AC-20`, `AC-24`): execute every named normal, race, route, failure, history, text, accessibility, and recovery row with deterministic counters and evidence schemas.
7. **T-6 — Execute main and isolated browser continuity workflows** (`AC-2`, `AC-4`–`AC-9`, `AC-21`–`AC-24`): run the exact three-cycle history scenario and separate storage-empty direct-link/refresh scenario against one repository fixture and bounded terminal marker.
8. **T-7 — Execute the controlled browser failure episode** (`AC-10`–`AC-15`, `AC-17`–`AC-20`, `AC-24`): run exactly one unknown, startup, upstream, and document-timeout case with one applicable recovery action and generation/history evidence.
9. **T-8 — Finalize evidence, cleanup, documentation, and paved validation** (`AC-21`, `AC-23`–`AC-29`): retain privacy-safe AC evidence, prove exact cleanup and residual state, update all stale application/harness docs, add focused commands, and run focused plus full clean-tree gates.

## Impact
- **Architecture:** adds one global ADR and updates the stable proxy component/decision log because top-level HTML navigation must be separated from BL-011 exact JSON transport failures.
- **Web:** changes Project Home Open behavior, adds navigation-generation state and shell/header assets, and proxies stable HTTP/WebSocket paths in development; no client router dependency is added.
- **API/proxy:** centralizes the existing duplicated route parser, adds top-level shell/document-acquisition distinction and bounded safe error translation, while retaining BL-010 runtime ownership and BL-011 descendant transport.
- **Persistence/configuration:** no schema, migration, persisted runtime identity, or project-model change; document the configurable harness verification budget and same-origin route topology.
- **Tests/evidence/docs:** adds focused component/API/browser matrices, two continuity workflows, one controlled failure episode, cleanup/residual evidence, and updates root, web, API, routing, runtime, harness, and docs-index surfaces.
- **Excluded:** multi-project coordination, Stop/Restart/Close/status controls, custom IDE features, public networking/authentication/TLS, multi-host routing, and persisted runtime state.
