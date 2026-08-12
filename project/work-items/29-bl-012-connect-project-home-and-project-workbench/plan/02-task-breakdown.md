# Task Breakdown: BL-012 Connect Project Home and Project Workbench

## Task T-0: Repair the harness verification budget

- **Status:** Complete
- **Complexity:** S
- **Dependencies:** None; Phase 0 prerequisite before product validation
- **Acceptance Criteria:** AC-24, AC-28
- **Related ADRs:** ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260806-rpiv-stage-contract

### Description
Replace `.harness/extensions/checks/extension.ts` fixed `120_000` timeout with one documented configurable/default budget sized for the current `just verify` composition. Keep `harness checks` and `harness boot` delegated to the unchanged root `just verify` recipe. Add an injectable or accelerated extension contract so a fake command representing more than 120 seconds succeeds under the configured budget, and a deterministic over-budget command returns the existing actionable envelope without waiting in real time. Update harness governance, checks briefing, and a harness-change record.

### Acceptance Criteria
- `harness checks` still invokes exactly `just verify` and preserves bounded output/error envelopes.
- The default/configured budget is finite, validated, documented, and greater than 120 seconds.
- A deterministic test proves the wrapper accepts a simulated command beyond 120 seconds and rejects a simulated over-budget command without a wall-clock wait.
- `just verify` remains unchanged as the canonical full gate.

### Test Coverage
- V-0 contract tests for default, configured, invalid, beyond-120-second, timeout, and envelope behavior.
- V-10 confirms `harness checks` and `harness boot` complete when `just verify` completes inside the configured budget.

### Expected Evidence
- Machine-readable contract rows with configured budget, simulated elapsed value, result, and no real long wait.
- Updated harness docs/change record and passing harness contract gate.

## Task T-1: Establish the same-origin navigation-shell route

- **Status:** Complete
- **Complexity:** L
- **Dependencies:** T-0
- **Acceptance Criteria:** AC-1, AC-2, AC-9, AC-10, AC-29
- **Related ADRs:** ADR-260812-browser-navigation-shell, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
Make the browser front door own `/` while forwarding `/projects/` HTTP and WebSocket traffic to Fastify on the same origin. Reuse `parseStableWorkbenchRoute` as the only route grammar. Distinguish an unmarked top-level valid base navigation from a server-marked same-URL upstream document acquisition. Reject malformed and sibling routes before project lookup/start. Preserve marked base acquisition, descendant suffix/query forwarding, and every WebSocket under BL-011.

### Acceptance Criteria
- Normal entry is exactly `/projects/{encodeURIComponent(id)}/workbench/` with one trailing slash and no query/fragment.
- The internal document marker cannot select or alter project ID, suffix, authority, port, or target.
- Every malformed class renders route error with zero lookup/start; no duplicate parser remains.
- Descendant and WebSocket behavior remains byte-, URL-, timeout-, redaction-, and cleanup-compatible with BL-011.

### Test Coverage
- V-1 route/shell contract matrix and V-4 API integration matrix.
- Existing BL-011 HTTP, WebSocket, security, failure, and residual suites remain required.

### Expected Evidence
- Route matrix records raw shape class, parser result, lookup/start counts, shell/acquisition classification, and stable prefix.
- Same-origin request/socket classifications and unchanged BL-011 focused results.

## Task T-2: Connect Home Open to native navigation and history

- **Status:** Complete
- **Complexity:** L
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-1, AC-7, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-29
- **Related ADRs:** ADR-260812-browser-navigation-shell, ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Replace deferred Open with a stable-ID-only full-document navigation owner. Keep Home list/registration/close ownership intact while adding a separate monotonic activation generation, accessible pending status, duplicate suppression, and stale settlement invalidation. Use native document navigation rather than adding a routing package. Keep names and canonical paths inert and non-authoritative. Specify focus behavior for pointer/keyboard Open, Home return, Back, Forward, and refresh.

### Acceptance Criteria
- Pointer and keyboard activation produce the same exact URL and one accepted history entry.
- Exactly eight repeated activations join one generation, perform at most one accepted navigation, and preserve activating focus while pending.
- Refresh, stale completion, Retry settlement, Back, and Forward do not add duplicate history entries.
- Long/metacharacter display fields remain complete inert text and never influence the route.
- Stale generations cannot mutate URL, focus, announcement, error, or document.

### Test Coverage
- V-2 executes the complete finite component/history matrix with fake location/history and controlled deferred generations.
- V-5 and V-7 confirm browser-native history behavior in success and failure workflows.

### Expected Evidence
- Component matrix rows with activation count, accepted navigation count, exact URL, history length, generation, focus target, announcement, and stale-mutation count.
- Dependency inventory proving no router package was introduced.

## Task T-3: Deliver the minimal header and preserve workbench continuity

- **Status:** Complete
- **Complexity:** XL
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-5, AC-6, AC-8, AC-9, AC-15, AC-17, AC-29
- **Related ADRs:** ADR-260812-browser-navigation-shell, ADR-260810-full-page-browser-workbench-presentation, ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-filesystem-path-safety

### Description
Decorate only the acquired top-level code-server HTML with a minimal Ascend header whose Projects action performs full-document navigation to `/`. Keep code-server top-level, preserve its CSP and normal Explorer/Preview/terminal descendants, and reserve no iframe. The header must expose no lifecycle action or runtime identity. Validate continuity using exact BL-010 identity plus one editor filename and one advancing terminal marker, without claiming broader workspace persistence.

### Acceptance Criteria
- The header has one keyboard-operable Projects action with visible focus and no prohibited lifecycle/status/identity content.
- Projects reaches Home without stop/restart/replacement; exact runtime and terminal PIDs remain live while Home is visible.
- Reopen shows the known file name and the same marker process with a measurably advanced counter.
- Explorer, native Markdown Preview, canonical terminal directory, Management, ExtensionHost, and terminal channels remain usable.
- A storage-empty direct entry and one refresh reuse the exact runtime identity.

### Test Coverage
- V-3 document decoration/header contract, CSP, control inventory, focus, and stale-generation tests.
- V-5 main continuity browser workflow and V-6 isolated direct-link/refresh workflow.
- Existing BL-010 and BL-011 gates remain regression requirements.

### Expected Evidence
- Header control/prohibited-value scans and full-page presentation classification.
- Runtime identity tuple, terminal PID/counter before and after Home, visible filename, and capability outcomes.

## Task T-4: Implement accessible route/load errors and generation-safe recovery

- **Status:** Complete
- **Complexity:** XL
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-10, AC-11, AC-12, AC-13, AC-15, AC-17, AC-18, AC-20, AC-29
- **Related ADRs:** ADR-260812-browser-navigation-shell, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging

### Description
Render fixed Ascend loading/error shell states at the unchanged stable URL. Translate only route validation, safe BL-011 transport codes, and the shell-owned finite document-load timeout. Give errors announced headings, one-time focus, Projects, and Retry only where applicable. Retry replaces the failed entry and owns one new acquisition generation; Projects invalidates the generation and starts nothing. Record failed history state so Back/Forward cannot implicitly start a malformed, unknown, or failed generation.

### Acceptance Criteria
- Unknown/closed IDs perform lookup but zero start, do not redirect, and expose Projects.
- Startup, upstream, and document-timeout errors keep the URL and expose one-generation Retry plus Projects.
- Retry creates exactly one newer generation for the same ID without a history entry; Projects creates none.
- Older success/failure cannot replace newer Home or Retry document, focus, announcement, error, or URL.
- Safe public text contains no internal authority, path, raw error, stack, or protected content.

### Test Coverage
- V-1 shell rendering and route validation; V-3 generation/focus component tests.
- V-4 exact API matrix and V-7 four-case controlled Chromium failure episode.

### Expected Evidence
- Error rows with URL, status/code class, lookup/start/generation counts, focus/announcement, recovery action, history delta, and leak scan.

## Task T-5: Build finite component and API acceptance matrices

- **Status:** Complete
- **Complexity:** L
- **Dependencies:** T-2, T-3, T-4
- **Acceptance Criteria:** AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-24
- **Related ADRs:** ADR-260812-browser-navigation-shell
- **Related Core-Components:** CORE-COMPONENT-260806-agent-executable-acceptance-criteria, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Create versioned, execution-backed component and API matrix schemas. The component matrix covers normal Open, eight joins, pending interaction, stale success/failure, Home, Back, Forward, refresh, Retry, inert identity text, announcements, and focus. The API matrix covers valid stopped/running, every malformed class, unknown/closed, startup failure, upstream failure, and document timeout with controlled barriers rather than sleeps.

### Acceptance Criteria
- Every issue-named matrix row executes and records deterministic URL/history/generation/count/focus results.
- Every row declares finite operation, startup, document, recovery, overall, and cleanup bounds before execution.
- Evidence validators reject missing rows, assertion-only placeholders, duplicate IDs, nonfinite bounds, leaks, and nonzero cleanup.

### Test Coverage
- V-2 component matrix and negative schema fixtures.
- V-4 API matrix and negative schema fixtures.

### Expected Evidence
- `test-results/bl-012/...` generated matrices with execution IDs, observed outcomes, bounds, and cleanup.
- Committed implementation record maps all matrix rows to AC IDs without protected payloads.

## Task T-6: Execute main and isolated browser continuity workflows

- **Status:** Complete
- **Complexity:** XL
- **Dependencies:** T-3, T-5
- **Acceptance Criteria:** AC-2, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-21, AC-22, AC-23, AC-24
- **Related ADRs:** ADR-260812-browser-navigation-shell, ADR-260810-full-page-browser-workbench-presentation, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-host-process-environment

### Description
Create one serial designated Chromium proof against the repository BL-001 fixture, with one known editor file, the existing Markdown fixture, and exactly one bounded terminal command writing a 250 ms counter for at most 30 seconds outside tracked content. Execute the exact three-entry order with one refresh and one Back/Forward pair. Then use a fresh storage-empty context against the same backend for one direct navigation and one refresh. Reuse BL-011 traffic classifiers and role inventory.

### Acceptance Criteria
- Main action ledger exactly matches the issue order and 3 Workbench / 1 refresh / 1 Back / 1 Forward counts.
- Runtime identity is unchanged across Home, reopen, refresh, history revisit, and isolated context.
- Terminal PID survives Home, counter advances, known file remains visible, and fixture capabilities pass.
- Isolated context clears storage, cookies, cache, and service workers and does not rely on prior client state.
- Every observed document/request/socket is safely classified and no internal authority is public.

### Test Coverage
- V-5 exact main browser workflow.
- V-6 isolated deep-link/refresh browser workflow.
- V-8 browser traffic/privacy/accessibility evidence validation.

### Expected Evidence
- Ordered history ledger, runtime identity tuples, terminal PID/counters, visible filename, capability results, request/socket role inventories, bound manifest, and zero leak scans.

## Task T-7: Execute the controlled browser failure episode

- **Status:** Complete
- **Complexity:** L
- **Dependencies:** T-4, T-5
- **Acceptance Criteria:** AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-17, AC-18, AC-19, AC-20, AC-24
- **Related ADRs:** ADR-260812-browser-navigation-shell, ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy, CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
Run one finite controlled Chromium episode with exactly one unknown ID, one runtime-start failure, one upstream-proxy failure, and one shell document-load timeout. Use injected application dependencies and barriers, not product fault routes or indefinite waits. Apply exactly one Retry or Projects action per case as applicable, and include a stale completion transition to a newer Home or Retry owner.

### Acceptance Criteria
- Exactly four named cases execute once and make no exhaustive claim.
- Each retains unchanged URL, generation, applicable one-action recovery, focus/announcement, history delta, and lookup/start count.
- Projects starts no generation; Retry starts one; stale settlement changes nothing.
- All cases finish within declared bounds and leave zero case-owned resources.

### Test Coverage
- V-7 controlled browser failure episode.
- V-8 evidence privacy/accessibility validator and V-9 cleanup matrix.

### Expected Evidence
- Four execution records with controlled fault boundary, observed public result, one recovery action, resulting URL/generation, stale result, and zero-resource audit.

## Task T-8: Finalize evidence, cleanup, documentation, and paved validation

- **Status:** Complete
- **Complexity:** XL
- **Dependencies:** T-0 through T-7
- **Acceptance Criteria:** AC-21, AC-23, AC-24, AC-25, AC-26, AC-27, AC-28, AC-29
- **Related ADRs:** ADR-260812-browser-navigation-shell, ADR-260812-in-process-workbench-reverse-proxy, ADR-260810-full-page-browser-workbench-presentation, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260806-rpiv-stage-contract, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260812-stable-workbench-proxy

### Description
Add `verify-home-workbench` and a standalone residual audit to the root justfile, then include the focused gate in `just verify` without replacing existing BL-010/011 gates. Inventory and clean exact contexts/pages, terminal PID/file, proxy sockets, runtime PID/listener, API/web process groups/listeners, SQLite sidecars, and fixture manifest while preserving one unrelated listener. Retain bounded privacy-safe AC evidence. Update README, docs index, web/API READMEs, runtime/stable-routing runbooks, harness governance/change record, and remove all obsolete deferred-Open/BL-012 statements.

### Acceptance Criteria
- Cleanup owns exact identities only, removes the disposable marker output, preserves fixture manifest, and leaves the unrelated listener alive.
- Retained evidence maps AC-1 through AC-29 and excludes source/terminal contents, credentials, secrets, raw authorities, and personal data.
- Focused and full gates pass from a clean tracked tree and do not mutate tracked fixture/source content.
- Independent residual audit passes after validation.
- Diff and control inventories contain none of the excluded scope.

### Test Coverage
- V-8 evidence/privacy/accessibility validators; V-9 cleanup/fault/residual matrix.
- V-10 documentation, focused gate, full gate, clean-tree hash, and scope audit.

### Expected Evidence
- AC-indexed implementation record, generated bounded matrices/episodes, cleanup and residual audit, before/after tracked hashes, command exit records, and documentation matrix.


## Implement correction record — AC-24 and AC-28

- **T-6 remains Complete:** retained setup, API, web, runtime, workbench, terminal, three-entry, history, deep-link, evidence, and cleanup timings identify the exact slow boundary. API and Vite output is only a log hint; readiness repeatedly attributes the reserved listener to the exact launched process tree and requires the expected HTTP project-list or Home status/body before recording the distinct listener-ready timestamp. Runtime and workbench readiness share one acquisition rather than serial duplicate waits.
- **T-8 remains Complete:** the designated proofs reserve distinct ports, build the API once and launch it directly, stop API/web groups concurrently, reserve cleanup inside the 220,000 ms derived overall bound, and retain partial timing plus cleanup evidence on failure. The independent residual audit rejects missing, failed, or over-bound timing steps.
- The correction adds no retry, lifecycle UI, persisted runtime identity, API/data/config migration, or architecture-contract change.
