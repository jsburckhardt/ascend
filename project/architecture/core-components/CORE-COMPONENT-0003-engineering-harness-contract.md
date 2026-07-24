# CORE-COMPONENT-0003: Engineering harness contract, verdicts, and evidence/friction conventions

## Status

Adopted

> **Amended 2026-07-20 (issue #5, ADR-0004):** added **R17** (interactive/handoff
> verbs), the `mode` contract attribute, and the associated verdict/evidence
> exemption and regression-suite conventions.
>
> **Amended 2026-07-23 (issue #26, ADR-0007/ADR-0008):** added the friction
> record **`agent`** field (additive, `unknown` default/sentinel) and **R18**
> (agent attribution); added **R19** (code-server readiness is a required
> `doctor` check that FAILS when absent), which supersedes the R6 "`doctor` never
> fails the aggregate" note and DECISION-LOG #28 for the code-server case.

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
- The RPIV stage agents that run deterministic tasks through the harness:
  `rpiv-research`, `rpiv-planner`, `rpiv-implementer`, and `rpiv-verifier`. The `ship`
  orchestrator, `AGENTS.md`, and non-stage agents do not run the harness and carry no rule.
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

  `doctor` participates in the aggregate; because it emits `pass`/`degraded` for the
  Node/`node_modules` checks it can move the aggregate toward `degraded` but never
  `fail` for those checks. **Exception (R19, ADR-0008):** the code-server readiness
  check makes `doctor` emit `fail` when code-server is absent, which — via this same
  rule — makes the `verify` aggregate `fail`; this supersedes the earlier
  "`doctor` never fails the aggregate" statement (DECISION-LOG #28) for the
  code-server case only. In the Issue #4 baseline the members are
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
- **R10 — Idempotent agent-surface updates.** Only the RPIV stage agents — `rpiv-research`,
  `rpiv-planner`, `rpiv-implementer`, and `rpiv-verifier` — carry the harness-usage rule, and
  each such surface MUST contain exactly one harness-usage block delimited by
  `<!-- HARNESS:BEGIN -->` / `<!-- HARNESS:END -->`.
  The `ship` orchestrator, `AGENTS.md`, and non-stage agents MUST NOT carry the block.
  The block MUST live inside the surface's `<instructions>` section (immediately before its
  `</instructions>` tag) as one MUST/MAY directive per line, never as trailing prose after a
  closing section tag, so it conforms to the APS document flow.
  Re-running the update MUST replace only the content between the markers, MUST NOT
  duplicate the block, and MUST NOT alter any content outside the markers or change the
  agent's existing behaviour.
- **R11 — Stages prefer the harness, scoped to their role.** Only the RPIV **stage** agents run
  the harness (the `ship` orchestrator does not; it dispatches stages and each stage runs the
  harness itself). Each stage MUST use `./harness` as the first-choice surface for supported
  verbs, and each stage's block MUST name only the verbs relevant to its role — research/plan
  use read-only verbs (`orient`/`doctor`/`status`) and MUST NOT run execution verbs; implement
  runs `lint`/`test`/`build`/`boot`/`verify`/`clean`; verify runs the `verify` gate. A stage MAY
  bypass to a direct command only when the contract lacks the verb or the harness reports
  `unknown`/`degraded` — and MUST log that gap via `./harness friction add`.
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
- **R17 — Interactive/handoff verbs (`mode: exec`).** A verb whose backing command is a
  long-running, interactive process (e.g. a dev watch or a serve loop) MUST NOT be run to
  completion by the run-once capability handler — doing so would block indefinitely and never
  return a verdict. Such a verb MUST be declared in `.harness/contract.yml` with the attribute
  **`mode: exec`** (data-driven, R8). Absence of `mode` — or `mode: capability` — selects the
  default run-to-completion capability behavior, so every pre-existing verb is unchanged.
  A `mode: exec` verb MUST:
  1. **Hand off via `exec`.** When its `maps_to` is a command, it MUST replace the harness
     process with the wrapped command (`cd "$ROOT" && exec sh -c "$maps_to"`), so the harness
     never runs the command to completion and never blocks. The wrapped command's exit code
     becomes the process exit code.
  2. **Be verdict/evidence-exempt.** Because it hands off, it is EXEMPT from R2 (single
     `Verdict:` verdict), from the R3 verdict→exit-code mapping (it propagates the exec'd
     command's exit code instead), and from R5 (evidence). It MUST NOT be required to emit
     `pass`/`fail`/`degraded`/`unknown`.
  3. **Stay honest when unmapped.** When its `maps_to` is `null`/`native`/empty, it MUST behave
     like an unmapped capability verb — verdict `unknown`, exit 0, and a friction entry
     answering the KEY_QUESTION (R4/R9). It MUST NOT `exec` anything in that case.
  4. **Expose a non-exec introspection form.** It MUST provide a way to resolve and report its
     wrapped command and `mode` WITHOUT executing it, exiting 0: `--print` MUST print the
     resolved command in human form, and `--json` MUST print a JSON descriptor containing at
     least `harness_version`, `verb`, `timestamp`, `mode` (`"exec"`), `maps_to`, and
     `interactive: true` (and, being verdict-exempt, MUST omit `verdict`). Neither form may
     `exec`.
  5. **Be excluded from run-to-completion enumeration.** The regression suite's
     "one `Verdict:` line per verb" enumeration (R16) MUST NOT `exec` a `mode: exec` verb; it
     MUST instead assert the verb's non-exec introspection form resolves the expected command
     and exits without hanging.
  `help`, `orient`, and `status` MUST represent handoff verbs honestly (listed as interactive,
  emitting no verdict); the automatic verb count includes them.
- **R18 — Friction agent attribution (ADR-0007).** Every friction record MUST identify exactly
  one responsible **`agent`**. The record schema carries an `agent` string field, **appended
  after `severity`**, that is **additive and backward-compatible** (R7/R8): no existing key is
  renamed, removed, or reordered, and existing `--json`/test consumers keep working. The
  sentinel **`unknown`** is the single distinct value for "no agent / legacy / internal"
  friction: a record with no `agent` field on read (every legacy record, and any record written
  without attribution) MUST be interpreted as `unknown`, and there is NO on-disk backfill.
  `./harness friction add` MUST accept an **`--agent <name>` flag** (NOT positional); when it is
  omitted the field defaults to `unknown`. The internal auto-recorder (`ensure_friction`, R4)
  MUST write `agent: "unknown"` and MUST keep deduping by `verb` ONLY (no agent-aware dedupe).
  Each RPIV stage agent MUST self-attribute by passing its own name via `--agent` in its
  `<!-- HARNESS:BEGIN -->` block; because the `.agent.md` files are APS artifacts, that block
  is changed **through the APS agent** (`.github/agents/aps-v1.2.2.agent.md`, generate + lint),
  not by hand-editing markers, while preserving the R10-idempotent result. A per-agent view is
  obtained by filtering `friction list` on `agent`; no persistent improvement store or new verb
  is added.
- **R19 — code-server readiness is a required `doctor` check that FAILS when absent
  (ADR-0008).** `doctor` MUST probe editor-provider (code-server) presence (e.g. `command -v
  code-server`, with a testability seam that lets the regression suite control the probe target
  deterministically). When code-server is **present** the check contributes `pass`; when it is
  **absent** `doctor` MUST return **`fail`** (exit non-zero), NOT `degraded`, because code-server
  is a REQUIRED dependency for a stable environment. This is an explicit exception to the R6
  "`doctor` never fails the aggregate" note and **supersedes DECISION-LOG #28 and the ADR-0006
  §7 documented-but-absent-prerequisite stance** for the code-server case. Because `doctor` is a
  `verify.aggregate` member (R6), a failing `doctor` makes `./harness verify` `fail` with no
  aggregate-logic change. The Node/`node_modules` checks are unchanged (still `degraded`, never
  `fail`, per R15 / Decision #61); only the code-server check is fail-when-absent. A stable
  environment MUST provision code-server (e.g. in `.devcontainer/devcontainer.json`) so `verify`
  can pass.

### Interfaces

- **CLI:** `./harness <verb> [--json] [args]` with verbs `help`, `orient`, `doctor`,
  `lint`, `test`, `build`, `boot`, `verify`, `status`, `clean`, `friction add`,
  `friction list`, and interactive/handoff verbs (e.g. `dev`) declared with `mode: exec`
  (R17). A handoff verb also accepts `--print` (non-exec introspection).
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
    dev:
      maps_to: "npm run dev"         # wrapped command handed off via exec
      mode: exec                     # interactive/handoff verb (R17); default (absent) = capability
      json: true
      description: "Start the local dev inner loop (interactive handoff; execs npm run dev)"
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
    "severity": "info",
    "agent": "unknown"
  }
  ```
  Required fields: `ts`, `verb`, `key_question` (verbatim KEY_QUESTION), `inference`,
  `proof_gap`, `suggested_closure`. The **`agent`** field (R18, ADR-0007) is appended after
  `severity`; it is additive and backward-compatible — a record with no `agent` field on read
  is interpreted as the `unknown` sentinel. `./harness friction add --agent <name>` sets it;
  omitting `--agent` (and the internal `ensure_friction` auto-recorder) yields `agent: "unknown"`.

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
- Interactive/handoff verbs (`mode: exec`, e.g. `dev`) hand off the process via `exec` and are
  verdict/evidence-exempt (R17); they are invoked directly (`./harness dev`) and introspected
  non-destructively via `--print`/`--json`. `boot` is NOT a handoff verb at this baseline: it
  stays `unknown` and is owned by issue #6 (app-serve + health).

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

# Record and read a gap the harness could not prove (self-attributed via --agent)
./harness friction add --agent rpiv-research --verb test \
  --inference "No test runner exists" \
  --proof-gap "No npm test script or test files" \
  --suggested-closure "Wire test verb in contract.yml when #5 lands"
./harness friction list --json          # each entry carries an "agent" field ("unknown" if omitted)
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
  in both human (terminal `Verdict:` line) and `--json` form (except `mode: exec` handoff verbs,
  which are verdict/evidence-exempt per R17 and instead hand off via `exec` and expose a non-exec
  `--print`/`--json` introspection form); exit-code contract honoured; wrapped commands and
  aggregate members come only from `contract.yml` (no hard-coded wiring); friction entries answer
  the KEY_QUESTION verbatim; each RPIV stage agent has exactly one marker-delimited harness block
  and ship/non-stage agents have none; no reimplemented/faked commands.
- [x] Test coverage requirements — every task in 02-task-breakdown.md that touches the
  contract, verdicts, JSON, evidence, friction, or agent surfaces carries explicit test
  coverage in 03-test-plan.md.

## Related ADRs

- [ADR-0003-repo-local-engineering-harness](../ADR/ADR-0003-repo-local-engineering-harness.md)
- [ADR-0004-interactive-handoff-verbs](../ADR/ADR-0004-interactive-handoff-verbs.md)
- [ADR-0002-ascend-baseline-stack-and-layout](../ADR/ADR-0002-ascend-baseline-stack-and-layout.md)
- [ADR-0007-agent-attributed-friction-and-issue-scoped-retrospect](../ADR/ADR-0007-agent-attributed-friction-and-issue-scoped-retrospect.md)
- [ADR-0008-doctor-code-server-readiness-required](../ADR/ADR-0008-doctor-code-server-readiness-required.md)
- [CORE-COMPONENT-0002-commit-standards](./CORE-COMPONENT-0002-commit-standards.md)
