# Documentation

This directory contains application-specific documentation such as API references, user guides, deployment instructions, and operational runbooks.

Add documentation here as the application evolves.

## Prototype 0 evidence

- [Startup and resource measurements](prototype-0/startup-and-resource-measurements.md)
  — real captured startup command + duration, one-session idle memory + CPU,
  editor version + storage locations, and restart/invalid-path/crash behaviour
  for a single `code-server` session launched through `./harness edit` (issue
  #9; governed by ADR-0006).
- [Prototype 0 decision record](prototype-0/decision-record.md)
  — the mandatory Prototype 0 continue/change/stop decision record (PRD §28.2)
  consolidating the #3–#9 evidence: findings, measurements, demo notes, problems
  encountered, assumptions disproved, the Prototype 0 architecture decisions
  (ADR-0002..0006), a next-step recommendation, and an explicit decision (issue
  #10).

For project management documentation (architecture decisions, core-components, and per-issue pipeline artifacts), see the [`project/`](../project/) directory.
