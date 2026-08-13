# Engineering harness

> **AGENTS START HERE → `harness instructions`** — the CLI's baked agent
> briefing (envelope contract, role split, discovery loop). Then
> `harness instructions <verb>` per verb.

## Boot command

`harness boot` runs the canonical checks and returns a test-backed readiness
envelope with the development command and expected endpoints. It leaves no
development servers running. Harness boot remains non-persistent and test-backed.

## Checks command

`harness checks` wraps the root `just verify` recipe and gates formatting, linting,
typechecking, unit tests, builds, and Playwright E2E tests. On the designated host, the gate includes bounded BL-001 lifecycle and terminal-parity failures plus two real code-server Chromium scenarios: forced integrated-terminal timeout cleanup and passing terminal parity, each with exact-handle, terminal-command, browser-context, and listener cleanup. The gate ends with the bounded BL-004 retained-evidence, all-discovered-identity, active-guard, and BL-001 fixture-integrity audit; it does not rerun the 1/3/5/10 episode. The wrapper applies a finite 600,000 ms default budget, configurable with `ASCEND_HARNESS_VERIFY_TIMEOUT_MS` from 120,001 through 3,600,000 ms, while continuing to delegate exactly to `just verify`. The designated command uses cooperative deadline cancellation and holds its guard until cleanup, final audit, partial evidence retention, and release finish.

## Health check

`harness boot --json` is the aggregate readiness check and reports
`data.duration_ms` for speed classification. It gives the nested checks command its configured verification budget plus 10,000 ms of finite wrapper overhead and reports `data.checks_timeout_ms`. During interactive development,
the API root at `http://127.0.0.1:3000/` returns
`{"name":"ascend","status":"ok"}` and the web application is expected at
`http://127.0.0.1:5173`.

## Interact method

Use Fastify `inject` for API tests, Testing Library for component interaction, and
Playwright against the Vite application for supported browser interaction.

## Observe method

Read harness JSON envelopes and command exit codes. Runtime APIs emit structured
Fastify logs; Playwright captures traces on first retry; Vitest writes coverage
artifacts under each application package.

## Deterministic signal inventory

- `harness checks`: format, lint, typecheck, unit tests, builds, and Playwright E2E
- `harness boot --json`: aggregate test-backed readiness verdict
- `just verify-focused <path>`: focused Vitest feedback during implementation
- `just db-migrate <database-path>`: explicit-path ordered SQLite migration with one JSON consequence
- `just proof-terminal-parity`: 90-second designated-host direct-vs-integrated terminal sensor
- `just proof-workbench-presentation`: six-attempt designated-host BL-003 presentation comparison and conditional ADR materialization
- `just proof-workbench-capacity`: one bounded designated-host 1/3/5/10 diagnostic episode
- `just proof-workbench-capacity-audit`: short retained-evidence, exact-resource, active-guard, and fixture audit
- API root test: in-process health interaction and JSON consequence
- BL-008 Open Project signal: `just verify-open-project` covers the exact POST, strict client/recovery controller, accessible component, documentation, and one keyboard-only real-web/real-API Chromium episode with fixture integrity and executed scenario-by-scenario cleanup evidence
- BL-005 project-library tests: schema, duplicate, pre-write validation, migration compatibility, close/reopen, complete in-process restart, refusal, and exact-sidecar cleanup consequences
- BL-006 project-registration gate: just verify-project-registration emits finite configuration, registration, persistence, non-mutation, fixture-cleanup, documentation, and capability-aware permission signals; harness checks still delegates only to just verify
- BL-013 project-isolation signal: just verify-project-runtime-isolation runs the 12-scenario schema-version-2 fake matrix with 70 exact scenario events, 18 pre-forward target rejections, six text-and-binary destination-selection attempts rejected before either endpoint receives the frame, a persisted-close matrix, tracked task-settlement/post-return audits, and the no-retry three-Git-fixture Chromium A/B/C exact-status replacement episode; just proof-project-runtime-isolation-residual-audit rejects assigned-zero evidence and independently inventories initial/replacement identities, listeners, SQLite/sidecars, fixtures, ten measured resource classes, runtime-data absence, integrity, and unrelated-control cleanup. The signal is local, finite, offline, and makes no BL-014, BL-015, or lifecycle claim.
- BL-014 session-switching signal: just verify-session-switching runs execution-backed fixture, navigation, history, no-stop, per-ID reuse, evidence mutation, one-worker zero-retry Chromium with execution/event/observation joins, and dynamic twelve-class residual checks. just verify-session-switching-phase0 repeats deterministic proxy-event and one-dispatch terminal bounds under contention. BL-015 and lifecycle controls remain excluded.
- BL-015 performance signal: just measure-mvp-performance is the designated one-shot serial cold5/warm10/continuity3/capacity3-5-10 episode. just verify-mvp-performance and just proof-mvp-performance-residual-audit are finite evidence gates; harness checks and ordinary just verify never repeat measurement.
- BL-010 project-runtime signal: just verify-project-runtime executes every named fake and host-process path with full recursive manifests; just proof-project-runtime runs the one real manager episode; just proof-project-runtime-residual-audit checks exact retained PID identity and listener inode. Manager shutdown evidence inventories every running or in-flight PID/start identity, process group, port, and listener and records graceful or escalated outcomes. Harness boot remains non-persistent.
- BL-001/BL-002 host-process sensor: two real loopback code-server Chromium scenarios—forced integrated-terminal timeout cleanup and passing Explorer, Markdown Preview, and direct-vs-integrated terminal parity—with zero-leak cleanup audits

## Evidence paths

- Harness command envelopes: standard output
- Unit coverage: `apps/*/coverage/`
- BL-005 migrations and prior fixture: `apps/api/drizzle/` and `apps/api/test/fixtures/db/0000_project_library.sqlite`
- BL-005 disposable database consequences: `test-results/bl-005/databases/` (generated, exact-file cleanup)
- BL-006 disposable registration fixtures: test-results/bl-006/fixtures/ are generated and removed exactly; test-results/bl-006/permission-capability.json records proved or honest skipped host capability while controlled denial always runs
- Playwright artifacts: `test-results/` and `playwright-report/`
- BL-008 Open Project evidence: `test-results/bl-008/open-project/episode.json` maps the executed successful browser episode; `cleanup-matrix.json` maps executed startup failure, assertion failure, episode timeout, interrupted graceful shutdown, and surviving-descendant scenarios to process-group, listener, database-sidecar, fixture, and descendant counts. The survivor records owner cleanup failure before exact-PID teardown and zero residuals afterward.
- BL-014 switching evidence: test-results/bl-014/session-switching/switching-browser.json plus exactly one ignored mode-0600 restricted-authority.json; the residual command derives all project partitions from evidence and reports twelve measured zero resource classes after deleting disposable counter files.
- BL-013 project-isolation evidence: test-results/bl-013/runtime-isolation/fake-matrix.json, three-project-chromium.json, residual-audit.json, and at most one ignored mode-0600 restricted-authority.json are regenerated and ignored.
- BL-010 project-runtime evidence: test-results/bl-010/project-runtime/fake-matrix.json, episode.json, and residual-audit.json are regenerated and ignored. Committed copies plus the authoritative timing field and complete recursive manifests are under the Issue #25 implementation evidence directory; the retained AC mapping is the implementation record.
- BL-001 terminal-parity episode: `test-results/bl-001/terminal-parity/episode.json` with direct/integrated raw references (generated, ignored)
- BL-001 retained AC evidence: `project/work-items/5-bl-001-prove-a-host-code-server-workbench/implementation/00-implementation.md`
- BL-002 retained AC evidence: `project/work-items/7-bl-002-prove-host-native-terminal-parity/implementation/00-implementation.md`
- BL-003 retained comparison and browser events: project/work-items/9-bl-003-select-a-viable-browser-workbench-presentation/implementation/evidence/
- BL-003 retained terminal artifacts: `test-results/bl-003/raw/` (twelve comparison-referenced JSON files)
- BL-004 retained run: `project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence/853037e6-5dab-43cf-bcf8-61f1e8bbdb18/`
- Harnessability reports: `.harness/reports/harnessability/`
- Harness retrospectives: `.harness/records/retro/`

## Injection map
<!-- Coordinator lifecycle ownership has one row per seam; coding observation has one row per leaf worker. -->

| Seam event | Fires from | What fires it |
|---|---|---|
| `pre-flight` | `.github/agents/rpiv.agent.md` | RPIV after feature-branch preparation and before Research |
| `pre-coding` | `.github/agents/rpiv.agent.md` | RPIV after Plan validation and before Implement |
| `coding` | `.github/agents/rpiv-research.agent.md` | Research runs real `harness observe` capture for its own qualifying friction |
| `coding` | `.github/agents/rpiv-planner.agent.md` | Plan runs real `harness observe` capture for its own qualifying friction |
| `coding` | `.github/agents/rpiv-implementer.agent.md` | Implement runs real `harness observe` capture for its own qualifying friction |
| `coding` | `.github/agents/rpiv-verifier.agent.md` | Verify runs real `harness observe` capture for its own qualifying friction |
| `post-coding` | `.github/agents/rpiv.agent.md` | RPIV after the Implement handoff and before Verify |
| `post-flight` | `.github/agents/rpiv.agent.md` | RPIV after successful Verify completion |

## Back-pressure gaps

- Live API/web service startup is not yet part of boot; current readiness is
  test-backed and points to `just run` for interactive servers.
- SQLite migrate, prior-fixture, and persistence consequence checks are supported; a destructive reset command remains intentionally unsupported.
- Architecture contracts are not comprehensively executable; BL-003 checks only its evidence-backed presentation decision.
- No tracked CI workflow proves equivalence with the local `just verify` gate.

## Current maturity snapshot
**L3 — the improvement loop is active: boot/checks are proven, a committed retro
entry has been encoded, and harness-change records preserve the trajectory.**
<!-- The single, current L0–L4 level the harness is ACTUALLY at. Updated ONLY at
     the Improve beat (never by boot, which is read-only). See maturity-assessment.md. -->


## BL-009 Close Project signal

just verify-close-project delegates finite persistence/service, DELETE mapping and combined exact eight-way HTTP concurrency plus recursive non-mutation, request-URL log redaction, strict client, single-owner reconciliation, accessible component, documentation, and no-retry desktop Chromium checks to repository commands. just verify remains authoritative, and harness checks still delegates only to just verify. Harness boot remains non-persistent and test-backed.

Generated BL-009 evidence is test-results/bl-009/close-project/manifest-matrix.json plus test-results/bl-008/open-project/episode.json and close-fault-episode.json. The manifest artifact stores executed Cancel, success, unknown, persistence-failure, transport-ambiguity, retry, already-absent, and eight-concurrent-DELETE paths with complete before/after membership, bytes, modes, and timestamps. Integrity is captured before test-only removal. The success and controlled-fault episodes own exact process groups, listeners, isolated database sidecars, and disposable fixtures and leave zero residuals. This is stopped-project metadata close only; BL-020 retains running or failed workbench close and runtime lifecycle.
