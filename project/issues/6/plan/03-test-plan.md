# Test Plan: Issue #6 — application shell + health endpoint

## Scope & references
- Feature: #6. ADR: **ADR-0005**. New core-components: **none** (CC-0003 governs the harness).
- Runner: built-in `node:test` + global `fetch` via `node --test --experimental-strip-types`; zero new deps.
- Harness verbs referenced (from `.harness/contract.yml` + `harness` script; **not executed during
  planning**): `boot, test, verify, dev, friction add, help, orient, status, doctor, lint, build, clean`.
  Execution verbs (lint/test/build/boot/verify/clean) are NOT run in planning.
- Capability-gap note: the sandbox has no shell, so `./harness orient`/`status` could not be run live;
  verbs were enumerated from the contract + script. In a shell-capable env, record via
  `./harness friction add` (KEY_QUESTION).

## Acceptance-criteria → test coverage
| Acceptance Criterion | Tests |
|---|---|
| AC1 — serves a minimal application shell at a browser URL | TEST-A2, TEST-H4, TEST-M1 |
| AC2 — health endpoint returns success when running | TEST-A1, TEST-H4, TEST-M1 |
| AC3 — shell + health start via the documented dev command | TEST-H1, TEST-H2, TEST-M1, doc-review (T6), TEST-32 (via TEST-R1) |

---

## Test TEST-A1: `GET /health` → 200 `{"status":"ok"}`

- **Type:** Integration (node:test)
- **Task:** T4 (server from T1)
- **Priority:** High

### Setup
Start `createAppServer()` on an ephemeral port (`.listen(0)`); read `server.address().port`.

### Steps
1. `fetch(\`http://127.0.0.1:${port}/health\`)`.
2. Read status, `content-type`, and JSON body.
3. Close the server in teardown.

### Expected Result
Status **200**; `content-type: application/json`; body deep-equals `{"status":"ok"}`.

---

## Test TEST-A2: `GET /` → 200 HTML shell

- **Type:** Integration (node:test)
- **Task:** T4 (server from T1)
- **Priority:** High

### Setup
`createAppServer()` on an ephemeral port.

### Steps
1. `fetch('/')` against the ephemeral port.
2. Read status, `content-type`, body.
3. Close the server in teardown.

### Expected Result
Status **200**; `content-type: text/html`; non-empty body containing the minimal shell markup.

---

## Test TEST-A3: unknown route → 404

- **Type:** Integration (node:test)
- **Task:** T4 (server from T1)
- **Priority:** Medium

### Setup
`createAppServer()` on an ephemeral port.

### Steps
1. `fetch('/does-not-exist')`.
2. Read status.
3. Close the server in teardown.

### Expected Result
Status **404**.

---

## Test TEST-H1: `./harness boot --print` resolves start command, no hang

- **Type:** Harness (introspection)
- **Task:** T5, T9
- **Priority:** High

### Setup
Wired contract (T5) in a shell environment.

### Steps
1. Run `./harness boot --print`.
2. Capture stdout + exit code.

### Expected Result
Prints the resolved `npm run start` (does **not** execute it); exits 0; returns immediately
(no server bound, no hang).

---

## Test TEST-H2: `./harness boot --json` descriptor

- **Type:** Harness (introspection)
- **Task:** T5
- **Priority:** Medium

### Setup
Wired contract.

### Steps
1. `./harness boot --json`.
2. Parse the JSON descriptor.

### Expected Result
Descriptor shows `maps_to: "npm run start"`, `mode: "exec"`; exit 0; no execution.

---

## Test TEST-H3: `./harness test` → pass; verify shows test=pass

- **Type:** Harness (capability verdict)
- **Task:** T5, T7
- **Priority:** High

### Setup
`node_modules` present (`typescript` + `@types/node`); wired contract; tests authored (T4).

### Steps
1. `./harness test` → capture the verdict.
2. `./harness verify --json` → read the `test` field.

### Expected Result
`./harness test` → **pass** (exit 0). `verify --json` shows `test=pass` (previously `unknown`).

---

## Test TEST-H4: guarded end-to-end boot probe

- **Type:** E2E (guarded; may be manual / CI-gated)
- **Task:** T2, T7, T9
- **Priority:** Medium

### Setup
`node_modules` present; port 3000 free (or set `PORT`).

### Steps
1. `timeout 3 ./harness boot &` (or `npm run start &`) — start the server in the background with a
   hard timeout.
2. `curl -s -o /dev/null -w '%{http_code}' localhost:3000/health` and `localhost:3000/`.
3. Kill the process / let the timeout expire.

### Expected Result
`/health` → 200 body `{"status":"ok"}`; `/` → 200 HTML. Process terminates cleanly via timeout/kill
(never left running in CI). **Note:** because `boot` is `mode: exec` (long-running), this probe MUST be
time-boxed; the durable suite (TEST-R1) uses `boot --print`, not a live bind.

---

## Test TEST-R1: regression suite green, no hang

- **Type:** Regression (harness suite)
- **Task:** T9
- **Priority:** High

### Setup
Updated `tests/harness/run.sh` (T9); `node_modules` present for the `TEST_OK` preflight.

### Steps
1. `sh tests/harness/run.sh`.
2. Observe pass/fail + completion.

### Expected Result
All cases pass; the suite completes with **no hang** and no leaked port; TEST-01/05/06/19/20/30/31D
reflect the wired boot/test; TEST-32 passes.

---

## Test TEST-M1: manual browser verification

- **Type:** Manual
- **Task:** T2, T6
- **Priority:** Medium

### Setup
Run the documented start command `./harness boot` (→ `npm run start`).

### Steps
1. Open `http://localhost:3000/` in a browser → see the shell.
2. Open `http://localhost:3000/health` → see `{"status":"ok"}`.
3. Ctrl-C to stop.

### Expected Result
Shell renders at `/`; `/health` shows `{"status":"ok"}` with 200. Confirms AC1/AC2/AC3 against the
documented command.

---

## Test TEST-V1: `./harness verify` non-fail

- **Type:** Harness (aggregate gate)
- **Task:** T7
- **Priority:** High

### Setup
`node_modules` present; all tasks landed.

### Steps
1. `./harness verify`.
2. Capture verdict + exit code.

### Expected Result
Exit 0; verdict **degraded** (`test=pass`, `doctor=pass`, `lint=unknown`, `build=unknown`; none fail).
`tsc --noEmit` passes with `@types/node`.
