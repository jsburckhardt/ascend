# ADR-260812-in-process-workbench-reverse-proxy: Adopt an In-Process Stable Workbench Reverse Proxy

## Status

Accepted

## Context

BL-010 owns one loopback-only code-server runtime per active project but intentionally exposes no browser route. Issue #27 requires Ascend to own `/projects/{projectId}/workbench/` for both HTTP and WebSocket traffic while preserving byte streaming, backpressure, finite failures, privacy, and exact shutdown. The API has no current upgrade owner or declared proxy dependency, and normal Fastify body parsing and reply serialization cannot preserve arbitrary upstream streams.

The accepted full-page presentation decision deferred routing and runtime integration. Any proxy boundary must keep that presentation, the four-field project model, and sole BL-010 ownership of runtime processes.

## Decision

Adopt one application-owned, in-process workbench reverse-proxy boundary. Fastify will own route matching, project lookup, and safe precommitment errors. The proxy boundary will own raw HTTP streams, upgrade handshakes, and active proxy sockets in memory.

Implement HTTP forwarding with Node core streams and WebSocket client/server bridging with a direct `ws` 8.x API dependency using no-server upgrade handling. Do not adopt a general proxy plugin: the upstream is runtime-dynamic, and the required header, cookie, redirect, commitment, and shutdown policies are product contracts rather than passthrough defaults.

Resolve every target from `ProjectLibrary.findById` and the immutable result of `ProjectRuntimeManager.start`. Never accept a client-supplied authority, port, path, or proxy target. Keep code-server loopback-only and disable its generic port-proxy routes for this stable-route scope.

On application close, reject new proxy work and settle or abort proxy-owned operations before shutting down the runtime manager and persistence owners. The proxy does not own, persist, or terminate runtime processes.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| `@fastify/http-proxy` with WebSocket support | Fastify-native registration and mature proxy defaults | Its plugin contract is optimized for configured upstreams and generic rewrites, not a per-request runtime target and the required commitment-aware failure matrix | Required policy would still need a custom lower-level owner |
| `http-proxy` | Supports HTTP and WebSocket in one mature package | Event-driven defaults hide header and socket ownership and still require substantial custom cookie, redirect, failure, and shutdown logic | A general proxy layer adds more implicit behavior than it removes |
| Fastify parsed bodies and normal replies | Smallest dependency surface | Buffers or serializes arbitrary bytes, cannot preserve streaming, and does not own upgrades | Rejected by the binary, streaming, and WebSocket acceptance matrices |
| Browser navigation directly to the runtime port | No proxy implementation | Exposes internal authority, breaks the stable namespace, and bypasses Ascend ownership | Violates FR-018, NFR-007, and the issue acceptance criteria |

## Consequences

### Positive
- One explicit owner can enforce target resolution, finite failures, redaction, and cleanup across HTTP and WebSocket.
- Node streams and `ws` preserve the raw-byte and frame-oriented boundaries needed by the finite matrices.
- BL-010 remains the only process-ownership boundary.

### Negative
- The API must maintain raw Node HTTP and WebSocket lifecycle code and test it beyond the normal Fastify reply lifecycle.
- A direct `ws` dependency and its types become part of the API owned supply chain.
- Shutdown ordering becomes an explicit application invariant.

### Neutral
- Public networking, authentication, TLS, and multi-host operation remain out of scope.
- Project Home and header UI remain BL-012 work.
- The accepted full-page presentation remains unchanged.

## Related Issues

- [#27](https://github.com/jsburckhardt/ascend/issues/27)

## References

- [TypeScript Monorepo and Host Workbench Stack](./ADR-260808-typescript-monorepo.md)
- [Select the Full-Page Browser Workbench Presentation](./ADR-260810-full-page-browser-workbench-presentation.md)
- [Runtime Lifecycle and Error Handling](../core-components/CORE-COMPONENT-260808-runtime-lifecycle-error-handling.md)
