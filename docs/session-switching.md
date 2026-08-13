# Project session switching (BL-014)

## Delivered behavior and ownership

Ascend keeps one healthy memory-only runtime per active stable project ID. Project Home navigation and browser-client disconnection do not stop that runtime. code-server owns server-side workbench and terminal sessions; the browser owns local editor restoration, storage, cache, and service workers. Ascend adds no persisted runtime fields, router, lifecycle API, or Stop/Restart control.

The designated desktop Chromium proof creates exactly three disposable Git repositories A, B, and C and starts them once in B, C, A order. With A displayed it uses keyboard Projects and Open actions for A → Home → B → Home → C → Home → A, then revisits B and C. Those are exactly five Projects/Open re-entries in B, C, A, B, C order. All five reuse the original project runtime identity; every Home action has zero stop or shutdown calls, and Close, Stop, and Restart are not invoked.

A opens its known file and runs one repository counter dispatch every 250 ms, bounded to at most 90 seconds. Two host process/file samples are taken while A is away without interacting with A’s browser workbench. They require the same command PID and increasing sequence. A return requires the same PID/runtime identity, a later visible value, and retained A file, canonical cwd, Git branch/status/config sentinel, and terminal state. B and C use distinct known files, branches, dirty status files, Git sentinels, and bounded terminal evidence; their revisit checks retain project-specific state.

## History and reconnection boundary

One Back/Forward pair is recorded separately from the five Open actions. A reload, a fresh direct B browser context, B client close, and B direct reopen are also separate. The fresh context begins with empty storage state, blocks service workers, and explicitly clears browser cache and origin data. These operations reuse the same server runtime and never stop B; A and C remain unchanged and usable.

The observed fresh/reopen outcome is unsupported for visible server-owned terminal restoration, and browser-local editor restoration is independently unsupported. This is a closed observation, not a claim that server state was destroyed: the exact B runtime remained live and was reused, while a fresh browser did not visibly reconstruct those surfaces. Same-context B/C switching restored terminal backends with their panels initially hidden; the proof reveals the existing panel without dispatching a replacement command. Initial workflows observed one Management and one ExtensionHost socket. Reconnection rows retain their exact role counts; two reused the existing ExtensionHost and opened only Management. Every socket remains under the stable prefix with safe project-token attribution and zero public authority leakage.

## Commands, bounds, and evidence

Use only root commands:

~~~text
just verify-session-switching-phase0
just verify-session-switching
just proof-session-switching-residual-audit
just verify
~~~

The designated Playwright recipe uses one Chromium worker and retries zero. The A counter cadence is 250 ms with a 90,000 ms maximum; browser operations are bounded to 30,000 ms and the scenario to 240,000 ms with cleanup inside that bound. Phase 0 proxy failures use execution-correlated event settlement instead of clearing shared events. Terminal parity dispatches once; measured monotonic phase bounds reserve 10,000 ms for cleanup and fit inside the existing 90,000 ms episode.

Generated public evidence is test-results/bl-014/session-switching/switching-browser.json. Exactly one ignored regular mode-0600 restricted-authority.json retains exact PID/start/port/path authority for cleanup and must not be published. Public evidence contains only tokens, classes, counts, timings, and digests. The residual command requires three zero project partitions, all eleven resource classes at zero, equal fixture manifests, database/sidecar absence, and an unchanged unrelated control listener until separate cleanup.

## Scope and migration

BL-015 performance benchmarking remains deferred. Public lifecycle controls, Close-on-running behavior, auto-sleep, API-restart reconciliation, scheduling, quotas, multi-user, and multi-host operation remain out of scope. This delivery changes no public API payload, SQLite schema, configuration default, deployment topology, or migration requirement. It requires no ADR or core-component contract change because runtime and session ownership do not move.
