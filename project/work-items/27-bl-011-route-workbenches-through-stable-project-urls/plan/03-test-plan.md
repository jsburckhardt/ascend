# Test Plan: BL-011 Stable Project Workbench Routes

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

## Test V-9: Real Chromium three-navigation stable-route scenario

- **Type:** Playwright Chromium end-to-end
- **Task:** T-6
- **Acceptance Criteria:** AC-2, AC-11, AC-13, AC-14
- **Priority:** Critical

### Setup
On the designated Ubuntu non-root `vscode` host, start the real API/runtime manager with the BL-001 canonical fixture and one opaque registered project. Declare the 256-KiB output generation input and expected digest. Create fresh browser state, attach safe HTTP/WebSocket observers before navigation, disable Playwright retries, and inventory all resources.

### Steps
1. Perform exactly three fresh navigations/reconnects to `/projects/{projectId}/workbench/`, with no fallback or retry path.
2. For each, verify Explorer sentinel, built-in Preview sentinel, and an opened stable-prefix WebSocket.
3. In the integrated terminal verify hostname, `vscode`, canonical `pwd`, produce deterministic 256-KiB output, and compare expected/actual SHA-256.
4. Assert operation counts 3/3/0, one runtime PID/start/port identity, and every page/request/WebSocket URL same-origin under the prefix without loopback port text.
5. Run bounded security scans and close every context/socket before exact manager shutdown and audits.

### Expected Result
All three attempts pass without retry on one BL-010 runtime, presentation and terminal outcomes hold, public URLs are stable and authority-free, redaction passes, and browser/runtime resources are absent afterward.

### Expected Evidence
V-9 browser section with 3/3/0 counts, safe URL inventory, one identity reference, Explorer/Preview booleans, terminal parity, declared/actual output digest, sentinel scans, and cleanup audits.

## Test V-10: Restricted evidence, residual audit, and documentation contract

- **Type:** Artifact, security, operations, and documentation
- **Task:** T-7, T-8
- **Acceptance Criteria:** AC-14, AC-15, AC-16
- **Priority:** Critical

### Setup
Complete fake and browser scenarios, then load the sole expected ignored evidence path, repository Git status, committed public documentation/evidence paths, runbook/index files, and the union residual-audit command.

### Steps
1. Verify exactly one local evidence file, owner readability and mode `0600`, required matrix/browser/redaction/cleanup/residual sections, and schema validity.
2. Verify the file is ignored and absent from tracked/untracked publication candidates; reject any second raw-authority artifact.
3. Scan public documentation and committed evidence for the raw internal authority and require zero matches.
4. Execute the finite residual audit and verify zero owned matrix/proxy/browser/runtime resource with the unrelated control still alive at its observation point.
5. Assert documentation contains every behavior, exact failure row/message, bound, command, injected fault, cleanup result, disclosure rule, ownership/reuse statement, and out-of-scope boundary.

### Expected Result
Evidence disclosure is exactly bounded, residual state is zero, public surfaces contain no raw port, and documentation is complete and architecture-consistent.

### Expected Evidence
V-10 metadata/section/Git/public-scan report, residual audit, documentation subject matrix, and updated-deferral assertions.

## Test V-11: Focused stable-workbench-route gate

- **Type:** Repository command validation
- **Task:** T-5, T-6, T-7, T-8
- **Acceptance Criteria:** AC-17
- **Priority:** Critical

### Setup
Start from a clean branch workspace with issue prerequisites available and no prior owned residual. Use only the root `justfile` focused recipe.

### Steps
1. Run `just verify-workbench-route` once.
2. Inspect the complete HTTP, WebSocket, failure/security, concurrency/shutdown, and real Chromium sections.
3. Confirm the command closes all owners, invokes the independent residual audit last, and exits zero.
4. Validate the sole restricted evidence file after completion.

### Expected Result
The focused command exits zero only after every required matrix and the real 3-navigation scenario pass and cleanup/residual results are zero.

### Expected Evidence
V-11 command, start/end time, exit code zero, named section verdicts, cleanup verdict, final residual verdict, and restricted evidence reference without printed raw authority.

## Test V-12: Full repository verification gate

- **Type:** Full regression validation
- **Task:** T-5, T-6, T-7, T-8
- **Acceptance Criteria:** AC-17
- **Priority:** Critical

### Setup
Use a clean workspace with dependencies and designated Chromium/code-server prerequisites installed. Do not invoke package commands outside the root recipe.

### Steps
1. Run `just verify` once with adequate finite command time.
2. Confirm formatting, lint, type checks, package tests, builds, existing browser/runtime gates, complete BL-011 matrices, real Chromium scenario, and documentation contracts all execute.
3. Confirm BL-011 cleanup completes and the final BL-011 residual audit reports zero owners.
4. Inspect Git/public scans and the restricted evidence mode.

### Expected Result
Full verification exits zero with no regression and ends with complete BL-011 cleanup/residual evidence while preserving the one allowed ignored restricted file.

### Expected Evidence
V-12 full command result with exit zero, component gate summaries, BL-011 matrix/browser verdicts, final cleanup/residual verdict, and clean tracked-tree proof.
