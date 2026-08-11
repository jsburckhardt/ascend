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
typechecking, unit tests, builds, and Playwright E2E tests. On the designated host, the gate includes bounded BL-001 lifecycle and terminal-parity failures plus two real code-server Chromium scenarios: forced integrated-terminal timeout cleanup and passing terminal parity, each with exact-handle, terminal-command, browser-context, and listener cleanup. The gate ends with the bounded BL-004 retained-evidence, all-discovered-identity, active-guard, and BL-001 fixture-integrity audit; it does not rerun the 1/3/5/10 episode. The designated command uses cooperative deadline cancellation and holds its guard until cleanup, final audit, partial evidence retention, and release finish.

## Health check

`harness boot --json` is the aggregate readiness check and reports
`data.duration_ms` for speed classification. During interactive development,
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
- BL-007 Project Home Playwright signal: one owned real-web/real-API desktop Chromium episode proving empty, restart-populated, keyboard Open identity, controlled fault/retry, graceful exits, absent listeners, and exact database-sidecar cleanup
- BL-005 project-library tests: schema, duplicate, pre-write validation, migration compatibility, close/reopen, complete in-process restart, refusal, and exact-sidecar cleanup consequences
- BL-006 project-registration gate: just verify-project-registration emits finite configuration, registration, persistence, non-mutation, fixture-cleanup, documentation, and capability-aware permission signals; harness checks still delegates only to just verify
- BL-001/BL-002 host-process sensor: two real loopback code-server Chromium scenarios—forced integrated-terminal timeout cleanup and passing Explorer, Markdown Preview, and direct-vs-integrated terminal parity—with zero-leak cleanup audits

## Evidence paths

- Harness command envelopes: standard output
- Unit coverage: `apps/*/coverage/`
- BL-005 migrations and prior fixture: `apps/api/drizzle/` and `apps/api/test/fixtures/db/0000_project_library.sqlite`
- BL-005 disposable database consequences: `test-results/bl-005/databases/` (generated, exact-file cleanup)
- BL-006 disposable registration fixtures: test-results/bl-006/fixtures/ are generated and removed exactly; test-results/bl-006/permission-capability.json records proved or honest skipped host capability while controlled denial always runs
- Playwright artifacts: `test-results/` and `playwright-report/`
- BL-007 Project Home episode: `test-results/bl-007/project-home/episode.json` (generated sanitized all-true bounded state, identity, fault, retry, graceful-exit, listener, and database cleanup evidence)
- BL-001 terminal-parity episode: `test-results/bl-001/terminal-parity/episode.json` with direct/integrated raw references (generated, ignored)
- BL-001 retained AC evidence: `project/work-items/5-bl-001-prove-a-host-code-server-workbench/implementation/00-implementation.md`
- BL-002 retained AC evidence: `project/work-items/7-bl-002-prove-host-native-terminal-parity/implementation/00-implementation.md`
- BL-003 retained comparison and browser events: project/work-items/9-bl-003-select-a-viable-browser-workbench-presentation/implementation/evidence/
- BL-003 retained terminal artifacts: `test-results/bl-003/raw/` (twelve comparison-referenced JSON files)
- BL-004 retained run: `project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence/853037e6-5dab-43cf-bcf8-61f1e8bbdb18/`
- Harnessability reports: `.harness/reports/harnessability/`
- Harness retrospectives: `.harness/records/retro/`

## Injection map
<!-- Where the repo's extant dev/SDD flow calls /eng-harness-flow. One row per seam.
     Filled by eng-harness-0-adopt Step 3 (with the user's go-ahead). -->

| Seam event | Fires from | What fires it |
|---|---|---|
| `pre-flight` | `.github/agents/rpiv.agent.md` | RPIV after feature-branch preparation and before Research |
| `pre-coding` | `.github/agents/rpiv.agent.md` | RPIV after Plan validation and before Implement |
| `coding` | `.github/agents/rpiv-implementer.agent.md` | Implementer runs `harness observe` when qualifying friction occurs |
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
