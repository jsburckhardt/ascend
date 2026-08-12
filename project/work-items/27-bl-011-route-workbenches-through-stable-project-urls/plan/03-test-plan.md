# Test Plan: BL-011 Stable Project Workbench Routes

## Test V-0: Designated worktree and cancellation prerequisites

- **Type:** Focused unit and lifecycle prerequisite
- **Task:** T-0
- **Acceptance Criteria:** AC-13, AC-14, AC-17
- **Priority:** Critical

### Setup
Load the completed repository-check helper and proof-runtime cancellation boundary with primary-checkout, linked-worktree, nested-root, unrelated-repository, and abort-triggered fake-runtime inputs.

### Steps
1. Accept the primary checkout when Git top level equals repository root and Git common directory is the designated Ascend Git directory.
2. Accept an owned linked worktree with the same common directory; reject a nested non-root path and an unrelated repository.
3. Start three concurrent fake proof runtimes, abort while each awaits child exit, and observe the exit boundary.
4. Require typed `cancelled` outcomes and prove every discovered exact process identity absent.
5. Run this prerequisite before V-9 in focused and full validation.

### Expected Result
Owned worktrees are usable without weakening repository identity, unrelated roots fail before starts, and abort-triggered exits remain cancellation with exact cleanup.

### Expected Evidence
A V-0 result listing accepted/rejected checkout cases, three cancellation classifications, three absent exact identities, and zero focused-test failures.

## Test V-1: Proxy contract, project IDs, and failure catalog

- **Type:** Unit and contract
- **Task:** T-1
- **Acceptance Criteria:** AC-9, AC-10
- **Priority:** Critical

### Setup
Load the frozen stable-proxy contract, all BL-010 runtime failure categories, transform vectors, runtime argv builder, and invalid evidence fixtures without opening network listeners.

### Steps
1. Assert the workbench ID grammar accepts bounded route-safe tokens and returns `400 invalid_project_id` for exactly `../x`, `%2f`, `%5c`, `%00`, and a 129-character value.
2. Assert one well-formed unknown ID maps to `404 project_not_found`.
3. Compare the predeclared public failure table to every required route, persistence, BL-010, upstream, timeout, refusal, redirect, and shutdown category; reject duplicates, gaps, overlaps, or changed code/message text.
4. Exercise hop-by-hop/connection-token, forwarding/target, redirect, cookie, and service-worker transform vectors plus `--disable-proxy` loopback argv.
5. Reject contract/evidence values containing arbitrary target or unsafe logging fields.

### Expected Result
Every named category has one exact status/code/message row; all six ID cases match; transforms and argv match the adopted core-component; malformed contract shapes fail closed.

### Expected Evidence
A V-1 JSON section containing the table hash, category count, exact ID outcomes, transform vector count, direct `ws` version, and loopback argv assertions without a raw authority.

## Test V-2: Stable route resolution and eight-client single-flight

- **Type:** Fastify and lifecycle integration
- **Task:** T-2
- **Acceptance Criteria:** AC-1, AC-8
- **Priority:** Critical

### Setup
Start a real loopback Fastify listener with injected project library, observable runtime-start gate, virtual runtime identity, proxy audit adapter, and four HTTP plus four WebSocket clients held before start.

### Steps
1. Send base and descendant operations with suffixes and queries and prove only persisted project metadata supplies the canonical path.
2. Hold precisely four HTTP requests and four upgrades at one pre-start barrier.
3. Release all eight together, satisfy readiness once, and collect runtime identities from every operation.
4. Send arbitrary Host, Forwarded, `X-Forwarded-*`, and proxy-target headers and inspect only the controlled fixture target.
5. Close the application repeatedly and inspect listener/resource order.

### Expected Result
All eight operations use one launch/readiness invocation and the same PID/start/port, suffix/query values are unchanged, target-confusion input is inert, and shutdown removes the upgrade listener before runtime and persistence close.

### Expected Evidence
V-2 barrier timeline, operation types/counts, lookup/start/readiness counts, identity set cardinality one, target fixture ID, and lifecycle order.

## Test V-3: Exact HTTP payload matrix

- **Type:** Real-socket integration matrix
- **Task:** T-3, T-5
- **Acceptance Criteria:** AC-1, AC-3
- **Priority:** Critical

### Setup
Start owned loopback fake HTTP upstream and matrix client fixtures. Declare the 257-KiB binary generation input and expected SHA-256 before opening clients.

### Steps
1. `GET` a nested asset with query and compare `200` body, Content-Type, Cache-Control, and ETag.
2. `HEAD` an asset and assert headers complete with zero downstream body bytes.
3. `POST` exactly 257 KiB of deterministic binary input and verify `201`, valid Content-Length, and request/echo/expected digest equality.
4. Send the declared Range and verify `206`, Content-Range, Accept-Ranges, and exact ranged bytes.
5. Confirm every upstream path/query and selected runtime identity, then close and audit fixtures/clients.

### Expected Result
All four payload cases preserve the exact issue semantics through the stable route with no internal authority on public surfaces and zero sockets afterward.

### Expected Evidence
V-3 four execution rows with declared inputs/digest, methods, paths/queries, statuses, headers, byte counts, SHA-256 values, runtime reuse, authority scan, and socket audits.

## Test V-4: HTTP redirects, cookies, and bidirectional headers

- **Type:** Real-socket integration matrix
- **Task:** T-1, T-3, T-5
- **Acceptance Criteria:** AC-4, AC-5
- **Priority:** Critical

### Setup
Configure fake upstream cases for the two accepted redirects, one declared external HTTPS redirect, three cookie paths with Domain/Secure/HttpOnly/SameSite attributes, service-worker scope, and all named plus connection-token headers in each direction.

### Steps
1. Verify root-relative and selected-authority absolute Locations rewrite to the stable prefix.
2. Verify the external authority returns exact `502 workbench_redirect_rejected` before commitment.
3. Verify Path `/`, Path `/foo`, and missing Path scope under the stable prefix; Domain is absent and other attributes are unchanged.
4. Verify `Service-Worker-Allowed: /` becomes the stable prefix.
5. Inventory request and response headers and prove all eight named hop-by-hop headers plus every connection-token extension are absent, except required upgrade semantics outside this HTTP matrix.

### Expected Result
Every rewrite/removal equals the frozen contract and no raw loopback authority survives in Location, cookie, scope, or any downstream header/body.

### Expected Evidence
V-4 before/after redirect, cookie, service-worker, and header inventories plus exact external-rejection envelope and zero-match authority scan.

## Test V-5: HTTP streaming, backpressure, and client abort

- **Type:** Real-socket timing and lifecycle matrix
- **Task:** T-3, T-5
- **Acceptance Criteria:** AC-6, AC-12
- **Priority:** Critical

### Setup
Declare deterministic 32-by-16-KiB generation input and expected digest. Expose emitted-chunk and delayed-consumer received-chunk barriers, upstream close observation, runtime inspection, and socket audit.

### Steps
1. Consume the complete stream with controlled delay and record chunk count/order, backpressure transitions, bytes, and digest.
2. Start a separate stream, wait until both emitted and received barriers prove chunk 5, then abort the client.
3. Observe the matching upstream request/stream close within its finite bound.
4. Inspect the shared runtime and all fixture/client/proxy sockets.

### Expected Result
The complete stream has exact size and SHA equality; the separate abort closes only its upstream stream; zero matrix sockets remain; the same runtime stays running.

### Expected Evidence
V-5 generation declaration, expected/actual digest, 32-chunk timeline, chunk-5 barrier sequence, abort/close timestamps, running identity, and zero-socket audit.

## Test V-6: Exact WebSocket transport matrix

- **Type:** Real-socket WebSocket matrix
- **Task:** T-4, T-5
- **Acceptance Criteria:** AC-2, AC-5, AC-7
- **Priority:** Critical

### Setup
Start owned loopback `ws` upstream and downstream clients with declared binary and per-frame generation inputs/hashes, exact close reason, abnormal local observation, handshake bounds, pending-handshake barrier, ordered-send instrumentation, and peer socket audits.

### Steps
1. Execute exactly: text echo; 64-KiB binary echo; ping/pong; clean `1000` close/reason; upstream abnormal terminate; handshake timeout; upstream refusal; client close during pending handshake; 16 ordered 32-KiB backpressure frames; and two sequential reconnects.
2. Assert payload bytes/hashes, frame order, control events, close outcomes, exact `504`/`502` envelopes, and no transmitted reserved `1006` frame.
3. For pending close, observe the barrier before client close and prove upstream cancellation with no late downstream response.
4. Verify upgrade-only headers, stable same-origin prefix, same runtime on reconnect, and two closed peers after each case.

### Expected Result
Only the exact finite case set executes; every declared bound/outcome matches; abnormal termination is downstream abnormal rather than `1000`; reconnects reuse one runtime; no socket remains.

### Expected Evidence
V-6 exact case manifest and rows with input/hash/order/control/close/bound data, local-1006-versus-wire distinction, stable URLs, identity reuse, and per-case peer audits.

## Test V-7: Complete failure, target-confusion, and redaction matrix

- **Type:** Fault-injection and security integration
- **Task:** T-1, T-2, T-3, T-4, T-5
- **Acceptance Criteria:** AC-1, AC-9, AC-10, AC-11
- **Priority:** Critical

### Setup
Hash the public failure table before execution. Prepare exactly one injection for every required category and unique declared sentinels for internal port, canonical path, authorization, cookie, query, body, command/environment, WebSocket payload, terminal payload, and project token. Mark bounded log start/end positions per case.

### Steps
1. Execute each malformed/unknown/persistence/runtime/upstream/timeout/refusal/redirect/shutdown failure once and compare exact status/code/message to its table row.
2. Execute the six ID outcomes and controlled arbitrary-target headers, proving only the selected fixture receives traffic.
3. Capture access/application logs and downstream headers/body between each marker.
4. Scan for literal and percent-encoded forms of every sentinel; enumerate every project-token occurrence.
5. Audit sockets and table invocation counts after each case.

### Expected Result
Every required failure row executes once and matches; no target confusion occurs; every protected literal/encoded sentinel has zero public matches; the project token occurs only in stable captured URLs and its dedicated field.

### Expected Evidence
V-7 table hash, one-row execution manifest, exact envelopes, selected-target observations, marker offsets, per-sentinel zero counts, approved project-token locations, and post-case audits.

## Test V-8: Commitment-aware shutdown and union socket cleanup

- **Type:** Lifecycle and concurrency integration
- **Task:** T-2, T-3, T-4, T-5, T-7
- **Acceptance Criteria:** AC-8, AC-12, AC-14
- **Priority:** Critical

### Setup
Open controlled pending HTTP response, pending WebSocket handshake, committed stream, upgraded socket, independent client stream, unrelated control listener, and exact runtime owner. Expose barriers for every pending/committed state and a 5,000-ms proxy shutdown bound.

### Steps
1. Reach each barrier before initiating manager/application shutdown.
2. Verify uncommitted HTTP and upgrade paths receive exact `503 workbench_shutting_down`.
3. Verify committed stream and upgraded socket receive their predeclared abort/abnormal-close outcomes with no second status.
4. Disconnect the independent client and prove only that upstream closes while the runtime stays reusable.
5. Await bounded proxy then runtime shutdown and audit the union of all sockets/listeners/identity owners plus the unrelated control.

### Expected Result
Shutdown settles within the declared bound, every proxy and runtime owner is absent, no late response/status occurs, client-local cancellation remains local, and the unrelated listener is still alive.

### Expected Evidence
V-8 state-barrier timeline, commitment flags, exact outcomes, settlement duration, lifecycle order, union owner/audit rows, runtime reuse before final shutdown, and control-listener liveness.

## Test V-9: Corrected real Chromium stable-route classification

- **Type:** Playwright Chromium end-to-end
- **Task:** T-6
- **Acceptance Criteria:** AC-2, AC-11, AC-13, AC-14, AC-15, AC-17
- **Priority:** Critical

### Setup
After V-0 passes, load the pure browser-request classifier and a declared synthetic authority `fixture:43210`, whose VS Code token is `fixture-003a43210`. Define trusted resources as parsed URLs using HTTPS, empty username/password and parsed `port` fields, and hostname `^vscode-remote\+(?:[a-z0-9]|-[0-9a-f]{4})+\.vscode-resource\.vscode-cdn\.net$`, with no raw, percent-encoded, or label-encoded authority copy in path/query. Then run on the designated Ubuntu non-root `vscode` host with `EXTENSIONS_GALLERY={}`, real API/runtime manager, BL-001 fixture, predeclared digest, retries disabled, and observers attached before navigation.

### Steps
1. Accept exactly `https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css` as trusted and emit only bounded classes, never its raw host or token.
2. Reject exactly: the bare suffix; an empty token; `abc+fixture-003a43210`; free hyphen and malformed four-hex escapes; an extra sublabel; a `.net.evil.test` suffix; username/password; explicit ports `444` and `443`; HTTP; `ws` and `wss`; an unrelated external host; and raw `fixture:43210`, percent-encoded `fixture%3A43210`, or label-encoded `fixture-003a43210` copied into path or query. Assert all external sockets reject independently of host grammar. Classify a stable-origin `blob:` script as browser-local without raw URL retention and reject an external-origin blob.
3. Perform exactly three fresh context/navigation workflows through the stable route with no fallback or retry.
4. In every workflow prove Explorer and built-in Preview; on the third prove terminal hostname, `vscode` user, canonical `pwd`, and the predeclared 256-KiB digest.
5. Classify every request transiently. Require every Ascend-owned URL under the stable prefix; permit only grammar-valid built-in Markdown resources; emit bounded host/scheme/credential/port/path/query-key/leak classes; and require zero Open VSX, marketplace, malformed, or other external requests.
6. Classify each initial VS Code control request without retaining payloads/tokens. Require one Management and one ExtensionHost per workflow: six stable same-origin sockets total, all `reconnection=false`, with zero unknown/extra/internal-port/external sockets.
7. Assert three navigation and connection workflows, six network sockets, zero retries, and one reused runtime identity; run sentinel and raw-host/token scans; close every observed resource; stop exact owners; and audit absence.

### Expected Result
The exact issue scenario succeeds without changing VS Code: Ascend transport stays stable and authority-free; only credential-free/default-port HTTPS Markdown resources with one valid `vscode-remote+<encoded-authority>` label are trusted; `+` grants no broader origin access; public evidence is bounded; marketplace/external sockets are absent; six channels match 3+3; and cleanup is complete.

### Expected Evidence
A V-9 restricted section with V-0 reference; exact positive/negative vector IDs and verdict counts; only bounded request classes; zero raw hostname/token/authority-leak matches; zero forbidden/marketplace requests; three workflows; six 3+3 sockets; zero retries; one runtime identity; functional results; zero scans; and empty inventories.

## Test V-10: Corrected evidence, residual audit, and documentation contract

- **Type:** Artifact, security, operations, and documentation
- **Task:** T-7, T-8
- **Acceptance Criteria:** AC-11, AC-14, AC-15, AC-16, AC-17
- **Priority:** Critical

### Setup
Complete V-0 through V-9, then load the sole restricted evidence file, Git/public artifacts, stable-routing docs, architecture records, and union residual command. Include negative fixtures for every V-9 rejected URL vector, a valid host with authority copied into path/query, raw hostname or encoded-token retention, stale three-socket-only evidence, unclassified sockets, Open VSX, raw handshake data, and pending resources.

### Steps
1. Verify one regular mode-`0600` ignored evidence file with all V-2 through V-9, classifier-vector, redaction, cleanup, and residual sections.
2. Require three navigation/workbench workflows, six sockets, 3+3 roles, zero retries, grammar-valid trusted class, and zero marketplace/forbidden origins.
3. Reject raw hostname, encoded-authority token, credential, explicit port, authority-bearing path/query value, raw reconnection token, control payload, internal authority in public artifacts, second restricted files, missing matrix/vector sections, assertion-only classifications, or pending inventories.
4. Execute the finite residual audit and verify every owned fixture/client/browser/proxy/runtime resource absent while the unrelated control was observed alive.
5. Assert documentation preserves all 17 GitHub criteria and every existing BL-011 matrix/security/cleanup/exclusion while recording the exact regex and encoding alphabet, opaque-plus rationale, complete forbidden URL/socket set, bounded output, marketplace disablement, named channels, and prerequisite order.

### Expected Result
Evidence is complete and safely classified without raw webview authority material, every exact URL vector is enforced, residual state is zero, and documentation records the narrow correction without weakening stable routing or changing issue text.

### Expected Evidence
A V-10 schema/mode/Git/public-scan report, exact accepted/rejected vector counts, zero raw host/token/path/query disclosure, bounded 3-workflow/6-socket/3+3 classes, complete owner union, successful residual audit, and documentation subject matrix.

## Test V-11: Focused stable-workbench-route gate

- **Type:** Repository command validation
- **Task:** T-0, T-5, T-6, T-7, T-8
- **Acceptance Criteria:** AC-13, AC-14, AC-17
- **Priority:** Critical

### Setup
Start from a clean branch workspace with issue prerequisites available and no prior owned residual. Use only the root `justfile` focused recipe.

### Steps
1. Run `just verify-workbench-route` once.
2. Require V-0 worktree and cancellation prerequisites before the complete HTTP, WebSocket, failure/security, concurrency/shutdown, and corrected Chromium sections.
3. Inspect V-9 for the exact grammar vector manifest, bounded trusted class, zero raw host/token/authority leaks, zero marketplace requests, three workflows, six 3+3 sockets, and zero retries.
4. Confirm the command closes all owners, invokes the independent residual audit last, and exits zero.
5. Validate the sole restricted evidence file after completion.

### Expected Result
The focused command exits zero only after prerequisites, exact grammar positives/negatives, every unchanged matrix, bounded three-workflow Chromium classification, six named sockets, and cleanup/residual results pass.

### Expected Evidence
V-11 command, start/end time, exit zero, V-0 verdict, exact grammar-vector counts, unchanged matrices, bounded 3-workflow/6-socket/3+3 summary, zero raw authority material or marketplace/forbidden origins, cleanup, residual verdict, and restricted evidence reference.

## Test V-12: Full repository verification gate

- **Type:** Full regression validation
- **Task:** T-0, T-5, T-6, T-7, T-8
- **Acceptance Criteria:** AC-13, AC-14, AC-17
- **Priority:** Critical

### Setup
Use a clean workspace with dependencies and designated Chromium/code-server prerequisites installed. Do not invoke package commands outside the root recipe.

### Steps
1. Run `just verify` once with adequate finite command time.
2. Confirm V-0 runs before the complete BL-011 matrices and corrected Chromium proof, alongside formatting, lint, type checks, package tests, builds, existing gates, and documentation contracts.
3. Require the safe V-9 summary to report all exact grammar vectors, bounded trusted class, zero raw host/token/authority leaks, zero marketplace traffic, three workflows, six 3+3 sockets, and zero retries.
4. Confirm BL-011 cleanup completes and the final residual audit reports zero owners.
5. Inspect Git/public scans and the restricted evidence mode.

### Expected Result
Full verification exits zero with no regression, exact grammar enforcement and bounded browser classification, unchanged BL-011 matrices, and complete cleanup/residual evidence while preserving the one allowed restricted file.

### Expected Evidence
V-12 full command result with exit zero, V-0 and component summaries, exact grammar-vector and unchanged-matrix verdicts, bounded 3-workflow/6-socket/3+3 browser verdict, zero raw authority material or marketplace/forbidden origins, cleanup/residual verdict, and tracked-tree proof.
