# Verify Summary — #4

## Feature Overview

**Issue:** #4 — Generate the engineering harness CLI via the harness-cli-it agent

Delivered a repo-local engineering harness CLI (`./harness`) as the single, documented operating surface for humans and agents. The harness is a dependency-light, portable POSIX shell script that wraps the repo's existing commands (never reimplementing them), reports exactly one verdict per verb (`pass`/`fail`/`degraded`/`unknown`) where only a real `fail` exits non-zero, writes timestamped evidence on every `verify` run, and records honest capability gaps as friction answering the KEY_QUESTION. The change adds ADR-0003 and CORE-COMPONENT-0003, registers them in the decision log, wires the canonical Verify gate to `./harness verify`, and embeds an idempotent harness-usage block across `AGENTS.md` and all agent surfaces.

## Branch & PR

| Field | Value |
|-------|-------|
| Branch | `feat/4-harness-cli` |
| PR | [feat: generate the engineering harness CLI via the harness-cli-it agent](https://github.com/jsburckhardt/ascend/pull/16) |

## Commits

| Hash | Message |
|------|---------|
| bad4688 | feat: add repo-local engineering harness CLI (./harness) |
| 9fd4972 | docs: add ADR-0003 and CORE-COMPONENT-0003 for the engineering harness |
| e68ed9d | docs: record ADR-0003 and CORE-COMPONENT-0003 in the decision log |
| 9987b55 | docs: require ./harness usage across agent surfaces |
| 0ad45a5 | docs: add issue #4 harness research, plan, and implementation notes |

## Acceptance Criteria

| Status | Criterion | Evidence |
|--------|-----------|----------|
| ✅ passed | A repo-local harness CLI exists, generated via the `harness-cli-it` agent | Executable `harness` POSIX-shell CLI; `./harness help` lists all 12 verbs and exits 0; generated per `.github/agents/harness-cli-it.agent.md`. |
| ✅ passed | The harness wraps the project's existing commands rather than reimplementing them | `verify` runs the contract `maps_to` `npm run typecheck`; `./harness verify --json` reports `checks[0].maps_to = "npm run typecheck"`; no build system reimplemented in `.harness/contract.yml`. |
| ✅ passed | The harness records evidence for the commands it runs | Each `verify` writes `.harness/evidence/verify-<UTC>.json` and references the path in output; directory retained via committed `.harness/evidence/.gitkeep`. |
| ✅ passed | Supported human and agent workflows are documented | `.harness/README.md` documents the entry point, verbs, verdicts, exit-code contract, `--json`, evidence/friction, and KEY_QUESTION; agent rules embedded in `AGENTS.md` and all `.github/agents/*.agent.md`. |
| ✅ passed | The harness is invocable from a documented single entry point | `./harness <verb>` is the single documented surface; the `pr-review-complement` invocations `./harness orient` and `./harness verify --json` both succeed and exit 0. |

## ADRs & Core-Components

| ID | Title |
|----|-------|
| ADR-0003 | Adopt a repo-local engineering harness (`./harness`) as the operating surface for humans and agents |
| CORE-COMPONENT-0003 | Engineering harness contract, verdicts, and evidence/friction conventions |

## Verification Results

| Category | Command | Status |
|----------|---------|--------|
| harness-verify | `./harness verify` | pass (verdict `degraded`, exit 0 — typecheck `pass`; test/lint/build `unknown`, non-blocking) |
| typecheck | `npm run typecheck` | pass (exit 0) |

## Generated At

2026-07-20T08:02:57Z
