# `harness checks` — agent briefing

## What this verb computes (the deterministic part)

Runs the repository's canonical `just verify` quality gate: formatting, linting,
typechecking, unit tests, builds, and Playwright E2E tests. A successful envelope
contains the command, applied finite timeout, elapsed duration, and the last 20 lines of standard output. The default budget is 600,000 ms (10 minutes); set `ASCEND_HARNESS_VERIFY_TIMEOUT_MS` to an integer from 120,001 through 3,600,000 ms when a slower designated host needs a different finite bound.

## Your role (the inference part)

Treat `status: ok` as evidence that every configured gate passed. On an error,
`error.details` contains the last 20 lines from each non-empty standard-error and
standard-output stream, labeled in that order. If both streams are empty, it
contains an explicit exit-code diagnostic. Fix the first reported failing gate and
rerun `harness checks`; do not claim the change is ready from a partial or focused
test alone.

## Watch out for

- Failure details are bounded per stream but never empty; inspect both labeled
  excerpts.
- This command proves the configured repository gates, not unimplemented runtime
  behavior or acceptance criteria that lack a sensor.
- Playwright starts the web application only; API runtime readiness is separate
  until `harness boot` provides an aggregate readiness verdict.
