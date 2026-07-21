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
ADR-0006. `code-server` is treated as a documented prerequisite, so the browser/terminal
criteria (AC1–AC3) are covered by a documented manual demo while the path-safety criteria
(AC4–AC5) are covered by a code-server-free automated suite.

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

## Acceptance Criteria

| Status | Criterion | Evidence |
|--------|-----------|----------|
| ✅ passed | AC4 — invalid-path launch behaviour is documented | Read-only fail-fast on unset/empty/missing/not-a-directory `PROJECT_PATH` (+ absent `code-server`), each a clear stderr message and non-zero exit; documented in the README invalid-path table. Automated: `tests/launcher/launch-editor.test.ts` TEST-L1..L4, TEST-L6. |
| ✅ passed | AC5 — must not delete/move/rename/reset/clean/modify the project directory | Validate-only checks (no `mkdir`/`rm`/`mv`); byte-for-byte snapshot equality before/after on every code path. Automated: TEST-L1, TEST-L3, TEST-L4, TEST-L5, TEST-L6. Documented as the read-only guarantee in README. |
| ⬜ not verifiable | AC1 — documented script launches one code-server instance against a configured path | Static evidence present: `scripts/launch-editor.sh` execs exactly one `code-server "$PROJECT_PATH" --bind-addr … --auth none`; TEST-L5 asserts the single isolated argv; TEST-34 proves the `./harness edit` wiring; documented in README "Launch the editor (code-server)". Live browser confirmation needs a code-server-provisioned host (manual demo, ADR-0006 D7). |
| ⬜ not verifiable | AC2 — editor reachable in the browser and opens the configured folder | Loopback bind `127.0.0.1:${EDITOR_PORT:-8080}` and the `$PROJECT_PATH` positional; requires a running `code-server` (absent here). Documented manual demo in `project/issues/7/implementation/README.md`. |
| ⬜ not verifiable | AC3 — integrated terminal works within the launched editor | `code-server` default capability once launched; requires a running `code-server`. Covered by the documented manual demo. |

Machine-validatable criteria (AC4, AC5) pass; no criterion failed. AC1–AC3 await a live
demo on a code-server-provisioned host and were left unchecked on the issue with a status
comment.

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

| Category | Command | Status |
|----------|---------|--------|
| Aggregate gate | `./harness verify` | degraded — non-blocking, exit 0 (typecheck=pass, test=pass, lint/build=unknown, doctor=pass) |
| Typecheck | `npm run typecheck` | pass (exit 0) |
| Tests | `npm test` | pass — 11/11 (3 app + 8 launcher) |
| Harness regression | `sh tests/harness/run.sh` | pass — PASS=43 FAIL=0 SKIP=0 (incl. TEST-34 for #7) |
| Harness health | `./harness status` / `./harness doctor` | pass / pass |

The `.github/soft-factory/verification.yml` gate routes through `./harness verify`; a
`degraded` verdict with exit 0 is the accepted, non-blocking Prototype-0 posture per the
harness exit-code contract (same posture as issue #6).

## Environment Caveats

- **code-server not installed (manual demo pending).** `code-server` is a documented
  prerequisite and is absent in this devcontainer/CI, so AC1–AC3 (browser reachable,
  folder opens, integrated terminal) are verified by the documented manual demo rather
  than automation. AC4–AC5 are fully automated via a code-server-free suite that stubs a
  `code-server` on `PATH`.
- **Registry / `npm ci` lock situation.** The working npm registry here is the Microsoft
  proxy; `npm install` works through it, but `npm ci` does not because the committed lock
  pins some `registry.npmjs.org` URLs that are network-blocked. `node_modules` is
  pre-installed and gitignored, so the verification gate runs against it directly.
- **`package-lock.json` left unchanged.** A local `npm install` regenerated the lock with
  environment-specific proxy URLs and a pre-existing `@types/node`/`undici-types` drift
  inherited from issue #6. Because issue #7 changed no dependencies and committing
  proxy-specific URLs would degrade the lock for other environments, the lock was reverted
  to its committed state (consistent, not half-updated). The pre-existing drift is better
  fixed separately with public-registry URLs.

## Generated At

2026-07-21T06:35:00Z
