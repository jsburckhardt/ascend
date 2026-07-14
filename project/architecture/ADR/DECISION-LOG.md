# Decision Log

This file is the single registry of all architectural decisions and core-components in the project. Every new or modified ADR or core-component **must** be recorded here.

## ADRs

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-0002 | Ascend baseline technology stack and repository layout | Accepted | 2026-07-14 |

## Core-Components

| ID | Title | Status | Date |
|----|-------|--------|------|
| CORE-COMPONENT-0002 | Commit Standards | Adopted | 2026-05-05 |

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
