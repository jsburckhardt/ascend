# Verify Summary — #6

## Feature Overview

**Issue:** #6 — Add a minimal Ascend health endpoint and application shell

Delivered a minimal Ascend web application shell with a `/health` liveness endpoint (Prototype-0). The runtime is a dependency-free `node:http` server (ADR-0005): `src/server.ts` exports a `createAppServer()` factory that serves `GET /` as a thin `200 text/html` shell, `GET /health` as `200 application/json {"status":"ok"}`, and `404` for anything else; `src/main.ts` owns the single real `.listen()` on `PORT` (default 3000). The server runs directly under `node --experimental-strip-types` — no web framework and no build step (ADR-0002 "no framework"). The engineering harness wires the app through data-only contract edits (CORE-COMPONENT-0003): `boot` is a `mode: exec` interactive handoff mapped to `npm run start`, and `test` maps to `npm test`, folding the real `node:test` suite into `./harness verify`. All three acceptance criteria were validated against the implementation with a timeout-bounded live probe plus the unit/integration suite and documentation. No application source, ADR, core-component, or DECISION-LOG content was altered during Verify — only this summary and git/PR/issue state.

## Branch & PR

| Field | Value |
|-------|-------|
| Branch | `feat/6-app-shell-health-endpoint` |
| PR | [feat: serve minimal application shell and /health endpoint](https://github.com/jsburckhardt/ascend/pull/19) |

## Commits

All six commits are SSH-signed (ED25519) and show as **Verified** on GitHub (`verified=true`, reason `valid`). Every commit follows Conventional Commits (CORE-COMPONENT-0002) and carries the `Co-authored-by: Copilot` and `Copilot-Session` trailers.

| Hash | Message |
|------|---------|
| c142866 | feat: serve application shell and /health endpoint |
| 2b23dc2 | test: cover application shell and health endpoint |
| 96059da | chore(harness): wire boot and test verbs to the app runtime |
| 643166c | docs: register ADR-0005 application serve runtime |
| 7866c00 | docs: document application shell and health endpoint usage |
| fdef845 | docs: add issue #6 RPIV pipeline artifacts |

## Acceptance Criteria

| Status | Criterion | Evidence |
|--------|-----------|----------|
| ✅ passed | Ascend serves a minimal application shell at a browser URL | Timeout-bounded live probe: `GET /` → `200`, `content-type: text/html; charset=utf-8`, non-empty `<!doctype html>` shell. Implemented in `src/server.ts` (`SHELL_HTML` + `/` route); covered by `tests/app/shell.test.ts` (`npm test` 3/3 pass) and durable `tests/harness/run.sh` TEST-32b. |
| ✅ passed | A health endpoint returns a success status when the service is running | Live probe: `GET /health` → `200`, `content-type: application/json`, body `{"status":"ok"}`. Implemented in `src/server.ts` (`/health` route); covered by `tests/app/health.test.ts` and TEST-32b. |
| ✅ passed | The shell and health endpoint start via the documented dev command | `./harness boot` (`mode: exec`) execs `npm run start` → `node --experimental-strip-types src/main.ts`, binding `PORT` (default 3000). Verified live via `PORT=38080 npm run start` (server logged it was serving, then released the port with no leaked process). `./harness boot --print` → `npm run start`; `--json` → `mode: exec`. Documented in `README.md` (run command, route table, `PORT` override, curl checks); contract wiring covered by TEST-32. |

## ADRs & Core-Components

| ID | Title |
|----|-------|
| ADR-0005 | Ascend application-serve runtime (HTTP server, TypeScript runtime execution, and `boot` lifecycle) — new |
| ADR-0002 | Ascend baseline technology stack and repository layout (no framework) |
| ADR-0003 | Adopt a repo-local engineering harness (`./harness`) as the operating surface |
| CORE-COMPONENT-0003 | Engineering harness contract, verdicts, and evidence/friction conventions (`boot`/`test` wiring, R17 handoff) |
| CORE-COMPONENT-0002 | Commit Standards (Conventional Commits) |

DECISION-LOG registers ADR-0005 with decisions #47–#59.

## Verification Results

| Category | Command | Status |
|----------|---------|--------|
| Gate (canonical) | `./harness verify` | degraded, exit 0 (accepted non-blocking Prototype-0 gate — `typecheck=pass`, `test=pass`, `lint`/`build=unknown`, `doctor=pass`) |
| Typecheck | `npm run typecheck` | pass, exit 0 |
| App suite | `npm test` | pass (3/3), no hang |
| Durable suite | `sh tests/harness/run.sh` | pass (`PASS=40 FAIL=0 SKIP=0`, `Verdict: pass`, no hang/leak) |
| Live AC probe | timeout-bounded `npm run start` + `curl /health`, `curl /` | `/health` → 200 `{"status":"ok"}`; `/` → 200 HTML shell; unknown route → 404; port released, no leaked process |

## Environment Caveats

- The npm registry is network-blocked in this sandbox, so `npm install` / `npm ci` cannot run. `node_modules/` (git-ignored) was reconstructed offline with `typescript@5.7.3` + `@types/node@22.10.5`, which lets the gate commands run offline. The verify gate is `tsc --noEmit` (not `npm ci`), so lock drift does not affect the verdict.
- `package-lock.json` was intentionally not regenerated (impossible offline) and must be refreshed by a connected `npm install` before/after merge. This is documented in the README and the issue #6 implementation notes.

## Generated At

2026-07-21T02:25:46Z
