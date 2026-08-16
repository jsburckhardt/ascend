# Ascend

[![APS version](https://img.shields.io/badge/APS-v1.2.2-blue?logo=github)](https://github.com/chris-buckley/agnostic-prompt-standard/releases/tag/v1.2.2)

Ascend is a browser-based home for development projects that already exist on the host filesystem. It provides a project dashboard and launches persistent code-server workbenches whose integrated terminals use the host development environment.

The MVP goal is to make switching among projects simple without rebuilding IDE capabilities or losing each project's editor and terminal state.

## Project Status

The repository contains the initial TypeScript monorepo scaffold. Product behavior is specified in [`PRD.md`](PRD.md) and will be delivered incrementally.

## Technology

- React, Vite, Tailwind CSS, and shadcn/ui foundations
- Node.js and Fastify
- SQLite and Drizzle ORM
- code-server processes running directly on the host
- Vitest and Playwright
- pnpm workspaces

## Development

The root `justfile` is the command interface:

```text
just setup
just run
just verify-focused apps/web/src/App.test.tsx
just verify-rpiv-harness
just proof-start
just proof-stop
just proof-workbench-capacity
just proof-workbench-capacity-audit
just verify-project-runtime
just verify-home-workbench
just proof-home-workbench-residual-audit
just proof-project-runtime
just proof-project-runtime-residual-audit
just verify-project-runtime-isolation
just proof-project-runtime-isolation-residual-audit
just verify-session-switching-phase0
just verify-session-switching
just proof-session-switching-residual-audit
just verify-runtime-state
just verify-runtime-stop
just proof-runtime-stop
just proof-runtime-stop-residual-audit
just verify-runtime-restart
just proof-runtime-restart
just proof-runtime-restart-residual-audit
just measure-mvp-performance
just verify-mvp-performance
just proof-mvp-performance-residual-audit
just verify
```

`just run` starts the web application and API together. The web application uses `http://localhost:5173`; the API uses `http://127.0.0.1:3000`.

The devcontainer provides Node.js 22, pnpm, just, and code-server. Its post-create script runs `just setup`, including Playwright's Chromium dependencies, so no manually installed host tools are required for repository development.

RPIV harness integration is APS-governed. The coordinator owns serialized lifecycle calls through the registered VS Code `vscode/runCommand` host tool, which invokes only the `eng-harness-flow` skill with exact lifecycle-hook arguments. Initial and correction seam failures stop before the next stage and return typed `SEAM_FAILURE` details instead of generic verification output. Research, Plan, Implement, and Verify remain least-privilege leaf workers that capture only their own qualifying friction through `harness observe`. `just verify-rpiv-harness` runs the read-only full APS inventory, 26 negative fixtures, executable lifecycle and regression contracts, and the 114-row documentation/profile matrix.

## Host Workbench Proof

On the designated Ubuntu devcontainer, `just proof-start` starts one isolated code-server 4.131.0 against the tracked BL-001 fixture and writes one versioned JSON handle to stdout. Pipe that exact handle to `just proof-stop`; repeated cleanup is safe. The full gate runs the five bounded fake failure cases and two real workbench Chromium scenarios: the forced integrated-terminal timeout cleanup scenario and the passing terminal-parity scenario. See [the workbench proof runbook](docs/workbench-proof.md) for prerequisites, timeouts, diagnostics, evidence, and cleanup boundaries.

## Project Runtime Manager

The API now owns one internal in-memory manager that can start or health-check and reuse a persisted project's code-server. It validates the stable ID and exact canonical path, uses direct non-root loopback launch, coalesces concurrent calls, reports typed bounded failures, and returns graceful or escalated shutdown audits for every exact owned PID/start identity, process group, port, and listener before SQLite closes. Browser workbench traffic reaches this manager through the stable `/projects/{projectId}/workbench/` proxy route, and Project Home Open now navigates to that route by stable ID. Runtime identity and state remain unpersisted. The retained designated episode is the single source for the observed startup timing versus the 15-second target, PID/port reuse, recursive BL-001 manifest, exact shutdown audit, unrelated-control survival, and zero residuals. See [the project runtime runbook](docs/project-runtime.md).

### Public runtime state

Project Home reports each registered project as exactly `Stopped`, `Starting`, `Running`, or `Failed`. `Running` is health-gated: process existence alone is insufficient. A start failure, post-readiness exit, failed completed health observation, false-liveness observation, unconfirmed stop, or failed restart is `Failed`; a safe client-owned notice identifies only the bounded category. While a revision is loading, unavailable, timed out, or inconsistent with the authoritative project list, every card says runtime state is unavailable instead of showing partial data or inventing `Stopped`. Retry and each settled successful Stop or Restart perform exactly one finite refresh. Home adds no polling, event stream, or browser health probe.

`GET /api/projects/runtime` returns `{"runtimes":[{"id":"stable-id","state":"Stopped|Starting|Running|Failed"}]}` in the same `createdAt ASC, id ASC` order as `GET /api/projects`; only a `Failed` row also has one of the 19 bounded `failureCategory` values. List or projection failure returns exactly `500 {"error":{"category":"runtime_state_failed"}}` and never a partial success. The existing `GET /api/projects` payload remains exactly the four persisted fields `id`, `name`, `canonicalPath`, and `createdAt`; registration and close contracts are unchanged.

The manager projection is one synchronous read-only pass. Competing false-liveness, failed-health, and exit settlements share one guarded `running -> failed` transition: the winner retains one category, performs one cleanup audit, and emits one `runtime.health.changed`; losers do not mutate, clean up, or emit. `runtime.health.changed` is the terminal post-readiness event; the non-catalog exit event name is not used.

Run `just verify-runtime-state` for the finite fake-driven BL-016 gate. Its committed evidence is `project/work-items/37-bl-016-report-accurate-runtime-state-and-health/implementation/evidence/runtime-state-matrix.json`. This reporting surface adds no environment variable, configuration default, SQLite/data/schema migration, deployment topology, and no daemon or manual operational procedure; it reuses the existing API and Home origins.

### Stop a workbench

Project Home provides one non-destructive `Stop <project name> workbench` action per card. Stopping releases only the selected manager-owned runtime and keeps the project registration, stable ID, display name, canonical path, created-at value, and filesystem content unchanged. While one stop owns the Home request slot, every Stop action is disabled and the selected card is busy. Confirmed `stopped` and `already-stopped` outcomes are announced, focus returns to the selected Stop action, and exactly one fresh `GET /api/projects/runtime` request supplies the displayed `Stopped` state. A classified rejection uses one of twelve client-owned notices with Retry. An indeterminate transport result remains explicitly unknown and offers an authoritative runtime-state refresh; the browser never substitutes an optimistic state.

`POST /api/projects/{stable-id}/runtime/stop` accepts no operation fields and has a 1,024-byte body limit; an absent body or empty JSON object is accepted. Success is exactly `200 {"id":"stable-id","outcome":"stopped|already-stopped"}`. A persisted project with no manager-owned runtime returns `409 runtime_not_managed`; only a project released by a confirmed stop in the current manager generation returns the idempotent `already-stopped` success. Other bounded categories cover invalid ID/request, missing registration, start in progress, retained failure, unconfirmed stop, manager shutdown, and unexpected failure. The response never includes runtime state, release mode, audit, PID, port, authority, path, or server message.

The manager claims the exact running generation before awaiting termination. Confirmed release requires process identity, owned process group, and listener all absent. It sends a delivered graceful signal, allows the complete graceful window, and only then may send a delivered force signal and allow the complete force window; timing uses a monotonic clock and an independent trusted deadline scheduler. Refused or faulted signals are distinguished, incomplete observations never prove absence, and unconfirmed ownership remains retained for one shutdown-phase re-attempt. Attribution proves membership in the exact owned process group, not arbitrary descendants that escaped that group.

Run `just verify-runtime-stop` for the fixed 31-scenario contract, manager, route, Home, source, mutation, and deterministic evidence gate. Run `just proof-runtime-stop` for the one real code-server selected-stop episode, including registration/fixture retention and its recorded ownership evidence. Run `just proof-runtime-stop-residual-audit` for the independent exact root/member identities, owned process group, and loopback listener residual-absence audit only. It does not audit registration or fixtures; those are checked by the designated episode. Retained deterministic evidence is `project/work-items/39-bl-017-stop-a-workbench-without-closing-its-project/implementation/evidence/runtime-stop-matrix.json`; host identities and timings remain disposable under `test-results/bl-017/`.

### Restart a workbench

Project Home shows `Restart <project name> workbench` for authoritative Running and Failed states. The selected card is busy while its 85-second-bounded request is pending, but peer project controls remain usable. Success replaces the exact manager-owned generation, announces completion, refreshes runtime state exactly once, and restores focus after the control remounts. Classified rejection uses one of twelve client-owned notices with Retry; timeout, abort, malformed response, and other indeterminate outcomes remain explicitly unknown.

`POST /api/projects/{stable-id}/runtime/restart` accepts only an absent or empty body up to 1,024 bytes. Success is exactly `200 {"id":"stable-id","outcome":"restarted"}`. The manager keeps one internal restarting entry across confirmed release and replacement, joins eight same-project callers, uses trusted 66-second or admission-aware 81-second deadlines, and quarantines late materialization by exact PID/start/port identity. Restart emits only its three dedicated lifecycle events and exposes no identity, audit, path, authority, or server text.

Run `just verify-runtime-restart`, `just proof-runtime-restart`, and `just proof-runtime-restart-residual-audit`. Retained deterministic evidence lives under `project/work-items/41-bl-018-restart-a-running-or-failed-workbench/implementation/evidence/`; volatile host identity and timing stay under ignored `test-results/bl-018/`.

## MVP performance measurement

Issue #35 adds one serial no-retry designated measurement command for cold5, warm10, three exact BL-014 continuity runs, and fresh integrated 3/5/10 capacity cohorts. The immutable controller uses one monotonic clock through the Explorer-plus-terminal usable consequence, retains failures and artifacts, applies unchanged 15,000 ms cold and 2,000 ms warm targets, and defaults misses to blocker. Run just measure-mvp-performance only for the designated episode; ordinary just verify runs the finite validator and residual audit without repeating measurement. See docs/mvp-performance.md for prerequisites, formulas, privacy, cleanup, evidence, BL-004 comparability, and observed results.

## Repository Layout

| Path | Purpose |
|---|---|
| `apps/web/` | React project-home application |
| `apps/api/` | Fastify project and workbench lifecycle API |
| `docs/` | Application documentation |
| `project/architecture/` | ADRs and shared core-component contracts |
| `project/work-items/` | RPIV delivery artifacts |

## Documentation

- [`PRD.md`](PRD.md) - MVP requirements and acceptance criteria
- [`docs/`](docs/) - application usage and operational context
- [`CONTRIBUTING.md`](CONTRIBUTING.md) - contribution workflow
- [`AGENTS.md`](AGENTS.md) - agent definitions and pipeline contracts
- [`project/`](project/) - architecture decisions and work-item artifacts

## Terminal Parity Proof

On the designated Ubuntu host, run `just proof-terminal-parity`. The BL-001 Chromium sensor runs the forced integrated-terminal timeout-cleanup scenario and the passing terminal-parity scenario. In the passing scenario, one workbench starts at the canonical fixture, one integrated terminal opens, and direct/integrated host and tool results are compared within a 90,000 ms overall bound. Each command has a 5,000 ms bound.

The exact tool list is `git --version`, `git status --short`, `gh --version`, `tmux -V`, `docker --version`, and `copilot --version`. Only `PATH` is compared; a difference is allowed only when every fixed executable resolves to the same canonical path. See [the workbench proof runbook](docs/workbench-proof.md) for diagnostics, normalization, evidence, and cleanup.

## Browser Workbench Presentation Decision

Run just proof-workbench-presentation on the designated Ubuntu 24.04 devcontainer to execute the BL-003 comparison. It runs exactly three fresh, no-retry 1440 by 900 Chromium attempts for each of two proof-only candidates: embedded code-server and top-level full-page code-server with a minimal Ascend header. The retained comparison selected full-page at the first ordered tie-breaker, with 0 blocking browser protocol violations versus 3 for embedded; both candidates were otherwise eligible. See docs/workbench-proof.md and ADR-260810-full-page-browser-workbench-presentation. This desktop Chromium result is authoritative; tablet validation is separate and non-authoritative. That historical proof did not implement Project Home, routing, or controls; BL-012 connects Home to the selected presentation, BL-017 adds selected Stop, and BL-018 adds selected Restart outside the workbench shell. Tablet integration remains out of scope.


## Workbench Capacity Baseline

`just proof-workbench-capacity` runs the designated-host BL-004 diagnostic over fixed cohorts 1, 3, 5, and 10. It retains raw JSON plus a concise comparison under the Issue #11 implementation evidence directory. The three-member cohort is the only MVP gate; five and ten are findings.

A 1,200,000 ms deadline cooperatively aborts in-flight starts, sampling, probes, and workloads. The command keeps its active guard and does not return until coordination has stopped, every discovered member/workload PID and listener has been cleanup-audited, partial evidence has been retained, and guard release finishes; bounded cleanup can therefore finish after the deadline instant. Failed starts and later inspection/attribution failures retain all identities already discovered. Stop, inspection, listener-attribution, and audit failures remain explicit cleanup details/findings and make completeness or disposition nonzero as applicable.

Repository prerequisite validation accepts the primary checkout and linked worktrees whose Git common directory is the designated `/workspaces/ascend/.git`; unrelated repositories still fail before member starts. Both 5,000 ms windows sample at or after exact target offsets, and workload stdout plus stderr share one 4,096-byte bound. The comparison separately reports host and process-tree retained/absent counts and explicit missing reasons. `just proof-workbench-capacity-audit` performs the short all-identity, evidence, and BL-001 fixture audit that also ends `just verify` without repeating the expensive episode.

The retained run `853037e6-5dab-43cf-bcf8-61f1e8bbdb18` passed: all 19 requested members remained ready, all workloads passed, host counts were 10/0 per cohort, process-tree counts were 10/0, 30/0, 50/0, and 100/0, final cleanup and fixture integrity passed, and the independent three-member gate passed. This is a diagnostic baseline, not runtime scheduling, quota, sleep, multi-host, BL-010, or BL-013 functionality. See [the workbench proof runbook](docs/workbench-proof.md) for exact prerequisites, bounds, cancellation, sampling, evidence, results, and interpretation.


## Open Project on Project Home

`just run` starts the SQLite-backed API and Project Home. Project Home now provides an accessible `Open Project` form whose persistently labeled `Host path` field describes absolute, `~`, and `~/...` notation. Input text is preserved exactly. Blank input and typed server validation focus the associated field, retain its value, and announce a specific error. Successful created or existing results upsert by stable project ID, restore `createdAt ASC, id ASC` order, scroll and focus the exact Open action, and announce the disposition without reloading.

`POST /api/projects` supports only the `application/json` media type with exactly `{"path":"<host path>"}` up to 4,096 encoded bytes. Missing or other media types—including parser-supported `text/plain` and unsupported `application/xml` or `application/octet-stream`—return safe HTTP 400 `invalid_registration_request` with no registration delegation. Created returns 201 and existing returns 200 as `{"disposition":"created|existing","project":{"id":"...","name":"...","canonicalPath":"...","createdAt":0}}`. Safe typed errors use only `{"error":{"category":"...","field":"path"}}`; malformed contracts use 400 `invalid_registration_request`, oversized bodies use 413 `registration_request_too_large`, and unexpected failures use 500 `project_registration_failed`. Configure the opening policy with `ASCEND_PROJECT_HOME` and path-delimiter-separated `ASCEND_PROJECT_ALLOWED_ROOTS`; defaults allow the configured host home.

Registration attempts are bounded to 10 seconds and project lists to 5 seconds. Pending registration has active Cancel and blocks duplicate requests. Positive pre-send unavailability and ordinary cancellation return to editing without card changes. Any ambiguous post-send outcome locks and displays the exact JSON payload and exposes only `Retry same submission` and `Refresh projects`. Retry reuses identical bytes. Authoritative refresh compares stable IDs against the pre-submit snapshot: one new ID is activated, zero unlocks with a no-new-project message, and multiple retain the complete list until explicit reset. One monotonic generation owns every request, cancellation, timeout, refresh, reset, and unmount, so stale completions are inert.

Card Open is a project-ID keyboard action that performs one full-document navigation to `/projects/{encodedStableId}/workbench/`; repeated activation joins that navigation generation. Picker integration, scanning, clone/import, running or failed workbench close, search, user sorting, tags, path mutation, and broader lifecycle controls remain out of scope. The separate BL-017 Stop and BL-018 Restart actions are described above. No migration is required. Use `just verify-open-project`, `just verify-focused <test-path>`, and `just verify`. Executed evidence is generated under `test-results/bl-008/open-project/`. The bounded episode passed. `episode.json` maps the successful keyboard-only Chromium episode to unchanged fixtures and zero owned residuals. `cleanup-matrix.json` maps startup failure, assertion failure, episode timeout, interrupted graceful shutdown, and surviving-descendant scenarios to process-group, listener, database/sidecar, and fixture audits. The interrupted scenario records `gracefulStop: false` followed by successful bounded escalation. The surviving-descendant scenario records detection and `ownerCleanupPassed: false` until its exact PID is removed by test teardown, after which `teardownClean` is true.


## Close a stopped project (BL-009)

Project Home provides one keyboard-focusable Close action per registered card. It opens a modal named Close <project name>? with the exact confirmation copy: Closing removes this project registration from Ascend. The filesystem directory and files will not be deleted. Tab and Shift+Tab stay within available dialog controls. Escape and Cancel before transmission send no DELETE request and restore the activating Close action. Destructive Confirm is required; one attempt owns one request, announces pending state, and removes Cancel after transmission.

DELETE /api/projects/{stable-id} closes only the metadata registration. A successful one-transaction SQLite removal returns HTTP 200 with {id:stable-id, disposition:closed}. Malformed IDs return 400 invalid_project_id, unknown or already absent IDs return 404 project_not_found, and rollback-safe persistence failures return 500 project_close_failed. Failure envelopes contain only their safe category. Fastify request logging redacts `req.url` as `[request-url-redacted]`, so encoded or decoded stable-ID sentinels never enter access or close-event logs. The service receives only the metadata library, invokes no project-filesystem API, and adds no schema, migration, soft-delete, archive, runtime-state, or product cleanup behavior.

Success removes only the matching stable-ID card without reload, announces closure, and focuses the next Close action, then the previous Close action, or the Ascend heading; the final card reveals the existing empty state. Definitive no-mutation failures preserve the card and allow same-ID Retry. Timeout, reset, invalid contract, and every other ambiguous post-transmission result preserve the card, lock the original ID, and require the authoritative GET project list. Presence enables same-ID Retry; absence applies normal success; failed or invalid refresh remains locked with Refresh projects. Stale and unmounted completions are inert.

Run just verify-close-project for the isolated service, API, client, controller, component, non-mutation, documentation, and real desktop Chromium matrices; just verify remains the complete gate. Generated evidence is under test-results/bl-009/close-project and test-results/bl-008/open-project/close-fault-episode.json. The executed manifest matrix records complete before/after membership, bytes, symlink targets, modes, and nanosecond timestamps for Cancel, success, unknown, persistence failure, transport ambiguity, retry, already absent, and the combined eight-DELETE route scenario before test-only fixture cleanup. Browser cleanup owns only recorded process groups, listeners, isolated database sidecars, and disposable fixtures. Text-safety validation executes one-character and 4,096-character bounded project name/path fixtures; this is a test bound, not a new product maximum. The existing registration contract remains the only finite input limit: 4,096 encoded body bytes, with byte 4,097 rejected.

This delivery applies only to registered stopped projects. BL-017 now provides a separate selected-runtime Stop that preserves registration; closing a running or failed workbench, Restart, archive, undo, bulk close, and product deletion remain BL-020 or later scope.


## Stable Project Workbench Route

The API owns `/projects/{projectId}/workbench/` and descendants for streamed HTTP and WebSocket traffic. It resolves persisted metadata, starts or reuses one BL-010 loopback runtime, preserves full-page Explorer, Preview, and terminal behavior, and keeps the internal runtime authority out of public surfaces through streamed textual authority rewriting and tokenized proxy logging. Unencoded textual responses drop upstream `Content-Length` for safe streamed framing, while byte-identical binary or encoded responses preserve it. All Ascend-owned HTTP and every WebSocket remain same-origin under the stable prefix. The only external classification is the built-in Markdown webview at HTTPS hosts matching `^vscode-remote\+(?:[a-z0-9]|-[0-9a-f]{4})+\.vscode-resource\.vscode-cdn\.net$`. The fixed `vscode-remote+` prefix is opaque VS Code syntax, not wildcard permission; credentials, any explicit port, HTTP, WebSockets, extra labels, suffix lookalikes, malformed encoded-authority tokens, path/query authority copies, internal-port URLs, and every other external origin are forbidden. Public evidence retains bounded classes, never the raw host or encoded authority. Redirects, cookies, service-worker scope, hop headers, finite failures, backpressure, cancellation, evidence disclosure, and shutdown follow the [stable-routing runbook](docs/stable-workbench-routing.md).

Use `just verify-workbench-route` for the complete fake matrices and exact three-navigation Chromium workflow. The failure proof executes all 29 catalog rows through real route/proxy boundaries, while enabled marker-bounded access/application logs prove HTTP, WebSocket-frame, and integrated-terminal-frame redaction. The designated proof sets `EXTENSIONS_GALLERY={}`, requires zero Open VSX or marketplace requests, and inventories exactly six no-retry stable-prefix sockets: one Management and one ExtensionHost channel in each workflow. Use `just proof-workbench-route-residual-audit` for the independent cleanup audit. `just verify` includes the complete gate. BL-011 itself added no application configuration, API payload, data migration, or schema migration. BL-012 adds private front-door token configuration as documented below, plus Project Home navigation, the top-level loading/error shell, and the minimal Projects header. Multi-project policy, public authentication, TLS, public networking, and multi-host operation remain out of scope.


## Project Home to Workbench Navigation (BL-012)

Project Home is the exact `/` route. Activating a card's Open action navigates once to `/projects/{encodedStableId}/workbench/`; identity text remains inert, including long or markup-shaped names and paths. An unmarked top-level request receives an accessible loading shell at that unchanged URL, then acquires the full-page code-server document through the same stable route. The acquired page has a minimal Ascend header with a keyboard-operable Projects link and no Stop, Restart, Close, PID, listener, or internal-authority values.

Direct navigation, refresh, Back, and Forward use native browser history. Unknown or malformed IDs remain at the stable URL with fixed announced errors and Projects recovery. Safe startup, proxy, generic load, and 15-second document-load failures additionally offer same-URL Retry; each retry owns one newer generation, replaces failed history state, aborts obsolete acquisition, and ignores stale settlement. Workbench runtime, terminal, editor, Explorer, and Preview state survive Projects navigation because Projects does not stop the runtime.

Development Vite forwards same-origin /projects HTTP and WebSocket traffic to the API. Vite and the API align the private ASCEND_FRONT_DOOR_TOKEN. Unset local development uses ascend-development-front-door-v1; explicit values must contain 16–256 characters on both processes. Partial, malformed, or mismatched trusted x-ascend-front-door-* headers are refused before runtime start. Deployment proxies must set the same token and trusted authority headers, keep them private, and redact them from logs. This is a configuration/operations correction, not a data, schema, or API-payload migration. Run just verify-home-workbench for event-bound matrices and bounded Chromium proofs. The designated scenarios use a 220-second no-retry overall bound derived from documented setup, API, web, runtime, workbench, terminal, entry, history, deep-link, evidence, and cleanup step bounds plus a 15-second margin, API and Vite startup log lines are hints only; readiness requires the exact launched process tree to own the reserved listener and the expected API project-list or Web Home response to succeed within its step bound. Evidence records the nullable log-hint timestamp separately from the listener-and-HTTP-ready timestamp. The gate then runs just proof-home-workbench-residual-audit for independent cleanup evidence.


## Concurrent project runtime isolation (BL-013)

Ascend owns one memory-only runtime entry per active project, keyed only by the persisted stable project ID. Each immutable trusted snapshot carries that project’s PID/start identity, loopback port, canonical path, stable route, start time, and opaque owner token. The proxy accepts only the exact running snapshot object still owned by that manager entry; a forged copy fails before target use. Eight interleaved starts for each of A, B, and C join one project-local launch (24 calls and three launches). The real process boundary records and checks each project’s argv, canonical cwd, non-root user, and explicit environment allowlist, including peer-fixture exclusion. Project-local healthy reuse never crosses projects. Runtime identity, owner tokens, routes, ports, handles, and ephemeral user-data directories remain absent from SQLite and the four-field public project API.

The schema-version-2 fake evidence contains 12 independently executed scenarios: interleaved starts; separately measured malformed and unknown IDs plus a fixture persisted and removed through `DELETE /api/projects/:id` before its closed start and route attempts while A/B/C remain live; five distinct B-only Early exit, crash, readiness, health, and proxy faults; all-caller and one-caller cancellation; explicit replacement; global shutdown; and the separate shutdown race. Its 70 lifecycle/proxy records are checked against an exact scenario-specific order and count, safe project token, state or transport, failure class, and zero-or-bounded elapsed classification; missing, wrong, extra, misattributed, or reordered records fail. The 24 ordered cross-target rows comprise 18 project-route/HTTP-target/WebSocket-target failures before nonmatching contact plus six frame-destination rows. Each frame row opens live source and mismatched-target WebSocket controls, then the production forwarding boundary attempts to select the target project socket for uniquely hashed text and binary source frames. Its project-token check rejects both sends exactly: each source closes abnormally with code 1006 and a send-callback error, both source and mismatched-target receipt counters stay zero, and an independent target-control frame still echoes. The validator rejects the former rightful-source-only substitute.

One cancelled B waiter does not cancel the seven callers sharing B’s running result; cancelling all eight cleans only B. After every B fault, A/C identity, route, listener, and terminal-sentinel checks remain unchanged. Global shutdown records exact graceful, escalated, and cancelled project outcomes, joins repeated shutdown, rejects starts during and after shutdown, and settles late work. Shutdown cancels and awaits tracked completion and process-exit tasks; their own settlement handlers remove them without `clear()`. Immediate and delayed post-return audits measure zero entry, ownership, completion-task, and background-task records with no repopulation. Manager shutdown, task settlement, each project cleanup, and delayed observation retain real monotonic start/end/elapsed measurements and configured bounds; assigned, over-bound, failed, or cleared-without-settlement evidence fails. The unrelated control process and listener are measured alive until their separate cleanup. The repository-only test authority is unavailable to routes and measured per-project/global cleanup is mandatory. BL-013 itself added no public lifecycle action; BL-017 adds selected Stop and BL-018 adds selected Restart.

Run `just verify-project-runtime-isolation` for the fake matrix and no-retry three-Git-fixture Chromium A/B/C episode. The repositories use distinct untracked filenames, and Chromium requires each integrated-terminal Git status to equal its project-specific expected value; public evidence retains three distinct status digests. After repository-only exact B group/identity termination, A/C terminal commands execute again; a fresh B browser context and page record one Management and one ExtensionHost role for the replacement while A/C retain their original role sets. The stable URL contains the encoded stable project ID. Public evidence stores correlated identity/route/event digests and the declared one-way project token, while excluding raw canonical paths, internal ports/authorities, credentials, and secrets. One ignored mode-0600 restricted artifact retains explicitly allowed exact cleanup authority. `just proof-project-runtime-isolation-residual-audit` independently probes initial/replacement process identities, listeners, SQLite files/sidecars, fixtures, and the control, and validates measured browser, proxy, runtime/process-group, socket, terminal, and background-work inventories. Assigned zero rows and unexecuted scans fail. Commands use repository-local fixtures, finite bounds, no hosted service, credential, network dependency, or manual judgment.

This proves immediate isolation while all three projects are active. BL-014 separately proves bounded session switching and runtime reuse, BL-015 measures performance, BL-017 adds selected Stop, and BL-018 adds selected Restart. Scheduling, quotas, and multi-host operation remain deferred; API-restart reconciliation is delivered by BL-019.


## Preserve sessions while switching (BL-014)

The no-retry designated gate starts exactly A/B/C once, records 24 joined transition rows and 48 before/after surface observations for keyboard A → Home → B → Home → C → Home → A, B/C revisits, history, reload, fresh/close/probe/reopen workflows, and proves exactly five reuse-only Open re-entries with zero stop or shutdown deltas. A’s visible 250 ms counter advances through two host-only PID/command samples and returns with the same runtime identity and later visible sequence. Every workbench workflow measures one Management plus one ExtensionHost socket with project attribution and leak scans. Fresh B enumerates seeded client storage before and zero values after clearing; dynamic twelve-class cleanup deletes disposable counter files. The fresh-browser terminal/editor restoration outcome is observed as unsupported while B remains live and reusable. See docs/session-switching.md for ownership, exact commands and bounds, safe/restricted evidence, cleanup, BL-013 contention readiness, BL-015 deferral, and no-migration/no-harness-recipe rationale.

## Recover workbenches after an API restart

A replacement API performs one required reconciliation pass before registering routes. It adopts only an unchanged survivor from this host's configured code-server installation whose exact process group unambiguously owns its loopback listener; otherwise it proves absence or retains the safe `reconcile-unconfirmed` failure. The issue ceiling is 15,000 ms from replacement API process start: 3,000 ms startup headroom, 11,000 ms internal observation, and 1,000 ms response allowance.

Adopted runtimes are corrected on demand only. If one dies later, it can remain reported `Running` until Open, Stop, or Restart observes it; this release adds no background monitor, poller, watcher, durable runtime state, schema field, payload field, feature flag, or environment option. Resolve an unresolved host ambiguity and restart the API. See [docs/api-restart-reconciliation.md](docs/api-restart-reconciliation.md).

Run `just verify-runtime-reconcile`, `just proof-runtime-reconcile`, and `just proof-runtime-reconcile-residual-audit`. BL-020 running/failed Close, BL-021 automatic lifecycle policy, and BL-022 durable or distributed recovery remain separate.
