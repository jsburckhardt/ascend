# Stable project workbench routing

## Route and ownership

Ascend owns browser navigation, `GET`, `HEAD`, other HTTP methods, and WebSocket upgrades at `/projects/{projectId}/workbench/` and every descendant. The decoded ID is one 1-to-128-character segment matching `^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$`. The base maps to upstream `/`; descendant suffixes and query strings are unchanged. Lookup uses the persisted four-field project, then BL-010 starts or health-checks and reuses its single memory-only loopback runtime. Exactly concurrent HTTP and WebSocket arrivals join that BL-010 start. The proxy never accepts a client target, port, canonical path, or authority.

The full-page BL-003 presentation is unchanged. An unmarked top-level base request receives the BL-012 navigation shell; its marked same-URL acquisition and all descendants retain BL-011 transport. Code-server generic port-proxy routes are disabled. This delivery requires no data, schema, API-payload, or configuration migration. The multi-project policy beyond BL-013 project isolation remains deferred.

The stable-origin rule applies to Ascend-owned top-level, HTTP/fetch, redirect, and WebSocket transport. Built-in Markdown Preview is an isolated VS Code webview. Its only trusted external classification is a parsed HTTPS URL with no credential syntax or explicit port and a complete hostname matching `^vscode-remote\+(?:[a-z0-9]|-[0-9a-f]{4})+\.vscode-resource\.vscode-cdn\.net$`. The single left label is fixed `vscode-remote+` plus one nonempty encoded-authority token: URL-canonicalized ASCII letters and digits are lowercase literals, and every encoded character is `-` plus four lowercase hexadecimal digits. The `+` is opaque VS Code syntax, not wildcard permission. Bare or lookalike suffixes, arbitrary prefixes, free or malformed hyphens, extra sublabels, suffix confusion, credentials, explicit ports, HTTP, WebSockets, unrelated hosts, and raw, percent-encoded, or label-encoded authority copies in path or query are forbidden. Classification compares authority forms only transiently and records bounded scheme, host, credential, port, path, query-key, resource, and leak classes—never a raw URL, host, encoded-authority token, credential, port, or authority-bearing value. Browser-generated `blob:` script URLs are a separate non-network class only when their inherited origin is the stable Ascend origin; they do not relax the HTTPS webview hostname grammar, and every external-origin blob is forbidden.

## Front-door trust configuration

Local Vite and the API use ASCEND_FRONT_DOOR_TOKEN to authenticate the private x-ascend-front-door-authority and x-ascend-front-door-token pair. If the variable is unset, both use the local-only ascend-development-front-door-v1 default. An explicit value must contain 16–256 characters and must be identical in both process environments. A partial pair, mismatched token, malformed authority, or configured empty/short/oversized value is refused; it never falls back after trusted headers appear and cannot start a runtime.

A deployment proxy must own /projects for HTTP and WebSocket traffic, inject both trusted headers only on its private API hop, and remove or overwrite client copies. Never expose the token in browser configuration, URLs, responses, evidence, or access/application logs. Rotate it by updating the API and proxy together before restart. Local direct API requests omit both headers and derive their stable authority from the loopback listener. This configuration clarification requires no SQLite, data, schema, or API-payload migration.

## Browser navigation shell

Project Home is exact `/`. Its Open action encodes only the persisted stable ID and navigates once to `/projects/{projectId}/workbench/` with a trailing slash. Repeated activation joins the same navigation owner. The API validates an unmarked top-level base route before lookup, returns a polite loading-status document, and acquires upstream HTML through the same URL with a server-owned request marker. The marker cannot select an ID, path, port, authority, or upstream. Malformed routes render `Project route unavailable` before lookup or runtime start.

The shell has one monotonic acquisition generation. Projects navigates to `/` and invalidates acquisition without stopping the runtime. Retry aborts the prior owner, replaces retained failure state at the same URL, and starts one newer generation without adding history. Late success or failure cannot mutate the newer page. Unknown IDs show `Project is not registered.` with Projects and no Retry. Retryable catalog errors use their fixed messages; invalid/unreadable responses use `Workbench could not be loaded.`; the 15,000 ms shell bound uses `Workbench document load timed out.` Successful acquired HTML preserves the redirected folder selection and upstream content-security policy, then adds only the keyboard-operable Ascend Projects header. Names, paths, and identity text remain inert; no PID, listener, authority, Stop, Restart, or Close value is added.

Home, each Open, refresh, Back, Forward, and direct navigation use native full-document history. Development Vite forwards `/projects` HTTP and WebSocket traffic to Fastify on the Home origin; a deployed front door must preserve the same ownership.

## HTTP behavior

Request and response bodies remain Node streams with backpressure. The proxy requests identity encoding and rewrites any selected internal authority found across chunk boundaries in textual upstream bodies and response headers to the stable route before public delivery. Methods, status, bytes, `Content-Type`, `Cache-Control`, `ETag`, ranges, and end-to-end headers are preserved. Unencoded textual responses always remove the upstream `Content-Length` before the authority-rewrite stream runs, because a replacement can change the byte count; Node therefore emits safe streamed framing. The original `Content-Length` is preserved only for byte-identical binary or encoded responses. `Connection`, tokens named by `Connection`, `Keep-Alive`, `Proxy-Authenticate`, `Proxy-Authorization`, `TE`, `Trailer`, `Transfer-Encoding`, and `Upgrade` are stripped in both HTTP directions. The V-4 executable matrix injects each of those eight names through the stable route into a real fake-upstream request and response—16 directional cases—plus one `Connection`-token extension in each direction; helper-only records cannot satisfy residual validation. Client `Host`, `Forwarded`, `X-Forwarded-*`, and proxy-target headers are discarded; trusted stable-origin metadata is rebuilt without changing the selected loopback target.

Root-relative, safe path-relative, and same-runtime absolute redirects are rewritten under the stable prefix. Other absolute authorities and unsafe schemes receive `workbench_redirect_rejected`. `Service-Worker-Allowed: /` becomes the stable prefix. Cookie `Path=/`, a missing Path, and descendant paths are scoped under that prefix; `Domain` is removed while `Secure`, `HttpOnly`, `SameSite`, expiry, and other attributes remain.

A client disconnect cancels only its matching upstream stream. It does not stop or invalidate the reused runtime. Upstream response and WebSocket handshake bounds are 5,000 ms.

## WebSocket behavior

The proxy establishes the trusted upstream before committing the downstream upgrade. It preserves text and binary bytes, order, ping/pong, and clean close codes and reasons. Ordered sends wait for bounded buffered output. Abnormal upstream termination becomes abnormal downstream termination; reserved codes `1005` and `1006` are observed locally and are never transmitted in a close frame. Refusal is `502`; a handshake timeout is `504`. A client closing during the observed pending-handshake barrier cancels that upstream attempt and produces no late response. Sequential reconnect workflows reuse the same healthy BL-010 runtime.

The real proof performs three fresh workbench workflows with zero retries. Each workflow opens exactly one Management (`desiredConnectionType=1`) and one ExtensionHost (`desiredConnectionType=2`) channel, for six network sockets total. All six use the stable prefix with `reconnection=false`. Unknown, missing, duplicate, seventh, retrying, external-origin, and internal-port sockets fail; control payloads and reconnection token values are discarded after safe role and query-key classification. The BL-012 continuity proof separately inventories every stable-prefix socket as Management, ExtensionHost, Tunnel, or cancelled-before-control and inventories development-front-door sockets separately; unknown protocol roles fail.

## Complete safe failure table

Every precommit failure body is exactly `{"error":{"code":"<code>","message":"<message>"}}`.

| Category | HTTP | Code | Message |
|---|---:|---|---|
| malformed project ID | 400 | `invalid_project_id` | Project ID is invalid. |
| unknown project | 404 | `project_not_found` | Project is not registered. |
| persistence lookup failure | 503 | `project_lookup_unavailable` | Project lookup is temporarily unavailable. |
| runtime unknown-project | 502 | `workbench_runtime_project_changed` | Workbench project state changed before startup. |
| runtime canonical-path-invariant | 502 | `workbench_runtime_project_mismatch` | Workbench project metadata is inconsistent. |
| runtime spawn-error | 502 | `workbench_start_failed` | Workbench could not start. |
| runtime executable-missing | 502 | `workbench_unavailable` | Workbench runtime is unavailable. |
| runtime early-exit-code | 502 | `workbench_early_exit_code` | Workbench exited before becoming ready. |
| runtime early-exit-signal | 502 | `workbench_early_exit_signal` | Workbench stopped before becoming ready. |
| runtime address-in-use-exhausted | 502 | `workbench_port_unavailable` | Workbench could not acquire a loopback listener. |
| runtime readiness-timeout | 504 | `workbench_readiness_timeout` | Workbench readiness timed out. |
| runtime health-status-unexpected | 502 | `workbench_health_status_invalid` | Workbench health status was invalid. |
| runtime health-body-unexpected | 502 | `workbench_health_body_invalid` | Workbench health response was invalid. |
| runtime caller-cancelled | 502 | `workbench_start_cancelled` | Workbench startup was cancelled. |
| upstream DNS failure | 502 | `workbench_upstream_dns_failed` | Workbench upstream name resolution failed. |
| upstream connect failure | 502 | `workbench_upstream_connect_failed` | Workbench upstream connection failed. |
| upstream reset | 502 | `workbench_upstream_reset` | Workbench upstream connection was reset. |
| invalid upstream HTTP | 502 | `workbench_upstream_invalid_response` | Workbench upstream response was invalid. |
| upstream HTTP response timeout | 504 | `workbench_upstream_timeout` | Workbench upstream response timed out. |
| WebSocket handshake timeout | 504 | `workbench_websocket_timeout` | Workbench WebSocket handshake timed out. |
| WebSocket upstream refusal | 502 | `workbench_websocket_refused` | Workbench WebSocket connection was refused. |
| rejected redirect | 502 | `workbench_redirect_rejected` | Workbench redirect target was rejected. |
| runtime manager-shutdown before commitment | 503 | `workbench_shutting_down` | Workbench routing is shutting down. |

After commitment, shutdown closes the stream or upgraded socket without attempting a second HTTP status.

## Security, evidence, and operations

Proxy events contain only stable event names, a deterministic one-way project token, transport, elapsed time, and bounded classification. They contain no raw URL, internal authority, canonical path, authorization, cookie, query/body secret, command/environment value, or HTTP, WebSocket, terminal payload. Public responses, logs, documentation, and committed evidence follow the same rule. The opaque project token appears only in stable URLs and its dedicated restricted evidence field. The security matrix enables and captures both Fastify access logs and proxy application logs between explicit start/end markers. Authorization, cookie, query, and body sentinels travel in an actual HTTP request; command/environment and canonical-path markers cross the controlled runtime boundary; the WebSocket sentinel is a real frame; and the terminal sentinel is a distinct integrated-terminal WebSocket frame. A disabled logger, an empty access/application capture, or substituting HTTP headers for either frame channel fails the proof. Only the declared stable-route project-token location and bounded safe classifications are allowed.

Validation may retain only `test-results/bl-011/workbench-route-evidence.json` with a raw internal authority. It is ignored, atomic, a regular file, and mode `0600`. It contains fake HTTP/WebSocket/failure/concurrency/shutdown results, the real Chromium record, redaction, cleanup, and residual sections. Do not publish it.

Run `just verify-home-workbench` for the BL-012 component/API matrices, controlled four-failure Chromium episode, exact three-entry continuity workflow, isolated direct-navigation/refresh workflow, cleanup, and residual audit. Run `just proof-home-workbench-residual-audit` to repeat the BL-012 exact-owner audit.

Run `just verify-workbench-route` for V-0 worktree/cancellation prerequisites, the complete fake HTTP, WebSocket, 23-failure, security, concurrency, and shutdown matrices, then the exact three-workflow Chromium proof, cleanup, and final residual audit. The recipe sets `EXTENSIONS_GALLERY={}` for the designated browser process; the launched runtime receives that exact value, so the proof requires zero Open VSX or other marketplace requests. The browser scenario has a finite 90,000 ms overall bound around its stricter per-operation bounds. Run `just proof-workbench-route-residual-audit` to repeat the independent owner audit. `just verify` ends with the complete focused gate. Both paved gates are read-only for tracked source and test files; they update only the ignored restricted evidence, and handoff compares tracked-file hashes before and after validation. The 23 catalog faults are executable stable-route request or upgrade cases, not local throws or table-only comparisons. Each retains its request/upgrade execution ID, observed internal category, exact public status/code/message, zero-resource cleanup, and redaction result. The finite controlled faults are persistence/runtime categories, DNS/connect/reset/invalid HTTP, HTTP and WebSocket timeout/refusal, external redirect, and manager shutdown; the adjacent lifecycle matrices retain client abort, pending/committed shutdown, and client-close barriers.

Proxy shutdown rejects new work, removes the upgrade listener, settles within 5,000 ms, and closes pending requests, upstream streams, raw sockets, and WebSockets before BL-010 runtime and SQLite shutdown. The executed matrices and designated Chromium workflow observed zero proxy, fixture, client, browser, runtime-process, and owned-listener residuals while an unrelated control listener remained alive at its checkpoint.

## BL-012 bounded proof and cleanup interpretation

The event-bound component and API matrices reject rows without execution and event IDs. The real-process browser proof uses isolated SQLite plus exact API and web process groups. Its no-retry overall bound is 220,000 ms: setup 5,000; API readiness 15,000; web readiness 10,000; runtime readiness 30,000; workbench readiness 30,000; terminal operations 15,000; three entries 25,000; history 25,000; deep link 35,000; evidence 5,000; cleanup 10,000; and a 15,000 ms bounded margin. Each retained step records its applied bound, start, end, duration, and outcome; the residual audit rejects a missing or exceeded step. The failure episode records startup, recovery, case, and overall starts, ends, and durations.

Retained evidence contains safe classes, counts, timings, stable execution IDs, exact owned process identities, and fixture digests. It does not retain raw terminal values, canonical paths, internal authorities, trusted headers or tokens, query/body sentinels, socket payloads, or log bodies. Cleanup closes exact pages, contexts, and proxy sockets; terminates the exact marker PID; removes its counter file; stops exact API, web, and runtime process groups/listeners; removes only owned SQLite files and sidecars; compares the fixture manifest; and checks that the unrelated listener survived. The process proof builds the API once, launches the compiled server directly, and reserves distinct API/web ports. API and Vite log output is only a timestamped hint: bounded polling must first attribute the reserved listener to the exact launched process tree and then receive the expected API project-list or Web Home status and body. Retained readiness evidence distinguishes the nullable log-hint timestamp from the listener-and-HTTP-ready timestamp; a log line alone never marks readiness. Timeout and assertion paths reserve cleanup time, write partial timing diagnostics, close contexts, and stop exact API, web, runtime, terminal, database, and listener identities. Run just verify-home-workbench-real for that focused process proof, just verify-home-workbench for the complete BL-012 gate, and just proof-home-workbench-residual-audit after either complete gate.

## Out of scope

Multi-project policy, public authentication, public networking, TLS termination, multi-host routing, alternate editors, persisted runtime state, runtime-status UI, and user lifecycle controls remain out of scope.


## BL-013 interleaved target isolation

For simultaneous A/B/C traffic, every target is resolved from the matching immutable runtime snapshot. Before opening an HTTP stream or WebSocket, the proxy verifies stable project ID, canonical path, stable route, opaque owner token, loopback URL, and port against persisted metadata and the parsed route. Pending operations, streams, handshakes, raw sockets, and WebSockets are tagged by that token and can be audited per project or in aggregate. Frame forwarding also verifies the selected socket carries the same token.

The finite matrix executes all six ordered A/B/C pairs for project/route, HTTP target, WebSocket target, and frame-destination mismatch: 24 rows must fail closed with zero nonmatching delivery and zero residual resources. Selected-project proxy failure does not mutate peer runtime identities. Runtime and proxy events use the same opaque project token and closed event/classification fields; public artifacts reject raw paths, IDs where prohibited, ports, authorities, commands, environment, Git, terminal, source, sentinel, and secret-like values.

Run just verify-project-runtime-isolation for the execution-backed fake matrix and the three-project Chromium episode, then just proof-project-runtime-isolation-residual-audit independently. The browser result proves only immediate isolation while all three runtimes are active, including repository-test-only B termination and one explicit replacement. It does not claim BL-014 switching/session persistence, BL-015 performance, or a public Stop/Restart lifecycle operation.
