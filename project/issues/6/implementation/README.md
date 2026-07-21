# Implementation Notes: Issue #6 — application shell + `/health` endpoint

Implements tasks **T1–T9** from
[`../plan/02-task-breakdown.md`](../plan/02-task-breakdown.md) within decisions
**D1–D8** of [`../plan/ADR-0005`](../../../architecture/ADR/ADR-0005-application-serve-runtime.md)
/ [`../plan/01-action-plan.md`](../plan/01-action-plan.md), validated against every
test in [`../plan/03-test-plan.md`](../plan/03-test-plan.md)
(TEST-A1/A2/A3, TEST-H1–H4, TEST-R1, TEST-V1, TEST-M1, and the new harness
TEST-32/32b).

Governing architecture: **ADR-0005** (application-serve runtime — `node:http`
server, `node --experimental-strip-types` runtime execution, `boot` lifecycle,
`node:test` runner, `test`-verb wiring — decisions D1–D8), **ADR-0002** (baseline
stack / no framework / no new runtime deps), **ADR-0003** (repo-local harness as
the single operating surface), **ADR-0004** (interactive/handoff verbs — `boot` is
now a `mode: exec` handoff), and **CORE-COMPONENT-0003** (harness contract — R6
aggregate, R8 data-driven verbs, R16 durable suite, R17 interactive/handoff verbs).
No ADR or core-component was modified; **no deviation was required** (see
[Deviations](#deviations--decisions)).

## Environment note (npm registry blocked — do NOT `npm install`)

The public npm registry is unreachable on this checkout (`npm install` / `npm ci`
fail with SSL/403). The **git-ignored** `node_modules/` already contains
`typescript@5.7.3` and `@types/node@22.10.5` (reconstructed from a CDN by the
orchestrator), so `npm run typecheck`, `npm test`, `./harness verify`, and the
durable suite all run offline **right now**. Consequences, documented here and in
the root `README.md`:

- **`package-lock.json` was NOT regenerated.** `@types/node ^22` was added to
  `package.json` `devDependencies`, but the lockfile cannot be refreshed offline
  (no valid integrity hash can be produced without the registry). A **connected
  `npm install` must refresh the lock** on a networked machine. This does **not**
  fail any gate: the verify gate is `tsc --noEmit`, not `npm ci`, and typecheck
  already passes with the present `@types/node`.
- **`"type": "module"` was added** to `package.json`. The `src/`/`tests/app/`
  sources are ESM (`import`/`export`) with explicit `.ts` import specifiers under
  `module: NodeNext`, so declaring the package ESM is the correct, explicit
  configuration. This eliminates the `MODULE_TYPELESS_PACKAGE_JSON` reparse
  warning and its stated performance overhead on every `npm run start`/`npm test`.
  It was verified NOT to break the harness suite's `node -e 'require(...)'` probes
  (Node treats `--eval` input as CommonJS regardless of the package `type`, so
  `require(...)` still works): `sh tests/harness/run.sh` → `PASS=40 FAIL=0 SKIP=0`,
  `npm run typecheck` → exit 0, and `npm test` → 3/3 pass all confirmed with
  `type: module` present. The one remaining, expected stderr line is
  `ExperimentalWarning: Type Stripping` (inherent to `--experimental-strip-types`
  per ADR-0005 D2); it does not affect exit codes or stdout TAP/JSON.

## Files changed (tracked)

| File | Task | Change |
|------|------|--------|
| `src/server.ts` *(new)* | T1 | `createAppServer(): http.Server` factory over built-in `node:http` (no framework). Routes `GET /health` → `200 application/json {"status":"ok"}`, `GET /` → `200 text/html` thin shell (`SHELL_HTML` const), everything else → `404`. Returns a **non-listening** server (tests inject `.listen(0)`). Strip-types-safe (no `enum`/`namespace`/parameter-properties). Strips query strings so `/health?x=1` still matches. |
| `src/main.ts` *(new)* | T2 | Thin entrypoint for `npm run start`: imports `createAppServer()`, `.listen(Number(process.env.PORT) || 3000)`, logs one line `Ascend serving on http://localhost:${port}`. No routing logic. |
| `src/placeholder.ts` *(deleted)* | T1 | Removed (`git rm`); replaced by the real app source per ADR-0005. |
| `package.json` | T3 | Added `"@types/node": "^22"` to `devDependencies`; added scripts `"start": "node --experimental-strip-types src/main.ts"` and `"test": "node --test --experimental-strip-types 'tests/app/**/*.test.ts'"`. `dev`/`typecheck` unchanged; no runtime dependency added. |
| `tsconfig.json` | T3 | Removed `"rootDir": "src"`, expanded `"include"` to `["src", "tests/app"]`, and added `"allowImportingTsExtensions": true` (kept `"noEmit": true`) so `tsc --noEmit` typechecks both `src/` and the tests without TS6059, and the runtime `.ts` import specifiers typecheck (option **a** from the plan). |
| `tests/app/support.ts` *(new)* | T4 | `withServer(fn)` helper: binds `createAppServer()` on `.listen(0, "127.0.0.1")`, passes a base URL, and **always closes** the server in a `finally` (no leaked handle). Not a `*.test.ts`, so the runner imports but never executes it. |
| `tests/app/health.test.ts` *(new)* | T4 | **TEST-A1**: `GET /health` → 200, `content-type: application/json`, body `deepEqual {status:"ok"}`. |
| `tests/app/shell.test.ts` *(new)* | T4 | **TEST-A2**: `GET /` → 200, `text/html`, non-empty body matching `/<html/i`. **TEST-A3**: `GET /does-not-exist` → 404 (drains body to release the socket). |
| `.harness/contract.yml` | T5 | **Data-only** (R8): `boot` → `maps_to: "npm run start"`, `mode: exec`, updated description; `test` → `maps_to: "npm test"`, updated description. `dev`, `lint`, `build`, `verify` unchanged. |
| `harness` (script) | T6 | **Prose-only** truthfulness edits (no dispatch/logic change): help-heredoc `boot`/`test` lines now describe the wired commands; the `verify` `notes` string no longer claims `test` is unknown "until Issue #5". |
| `README.md` | T6 | Documented `./harness boot` as the shell+health start command (execs `npm run start` → `node --experimental-strip-types src/main.ts`); kept `./harness dev` as the typecheck **watch** (not a server); documented the `/health` contract, `/` shell, default port **3000** + `PORT`, a route table, and the offline package-lock caveat. |
| `.harness/README.md` | T6 | Verb table + interactive-verbs section now cover `dev` **and** `boot` (both `mode: exec`); verify-aggregation prose updated so `test` is `pass`; Issue-status section updated to #5/#6; `--json` examples added. |
| `.harness/friction.jsonl` | T8 | Appended (append-only, via `./harness friction add`) three resolution entries for the #6 inferences — `boot` (D1/D2/D4 → `npm run start`), `test` (D7 → `npm test`), `dev` (D5 → start via `./harness boot`). 18 → 21 lines. |
| `tests/harness/run.sh` | T9 | Rewired the durable suite for the newly-wired `boot`/`test` and added **TEST-32/32b**; the suite never runs bare `./harness boot`. Details in [Task T9](#task-t9-update-the-harness-regression-suite). |

**Deliberately NOT touched:** `ADR-0005`, `DECISION-LOG.md`, and other
architecture files (Plan-owned; the ADR-0005 registry entry + decisions 47–59 are
Plan artifacts already present in the worktree), `verify.maps_to`
(`"npm run typecheck"`), the `verify` aggregate/exit-code contract, `dev`/`lint`/
`build` wiring, and the harness dispatch logic.

---

## Task T1: `src/server.ts` — `createAppServer()` HTTP server

- **Status:** Done
- **Files Changed:** `src/server.ts` (new), `src/placeholder.ts` (removed)
- **Tests Passed:** TEST-A1, TEST-A2, TEST-A3 (via T4), TEST-32(3)
- **Tests Failed:** 0

### Changes Summary
`createAppServer()` returns a **non-listening** `http.Server` built on `node:http`
`createServer` (no framework, no build step, zero runtime dep — ADR-0002 / D1).
The request handler implements the D6 route contract exactly: `GET /health` →
`200 application/json` `{"status":"ok"}`; `GET /` → `200 text/html; charset=utf-8`
serving the `SHELL_HTML` thin shell (minimal markup, no client JS/assets — D6 /
PRD §4 hyp.6); any other method/route → `404 text/plain`. Query strings are
stripped before matching. Strip-types-safe (no `enum`/`namespace`/parameter
properties — D2).

### Test Results
Covered by the node:test suites (T4) and the live probe. `npm run typecheck`
(`tsc --noEmit`) → **exit 0**.

---

## Task T2: `src/main.ts` — entrypoint / `npm run start`

- **Status:** Done
- **Files Changed:** `src/main.ts` (new)
- **Tests Passed:** TEST-H4, TEST-M1, TEST-32b
- **Tests Failed:** 0

### Changes Summary
Thin bootstrap: `import { createAppServer } from "./server.ts"`, resolves
`const port = Number(process.env.PORT) || 3000`, `.listen(port, …)`, and logs one
startup line `Ascend serving on http://localhost:${port}`. It owns the single real
`.listen()`; all routing lives in `createAppServer()`. The explicit `./server.ts`
specifier is required by `--experimental-strip-types` (runtime keeps the `.ts`
extension) and typechecks via `allowImportingTsExtensions`.

### Test Results
Timeout-guarded live probe (default port 3000): startup line printed; `/health` →
`200 application/json {"status":"ok"}`; `/` → `200 text/html` shell; `/nope` →
`404`; port released after the `timeout`. TEST-32b re-proves this hermetically on
a high port under the durable suite.

---

## Task T3: `package.json` scripts/deps + `tsconfig.json`

- **Status:** Done
- **Files Changed:** `package.json`, `tsconfig.json`
- **Tests Passed:** TEST-32(1)(2), TEST-30(1)(2), TEST-V1
- **Tests Failed:** 0

### Changes Summary
- `package.json`: added `@types/node ^22` (devDeps); added `start`/`test` scripts;
  `dev`/`typecheck`/deps otherwise unchanged.
- `tsconfig.json`: removed `rootDir: "src"`, `include: ["src", "tests/app"]`,
  `allowImportingTsExtensions: true`, `noEmit: true` retained. This is the plan's
  **option (a)** — it typechecks the tests too while avoiding TS6059
  ("not under rootDir") and supporting the `.ts` import specifiers.

### Test Results
`npm run typecheck` → **exit 0**, no errors (src + tests). TEST-30 still confirms
no `validate`/`check`/`lint`/`build` alias scripts and the unchanged `dev`/
`typecheck`. `package-lock.json` left as-is (see the environment note).

---

## Task T4: `tests/app/*` — node:test integration suites

- **Status:** Done
- **Files Changed:** `tests/app/support.ts`, `tests/app/health.test.ts`, `tests/app/shell.test.ts` (all new)
- **Tests Passed:** TEST-A1, TEST-A2, TEST-A3
- **Tests Failed:** 0

### Changes Summary
Built-in `node:test` + `node:assert/strict` + global `fetch`; **zero new deps**
(D7). `withServer` binds an ephemeral port and closes the server in teardown, so no
handle leaks. Three tests cover the full route contract.

### Test Results
```
npm test  →  TAP: ok 1..3  (# pass 3  # fail 0)  exit 0
  1) GET /health -> 200 application/json {"status":"ok"}
  2) GET / -> 200 text/html thin shell (non-empty)
  3) GET /does-not-exist -> 404
```
Runs offline, no hang, no leaked port. (Two harmless stderr warnings — see the
environment note.)

---

## Task T5: Wire `boot`/`test` in `.harness/contract.yml` (data-only)

- **Status:** Done
- **Files Changed:** `.harness/contract.yml`
- **Tests Passed:** TEST-H1, TEST-H2, TEST-H3, TEST-01, TEST-32(1)
- **Tests Failed:** 0

### Changes Summary
Data-only wiring (R8; ADR-0005 D4/D7): `boot` → `npm run start` with `mode: exec`
(interactive handoff, so the harness never binds a port itself); `test` →
`npm test` (capability verb, no mode). No harness dispatch code touched — dispatch
is already `mode`-aware from Issue #5.

### Test Results
- `./harness boot --print` → `npm run start`, exit 0, **no server started**.
- `./harness boot --json` → `{… "mode": "exec", "maps_to": "npm run start", "interactive": true}`, no `verdict`, exit 0.
- `./harness test` → `Verdict: pass`, exit 0.

---

## Task T6: Documentation + prose coherence

- **Status:** Done
- **Files Changed:** `README.md`, `.harness/README.md`, `harness` (prose only)
- **Tests Passed:** TEST-11, TEST-30(6), TEST-32(7), doc-review
- **Tests Failed:** 0

### Changes Summary
`README.md` and `.harness/README.md` now document `./harness boot` (→ `npm run
start` → `node --experimental-strip-types src/main.ts`) as the shell+health start
command, keep `./harness dev` as the **typecheck watch** (explicitly *not* a
server), and cover the `/health` contract, `/` shell, default port 3000 + `PORT`,
and the offline package-lock caveat. The `harness` script received **prose-only**
edits (help heredoc `boot`/`test` lines + the `verify` `notes` string) so its
human output no longer contradicts the wired contract. README, contract, and
harness output are mutually consistent.

> **Scope note on the `harness` edit.** The task's "DATA ONLY — do not edit the
> `harness` script" applies to *wiring/dispatch*; the task also requires updating
> help/orient/doctor prose and keeping harness output truthful. Only static,
> human-facing strings were changed (no `dispatch_verb`/`verb_*` logic, no new
> behavior). `orient` does not mention `boot`; `doctor`'s `boot` reference only
> fires on `degraded` (doctor is `pass` here), so only the help lines + the stale
> `notes` string needed correcting.

### Test Results
Root-README tokens (`./harness boot`, `npm run start`, `/health`, `3000`, `PORT`,
`{"status":"ok"}`, plus `./harness dev`/`verify`/`npm run typecheck`/`degraded`/
`non-blocking`) all present; no `npm run validate`/`check`. `.harness/README.md`
lists `dev` + names `npm run start` + retains the `boot`/#6 line. TEST-11/30/32
green.

---

## Task T7: `verify` aggregate moves `test` to `pass`

- **Status:** Done (emergent from T5; no separate code change)
- **Files Changed:** — (verified behavior)
- **Tests Passed:** TEST-V1, TEST-05, TEST-32(5)(6)
- **Tests Failed:** 0

### Changes Summary
With `test` wired, the R6 `verify` aggregate now resolves the `test` member by
running `npm test`, moving it from `unknown` to `pass`. `verify` stays
`degraded`/exit-0 (lint/build remain `unknown`; none fail) — the accepted
Prototype-0 "passing" gate (D5/D8).

### Test Results
- `./harness verify --json` → `verdict: degraded`, member `test = pass` (`maps_to:
  "npm test"`), `typecheck = pass`, `doctor = pass`, `lint/build = unknown`,
  exit 0.
- `./harness verify` (human) → `test : pass`, `Verdict: degraded`, exit 0.

---

## Task T8: `.harness/friction.jsonl` resolution entries

- **Status:** Done
- **Files Changed:** `.harness/friction.jsonl`
- **Tests Passed:** TEST-08, TEST-09, TEST-27
- **Tests Failed:** 0

### Changes Summary
Appended three resolution entries via `./harness friction add` (append-only,
verbatim KEY_QUESTION preserved) for the #6 inferences: `boot` (wired `mode: exec`
→ `npm run start`), `test` (`npm test` → node:test), and `dev` (shell+health starts
via `./harness boot`, keeping `dev` the typecheck watch). File grew 18 → 21 lines;
all lines are valid JSON.

### Test Results
`./harness friction list` parses; suite TEST-08/09/27 green.

---

## Task T9: Update the harness regression suite

- **Status:** Done
- **Files Changed:** `tests/harness/run.sh`
- **Tests Passed:** **TEST-R1** — `PASS=40 FAIL=0 SKIP=0`, `Verdict: pass`, no hang, no leaked port
- **Tests Failed:** 0

### Changes Summary
Rewired the suite for the newly-wired `boot`/`test`; **bare `./harness boot` is
never run** (it would exec `npm run start`, bind a port and hang) — invocability is
asserted via `boot --print`/`--json`. Edits:

- **`TEST_OK` preflight** — added alongside `TC_OK`: gates the wired-`test`
  assertions on whether `npm test` runs green.
- **TEST-01** — dropped `boot`/`test` from the `maps_to==null` loop (now
  `lint build`); added positive assertions `boot.maps_to=="npm run start"` +
  `boot.mode=="exec"` + `test.maps_to=="npm test"`.
- **TEST-05** — `test=unknown` → `test=pass` (gated on `TEST_OK`).
- **TEST-06** — loop reduced to `lint build` (running bare `boot`/`test` would
  hang / return a verdict).
- **TEST-19** — cases 3 & 4 explicitly `set_maps … test 'null'` so the fake-root
  contracts don't run `npm test` where there is no `package.json`.
- **TEST-20** — removed `boot` from the run-to-completion loop; added a
  `boot --print` no-hang/verdict-free assertion (mirrors the `dev --print` one).
- **TEST-22 / TEST-26 / TEST-28** — nulled the `test` member in their isolated
  scratch contracts so `verify` doesn't re-run `npm test` in a tight loop
  (TEST-22 ×20) or in fake roots (mirrors the TEST-19 rationale; keeps the suite
  fast and deterministic).
- **TEST-30** — `boot.maps_to==null` → `=="npm run start"`; relaxed the
  forbidden-scripts lists to allow `test`/`start`; label/comments updated.
- **TEST-31D** — replaced bare `./harness boot` (would hang) with `boot --print`
  asserting `npm run start`, exit 0, no `Verdict:` line.
- **TEST-32 (new)** — proves issue #6 end-to-end without binding a port: contract
  `boot`(exec)/`test` wiring, `package.json` `start`/`test` + `@types/node`,
  `src/server.ts`/`main.ts` presence, `boot --print`/`--json` handoff,
  `./harness test`→pass + `verify` `degraded`/`test=pass` (gated on `TEST_OK`), and
  README/`.harness/README` doc coherence.
- **TEST-32b (new)** — a `timeout`-bounded live probe: binds `node
  --experimental-strip-types src/main.ts` on a high port (39517), asserts
  `/health` 200 `{"status":"ok"}`, `/` 200 HTML, unknown→404, then tears down; can
  never hang or leak (guarded by `timeout`; skipped without `timeout`/`curl`/node).

### Test Results
```
sh tests/harness/run.sh  →  Totals: PASS=40 FAIL=0 SKIP=0 ; Verdict: pass
```
Completes in ~70s, no hang, no leaked port (verified: no lingering node process;
port 39517 closed after the run).

---

## Verification results (exit criteria)

| # | Check | Command | Result |
|---|-------|---------|--------|
| 1 | Typecheck | `npm run typecheck` | **exit 0**, no errors (src + tests) |
| 2 | Unit/integration tests | `npm test` | **3/3 pass**, exit 0, no hang, no leaked port |
| 3a | Boot print | `./harness boot --print` | prints **`npm run start`**, **exit 0**, no server started |
| 3b | Boot json | `./harness boot --json` | valid descriptor (`mode:"exec"`, `maps_to:"npm run start"`, `interactive:true`, **no `verdict`**), exit 0 |
| 4 | Test verb | `./harness test` | `test: pass (wrapped: npm test)` → **`Verdict: pass`**, exit 0 |
| 5a | Verify json | `./harness verify --json` | `verdict:"degraded"`, member **`test`=`pass`** (`npm test`), `typecheck`/`doctor`=`pass`, `lint`/`build`=`unknown`, exit 0 |
| 5b | Verify human | `./harness verify` | `test : pass`, **`Verdict: degraded`**, exit 0 |
| 6 | Live probe (guarded) | `timeout 4 node --experimental-strip-types src/main.ts` + `curl` | `/health` → 200 `{"status":"ok"}`; `/` → 200 HTML shell; `/nope` → 404; port released after timeout |
| 7 | Durable suite | `sh tests/harness/run.sh` | **`Verdict: pass`** — `PASS=40 FAIL=0 SKIP=0`, no hang, no leaked port |
| 8 | Working tree | `git status` | only intended files changed; `node_modules/` + `.harness/evidence/*` gitignored; no scratch left |

### Acceptance criteria (issue) — status
- **AC1 — serves a minimal application shell at a browser URL** — ✓ `GET /` → 200
  `text/html` thin shell (TEST-A2, TEST-32b live probe, TEST-M1).
- **AC2 — health endpoint returns success when running** — ✓ `GET /health` → 200
  `application/json` `{"status":"ok"}` (TEST-A1, TEST-32b, TEST-M1).
- **AC3 — shell + health start via the documented command** — ✓ `./harness boot`
  (→ `npm run start` → `node --experimental-strip-types src/main.ts`), documented
  in `README.md` + `.harness/README.md` (TEST-H1/H2/H3, TEST-32, doc-review).

## Deviations & decisions

**No ADR-0005 / CORE-COMPONENT-0003 deviation was required.** Notable
implementation decisions:

1. **Test script glob (environment-forced, not a deviation).** ADR-0005 D7
   specifies the runner "over `tests/app/`". Node **22.17.1** treats a *directory*
   argument to `node --test` as a module entry and fails (`Cannot find module …/
   tests/app`). The `test` script therefore uses Node's built-in glob
   `'tests/app/**/*.test.ts'` (single-quoted so the shell passes it literally to
   Node's own expansion). This still runs exactly the `tests/app/` suites required
   by D7 — an implementation detail, not an architectural change.
2. **`tsconfig` option (a).** Removed `rootDir` and included `tests/app` +
   `allowImportingTsExtensions` so `tsc --noEmit` typechecks both `src/` and the
   tests cleanly (no TS6059), and the strip-types `.ts` import specifiers
   typecheck.
3. **Prose-only `harness` edit** (help lines + `verify notes`) for truthfulness —
   no dispatch/logic change; the DATA-ONLY constraint (wiring) is respected.
4. **`package-lock.json` not regenerated** — see the environment note; it does not
   affect the `tsc --noEmit` verify gate. **`"type": "module"` was added** to
   `package.json` to match the ESM (`import`/`export`, NodeNext, `.ts` specifiers)
   sources and remove the `MODULE_TYPELESS_PACKAGE_JSON` warning/perf overhead;
   confirmed harmless to the `node -e 'require(...)'` harness probes (suite 40/40).

Changes stayed inside ADR-0002/0003/0004/**0005** and CORE-COMPONENT-0003. Commits
/ PR are owned by the Verify stage.

## Review cycle 1 (F-01/F-02/F-03) fixes

Applied the three PR #6 REVIEW findings from
[`../review/00-review.md`](../review/00-review.md) after the planner refined
ADR-0005 D2 + DECISION-LOG (Node runtime floor **≥ 22.6.0**; `doctor` →
`degraded` on major-22 minor < 6). **No ADR/DECISION-LOG edits here** (Plan owns
those). Code/config/test files changed: `package.json`, `README.md`, `harness`,
`tests/harness/run.sh`. Re-validation: `npm run typecheck` → exit 0;
`npm test` → 3/3; `./harness doctor` → **pass** (Node 22.17.1); `./harness verify`
→ **degraded**, exit 0; `sh tests/harness/run.sh` → **PASS=42 FAIL=0 SKIP=0**.

### F-01 (major) — honest `>=22.6.0` runtime floor
`--experimental-strip-types` first shipped in Node **v22.6.0**, so Node 22.0–22.5
cannot run the app. Made the declared range and `doctor` honest:

- **`package.json`** — `engines.node` `>=22 <23` → **`>=22.6.0 <23`**.
- **`.nvmrc`** — kept `22` (nvm resolves the newest 22.x, i.e. ≥ 22.6.0), per the
  planner's T3 note.
- **`README.md`** — Getting Started now states the runtime floor is **Node.js
  ≥ 22.6.0 (< 23)** and *why* (`--experimental-strip-types` needs ≥ 22.6.0); a new
  "Runtime floor" callout in the *Run the application* section repeats it and notes
  `doctor` → `degraded` (never `fail`) below the floor.
- **`harness`** — refined the `compute_doctor`/node-readiness **logic** (sanctioned
  by ADR-0005 D2 + Decision #61; not a dispatch/wiring change):
  - Added a portable `node_minor()` helper (`node -v` → strip `v`, drop the major,
    take the field before the next dot; empty/guarded if unparseable) and a
    `NODE_MINOR_FLOOR=6` constant.
  - `compute_doctor` now, when the running Node is **major 22 but minor < 6**, sets
    the node check not-OK and verdict **`degraded`** (exit 0, **never `fail`**) with
    reason *"node 22.<minor> below supported floor 22.6.0 required by
    --experimental-strip-types (engines >=22.6.0 <23)"*. Node ≥ 22.6.0 within major
    22 stays OK/`pass`; major ≠ 22 keeps its existing out-of-range `degraded`.
  - `doctor --json` `checks[node]` now also emits `minor` and `required_range`
    (`>=22.6.0 <23`) via `json_escape`; the human line reads `node >= 22.6.0 : …`.
  - Updated the stale ~line-344 comment from `>=22 <23` to `>=22.6.0 <23`.
  - `verify`'s aggregate is intact: doctor `degraded` folds to `degraded` (R6),
    never turning `verify` into `fail`. On this machine (Node 22.17.1) `doctor`
    stays **`pass`**.

**Doctor minor-check logic summary:** if `node` present and `major == required
(22)`, then if `minor < 6` → node not-OK + `degraded` (floor reason); else node OK.
Otherwise (major ≠ 22 / node absent) the pre-existing out-of-range/absent
`degraded` paths are unchanged. All paths remain exit 0 (never `fail`).

### F-02 (minor) — truthful `verify` friction / notes
The non-pass-aggregate friction claimed members `(test, lint, build)` "have no
backing command" and that "Issue #5 … can reach pass" — false now that `test` is
wired (`npm test`) and passes. Fix in `harness` `verb_verify`:

- Derive the unknown members **dynamically** (`_unknown_members`, built from the
  actual per-member verdicts during aggregation), so the text names only the real
  gaps — currently **`lint, build`** (never `test`).
- Rewrote the friction inference/proof-gap/closure to be truthful and
  issue-agnostic: names `${_unknown_members}`, states typecheck + the wired
  capability verbs are the proven surface, and that lint/build "remain
  intentionally unwired (ADR-0002 …) pending a validated need" — **no `test`
  mention, no `Issue #5`**. The evidence `notes` is likewise dynamic.
- Re-scanned the whole `harness` for stale `Issue #5`/issue-number prose and
  corrected the remaining three (unmapped-verb closure, `clean` closure, `doctor`
  degraded closure) to truthful, issue-agnostic wording. `git grep 'Issue #5'
  harness` is now empty.
- **Regression TEST-32c** (`tests/harness/run.sh`): an empty-friction-log `verify`
  against the REAL contract records a friction entry that names `lint, build`,
  does **not** contain `test`, and does **not** reference `Issue #5`.

**Truthful friction text (verify, degraded):** inference — *"The verify aggregate
is degraded because these members have no backing command: lint, build; the agent
had to infer that the repo's proven verification surface is the wrapped typecheck
plus the already-wired capability verbs."*; closure — *"lint, build remain
intentionally unwired (ADR-0002: no linter/build step yet) pending a validated
need; wire their maps_to in contract.yml when a real command exists."*

### F-03 (minor) — TEST-32b live-probe isolation/timeout
`tests/harness/run.sh` TEST-32b bound a **fixed** port 39517 with untimed `curl`s.
Made it robust and deterministic:

- **Ephemeral port** — a `free_port()` helper asks the OS for a free port using the
  repo `node` (`net.createServer().listen(0,'127.0.0.1')`, read the assigned port,
  close), passed via `PORT=`. Skips cleanly if no free port is obtained.
- **Per-curl client timeout** — every `curl` now carries
  `--connect-timeout 2 --max-time 5` (via `CURL_TMO`), so a hung/foreign listener
  can neither stall the test nor silently defeat the assertions.
- Kept the `timeout`/`gtimeout`-guarded server bind, explicit numeric-PID `kill`
  (not `pkill`/`killall`), and `wait`. Still deterministic; never hangs/leaks
  (verified: last run used ephemeral port 40987, no leftover `main.ts` process).

### TEST-33 (planner T9) — doctor Node-floor boundary regression
Added `tests/harness/run.sh` **TEST-33**, independent of this machine's Node: it
stubs a fake `node` on `PATH` (the same shim seam as TEST-21) and asserts
`./harness doctor --json` → **`degraded`** (exit 0, never `fail`) for **v22.5.0**
with a reason naming the **22.6.0** floor and `checks[node].ok=false`, and
**`pass`** (node-OK) for **v22.6.0** and **v22.17.1**. Guarded to **SKIP** cleanly
if the stub mechanism is unavailable (no node / unwritable shim dir). **TEST-33
RAN** (did not skip) in re-validation. Also updated **TEST-21** so its major-22
stub uses **v22.6.0** (≥ floor) instead of `v22.0.0` (which now correctly
degrades), keeping the 21/22/23 major-boundary intent.

### Re-validation outputs
- `npm run typecheck` → **exit 0**.
- `npm test` → **pass 3 / fail 0** (`tests/app/` health + shell + 404).
- `./harness doctor` → **Verdict: pass** (`node >= 22.6.0 : true`); `doctor --json`
  valid JSON (now carries `minor` + `required_range`).
- `./harness verify` → **Verdict: degraded**, exit 0 (`typecheck=pass`,
  `lint=unknown`, `test=pass`, `build=unknown`, `doctor=pass`); `verify --json`
  valid.
- `sh tests/harness/run.sh` → **Totals: PASS=42 FAIL=0 SKIP=0**, `Verdict: pass`
  (was 40; +TEST-32c, +TEST-33; TEST-32b now uses an ephemeral port).
- Sanity: `git grep 'Issue #5' harness` → none; `git grep '>=22 <23' -- harness
  package.json README.md` → none. (`package-lock.json` retains `>=22 <23` as the
  documented offline lock drift — it also still lacks `@types/node`/`type: module`;
  a connected `npm install` reconciles all of it. ADR-0003 / CORE-COMPONENT-0003 /
  prior-issue history keep their historical `>=22 <23` references — Plan's domain;
  no CC-0003 amendment required per ADR-0005 D2.)

**Boundaries:** the only `harness` change was the sanctioned `compute_doctor`
minor-floor **logic** + truthful friction/notes prose; dispatch and
command-resolution are untouched (regression TEST-31 mode-authoritative still
green). No `src/server.ts`/`src/main.ts` change (no finding required one). No
ADR/core-component edited — no deviation required.
