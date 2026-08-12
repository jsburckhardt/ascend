# Implementation Notes: Issue #27

## Completed Tasks

- T-0: Preserved linked-worktree repository validation and cancellation-versus-early-exit classification with three concurrent cancellation regressions; replaced renderer-specific terminal readiness waits with a bounded exact-once command-start handshake, explicitly focused the terminal input, bounded cancellation PID observation within a 40-second overall episode window, resolved API-workspace executables plus proof commands and evidence paths from each owned worktree, and created a fresh terminal and scoped its proof command to the canonical worktree project cwd, and gave process-absence observation a finite 5-second load margin.
- T-1: Preserved the stable proxy contract, exact 23-row public failure catalog, direct `ws` ownership, and loopback-only runtime arguments.
- T-2: Preserved stable HTTP/upgrade routing, eight-client single-flight startup, and application lifecycle ownership.
- T-3: Completed byte-preserving HTTP matrices, streamed authority rewriting, safe removal of unencoded textual `Content-Length`, preservation for byte-identical encoded/binary responses, chunk-5 cancellation, and downstream-transform completion.
- T-4: Completed the exact bounded WebSocket matrix, named connection-role observation, shutdown outcomes, and peer cleanup.
- T-5: Executed the payload, header, stream, WebSocket, 23-row stable-route failure, target-confusion, marker-bounded redaction, concurrency, and shutdown matrices; every failure now records a unique execution ID, observed dependency path/category, exact public mapping, and observed zero cleanup.
- T-6: Implemented the exact Markdown resource hostname grammar, 23 classifier vectors, bounded browser-local inventory, disabled marketplace proof, and real three-workflow Chromium record; terminal completion now waits for atomically written proof evidence after stdout flush rather than xterm renderer internals.
- T-7: Enforced bounded restricted evidence, mode `0600`, one exact executable V-7 matrix, ten protected-sentinel scans, unfiltered request inventory, six named sockets, public scans, observed cleanup inventories, and residual audits; stale `V-7-security` sections are retired on merge.
- T-8: Corrected paved validation, API examples, README/runbook content, Plan artifacts, ADR, core-component, and decision log.

## Late Workspace Correction File Rationale

- `apps/api/src/workbench-proxy-manager.ts` belongs because controlled DNS injection requires an injectable Node HTTP request boundary and asynchronous upstream failures must emit their observed failure category instead of a success event.
- `apps/api/src/workbench-proxy-contract.ts` and `apps/api/src/cli/workbench-route-residual-audit.ts` belong because retained evidence must reject stale hashes, duplicate IDs, wrong transports/paths, static local throws, disabled or unbounded logging, wrong frame channels, leaks, and nonzero cleanup.
- `apps/api/src/workbench-route-evidence.ts` belongs because the single exact V-7 matrix supersedes and removes the prior assertion-only `V-7-security` section.
- `apps/api/test/workbench-route-acceptance.test.ts` belongs because it executes all 23 failures through route/library/runtime/proxy/fake-upstream boundaries, sends ten sentinel classes through real HTTP/runtime/WebSocket/terminal channels, and measures fixture/client/proxy cleanup.
- `apps/api/test/workbench-proxy-contract.test.ts`, `apps/api/test/workbench-route-evidence.test.ts`, and `apps/api/test/workbench-route-proof-correction.test.ts` belong because they enforce the executable evidence schema and its negative fixtures.
- `apps/api/test/workbench-proxy-http.test.ts` belongs because streamed authority rewriting invalidates unencoded textual `Content-Length` while encoded byte-identical responses, HEAD, POST, and ranges retain valid lengths.
- `apps/api/test/workbench-route-documentation.test.ts` belongs because public and architecture documentation must state the corrected framing and executable-evidence contracts.
- `README.md`, `apps/api/README.md`, and `docs/stable-workbench-routing.md` belong because setup-independent user/API/operational behavior now explicitly distinguishes streamed textual framing and real failure/redaction proof.
- `project/architecture/ADR/ADR-260812-in-process-workbench-reverse-proxy.md` and `project/architecture/core-components/CORE-COMPONENT-260812-stable-workbench-proxy.md` belong because authority rewriting, executable fault injection, marker-bounded logs, and real frame channels are proxy-boundary invariants.
- `plan/02-task-breakdown.md` and `plan/03-test-plan.md` belong because T-3/T-5 and V-3/V-7 evidence expectations now state the corrected framing and no-static-substitute requirements.

## Acceptance Evidence

- **AC-1:** `workbench-proxy-manager.ts` and route/HTTP tests resolve persisted projects, reuse one loopback BL-010 snapshot, preserve suffix/query, stream selected text safely, and expose no internal authority on public surfaces.
- **AC-2:** The real Chromium record inventories 124 requests: 92 stable Ascend-owned, 24 exact grammar-valid Markdown resources, and 8 stable-origin non-network browser-local resources. All six WebSockets use the stable prefix; Explorer and Preview pass in all three workflows.
- **AC-3:** `workbench-proxy-http.test.ts` passes nested GET metadata, bodyless HEAD, deterministic 257 KiB POST digest, and byte-range status/header/body proof; the large transformed JavaScript regression proves complete downstream flush.
- **AC-4:** Contract and real-socket tests prove root-relative and selected-authority redirect rewrites, external redirect rejection, all three cookie Path outcomes, Domain removal, and preservation of Secure/HttpOnly/SameSite.
- **AC-5:** Explicit request and response cases strip every named hop header and connection-token extension; WebSocket tests retain only required upgrade semantics.
- **AC-6:** The executable stream record observes 32 ordered 16 KiB chunks with expected SHA-256, delayed consumption, emitted/received chunk-5 barriers, client abort, upstream close, zero fixture/client/proxy sockets, and a still-running runtime.
- **AC-7:** `workbench-proxy-websocket.test.ts` executes only text, 64 KiB binary, ping/pong, clean 1000 close/reason, abnormal local-1006 outcome, timeout, refusal, pending-handshake close, 16 ordered 32 KiB frames, and two reconnects; all peer audits close.
- **AC-8:** `workbench-route-acceptance.test.ts` releases exactly four HTTP requests and four upgrades from one barrier and observes one launch/readiness sequence and one PID/start/port identity.
- **AC-9:** The predeclared failure table has 23 unique rows and hash `94e986e6dc9461ff80c347fc1495911778141c8325514d67eeb3189ba554b143`. Evidence records exactly 23 stable-route request/upgrade executions with unique IDs, exact observed dependency paths/categories, matching status/code/message, per-case redaction, and zero proxy/fixture/client resources.
- **AC-10:** Exact `400` outcomes execute for `../x`, `%2f`, `%5c`, `%00`, and the 129-character ID; a well-formed unknown ID returns `404`, and hostile Host/Forwarded/proxy-target values cannot change the selected fixture.
- **AC-11:** Controlled traffic carries ten distinct protected classes: internal authority, canonical path, authorization, cookie, query, body, command/environment, WebSocket frame, integrated-terminal frame, and project token. Enabled access/application logs and public captures are marker-bounded; all ten literal/encoded scans are zero, the project token occurs only in stable-route URL classes, and restricted browser evidence reports zero raw webview hostname or encoded-token matches.
- **AC-12:** Barrier-driven tests prove precommit HTTP/upgrade `503`, postcommit stream/socket closure without a second status, client-local cancellation, runtime reuse, bounded settlement, and zero proxy resources.
- **AC-13:** Chromium executes three fresh navigation and connection workflows, exactly six network sockets (Management 3, ExtensionHost 3), zero retries, one reused runtime identity, zero marketplace/forbidden requests, Explorer/Preview sentinels, and terminal hostname/`vscode`/pwd plus the predeclared 256 KiB digest. The classifier manifest accepts one retained host shape and rejects 22 exact negative vectors.
- **AC-14:** Cleanup records every context, page, request, WebSocket, proxy resource, runtime identity, and listener. Every failure execution reads observed proxy/fixture/client counts at zero; the residual audit reports 23 observed inventories, zero pending entries, absent processes/listeners, and one surviving unrelated-control observation.
- **AC-15:** `test-results/bl-011/workbench-route-evidence.json` is the sole ignored regular evidence file at mode `0600`. It contains no raw webview hostname/token; the final public scan inspected 177 artifacts with zero owned-authority matches.
- **AC-16:** README/API/index/runtime/proof/runbook documentation records the exact grammar and alphabet, opaque-plus meaning, every forbidden URL class, browser-local boundary, bounded evidence, disabled Open VSX, 3+3 sockets, API examples, failure table, bounds, faults, cleanup, commands, migration statement, and exclusions.
- **AC-17:** Final `just verify-focused` passes 75 files with 525 tests (one file/two tests skipped). `just verify-workbench-route` passes 50 Vitest cases, the real Chromium workflow, and residual audit. Primary-checkout `just verify` passes formatting, lint, type checks, package tests/coverage, builds, all repository gates, designated proofs, browser tests, and final BL-011 residual audit.

## Documentation Evidence

- `README.md`, `apps/api/README.md`, and `docs/README.md`: exact stable-route capability, origin grammar, six-socket proof, paved commands, and concrete HTTP/WebSocket examples.
- `docs/stable-workbench-routing.md`: complete transport/failure/header/cookie/WebSocket contract; exact hostname grammar and negatives; bounded evidence; 23 faults; validation, cleanup, migration, and exclusions.
- `docs/workbench-proof.md` and `docs/project-runtime.md`: proof-only gallery configuration, worktree/cancellation prerequisite order, three workflows, runtime reuse, six channels, cleanup, and residual procedure.
- `ADR-260812-in-process-workbench-reverse-proxy.md`, `CORE-COMPONENT-260812-stable-workbench-proxy.md`, and `ADR/DECISION-LOG.md`: ownership, exact external-origin exception, browser-local non-network class, marketplace decision, and named-socket architecture.
- `.prettierignore`: excludes owned linked-worktree directories so primary validation remains worktree-aware without scanning another checkout.
- No OpenAPI/Swagger artifact exists for this raw proxy route. No application configuration option/default, schema, data, or API migration changed; the proof-only `EXTENSIONS_GALLERY={}` procedure and no-migration statement are documented.
- The late verification correction changes the documented HTTP framing contract: unencoded textual responses remove upstream `Content-Length`, while byte-identical encoded/binary responses preserve valid lengths. README, API README, runbook, ADR, core-component, and documentation contract tests are synchronized.
- The executable-evidence correction is validation-facing but publicly observable in operator guidance: all 23 failure rows traverse real stable-route boundaries, enabled marker-bounded logs carry real HTTP/WebSocket/terminal sentinels, and stale assertion-only V-7 sections are rejected. No schema, migration, deployment, or product configuration change is introduced.

## Validation Evidence

- Repeated prerequisite baseline: three consecutive correction runs each passed 2 files and 11 tests covering primary/linked-worktree ownership, concurrent cancellation, and exact identity absence; the retained prior baseline also passed the broader 3-file/17-test prerequisite and three 7-test cleanup regressions.
- `just verify-focused`: exit 0 after the correction; 75 passed files and 1 skipped, with 525 passed tests and 2 skipped. A prior focused run exposed one stale redaction fixture; it was corrected before this pass.
- `just test-e2e`: repeated final baseline exit 0; 5 Chromium tests passed, 2 designated tests skipped, and the capacity residual audit passed.
- `just verify-workbench-route`: designated exit 0; 50 Vitest cases and one real Chromium scenario passed, followed by mode-`0600` residual `status: ok`, exact V-7/redaction completeness, 23 observed inventories, and zero pending entries.
- Retained pre-correction clean linked-worktree baseline: `just setup && just verify` exited 0 at `d75cd4e`; correction-specific clean-worktree evidence is reported in the committed Implement handoff.
- Primary-checkout `just verify`: exit 0 after one diagnosed baseline terminal-parity timeout; `just test-e2e` then passed 5 Chromium tests with 2 designated skips and a clean capacity audit, and the complete rerun passed formatting, lint, type checks, package tests/coverage, builds, all repository gates, baseline Chromium, designated proofs, public scans, cleanup, and residual audit.
- Restricted/public evidence: regular ignored/untracked mode-`0600` evidence; 3 navigations, 3 workflows, 6 sockets (Management 3, ExtensionHost 3), 0 retries, 1 accepted and 22 rejected classifier vectors, 23 executable failures, 10 marker-bounded protected-sentinel scans, 0 marketplace/forbidden/public-authority matches, 23 observed inventories, 0 pending entries, and residual `status: ok`. The stale `V-7-security` matrix is absent.

## Observation Evidence

- Captured harness observations for finalization, concurrent-change integration, and correction: `DL-400`, `CONF-074`, `DL-401`, `CONF-075`, `DL-402`–`DL-416`, `INS-077`–`INS-085`, `SUGG-014`, `DL-420`, `CONF-077`, `CONF-079`, `DL-429`, `DL-431`, `CONF-080`, `COORD-053`, `DL-437`, `DL-440`, and `DL-443`.
- This correction additionally captured `DL-425`, `INS-086`, `DL-426`, `DL-428`, `INS-087`, `DL-430`, `INS-088`, `DL-432`, `DL-433`, `INS-089`, `DL-434`, `DL-435`, `DL-436`, `CONF-081`, `DL-438`, `DL-439`, `DL-441`, `DL-442`, `DL-444`.

These notes record implementation evidence only. Final acceptance remains owned by Verify.
