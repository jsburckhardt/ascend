# Decision Log

This file is the single registry of all architectural decisions and core-components in the project. Every new or modified ADR or core-component **must** be recorded here.

## ADRs

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-0002 | Ascend baseline technology stack and repository layout | Accepted | 2026-07-14 |
| ADR-0003 | Adopt a repo-local engineering harness (`./harness`) as the operating surface for humans and agents | Accepted | 2026-07-20 |

## Core-Components

| ID | Title | Status | Date |
|----|-------|--------|------|
| CORE-COMPONENT-0002 | Commit Standards | Adopted | 2026-05-05 |
| CORE-COMPONENT-0003 | Engineering harness contract, verdicts, and evidence/friction conventions | Adopted | 2026-07-20 |

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
| 12 | Adopt `./harness` as the mandatory first-choice operating surface for humans and agents | ADR-0003 | 2026-07-20 |
| 13 | Wrap existing project commands in the harness; never reimplement or invent a build system | ADR-0003 | 2026-07-20 |
| 14 | Implement the harness as a dependency-light, portable POSIX shell script | ADR-0003 | 2026-07-20 |
| 15 | Wrap `npm run typecheck` under the harness `verify` verb only, not `lint` or `build` | ADR-0003 | 2026-07-20 |
| 16 | Create `.github/soft-factory/verification.yml` running `./harness verify` as the canonical gate | ADR-0003 | 2026-07-20 |
| 17 | Add the harness-usage rule only to the consuming agents (`ship` + `rpiv-*`); leave `AGENTS.md` and non-consuming agents unchanged | ADR-0003 | 2026-07-20 |
| 18 | Return exactly one verdict — pass, fail, degraded, or unknown — from every harness verb | CORE-COMPONENT-0003 | 2026-07-20 |
| 19 | Exit non-zero only on `fail`; exit 0 for pass, degraded, and unknown | CORE-COMPONENT-0003 | 2026-07-20 |
| 20 | Record every honest capability gap as a friction entry answering the KEY_QUESTION verbatim | CORE-COMPONENT-0003 | 2026-07-20 |
| 21 | Write a timestamped evidence record under `.harness/evidence/` on every `verify` run | CORE-COMPONENT-0003 | 2026-07-20 |
| 22 | Support `--json` with a stable schema on every machine-facing harness verb | CORE-COMPONENT-0003 | 2026-07-20 |
| 23 | Declare verb-to-command mappings in `.harness/contract.yml` so verbs are wired by data | CORE-COMPONENT-0003 | 2026-07-20 |
| 24 | Require exactly one marker-delimited, idempotent harness block inside `<instructions>` on each consuming agent surface, and none on non-consumers | CORE-COMPONENT-0003 | 2026-07-20 |
| 25 | Commit `contract.yml`, `README.md`, and `friction.jsonl`; git-ignore `.harness/evidence/` run output | CORE-COMPONENT-0003 | 2026-07-20 |
| 26 | Derive `verify`'s verdict by iterating contract-declared member checks, not a hard-coded list | ADR-0003, CORE-COMPONENT-0003 | 2026-07-20 |
| 27 | Apply fixed verify aggregate rule: any fail⇒fail, all pass⇒pass, all unknown⇒unknown, else degraded | CORE-COMPONENT-0003 | 2026-07-20 |
| 28 | Include `doctor` in the verify aggregate; it may degrade but never fail it | ADR-0003, CORE-COMPONENT-0003 | 2026-07-20 |
| 29 | Read every wrapped command from `maps_to`; prohibit hard-coded verb-to-command wiring | CORE-COMPONENT-0003 | 2026-07-20 |
| 30 | Wire `clean` via `clean.maps_to`; run a mapped clean command instead of ignoring it | CORE-COMPONENT-0003 | 2026-07-20 |
| 31 | Emit exactly one terminal `Verdict:` line from every human verb form, including help and friction list | CORE-COMPONENT-0003 | 2026-07-20 |
| 32 | Escape JSON with POSIX-only constructs; prohibit GNU-only sed idioms | CORE-COMPONENT-0003 | 2026-07-20 |
| 33 | Test harness portability on a non-GNU userland with multiline and control-character inputs | CORE-COMPONENT-0003 | 2026-07-20 |
| 34 | Generate collision-safe evidence filenames and write evidence atomically | CORE-COMPONENT-0003 | 2026-07-20 |
| 35 | Return `fail` when a required evidence or friction record cannot be persisted | CORE-COMPONENT-0003 | 2026-07-20 |
| 36 | Validate the full supported Node range (exactly major 22); reject Node 23+ as unsupported | CORE-COMPONENT-0003 | 2026-07-20 |
| 37 | Maintain a durable executable harness regression suite enforcing CORE-COMPONENT-0003 | CORE-COMPONENT-0003 | 2026-07-20 |
