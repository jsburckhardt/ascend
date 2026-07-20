# Decision Log

This file is the single registry of all architectural decisions and core-components in the project. Every new or modified ADR or core-component **must** be recorded here.

## ADRs

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-0002 | Ascend baseline technology stack and repository layout | Accepted | 2026-07-14 |
| ADR-0003 | Adopt a repo-local engineering harness as the supported operating surface | Accepted | 2026-07-20 |

## Core-Components

| ID | Title | Status | Date |
|----|-------|--------|------|
| CORE-COMPONENT-0002 | Commit Standards | Adopted | 2026-05-05 |
| CORE-COMPONENT-0003 | Engineering Harness Contract | Adopted | 2026-07-20 |

## Decisions

Short, actionable statements derived from ADRs and core-components. More than one decision can originate from a single source.

| # | Decision | Source | Date |
|---|----------|--------|------|
| 1 | Enforce Conventional Commits v1.0.0 on every commit message | CORE-COMPONENT-0002 | 2026-05-05 |
| 2 | Require Conventional Commits format on PR titles | CORE-COMPONENT-0002 | 2026-05-05 |
| 3 | Require Co-authored-by trailer on all AI-authored commits | CORE-COMPONENT-0002 | 2026-05-05 |
| 4 | Adopt TypeScript as the implementation language for Ascend | ADR-0002 | 2026-07-14 |
| 5 | Use Node.js 22 LTS as the runtime, pinned via package.json engines and .nvmrc | ADR-0002 | 2026-07-14 |
| 6 | Use npm as the package manager with a committed package-lock.json | ADR-0002 | 2026-07-14 |
| 7 | Require package.json and tsconfig.json as the minimal project manifest | ADR-0002 | 2026-07-14 |
| 8 | Place all application source under the src/ directory | ADR-0002 | 2026-07-14 |
| 9 | Use `npm install` from the repo root as the single documented setup entry point | ADR-0002 | 2026-07-14 |
| 10 | Prohibit application frameworks and features at bootstrap, deferring to later prototypes | ADR-0002 | 2026-07-14 |
| 11 | Prohibit migrating DevDeck code, config, or conventions into the repository | ADR-0002 | 2026-07-14 |
| 12 | Adopt `./harness` as the first-choice, mandatory operating surface for humans and agents | ADR-0003 | 2026-07-20 |
| 13 | The harness wraps existing project commands and must not invent a new build system | ADR-0003 | 2026-07-20 |
| 14 | Implement the harness as a dependency-light portable shell script that runs before `npm install` | ADR-0003 | 2026-07-20 |
| 15 | Generate, repair, and verify the harness via the `harness-cli-it` agent; `./harness verify` must pass | ADR-0003 | 2026-07-20 |
| 16 | Register `./harness verify` in `.github/soft-factory/verification.yml` as the RPIV verification surface | ADR-0003 | 2026-07-20 |
| 17 | Every harness verb returns exactly one verdict: pass, fail, degraded, or unknown | CORE-COMPONENT-0003 | 2026-07-20 |
| 18 | Absent verbs return `unknown`/inferred and record friction rather than fabricating coverage | CORE-COMPONENT-0003 | 2026-07-20 |
| 19 | `verify` writes evidence under `.harness/evidence/`; inferences are logged in `.harness/friction.jsonl` | CORE-COMPONENT-0003 | 2026-07-20 |
| 20 | Once the harness exists, agents MUST prefer `./harness` and record friction when bypassing it | CORE-COMPONENT-0003 | 2026-07-20 |
