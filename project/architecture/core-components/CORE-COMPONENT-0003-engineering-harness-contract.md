# CORE-COMPONENT-0003: Engineering Harness Contract

## Status

Adopted

## Purpose

Establish a single, consistent, evidence-recording operating surface for running Ascend's
supported engineering workflows. Contributors — human or agent — need one discoverable
entry point that wraps existing project commands, returns a uniform verdict, records
evidence that a workflow ran, and records the gaps an agent had to infer. This is a
cross-cutting concern because every contributor and every RPIV agent runs project
workflows, and without a shared contract each re-derives how to run them, with no uniform
result or audit trail.

## Scope

The `./harness` CLI and its supporting directory `.harness/` in the Ascend repository. The
contract governs how workflows are invoked, what verdicts they return, how evidence and
friction are recorded, and how agents must adopt the harness. It applies to all supported
workflows now and to workflows added by later stories. It does **not** own what the wrapped
commands do — `package.json` (and future task sources) remain the source of truth for
command behaviour; the harness wraps them.

The adoption *decision* is recorded in **ADR-0003**; this core-component defines the
*behavioural contract* that decision adopts.

## Definition

### Rules

- The supported operating surface is the executable `./harness` at the repository root.
  Humans and agents MUST prefer it over direct wrapped commands for supported verbs.
- The harness MUST implement these verbs: `help`, `orient`, `doctor`, `lint`, `test`,
  `build`, `boot`, `verify`, `status`, `clean`, `friction add`, `friction list`.
- The harness MUST **wrap existing project commands** and MUST NOT reimplement them or
  invent a new build system. A verb with no detectable command returns `unknown` (or a
  clearly-labelled inferred behaviour) and records a friction entry — it MUST NOT fabricate
  coverage.
- Every command MUST return exactly one verdict: `pass`, `fail`, `degraded`, or `unknown`.
  The process exit code MUST reflect the verdict (`pass` → 0; `fail` → non-zero;
  `degraded`/`unknown` → 0 by default so honest gaps do not break callers, unless
  `--strict` is requested).
- Every command MUST emit useful human-readable output. Important verbs (`orient`, `doctor`,
  `lint`, `test`, `build`, `boot`, `verify`, `status`, `clean`, `friction list`) MUST
  support `--json` output whose `verdict` field is one of the four verdicts.
- `verify` MUST coordinate the relevant available checks and MUST write an evidence file
  under `.harness/evidence/`, reporting the evidence path.
- Each inference MUST be recorded as a friction entry in `.harness/friction.jsonl` that
  answers the KEY_QUESTION: *"What did the agent have to infer that the harness should have
  proved?"*
- The harness MUST preserve existing project behaviour and remain dependency-light
  (portable shell; no packages required to run the harness itself).
- The harness MUST NOT record secrets, tokens, credentials, or private environment values
  in evidence, friction, or summaries.

### Interfaces

- **CLI:** `./harness <verb> [--json] [--strict] [args]`. `./harness help` lists verbs;
  `./harness orient` summarises the repo and contract.
- **Contract file:** `.harness/contract.yml` — machine-readable declaration of verbs, the
  command each wraps, whether it supports `--json`, and the evidence/friction paths.
- **Evidence:** `.harness/evidence/` — one timestamped JSON record per `verify` run plus a
  `latest.json` pointer; each record holds the verb, verdict, per-check results, and
  timestamps (no raw secret-bearing output).
- **Friction log:** `.harness/friction.jsonl` — JSON Lines; each line has at least
  `timestamp`, `verb`/`context`, `inference`, and `question` (the KEY_QUESTION).
- **Usage guide:** `.harness/README.md` — human-readable description of every verb and the
  supported human and agent workflows.

### Expectations

- Once `./harness` and `.harness/contract.yml` exist, agents MUST use `./harness` as the
  first-choice operating surface for supported verbs.
- Agents MAY call direct project commands only when the contract lacks the needed verb or
  the harness reports `unknown`/`degraded`; when they do, they MUST record the gap via
  `./harness friction add`.
- `AGENTS.md` and every `.github/agents/*.agent.md` require harness usage; those updates are
  idempotent and preserve existing agent behaviour.
- `.github/soft-factory/verification.yml` registers `./harness verify` as the RPIV Verify
  stage's verification command.
- The harness is generated, repaired, and verified via the `harness-cli-it` agent; `./harness
  verify` must pass before harness work is considered complete.

## Rationale

A single wrapping surface with a fixed verb set and four explicit verdicts gives humans and
agents a predictable contract regardless of the underlying tool. Recording evidence makes
runs auditable; recording friction makes missing proof explicit instead of silently
inferred. A dependency-light shell implementation honours ADR-0002 minimality and lets the
surface run on a clean checkout before `npm install`. Alternatives (ad-hoc npm scripts, a
Makefile/justfile, or a dependency-heavy Node CLI) were rejected in ADR-0003 because they
either lack the verdict/evidence/friction model or add tooling the project does not need.

## Usage Examples

```bash
# Discover supported workflows
./harness help
./harness orient

# Check the toolchain and environment
./harness doctor

# Install dependencies (wraps `npm install`)
./harness boot

# Run the full verification (wraps doctor + `npm run typecheck`), writing evidence
./harness verify
./harness verify --json

# Machine-readable status
./harness status --json

# Record a gap the harness could not prove
./harness friction add "no test command exists; had to infer test coverage is absent"
./harness friction list
```

## Integration Guidelines

How should other parts of the system integrate with this component?

- When a later story adds a project command (e.g. a real `lint`, `test`, or `build` script),
  update `./harness` and `.harness/contract.yml` to wrap it, changing the verb's verdict
  from `unknown` to a real check, and remove the corresponding friction entry.
- Register verification with the RPIV verifier through `.github/soft-factory/
  verification.yml` (`./harness verify`), not by hard-coding commands in the verifier.
- New repo-local agents (`.github/agents/*.agent.md`) MUST include the harness-usage rule so
  they prefer `./harness`.

## Exceptions

Under what circumstances is it acceptable to deviate from this component's rules?

- A verb whose underlying command genuinely does not exist yet MAY return `unknown` (or a
  clearly-labelled inferred result) — this is expected, not a violation, provided a friction
  entry is recorded.
- Agents MAY bypass the harness and call a direct command when the contract lacks the verb
  or reports `unknown`/`degraded`, provided they record friction via `./harness friction add`.
- One-off environment probes that the harness does not model MAY be run directly, but
  recurring workflows MUST be added to the harness rather than run ad hoc.

## Enforcement

How is compliance with this component verified?

- [x] Automated checks — `./harness verify` must report `pass` and write evidence; the
  RPIV Verify stage runs it via `.github/soft-factory/verification.yml`.
- [x] Code review checklist — reviewers confirm new commands are wrapped by the harness and
  that `AGENTS.md`/agent definitions still require harness usage.
- [x] Test coverage requirements — the harness self-test verbs (`help`, `doctor`, `verify`,
  `friction`) are exercised as part of Issue #4's test plan.

## Related ADRs

- [ADR-0003 — Adopt a repo-local engineering harness as the supported operating surface](../ADR/ADR-0003-adopt-engineering-harness.md)
- [ADR-0002 — Ascend baseline technology stack and repository layout](../ADR/ADR-0002-ascend-baseline-stack-and-layout.md)
