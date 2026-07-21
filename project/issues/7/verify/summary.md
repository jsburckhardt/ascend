# Verify Summary — #7

## Feature Overview

**Issue:** #7 — Launch one code-server process against a configured path

Issue #7 delivers Ascend's first editor-provider integration: a dependency-light POSIX
launcher (`scripts/launch-editor.sh`) that starts **one** `code-server` process against a
configured local folder, surfaced through the harness as the `mode: exec` `edit` verb
(`./harness edit` / `npm run edit`). Every `code-server`-specific flag is isolated behind
the single launcher seam (PRD §5.7), the launcher validates `PROJECT_PATH` with read-only,
fail-fast checks and never mutates the target directory, and it hands off via `exec` so
`code-server`'s exit code propagates with no added supervision. The design is recorded as
ADR-0006. `code-server` is treated as a documented prerequisite; the browser/terminal
criteria (AC1–AC3) were demonstrated live against a real `code-server` instance (Task T9),
while the path-safety criteria (AC4–AC5) are covered by a code-server-free automated suite.
All five acceptance criteria are now met.

## Branch & PR

| Field | Value |
|-------|-------|
| Branch | `feat/7-code-server-launcher` |
| PR | [feat: launch code-server against a configured project path](https://github.com/jsburckhardt/ascend/pull/20) |

## Commits

All commits are Conventional-Commits, carry the `Co-authored-by: Copilot` and
`Copilot-Session` trailers, are SSH-signed, and report **Verified** on GitHub
(`verification.verified = true`).

| Hash | Message |
|------|---------|
| `91a61e8` | feat: launch code-server against a configured project path |
| `53bb59b` | test: cover launcher path safety and the harness edit verb |
| `662d528` | docs: add ADR-0006 and document the code-server launcher |
| `66a8fad` | docs: register ADR-0006 in the decision log |
| `746f3f4` | docs: add issue #7 RPIV pipeline artifacts |
| `ce28771` | test(launcher): harden no-mutation snapshot with lstat, hashing and symlink targets (F-002) |
| `4231505` | docs(harness): correct npm test scope to include the launcher suite (F-003) |

The T9 live-demo evidence, this summary, and the reviewer's report are recorded in a
final `docs(issue-7): record T9 live demo evidence and review cycle 1` commit (F-001).

## Acceptance Criteria

| Status | Criterion | Evidence |
|--------|-----------|----------|
| ✅ passed | AC4 — invalid-path launch behaviour is documented | Read-only fail-fast on unset/empty/missing/not-a-directory `PROJECT_PATH` (+ absent `code-server`), each a clear stderr message and non-zero exit; documented in the README invalid-path table. Automated: `tests/launcher/launch-editor.test.ts` TEST-L1..L4, TEST-L6. |
| ✅ passed | AC5 — must not delete/move/rename/reset/clean/modify the project directory | Validate-only checks (no `mkdir`/`rm`/`mv`); structural no-mutation snapshot (type/mode/size/mtimeMs + SHA-256 content hash + symlink target, recursive) compared before/after on every valid-launch variant. Automated: TEST-L1, TEST-L3, TEST-L4, TEST-L5, TEST-L6, TEST-L7. Re-confirmed live in Task T9 (before/after byte+SHA-256 snapshot of the project dir identical). Documented as the read-only guarantee in README. |
| ✅ passed | AC1 — documented script launches one code-server instance against a configured path | Live-verified via Task T9 (2026-07-21): `scripts/launch-editor.sh` exec'd exactly one `code-server /tmp/demo-proj --bind-addr 127.0.0.1:8123 --auth none`, producing a single LISTEN socket on `127.0.0.1:8123` (pid 822636); startup ~0.03s to bind / ~1s to first HTTP. Static evidence: TEST-L5 asserts the single isolated argv; TEST-34 proves the `./harness edit` wiring; documented in README "Launch the editor (code-server)". Evidence recorded in `project/issues/7/implementation/README.md` ("T9 Live Demonstration Evidence"). |
| ✅ passed | AC2 — editor reachable in the browser and opens the configured folder | Live-verified via Task T9: `GET /` → `302 …?folder=/tmp/demo-proj` → `200` serving the VS Code Workbench; `GET /healthz` → `200`. Loopback bind `127.0.0.1:${EDITOR_PORT:-8080}` with the `$PROJECT_PATH` positional opens the configured folder. Evidence in `project/issues/7/implementation/README.md`. |
| ✅ passed | AC3 — integrated terminal works within the launched editor | Live-verified via Task T9: code-server's bundled node-pty spawned a real PTY (cwd=`/tmp/demo-proj`) running `pwd; whoami; echo TERMINAL_OK_$((6*7))` → `/tmp/demo-proj` / `vscode` / `TERMINAL_OK_42`, exit 0 — a genuine interactive shell in the project cwd. Evidence in `project/issues/7/implementation/README.md`. |

All five acceptance criteria are now met; no criterion failed or remains not-verifiable.
The issue checkboxes for AC1–AC5 are all checked.

## Review Cycle 1

The local-code-reviewer returned **REQUEST_CHANGES**
(`project/issues/7/review/00-review.md`, verdict `REQUEST_CHANGES`, 1 blocking
finding) with three findings. All three were resolved without changing launcher
behaviour, the `edit` verb, the harness contract, or the wiring — only tests and
documentation changed.

| Finding | Severity | Resolution |
|---------|----------|------------|
| F-001 | blocking | Required manual **Task T9** (AC1–AC3 live demo) had not been performed. The live demonstration was executed successfully (2026-07-21) against a transiently-provisioned code-server 4.129.0 (NOT a repo dependency): one instance on `127.0.0.1:8123` (AC1), browser `GET /` → `302 …?folder=/tmp/demo-proj` → `200` Workbench (AC2), a working PTY terminal in the project cwd emitting `TERMINAL_OK_42` (AC3), and an identical before/after project snapshot (AC5, live). Evidence recorded in `project/issues/7/implementation/README.md` ("T9 Live Demonstration Evidence"). AC1–AC3 are now marked met. |
| F-002 | minor | Strengthened the no-mutation snapshot in `tests/launcher/launch-editor.test.ts`: it now uses `lstat` (never following symlinks) and records per entry the type, permission mode, size, mtimeMs, a SHA-256 content hash for regular files, and the link target for symlinks, walking recursively and compared with `assert.deepEqual`. The snapshot assertion is applied to every valid-launch variant, including the newly snapshotted TEST-L7 (`EDITOR_PORT` override). Detects permission changes, symlink-target changes, and same-size/same-mtime content replacement that the prior size+mtime snapshot could miss. Tests stay code-server-free and zero-dependency; `npm test` → 11/11. |
| F-003 | minor | Corrected two stale `npm test` scope references in `.harness/README.md` (verbs table ~line 49 and the #6 status bullet ~lines 216-219) so both now state that `npm test` runs the application suite (`tests/app/`) **and** the launcher suite (`tests/launcher/`), making the document internally consistent with the delivered `package.json` test glob and its own #7 status note. |


## ADRs & Core-Components

| ID | Title |
|----|-------|
| ADR-0006 | code-server editor-provider launch, argument isolation, and read-only project-path safety (new) |
| ADR-0002 | Minimal, non-speculative architecture (inherited — no speculative EditorProvider) |
| ADR-0003 | Repo-local engineering harness as the operating surface (inherited) |
| ADR-0004 | Interactive/handoff verbs (mode: exec) in the harness (inherited pattern for edit) |
| ADR-0005 | Application-serve runtime; PORT/boot handoff precedent (inherited; names #7 as binding) |
| CORE-COMPONENT-0002 | Conventional Commits (commit discipline) |
| CORE-COMPONENT-0003 | Harness contract R8/R17 (data-driven verb wiring; handoff introspection exemptions) |

## Verification Results

Re-run after the REVIEW-CYCLE-1 fixes (2026-07-21):

| Category | Command | Status |
|----------|---------|--------|
| Aggregate gate | `./harness verify` | degraded — non-blocking, exit 0 (typecheck=pass, test=pass, lint/build=unknown, doctor=pass) |
| Typecheck | `npm run typecheck` | pass (exit 0) |
| Tests | `npm test` | pass — 11/11 (3 app + 8 launcher, incl. hardened no-mutation snapshot) |
| Harness regression | `sh tests/harness/run.sh` | pass — PASS=43 FAIL=0 SKIP=0 (incl. TEST-34 for #7) |
| Harness health | `./harness status` / `./harness doctor` | pass / pass |

The `.github/soft-factory/verification.yml` gate routes through `./harness verify`; a
`degraded` verdict with exit 0 is the accepted, non-blocking Prototype-0 posture per the
harness exit-code contract (same posture as issue #6).

## Environment Caveats

- **code-server provisioned transiently for the live demo.** `code-server` remains a
  documented prerequisite (not a repository dependency; ADR-0006 D7). For the Task T9 live
  demo it was provisioned transiently (code-server 4.129.0 on `PATH`) to demonstrate AC1–AC3;
  it is not part of the repo. The automated launcher suite (AC4–AC5) remains code-server-free
  by stubbing a `code-server` on `PATH`.
- **Registry / `npm ci` lock situation.** The working npm registry here is the Microsoft
  proxy; `npm install` works through it, but `npm ci` does not because the committed lock
  pins some `registry.npmjs.org` URLs that are network-blocked. `node_modules` is
  pre-installed and gitignored, so the verification gate runs against it directly.
- **`package-lock.json` left unchanged.** A local `npm install` regenerated the lock with
  environment-specific proxy URLs and a pre-existing `@types/node`/`undici-types` drift
  inherited from issue #6. Because issue #7 changed no dependencies and committing
  proxy-specific URLs would degrade the lock for other environments, the lock was kept at
  its committed state (consistent, not half-updated). The pre-existing drift is better
  fixed separately with public-registry URLs.

## Generated At

2026-07-21T07:10:00Z
