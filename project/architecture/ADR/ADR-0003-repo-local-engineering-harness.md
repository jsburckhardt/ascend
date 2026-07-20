# ADR-0003: Adopt a repo-local engineering harness (`./harness`) as the operating surface for humans and agents

## Status

Accepted

## Context

Contributors and agents currently operate the Ascend repository through ad-hoc,
memorised, directly-invoked commands. Today there is effectively **one** verifiable
project command — `npm run typecheck` (`tsc --noEmit`) — plus the documented setup step
`npm install` (ADR-0002). There is no single discoverable entry point that lists the
supported workflows, no test/lint/build/boot/clean command yet, no machine-readable
statement of "what this repo supports and how to run it", no evidence trail proving a
command ran and what its result was, and no structured place to record the gap between
"what an agent had to infer" and "what the repo should have proved".

Issue #4 runs the `harness-cli-it` agent to close that gap by generating a repo-local
engineering harness CLI (`./harness`). This is **not** mere tooling plumbing: the harness
is mandated to become **the supported operating surface for humans and agents**, and to
rewrite `AGENTS.md` and **every** `.github/agents/*.agent.md` so that agents MUST prefer
`./harness` over calling wrapped commands directly. It also introduces a durable
behavioural contract (`.harness/contract.yml`), a verdict model
(`pass`/`fail`/`degraded`/`unknown`), an evidence store (`.harness/evidence/`), and a
friction log (`.harness/friction.jsonl`). The `pr-review-complement` skill already branches
on `if ./harness exists` and invokes `./harness orient` and `./harness verify --json`, so
the contract is an already-referenced integration surface.

Changing how every contributor and agent operates the repository — and adding a
machine-readable contract that other skills depend on — is a foundational, cross-cutting,
hard-to-reverse decision that belongs in an ADR rather than being made implicitly by
running an agent. This decision is constrained by:

- **ADR-0002** — the stack is TypeScript + Node.js 22 + npm; `npm install` is the single
  documented setup entry point; there is deliberately **no build/emit step** (`tsc` is
  `noEmit`); speculative frameworks and new build pipelines "beyond `tsc`" are forbidden.
- **PRD §5.5 (Start with prototypes)** and **§28.7 (Avoid speculative frameworks)** — the
  harness must stay minimal, dependency-light, honest, and reversible.

The harness must therefore be a **thin, honest façade** over what already exists: it wraps
`npm install` / `npm run typecheck`, and reports `unknown` or `degraded` for capabilities
that do not exist yet rather than fabricating them. Per `.github/fleet/sketch.md`, #4 lands
after bootstrap (#3) and before the dev/validation story (#5), so the harness starts life
mostly wrapping `typecheck`/`install` and honestly reporting `unknown` for verbs whose
backing commands do not exist yet.

## Decision

Adopt a **repo-local engineering harness** rooted at the executable `./harness` as the
mandatory, first-choice operating surface for humans and agents. Specifically:

1. **Single operating surface.** `./harness` is the documented single entry point for
   supported workflows. Humans and agents MUST prefer `./harness <verb>` over invoking a
   wrapped command directly.

2. **Wrap, never reimplement.** The harness WRAPS existing project commands and MUST NOT
   reimplement them or **invent a new build system** (honouring ADR-0002 and PRD §28.7).
   When a backing command exists it is wrapped; when it does not, the verb reports
   `unknown`/`degraded` — it is never faked.

3. **Verdict model.** Every verb returns exactly one verdict from
   `pass` / `fail` / `degraded` / `unknown`, with the exit-code contract: `fail` → non-zero
   exit; `pass`, `degraded`, and `unknown` → exit 0 (non-blocking). This guarantees that a
   not-yet-present capability never reads as a failure to CI or the verifier, while a real
   failing wrapped command does.

4. **Required verbs.** The harness implements the stable verb surface: `help`, `orient`,
   `doctor`, `lint`, `test`, `build`, `boot`, `verify`, `status`, `clean`, `friction add`,
   `friction list`.

5. **Initial verb → command mapping (Issue #4 state).** Because only `npm run typecheck`
   exists as a wrappable check:

   | Verb | Backing today | Initial verdict | Friction recorded |
   |------|---------------|-----------------|-------------------|
   | `help` / `orient` / `status` | repo metadata / contract / last evidence | `pass` | no |
   | `doctor` | Node major vs `.nvmrc`/`engines` (exactly `22`), `node_modules` presence | `pass` or `degraded` | only if degraded |
   | `verify` | `npm run typecheck` + `verify.aggregate` (`lint`,`test`,`build`,`doctor`) | `degraded` | yes |
   | `lint` | none (no ESLint/Prettier) | `unknown` | yes |
   | `test` | none (no runner/script/files) | `unknown` | yes |
   | `build` | none (`tsc` is `noEmit`; nothing emits) | `unknown` | yes |
   | `boot` | none (no dev/serve app; `npm install` is setup) | `unknown` | yes |
   | `clean` | `clean.maps_to` (native today; wraps a clean command when mapped) | `degraded` (harness-owned artifacts only) | yes |
   | `friction add` / `friction list` | harness-native | `pass` | no |

   `npm run typecheck` is wrapped **only** by `verify`; it is deliberately **not** aliased
   under `lint` or `build`, to avoid misrepresenting a typecheck as a linter or a build.

   `clean` reads `clean.maps_to`: today it is `native` (prune only harness-owned evidence →
   `degraded`); when a real clean command is added it is wired by setting `clean.maps_to` in
   the contract, with no harness code change (CORE-COMPONENT-0003 R8). `doctor` validates the
   **full** supported Node range (exactly major `22`, per `engines` `>=22 <23` and `.nvmrc`):
   both below-range (`<22`) and above-range (`>=23`) report `degraded`, not `pass`
   (CORE-COMPONENT-0003 R15).

6. **`verify` verdict policy (data-driven, deterministic).** `verify` derives its overall
   verdict by iterating the contract-declared member checks — its own `maps_to` (surfaced as
   the `typecheck` check) plus every verb listed in `verify.aggregate`
   (`lint`, `test`, `build`, `doctor`) — resolving each member from `.harness/contract.yml` at
   runtime, never from a hard-coded list. The overall verdict is a fixed total function of the
   member verdicts, evaluated in order: (1) any member `fail` ⇒ `fail`; (2) else all members
   `pass` ⇒ `pass`; (3) else all members `unknown` ⇒ `unknown`; (4) else ⇒ `degraded`.
   `doctor` participates in the aggregate and, because it only emits `pass`/`degraded`, can
   push the aggregate to `degraded` but never `fail`. In the Issue #4 state `verify` is
   `degraded` (typecheck `pass`; lint/test/build `unknown`); once #5 populates their `maps_to`
   and they pass, the SAME rule yields `pass` with no code change. `verify` MUST write a
   collision-safe evidence file atomically under `.harness/evidence/` on every run, and MUST
   return `fail` if that required evidence cannot be persisted (CORE-COMPONENT-0003 R5, R6,
   R14).

7. **Evidence.** Evidence for runs is written under `.harness/evidence/` as timestamped,
   collision-safe records (unique even within the same second) using atomic writes (temp file
   + rename). A required evidence write that fails yields a `fail` verdict
   (CORE-COMPONENT-0003 R14). Evidence run output is **git-ignored** (ephemeral, noisy); the
   directory is kept under version control via a committed `.gitkeep`.

8. **Friction log.** `.harness/friction.jsonl` is a committed, append-only JSON Lines log.
   Every inference the agent must make (e.g. "no test command exists") is recorded as a
   friction entry that answers the **KEY_QUESTION: "What did the agent have to infer that
   the harness should have proved?"**

9. **Contract.** `.harness/contract.yml` is a committed, data-driven declaration of the verb
   surface and the mapping of each verb to its wrapped command (or `native`/none). Later
   stories (e.g. #5) move a verb from `unknown` to `pass` by editing this data, not by
   restructuring the harness.

10. **`--json` output.** The machine-facing verbs (`orient`, `doctor`, `lint`, `test`,
    `build`, `boot`, `verify`, `status`, `clean`, `friction list`) MUST support `--json` with
    a stable schema so `pr-review-complement` and other consumers can parse verdicts.

11. **Implementation constraint.** The harness is implemented as a **portable POSIX shell**
    script, dependency-light, adding **no** new runtime dependency beyond the existing
    checkout tooling (the devcontainer does not guarantee Node at container-build time, and
    `just` exists as a feature but there is no `justfile`).

12. **Agent-surface updates.** `AGENTS.md` and every `.github/agents/*.agent.md` (16 files)
    are updated **idempotently** using a marker-delimited harness-usage block, requiring
    harness usage while **preserving each agent's existing behaviour**.

13. **Verification wiring.** Create `.github/soft-factory/verification.yml` declaring
    `./harness verify` as the canonical verification gate, so the Verify stage is
    deterministic and routes through the single operating surface.

The reusable behavioural contract this decision introduces (verdict semantics, JSON schema,
evidence/friction record conventions, KEY_QUESTION rule, idempotent agent-surface update
rule) is specified in **CORE-COMPONENT-0003**.

## Alternatives

What other options were considered? Why were they rejected?

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Status quo — no harness, memorised direct commands | Nothing to build | No single entry point, no verdicts, no evidence, no friction capture; `pr-review-complement` already assumes `./harness` | Fails the issue's core acceptance criteria and leaves an already-referenced contract unimplemented |
| `npm` scripts only (add `lint`/`test`/`build` scripts) | Native to the stack; discoverable via `npm run` | Would require inventing linter/test/build tooling now (forbidden by ADR-0002 / PRD §28.7); no verdict/evidence/friction model; not the surface `pr-review-complement` calls | Over-scaffolds tooling that later stories own; misses evidence/friction/verdict requirements |
| `Makefile` | Ubiquitous; simple target model | Adds a task-runner convention not present in the repo; no verdict/evidence/friction/JSON semantics; awkward JSON output | Does not satisfy the contract (`orient`, `verify --json`, verdicts, friction) other skills depend on |
| `justfile` (the `just` devcontainer feature exists) | Nice ergonomics; feature already installed | Introduces a non-guaranteed dependency; no evidence/friction/verdict/JSON model; not the `./harness` surface consumers call | Adds tooling dependency and still needs the harness contract on top; net more moving parts |
| Node-based CLI (e.g. commander/oclif) | Rich CLI ergonomics; typed | Requires application dependencies + a build step, both forbidden at this stage by ADR-0002; assumes Node at run time, not guaranteed at container build | Violates dependency-light and no-build-system constraints; heavier and harder to reverse |
| Fabricate `unknown` verbs by aliasing `tsc` to `lint`/`build`/`test` | Every verb would "pass" | Dishonest: misrepresents a typecheck as lint/build/test; hides real proof gaps the KEY_QUESTION exists to surface | Directly contradicts the honesty requirement and the friction/KEY_QUESTION model |

## Consequences

What becomes easier or harder as a result of this decision?

### Positive
- Humans and agents get one discoverable, documented entry point (`./harness help`/`orient`)
  for every supported workflow.
- The `pr-review-complement` skill's existing `./harness orient` / `./harness verify --json`
  branch works as designed instead of silently misbehaving.
- Every run leaves an evidence trail, and every inference is captured as friction that
  answers the KEY_QUESTION, making missing proofs visible and later closable.
- Honest `unknown`/`degraded` verdicts communicate capability gaps without faking commands,
  keeping the harness aligned with ADR-0002 and PRD §5.5/§28.7.
- Later stories (#5 dev/validation, #6 shell+health) wire real commands in by editing
  `.harness/contract.yml` data, not by restructuring the harness.

### Negative
- Introduces a new repo-local surface that must be maintained and kept in sync with the
  contract as commands are added.
- Rewriting 16 agent definitions plus `AGENTS.md` is broad; a poorly-scoped edit could
  duplicate blocks on re-runs or alter agent semantics — mitigated by the mandatory
  idempotent marker-delimited block and behaviour-preservation rule (CORE-COMPONENT-0003).
- A single operating surface becomes a shared dependency; a broken `./harness` would block
  the flows that route through it.

### Neutral
- Implementation language is fixed to portable POSIX shell for now; can be revisited via a
  future ADR if the harness outgrows shell.
- Evidence run output is git-ignored while `contract.yml`, `README.md`, and `friction.jsonl`
  are committed; the VCS policy can be revisited if the audit trail needs run output too.
- `.github/soft-factory/verification.yml` is created now and points at `./harness verify`.

## Related Issues

- [#4](https://github.com/jsburckhardt/ascend/issues/4)
- [#3](https://github.com/jsburckhardt/ascend/issues/3) — bootstrap (precedent for
  `architecture_decision` scope; established the stack this harness wraps)
- [#5](https://github.com/jsburckhardt/ascend/issues/5) — dev/validation commands (will move
  harness verbs from `unknown` to `pass`)
- [#6](https://github.com/jsburckhardt/ascend/issues/6) — shell + health (adds a real `boot`)

## References

- ADR-0002 — Ascend baseline technology stack and repository layout (stack, single setup
  entry point, no build system beyond `tsc`)
- CORE-COMPONENT-0003 — Engineering harness contract, verdicts, and evidence/friction
  conventions (the behavioural contract this ADR adopts)
- CORE-COMPONENT-0002 — Commit Standards (governs harness-related commits)
- `.github/agents/harness-cli-it.agent.md` — the generator agent (REQUIRED_OUTPUTS,
  REQUIRED_VERBS, KEY_QUESTION, VERDICTS, JSON_VERBS)
- `.github/skills/pr-review-complement/references/00-review-comment-resolution-workflow.md`
  — existing consumer of `./harness orient` and `./harness verify --json`
- `project/issues/4/research/00-research.md`
- PRD.md §5.5 (Start with prototypes), §28.7 (Avoid speculative frameworks)
