# Action Plan: Generate the engineering harness CLI via the harness-cli-it agent

## Feature
- **ID:** 4
- **Research Brief:** project/issues/4/research/00-research.md

## ADRs Created
- [ADR-0003 — Adopt a repo-local engineering harness as the supported operating surface](../../../architecture/ADR/ADR-0003-adopt-engineering-harness.md) (Accepted)
  - Decides: adopt `./harness` as the first-choice, mandatory operating surface; wrap
    existing commands (no new build system); dependency-light portable shell that runs
    before `npm install`; generated/verified via the `harness-cli-it` agent; wire
    `./harness verify` into `.github/soft-factory/verification.yml`.

## Core-Components Created
- [CORE-COMPONENT-0003 — Engineering Harness Contract](../../../architecture/core-components/CORE-COMPONENT-0003-engineering-harness-contract.md) (Adopted)
  - Defines: the required verbs, the four verdicts (`pass`/`fail`/`degraded`/`unknown`),
    `--json` support for important verbs, evidence under `.harness/evidence/`, friction in
    `.harness/friction.jsonl` (answering the KEY_QUESTION), and the mandatory adoption rule.

## Objective

Generate a repo-local engineering harness CLI at `./harness`, via the `harness-cli-it`
agent, that wraps Ascend's existing commands (`npm install`, `npm run typecheck`), records
evidence for the commands it runs, documents the supported human and agent workflows, and
becomes the single documented entry point for supported workflows — satisfying Issue #4's
acceptance criteria while honouring ADR-0002 minimality (no new build system, no framework
dependencies) and CORE-COMPONENT-0003.

## Acceptance Criteria (from issue)

- [ ] A repo-local harness CLI exists, generated via the `harness-cli-it` agent.
- [ ] The harness wraps the project's existing commands rather than reimplementing them.
- [ ] The harness records evidence for the commands it runs.
- [ ] Supported human and agent workflows are documented.
- [ ] The harness is invocable from a documented single entry point.

## Approach

Follow the `harness-cli-it` process (inspect → detect → record inferences → write harness
files → update agent instructions → update agent definitions → verify), in dependency
order:

1. **Detect the command surface.** Confirm the only wrappable commands are `npm install`
   (setup / `boot`) and `npm run typecheck` (`typecheck` / part of `verify`). Confirm no
   `lint`, `test`, `build`, or `clean` scripts exist.
2. **Write the harness CLI + contract** (`./harness`, `.harness/contract.yml`) implementing
   every required verb, the four verdicts, `--json` for important verbs, evidence writing,
   and friction recording — wrapping existing commands and marking absent ones `unknown`.
3. **Record friction** for every inference (absent `lint`/`test`/`build`, inferred
   `clean`) in `.harness/friction.jsonl`, each answering the KEY_QUESTION.
4. **Document usage** in `.harness/README.md` (all verbs + supported human and agent
   workflows).
5. **Require adoption** by updating `AGENTS.md` and every `.github/agents/*.agent.md`
   idempotently to prefer `./harness`, preserving existing behaviour.
6. **Wire verification** by creating `.github/soft-factory/verification.yml` registering
   `./harness verify`.
7. **Verify** by running `./harness verify` (after `./harness boot`) and confirming a
   `pass` verdict with written evidence; repair the harness/contract if not.

Out of scope (explicitly deferred): defining the dev/validation commands themselves (next
story — the harness wraps them once they exist), CI/CD integration, and any new
build/test tooling beyond wrapping what already exists.

## Implementation Tasks

See `02-task-breakdown.md` for full detail. Summary (dependency-ordered):

- **T1 — Detect the existing command surface** (produces the command map + inferences).
- **T2 — Author `./harness` and `.harness/contract.yml`** (all verbs, verdicts, `--json`,
  evidence, friction) — depends on T1.
- **T3 — Record friction and author `.harness/README.md`** — depends on T1, T2.
- **T4 — Require harness usage in `AGENTS.md` and `.github/agents/*.agent.md`; add
  `.github/soft-factory/verification.yml`** — depends on T2.
- **T5 — Boot and verify the harness end-to-end** (`./harness verify` → `pass` with
  evidence) — depends on T2, T3, T4.

## Test Strategy

See `03-test-plan.md`. Central verification: `./harness verify` (after `./harness boot`)
returns `pass`, wrapping the real `npm run typecheck`, and writes a JSON evidence record
under `.harness/evidence/`; the harness marks absent verbs `unknown` with matching friction
entries; `AGENTS.md` and all agent definitions require harness usage; and the harness is
invocable from the single documented entry point (`./harness`).
