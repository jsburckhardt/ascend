# CORE-COMPONENT-0003: Engineering harness contract, verdicts, and evidence/friction conventions

## Status

Adopted

## Purpose

ADR-0003 adopts `./harness` as the mandatory operating surface for humans and agents.
Beyond the *decision to adopt* a harness, the harness defines a **reusable, cross-cutting
behavioural contract** that other agents and skills consume and that must remain stable as
later stories wire in real commands. The `pr-review-complement` skill already invokes
`./harness orient` and `./harness verify --json` and branches on their verdicts; more skills
and agents will follow. This core-component captures that shared contract — the verb
surface, verdict semantics, `--json` schema, evidence/friction record conventions, the
KEY_QUESTION friction rule, and the idempotent agent-surface update rule — so it is stable,
enforceable, and identical across every consumer.

## Scope

Applies to:

- The `./harness` executable and everything under `.harness/` (`contract.yml`,
  `evidence/`, `friction.jsonl`, `README.md`).
- Every agent surface that must route through the harness: `AGENTS.md` and every
  `.github/agents/*.agent.md`.
- Every skill or tool that consumes harness verdicts or JSON output (e.g.
  `pr-review-complement`).
- `.github/soft-factory/verification.yml` where it references the harness.

Out of scope: the *choice* to adopt the harness and its alternatives (that is ADR-0003);
the concrete backing commands for verbs that do not exist yet (those arrive with #5/#6 by
editing `contract.yml` data).

## Definition

### Rules

- **R1 — Wrap, never reimplement.** A verb MUST wrap an existing project command when one
  exists and MUST NOT reimplement it or introduce a new build system (per ADR-0002).
- **R2 — Single verdict.** Every verb MUST return exactly one verdict:
  `pass` | `fail` | `degraded` | `unknown`.
  - `pass` — the wrapped command ran and succeeded.
  - `fail` — the wrapped command ran and failed.
  - `degraded` — the capability is partially available or partially proven (e.g. an
    aggregate whose sub-checks include `unknown`).
  - `unknown` — no backing command exists to prove the capability; it is not faked.
- **R3 — Exit-code contract.** `fail` MUST exit non-zero (1). `pass`, `degraded`, and
  `unknown` MUST exit 0. A not-yet-present capability MUST NOT read as a failure; only a
  real failing wrapped command does.
- **R4 — Honest gaps produce friction.** Whenever a verb returns `unknown` or `degraded`
  because a backing command is missing, the harness MUST record a friction entry answering
  the KEY_QUESTION.
- **R5 — `verify` writes evidence.** `verify` MUST write a timestamped evidence record under
  `.harness/evidence/` on every run and reference that path in its output.
- **R6 — `verify` aggregation policy.** `verify`'s overall verdict is `fail` if any wrapped
  check fails; else `degraded` if any required capability is `unknown`/`degraded`; else
  `pass`.
- **R7 — `--json` is stable.** Every machine-facing verb MUST support `--json` emitting the
  JSON schema below; the schema is a stable contract and MUST NOT break existing keys.
- **R8 — Data-driven verbs.** Verb-to-command mappings live in `.harness/contract.yml`.
  Adding or wiring a verb MUST be possible by editing that data, without restructuring the
  harness.
- **R9 — KEY_QUESTION rule.** Every friction record MUST answer verbatim:
  **"What did the agent have to infer that the harness should have proved?"**
- **R10 — Idempotent agent-surface updates.** Each agent surface MUST contain exactly one
  harness-usage block delimited by `<!-- HARNESS:BEGIN -->` / `<!-- HARNESS:END -->`.
  Re-running the update MUST replace only the content between the markers, MUST NOT
  duplicate the block, and MUST NOT alter any content outside the markers or change the
  agent's existing behaviour.
- **R11 — Agents prefer the harness.** Agents MUST use `./harness` as the first-choice
  surface for supported verbs and MAY bypass to a direct command only when the contract
  lacks the verb or the harness reports `unknown`/`degraded` — and MUST log that gap via
  `./harness friction add`.
- **R12 — Dependency-light & portable.** The harness MUST run as a portable POSIX shell
  script adding no new runtime dependency.
- **R13 — VCS policy.** `.harness/contract.yml`, `.harness/README.md`, and
  `.harness/friction.jsonl` are committed. `.harness/evidence/` run output is git-ignored;
  the directory is retained via a committed `.gitkeep`.

### Interfaces

- **CLI:** `./harness <verb> [--json] [args]` with verbs `help`, `orient`, `doctor`,
  `lint`, `test`, `build`, `boot`, `verify`, `status`, `clean`, `friction add`,
  `friction list`.
- **Contract file** `.harness/contract.yml` (data-driven declaration):

  ```yaml
  version: 1
  entrypoint: ./harness
  verbs:
    verify:
      maps_to: "npm run typecheck"   # wrapped command, or "native", or null
      json: true
      description: "Aggregate static verification gate"
    test:
      maps_to: null                  # null => verdict unknown, friction recorded
      json: true
      description: "Run the test suite (none present yet)"
    # ...one entry per required verb...
  evidence:
    dir: ".harness/evidence"
    format: "json"
  friction:
    path: ".harness/friction.jsonl"
    key_question: "What did the agent have to infer that the harness should have proved?"
  ```

- **JSON output schema** (emitted by any verb invoked with `--json`):

  ```json
  {
    "harness_version": "1",
    "verb": "verify",
    "verdict": "degraded",
    "timestamp": "2026-07-20T07:20:35Z",
    "checks": [
      { "name": "typecheck", "maps_to": "npm run typecheck", "verdict": "pass", "exit_code": 0 },
      { "name": "test", "verdict": "unknown", "reason": "no test command detected" }
    ],
    "evidence": ".harness/evidence/verify-20260720T072035Z.json",
    "notes": "test, lint, and build are unknown until Issue #5"
  }
  ```
  Required keys on every JSON response: `harness_version`, `verb`, `verdict`, `timestamp`.
  Aggregate verbs (e.g. `verify`) MUST include `checks`; verbs that write evidence MUST
  include `evidence`.

- **Friction record schema** (one JSON object per line in `.harness/friction.jsonl`):

  ```json
  {
    "ts": "2026-07-20T07:20:35Z",
    "verb": "test",
    "key_question": "What did the agent have to infer that the harness should have proved?",
    "inference": "There is no test runner or test script; the test verb returns unknown.",
    "proof_gap": "No `npm test` script and no test files exist in the repo.",
    "suggested_closure": "Issue #5 adds dev/validation commands; wire the test verb in contract.yml.",
    "severity": "info"
  }
  ```
  Required fields: `ts`, `verb`, `key_question` (verbatim KEY_QUESTION), `inference`,
  `proof_gap`, `suggested_closure`.

### Expectations

- Consumers read `verdict` (and, for aggregates, `checks[].verdict`) rather than parsing
  human text.
- `unknown`/`degraded` are normal, expected states in the Issue #4 baseline and MUST NOT be
  treated as failures.
- New verbs added later reuse this schema; they do not invent per-verb output shapes.
- The seed `.harness/friction.jsonl` created in Issue #4 contains one entry per verb that is
  `unknown`/`degraded` (`lint`, `test`, `build`, `boot`, `clean`, and `verify`'s degraded
  aggregate), each answering the KEY_QUESTION.

## Rationale

A shared verdict vocabulary plus a stable JSON schema lets any agent or skill consume the
harness deterministically — which `pr-review-complement` already assumes. Making verbs
data-driven (`contract.yml`) means later stories add capability by editing data, preventing
contract churn. The KEY_QUESTION friction rule turns every honest gap into a tracked,
closable record instead of an invisible assumption. The exit-code contract ensures CI and
the verifier are not tripped by capabilities that legitimately do not exist yet, while still
catching real failures. Marker-delimited idempotent edits make the 17-surface rewrite safe
and re-runnable. Portable POSIX shell honours the dependency-light and no-build-system
constraints of ADR-0002 and PRD §28.7.

## Usage Examples

```bash
# Human: discover the supported workflows
./harness help
./harness orient

# Agent: orient before editing, then verify (machine-readable)
./harness orient --json
./harness verify --json      # verdict: degraded (typecheck passes; test/lint/build unknown)

# A verb with no backing command is honest, not fake
./harness test               # verdict: unknown, exit 0, friction recorded
./harness test --json        # { "verb": "test", "verdict": "unknown", ... }

# Record and read a gap the harness could not prove
./harness friction add --verb test \
  --inference "No test runner exists" \
  --proof-gap "No npm test script or test files" \
  --suggested-closure "Wire test verb in contract.yml when #5 lands"
./harness friction list --json
```

Example `.github/soft-factory/verification.yml` wiring:

```yaml
verification:
  - name: harness-verify
    command: "./harness verify"
```

## Integration Guidelines

How should other parts of the system integrate with this component?

- Skills and agents MUST invoke supported workflows via `./harness <verb>` and read the
  `verdict` (from `--json` when programmatic).
- A consumer MAY fall back to a direct command **only** when `./harness` is absent, the
  contract lacks the verb, or the verb reports `unknown`/`degraded`; on bypass it MUST call
  `./harness friction add`.
- `.github/soft-factory/verification.yml` SHOULD reference `./harness verify` so the Verify
  stage routes through the single operating surface; the exit-code contract keeps
  `degraded`/`unknown` non-blocking.
- When a new backing command becomes available, wire it by editing the verb's `maps_to` in
  `.harness/contract.yml` (data), then remove/close the corresponding friction entry.

## Exceptions

Under what circumstances is it acceptable to deviate from this component's rules?

- A consumer MAY bypass the harness to a direct command when the harness is absent, the verb
  is missing from the contract, or the verb reports `unknown`/`degraded` — provided the gap
  is logged via `./harness friction add` (R11).
- A verb MAY remain `unknown` indefinitely while no backing command exists; this is expected,
  not a defect, as long as a friction entry exists (R4).
- Non-machine-facing convenience output (e.g. `help`) is exempt from the `--json` schema
  requirement.

## Enforcement

How is compliance with this component verified?

- [x] Automated checks — `./harness verify --json` must return a valid schema and a
  non-`fail` verdict; a schema/verdict check and an agent-surface idempotency check are
  part of the test plan (03-test-plan.md).
- [x] Code review checklist — reviewers confirm: verbs return one of the four verdicts;
  exit-code contract honoured; friction entries answer the KEY_QUESTION verbatim; each agent
  surface has exactly one marker-delimited harness block; no reimplemented/faked commands.
- [x] Test coverage requirements — every task in 02-task-breakdown.md that touches the
  contract, verdicts, JSON, evidence, friction, or agent surfaces carries explicit test
  coverage in 03-test-plan.md.

## Related ADRs

- [ADR-0003-repo-local-engineering-harness](../ADR/ADR-0003-repo-local-engineering-harness.md)
- [ADR-0002-ascend-baseline-stack-and-layout](../ADR/ADR-0002-ascend-baseline-stack-and-layout.md)
- [CORE-COMPONENT-0002-commit-standards](./CORE-COMPONENT-0002-commit-standards.md)
