# Action Plan: Launch one code-server process against a configured path

## Feature
- **ID:** 7
- **Research Brief:** project/issues/7/research/00-research.md

## ADRs Created
- **ADR-0006 — code-server editor-provider launch, argument isolation, and read-only project-path safety**
  (`project/architecture/ADR/ADR-0006-code-server-launch-and-project-path-safety.md`, Accepted 2026-07-21).
  This story is #7's **first external editor-provider seam**, so the provider-argument
  isolation (§5.7) and read-only launch safety (§28.6) are recorded as an ADR rather
  than left implicit. Records eight decisions:
  - **D1 Launch mechanism** = a single dependency-light **POSIX shell launcher**
    `scripts/launch-editor.sh` (not in `src/`; avoids the ADR-0005 Node ≥22.6.0 /
    strip-types coupling) that launches `code-server` as a host **child process**
    (PRD §14.2) via `exec`.
  - **D2 Harness surfacing** = a new **provider-agnostic** verb **`edit`**, wired
    `edit: { maps_to: "npm run edit", mode: exec, json: true }` (reuses the
    ADR-0004/0005 `boot` handoff). `npm run edit` runs `sh scripts/launch-editor.sh`.
    The `mode`→handler selection stays data-driven; the new verb **name** also needs a
    minimal `main()` dispatch-allowlist + `verb_help` edit (permitted structural
    dispatch, CC-0003 R8 — recorded as friction).
  - **D3 Provider isolation (§5.7)** = **every** code-server flag (`<PROJECT_PATH>`,
    `--bind-addr`, `--auth none`, config path) lives **only** in the launcher; no flag
    may appear in `.harness/contract.yml`, the `harness` script, or `src/`. No
    `EditorProvider` abstraction (§28.7).
  - **D4 Configuration** = folder via **`PROJECT_PATH`** env (mirrors ADR-0005 `PORT`);
    loopback bind `127.0.0.1:${EDITOR_PORT:-8080}` + `--auth none` for the local spike.
  - **D5 Read-only fail-fast (§28.6/AC5)** = validate-only checks; fail fast + non-zero
    exit on unset/empty/missing/non-directory `PROJECT_PATH`; **never** `mkdir`/`rm`/
    `mv`/`rename`/`reset`/`clean` the target.
  - **D6 Crash/exit** = `mode: exec` propagates code-server's exit code (ADR-0004 #46);
    no supervision; a missing `code-server` binary fails fast with clear guidance.
  - **D7 Provisioning & verification split** = code-server is a **documented
    prerequisite** (absent here/CI). AC1–AC3 verified by **manual demo** (capturing
    startup command + duration, PRD §29); AC4–AC5 by **code-server-free `node:test`**
    (wired into `verify`). `doctor` code-server readiness deferred.
  - **D8 No core-component** — provider isolation is one launcher seam at Prototype 0.
- **DECISION-LOG rows added:** ADR-0006 registry row + decision records **#62–#72**.

## Core-Components Created
- **None.** Per ADR-0006 D8 / Decision #72 and the research recommendation, a reusable
  `EditorProvider` launch/isolation contract (PRD §15) is **deferred as speculative**
  (PRD §28.7; ADR-0002 minimality) — there is exactly one provider and one consumer at
  Prototype 0, mirroring ADR-0005 D8. The isolation is a **single launcher seam**, not a
  framework. Revisit a candidate `CORE-COMPONENT-0004` only when a second editor provider
  or a multi-consumer need (reverse proxy + embedding + runtime health) is validated.

## Implementation Tasks (outline — full detail in 02-task-breakdown.md)
- **T1 (M)** — Author `scripts/launch-editor.sh`: validate `PROJECT_PATH` (fail-fast),
  check code-server presence, isolate all flags, `exec` code-server. Strictly read-only.
  [ADR-0006 D1,D3,D4,D5,D6; CC-0003 R1]
- **T2 (XS)** — `package.json`: add `"edit": "sh scripts/launch-editor.sh"`; widen the
  `test` glob to include `tests/launcher/`. [ADR-0006 D2,D7; ADR-0005 D7]
- **T3 (XS)** — Wire `.harness/contract.yml`: add `edit` verb (`maps_to: "npm run edit"`,
  `mode: exec`, `json: true`). [ADR-0006 D2; CC-0003 R8,R17]
- **T4 (XS)** — `harness` script: add `edit` to the `main()` dispatch allowlist + a
  `verb_help` line (structural dispatch only; no handler logic change).
  [ADR-0006 D2; CC-0003 R8,R17]
- **T5 (L)** — `tests/launcher/launch-editor.test.ts` (`node:test`): invalid-path
  fail-fast, no-mutation/read-only, code-server-absent error, provider-arg isolation
  (stub code-server). [ADR-0006 D3,D5,D6,D7; CC-0003 R16]
- **T6 (M)** — Update `tests/harness/run.sh` for the new `edit` verb (count, `--print`/
  `--json` introspection, exclusion from run-to-completion enumeration, contract
  assertions). [ADR-0006 D2; CC-0003 R16,R17]
- **T7 (S)** — Documentation: README "Launch the editor (code-server)" section +
  `.harness/README.md`: `PROJECT_PATH`/`EDITOR_PORT`, invalid-path behaviour (AC4),
  read-only safety (AC5), code-server prerequisite/provisioning, manual demo (AC1–AC3),
  crash/exit. [ADR-0006 D1,D4,D5,D6,D7; CC-0003 R1]
- **T8 (XS)** — Append friction **resolution** entries via `./harness friction add` for
  #7 research entries #22/#23 and the new verb-routing gap. [CC-0003 R4,R9]
- **T9 (S, manual)** — Manual demonstration of AC1–AC3 on a code-server-provisioned host;
  capture startup command + startup duration; confirm project files unchanged (AC5).
  [ADR-0006 D7]

**Dependency order:** T1 → T5; T2 → T3 → T4; (T1,T2,T3,T4) → T6; (T1,T4) → T7; (T3,T4) → T8;
all → T9. T1 and T2 can start in parallel.

### Harness verbs referenced
14 verbs after this story (13 today + new `edit`), enumerated from `.harness/contract.yml`
+ the `harness` script:
`help, orient, doctor, lint, test, build, boot, dev, verify, status, clean, friction add,
friction list` (+ **`edit`**, added by T3/T4).
Planning references only — **no execution verb (lint/test/build/boot/verify/clean/edit) was
run**; planning does not execute tasks.
**Capability gap (recorded as friction, entry "edit"):** the research brief called a new
`mode: exec` verb "data-only", but the `harness` `main()` routes only an allowlisted set of
verb **names** (`lint|test|build|boot|dev`), so a brand-new name needs a minimal `main()` +
`verb_help` edit (permitted structural dispatch, CC-0003 R8); the `mode`→handler selection
stays data-driven. Also, this sandbox has no shell, so `./harness orient`/`status` could not
be run live — verbs were read from the contract + script.

### Risks (from research; carried into tasks)
- **R1 — code-server absent here and in CI.** `command -v code-server` → none; devcontainer
  declares no editor feature. **Mitigation:** AC1–AC3 via manual demo (T9); AC4–AC5 via
  code-server-free `node:test` (T5) using a stub binary on `PATH`; code-server is a
  documented prerequisite (T7). (ADR-0006 D7)
- **R2 — Hanging the harness with a long-running process.** Mapping the launch into the
  run-to-completion capability handler would hang `./harness` and the regression suite
  (ADR-0004 #41). **Mitigation:** `mode: exec` handoff; the suite asserts `edit --print`,
  never bare `edit` (T6). (ADR-0006 D2)
- **R3 — AC5/§28.6 safety violation.** Any convenience `mkdir -p "$PROJECT_PATH"` or cleanup
  would breach the read-only guarantee. **Mitigation:** validate-only checks; an explicit
  no-mutation test snapshotting the target before/after (T5); code review against §28.6. (D5)
- **R4 — Provider-flag leakage (§5.7).** Spreading code-server flags across the verb/npm
  script/docs couples the core to code-server. **Mitigation:** one launcher seam owns all
  flags; a static grep test asserts no flags leak into `src/`/contract/`harness` (T5). (D3)
- **R5 — New verb name is not purely data-only.** Adding `edit` needs a small `harness`
  `main()` allowlist + `verb_help` edit. **Mitigation:** confine the edit to structural
  dispatch (no handler-logic change), covered by the regression suite (T4,T6); logged as
  friction (T8). (ADR-0006 D2)
- **R6 — Node floor / experimental-runtime coupling.** A `src/`-style TS launcher would
  inherit the Node ≥22.6.0 + strip-types constraints (ADR-0005 D2). **Mitigation:** the
  launcher is POSIX shell (T1). (ADR-0006 D1)
- **R7 — `--auth none` + loopback posture.** Safe only for the local spike; must be
  revisited before shared/remote exposure (out of scope now). **Mitigation:** document the
  posture and its limits (T7). (ADR-0006 D4)
- **R8 — Sandbox cannot `npm install`.** `node_modules` absent (network-blocked); `npm test`
  needs deps. **Mitigation:** the launcher tests are code-server-free and dependency-light
  (`node:test`, zero deps); run the gate on a connected env; `verify` stays exit-0/degraded.
