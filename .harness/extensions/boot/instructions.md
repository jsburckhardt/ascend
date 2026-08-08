# `harness boot` — agent briefing

## What this verb computes (the deterministic part)

Runs `harness checks`, which exercises the web scaffold through Playwright and
the API through Fastify injection. A successful envelope reports readiness,
proof mode, checks duration, the development start command, and the expected
web/API endpoints.

## Your role (the inference part)

Use `status: ok` as evidence that the checked-in scaffold and development
toolchain are ready. Run `just run` only when interactive development servers
are needed. Use `duration_ms` to classify readiness speed without relying on an
ambient timing utility.

## Watch out for

- This initial boot is test-backed and intentionally leaves no servers running.
- `duration_ms` measures the composed checks stage inside Boot.
- The listed endpoints become live only after `just run`.
- As project/workbench lifecycle behavior is implemented, replace test-backed
  readiness with a live health and smoke probe.
