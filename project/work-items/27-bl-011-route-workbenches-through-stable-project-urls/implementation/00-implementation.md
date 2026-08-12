# Implementation Notes: Issue #27

## Completed Tasks

- T-0: Preserved linked-worktree repository validation and cancellation-versus-early-exit classification with three concurrent cancellation regressions; removed renderer-specific terminal readiness waits, explicitly focused the terminal input, bounded cancellation PID observation within a 60-second overall episode window with an 80-second test bound, and resolved proof commands from each owned worktree root, and gave process-absence observation a finite 5-second load margin.
- T-1: Preserved the stable proxy contract, exact 23-row public failure catalog, direct `ws` ownership, and loopback-only runtime arguments.
- T-2: Preserved stable HTTP/upgrade routing, eight-client single-flight startup, and application lifecycle ownership.
- T-3: Completed byte-preserving HTTP matrices, streamed authority rewriting, chunk-5 cancellation, and downstream-transform completion.
- T-4: Completed the exact bounded WebSocket matrix, named connection-role observation, shutdown outcomes, and peer cleanup.
- T-5: Executed the payload, header, stream, WebSocket, 23-injected-failure, target-confusion, redaction, concurrency, and shutdown matrices.
- T-6: Implemented the exact Markdown resource hostname grammar, 23 classifier vectors, bounded browser-local inventory, disabled marketplace proof, and real three-workflow Chromium record; terminal completion now waits for atomically written proof evidence after stdout flush rather than xterm renderer internals.
- T-7: Enforced bounded restricted evidence, mode `0600`, unfiltered request inventory, six named sockets, public scans, observed cleanup inventories, and residual audits.
- T-8: Corrected paved validation, API examples, README/runbook content, Plan artifacts, ADR, core-component, and decision log.

## Acceptance Evidence

- **AC-1:** `workbench-proxy-manager.ts` and route/HTTP tests resolve persisted projects, reuse one loopback BL-010 snapshot, preserve suffix/query, stream selected text safely, and expose no internal authority on public surfaces.
- **AC-2:** The real Chromium record inventories 124 requests: 92 stable Ascend-owned, 24 exact grammar-valid Markdown resources, and 8 stable-origin non-network browser-local resources. All six WebSockets use the stable prefix; Explorer and Preview pass in all three workflows.
- **AC-3:** `workbench-proxy-http.test.ts` passes nested GET metadata, bodyless HEAD, deterministic 257 KiB POST digest, and byte-range status/header/body proof; the large transformed JavaScript regression proves complete downstream flush.
- **AC-4:** Contract and real-socket tests prove root-relative and selected-authority redirect rewrites, external redirect rejection, all three cookie Path outcomes, Domain removal, and preservation of Secure/HttpOnly/SameSite.
- **AC-5:** Explicit request and response cases strip every named hop header and connection-token extension; WebSocket tests retain only required upgrade semantics.
- **AC-6:** The executable stream record observes 32 ordered 16 KiB chunks with expected SHA-256, delayed consumption, emitted/received chunk-5 barriers, client abort, upstream close, zero fixture/client/proxy sockets, and a still-running runtime.
- **AC-7:** `workbench-proxy-websocket.test.ts` executes only text, 64 KiB binary, ping/pong, clean 1000 close/reason, abnormal local-1006 outcome, timeout, refusal, pending-handshake close, 16 ordered 32 KiB frames, and two reconnects; all peer audits close.
- **AC-8:** `workbench-route-acceptance.test.ts` releases exactly four HTTP requests and four upgrades from one barrier and observes one launch/readiness sequence and one PID/start/port identity.
- **AC-9:** The predeclared failure table has 23 unique rows and hash `94e986e6dc9461ff80c347fc1495911778141c8325514d67eeb3189ba554b143`. Evidence records exactly 23 injected executions with matching status/code/message and nine redaction scans.
- **AC-10:** Exact `400` outcomes execute for `../x`, `%2f`, `%5c`, `%00`, and the 129-character ID; a well-formed unknown ID returns `404`, and hostile Host/Forwarded/proxy-target values cannot change the selected fixture.
- **AC-11:** Controlled traffic carries distinct internal-port, canonical-path, authorization, cookie, query, body, command/environment, WebSocket, and terminal sentinels. Bounded response/log scans report zero literal or encoded matches; restricted browser evidence reports zero raw webview hostname and encoded-token matches.
- **AC-12:** Barrier-driven tests prove precommit HTTP/upgrade `503`, postcommit stream/socket closure without a second status, client-local cancellation, runtime reuse, bounded settlement, and zero proxy resources.
- **AC-13:** Chromium executes three fresh navigation and connection workflows, exactly six network sockets (Management 3, ExtensionHost 3), zero retries, one reused runtime identity, zero marketplace/forbidden requests, Explorer/Preview sentinels, and terminal hostname/`vscode`/pwd plus the predeclared 256 KiB digest. The classifier manifest accepts one retained host shape and rejects 22 exact negative vectors.
- **AC-14:** Cleanup records every context, page, request, WebSocket, proxy resource, runtime identity, and listener. The residual audit reports 23 observed inventories, zero pending entries, absent processes/listeners, and one surviving unrelated-control observation.
- **AC-15:** `test-results/bl-011/workbench-route-evidence.json` is the sole ignored regular evidence file at mode `0600`. It contains no raw webview hostname/token; the public scan inspected 177 artifacts with zero owned-authority matches.
- **AC-16:** README/API/index/runtime/proof/runbook documentation records the exact grammar and alphabet, opaque-plus meaning, every forbidden URL class, browser-local boundary, bounded evidence, disabled Open VSX, 3+3 sockets, API examples, failure table, bounds, faults, cleanup, commands, migration statement, and exclusions.
- **AC-17:** Final `just verify-focused` passes 75 files with 522 tests (one file/two tests skipped). `just verify-workbench-route` passes 47 Vitest cases, the real Chromium workflow, and residual audit. Primary-checkout `just verify` passes formatting, lint, type checks, package tests/coverage, builds, all repository gates, designated proofs, browser tests, and final BL-011 residual audit.

## Documentation Evidence

- `README.md`, `apps/api/README.md`, and `docs/README.md`: exact stable-route capability, origin grammar, six-socket proof, paved commands, and concrete HTTP/WebSocket examples.
- `docs/stable-workbench-routing.md`: complete transport/failure/header/cookie/WebSocket contract; exact hostname grammar and negatives; bounded evidence; 23 faults; validation, cleanup, migration, and exclusions.
- `docs/workbench-proof.md` and `docs/project-runtime.md`: proof-only gallery configuration, worktree/cancellation prerequisite order, three workflows, runtime reuse, six channels, cleanup, and residual procedure.
- `ADR-260812-in-process-workbench-reverse-proxy.md`, `CORE-COMPONENT-260812-stable-workbench-proxy.md`, and `ADR/DECISION-LOG.md`: ownership, exact external-origin exception, browser-local non-network class, marketplace decision, and named-socket architecture.
- `.prettierignore`: excludes owned linked-worktree directories so primary validation remains worktree-aware without scanning another checkout.
- No OpenAPI/Swagger artifact exists for this raw proxy route. No application configuration option/default, schema, data, or API migration changed; the proof-only `EXTENSIONS_GALLERY={}` procedure and no-migration statement are documented.
- The final synchronization correction changes validation internals only: terminal output is flushed before atomic evidence publication and browser tests no longer depend on `.xterm-rows`; no application documentation behavior changed.

## Validation Evidence

- Repeated prerequisite baseline: three consecutive focused runs each passed 3 files and 17 tests covering worktree ownership, concurrent cancellation, and host terminal bounds; three cleanup regression runs each passed all 7 failure/cleanup tests.
- `just verify-focused`: exit 0 after the final corrections; 75 passed files, 1 skipped; 522 passed tests, 2 skipped.
- `just verify-workbench-route`: exit 0; 47 Vitest cases, one real designated Chromium scenario, mode-`0600` evidence, and residual `status: ok`.
- `just test-e2e`: exit 0 after removing renderer-specific baseline waits; 5 Chromium tests passed, 2 designated tests skipped, and capacity residual audit passed.
- `just verify` (primary checkout): exit 0 after the final corrections; formatting, lint, type checks, package tests/coverage, builds, all repository gates, baseline Chromium, designated BL-010/BL-011 proofs, public scans, cleanup, and final residual audit passed.

These notes record implementation evidence only. Final acceptance remains owned by Verify.
