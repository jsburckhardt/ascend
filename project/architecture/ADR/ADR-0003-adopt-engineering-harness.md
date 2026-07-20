# ADR-0003: Adopt a repo-local engineering harness as the supported operating surface

## Status

Accepted

## Context

Ascend (Node.js 22 + TypeScript, npm; see ADR-0002) currently exposes exactly one
executable command — `npm run typecheck` — discoverable only by reading `package.json` or
the README. There is no uniform way for a contributor (human or agent) to discover the
supported workflows, obtain a consistent verdict for running one, record evidence that a
workflow actually ran, or record the gaps an agent had to *infer* because the repository
never proved them.

Issue #4 (part of Prototype 0, feature #2) requires generating a repo-local **engineering
harness CLI** — via the `harness-cli-it` agent — that wraps Ascend's existing commands,
records evidence, and exposes the supported human and agent workflows from a single entry
point. Mandating a single operating surface for *all* work is a foundational, cross-cutting
and comparatively hard-to-reverse commitment (every later Prototype 0 story — dev/validation
commands, a health endpoint, a `code-server` launcher — will register its commands through
it, and the RPIV agents are told to prefer it). Per the repository's own pipeline rules,
"significant architectural decisions" belong in an ADR, so the adoption decision is recorded
here rather than implicitly inside the harness files.

Two constraints bound the decision:

- **ADR-0002 minimality** — the harness must not invent a new build system, add framework
  dependencies, or otherwise expand the stack. It wraps existing `npm` commands.
- **`harness-cli-it` contract** — the harness must expose a fixed verb set, return one of
  four verdicts (`pass` / `fail` / `degraded` / `unknown`), write evidence, record friction,
  and update `AGENTS.md` and `.github/agents/*.agent.md` to prefer the harness.

The *behavioural contract* of the harness (verbs, verdicts, evidence, friction, adoption
rule) is recorded separately as **CORE-COMPONENT-0003 — Engineering Harness Contract**; this
ADR records only the decision to adopt it and the shape of that adoption.

## Decision

Adopt a **repo-local engineering harness at `./harness`** as the first-choice, supported
operating surface for humans and agents:

1. **Single entry point.** `./harness <verb>` is the documented way to run supported
   workflows. `./harness help` lists them; `.harness/contract.yml` is the machine-readable
   contract.
2. **Wrap, do not replace.** The harness invokes existing project commands (today:
   `npm install` for `boot`, `npm run typecheck` for `typecheck`/`verify`). It MUST NOT
   reimplement them or invent a new build system. Absent verbs (`lint`, `test`, `build`,
   `clean` when undeclared) return `unknown`/inferred verdicts and record friction rather
   than fabricating coverage.
3. **Dependency-light portable shell.** The harness is a single POSIX/bash script requiring
   no packages to run its own logic; only the *wrapped* commands need the Node toolchain.
   This keeps the operating surface runnable even before `npm install`, and avoids adding a
   Node-CLI dependency purely to launch commands.
4. **Verdicts + evidence + friction.** Every verb returns exactly one of `pass`, `fail`,
   `degraded`, `unknown`; important verbs support `--json`; `verify` writes evidence under
   `.harness/evidence/`; inferences are recorded in `.harness/friction.jsonl`. These
   conventions are specified in CORE-COMPONENT-0003.
5. **Generated and maintained via `harness-cli-it`.** The harness is created, repaired, and
   verified using the `harness-cli-it` agent/skill, and `./harness verify` must pass before
   the work is considered complete.
6. **Adoption is mandatory.** Once `./harness` and `.harness/contract.yml` exist, `AGENTS.md`
   and every `.github/agents/*.agent.md` require agents to prefer `./harness` over direct
   wrapped commands, and to record friction when bypassing it due to missing proof.
7. **Wire the RPIV verifier.** `.github/soft-factory/verification.yml` registers
   `./harness verify` so the RPIV Verify stage uses the harness as its verification surface.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Status quo — ad-hoc `npm` scripts + README** | Zero new files; nothing to learn | No uniform verdicts, no evidence, no friction, no discovery; every agent re-derives how to run things | Fails the issue's outcome (consistent, evidence-recording operating surface) |
| **`Makefile` / `justfile` as the surface** | Familiar task runners; `just` already in the devcontainer | Introduces/relies on a task-runner dependency; no native verdict/evidence/friction model; diverges from the `harness-cli-it` contract | Adds tooling and still misses the required verdict/evidence/friction contract |
| **Node/TypeScript CLI (in `src/`) with deps** | Matches the repo stack; typed | Requires `npm install` before the operating surface even runs; adds dependencies purely to launch commands; heavier, violates ADR-0002 minimality | Over-scaffolds; the surface should run before/without a full install |
| **Dependency-light shell harness wrapping npm** (chosen) | No new deps; runs pre-install; honours ADR-0002; matches `harness-cli-it` contract; portable | Shell is less ergonomic than typed code for complex logic | Accepted — minimal, honest, matches the mandated generator and stack constraints |

## Consequences

What becomes easier or harder as a result of this decision?

### Positive
- One discoverable, documented entry point (`./harness`) for every supported workflow, for
  both humans and agents.
- Consistent `pass`/`fail`/`degraded`/`unknown` verdicts and recorded evidence make
  workflow runs auditable — a baseline for later runtime/measurement observability.
- Friction records make missing proof explicit instead of silently inferred, guiding what
  future stories should add.
- The harness runs with no dependencies, so it works on a clean checkout before `npm
  install`; later stories register their commands through a stable surface.

### Negative
- A second surface to keep in sync: when new `npm` scripts land, the harness/contract must
  be updated to wrap them (mitigated by the friction record making gaps visible).
- Shell is less expressive than typed code for complex verbs (accepted for now given the
  small command surface).

### Neutral
- The harness wraps but does not own the wrapped commands; `package.json` remains the source
  of truth for what the commands *do*.
- `build`, `lint`, `test`, and `clean` start as `unknown`/inferred and become real as later
  stories declare those commands.

## Related Issues

- [#4](https://github.com/jsburckhardt/ascend/issues/4)
- [#2](https://github.com/jsburckhardt/ascend/issues/2) (parent feature)

## References

- CORE-COMPONENT-0003 (Engineering Harness Contract) — the behavioural contract adopted here
- ADR-0002 (Ascend baseline technology stack and repository layout) — the stack the harness wraps
- CORE-COMPONENT-0002 (Commit Standards) — governs how this issue's commits are authored
- `.github/agents/harness-cli-it.agent.md` and `.github/skills/harness-cli-it/` — the generator
- project/issues/4/research/00-research.md
