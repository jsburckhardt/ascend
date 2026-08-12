# Stable project workbench routing

## Route and ownership

Ascend owns `GET`, `HEAD`, other HTTP methods, and WebSocket upgrades at `/projects/{projectId}/workbench/` and every descendant. The decoded ID is one 1-to-128-character segment matching `^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$`. The base maps to upstream `/`; descendant suffixes and query strings are unchanged. Lookup uses the persisted four-field project, then BL-010 starts or health-checks and reuses its single memory-only loopback runtime. Exactly concurrent HTTP and WebSocket arrivals join that BL-010 start. The proxy never accepts a client target, port, canonical path, or authority.

The full-page BL-003 presentation is unchanged. Code-server generic port-proxy routes are disabled. This delivery requires no data, schema, API-client, or configuration migration.

## HTTP behavior

Request and response bodies remain Node streams with backpressure. Methods, status, bytes, `Content-Length`, `Content-Type`, `Cache-Control`, `ETag`, ranges, and end-to-end headers are preserved. `Connection`, tokens named by `Connection`, `Keep-Alive`, `Proxy-Authenticate`, `Proxy-Authorization`, `TE`, `Trailer`, `Transfer-Encoding`, and `Upgrade` are stripped in both HTTP directions. Client `Host`, `Forwarded`, `X-Forwarded-*`, and proxy-target headers are discarded; trusted stable-origin metadata is rebuilt without changing the selected loopback target.

Root-relative, safe path-relative, and same-runtime absolute redirects are rewritten under the stable prefix. Other absolute authorities and unsafe schemes receive `workbench_redirect_rejected`. `Service-Worker-Allowed: /` becomes the stable prefix. Cookie `Path=/`, a missing Path, and descendant paths are scoped under that prefix; `Domain` is removed while `Secure`, `HttpOnly`, `SameSite`, expiry, and other attributes remain.

A client disconnect cancels only its matching upstream stream. It does not stop or invalidate the reused runtime. Upstream response and WebSocket handshake bounds are 5,000 ms.

## WebSocket behavior

The proxy establishes the trusted upstream before committing the downstream upgrade. It preserves text and binary bytes, order, ping/pong, and clean close codes and reasons. Ordered sends wait for bounded buffered output. Abnormal upstream termination becomes abnormal downstream termination; reserved code `1006` is observed locally and is never transmitted in a close frame. Refusal is `502`; a handshake timeout is `504`. A client closing during the observed pending-handshake barrier cancels that upstream attempt and produces no late response. Sequential reconnect workflows reuse the same healthy BL-010 runtime.

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
| proxy manager shutdown before commitment | 503 | `workbench_shutting_down` | Workbench routing is shutting down. |

After commitment, shutdown closes the stream or upgraded socket without attempting a second HTTP status.

## Security, evidence, and operations

Proxy events contain only stable event names, project ID, transport, elapsed time, and bounded classification. They contain no raw URL, internal authority, canonical path, authorization, cookie, query/body secret, command/environment value, or HTTP, WebSocket, terminal payload. Public responses, logs, documentation, and committed evidence follow the same rule. The opaque project token appears only in stable URLs and its dedicated restricted evidence field.

Validation may retain only `test-results/bl-011/workbench-route-evidence.json` with a raw internal authority. It is ignored, atomic, a regular file, and mode `0600`. It contains fake HTTP/WebSocket/failure/concurrency/shutdown results, the real Chromium record, redaction, cleanup, and residual sections. Do not publish it.

Run `just verify-workbench-route` for the complete fake matrices, exact three-navigation Chromium workflow, cleanup, and final residual audit. The browser scenario has a finite 90,000 ms overall bound around its stricter per-operation bounds. Run `just proof-workbench-route-residual-audit` to repeat the independent owner audit. `just verify` ends with the complete focused gate. The finite injected faults are persistence/runtime categories, DNS/connect/reset/invalid HTTP, HTTP and WebSocket timeout/refusal, external redirect, client abort, pending and committed shutdown, and client close during handshake.

Proxy shutdown rejects new work, removes the upgrade listener, settles within 5,000 ms, and closes pending requests, upstream streams, raw sockets, and WebSockets before BL-010 runtime and SQLite shutdown. The executed matrices and designated Chromium workflow observed zero proxy, fixture, client, browser, runtime-process, and owned-listener residuals while an unrelated control listener remained alive at its checkpoint.

## Out of scope

BL-012 Project Home or header wiring, multi-project policy, public authentication, public networking, TLS termination, multi-host routing, alternate editors, persisted runtime state, runtime-status UI, and user lifecycle controls remain out of scope.
