# Project session switching (BL-014)

## Delivered behavior and ownership

Ascend keeps one healthy memory-only runtime per active stable project ID. Home navigation and browser-client disconnection do not stop it. code-server owns server-side workbench and terminal sessions; the browser owns local editor restoration and client storage. No persisted runtime field, router, lifecycle API, or Stop/Restart control was added.

The zero-retry desktop Chromium proof creates exactly three disposable Git repositories A, B, and C, starts them once in B, C, A order, then executes keyboard A → Home → B → Home → C → Home → A followed by B and C revisits. The exactly five Projects/Open re-entries are B, C, A, B, C and all reuse the original runtime identities. Every Home row measures its before/after URL, surface and focus, three one-count cards, Open/Close-only controls, and event-window start/reuse/stop/shutdown deltas.

A opens its known file and runs one repository counter every 250 ms for at most 90,000 ms. Its terminal uses one visible updating row so the initial cwd, Git root, branch, exact status, Git sentinel, terminal sentinel, editor file, and Explorer state remain visible. Two host-only samples independently measure PID/start identity, command identity, liveness, and advancing output without A browser interaction. Return records the same identities and a later visible sequence. B/C revisits and the later A/C usability probes visibly remeasure their prior active file and retained terminal output. Every displayed project performs actual absence scans for both peer files, editor and terminal sentinels, cwd, branch, and Git sentinel.

## History and reconnection boundary

Back and Forward have separate measured transition rows and unchanged runtime/lifecycle deltas. A direct link and reload are also separate. A fresh B context enumerates seeded disposable cookies, local storage, session storage, CacheStorage, and service-worker registrations before clearing, records the browser-cache and origin-clear consequences, then enumerates all five classes at zero before direct B navigation. Closing B is client-local. While the same B PID/start identity remains live, A and C execute visible terminal usability checks; reopening B uses the same runtime.

Fresh/reopen visible server-owned terminal restoration and browser-local editor restoration retain the closed observed outcome `unsupported`; this does not claim server state was destroyed. Same-context B/C revisits visibly restore their prior state. All fourteen initial, switching, history, reload, fresh, probe, and reopen workflows measured exactly one Management and one ExtensionHost socket, zero unknown roles, stable-prefix URLs, matching project tokens, reconnection classification, transition/execution joins, and zero internal-authority leaks.

## Commands, bounds, and evidence

Use only root commands:

~~~text
just verify-session-switching-phase0
just verify-session-switching
just proof-session-switching-residual-audit
just verify-project-runtime-isolation-contention
just verify
~~~

Playwright uses one Chromium worker and retries zero. Browser operations remain bounded to 30,000 ms and the scenario to 240,000 ms. Terminal setup waits for the exact visible canonical-path/branch prompt, then one command dispatch emits a visible readiness consequence and blocks on a FIFO handshake before proof output; it does not use a retry or inflated timeout. The BL-013 contention gate uses the same consequence ordering and whitespace-normalizes measured xterm rows so visual wrapping cannot hide a completed marker.

`test-results/bl-014/session-switching/switching-browser.json` is schema-version-2 public evidence. It retains a random execution ID; event, observation, workflow and transition joins; all 24 transition rows and 48 before/after surface observations; measured network manifests; state and negative assertions; counter samples; storage manifests; and cleanup observations. Exactly one ignored regular mode-0600 `restricted-authority.json` retains exact PID/start/port/path and raw observation authority for independent cleanup and must not be published.

The residual command derives project partitions from the artifact rather than a hardcoded A/B/C list. It independently probes every runtime PID/start identity and listener, API/web listeners, web and counter processes, SQLite sidecars, fixture root, and both disposable counter/identity files. All twelve resource classes must have positive measured before observations and zero after observations; fixture manifest digests must match and the unrelated control listener must remain unchanged until separate cleanup.

## Scope and migration

BL-015 performance benchmarking remains deferred. Public lifecycle controls, Close-on-running behavior, auto-sleep, API-restart reconciliation, scheduling, quotas, multi-user, and multi-host operation remain out of scope. This delivery changes no public API payload, SQLite schema, configuration default, deployment topology, or migration requirement. No ADR, core-component, or decision-log change is required because runtime and session ownership do not move. The Plan and harness contracts keep `harness boot` as the governed wrapper, so no duplicate root `just harness-boot` recipe is added.
