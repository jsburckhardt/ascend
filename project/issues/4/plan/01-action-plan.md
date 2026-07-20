# Action Plan: Generate the engineering harness CLI via the harness-cli-it agent

## Feature
- **ID:** 4
- **Research Brief:** project/issues/4/research/00-research.md

## ADRs Created
- **[ADR-0003](../../../architecture/ADR/ADR-0003-repo-local-engineering-harness.md) — Adopt a repo-local engineering harness (`./harness`) as the operating surface for humans and agents** (Accepted, 2026-07-20).
  Commits: `./harness` is the mandatory single operating surface; it wraps existing commands and never reimplements or invents a build system (honouring ADR-0002); the verdict model `pass`/`fail`/`degraded`/`unknown` with an exit-code contract; the required verb surface; the initial verb→command mapping (only `verify` wraps `npm run typecheck`); `verify` returns `degraded` in the Issue #4 state; evidence under `.harness/evidence/`; friction under `.harness/friction.jsonl`; contract in `.harness/contract.yml`; `--json` on machine-facing verbs; portable POSIX shell; idempotent updates to `AGENTS.md` and all `.github/agents/*.agent.md`; creation of `.github/soft-factory/verification.yml`.

## Core-Components Created
- **[CORE-COMPONENT-0003](../../../architecture/core-components/CORE-COMPONENT-0003-engineering-harness-contract.md) — Engineering harness contract, verdicts, and evidence/friction conventions** (Adopted, 2026-07-20).
  Specifies the reusable behavioural contract: verdict semantics + exit codes (R2/R3), `verify` evidence + aggregation policy (R5/R6), the stable `--json` schema (R7), data-driven verbs in `contract.yml` (R8), the KEY_QUESTION friction rule + record schema (R4/R9), the idempotent marker-delimited agent-surface update rule (R10), the agents-prefer-harness rule (R11), dependency-light POSIX shell (R12), and the VCS policy for `.harness/` (R13).
  **Review Cycle 1 refinements (2026-07-20):** R2 now requires a terminal `Verdict:` line on every human form (incl. `help`/`friction list`); R6 makes the `verify` aggregate data-driven with a deterministic total function over contract-declared members (incl. `doctor`); R8 forbids hard-coded verb→command wiring and makes `clean` honor `clean.maps_to`; R12 mandates POSIX-only escaping (no GNU-only sed) tested on a non-GNU userland; **new** R14 (collision-safe, atomic, checked persistence; required-failure ⇒ `fail`), R15 (validate the full Node range — exactly major 22), and R16 (durable executable regression suite).

## Review Cycle 1 Remediation (2026-07-20)
Independent review (`project/issues/4/review/00-review.md`) returned REQUEST_CHANGES: one
blocking finding (**F-01** — harness not data-driven, CC-0003 R6/R8) and four majors (**F-02**
human verdicts, **F-03** Node range, **F-04** evidence reliability, **F-05** POSIX JSON
escaping), plus no durable regression suite. This round refined ADR-0003 (§5–§7), CORE-COMPONENT-0003
(R2/R6/R8/R12 + new R14/R15/R16), and the decision log (rows 26–37), and added remediation tasks
**T10–T16** with tests **TEST-18…TEST-25** in `02-task-breakdown.md` / `03-test-plan.md`. The
precise aggregate rule specified: iterate contract members (`typecheck` + `verify.aggregate` =
`lint`,`test`,`build`,`doctor`); **(1)** any `fail`⇒`fail`, **(2)** all `pass`⇒`pass`,
**(3)** all `unknown`⇒`unknown`, **(4)** else `degraded`. `doctor` participates but can only
degrade, never fail.

## Existing Artifacts Referenced
- **ADR-0002** — stack (TS/Node 22/npm), `npm install` single setup entry point, no build system beyond `tsc`. The harness must respect all three.
- **CORE-COMPONENT-0002** — Commit Standards; governs the harness-related commit(s) authored in the Verify stage.
- **`.github/agents/harness-cli-it.agent.md`** — the generator agent; its `REQUIRED_OUTPUTS`, `REQUIRED_VERBS`, `VERDICTS`, `JSON_VERBS`, and `KEY_QUESTION` constants are the implementation contract the tasks map onto.
- **`.github/skills/pr-review-complement/`** — existing consumer of `./harness orient` and `./harness verify --json`; its exact invocations must succeed.

## Repository State (inspected)
- `package.json` scripts: exactly one — `"typecheck": "tsc --noEmit"`. Sole devDependency: `typescript`. No `test`/`lint`/`build`/`dev`/`start`/`clean` script.
- `tsconfig.json`: `noEmit: true`, `strict`, `rootDir: src`. No build/emit step by design.
- `src/` contains only `placeholder.ts` (`export {};`) — no application logic.
- No `./harness`, `.harness/`, `.github/soft-factory/`, or `verification.yml` exist yet — from-scratch generation.
- `.github/agents/` contains 16 `*.agent.md` files; plus `AGENTS.md` at repo root → **17 agent surfaces** to update.
- `.gitignore` currently ignores only `.trees` and `node_modules`.

## Guardrails Encoded Into the Plan
- **Wrap, do not reimplement.** Only `npm run typecheck` (and `npm install` as setup, surfaced via `doctor`) is real. `verify` wraps typecheck. `lint`, `test`, `build`, `boot` return `unknown`; `clean` returns `degraded` — never faked, each backed by a friction entry answering the KEY_QUESTION.
- **`unknown`/`degraded` are not failures.** Exit-code contract: only `fail` exits non-zero.
- **Deterministic Verify.** Create `.github/soft-factory/verification.yml` running `./harness verify`.
- **`pr-review-complement` compatibility.** `./harness orient` and `./harness verify --json` must work and exit 0.
- **Idempotent, behaviour-preserving agent edits** via one marker-delimited block per surface.
- **Dependency-light** portable POSIX shell; no new runtime dependency.
- **VCS policy:** commit `contract.yml`, `README.md`, `friction.jsonl`; git-ignore `.harness/evidence/` run output (keep dir via `.gitkeep`).

## Implementation Tasks
Ordered by dependency (see `02-task-breakdown.md` for full detail). Implementation is
executed by `rpiv-implementer` following the `harness-cli-it` agent's `REQUIRED_OUTPUTS` and
`REQUIRED_VERBS`.

1. **T1 — Author `.harness/contract.yml`** (contract schema; verb→command map; evidence/friction config). [ADR-0003, CC-0003]
2. **T2 — Implement the `./harness` CLI core + informational verbs** (`help`, `orient`, `doctor`, `status`; POSIX-shell dispatcher; `--json`; exit-code contract). [ADR-0003, CC-0003, ADR-0002]
3. **T3 — Implement `verify`** (wrap `npm run typecheck`; aggregation policy → `degraded`; write evidence; `--json`). [ADR-0003, CC-0003, ADR-0002]
4. **T4 — Implement honest `unknown`/`degraded` verbs** (`lint`, `test`, `build`, `boot`, `clean`; each emits friction). [ADR-0003, CC-0003]
5. **T5 — Implement the friction subsystem + seed log** (`friction add`, `friction list`; seed `.harness/friction.jsonl` with one KEY_QUESTION entry per gap). [CC-0003]
6. **T6 — Author `.harness/README.md`** (verbs, verdict semantics, KEY_QUESTION, single entry point). [ADR-0003, CC-0003, ADR-0002]
7. **T7 — Idempotent agent-surface updates** (`AGENTS.md` + all 16 `.github/agents/*.agent.md` with a marker-delimited harness block). [ADR-0003, CC-0003]
8. **T8 — Wire verification + VCS policy** (create `.github/soft-factory/verification.yml`; update `.gitignore`; add `.harness/evidence/.gitkeep`). [ADR-0003, CC-0003]
9. **T9 — End-to-end verification & evidence capture** (run `./harness verify --json` and `./harness orient`; confirm `pr-review-complement` contract; re-validate issue acceptance criteria). [ADR-0003, CC-0003, CC-0002]

**Review Cycle 1 remediation tasks (blocking + majors):**

10. **T10 — Data-driven dispatch & command wiring** (no hard-coded verb→command; `clean` honors `clean.maps_to`). [F-01; CC-0003 R8]
11. **T11 — Deterministic data-driven `verify` aggregate** (iterate `verify.aggregate` incl. `doctor`; fixed total function; can reach `pass` by data). [F-01; CC-0003 R6]
12. **T12 — One `Verdict:` line per human verb** (incl. `help`, `friction list`). [F-02; CC-0003 R2]
13. **T13 — Full Node-range validation in `doctor`** (exactly major 22; reject `<22` and `>=23`). [F-03; CC-0003 R15]
14. **T14 — Reliable, collision-safe, atomic persistence** (unique evidence names; atomic writes; required-failure ⇒ `fail`). [F-04; CC-0003 R14]
15. **T15 — POSIX-only JSON escaping + non-GNU portability test** (drop GNU sed idioms). [F-05; CC-0003 R12]
16. **T16 — Durable executable regression suite** (`tests/harness/run.sh` covering TEST-01…TEST-24). [CC-0003 R16]

### Dependency Order
```
T1 ─▶ T2 ─┬─▶ T3 ─┐
          ├─▶ T4 ─┤
          └─▶ T5 ─┼─▶ T6 ─▶ T7 ─▶ T8 ─▶ T9
                  │
        (T4/T5 feed the seed friction consumed by T6/T9)

Review Cycle 1:  T10 ─▶ T11 ─┐
                 T12 ────────┤
                 T13 ────────┼─▶ T16  (regression suite covers all)
                 T14 ────────┤
                 T15 ────────┘
```
