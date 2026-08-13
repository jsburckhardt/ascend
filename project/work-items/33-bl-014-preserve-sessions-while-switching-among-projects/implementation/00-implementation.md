# Implementation Notes: Issue 33 / BL-014

## Scope delivered

Completed T-0 through T-9 in dependency order. The verifier remediation replaces assigned BL-014 rows with schema-version-2 execution/event/observation joins, measured Chromium state/network/storage/cleanup evidence, strict negative fixtures, and a dynamic residual audit. It also corrects the BL-013 Chromium terminal completion timeout without a retry or timeout increase. Runtime/session ownership and public product behavior remain unchanged.

## Retained execution

The final retained public artifact is `test-results/bl-014/session-switching/switching-browser.json`, execution `2a0a6514-a51e-46f7-848d-fff06f20060d`, measured with `process.hrtime.bigint` from `142195901821744` to `142292111435483`. It contains 686 events, 48 surface observations, 24 ordered transitions, 11 state observations, two away samples, 14 workflows, and 344 network observations. Exact authorities remain only in ignored mode-0600 `restricted-authority.json`.

## Acceptance evidence

### AC-1

A/B/C each have `initialStartCount: 1` and distinct runtime identity digests. Initial state observation IDs are B `511fe91a-99b5-47df-9a29-f639682f375a`, C `7126d345-382c-4ac1-a99a-7ad0e5c94fc7`, and A `9147c69b-8521-4bd6-94c3-f44a6158186f`. Each row retains visible Explorer, active editor file, terminal, cwd, Git root/branch/exact status, Git sentinel, terminal sentinel, safe route token, and restricted PID/start/port identity authority.

### AC-2

The repository counter runs every 250 ms with a 60,000 ms maximum. Command execution `948249d7-8326-49fc-9b27-35197a556c1e` recorded visible A value 2 before leave and PID/start digest `f32aa6fb1de557d79f136c6307dd8edfcd12e89510316f8ff424643abf1812fd`. The terminal retains the initial Git/cwd/sentinel evidence while one visible row updates.

### AC-3

The artifact retains the full 24-row transition order: initial-open-B, initial-home-B, initial-open-C, initial-home-C, initial-open-A, switch-home-A, switch-open-B, history-back-B, history-forward-B, switch-home-B, switch-open-C, switch-home-C, switch-open-A, revisit-home-A, revisit-open-B, revisit-home-B, revisit-open-C, direct-A, reload-A, fresh-B, close-B, probe-A, probe-C, reopen-B. Each transition joins unique before/after observation IDs, a transition execution ID, an event ordinal range, and measured request/start/reuse/stop/shutdown deltas. The measured deltas are respectively `2/1/14`, `1/0/0`, `2/1/14`, `1/0/0`, `2/1/14`, `1/0/0`, `2/0/8`, `2/0/2`, `2/0/7`, `2/0/2`, `2/0/8`, `2/0/2`, `2/0/8`, `1/0/0`, `2/0/8`, `1/0/0`, `2/0/8`, `2/0/8`, `3/0/10`, `2/0/15`, `0/0/1`, `0/0/0`, `2/0/8`, `2/0/17`; all 24 measured stop and shutdown deltas are zero.

### AC-4

All 11 visible state observations perform 12 cross-project negatives, totaling 132 measured assertions. Each state checks both other projects across file, editor sentinel, terminal sentinel, cwd, branch, and Git sentinel classes with `matchCount: 0`. B/C initial and revisit rows retain distinct known files, exact Git status, terminal output, cwd/root/branch, and sentinels.

### AC-5

Away observation IDs `01c672ad-7202-485e-b6c1-f34a88f7ba70` and `f8269fe5-9b7e-49b0-8aa5-531a32062c8e` both record `browserInteraction: false`, live PID, the same process and command digests, and independently measured sequence/output values 13 then 33.

### AC-6

A before-leave observation `4823ef7a-99fa-4cba-8321-f868bbf984df`, return observation `12eda30f-7d13-4ce5-b005-c9de8405c159`, and probe observation `3ac7e680-adeb-42e5-a7bb-ccdacf3ced2a` all retain identity digest `bca16aa2cb2965873c8a7f80e1f17ecfc0e8f87a0bde78f86ee1157de1ebdf1c`. The visible return counter is 74, later than both away values, with the A editor and complete terminal/Git state visible.

### AC-7

B revisit `e8b1c81b-2e8a-4305-a5f6-0dd743794d5d` and C revisit `23d080c7-e999-46b8-939c-e0535be57d70` retain their original identity, editor, terminal/output, cwd, Git, and sentinel digests. Exactly five Projects/Open re-entries—B, C, A, B, C—have start/stop/shutdown deltas zero; history, direct link, reload, fresh context, close, probes, and reopen remain separate transition rows.

### AC-8

Eight measured Home after-observations retain URL `/`, surface `Home`, and focus `heading:Ascend`: `50057bfb-9373-4a15-9211-e272b06006e6`, `d84a5072-5d37-42ca-8dc2-3383a7dcfd19`, `976c1e7a-76b5-4f67-81dd-a0660dc67496`, `5a780e63-8ca2-496d-9a8f-44b6d1a50037`, `02e1c3ac-d696-4295-9edf-c81fa05f79ec`, `d97d5c55-2d03-40c9-9213-b001b4a6e873`, `4eee3fdd-cb84-4b16-8543-1ed40046022b`, and `0cc8b47c-11c0-425b-bb56-8a2f16eaf4f5`. Browser/component assertions measure one A/B/C card each, keyboard Open focus, Open/Close-only controls, and no Stop/Restart control or lifecycle event.

### AC-9

`history-back-B` and `history-forward-B` have distinct transition and before/after observation joins. Back measured request/start/reuse/stop/shutdown `2/0/2/0/0`; Forward measured `2/0/7/0/0` and joins workflow `history-forward-B`. B identity remains unchanged and no cross-project assertion matches.

### AC-10

Fresh-storage execution `ebc390b7-c5c9-4c82-89e7-4a381284da31` enumerates before values cookies/local/session/CacheStorage/service-workers `1/1/1/1/0`, performs measured browser-cache and origin clear operations, and enumerates `0/0/0/0/0` afterward. Fresh B observation `4383c9e1-d52e-40d2-bbfa-7bd37172b218` and reload/direct transitions retain the original B/A identities. Server terminal and browser editor restoration are separately retained as the observed closed outcome `unsupported`, without broadening ownership claims.

### AC-11

`close-B` measures `0/0/1/0/0`. A probe `3ac7e680-adeb-42e5-a7bb-ccdacf3ced2a` and C probe `a48f46b3-a296-482d-a0df-2745411425ba` execute visible terminal usability while B remains live. Reopen B observation `5b5e7e22-4eda-411b-9117-961bd994037c` retains B identity digest `e80a7c0a087f4d2fed6be5dcb015fb4c09e846d81989d0010f7583571aeb782f` and the measured restoration outcome.

### AC-12

All 344 network rows join the root execution, workflow, transition execution, safe project token, stable URL, role, reconnection classification, and leak scan. Exact totals are 316 HTTP, 14 Management, and 14 ExtensionHost observations. Every one of the 14 workflows has exactly one Management and one ExtensionHost socket, zero unknown roles, stable prefix true, and leak count zero. HTTP counts by workflow are initial B/C/A `30/30/30`, open-B 16, history-forward-B 15, open-C 16, open-A 25, revisit-B/C `25/25`, direct-A 13, reload-A 27, fresh-B 19, probe-C 25, and reopen-B 20.

### AC-13

Schema v2 requires random execution/event/observation IDs, unique joins, measured event ranges/deltas, advancing sequence/output values, dynamic project tokens, exact role manifests, and nonzero pre-cleanup measurements. Sixteen negative mutations reject unexecuted or constructed provenance, missing/duplicate projects, static identities, duplicate event IDs, wrong event deltas, missing transitions/state, unchanged away values, token swaps, missing socket roles, uncleared storage, residual resources, assigned zero-before cleanup, and unsafe authority text.

### AC-14

The retained evidence maps all 24 transitions through 48 surface observations and 686 actual events: 43 navigation requests, three start requests, three start successes, 210 runtime reuses, 213 proxy starts, 213 proxy completions, and one shutdown invocation. State, counter, away, network, storage, cleanup, fixture-manifest, URL/focus, and restricted-authority joins are validated together; the public leak scan is zero.

### AC-15

Final independent residual execution `2a0a6514-a51e-46f7-848d-fff06f20060d` dynamically derived three project partitions, each with zero process/listener/resource residuals. Twelve measured classes changed from before to after as follows: terminal commands `1→0`, browser contexts `2→0`, pages `2→0`, proxy operations `15→0`, runtime groups `3→0`, listeners `5→0`, sockets `16→0`, web service `1→0`, API service `1→0`, database files `1→0`, fixtures `3→0`, disposable evidence files `2→0`. Both counter raw-output/identity path observations report absent, fixture manifests match, host process/listener/file probes are absent, and the unrelated control remained unchanged until separate cleanup.

### AC-16

Updated `README.md`, `docs/session-switching.md`, `docs/stable-workbench-routing.md`, `docs/workbench-proof.md`, and `.harness/engineering-harness.md` with schema v2 joins, 14 exact role workflows, storage manifests, dynamic twelve-class cleanup, ownership limits, BL-013 visible completion handling, finite commands/bounds, and the unsupported restoration result. No API specification, payload, configuration/default, deployment, data migration, ADR, core-component, or decision-log contract changed. The Plan keeps `harness boot` as the governed wrapper, so no duplicate root `just harness-boot` recipe was added.

### AC-17

The final root `just verify` exited 0 after formatting, lint, type checks, unit/component tests, build, root browser suite, BL-010 proof, RPIV harness checks, registration, BL-011, BL-012, BL-013, BL-014, and all residual audits. Prior gates also passed directly: open-project 93 tests plus three Chromium tests; stable route 54 plus one Chromium test; Home/workbench 44 plus three Chromium tests; and BL-013 repeated contention twice with 41 tests, one Chromium scenario, and residual audit per run. Governed `harness boot --json` returned `status: ok`, `readiness: ready`, duration 414,383 ms within its 610,000 ms bound.

## BL-013 terminal correction

Failure diagnostics measured a successfully emitted completion split by xterm visual wrapping as `BL013_DONE` plus `=DONE_1` on the next display row. Raw substring polling therefore waited 30 seconds even though execution had completed. The fix uses the compact repository terminal-proof executable, preserves one command dispatch and FIFO readiness consequence, normalizes measured xterm whitespace for the completion join, and retains the visible Git/cwd/status/sentinel result. It adds no retry and leaves `operationMs = 30_000` unchanged. `just verify-project-runtime-isolation-contention` passed two consecutive no-retry Chromium executions, and full validation passed another.

## Validation evidence

- `just verify-focused`: 93 files passed, one skipped; 595 tests passed, two skipped.
- `just verify-session-switching-phase0`: two runs, 16 tests passed per run.
- `just verify-session-switching`: eight contract/component tests, one no-retry Chromium execution, and twelve-class residual audit passed.
- `just verify-project-runtime-isolation-contention`: two complete 41-test + Chromium + residual executions passed.
- `just verify-open-project`, `just verify-workbench-route`, and `just verify-home-workbench`: passed with their browser and residual phases.
- `just verify`: exit 0; final BL-014 Chromium execution completed in about 1.7 minutes and final BL-013 Chromium execution in 26.2 seconds.
- `harness boot --json`: status ok/readiness ready; 414,383 ms.
- Final BL-014 and BL-013 independent residual audits: status ok/pass with every resource residual zero.

## Observation evidence

Real `harness observe` receipts for this verifier-remediation stage include DL-722 through DL-733, CONF-108 through CONF-110, INS-143 through INS-147, and the earlier recorded coordination/win observations. DL-729 and DL-730 retain the repeated BL-013 timeout attempts; INS-145 retains the measured visual-wrap root cause; DL-731 retains the corrected full-format failure; DL-732/DL-733 retain the finite harness-boot waits. Failed attempts were not discarded or deduplicated with different trigger tuples.

Implementation is complete; final acceptance remains owned by Verify.
