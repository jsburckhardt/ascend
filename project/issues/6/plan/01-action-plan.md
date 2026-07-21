# Action Plan: Minimal Ascend application shell + health endpoint

## Feature
- **ID:** 6
- **Research Brief:** project/issues/6/research/00-research.md

## ADRs Created
- **ADR-0005 — Ascend application-serve runtime**
  (`project/architecture/ADR/ADR-0005-application-serve-runtime.md`, Accepted 2026-07-21).
  Records eight decisions:
  - **D1 HTTP mechanism** = Node built-in `node:http` `createServer`; no web framework
    (upholds ADR-0002 "no framework"). `src/server.ts` exports a non-listening
    `createAppServer(): http.Server` factory for port-injectable tests.
  - **D2 TS runtime execution** = `node --experimental-strip-types` (no emit / no build /
    no loader dependency); `tsconfig` stays `noEmit`; `src/` restricted to a
    strip-types-safe subset (no `enum`/`namespace`/parameter properties); Node major pinned 22.
  - **D3 `@types/node`** added as a compile-time-only **devDependency** (analogous to the
    existing `typescript` devDep) so `tsc --noEmit` can typecheck `node:http`/`node:test`.
  - **D4 `boot` lifecycle** = reuse ADR-0004 `mode: exec` handoff; wire
    `boot: { maps_to: "npm run start", mode: exec, json: true }` — **data-only**, no harness
    script change (proven by existing TEST-31A). Rejected a readiness-probe+detach model.
  - **D5 dev-vs-serve** = `./harness dev` stays a **typecheck watch**; the shell+health
    process starts via `./harness boot` → `npm run start`. AC3's "documented dev command"
    for the shell+health is resolved to **`./harness boot`**.
  - **D6 contract** = default port **3000**, `PORT` env override; `GET /health` → 200
    `application/json` `{"status":"ok"}`; `GET /` → 200 `text/html` thin shell; other → 404.
  - **D7 test runner** = built-in `node:test` + global `fetch`; wire the harness `test`
    verb (`test.maps_to: "npm test"`) → moves `test` from `unknown` to `pass`; enters the
    `verify` aggregate `[lint, test, build, doctor]` (CC-0003 R6). `verify` stays
    `degraded`/exit-0 (lint/build still `unknown`); turns fail only if typecheck OR test fails.
  - **D8 no core-component** — health/HTTP contract stays issue-local at Prototype 0.
- **DECISION-LOG rows added:** ADR-0005 registry row + decision records **#47–#59**.

## Core-Components Created
- **None.** Per the research recommendation and ADR-0005 D8 / Decision #59, the health/HTTP
  contract remains *issue-local* at Prototype 0 — there is a single service and no
  cross-cutting reuse to standardise yet. Revisit (candidate CORE-COMPONENT-0004) only when
  a second service or a shared health/HTTP contract emerges.

## Implementation Tasks (outline — full detail in Section 2 / 02-task-breakdown.md)
- **T1 (S)** — Implement `src/server.ts`: `createAppServer()` factory + routing (`/health`, `/`, 404). [ADR-0005 D1,D6]
- **T2 (XS)** — Implement `src/main.ts`: listen entry on `PORT`||3000. [ADR-0005 D1,D2,D6]
- **T3 (XS)** — `package.json`: add `@types/node` devDependency + `start`/`test` scripts; package-lock note. [ADR-0005 D2,D3,D7]
- **T4 (M)** — `node:test` suites (`tests/app/*.test.ts`): health 200 JSON, `/` 200 HTML, 404. [ADR-0005 D1,D6,D7; CC-0003 R16]
- **T5 (XS)** — Wire `.harness/contract.yml`: `boot`(mode:exec→`npm run start`) + `test`(→`npm test`). [ADR-0005 D4,D5,D7; CC-0003 R6,R8,R17]
- **T6 (S)** — README + `help`/`orient`/`doctor` coherence (start vs dev, health contract, port). [ADR-0005 D5,D6; CC-0003 R1]
- **T7 (S)** — Verify-gate integration: `test` unknown→pass; `verify` stays exit-0/degraded; document verdicts. [ADR-0005 D7; CC-0003 R6]
- **T8 (XS)** — Friction resolution entries for #16/#17/#18 via `./harness friction add`. [CC-0003 R4,R9]
- **T9 (L)** — Regression suite `tests/harness/run.sh` updates (TEST-01/05/06/19/20/30/31D) + new TEST-32. [CC-0003 R16]

**Dependency order:** T1 → T2, T4; T3 independent; T5 needs T3; T6/T7/T8 need T5 (T7 also T4); T9 needs T1–T8.

### Harness verbs referenced
13 verbs enumerated from `.harness/contract.yml` + the `harness` script:
`help, orient, doctor, lint, test, build, boot, dev, verify, status, clean, friction add, friction list`.
Planning references only — **no execution verb (lint/test/build/boot/verify/clean) was run**; planning does not execute tasks.
Capability gap: the sandbox has no shell, so `./harness orient`/`status` could not be run live; verbs were read from the contract and script. In a shell-capable env this inference is logged via `./harness friction add`.

### Risks
- **R1 — npm registry network-blocked in-sandbox.** `npm install` cannot run; `package-lock.json`
  cannot be regenerated here. Mitigation: commit `@types/node` in `package.json` devDeps; update the
  lock best-effort; DOCUMENT that a connected `npm install` must refresh it. The verify gate is
  `tsc --noEmit` (not `npm ci`), so lock drift does not fail the gate. (T3)
- **R2 — `--experimental-strip-types` is experimental + flag-gated.** Plain `node file.ts` fails; the
  flag is required and only a strip-types-safe TS subset is allowed. Mitigation: pin Node 22; forbid
  `enum`/`namespace`/parameter-properties in `src/`; centralize the flag in npm scripts. (T2,T6)
- **R3 — `boot` is long-running.** It must never be exec'd inside the run-once verdict handler or the
  regression suite (would hang / bind a port). Mitigation: `mode: exec` handoff (Decision #41);
  the suite asserts `boot --print`, never bare `boot`. (T5,T9)
- **R4 — wiring `test` shifts the `verify` aggregate; `npm test` needs `node_modules`.** Mitigation:
  `verify` stays `degraded`/exit-0 (lint/build still `unknown`, none fail); document the `node_modules`
  prerequisite; guard the suite with a preflight. (T7,T9)
