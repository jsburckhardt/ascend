# Verify Summary — #5

## Feature Overview

**Issue:** #5 — Add local development and validation commands

Delivered the Prototype-0 local development and validation commands, wrapped by the engineering harness. `./harness dev` starts the development inner loop as an interactive/handoff verb (`mode: exec`, ADR-0004 / CORE-COMPONENT-0003 R17): it `exec`s `npm run dev` (`tsc --noEmit --watch`) via process handoff, so the dev command is genuinely invokable through the harness CLI. `./harness verify` (wrapping `npm run typecheck`) is the validation command whose baseline `degraded`/exit-0 verdict is the accepted non-blocking "passing" state. This Verify pass ships the REVIEW CYCLE 1 architectural fix that resolves review finding F-01: AC3 is satisfied because the dev command runs through the harness rather than only being documented.

**REVIEW CYCLE 2 (finding F-02) — mode-driven dispatch.** The contract `mode` attribute is now **authoritative** for handler selection instead of hard-coded verb names. A single `dispatch_verb` helper routes the `lint/test/build/boot/dev` family from `get_mode` DATA: `exec` → interactive handoff (`verb_exec`), absent/`capability` → run-to-completion (`verb_capability`), any other value → usage error (exit 2). The `verb_exec` "default missing mode to exec" fallback was removed, and `verb_orient`'s `dev_mode` is now derived from `get_mode dev`. This makes the reusable handoff category correct for the anticipated next consumer (`boot.mode: exec`) so it uses the handoff path rather than a run-to-completion handler that could hang. Architecture (ADR-0004, CORE-COMPONENT-0003 R17, DECISION-LOG) was already correct and is unchanged. New hermetic regression coverage (TEST-31) proves mode-authoritative dispatch, raising the durable suite to 38 checks.

Both commands are documented in `README.md` and `.harness/README.md`; a truthful friction closure was appended, and durable regression coverage was added (TEST-30 proves AC3 via `./harness dev`, TEST-30b is a hard-bounded guarded exec probe, TEST-31 proves contract `mode` is authoritative). No application source code was changed.

## Branch & PR

| Field | Value |
|-------|-------|
| Branch | `feat/5-dev-validation-commands` |
| PR | [feat: add local development and validation commands](https://github.com/jsburckhardt/ascend/pull/18) |

## Commits

| Hash | Message |
|------|---------|
| b97e88f | feat: add local development and validation commands |
| 2a84113 | docs: add issue #5 RPIV pipeline artifacts |
| 6346ce0 | feat: add ./harness dev interactive handoff verb |
| cd171af | docs: add ADR-0004 and amend CORE-COMPONENT-0003 with R17 handoff verbs |
| a051ffe | docs: register ADR-0004 and R17 decisions in DECISION-LOG |
| 40d972e | docs: update issue #5 RPIV pipeline artifacts for the dev handoff fix |
| 359de90 | fix(harness): make contract mode authoritative for verb dispatch |
| 5365b91 | docs(issue-5): record REVIEW CYCLE 2 (F-02) resolution and review report |

## Acceptance Criteria

| Status | Criterion | Evidence |
|--------|-----------|----------|
| ✅ passed | A documented command starts the local development environment | `package.json` `scripts.dev = "tsc --noEmit --watch"`; `README.md` "Start the local development environment" documents `./harness dev`; contract `dev.maps_to = "npm run dev"`, `dev.mode = exec`; TEST-30 and TEST-30b. |
| ✅ passed | A documented validation command runs and passes on the baseline codebase | `./harness verify` → `Verdict: degraded`, exit 0 (accepted non-blocking baseline); `npm run typecheck` → exit 0; documented in `README.md` "Validate the codebase"; TEST-04/05/17/30. |
| ✅ passed | The commands are wrapped/invokable through the harness CLI | `./harness dev` execs `npm run dev` via interactive handoff (ADR-0004 / CORE-COMPONENT-0003 R17), so the dev command is genuinely invokable through the harness CLI (resolves review F-01); the handler is now selected from the contract `mode` DATA by `dispatch_verb` (resolves review F-02), so `mode` is authoritative; `./harness dev --print` → `npm run dev` (exit 0); `./harness orient --json` reports `dev_mode = exec` derived from `get_mode`; validation wrapped by `./harness verify` (`verify.maps_to = "npm run typecheck"`); TEST-30 proves AC3, TEST-30b confirms the exec handoff starts the watch (killed by timeout), and TEST-31 proves mode-authoritative dispatch. |
| ✅ passed | Both commands are documented in the README | `README.md` documents `./harness dev` (with `--print`/`--json` introspection and ADR-0004 link) and `./harness verify` / `npm run typecheck` with the `degraded`/exit-0 non-blocking note; `.harness/README.md` lists `dev` and the interactive/handoff section; TEST-11/30. |

## ADRs & Core-Components

| ID | Title |
|----|-------|
| ADR-0004 | Interactive/handoff verbs in the engineering harness (`./harness dev`) — created |
| CORE-COMPONENT-0003 | Engineering harness contract, verdicts, and evidence/friction conventions — amended (R17) |
| ADR-0003 | Adopt a repo-local engineering harness (`./harness`) as the operating surface for humans and agents |
| ADR-0002 | Ascend baseline technology stack and repository layout |
| CORE-COMPONENT-0002 | Commit Standards |

## Verification Results

| Category | Command | Status |
|----------|---------|--------|
| Gate (harness verify) | `./harness verify` | degraded, exit 0 (non-blocking — pass) |
| Typecheck | `npm run typecheck` | pass, exit 0 |
| Durable suite | `sh tests/harness/run.sh` | pass (PASS=38 FAIL=0 SKIP=0; completed without hanging) |
| Dev handoff introspection | `./harness dev --print` | `npm run dev`, exit 0 (no watch) |
| Mode-driven dispatch | `sh tests/harness/run.sh` (TEST-31) | pass (exec→handoff, absent/capability→run-to-completion, unsupported→exit 2) |
| Boot deferral | `./harness boot` | unknown, exit 0 (no mode → capability → unknown) |
| Orient descriptor | `./harness orient --json` | `dev_mode = exec` derived from `get_mode dev` |

## Generated At

2026-07-20T22:09:37Z
