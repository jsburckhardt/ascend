# Host code-server workbench proof

BL-001 provides a bounded designated-host proof. It is an operational validation surface, not an HTTP API or a general multi-project runtime.

## Prerequisites

- Ubuntu 24.04.4 LTS host `03f809395a5d`
- non-root user `vscode` (uid 1000)
- repository at `/workspaces/ascend`
- `/home/vscode/.local/bin/code-server` version 4.131.0
- Chromium installed by `just setup`

The tracked project fixture is `/workspaces/ascend/tests/fixtures/bl-001/workbench project;BL-001`. Its space and literal semicolon prove one argument-array path. `EXPLORER-SENTINEL-BL-001.txt` and `WORKBENCH-PREVIEW.md` are integrity sentinels; the rendered Markdown text is `BL-001 Markdown Preview Rendered Sentinel`.

## Start and stop

Run from the repository root:

```sh
handle=$(just proof-start)
printf '%s\n' "$handle" | just proof-stop
printf '%s\n' "$handle" | just proof-stop
```

Start writes structured lifecycle events to stderr and exactly one versioned JSON handle to stdout:

```json
{
  "version": 1,
  "pid": 12345,
  "url": "http://127.0.0.1:34567/",
  "runId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "startTimeTicks": "123456"
}
```

The launcher canonicalizes an existing readable directory, directly spawns code-server without a shell, binds `127.0.0.1:0`, disables authentication, telemetry, update checks, and workspace trust, and isolates user and extension data. Readiness is the first HTTP status from 200 through 399 at the emitted URL. Startup is bounded to 15 seconds. Browser interaction is bounded to 60 seconds.

Stop reads the unchanged handle from stdin, validates its saved PID, URL, run ID, and process start identity, then signals only that dedicated process group. It escalates from SIGTERM to SIGKILL within 10 seconds. A repeated stop succeeds after the exact process is absent.

## Failure diagnostics

Failures exit nonzero and emit one structured `runtime.start.failed` or `runtime.stop.failed` event on stderr. Expected startup codes are:

| Condition | Code | Relevant detail |
|---|---|---|
| Missing code-server | `executable-missing` | executable path |
| Nonexistent project | `project-missing` | input path |
| Project is not a directory | `project-not-directory` | canonical path |
| HTTP readiness deadline | `readiness-timeout` | timeout milliseconds |
| Process exits before readiness | `early-exit` | exit code |

Other explicit lifecycle codes cover unreadable projects, root execution, spawn failure, invalid handles, state mismatch, and stop timeout. Diagnostics exclude environment values, source contents, and raw child output.

## Artifacts and cleanup

The only disposable boundary is `test-results/bl-001`. Per-run state, logs, user data, and extensions stay below `test-results/bl-001/runs/<runId>` and that exact run directory is removed by stop or startup-failure cleanup. `test-results/bl-001/injection-sentinel` must remain absent. The tracked fixture is never removed or modified.

The passing Chromium parity proof writes `test-results/bl-001/terminal-parity/episode.json` with host facts, handle, readiness exits, process identities, NUL-delimited argv represented as arrays, loopback listeners, fixture hashes, browser observations, and cleanup results. Playwright traces and screenshots are failure-only artifacts. Generated evidence is ignored; the safe retained AC mapping is the issue implementation record.

If a prior run directory exists, do not delete its state until its exact handle is proven absent. Never kill by process name and never sweep unrelated listeners; the host may run unrelated VS Code Remote processes.

## Validation

```text
just verify-focused apps/api/test/workbench-proof-contract.test.ts apps/api/test/workbench-proof-runtime.test.ts apps/api/test/workbench-proof-failures.test.ts
just test-e2e
just verify
```

The configured full gate runs exactly five fake startup failures and two real code-server Chromium lifecycle scenarios: one forced overall-timeout cleanup and one passing parity episode, alongside existing checks. Its BL-001 full-gate target is 120 seconds. During native Markdown Preview initialization, VS Code may replace its webview frame; the proof retries only that detached-frame transition within the existing 15-second exact rendered-text poll, while all other browser errors still fail. After either Chromium scenario starts a workbench, the shared episode coordinator performs cleanup in `finally`; the passing scenario repeats exact-handle stop for idempotence and audits PID, listener, fixture, injection sentinel, and disposable state.

## Troubleshooting

- `executable-missing`: confirm the fixed executable exists and reports 4.131.0.
- `root-user-forbidden`: run as `vscode`, not through privilege elevation.
- `readiness-timeout`: inspect the structured condition and rerun only after confirming no exact handle is live.
- Browser sentinel failure: retain Playwright failure artifacts; cleanup still runs against the emitted handle.

## Terminal parity episode

The designated-host paved command is:

```text
just proof-terminal-parity
```

It reuses the one BL-001 launcher, canonical metacharacter fixture, explicit Chromium context, and exact-handle cleanup. The episode is bounded to **90,000 ms** overall. It preflights the six fixed executables before workbench or browser startup, captures direct results, opens exactly one integrated terminal, and captures integrated results from the same canonical fixture directory. Every command is bounded to **5,000 ms**.

The fixed tool command list is exactly:

1. `git --version`
2. `git status --short`
3. `gh --version`
4. `tmux -V`
5. `docker --version`
6. `copilot --version`

The proof also compares `hostname` and `id -un` in both contexts (both users must be `vscode`), and requires integrated `pwd -P` to equal the canonical launch path. Direct and integrated commands use executable/argument arrays; the fixture path is never shell-interpolated.

### Normalization and environment policy

One content-preserving normalization is applied identically to stdout and stderr in both contexts: CRLF and lone CR become LF. It does not trim, sort, merge streams, strip control bytes, rewrite URLs/versions, or otherwise change content. Both untouched raw records remain referenced by the episode.

Only `PATH` is retained and compared. Its result is `equal`; `allowed difference` when the text differs but all five unique fixed executables resolve to identical canonical paths; or `unexplained failure-causing difference`, which fails the command. No non-allowlisted environment values are retained.

### Terminal diagnostics and evidence

A missing fixed executable fails before browser/workbench startup as `terminal-executable-missing` and names the executable. Existing commands that return nonzero fail as `terminal-command-nonzero` and name the command, direct/integrated context, and exit result. Per-command timeouts fail as `terminal-command-timeout` and name command, context, and timeout. The overall deadline reports `terminal-episode-timeout`. Atomic evidence write failures report `terminal-artifact-write`.

Current-run generated evidence is ignored by Git and written to:

- `test-results/bl-001/terminal-parity/direct.raw.json`
- `test-results/bl-001/terminal-parity/integrated.raw.json`
- `test-results/bl-001/terminal-parity/episode.json`

Each raw command row records cwd, argv, 5,000 ms bound, exit result, separate raw and normalized streams, PID/start identity, and absence after completion. The episode maps host facts, code-server/tool observations, comparisons, raw references, cleanup, and disposition. Raw terminal output remains in these proof artifacts and is not written to lifecycle logs.

### Cleanup

Every path that starts owned resources uses the shared episode coordinator to attempt, in order, exact tracked-command-group cancellation, explicit browser-context close, exact BL-001 process-group stop, and separate command-identity, workbench-PID, and listener absence audits. The real timeout scenario publishes the in-progress integrated command PID/start identity, reaches the overall deadline, cancels that exact group, and asserts all four absence results. Cleanup never uses process-name killing or listener sweeps, and cleanup failures remain failure-shaped. A missing-executable preflight creates no handle or browser context.

### Observed designated-host result

On Ubuntu 24.04.4 LTS host `03f809395a5d` as `vscode` with shell `/bin/zsh` and code-server 4.131.0, `just proof-terminal-parity` passed. Hostname/user/canonical cwd and all six command exits/stdout/stderr matched. The differing `PATH` was classified `allowed difference` because Git, GitHub CLI, tmux, Docker CLI, and Copilot CLI resolved identically. Browser context, terminal commands, exact workbench PID, and listener were absent after cleanup.

## BL-003 browser presentation comparison

### Paved command and ordered prerequisites

Run the designated-host comparison once with:

~~~text
just proof-workbench-presentation
~~~

Before any attempt starts, the command checks these prerequisites in order and stops at the first failure: Ubuntu 24.04; non-root vscode user; merged BL-001/BL-002 proof capabilities and canonical fixture; code-server 4.131.0; the repository Chromium desktop build; then creation of a 1440 by 900 viewport. A prerequisite stop starts no attempt and records prerequisite failure:<name>.

Exactly two proof-only candidates are compared: code-server embedded in a minimal Ascend surface, followed by top-level full-page code-server with a minimal Ascend header. There is no third candidate. Presentation is the only candidate-specific variable; fixture, launch configuration, Chromium version, viewport, observers, fixed scenario, terminal commands, integrity checks, and cleanup are shared. This command does not add Project Home, stable routing or proxying, runtime management, lifecycle UI, polished UI, or tablet integration.

### Fixed scenario, evidence, and safety

Each candidate receives exactly three fresh attempts in slot order, embedded 1 through 3 then full-page 1 through 3. Every attempt has a new BL-001 process handle and group, empty browser context, run ID allocated before navigation, and candidate-disposable area. The scenario is invoked once with no assertion, timeout, transient-error, action, or attempt retry. The only passive tolerance is observing the known detached Preview frame replacement.

The fixed scenario receives a final candidate document status from 200 through 399, finds the Explorer sentinel, opens WORKBENCH-PREVIEW.md, observes the rendered Preview sentinel, uses keyboard actions to focus Explorer and enter and leave Preview, opens one integrated terminal, completes the memory-only clipboard round-trip, and then runs the BL-002 identity, canonical-path, and exact six fixed tool parity commands. The clipboard token is typed into unexecuted terminal input, copied, cleared, pasted, compared, and cleared again. Its value is never recorded, executed, or written to the fixture.

An attempt-local observer is attached before navigation. It retains every response, request failure, console warning or error, page error, and WebSocket open, error, or close occurrence in order, including repeats. Blocking classification takes precedence for browser-reported blocked, refused, denied, or policy-enforced frame, CSP, X-Frame-Options, origin/CORS, mixed-content, sandbox/permission, cookie/storage, required workbench or Preview resource, and WebSocket failures, including close before terminal completion. Other console warnings/errors, HTTP statuses of 400 or greater, request failures, and WebSocket warnings/closes count as non-blocking. A Preview fake.html request aborted with net::ERR_ABORTED is reclassified from blocking to non-blocking only when the immediately following retained event is a successful document response for the same URL and the functional Preview assertion passed; other aborted or failed required resources remain blocking. Functional outcomes fail independently when their required observable result is absent.

Each started attempt retains one JSON record and one raw browser-event record below the BL-003 work-item evidence directory. The attempt includes candidate and slot, run and fresh resource identities, exact Chromium version, start/final status, failed assertion IDs and errors, monotonic navigation and completion times, functional/evidence/cleanup/integrity assertions, warning totals, cleanup details, fixture tree/sentinel results, and generated terminal raw references. The twelve raw terminal artifacts referenced by the retained six passing attempts are materialized under test-results/bl-003/raw. Every required browser-event and terminal artifact reference must exist and be readable; a missing file fails the attempt and makes its candidate ineligible. The comparison contains exactly six slots, host/tool/viewport facts, eligibility, warning totals, three elapsed values and middle-value median for each eligible candidate, stop reason, disposition, and every started record reference.

Cleanup is attempted for each start and requires integrated command identities, browser context, exact BL-001 process group/PID/listener, and the attempt disposable area to be absent while the canonical fixture remains present and byte-identical. Fixture tree membership and sentinel hashes are checked independently before and after every attempt. Cleanup failure records cleanup failure:<candidate>/<attempt>, prevents later slots from starting, leaves them without run IDs, and still runs selection from completed evidence.

### Eligibility, selection, and retained result

A candidate is eligible only when all three fresh attempts pass every functional, required-evidence, cleanup, and integrity assertion. One eligible candidate is selected directly. Two eligible candidates are compared in this exact order: fewer retained blocking occurrences, fewer retained non-blocking occurrences, then lower middle-value median elapsed time. The first strict difference selects; no fallback preference exists.

The four exact dispositions are embedded selected, full-page selected, selection tie, and no viable candidate. Selected dispositions exit zero. A tie or no viable candidate exits nonzero and creates no Accepted ADR. Missing later slots never receive fabricated run IDs.

The retained comparison at project/work-items/9-bl-003-select-a-viable-browser-workbench-presentation/implementation/evidence/comparison.json started all six attempts on Ubuntu 24.04.4 LTS host 03f809395a5d as vscode with Chromium 151.0.7922.34 and code-server 4.131.0. Both candidates were eligible. Embedded retained 3 blocking and 30 non-blocking occurrences with median 12,737 ms; full-page retained 0 blocking and 36 non-blocking occurrences with median 13,347 ms. The first tie-breaker therefore produced full-page selected. ADR-260810-full-page-browser-workbench-presentation records that authoritative desktop Chromium decision. Tablet validation remains a separate, non-authoritative follow-up.


## BL-004 workbench capacity baseline

BL-004 is a bounded diagnostic extension of BL-001, not product runtime management. On the designated Ubuntu 24.04.4 LTS host `03f809395a5d`, as non-root `vscode` uid 1000 in `/workspaces/ascend` with code-server 4.131.0, run:

```text
just proof-workbench-capacity
```

The strict 1,200,000 ms overall deadline surrounds active-run acquisition, prerequisite and fixture checks, every cohort operation, cleanup, final fixture inspection, evidence retention, and guard release. Before starting a member the command checks the exact host, user, repository, executable/version, fixture, required `/proc` files, and cgroup-v2 context. Host or tool prerequisite failure is a prerequisite-specific nonzero result; fixture preflight or snapshot failure is a distinct fixture-specific nonzero result; deadline and run-isolation failures are also distinct. None starts a member. An exclusive active-run guard rejects concurrent or stale ownership; immutable historical run directories do not block a new run.

The fixed cohort order is 1, 3, 5, and 10. Starts are sequential with a 30,000 ms readiness bound, and each requested slot is retained as `ready`, `failed` with reason, or `unstarted` with reason. The next cohort cannot start until exact cleanup and fixture integrity finish. An ordinary member failure does not prevent later slot attempts. The first responsiveness failure latches a run-wide safety stop, prevents all later member starts, records every remaining slot and scheduled position explicitly absent, and begins cleanup.

The responsiveness probe is the direct argument-array command `/usr/bin/true` with a 1,000 ms timeout. It runs before each cohort, at every retained host position in both windows, and after cleanup. Idle and active windows each remain open through at least anchor plus 5,000 ms. Their monotonic positions target offsets 0, 1, 2, 3, and 4 seconds; collection begins only at or after each exact target, and retained target, actual-start, host, process-tree, and window-end times report the real timing. Late positions are absent rather than replaced. The active anchor is allocated only after workload start has been attempted for every readiness-achieved member; a process-tree position is retained only while its workload overlaps it. A zero-ready active window still records five `no ready workload` absences and a truthful 5,000 ms window end.

Every readiness-achieved member receives the identical direct argument-array workload `/usr/local/bin/node /workspaces/ascend/apps/api/src/workbench-capacity-workload.mjs` in the canonical fixture. It runs for 7,000 ms, is bounded to 10,000 ms, and stdout plus stderr share one combined 4,096-byte bound. Evidence retains command, PID/start identity, times, exit result, and each bounded stream; runtime logs contain metadata, not terminal output.

Sampling consistently reads Linux `/proc`. Process-tree CPU percent is cumulative attributed CPU-tick delta divided by monotonic elapsed time and `CLK_TCK=100`, without normalization by the 20 logical CPUs; RSS is summed `VmRSS` KiB. Host records retain 1/5/15 load average, `MemAvailable`, used memory as `MemTotal - MemAvailable`, and the probe result. Very short first-position CPU intervals can produce large diagnostic percentages; raw timestamps and tick-derived values are retained rather than normalized away. Each process sample includes timestamp, root PID, member PIDs, CPU percent, and RSS. Each host sample includes timestamp, load, memory, and responsiveness.

A cohort is complete only when every slot is terminal, every one of its ten scheduled host positions and every readiness-achieved tree position is a sample or explicit absence with reason, every readiness-achieved member has a workload result, and cleanup plus fixture integrity checks finished without a strict deadline breach. Missing host records, missing target-tree records, process-tree inspection failures, probe failures, unexpected exits, explicit absences, and incomplete evidence are retained as findings. An unexpected exit transitions the slot to `failed` and removes it from the ready count. Completeness does not turn a failed member or absent sample into success. One member is plumbing only. Three members are the only MVP gate and require three distinct root PIDs, listener-owner PIDs, and ports, successful workloads, no unexpected exits, all idle and active samples, every responsiveness probe, cleanup, and integrity. Five and ten are findings and never rewrite the frozen three-member decision. The command is still nonzero for any incomplete cohort, failed cleanup/integrity, evidence-write failure, or overall timeout.

Cleanup tracks every PID/start identity and listener inode/owner/port found at readiness and during each later baseline, scheduled sample, and final inspection. It stops the owned member group, applies identity-checked cleanup to every discovered descendant, and audits every attributed process and listener owner. It never kills by name or sweeps ports. Before and after every cohort, the merged BL-001 fixture tree membership and sentinel hashes are compared. Run evidence is retained atomically under `project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence/<runId>/` as `run.json`, `samples.json`, `workloads.json`, and `comparison.md`. The comparison reports requested/ready/failed/unstarted members, workload and host/tree sample completeness, host and process summaries, responsiveness, cleanup/integrity, findings, gate, and independent overall disposition.

Run the bounded post-run and full-gate audit with:

```text
just proof-workbench-capacity-audit
just verify
```

The audit recomputes the table, checks every retained process/workload/listener identity is absent, proves no active ownership, and compares the current fixture with retained membership and hashes. `just verify` runs this short audit last and does not repeat the expensive cohort episode.

### Observed designated-host baseline

Retained run `532abfdb-c970-4979-9da2-ec9ef99a295a` completed in about 71 seconds with all 1, 3, 5, and 10 requested members remaining ready, all 19 workloads passing, all 40 host positions and every readiness-achieved process-tree position retained at or after target, no sample absences, passed responsiveness, cleanup, and fixture integrity, a passing three-member gate, and overall `passed`. The five- and ten-member cohorts had no findings. Minimum available memory was 21,992,676 KiB, 21,851,460 KiB, 21,841,364 KiB, and 21,585,816 KiB for cohorts 1, 3, 5, and 10 respectively. The cgroup-v2 evidence honestly records `cpu.max=max 100000`, CPUs `0-19`, and `max` for memory, memory-high, swap, and PID limits; no finite cgroup resource ceiling isolated the run from host activity.

This baseline measures one direct-host episode only. It does not establish scheduling, quotas, sleeping, product lifecycle policy, multi-host support, BL-010 outcomes, BL-013 outcomes, or any change to the accepted full-page browser presentation decision.
