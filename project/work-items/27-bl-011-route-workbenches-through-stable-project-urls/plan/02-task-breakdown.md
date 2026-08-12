# Task Breakdown: BL-011 Stable Project Workbench Routes

## Task T-1: Encode the stable proxy contract and owned dependencies

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-4, AC-5, AC-9, AC-10, AC-11, AC-12, AC-15
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy; ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260808-development-standards; CORE-COMPONENT-260808-structured-runtime-logging

### Description
Add direct API ownership of `ws` 8.x and declarations. Implement small pure contract modules for the stable prefix, route-safe ID grammar, five-second HTTP/WebSocket bounds, complete public failure table, hop-by-hop and forwarding-header filtering, redirect and service-worker rewrites, cookie Path rewriting and Domain removal, safe event fields, and evidence schema. Add `--disable-proxy` to the direct code-server argv without changing loopback binding or canonical-path placement.

### Acceptance Criteria
- AC-1: Contract constants expose only the stable prefix and trusted runtime target inputs; the argv keeps the runtime loopback-only.
- AC-4 and AC-5: Pure transforms implement every declared redirect, cookie, service-worker, and bidirectional header rule.
- AC-9: One frozen table contains every required category exactly once with exact status, code, and message.
- AC-10: The workbench route accepts only one 1-to-128-character route-safe ID segment and rejects the five named malformed inputs.
- AC-11, AC-12, and AC-15: Logging, timeout, commitment, and restricted-evidence contracts expose no secret-bearing or arbitrary fields.

### Test Coverage
- Unit-test all grammar boundaries, table uniqueness/completeness, exact envelopes, connection-token filtering, trusted-header rebuilding, redirect classes, cookie attributes, service-worker scope, timeout validation, safe event serialization, evidence validation, and runtime argv.
- Add negative fixtures for duplicate/missing failure rows, unsupported redirects, malformed cookies, arbitrary proxy-target headers, invalid evidence shapes, and raw-authority fields.

### Expected Evidence
- V-1 contract report with the frozen failure-table hash, exact ID cases, transform vectors, direct dependency/version inventory, loopback argv, and zero forbidden fields.
- Focused Vitest result for contract and runtime-process tests.

## Task T-2: Integrate route resolution and proxy lifecycle ownership

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-1, AC-8, AC-9, AC-10, AC-12, AC-14
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy; ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260810-sqlite-persistence-lifecycle; CORE-COMPONENT-260808-filesystem-path-safety

### Description
Create one application-owned `WorkbenchProxyManager` with injected project lookup, BL-010 runtime start, HTTP/WebSocket adapters, clock, bounds, events, and audits. Register base and descendant workbench routes before body parsing plus one removable Node `upgrade` listener. Resolve project metadata before runtime start, derive only the immutable loopback snapshot, inventory all proxy resources in memory, and close the proxy before the runtime manager and persistence owners.

### Acceptance Criteria
- AC-1 and AC-10: Base and descendant requests/upgrades resolve one validated persisted project and never accept a client target, path, port, or authority.
- AC-8: Four initial HTTP operations and four upgrades released from one observed barrier join one BL-010 start/readiness sequence and one runtime identity.
- AC-9 and AC-12: Lookup, runtime, and shutdown failures are mapped before commitment; committed resources close without a second status.
- AC-14: Repeated application close removes the upgrade listener, settles the proxy audit, then shuts down exact runtime and persistence owners once.

### Test Coverage
- Fastify integration tests cover base/trailing/descendant routes, query and suffix extraction, malformed and unknown IDs, persistence failures, target-confusion headers, runtime mappings, listener registration/removal, idempotent shutdown, and exact owner ordering.
- Barrier-driven lifecycle tests cover eight mixed operations, caller disconnect during shared startup, precommit and postcommit shutdown, and no late handler completion.

### Expected Evidence
- V-2 route/lifecycle record with lookup/start counts, one PID/start/port set, barrier ordering, listener inventory, and shutdown order.
- V-8 commitment and union-resource audit showing zero proxy resources and preserved unrelated listener.

## Task T-3: Implement byte-preserving HTTP forwarding

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-1, AC-3, AC-4, AC-5, AC-6, AC-10, AC-11, AC-12
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260808-structured-runtime-logging; CORE-COMPONENT-260808-runtime-lifecycle-error-handling

### Description
Bridge `IncomingMessage` and upstream Node HTTP requests without Fastify parsing or serialization. Preserve suffix/query, methods, bytes, statuses, content metadata, range semantics, streaming, and backpressure; rebuild trusted upstream authority/origin data; apply header, redirect, cookie, service-worker, and leak policy; classify finite upstream faults; and propagate downstream abort only to the matching upstream stream.

### Acceptance Criteria
- AC-1 and AC-3: Base, nested/query, HEAD, 257-KiB POST, and range traffic is routed to one trusted loopback runtime with exact required bytes and metadata.
- AC-4 and AC-5: Rewrites and all named plus connection-token removals match the frozen contract in both directions.
- AC-6: A delayed consumer receives all 32 chunks in order and an abort after the observed fifth chunk closes only that upstream stream.
- AC-10 and AC-11: Client target headers cannot influence selection; bounded downstream/log scans contain no protected sentinel or internal authority.
- AC-12: HTTP timeout, precommit shutdown, committed abort, and client disconnect follow exact commitment-aware outcomes.

### Test Coverage
- Use real loopback fake HTTP servers and clients, not Fastify injection alone, to exercise raw request/response streams, content-length, HEAD suppression, range, chunk pacing, drain/backpressure, aborts, malformed responses, DNS/connect/reset/timeout faults, and socket ownership.
- Unit tests independently cover transforms; integration tests assert fixture observations and post-case socket counts.

### Expected Evidence
- V-3 four-row payload matrix with predeclared digests and exact headers/statuses.
- V-4 redirect/cookie/header before-and-after inventories.
- V-5 stream timeline, SHA-256 equality, chunk-5 barriers, abort observation, running runtime identity, and zero sockets.

## Task T-4: Implement bounded WebSocket bridging

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1, T-2
- **Acceptance Criteria:** AC-1, AC-2, AC-5, AC-7, AC-10, AC-11, AC-12
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy; ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-structured-runtime-logging

### Description
Use direct `ws` no-server handling to connect the trusted loopback upstream before committing the downstream upgrade. Bridge text/binary frames, ping/pong, clean closes, abnormal termination, and ordered backpressure. Abort pending upstream handshakes when the client closes, enforce finite refusal/timeout mappings, track both peers, and settle each pair on disconnect or shutdown.

### Acceptance Criteria
- AC-1, AC-2, and AC-5: Upgrade URLs remain under the stable prefix, trusted target selection is fixed, and only required upgrade semantics bypass header stripping.
- AC-7: Implement exactly the named finite matrix, declare local observation of abnormal code `1006` without transmitting it, and leave both sockets closed after every case.
- AC-10 and AC-11: Forwarding and proxy-target headers cannot alter the peer; payload and authority sentinels remain absent from events and public captures.
- AC-12: Pending, upgraded, client-disconnected, and manager-shutdown states have bounded exact close/error outcomes and do not affect the shared runtime.

### Test Coverage
- Real loopback `ws` fixtures and clients cover exact text, 64-KiB binary hash, ping/pong, code-1000 reason, upstream terminate/local-1006 observation, handshake timeout, refusal, pending-handshake client close, 16-by-32-KiB ordered backpressure, and two reconnects.
- Assert declared timeout values, send callback/drain ordering, no late response, peer close counts, and zero sockets after every case.

### Expected Evidence
- V-6 exact-case WebSocket matrix with inputs, hashes, control/close observations, bounds, runtime identity reuse, and per-case two-peer cleanup.
- V-8 shutdown rows for pending and upgraded sockets.

## Task T-5: Execute fake-upstream acceptance, failure, and security matrices

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-3, T-4
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-14, AC-15, AC-17
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy; ADR-260810-full-page-browser-workbench-presentation
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260806-agent-executable-acceptance-criteria; CORE-COMPONENT-260808-engineering-harness-delivery-contract; CORE-COMPONENT-260808-development-standards

### Description
Build one deterministic executable acceptance coordinator with owned fake HTTP/WebSocket fixtures, matrix clients, observable barriers, predeclared generation inputs/digests/outcomes, bounded log markers, exact invocation counts, and after-case socket audits. Execute the complete HTTP, WebSocket, safe-failure, ID/security, eight-client concurrency, disconnect, and shutdown matrices before any real browser scenario.

### Acceptance Criteria
- AC-1 through AC-12: Every exact issue case executes once or at its explicitly required count, matches its declared contract, and records concrete observations rather than assertion-only labels.
- AC-14: Every fixture/client/proxy socket is inventoried and absent after its case while the unrelated control listener remains alive.
- AC-15: Results merge into the one restricted evidence record and no other artifact includes the raw internal authority.
- AC-17: The focused recipe runs the complete fake matrices and exits nonzero for a missing, duplicate, malformed, unexecuted, leaked, or dirty case.

### Test Coverage
- Add evidence-schema tests rejecting assertion-only shapes, extra/missing cases, wrong invocation counts, postdeclared hashes, duplicate failure categories, absent barriers, unbounded timeouts, incomplete redaction scans, and failed cleanup.
- Gate the expensive executable coordinator behind the issue-focused recipe while keeping deterministic contract tests in normal package tests.

### Expected Evidence
- V-3 through V-8 matrix sections in one versioned mode-`0600` local evidence file.
- Case manifest showing exact case membership/counts, fixture/client socket union, predeclared expectation hash, and all cleanup outcomes.

## Task T-6: Run the real three-navigation Chromium stable-route scenario

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-3, T-4, T-5
- **Acceptance Criteria:** AC-2, AC-11, AC-13, AC-14, AC-15, AC-17
- **Related ADRs:** ADR-260810-full-page-browser-workbench-presentation; ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Adapt the existing full-page Playwright support to launch the real API, register the BL-001 fixture, and navigate only through the stable route. Use exactly three fresh no-retry navigation/reconnect attempts against one runtime. Preserve Explorer and Preview checks, prove terminal hostname/user/canonical `pwd`, produce 256 KiB from a predeclared deterministic input/digest, capture stable HTTP/WebSocket URLs safely, and close every browser and runtime resource.

### Acceptance Criteria
- AC-2: Base, nested resource, Preview, and WebSocket traffic remains same-origin under the stable prefix with the accepted full-page presentation.
- AC-11: Browser and bounded API captures have zero literal/encoded protected-sentinel matches; only approved stable URLs and the dedicated project-token field contain the opaque ID.
- AC-13: Operation counts are exactly three navigation, three WebSocket, zero retry; one PID/start/port identity is reused; Explorer, Preview, terminal parity, and 256-KiB expected digest pass.
- AC-14 and AC-15: Browser contexts/sockets and exact runtime identity/listener are absent after shutdown; restricted results merge into the sole local evidence file.
- AC-17: The focused and full recipes invoke this serial designated scenario with Playwright retries disabled.

### Test Coverage
- Add one serial Chromium spec and support modules with operation counters, strict URL/prefix/origin assertions, terminal helper bounds, generated-output digest validation, browser socket tracking, and finally-owned cleanup.
- Add negative unit tests for retry attempts, wrong counts, authority-bearing URLs, mismatched digest, changed runtime identity, missing cleanup, and stale contexts.

### Expected Evidence
- V-9 Chromium record with host/tool facts, 3/3/0 counts, stable URL inventory, one runtime identity, functional sentinels, terminal parity, output digest, redaction scan, and browser/runtime cleanup.

## Task T-7: Enforce restricted evidence and union residual cleanup

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-5, T-6
- **Acceptance Criteria:** AC-11, AC-14, AC-15, AC-17
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-engineering-harness-delivery-contract; CORE-COMPONENT-260806-project-command-interface

### Description
Create one atomic owner-readable local evidence writer under ignored `test-results/bl-011/`, enforce mode `0600`, merge fake and real sections, and reject additional authority-bearing artifacts. Implement a finite residual audit over the union of fixture/client/proxy sockets, browser resources, runtime PID/start identity, process group, and listeners while proving the unrelated control listener survives. Add public-tree and Git scans that exclude only the one restricted file.

### Acceptance Criteria
- AC-11: Redaction sections retain marker boundaries and zero-match counts without retaining protected literals outside the restricted record.
- AC-14: Cleanup captures every owned resource and the final residual audit reports zero owned sockets, processes, and listeners while the control remains alive.
- AC-15: Exactly one ignored file may contain the raw authority, is `0600`, validates all required sections, and is absent from Git/public scans.
- AC-17: Both configured gates end with cleanup plus the independent residual command and fail on any unknown or surviving owner.

### Test Coverage
- Unit/integration tests cover atomic create/update, mode repair/refusal, symlink and extra-file rejection, Git ignored/untracked status, public scan exclusions, union deduplication, exact identity checks, surviving control listener, and dirty residual failures.
- Run the residual command independently after the focused scenario and at the end of `just verify`.

### Expected Evidence
- V-10 file metadata, section inventory, Git/public scan results, complete owner union, cleanup outcomes, control-listener liveness, and zero residual result.

## Task T-8: Add paved validation and complete stable-routing documentation

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-7
- **Acceptance Criteria:** AC-16, AC-17
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy; ADR-260810-full-page-browser-workbench-presentation; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260806-rpiv-stage-contract; CORE-COMPONENT-260808-development-standards

### Description
Add `just verify-workbench-route` and `just proof-workbench-route-residual-audit`, integrate the issue gate serially into `just verify`, and document the stable route in a dedicated runbook plus README/API/docs indexes and the runtime runbook. Replace BL-010 deferral statements only where routing is now delivered, preserve BL-012 and deployment exclusions, and add documentation contract tests and public authority scans.

### Acceptance Criteria
- AC-16: Documentation covers stable/base-path behavior; redirect, header, cookie, service-worker, and WebSocket outcomes; the full exact safe-failure table; redaction/disclosure; runtime ownership/reuse; commands/bounds/faults; cleanup observed result; and every Problem exclusion.
- AC-17: Focused and full root recipes each execute the complete matrices, real Chromium scenario, cleanup, and residual audit with inspectable zero-exit results.

### Test Coverage
- Documentation tests assert every required topic, table row, bound, command, architecture link, updated deferral, and out-of-scope phrase across committed files.
- Command-interface tests assert recipe presence/order and no duplicated raw command surface; run formatting, lint, type checks, package tests, build, browser tests, focused gate, and full gate.

### Expected Evidence
- V-10 documentation coverage/public scan report.
- V-11 focused recipe exit-zero record with matrix, browser, cleanup, and residual sections.
- V-12 full `just verify` exit-zero record ending in the same cleanup and residual outcomes.
