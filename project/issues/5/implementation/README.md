# Implementation Notes: Issue #5 — Add local development and validation commands

Implements tasks **T1–T5** from
[`../plan/02-task-breakdown.md`](../plan/02-task-breakdown.md) exactly as
specified, within the decisions **D1–D5** in
[`../plan/01-action-plan.md`](../plan/01-action-plan.md) and validated against
[`../plan/03-test-plan.md`](../plan/03-test-plan.md).

Governing architecture (unchanged): **ADR-0002** (baseline stack / no speculative
frameworks), **ADR-0003** (repo-local harness), **CORE-COMPONENT-0003** (harness
contract — R3 exit codes, R6 verify aggregate, R8 data-driven verbs, R16 durable
suite), **CORE-COMPONENT-0002** (commit standards).

## Environment note (registry blocked)

The public npm registry was unreachable on this checkout (`npm install` failed
with `ERR_SSL_SSLV3_ALERT_HANDSHAKE_FAILURE`). To run the required verification
(typecheck / `./harness verify` / the durable suite, which all need
`node_modules`), TypeScript **5.9.3** (matching the lockfile's `^5.7.3`) was
sourced from the bundled VS Code server and placed under the **git-ignored**
`node_modules/`. This is a local runtime workaround only — no tracked file,
`package.json`, or `package-lock.json` was changed to accommodate it, and
`node_modules/` is gitignored, so the change set is unaffected.

## Files changed (tracked)

| File | Task | Change |
|------|------|--------|
| `package.json` | T1 | Added one script `"dev": "tsc --noEmit --watch"` (typecheck unchanged; no new deps; lockfile untouched). |
| `README.md` | T2 | New "Development and validation" section documenting `npm run dev`, `./harness verify` + `npm run typecheck`, the `degraded`/exit-0 non-blocking note, and the `./harness boot` deferral to #6. |
| `.harness/README.md` | T3 | New "Issue #5 status" subsection: dev inner loop is `npm run dev`; `boot` stays `unknown` (owned by #6); `verify`=`degraded` accepted baseline; no-alias rule. All verb tokens preserved. |
| `.harness/friction.jsonl` | T4 | Appended 5 annotation entries (`lint`/`test`/`build`/`verify`/`boot`) via `./harness friction add`; append-only (no seed line rewritten). |
| `tests/harness/run.sh` | T5 | Added durable **TEST-30** (static assertions + isolated `./harness verify`); header comment updated. |

**Deliberately NOT touched** (CORE-COMPONENT-0003 R8; D1/D2/D3): the `harness`
script, `.harness/contract.yml` (`boot.maps_to` stays `null`, `verify.maps_to`
stays `"npm run typecheck"`), `tsconfig.json`, `package-lock.json`,
`.github/soft-factory/verification.yml`, `src/`.

---

## Task T1: Add the `dev` development-inner-loop script to package.json

- **Status:** Done
- **Files Changed:** `package.json`
- **Tests Passed:** T1 ACs (via TEST-30 §1, TEST-M1) — all
- **Tests Failed:** 0

### Changes Summary
Added `"dev": "tsc --noEmit --watch"` to `scripts`. No dependency added;
`typecheck` unchanged; no `validate`/`check`/`test`/`lint`/`build`/`start` alias.

### Test Results
- `scripts.dev` == `tsc --noEmit --watch` ✓; `scripts.typecheck` == `tsc --noEmit` ✓.
- No `validate`/`check`/`test`/`lint`/`build`/`start` script present ✓.
- `package.json` valid JSON ✓; `devDependencies` unchanged ✓; `package-lock.json`
  unchanged ✓.
- **TEST-M1 (manual):** `npm run dev` starts a persistent watch — output
  `Starting compilation in watch mode... Found 0 errors. Watching for file
  changes.` (killed via a hard timeout; never run inside the suite).

---

## Task T2: Document dev + validation commands in the root README

- **Status:** Done
- **Files Changed:** `README.md`
- **Tests Passed:** T2 ACs (via TEST-30 §2, TEST-P2/P3) — all
- **Tests Failed:** 0

### Changes Summary
Added a "Development and validation" section after "Getting Started" documenting:
`npm run dev` (starts the local dev environment); `./harness verify` (preferred)
and `npm run typecheck` (validation); the honest `degraded`/exit-0 = non-blocking
Prototype-0 "passing" state; and the `./harness boot` = `unknown` note with
harness wrapping of the dev/serve process owned by #6. No `validate`/`check`
alias. Existing content (product boundary, directory structure, `npm install`
setup) preserved.

### Test Results
- README contains `npm run dev`, `./harness verify`, `npm run typecheck`,
  `degraded`, `non-blocking` ✓; the `./harness boot` → #6 deferral is stated ✓.
- No `npm run validate` / `npm run check` alias documented ✓.

---

## Task T3: Update `.harness/README.md` for the dev command and boot/verify status

- **Status:** Done
- **Files Changed:** `.harness/README.md`
- **Tests Passed:** T3 ACs (via TEST-30 §3, existing TEST-11) — all
- **Tests Failed:** 0

### Changes Summary
Added an "Issue #5 status: dev inner loop and validation" subsection: dev inner
loop is `npm run dev` (run directly); `boot` stays `unknown` and is owned by #6
(interactive-process handling); `verify`=`degraded` is the accepted Prototype-0
baseline; `npm run typecheck` is wrapped only by `verify` (never aliased). The
`harness` script and `.harness/contract.yml` were not touched.

### Test Results
- Names `npm run dev`; states `boot` `unknown` / owned by #6; reaffirms
  `verify`=`degraded` and the no-alias rule ✓.
- **TEST-11 regression:** all verb tokens (`help`…`friction`), verdicts
  (`pass`/`fail`/`degraded`/`unknown`), `--json`, `./harness`, and the verbatim
  KEY_QUESTION still present ✓.

---

## Task T4: Append friction annotations to keep the log's closures truthful

- **Status:** Done
- **Files Changed:** `.harness/friction.jsonl`
- **Tests Passed:** T4 ACs (via TEST-30 §5, existing TEST-08/09/27, TEST-P6) — all
- **Tests Failed:** 0

### Changes Summary
Appended 5 entries via `./harness friction add` (never hand-edited):
- `lint` / `test` / `build` — closure re-pointed off #5 (marker
  `Deferred beyond #5: … per ADR-0002 (no speculative frameworks)`).
- `verify` — `Accepted-degraded at #5: verify=degraded/exit-0 is the accepted
  Prototype-0 validation surface; full pass deferred`.
- `boot` — `Owned by #6: … the dev inner loop today is npm run dev`.

### Test Results
- Log grew 9 → 14 entries; `friction list --json` valid; 0 entries missing the
  verbatim KEY_QUESTION or with an empty closure ✓.
- Append-only: `git diff --numstat` = `8 added, 0 removed` (3 from Research +
  5 from T4); no seed line rewritten ✓.
- Post-#5 `boot` closure names `#6` ✓; three `lint`/`test`/`build` closures carry
  the `Deferred beyond #5` marker ✓.

---

## Task T5: Add durable regression coverage for #5's acceptance criteria

- **Status:** Done
- **Files Changed:** `tests/harness/run.sh`
- **Tests Passed:** All 36 (TEST-01..30, FAIL=0)
- **Tests Failed:** 0

### Changes Summary
Added **TEST-30** before the Summary block. It is fully **static** (file greps
plus the already-clean, node/typecheck-gated `./harness verify` with writes
isolated to the scratch dir). It asserts: (1) `package.json` `dev`/`typecheck`
values + no alias; (2) root README tokens incl. `degraded`/`non-blocking`;
(3) `.harness/README.md` names `npm run dev` and defers `boot` to `#6`;
(4) `contract.yml` `boot.maps_to: null` + a single `verify.maps_to: "npm run
typecheck"` (no drift); (5) friction closures (`Owned by #6`, `Deferred beyond
#5`); and it runs `./harness verify` asserting non-`fail` + exit 0. It **never**
executes `npm run dev` and maps **no** blocking command to `boot` (TEST-20 would
hang). Header comment updated to reference TEST-30.

### Test Results
```
PASS  TEST-30 #5 dev+validation wired honestly (verify=degraded non-fail exit 0; no drift)
-------------------------------------------------------
Totals: PASS=36 FAIL=0 SKIP=0
Verdict: pass
```

---

## Verification results (exit criteria)

| Check | Command | Result |
|-------|---------|--------|
| 1. Setup | `npm install` | Registry blocked; TypeScript 5.9.3 sourced into git-ignored `node_modules/` (see Environment note). |
| 2. Typecheck | `npm run typecheck` | **exit 0** |
| 3. Harness verify | `./harness verify` | **`Verdict: degraded`, exit 0** (non-blocking; expected Prototype-0 passing state) |
| 4. Durable suite | `sh tests/harness/run.sh` | **`Verdict: pass`** — Totals `PASS=36 FAIL=0 SKIP=0` |
| 5. Working tree | `git status` / `git status --ignored` | Only the 5 intended tracked files modified + `project/issues/5/`; evidence files and `node_modules/` are gitignored; no scratch dirs left in `/tmp`. |

### Acceptance criteria (issue) — status
- **A documented command starts the local development environment** — ✓
  `npm run dev` (README + `.harness/README.md`; TEST-30 §1, TEST-M1).
- **A documented validation command runs and passes on the baseline** — ✓
  `./harness verify` (`degraded`/exit-0, non-blocking = "passes" per D3) +
  `npm run typecheck` (exit 0); TEST-30 §6, existing TEST-04/05/17.
- **The commands are wrapped/invokable through the harness CLI** — ✓ validation
  fully wrapped by `./harness verify`; dev command surfaced via the harness docs
  with `./harness boot` honestly `unknown` (interactive wrapping owned by #6, D2).
- **Both commands are documented in the README** — ✓ root `README.md` and
  `.harness/README.md` (TEST-30 §2/§3, TEST-P3).

No ADR/core-component deviation was required; all changes stayed inside ADR-0002,
ADR-0003, and CORE-COMPONENT-0003 (harness script and `contract.yml` unchanged).
Commits/PR are owned by the Verify stage.
