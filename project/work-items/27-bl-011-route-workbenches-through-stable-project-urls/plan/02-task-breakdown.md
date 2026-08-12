# Task Breakdown: BL-011 Stable Project Workbench Routes

## Task T-0: Preserve designated validation prerequisites

- **Status:** Complete prerequisite; preserve through correction
- **Complexity:** Low
- **Dependencies:** None
- **Acceptance Criteria:** AC-13, AC-14, AC-17
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-development-standards

### Description
Preserve the already completed uncommitted validation prerequisites. The capacity prerequisite accepts the primary checkout or a linked worktree only when its Git top level is the repository root and its common directory resolves to the designated Ascend Git directory; unrelated repositories fail before starts. The proof runtime rechecks cancellation after observing child exit so an abort-triggered exit remains typed cancellation rather than racing into early-exit.

### Acceptance Criteria
- AC-13 and AC-17: The corrected designated browser proof can execute from the feature checkout or an owned linked worktree without weakening repository identity checks.
- AC-14 and AC-17: Concurrent abort-triggered proof exits classify as cancellation and every discovered process identity is absent afterward.

### Test Coverage
- V-0 exercises primary checkout, linked worktree, nested-root rejection, unrelated-repository rejection, three concurrent abort-triggered exits, typed cancellation, and exact identity absence.
- Run these focused unit tests before any designated Chromium rerun and retain them in focused/full command coverage.

### Expected Evidence
- V-0 focused result naming accepted/rejected repository contexts, three cancellation outcomes, and three absent exact identities.
- Git diff references for `workbench-capacity-prerequisites.ts`, `workbench-proof-runtime.ts`, and their regression tests.

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

## Task T-6: Correct the real Chromium ownership and socket inventory proof

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-0, T-3, T-4, T-5
- **Acceptance Criteria:** AC-2, AC-11, AC-13, AC-14, AC-15, AC-17
- **Related ADRs:** ADR-260810-full-page-browser-workbench-presentation; ADR-260812-in-process-workbench-reverse-proxy
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260808-host-process-environment; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260806-agent-executable-acceptance-criteria

### Description
Correct the designated proof without patching VS Code. Add a pure parsed-URL classifier for the exact hostname `^vscode-remote\+(?:[a-z0-9]|-[0-9a-f]{4})+\.vscode-resource\.vscode-cdn\.net$`: HTTPS only, empty credentials and parsed `port`, one nonempty encoded-authority label, and no raw, percent-encoded, or label-encoded authority copy in path/query. Explain and enforce `vscode-remote+` as fixed VS Code opaque-label syntax, not wildcard permission. Use the retained BL-003 host shapes and current BL-011 observation to justify this grammar, but compare authority values only transiently and emit bounded classes without raw host/token data. Launch with `EXTENSIONS_GALLERY={}`, retain three fresh contexts and zero retries, require all Ascend transport and six 3+3 sockets on the stable prefix, and reject every malformed external resource or external socket. Retain stable-origin `blob:` scripts as bounded browser-local non-network inventory and reject external-origin blobs.

### Acceptance Criteria
- AC-2: Ascend-owned base, nested, service, and WebSocket traffic remains same-origin under the stable prefix; only a grammar-valid HTTPS `vscode-remote+<encoded-authority>` Markdown resource is external, and full-page Explorer/Preview behavior remains unchanged.
- AC-11: Safe evidence stores bounded host/scheme/resource/path/query-key/credential/port/leak and socket-role classes only; no raw URL, hostname, authority token, authority-bearing path/query value, canonical path, payload, handshake, or reconnection token is retained publicly.
- AC-13: Three navigation workflows and three workbench connection workflows produce six sockets: exactly three Management and three ExtensionHost, zero retries, one runtime identity, all required outcomes, zero marketplace requests, only grammar-valid webview resources, and no raw host or internal port in public evidence.
- AC-14, AC-15, and AC-17: Every observed request/context/page/socket closes, corrected evidence is restricted, and focused/full gates end in successful residual audit.

### Test Coverage
- V-9 runs the serial real Chromium scenario with marketplace disabled and finite observers attached before navigation.
- Run exact classifier vectors. Accept `https://vscode-remote+fixture-003a43210.vscode-resource.vscode-cdn.net/out/file.css`. Reject the bare suffix; empty token; `abc+` prefix; free hyphen or malformed four-hex escape; extra sublabel; suffix lookalike; username/password; `:444`; HTTP; `ws`/`wss`; unrelated external host; and synthetic raw, percent-encoded, or label-encoded authority copied into path or query. Also reject Open VSX, internal-port sockets, unknown/duplicate/missing roles, seventh socket, `reconnection=true`, and retained payload/token data.
- Preserve terminal parity, 256-KiB digest, Explorer, Preview, runtime reuse, redaction, and cleanup assertions.

### Expected Evidence
- V-9 restricted record containing the exact classifier-vector manifest and verdict counts; three workflows; six safe 3/3 socket records; zero retries/marketplace/forbidden requests; bounded webview classes without raw host/token/path/query data; one runtime identity; functional outcomes; zero sentinel/authority matches; and empty inventories.

## Task T-7: Correct restricted evidence and union residual cleanup

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-6
- **Acceptance Criteria:** AC-11, AC-14, AC-15, AC-17
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260808-runtime-lifecycle-error-handling; CORE-COMPONENT-260808-engineering-harness-delivery-contract; CORE-COMPONENT-260806-project-command-interface

### Description
Extend the sole atomic mode-`0600` local evidence record with bounded Ascend/webview/marketplace/forbidden classes, exact classifier-vector verdicts, zero marketplace count, three workflows, six named socket roles, zero retries, and complete close inventories. Raw runtime identity may remain only in that restricted file, but raw webview hostname, extracted encoded-authority token, credentials, and authority-bearing path/query values are unnecessary and must not be retained even there or in command output. Reject stale, assertion-only, or raw-host browser sections while preserving every existing fake matrix, public scan, exact process/socket audit, unrelated-control observation, and final residual command.

### Acceptance Criteria
- AC-11: Evidence contains bounded classifications rather than raw host/token/authority-bearing URL data, handshake data, or secrets and reports zero literal, percent-encoded, and VS Code label-encoded authority matches on public surfaces.
- AC-14: Cleanup inventories all six browser sockets and every context/page/request/proxy/runtime owner with no pending entries.
- AC-15: Exactly one ignored owner-readable file contains necessary restricted runtime details; public artifacts contain no raw hostname, internal authority, encoded-authority token, credential, or port.
- AC-17: Focused and full gates reject grammar gaps, malformed accepted URLs, missing/stale classification, raw-host evidence, marketplace traffic, incorrect roles, unknown sockets, dirty inventories, or residual owners.

### Test Coverage
- V-10 validates schema, mode, Git/public exclusion, classified origin and role cardinality, zero marketplace requests, all required matrix sections, complete inventories, and residual audit.
- Negative fixtures cover the bare suffix, arbitrary plus prefix, free/malformed escape, extra sublabel, suffix confusion, credentials, explicit port, HTTP, `ws`/`wss`, path/query authority copies, raw-host/token evidence, prior 3-socket-only evidence, unclassified sockets, reconnection tokens, Open VSX, absent webview evidence, extra files, and pending resources.

### Expected Evidence
- V-10 metadata/schema report, exact positive/negative vector counts, bounded 3-workflow/6-socket/3+3 and webview/marketplace classes, zero raw hostname/token/authority matches, complete owner union, and successful residual audit.

## Task T-8: Correct paved validation and stable-routing documentation

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-0, T-7
- **Acceptance Criteria:** AC-16, AC-17
- **Related ADRs:** ADR-260812-in-process-workbench-reverse-proxy; ADR-260810-full-page-browser-workbench-presentation; ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260812-stable-workbench-proxy; CORE-COMPONENT-260806-project-command-interface; CORE-COMPONENT-260806-rpiv-stage-contract; CORE-COMPONENT-260808-development-standards

### Description
Update the stable-routing runbook and application documentation to preserve the exact GitHub criteria while stating their evidence boundary: stable-prefix requirements govern Ascend-owned workbench HTTP/WebSocket traffic; the isolated built-in Markdown resource must satisfy the exact encoded-authority hostname grammar and URL constraints; `+` is opaque VS Code syntax rather than expanded permission; public evidence retains bounded classes only; designated proof disables Open VSX; and three workflows comprise six named sockets. Keep all BL-011 matrices, security, cleanup, migration/configuration statements, and scope exclusions. Order focused/full validation so V-0 and classifier vectors pass before V-9, then cleanup and residual audit remain last.

### Acceptance Criteria
- AC-16: Documentation records the exact regex and encoding alphabet, opaque `+` meaning, URL credential/port/scheme/path/query constraints, bounded evidence contract, forbidden origins/internal authority, marketplace decision, 3-workflow/6-socket inventory, validation order, and every existing behavior/exclusion.
- AC-17: Root recipes run V-0 and exact classifier vectors before the corrected designated proof and retain complete matrices, documentation checks, cleanup, and final residual audit.

### Test Coverage
- V-10 documentation contracts assert the exact regex, encoding rule, opaque-plus rationale, forbidden URL matrix, bounded-output rule, and every pre-existing required topic/table row.
- V-11 and V-12 execute the focused and full paved commands, inspect classified browser evidence, and require cleanup/residual success.

### Expected Evidence
- V-10 documentation subject matrix proving all 17 exact criteria are unchanged and the grammar, rationale, negatives, and evidence boundary are explicit.
- V-11 and V-12 zero-exit command records with prerequisite, matrix, corrected browser, cleanup, and residual sections.
