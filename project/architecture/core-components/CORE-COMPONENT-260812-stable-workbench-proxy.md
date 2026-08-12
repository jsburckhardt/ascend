# CORE-COMPONENT-260812-stable-workbench-proxy: Stable Workbench Proxy Boundary

## Status

Adopted

## Purpose

Provide one shared security, transport, failure, and lifecycle contract for routing a browser workbench through an Ascend-owned stable project URL without exposing its loopback runtime authority.

## Scope

This component applies to the Fastify workbench route, raw HTTP forwarding, Node upgrade handling, WebSocket bridging, project and runtime resolution, proxy socket ownership, safe failures, structured events, local evidence, shutdown, and route documentation. It does not add Project Home or header UI, multi-project policy, public networking, authentication, TLS, multi-host operation, alternate editors, runtime-status UI, or user lifecycle controls.

## Definition

### Rules
- Ascend MUST own `/projects/{projectId}/workbench/` and every descendant for HTTP and WebSocket traffic. The decoded project ID MUST be one 1-to-128-character segment matching `^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$`; the close-project API retains its separate opaque-ID contract.
- The proxy MUST resolve the project with `ProjectLibrary.findById`, start or reuse it only through `ProjectRuntimeManager.start`, and derive the upstream solely from the immutable running snapshot. Client host, forwarding, proxy-target, port, canonical-path, and authority values MUST NOT select or modify the upstream.
- The route suffix and query MUST be forwarded unchanged. The base route maps to upstream `/`. The runtime remains loopback-only, runtime state remains memory-only, and code-server generic port-proxy routes MUST be disabled for this scope.
- HTTP request and response bodies MUST use backpressure-aware streams without Fastify body parsing or response serialization. Methods, status, binary bytes, range semantics, entity metadata, and end-to-end headers MUST be preserved unless this contract explicitly rewrites or removes them.
- The proxy MUST remove `Connection`, every header token named by `Connection`, `Keep-Alive`, `Proxy-Authenticate`, `Proxy-Authorization`, `TE`, `Trailer`, `Transfer-Encoding`, and `Upgrade` in both HTTP directions. Required WebSocket upgrade fields are allowed only during an upgrade. Client `Host`, `Forwarded`, all `X-Forwarded-*`, and proxy-target headers MUST be discarded; any upstream authority or origin metadata MUST be rebuilt from the trusted stable request origin and selected loopback runtime.
- Root-relative redirects MUST be prefixed by the stable workbench root. Absolute redirects to the selected loopback authority MUST be rewritten to the stable origin and prefix. Any other absolute authority or unsafe scheme MUST return the declared redirect-rejected failure before commitment. `Service-Worker-Allowed: /` MUST become the stable prefix root.
- Every `Set-Cookie` path MUST be scoped under the stable prefix: `/` and a missing Path become the prefix root, while `/foo` becomes the prefix plus `foo`. Every Domain attribute MUST be removed. Secure, HttpOnly, SameSite, expiry, and other non-target attributes MUST be preserved.
- Browser-visible URLs, downstream headers, downstream bodies, redirects, and cookies MUST contain no selected loopback authority. HTTP forwarding MUST request identity encoding and MUST rewrite a selected authority across textual response-header values and streamed body chunk boundaries to the stable route without buffering the complete body. Proxy and access events MUST contain only stable names, a deterministic one-way project token, safe classifications, elapsed values, and bounded counts; they MUST exclude raw URLs, authorities, paths, authorization, cookies, query or body secrets, command or environment data, and HTTP, WebSocket, or terminal payloads.
- Browser proof MUST classify each parsed request before applying origin rules. Ascend-owned top-level documents, workbench HTTP/fetch traffic, and every WebSocket MUST use the Ascend origin and stable project prefix. A built-in Markdown Preview resource MAY be trusted only when its URL uses HTTPS, has empty username and password fields, no explicit authority port syntax, and an empty parsed `port` field, and its complete hostname matches `^vscode-remote\+(?:[a-z0-9]|-[0-9a-f]{4})+\.vscode-resource\.vscode-cdn\.net$`. This admits one nonempty VS Code encoded-authority token after URL hostname canonicalization: ASCII letters and digits are lowercase literals and every encoded character is exactly `-` plus four lowercase hexadecimal digits. It rejects the bare suffix, arbitrary prefixes before `+`, free hyphens, malformed escapes, extra sublabels, suffix confusion, credentials, and explicit ports.
- The fixed `vscode-remote+` text MUST be treated as VS Code opaque-label syntax, not as a wildcard or expanded external-origin permission. The classifier MUST reject HTTP, WebSocket schemes, all external sockets, and any trusted-host candidate whose pathname or query contains the transient raw authority, its percent-encoded form, or the encoded-authority token copied from the left label. Comparisons MAY use those values in memory, but public evidence MUST emit only bounded host, scheme, resource, pathname, query-key, credential, port, and authority-leak classes; it MUST NOT retain raw URLs, hostnames, authorities, encoded-authority tokens, credentials, ports, or authority-bearing path/query values. Every other external HTTP origin and every external WebSocket origin MUST fail proof. Browser-generated `blob:` script URLs MUST remain in the unfiltered inventory as a bounded browser-local, non-network class only when their inherited origin equals the stable Ascend origin; an external-origin blob MUST fail.
- The designated proof MUST launch code-server with `EXTENSIONS_GALLERY={}` and MUST observe zero Open VSX or other extension-marketplace requests. Marketplace access is unnecessary for Explorer, built-in Markdown Preview, terminal, and stable routing; an observed marketplace request is not covered by the webview exception.
- Three fresh workbench workflows MUST open exactly six VS Code remote-protocol WebSockets: one Management role (`desiredConnectionType=1`) and one ExtensionHost role (`desiredConnectionType=2`) per workflow. All six MUST be same-origin under the stable prefix with `reconnection=false`. Unknown, duplicate, missing, retry, external-origin, or internal-port socket observations MUST fail. Evidence MUST retain only role and safe URL shape, not handshake payloads or reconnection tokens.
- WebSocket bridging MUST use finite precommit handshakes, preserve text and binary message bytes and order, propagate ping and pong behavior, preserve clean close codes and reasons, convert an upstream abnormal termination into downstream abnormal termination without transmitting reserved code `1006`, and apply backpressure before accepting more frames. A disconnected downstream MUST cancel only its own pending handshake or upstream peer.
- The proxy owner MUST inventory pending requests, upstream HTTP streams, handshakes, raw sockets, and upgraded WebSockets in memory. Shutdown MUST reject new work, return the manager-shutdown failure before commitment, close committed streams and upgrades without a second status, settle proxy work within 5,000 ms, and complete before the runtime-manager and persistence shutdown steps. Runtime processes remain exclusively owned by BL-010.
- Upstream HTTP response headers and WebSocket handshakes MUST each have a 5,000 ms timeout. Test-only shorter injected bounds MAY be used. Every public precommit failure MUST use exactly `{"error":{"code":"<code>","message":"<message>"}}` and the following non-overlapping table:

| Internal category | HTTP | Public code | Public message |
|---|---:|---|---|
| malformed project ID | 400 | `invalid_project_id` | `Project ID is invalid.` |
| unknown project from route lookup | 404 | `project_not_found` | `Project is not registered.` |
| persistence lookup failure | 503 | `project_lookup_unavailable` | `Project lookup is temporarily unavailable.` |
| runtime `unknown-project` | 502 | `workbench_runtime_project_changed` | `Workbench project state changed before startup.` |
| runtime `canonical-path-invariant` | 502 | `workbench_runtime_project_mismatch` | `Workbench project metadata is inconsistent.` |
| runtime `spawn-error` | 502 | `workbench_start_failed` | `Workbench could not start.` |
| runtime `executable-missing` | 502 | `workbench_unavailable` | `Workbench runtime is unavailable.` |
| runtime `early-exit-code` | 502 | `workbench_early_exit_code` | `Workbench exited before becoming ready.` |
| runtime `early-exit-signal` | 502 | `workbench_early_exit_signal` | `Workbench stopped before becoming ready.` |
| runtime `address-in-use-exhausted` | 502 | `workbench_port_unavailable` | `Workbench could not acquire a loopback listener.` |
| runtime `readiness-timeout` | 504 | `workbench_readiness_timeout` | `Workbench readiness timed out.` |
| runtime `health-status-unexpected` | 502 | `workbench_health_status_invalid` | `Workbench health status was invalid.` |
| runtime `health-body-unexpected` | 502 | `workbench_health_body_invalid` | `Workbench health response was invalid.` |
| runtime `caller-cancelled` | 502 | `workbench_start_cancelled` | `Workbench startup was cancelled.` |
| upstream DNS failure | 502 | `workbench_upstream_dns_failed` | `Workbench upstream name resolution failed.` |
| upstream connect failure | 502 | `workbench_upstream_connect_failed` | `Workbench upstream connection failed.` |
| upstream reset | 502 | `workbench_upstream_reset` | `Workbench upstream connection was reset.` |
| invalid upstream HTTP | 502 | `workbench_upstream_invalid_response` | `Workbench upstream response was invalid.` |
| upstream HTTP response timeout | 504 | `workbench_upstream_timeout` | `Workbench upstream response timed out.` |
| WebSocket handshake timeout | 504 | `workbench_websocket_timeout` | `Workbench WebSocket handshake timed out.` |
| WebSocket upstream refusal | 502 | `workbench_websocket_refused` | `Workbench WebSocket connection was refused.` |
| rejected redirect | 502 | `workbench_redirect_rejected` | `Workbench redirect target was rejected.` |
| runtime `manager-shutdown` before commitment | 503 | `workbench_shutting_down` | `Workbench routing is shutting down.` |

- Validation MAY retain exactly one ignored local evidence file containing an internal authority. That file MUST be created with mode `0600`, remain owner-readable, and contain the matrix, browser, redaction, cleanup, and residual results. Public documentation, committed evidence, command output, and every other generated artifact MUST omit raw internal ports and authorities.

### Interfaces
- A `WorkbenchProxyManager` accepts project-library and project-runtime boundaries plus injected HTTP, WebSocket, clock, timeout, event, and audit adapters.
- The manager exposes HTTP handling, Node server upgrade handling, idempotent bounded shutdown, and an aggregate owned-resource audit. It does not expose an arbitrary upstream option.
- The Fastify plugin registers the base and descendant route and one removable `server` upgrade listener. Raw handling takes ownership before Fastify parses a body and retains safe precommit response behavior.
- Fake fixtures expose observable pre-start, emitted-chunk, received-chunk, pending-handshake, close, and cleanup barriers so concurrency and cancellation are proved without sleeps.

### Expectations
- A stopped project receives one BL-010 start/readiness sequence even when HTTP and WebSocket clients arrive together; later requests and reconnects reuse one healthy PID identity and internal port.
- Client disconnect affects only the matching proxy operation and never stops or invalidates the shared runtime.
- Every matrix case has a declared finite timeout, generation input, expected digest or exact outcome, and post-case zero-socket audit.
- Full-page desktop Chromium continues to own the authoritative presentation. Every Ascend-owned request and WebSocket remains same-origin under the stable prefix; only the exact grammar-validated isolated Markdown webview HTTPS resource exception is classified separately without retaining its raw host or authority token.

## Rationale

A dedicated boundary is required because ordinary Fastify parsing and serialization cannot preserve arbitrary streams, while Node server upgrades bypass normal route handlers. Node HTTP streams plus a directly owned `ws` API keep the dependency surface small and make all target-selection, rewrite, timeout, commitment, backpressure, redaction, and cleanup rules explicit and injectable. Separating proxy socket ownership from BL-010 process ownership preserves the existing runtime manager contract.

## Usage Examples

```ts
const controller = createApiServerController({
  createWorkbenchProxyManager: (projectLibrary, projectRuntime) =>
    createWorkbenchProxyManager({
      projectLibrary,
      projectRuntime,
    }),
})

const app = await controller.start()
// app.workbenchProxy is application-owned and inventories active proxy work.
await controller.stop()
```

## Integration Guidelines

- Add `ws` and its TypeScript declarations as direct API dependencies; do not rely on a transitive database-client copy.
- Keep route parsing, failure mapping, header and cookie policy, and evidence schemas in small pure contract modules; keep stream and socket ownership in the proxy manager.
- Register proxy shutdown before runtime shutdown, and remove the upgrade listener during shutdown.
- Use trusted runtime snapshots and stable request origin data only; never reuse client forwarding metadata.
- Test the complete fake matrices before the designated real Chromium scenario, then run one union residual audit.
- Set `EXTENSIONS_GALLERY={}` only in the deterministic designated proof environment unless a later product decision changes marketplace behavior.
- Derive Management and ExtensionHost roles from the initial VS Code control handshake, discard handshake payloads and tokens, and retain only bounded role counts.
- Parse candidate webview URLs once, compare their hostname and authority forms transiently, and return only bounded public classification fields.

## Exceptions

- None. Public exposure, authentication, TLS termination, multi-host routing, and other workbench providers require later architecture decisions.

## Enforcement

- [x] Automated checks
- [x] Code review checklist
- [x] Test coverage requirements

## Related ADRs

- [ADR-260812-in-process-workbench-reverse-proxy](../ADR/ADR-260812-in-process-workbench-reverse-proxy.md)
- [ADR-260810-full-page-browser-workbench-presentation](../ADR/ADR-260810-full-page-browser-workbench-presentation.md)
- [ADR-260808-typescript-monorepo](../ADR/ADR-260808-typescript-monorepo.md)
