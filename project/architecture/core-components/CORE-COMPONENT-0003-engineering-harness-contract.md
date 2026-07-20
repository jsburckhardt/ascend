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
- The harness-consuming agents that must route through the harness: the `ship` orchestrator
  and the `rpiv-research`, `rpiv-planner`, `rpiv-implementer`, and `rpiv-verifier` pipeline
  agents. `AGENTS.md` and non-consuming agents do not run the harness and carry no rule.
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
- **R2 — Single verdict (human and JSON).** Every verb MUST return exactly one overall
  verdict: `pass` | `fail` | `degraded` | `unknown`. This applies to BOTH output forms and
  admits NO exemption: the `--json` response carries it in the `verdict` key, and the
  human/default form MUST print exactly one terminal `Verdict: <value>` line. `help` and
  `friction list` are NOT exempt — each MUST print `Verdict: pass`.
  - `pass` — the wrapped command ran and succeeded.
  - `fail` — the wrapped command ran and failed, OR a required record could not be persisted
    (R14).
  - `degraded` — the capability is partially available or partially proven (e.g. an
    aggregate whose members include `unknown`).
  - `unknown` — no backing command exists to prove the capability; it is not faked.
- **R3 — Exit-code contract.** `fail` MUST exit non-zero (1). `pass`, `degraded`, and
  `unknown` MUST exit 0. A not-yet-present capability MUST NOT read as a failure; only a
  real failing wrapped command does.
- **R4 — Honest gaps produce friction.** Whenever a verb returns `unknown` or `degraded`
  because a backing command is missing, the harness MUST record a friction entry answering
  the KEY_QUESTION.
- **R5 — `verify` writes evidence.** `verify` MUST write a timestamped evidence record under
  `.harness/evidence/` on every run and reference that path in its output.
- **R6 — `verify` aggregation is data-driven and deterministic.** `verify` MUST derive its
  overall verdict by iterating the contract-declared member checks — its own `maps_to`
  (surfaced as the `typecheck` check) plus every verb listed in `verify.aggregate`
  (`lint`, `test`, `build`, `doctor`) — resolving each member's verdict from contract data
  at runtime. It MUST NOT hard-code the member list or the per-member verdicts. The overall
  verdict is a fixed total function of the member verdicts, evaluated in this order:
  1. If ANY member is `fail` → `fail`.
  2. Else if EVERY member is `pass` → `pass`.
  3. Else if EVERY member is `unknown` → `unknown`.
  4. Otherwise (a mix of `pass`/`degraded`/`unknown` with no `fail`) → `degraded`.

  `doctor` participates in the aggregate; because it only emits `pass`/`degraded` it can move
  the aggregate toward `degraded` but never `fail`. In the Issue #4 baseline the members are
  typecheck=`pass`, lint/test/build=`unknown`, doctor=`pass`/`degraded`, so the aggregate is
  `degraded`; once #5 populates `lint`/`test`/`build` `maps_to` and they pass (doctor
  healthy), the SAME rule yields `pass` with no code change.
- **R7 — `--json` is stable.** Every machine-facing verb MUST support `--json` emitting the
  JSON schema below; the schema is a stable contract and MUST NOT break existing keys.
- **R8 — Data-driven verbs (no hard-coded command wiring).** Verb-to-command mappings live
  ONLY in `.harness/contract.yml`. The harness MUST NOT embed any hard-coded verb→command
  string: every wrapped command it runs MUST be read from that verb's `maps_to` at runtime,
  and the `verify` aggregate's members MUST be read from `verify.aggregate`. A structural
  dispatch that routes a verb name to its handler function is permitted (that is dispatch
  mechanics, not command wiring). Every command-capable verb MUST honor its `maps_to`: a
  command string is wrapped (→ `pass`/`fail`), `native` selects the harness-native behavior,
  and `null` yields `unknown` + friction (R4). In particular `clean` MUST honor
  `clean.maps_to` and run a mapped clean command rather than ignoring it. Adding or rewiring
  any verb — moving `unknown`→`pass`, or wiring `clean` — MUST be possible by editing
  contract data alone, with NO change to `./harness`.
- **R9 — KEY_QUESTION rule.** Every friction record MUST answer verbatim:
  **"What did the agent have to infer that the harness should have proved?"**
- **R10 — Idempotent agent-surface updates.** Only the harness-consuming agents — the `ship`
  orchestrator and the `rpiv-research`, `rpiv-planner`, `rpiv-implementer`, and `rpiv-verifier`
  pipeline agents — carry the harness-usage rule, and each such surface MUST contain exactly one
  harness-usage block delimited by `<!-- HARNESS:BEGIN -->` / `<!-- HARNESS:END -->`.
  `AGENTS.md` and non-consuming agents MUST NOT carry the block.
  The block MUST live inside the surface's `<instructions>` section (immediately before its
  `</instructions>` tag) as one MUST/MAY directive per line, never as trailing prose after a
  closing section tag, so it conforms to the APS document flow.
  Re-running the update MUST replace only the content between the markers, MUST NOT
  duplicate the block, and MUST NOT alter any content outside the markers or change the
  agent's existing behaviour.
- **R11 — Consuming agents prefer the harness, scoped to their role.** The harness-consuming
  agents (the `ship` orchestrator and the `rpiv-*` pipeline agents) MUST use `./harness` as the
  first-choice surface for supported verbs, and each agent's block MUST name only the verbs
  relevant to its role — research/plan use read-only verbs (`orient`/`doctor`/`status`) and MUST
  NOT run execution verbs; implement runs `lint`/`test`/`build`/`boot`/`verify`/`clean`; verify
  runs the `verify` gate. Agents MAY bypass to a direct command only when the contract
  lacks the verb or the harness reports `unknown`/`degraded` — and MUST log that gap via
  `./harness friction add`.
- **R12 — Dependency-light, portable, POSIX-only.** The harness MUST run as a portable POSIX
  shell script adding no new runtime dependency, and MUST use only POSIX-specified
  `sh`/`sed`/`awk`/`printf` constructs. It MUST NOT rely on GNU-only extensions; in
  particular JSON string escaping MUST NOT use GNU-only sed idioms such as the `:a;N;$!ba`
  label loop or `\n` newline matching in a regex. Escaping MUST use POSIX-defined behavior
  (e.g. an `awk` routine) that correctly encodes `"`, `\`, tab, newline, and other control
  characters. Portability MUST be validated on a non-GNU userland (e.g. busybox `sh` + busybox
  `sed`/`awk`) using multiline and control-character inputs.
- **R13 — VCS policy.** `.harness/contract.yml`, `.harness/README.md`, and
  `.harness/friction.jsonl` are committed. `.harness/evidence/` run output is git-ignored;
  the directory is retained via a committed `.gitkeep`.
- **R14 — Reliable, collision-safe persistence.** Any record a verb is contractually required
  to store MUST be persisted reliably:
  - **Collision-safe names.** Evidence filenames MUST be unique even for runs within the same
    wall-clock second — the name MUST include a uniqueness component beyond second precision
    (e.g. process id plus a random or monotonic suffix). Overlapping runs MUST NOT overwrite
    one another's records.
  - **Atomic, checked writes.** Directory creation, evidence writes, and friction appends MUST
    be checked for success. Evidence MUST be written atomically (write to a temp file on the
    same filesystem, then rename into place) so no partial or truncated record is ever
    observed.
  - **Required-persistence failure ⇒ `fail`.** When a REQUIRED record cannot be stored — a
    `verify` evidence record (R5), a `friction add` append, or the R4-mandated friction entry
    for an `unknown`/`degraded` verdict — the verb MUST return `fail` and exit non-zero. It
    MUST NOT report `pass`/`degraded`/`unknown` after a required persistence failure.
- **R15 — Environment checks validate the full supported range.** `doctor` (and any env probe)
  MUST validate the COMPLETE supported Node range derived from `package.json` `engines.node`
  (`>=22 <23`) and cross-checked against `.nvmrc` (pinned major `22`) — i.e. exactly major
  `22`. BOTH bounds MUST be enforced: a below-range Node (`<22`) and an above-range Node
  (`>=23`) MUST each be reported as unsupported (`degraded`), never `pass`. `doctor` MUST NOT
  pass any Node whose major is outside the supported range.
- **R16 — Executable regression suite.** The harness MUST ship a durable, executable regression
  suite (dependency-light POSIX shell, e.g. `tests/harness/`) that exercises every verb, the
  `--json` schema, the `verify` aggregate truth table, the Node-range boundaries, evidence
  collision-safety and atomicity, required-persistence-failure `fail` behavior, and non-GNU
  portability. The suite MUST run non-interactively, leave the working tree clean, and exit
  non-zero on any failure.

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
      aggregate: [lint, test, build, doctor]  # member verbs folded into the verify verdict (R6)
      description: "Aggregate static verification gate"
    test:
      maps_to: null                  # null => verdict unknown, friction recorded
      json: true
      description: "Run the test suite (none present yet)"
    clean:
      maps_to: native                # native prunes harness evidence; set a command to wrap it (R8)
      json: true
      description: "Remove harness-owned artifacts, or wrap a mapped clean command"
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
      { "name": "lint", "verdict": "unknown", "reason": "no lint command detected" },
      { "name": "test", "verdict": "unknown", "reason": "no test command detected" },
      { "name": "build", "verdict": "unknown", "reason": "no build command detected" },
      { "name": "doctor", "verdict": "pass" }
    ],
    "evidence": ".harness/evidence/verify-20260720T072035Z-4821-a3f9.json",
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
- The `verify` aggregate iterates the contract-declared members (`verify.aggregate`, including
  `doctor`); populating `lint`/`test`/`build` `maps_to` in a later story moves the aggregate to
  `pass` with no code change, and the same derivation rule applies unchanged (R6).
- Evidence filenames are collision-safe (unique even within the same second) and written
  atomically; a required record that cannot be persisted yields `fail`, never a masked
  `pass`/`degraded`/`unknown` (R14).
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
catching real failures. Marker-delimited idempotent edits make the consumer-scoped rewrite
safe and re-runnable. Portable POSIX shell honours the dependency-light and no-build-system
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

- [x] Automated checks — a durable executable regression suite (R16, `tests/harness/`) runs
  every verb, the `--json` schema check, the `verify` aggregate truth table, the Node-range
  boundaries, evidence collision-safety/atomicity, required-persistence-failure `fail`
  behavior, and non-GNU portability; `./harness verify --json` must return a valid schema and
  a non-`fail` verdict; an agent-surface idempotency check is included (03-test-plan.md).
- [x] Code review checklist — reviewers confirm: every verb returns one of the four verdicts
  in both human (terminal `Verdict:` line) and `--json` form; exit-code contract honoured;
  wrapped commands and aggregate members come only from `contract.yml` (no hard-coded wiring);
  friction entries answer the KEY_QUESTION verbatim; each consuming agent surface has exactly one
  marker-delimited harness block and non-consumers have none; no reimplemented/faked commands.
- [x] Test coverage requirements — every task in 02-task-breakdown.md that touches the
  contract, verdicts, JSON, evidence, friction, or agent surfaces carries explicit test
  coverage in 03-test-plan.md.

## Related ADRs

- [ADR-0003-repo-local-engineering-harness](../ADR/ADR-0003-repo-local-engineering-harness.md)
- [ADR-0002-ascend-baseline-stack-and-layout](../ADR/ADR-0002-ascend-baseline-stack-and-layout.md)
- [CORE-COMPONENT-0002-commit-standards](./CORE-COMPONENT-0002-commit-standards.md)
