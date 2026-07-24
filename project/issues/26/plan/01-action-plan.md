# Action Plan: Agent-attributed friction, issue-scoped retrospect, and required code-server doctor readiness

## Feature
- **ID:** 26
- **Research Brief:** project/issues/26/research/00-research.md

## Approved scope (maintainer, 2026-07-22)
Implement **A + B + E + C**; **defer D and F**.

- **A** — Agent-attributed friction: additive `agent` field + `friction add --agent`; self-attribute in each RPIV block.
- **B** — Friction retrospect (delete-on-fix): delete 22 resolved records, keep 9 still-true records.
- **E** — TEST-09 adjustment: retain one `boot` + one `test` anchor so the suite stays green.
- **C** — `doctor` code-server readiness = **fail when absent**; provision code-server in the devcontainer.

## Locked decisions (do not re-litigate)
1. `--agent` is a **FLAG**, not positional.
2. Friction dedupe stays **verb-only** (`ensure_friction` unchanged).
3. Missing code-server ⇒ `doctor`/`verify` **`fail`**.
4. #26 **provisions** code-server in `.devcontainer`.

## ADRs Created
- **ADR-0007** — Agent-attributed friction and issue-scoped retrospect (no persistent improvement store). Covers A, B, E. `project/architecture/ADR/ADR-0007-agent-attributed-friction-and-issue-scoped-retrospect.md`
- **ADR-0008** — code-server readiness is a required `doctor` check that fails when absent. Covers C; supersedes DECISION-LOG #28 and ADR-0006 §7/Decision #71. `project/architecture/ADR/ADR-0008-doctor-code-server-readiness-required.md`

## Core-Components Created
- **None new.** Amended **CORE-COMPONENT-0003** (Engineering harness contract): added the friction `agent` field to the schema, new **R18** (agent attribution) and **R19** (code-server readiness fail-when-absent), and updated the R6 "doctor never fails" note. `project/architecture/core-components/CORE-COMPONENT-0003-engineering-harness-contract.md`

## Decision-Log changes
- Registered ADR-0007 and ADR-0008; updated CORE-COMPONENT-0003 amendment note.
- Added decision records **#73–#87**.
- Marked **#28** SUPERSEDED by ADR-0008; marked **#71** SUPERSEDED IN PART by ADR-0008.

## Harness grounding (planning)
- Planner has no shell/`./harness` execution tool, so the verb surface, contract data, and friction schema were read directly from `.harness/contract.yml`, the `harness` source, and `tests/harness/run.sh`. This capability gap was recorded as friction (verb `orient`, `agent: rpiv-planner`) in `.harness/friction.jsonl` per the harness KEY_QUESTION rule.
- The plan and test plan reference only real harness verbs enumerated from the committed contract: `help, orient, doctor, lint, test, build, boot, dev, edit, verify, status, clean, friction add, friction list`.
- **No execution verbs (lint/test/build/boot/verify/clean) were run** during planning.

## Implementation Tasks (dependency-ordered; detail in 02-task-breakdown.md)

1. **T1 — Add the `agent` field to the friction write path** (`write_friction`, `ensure_friction`). Additive after `severity`, default `unknown`. [ADR-0007; CC-0003 R4/R7/R8/R18]
2. **T2 — Add the `--agent <name>` flag to `friction add`** (default `unknown`; JSON/human output). [ADR-0007; CC-0003 R18] *(depends on T1)*
3. **T3 — Self-attribute in each RPIV stage agent, via the APS agent** (`rpiv-research`, `rpiv-planner`, `rpiv-implementer`, `rpiv-verifier`); modify the `.agent.md` files through `.github/agents/aps-v1.2.2.agent.md` (generate + lint), not by hand-editing the marker block. [ADR-0007; CC-0003 R10/R18] *(depends on T2)*
4. **T4 — Extend `doctor` with a code-server readiness check** (`compute_doctor`/`verb_doctor`): present ⇒ pass, absent ⇒ `fail`; testability seam for the probe. [ADR-0008; CC-0003 R4/R6/R19]
5. **T5 — Provision code-server in `.devcontainer/devcontainer.json`** so `verify` can pass. [ADR-0008; CC-0003 R19] *(pairs with T4)*
6. **T6 — Friction retrospect (delete-on-fix + retain anchors)**: delete 22 resolved records, keep 9, rewrite anchors #2/#4 honestly. [ADR-0007; CC-0003 R13] *(depends on T4 so #23 is genuinely closed)*
7. **T7 — Update the harness regression suite and docs**: TEST-09 anchor intent, new agent-field tests, new doctor code-server tests, README/`.harness/README.md`, and the `verification.yml` comment. [ADR-0007/0008; CC-0003 R16] *(depends on T1–T6)*

## Sequencing with issue #27
- **#27** (remove `verification.yml`) is separate. #26 only edits `verification.yml`'s outdated "degraded/unknown non-blocking" comment (T4/T7). If #27 lands first (file removed), drop #26's comment edit. Reconcile ordering at implementation time; do not do #27's work here.

## Out of scope / boundaries
- Do **not** remove or restructure `.github/soft-factory/verification.yml` (only the comment update); its removal is **issue #27**.
- Do **not** rewrite historical issue artifacts for issues other than #26.
- Defer **D** (data-driven `main()` allowlist) and **F** (new capture/prototype-review verbs).
