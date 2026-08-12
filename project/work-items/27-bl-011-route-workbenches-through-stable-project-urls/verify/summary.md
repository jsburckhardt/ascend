# Verification Summary: Issue #27

## Delivery

- **Work item:** `27-bl-011-route-workbenches-through-stable-project-urls`
- **Issue:** BL-011: Route workbenches through stable project URLs
- **Verified branch:** `feat/27-stable-project-workbench-routes`
- **Implementation commit:** `13ce7c87509f90c030cfec2aad95683b5435faf1`
- **Pull request:** https://github.com/jsburckhardt/ascend/pull/28
- **Scope and architecture:** Passed complete branch-diff review against the action plan, ADR, stable-proxy core-component, and decision log.
- **Commit standards:** Passed Conventional Commit and required Copilot trailer review for every implementation commit.

## Acceptance Decisions

- **AC-1 — Passed:** Executable base/descendant route and HTTP tests resolve persisted projects, start/reuse BL-010, preserve suffix/query, constrain loopback targets, and remove internal authority from public surfaces.
- **AC-2 — Passed:** Real Chromium bounded all requests and six WebSockets; Ascend traffic used the stable prefix, only exact grammar-valid Markdown resources were external, and full-page Explorer/Preview remained functional.
- **AC-3 — Passed:** V-3 executed nested GET, bodyless HEAD, deterministic 257 KiB POST with digest equality, and 206 range preservation through real sockets.
- **AC-4 — Passed:** V-4 proved two safe redirect rewrites, external redirect rejection, three cookie Path outcomes, Domain removal, and attribute preservation.
- **AC-5 — Passed:** V-4 injected all eight hop headers in both directions through the stable route for 16 cases plus both connection-token extensions; all injected values were absent after proxying.
- **AC-6 — Passed:** V-5 observed 32 ordered 16 KiB chunks and matching digest, emitted/received chunk-5 barriers, upstream abort closure, runtime survival, and zero proxy resources.
- **AC-7 — Passed:** V-6 executed exact text, binary, ping/pong, clean/abnormal close, timeout, refusal, pending-close, backpressure, and reconnect cases with finite bounds and empty inventories.
- **AC-8 — Passed:** V-2 released four HTTP requests and four upgrades together and observed one launch, one readiness sequence, and one runtime identity.
- **AC-9 — Passed:** V-7 retained hash `94e986e6dc9461ff80c347fc1495911778141c8325514d67eeb3189ba554b143`, 23 unique real stable-route executions, exact mappings, zero redaction matches, and zero resources.
- **AC-10 — Passed:** Executable tests covered all five malformed IDs plus one unknown valid ID and proved hostile authority/forwarding/target headers could not alter target selection.
- **AC-11 — Passed:** Enabled marker-bounded logs exercised ten protected sentinel classes through HTTP, runtime, WebSocket-frame, and terminal-frame channels; literal and encoded scans were zero.
- **AC-12 — Passed:** Barrier-driven tests proved precommit 503 behavior, postcommit close without a second status, client-local cancellation, bounded shutdown, runtime reuse, and zero proxy resources.
- **AC-13 — Passed:** Chromium completed three fresh workflows, six sockets split Management 3 / ExtensionHost 3, zero retries/marketplace/forbidden requests, one runtime identity, and Explorer/Preview/terminal proof.
- **AC-14 — Passed:** Residual audit reported 27 observed inventories, zero pending entries, absent owned processes/listeners, complete resource cleanup, and one surviving control-listener observation.
- **AC-15 — Passed:** Exactly one ignored regular restricted evidence file remained mode `0600`; the public scan reported zero owned-authority matches across 168 artifacts.
- **AC-16 — Passed:** README, API reference, configuration/proof guidance, usage examples, no-migration rationale, architecture, operational runbooks, cleanup, deployment exclusions, and scope boundaries match committed behavior.
- **AC-17 — Passed:** Focused route proof and independent full repository validation both exited zero and ended in successful cleanup/residual audit.

## Validation Results

- **`just verify-workbench-route` — Passed:** 10 Vitest files / 53 tests, one designated Chromium scenario, and residual audit status `ok`.
- **`just verify` — Passed:** Formatting, lint, type checks, package tests/coverage, builds, repository gates, designated proofs, browser tests, BL-011 matrices, and final residual audit.
- **Documentation review — Passed:** All applicable README, API, configuration, usage, migration, architecture, operational, and deployment categories are accurate; no OpenAPI, schema, product configuration, data migration, or deployment change applies.
- **Tracked-tree integrity — Passed:** Hash `3c11929141ff73c9d4e2a3f9fa407af02e74d08ab97ed52371b72d8c26c6433d` was unchanged before and after focused and full validation; the implementation tree remained clean.

## Observation Evidence

- `DL-001`: Required handoff files exceeded the view limit and were re-read with bounded ranges.
- `DL-002`: Designated Chromium required a tool wait longer than 30 seconds.
- `CONF-001`: A safe evidence query encountered an unexpected V-2 field shape and was corrected after schema inspection.
- `DL-003`: Modified-file diff output required smaller review groups.
- `DL-004`: Full validation exceeded 30 seconds and the display limit; isolated-worktree evidence confirmed details.
- `CONF-002`: Python was unavailable for temporary PR-body writing, so the existing Node runtime was used.

## Result

All AC-1 through AC-17 passed. The verified branch was pushed, Pull Request #28 was created, and Issue #27 acceptance checkboxes were updated without changing criterion text.
