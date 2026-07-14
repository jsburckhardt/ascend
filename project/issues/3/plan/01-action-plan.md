# Action Plan: Bootstrap the Ascend repository

## Feature
- **ID:** 3
- **Research Brief:** project/issues/3/research/00-research.md

## ADRs Created
- [ADR-0002 — Ascend baseline technology stack and repository layout](../../../architecture/ADR/ADR-0002-ascend-baseline-stack-and-layout.md) (Accepted)
  - Decides: TypeScript language; Node.js 22 LTS runtime (pinned); npm package manager;
    `package.json` + `tsconfig.json` minimal manifest; top-level directory layout with
    application source under `src/`; `npm install` from repo root as the single documented
    setup entry point; no frameworks/app features at bootstrap; no DevDeck migration.

## Core-Components Created
- None. This issue introduces no reusable, cross-cutting behavioural contract. The existing
  CORE-COMPONENT-0002 (Commit Standards) already governs how bootstrap commits are authored
  and needs no change.

## Objective

Turn the un-bootstrapped Soft Factory template into the smallest possible, independently
justified greenfield Ascend repository that satisfies Issue #3's acceptance criteria while
honouring PRD §5.5 and §28.7 (minimal, reversible, no speculative frameworks) and migrating
**no** DevDeck code.

## Acceptance Criteria (from issue)

- [ ] Repository has a documented directory structure and README stating the product
  boundary (Ascend orchestrates; VS Code provides the IDE).
- [ ] Project metadata/manifest exists for the chosen stack.
- [ ] The project can be checked out and set up from a documented single entry point.
- [ ] No DevDeck code is migrated into the repository.

## Approach

Deliver only the four bootstrap artifacts, in dependency order:

1. **Manifest + toolchain** (`package.json`, `package-lock.json`, `tsconfig.json`, `.nvmrc`)
   implementing the ADR-0002 stack decision. This is the foundation the setup entry point
   and directory docs depend on.
2. **Directory layout** — establish `src/` as the application-source location (no app code),
   keep `docs/` and `project/` as-is.
3. **README** — replace the template placeholder with the Ascend product-boundary statement,
   the documented directory structure, and a "Getting Started" section naming the single
   setup entry point (`npm install`).
4. **Clean-checkout verification** — confirm a fresh clone sets up successfully via the one
   documented command, and confirm no DevDeck code/config is present.

Out of scope (explicitly deferred to later Prototype 0 stories): health endpoint,
application shell, `code-server` launcher, CI/CD, dev/validation command suite beyond what
the manifest needs, any application dependency or framework.

## Implementation Tasks

See `02-task-breakdown.md` for full detail. Summary (dependency-ordered):

- **T1 — Create the minimal project manifest and toolchain** (implements ADR-0002 stack).
- **T2 — Establish the documented directory layout** (depends on T1).
- **T3 — Rewrite the README with product boundary, layout, and setup entry point**
  (depends on T1, T2).
- **T4 — Verify clean-checkout setup and DevDeck-free baseline** (depends on T1–T3).

## Test Strategy

See `03-test-plan.md`. Central verification: a clean checkout followed by the single
documented setup command (`npm install`) succeeds with no manual steps, `tsc` runs against
the manifest, the README states the product boundary, and no DevDeck artifacts exist.
