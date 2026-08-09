# Engineering harness

> **AGENTS START HERE → `harness instructions`** — the CLI's baked agent
> briefing (envelope contract, role split, discovery loop). Then
> `harness instructions <verb>` per verb.

## Boot command

`harness boot` runs the canonical checks and returns a test-backed readiness
envelope with the development command and expected endpoints. It leaves no
development servers running.

## Checks command

`harness checks` wraps the root `just verify` recipe and gates formatting, linting,
typechecking, unit tests, builds, and Playwright E2E tests. On the designated host, the gate includes five bounded fake BL-001 failures and one real code-server Chromium lifecycle with exact-handle cleanup.

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
- API root test: in-process health interaction and JSON consequence
- Project-home Playwright test: browser interaction and visible UI consequence
- BL-001 host-process sensor: one real loopback code-server process tree, Explorer and Markdown Preview consequence, and zero-leak cleanup audit

## Evidence paths

- Harness command envelopes: standard output
- Unit coverage: `apps/*/coverage/`
- Playwright artifacts: `test-results/` and `playwright-report/`
- BL-001 machine episode: `test-results/bl-001/episode.json` (generated, ignored)
- BL-001 retained AC evidence: `project/work-items/5-bl-001-prove-a-host-code-server-workbench/implementation/00-implementation.md`
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
- SQLite has no supported migrate, fixture, reset, or consequence-check command.
- Architecture contracts beyond the BL-001 host-process lifecycle are not yet executable checks.
- No tracked CI workflow proves equivalence with the local `just verify` gate.

## Current maturity snapshot
**L3 — the improvement loop is active: boot/checks are proven, a committed retro
entry has been encoded, and harness-change records preserve the trajectory.**
<!-- The single, current L0–L4 level the harness is ACTUALLY at. Updated ONLY at
     the Improve beat (never by boot, which is read-only). See maturity-assessment.md. -->
