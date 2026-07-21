# Task Breakdown: Issue #6 — application shell + health endpoint

## Task T1: Implement `src/server.ts` — `createAppServer()` HTTP factory

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** None
- **Related ADRs:** ADR-0005 (D1 node:http, D6 route contract, D2 strip-types-safe)
- **Related Core-Components:** CORE-COMPONENT-0003 (R1 wrap-never-reimplement)

### Description
Create `src/server.ts` exporting `createAppServer(): http.Server`, built on `node:http`
`createServer` (no framework). The factory returns a **non-listening** server so tests inject an
ephemeral port. Router: `GET /health` → 200 `application/json` `{"status":"ok"}`; `GET /` → 200
`text/html` deliberately thin shell (PRD §4 hyp6 / §5.5 — minimal markup, no client JS/assets);
any other path/method → 404. Keep code strip-types-safe (no `enum`/`namespace`/parameter properties).

### Acceptance Criteria
- `src/server.ts` exists and exports `createAppServer()` returning an `http.Server` not yet bound.
- Imports only `node:*` stdlib; zero third-party runtime deps.
- `/health` → 200, `content-type: application/json`, body exactly `{"status":"ok"}`.
- `/` → 200, `content-type: text/html`, non-empty minimal shell.
- Unknown route/method → 404.
- `tsc --noEmit` passes for the file (needs T3 `@types/node`).

### Test Coverage
- `node:test` (T4): **TEST-A1** (health), **TEST-A2** (shell), **TEST-A3** (404) exercise this
  factory on an ephemeral port with global `fetch`.
- Typecheck: `./harness verify` (`tsc --noEmit`) must pass.

---

## Task T2: Implement `src/main.ts` — listen entry point

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T1
- **Related ADRs:** ADR-0005 (D1, D2 runtime exec, D6 port)
- **Related Core-Components:** —

### Description
Create `src/main.ts` importing `createAppServer()` and calling `.listen(port)` where
`port = Number(process.env.PORT) || 3000`. Log one startup line (e.g.
`Ascend serving on http://localhost:3000`). This is the process entry executed by
`node --experimental-strip-types src/main.ts` (the `start` script). No routing here — keep it a
thin bootstrap so the server stays unit-testable without binding a fixed port.

### Acceptance Criteria
- `src/main.ts` exists; executing it starts a listening server on `PORT` or 3000.
- Prints a startup line including the resolved URL/port.
- Contains no route handling (delegates entirely to `createAppServer()`).
- Strip-types-safe; `tsc --noEmit` passes.

### Test Coverage
- **TEST-H4** (guarded e2e boot probe) and **TEST-M1** (manual browser). Not covered by `node:test`
  unit tests (they use the factory on an ephemeral port to avoid binding a fixed port).

---

## Task T3: `package.json` — `@types/node` devDependency + `start`/`test` scripts

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** None
- **Related ADRs:** ADR-0005 (D2, D3, D7)
- **Related Core-Components:** —

### Description
Add `@types/node` (`^22`, matching Node 22) to **devDependencies** (compile-time-only tooling,
analogous to the existing `typescript` devDep permitted by ADR-0002). Add scripts:
`"start": "node --experimental-strip-types src/main.ts"` and
`"test": "node --test --experimental-strip-types tests/app/"`. Confirm `tsconfig.json` `include`
covers `src/` and `tests/app/` and stays `noEmit`. **package-lock:** npm registry is network-blocked
in-sandbox, so `package-lock.json` cannot be regenerated here — update best-effort and DOCUMENT (PR body +
README) that a connected `npm install` must refresh it. Verify gate is `tsc --noEmit` (not `npm ci`),
so lock drift does not fail `./harness verify`.

> **Refinement (PR #6 review F-01 — ADR-0005 D2):** also set `engines.node` to
> **`>=22.6.0 <23`** (was `>=22 <23`). `--experimental-strip-types` first ships in
> Node **v22.6.0**, so 22.0–22.5 cannot run `start`/`test`. Keep `.nvmrc` as `22`
> (nvm resolves the newest 22.x, which is ≥22.6.0).

### Acceptance Criteria
- `devDependencies` includes `@types/node` `^22`.
- `engines.node` is `>=22.6.0 <23` (PR #6 F-01 / ADR-0005 D2 runtime floor); `.nvmrc` stays `22`.
- `scripts.start` and `scripts.test` present with the exact commands above.
- `tsconfig.json` remains `noEmit` and includes the new source/test globs.
- Offline lock caveat documented (README/PR).

### Test Coverage
- **TEST-H3** / **TEST-V1** confirm `npm test` runs via `./harness test` and `tsc --noEmit` (verify)
  passes with `@types/node` present.
- Regression: **TEST-R1** (`run.sh`) stays green.

---

## Task T4: Author `node:test` integration suites (`tests/app/`)

- **Status:** Not started
- **Complexity:** M
- **Dependencies:** T1, T3
- **Related ADRs:** ADR-0005 (D1, D6, D7 node:test)
- **Related Core-Components:** CORE-COMPONENT-0003 (R16 durable tests)

### Description
Create `tests/app/health.test.ts` and `tests/app/shell.test.ts` using the built-in `node:test`
runner and global `fetch` (zero new deps). Each test starts `createAppServer()` on an ephemeral
port (`.listen(0)`), reads `server.address().port`, issues `fetch`, asserts, and closes the server
in teardown. Assertions: `/health` → 200 + `application/json` + `{"status":"ok"}`; `/` → 200 +
`text/html` + non-empty body; unknown route → 404. Run via
`node --test --experimental-strip-types tests/app/` (the `test` script).

### Acceptance Criteria
- `tests/app/health.test.ts` and `tests/app/shell.test.ts` exist and pass under
  `node --test --experimental-strip-types`.
- Tests bind ephemeral port `0` (never a fixed port); each closes its server in teardown
  (no leaked handles/hangs).
- Zero third-party test/runtime deps.
- `npm test` exits 0 with all tests passing.

### Test Coverage
- This task **is** the test code for **TEST-A1/A2/A3**. Executed via `./harness test` (**TEST-H3**)
  and `npm test`.

---

## Task T5: Wire `.harness/contract.yml` — `boot` (mode:exec) + `test`

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T3
- **Related ADRs:** ADR-0005 (D4 boot handoff, D5 dev-vs-serve, D7 test verb)
- **Related Core-Components:** CORE-COMPONENT-0003 (R6 verify aggregate, R8 data-driven wiring, R17 mode:exec handoff)

### Description
Edit `.harness/contract.yml` **data only** — no `harness` script change (dispatch is already
mode-aware; TEST-31A proves a `mode: exec` boot handoff works). Set `boot.maps_to: "npm run start"`,
`boot.mode: exec`, `boot.json: true`; set `test.maps_to: "npm test"` (capability verb, no mode → runs
to completion and yields a verdict). Leave `dev` unchanged (typecheck watch). Do NOT wire
`lint`/`build` (remain `unknown`).

### Acceptance Criteria
- `boot` resolves to `npm run start` with `mode: exec`; `./harness boot --print` prints the resolved
  command and exits 0 **without executing it**.
- `test` resolves to `npm test`; `./harness test` runs the suite and yields `pass`.
- No change to the `harness` script; `dev`, `lint`, `build` behavior unchanged.

### Test Coverage
- **TEST-H1** (`boot --print` no-hang), **TEST-H2** (`boot --json` descriptor),
  **TEST-H3** (`test`→pass; verify shows test=pass). Regression **TEST-R1** covers the updated suite.

---

## Task T6: Documentation coherence — README + `help`/`orient`/`doctor`

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T5
- **Related ADRs:** ADR-0005 (D5 dev-vs-serve, D6 contract)
- **Related Core-Components:** CORE-COMPONENT-0003 (R1 truthful operating surface)

### Description
Update README (and any prose `help`/`orient`/`doctor` descriptor text that is not data-derived) to
document truthfully: (a) **start the shell + health endpoint** with `./harness boot` (execs
`npm run start` → `node --experimental-strip-types src/main.ts`); (b) `./harness dev` remains a
**typecheck watch**, NOT a server — resolve the AC3 "documented dev command" ambiguity explicitly;
(c) the `/health` contract (`200 {"status":"ok"}`) and `/` shell; (d) default port 3000 + `PORT`
override; (e) the offline `package-lock` caveat from T3. Keep README, contract, and `help`/`orient`
mutually consistent.

> **Refinement (PR #6 review F-01 — ADR-0005 D2):** README MUST state the supported
> runtime is **Node `>=22.6.0 <23`** (not merely "Node 22") and explain why
> (`--experimental-strip-types` needs ≥22.6.0). Refine `compute_doctor`/`node_major`
> so that when the running Node is major 22 but minor < 6 it reports **`degraded`**
> (exit 0, never `fail`) with a clear reason (e.g. "Node 22.x < 22.6.0 cannot run
> --experimental-strip-types"). This is CORE-COMPONENT-0003 R15 applied to the
> narrowed `engines.node` range — a localized `compute_doctor` change, **no CC-0003
> amendment**.

### Acceptance Criteria
- README documents `./harness boot` as the shell+health start command and distinguishes it from
  `./harness dev` (typecheck watch).
- README documents the `/health` response, `/` shell, port/`PORT`, and the lock caveat.
- No contradiction between README, `.harness/contract.yml`, and `help`/`orient` output.
- README documents the `>=22.6.0 <23` runtime floor and why; `./harness doctor` reports `degraded` (never `fail`) on Node major 22 / minor < 6.

### Test Coverage
- Doc review (checklist) + **TEST-M1** (manual browser follows the documented command).
  **TEST-H1/H2** confirm the documented `boot` command matches the contract.

---

## Task T7: Verify-gate integration — `test` unknown→pass, `verify` stays exit-0

- **Status:** Not started
- **Complexity:** S
- **Dependencies:** T4, T5
- **Related ADRs:** ADR-0005 (D7)
- **Related Core-Components:** CORE-COMPONENT-0003 (R6 verify aggregate)

### Description
Confirm and document the effect of wiring `test`: the `verify` aggregate
(`[lint, test, build, doctor]`, R6) now includes a real `test=pass`. `verify` must remain
**degraded / exit 0** because `lint` and `build` are still `unknown` (not `fail`). A turn/`verify`
fails only if `tsc --noEmit` (typecheck) OR `npm test` fails. Document that `npm test` requires
`node_modules` present (offline caveat) — ensure the documented run path has deps. Record expected
verdicts: `test=pass`, `lint=unknown`, `build=unknown`, `doctor=pass`, aggregate=`degraded`, exit 0.

### Acceptance Criteria
- `./harness verify --json` shows `test=pass` (was `unknown`).
- `./harness verify` exits 0 with verdict `degraded` (lint/build still `unknown`, none fail).
- Documented: `verify` fails only on typecheck or test failure; `npm test` needs `node_modules`.

### Test Coverage
- **TEST-H3** (verify shows test=pass), **TEST-V1** (verify exit 0 / degraded),
  **TEST-R1** (suite reflects the new aggregate truth).

---

## Task T8: Friction resolution entries (#16 boot / #17 test / #18 dev)

- **Status:** Not started
- **Complexity:** XS
- **Dependencies:** T5
- **Related ADRs:** ADR-0005 (D4, D7)
- **Related Core-Components:** CORE-COMPONENT-0003 (R4/R9 friction conventions)

### Description
The research stage already logged inference entries #16 (boot), #17 (test), #18 (dev) in
`.harness/friction.jsonl` (2026-07-21). Append **resolution** entries via `./harness friction add`
(append-only; never edit prior lines) recording that #6/ADR-0005 resolved them: `boot` now
`mode: exec` → `npm run start`; `test` now `npm test` → `pass`; `dev` clarified as a typecheck watch
distinct from the serve command. (Planning does not execute; this runs during implementation in a
shell-capable env.)

### Acceptance Criteria
- New append-only `friction.jsonl` entries reference #6/ADR-0005 and resolve the boot/test/dev inferences.
- No existing friction lines edited or removed.

### Test Coverage
- Manual review of `./harness friction list`. No automated assertion (append-only log).

---

## Task T9: Update the harness regression suite (`tests/harness/run.sh`)

- **Status:** Not started
- **Complexity:** L
- **Dependencies:** T1–T8
- **Related ADRs:** ADR-0005 (D4, D7)
- **Related Core-Components:** CORE-COMPONENT-0003 (R16 regression suite, R6 aggregate, R17 mode:exec enumeration)

### Description
Update `tests/harness/run.sh` for the newly-wired `boot`/`test` (the suite currently asserts they are
unwired). **Never run bare `./harness boot`** in the suite (binds a port / hangs) — assert via
`boot --print`. Specific edits:
- **TEST-01** (`for v in lint test build boot` asserting `maps_to==null`): drop `boot` & `test`; add
  positive assertions `boot.maps_to=="npm run start"` + `mode==exec`, `test.maps_to=="npm test"`.
- **TEST-05** (`verify --json` asserts `test=unknown`): change to `test=pass` (gate on a `TEST_OK`
  preflight since `npm test` needs `node_modules`).
- **TEST-06** (loop `lint test build boot` unknown+friction): reduce to `lint build`.
- **TEST-19** (aggregate truth table cases 3 & 4): explicitly set `test`/`build`/`lint` to `null` in
  those isolated fake-root contracts so they don't try to run `npm test` in a fake root.
- **TEST-20** (run-to-completion loop includes `boot`): remove `boot`; add a `boot --print` assertion
  (mirror the existing `dev --print`).
- **TEST-30** (asserts `boot_maps==null`): update to the wired value.
- **TEST-31D** (bare `./harness boot` expecting `Verdict: unknown` — would now HANG): change to assert
  `boot --print` resolves `npm run start`.
- **ADD TEST-32**: new block proving issue #6 — `boot` exec handoff resolves `npm run start` (via
  `--print`), `test`→`pass`, `verify` non-fail/degraded, docs coherent. Guard any port-binding probe
  with `timeout`; never leave a server running.
- **ADD TEST-33 (PR #6 F-01 / ADR-0005 D2):** assert the refined `doctor` Node-floor diagnostic —
  using the suite's existing Node-version stubbing (the same seam that drives the range-boundary
  cases), a Node whose minor < 6 (e.g. `v22.5.1`) makes `./harness doctor --json` report `degraded`
  (exit 0, never `fail`) with a reason naming the `>=22.6.0` floor, while a Node ≥22.6.0 within major
  22 still passes the Node check. Confirm the change is localized to `compute_doctor` (no CC-0003 amendment).

### Acceptance Criteria
- `sh tests/harness/run.sh` runs to completion, all cases pass, **no hang** and no leaked port.
- TEST-01/05/06/19/20/30/31D updated as above; TEST-32 and TEST-33 added and passing.
- The suite never executes bare `./harness boot`.

### Test Coverage
- **TEST-R1** (whole suite green, no hang) is the acceptance test for this task.
