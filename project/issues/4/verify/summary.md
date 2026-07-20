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

---

## Review Cycle 1

The reviewer (GPT-5.6 Sol) returned `REQUEST_CHANGES` with one blocking finding (F-01) and four majors (F-02..F-05). The implementer applied fixes plus a durable regression suite; this cycle re-verified them on branch `feat/4-harness-cli` (PR #16) with no application-source (`src/`) changes.

### Verification Results

| Category | Command | Status |
|----------|---------|--------|
| harness-verify (canonical gate) | `./harness verify` | pass — verdict `degraded`, exit 0 (typecheck `pass`; lint/test/build `unknown`; doctor `pass`; non-blocking per ADR-0003) |
| regression suite | `sh tests/harness/run.sh` | pass — 31 assertions PASS, 0 FAIL, exit 0 |
| typecheck | `npm run typecheck` | pass — `tsc --noEmit`, exit 0 |

### Findings Verified

| Finding | Severity | Fix | Evidence |
|---------|----------|-----|----------|
| F-01 | blocking | Data-driven dispatch: `verify` reads its own `maps_to` plus `verify.aggregate` from the contract at runtime; `clean` honors `clean.maps_to`; no verb-to-command string is hard-coded. | `get_maps_to`/`get_aggregate`/`resolve_member` in `harness`; TEST-18 proves data-only rewiring (`verify`→`pass`, `clean` wraps a mapped command) with the harness checksum unchanged. |
| F-02 | major | Exactly one terminal `Verdict:` line per human verb, including `help` and `friction list` (both print `Verdict: pass`). | `verb_help`/`friction_list` in `harness`; TEST-20 asserts a single `Verdict:` line per verb and `help`/`friction list` = `pass`. |
| F-03 | major | `doctor` validates the full supported Node range as exactly major `22`; below-range (`<22`) and above-range (`>=23`) report `degraded`. | `compute_doctor` exact-equality check against `.nvmrc`; TEST-21 proves 21→`degraded`, 22→`pass`, 23→`degraded`. |
| F-04 | major | Collision-safe evidence names (stamp+pid+random), atomic write (temp + rename), checked directory/evidence/friction writes, and `fail` on any required-record persistence failure. | `persist_atomic`/`append_line`/`persist_fail` in `harness`; TEST-22 (20 concurrent-safe valid files, no temp leftovers) and TEST-23 (unwritable evidence/friction → `fail`, exit 1). |
| F-05 | major | JSON escaping uses a POSIX `awk` routine reading input via the environment; no GNU-only `sed` `:a;N;$!ba` idiom. | `json_escape` in `harness`; TEST-24 validates JSON under `dash` + `mawk` (non-GNU) with multiline and control-character inputs. |

### Durable Regression Suite

`tests/harness/run.sh` (CORE-COMPONENT-0003 R16) exercises TEST-01..TEST-24: every verb, the `--json` schema, the `verify` aggregate truth table, Node-range boundaries, evidence collision-safety/atomicity, required-persistence-failure `fail`, and non-GNU portability. It runs non-interactively, isolates all mutations to a scratch dir, and exits non-zero on any failure. Result this cycle: `Totals: PASS=31 FAIL=0 SKIP=0`, `Verdict: pass`.

### New Commits (this cycle)

| Hash | Message |
|------|---------|
| dde6a75 | fix(harness): drive dispatch from contract data and harden persistence |
| 55e354d | test(harness): add durable POSIX regression suite for the harness contract |
| fe3a300 | docs(architecture): tighten ADR-0003 and CORE-COMPONENT-0003 for cycle-1 fixes |
| b46a0db | docs: record cycle-1 harness decisions in DECISION-LOG |
| 8691315 | docs: update issue #4 plan, implementation notes, and review report |

### Acceptance Criteria (re-affirmed)

| Status | Criterion | Evidence |
|--------|-----------|----------|
| ✅ passed | A repo-local harness CLI exists, generated via the `harness-cli-it` agent | Executable `harness` POSIX CLI; `./harness help` lists all 12 verbs and exits 0; TEST-02/TEST-14. |
| ✅ passed | The harness wraps the project's existing commands rather than reimplementing them | `verify` runs the contract `maps_to` `npm run typecheck` (data-driven, no reimplementation); TEST-04/TEST-05/TEST-18. |
| ✅ passed | The harness records evidence for the commands it runs | Each `verify` writes a collision-safe, atomic `.harness/evidence/verify-*.json` and references the path; TEST-04/TEST-22. |
| ✅ passed | Supported human and agent workflows are documented | `.harness/README.md`, `AGENTS.md`, and all `.github/agents/*.agent.md` carry the harness surface/rules; TEST-11/TEST-12/TEST-13. |
| ✅ passed | The harness is invocable from a documented single entry point | `./harness <verb>` documented single surface; `orient` + `verify --json` succeed and exit 0; TEST-17. |

### Cycle-1 Generated At

2026-07-20T08:56:40Z

## Review Cycle 2

Cycle-2 fixes resolve the remaining major/minor findings from the re-review (F-02R, F-06, F-07, F-08, F-09) plus a README wording update. No application source (`src/`) was touched; only the harness surface, its regression suite, harness/issue documentation, and the review report changed.

### Verification Results

| Category | Command | Status |
|----------|---------|--------|
| harness verify | `./harness verify` | pass — verdict `degraded`, exit 0 (non-blocking; wrapped `npm run typecheck` = `pass`) |
| regression suite (sh) | `sh tests/harness/run.sh` | pass — `Totals: PASS=34 FAIL=0 SKIP=0`, `Verdict: pass`, exit 0 |
| regression suite (dash) | `dash tests/harness/run.sh` | pass — `Totals: PASS=34 FAIL=0 SKIP=0`, `Verdict: pass`, exit 0 |
| typecheck | `npm run typecheck` | pass — `tsc --noEmit`, exit 0 |

### Findings Verified

| Finding | Severity | Fix | Evidence |
|---------|----------|-----|----------|
| F-02R | major | On a failing human `verify`, typecheck diagnostics are printed before the single terminal verdict, so the last output line is exactly `Verdict: fail` (CORE-COMPONENT-0003 R2/R7). | `verb_verify` in `harness` moves the `--- typecheck output ---` block ahead of the `Verdict:` line; TEST-28 asserts the last line is exactly `Verdict: fail`, exit 1, and exactly one `Verdict:` line. |
| F-06 | major | Each `verify.aggregate` member is resolved exactly once; its verdict/reason/rendered row are cached and reused for aggregation, evidence, and human output, so a mapped member never runs twice. | Single resolve loop with cached `_rows` in `harness`; TEST-26 proves each mapped member executes exactly once in human (=1) and `--json` (=1) modes. |
| F-07 | major | `friction_count` prints exactly one integer for missing, empty, and populated logs, replacing the `grep -c` "double-zero", so `status --json` and `friction list --json` stay valid JSON. | `friction_count` awk pass in `harness`; TEST-27 validates all six missing/empty/populated JSON counts parse. |
| F-08 | major | The regression suite is POSIX-portable (no `mktemp`/`sha256sum`/`grep -o`/`head -c`/GNU-only awk flags) and forces a real non-GNU awk (`/usr/bin/mawk`) execution rather than passing on GNU userland. | `tests/harness/run.sh` runs green under both `sh` and `dash`; TEST-24 exercises JSON escaping under `dash` + forced `mawk`. |
| F-09 | minor | Marker-update idempotency is proven by re-running the real update operation across all 17 agent surfaces and comparing full output plus outside-marker content, not just marker ordering. | New POSIX helper `tests/harness/apply-marker.sh` re-runs the real update; TEST-13 asserts 17 surfaces are byte-identical on rerun, no duplication, and outside-marker content preserved. |

### New Commits (this cycle)

| Hash | Message |
|------|---------|
| f0dd84d | fix(harness): keep verdict terminal, resolve members once, stabilize friction JSON |
| 5ec9008 | test(harness): enforce POSIX portability and real marker idempotency |
| 0e97d35 | docs: align harness README semantics and record cycle-2 review |

### Cycle-2 Generated At

2026-07-20T09:38:00Z

---

## Review Cycle 2 — F-08R follow-up

The final review verdict was **COMMENT** with **0 blocking findings**. The single
residual item, **F-08R** (minor, strict-portability), flagged that the
portability suite still invoked the non-POSIX `awk --version` flag when
classifying the default `awk`. That probe has been removed from
`find_nongnu_awk` in `tests/harness/run.sh`: the non-GNU awk under test is now
selected only from explicit `mawk` / `busybox awk` candidates, and the existing
visible SKIP fires when neither is present — no non-POSIX awk flag remains in the
selection path.

The suite stays green under both shells: `sh tests/harness/run.sh` and
`dash tests/harness/run.sh` each report `Totals: PASS=34 FAIL=0 SKIP=0`,
`Verdict: pass`, exit 0, with TEST-24 exercising a real non-GNU `mawk` run.
`./harness verify` remains `degraded`, exit 0 (non-blocking; wrapped
`npm run typecheck` = `pass`).

### Follow-up Commits

| Hash | Message |
|------|---------|
| 39a5dd0 | test(harness): remove non-POSIX awk --version probe from portability suite |
| 2b1b766 | docs(issue-4): record F-08R remediation and cycle-2 review disposition |

### F-08R Generated At

2026-07-20T09:57:26Z
