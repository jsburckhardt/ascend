# Project session switching (BL-014)

## Delivered behavior and ownership

Ascend keeps one healthy memory-only runtime per active stable project ID. Home navigation and browser-client disconnection do not stop it. code-server owns server-side workbench and terminal sessions; the browser owns local editor restoration and client storage. BL-014 added no persisted runtime field or lifecycle action; BL-017 adds explicit selected Stop and BL-018 adds explicit selected Restart on Project Home while automatic stopping remains absent.

The zero-retry desktop Chromium proof creates exactly three disposable Git repositories A, B, and C, starts them once in B, C, A order, then executes keyboard A → Home → B → Home → C → Home → A followed by B and C revisits. The exactly five Projects/Open re-entries are B, C, A, B, C and all reuse the original runtime identities. Every historical BL-014 Home row measures its before/after URL, surface and focus, three one-count cards, the then-current Open/Close controls, and event-window start/reuse/stop/shutdown deltas. BL-017 adds Stop without changing those retained runtime-continuity observations.

A opens its known file and runs one repository counter every 250 ms for at most 90,000 ms. Its terminal uses one visible updating row so the initial cwd, Git root, branch, exact status, Git sentinel, terminal sentinel, editor file, and Explorer state remain visible. Two host-only samples independently measure PID/start identity, command identity, liveness, and advancing output without A browser interaction. Return records the same identities and a later visible sequence. B/C revisits and the later A/C usability probes visibly remeasure their prior active file and retained terminal output. Every displayed project performs actual absence scans for both peer files, editor and terminal sentinels, cwd, branch, and Git sentinel.

## History and reconnection boundary

Back and Forward have separate measured transition rows and unchanged runtime/lifecycle deltas. A direct link and reload are also separate. A fresh B context enumerates seeded disposable cookies, local storage, session storage, CacheStorage, and service-worker registrations before clearing, records the browser-cache and origin-clear consequences, then enumerates all five classes at zero before direct B navigation. Closing B is client-local. While the same B PID/start identity remains live, A and C execute visible terminal usability checks; reopening B uses the same runtime.

Fresh/reopen visible server-owned terminal restoration and browser-local editor restoration retain the closed observed outcome `unsupported`; this does not claim server state was destroyed. Same-context B/C revisits visibly restore their prior state. All fourteen initial, switching, history, reload, fresh, probe, and reopen workflows measured exactly one Management and one ExtensionHost socket, zero unknown roles, stable-prefix URLs, matching project tokens, reconnection classification, transition/execution joins, and zero internal-authority leaks.

## Stop and later session acquisition

Project Home Stop is explicit and selected; navigating Home, using Back/Forward, reloading, closing a browser client, or clearing browser storage still does not invoke it. One Stop claims only the selected runtime generation. The project remains registered with the same stable route, metadata, and files, while peer runtimes and unrelated controls remain live. A confirmed result increments one Home settlement version and triggers exactly one fresh runtime-state projection. The card renders `Stopped` only from that projection, never from the action response.

A repeat Stop in the same manager after confirmed release returns `already-stopped`. After an API restart, required reconciliation adopts a proven survivor, marks a positively absent project released, or retains `reconcile-unconfirmed`; pending and unresolved Stop requests use their distinct 409 categories. Opening the still-registered project after confirmed Stop starts a replacement generation. A late or abandoned prior termination cannot mutate that replacement, and an in-flight proxy acquisition rechecks ownership instead of returning the claimed snapshot.

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

`test-results/bl-014/session-switching/switching-browser.json` is schema-version-3 public evidence. Each A/B/C `project.identityObservationId` resolves exactly once in both public and restricted identity-observation collections, under the root execution and matching project token. That join records the measured runtime PID/start/port/stable route and distinct fixture, Explorer, editor, terminal, and Git observation IDs and digests.

Every one of the 24 transition IDs resolves exactly one before surface, after surface, focus observation, and lifecycle-delta observation with the same transition execution, project token, and root execution. Each of the fourteen workflow IDs resolves its transition plus one or more HTTP observations and exactly one Management and one ExtensionHost observation. Every network row repeats the matching workflow, transition ID/execution, root execution, project token, and allowed stable-prefix URL. Missing, duplicate, orphan, cross-token, wrong-execution, wrong-role, and wrong-URL joins fail.

Exactly one ignored regular mode-0600 `test-results/bl-014/session-switching/restricted-authority.json` retains raw authority. Its artifact manifest declares the actual `counterOutput` path `test-results/bl-014/session-switching/a-counter.log` and `counterIdentity` path `test-results/bl-014/session-switching/a-counter-identity.json`, with content/path hashes, counter PID/start owner identity, command digest, root execution, declaration observation, and pre-cleanup probe metadata. It must not be published.

The residual command derives project partitions from the artifact rather than a hardcoded A/B/C list. It independently probes every runtime PID/start identity and listener, API/web listeners, web and counter processes, SQLite sidecars, fixture root, and the two exact manifest-declared counter paths. Each declaration must have a matching positive pre-cleanup existence/hash observation and exactly one measured post-cleanup absence probe at the declared path. Missing declarations, wrong paths, predeleted fake paths, and unprobed entries fail. All twelve resource classes must have positive measured before observations and zero after observations; fixture manifest digests must match and the unrelated control listener must remain unchanged until separate cleanup.

## Scope and migration

BL-015 performance benchmarking is now delivered. BL-017 selected Stop does not change BL-014's continuity result, and BL-018 selected Restart does not change it either. Close-on-running behavior, auto-sleep, scheduling, quotas, multi-user, and multi-host operation remain out of scope. Stop changes no SQLite schema or persisted field, configuration default, deployment topology, or migration requirement. Stop and Restart change no SQLite schema or persisted field, environment configuration, deployment topology, or migration requirement. The Plan and harness contracts keep `harness boot` as the governed wrapper, so no duplicate root `just harness-boot` recipe is added.
