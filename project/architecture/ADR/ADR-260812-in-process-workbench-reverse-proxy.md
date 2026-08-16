# ADR-260812-in-process-workbench-reverse-proxy: Adopt an In-Process Stable Workbench Reverse Proxy

## Status

Accepted

## Context

BL-010 owns one loopback-only code-server runtime per active project but intentionally exposes no browser route. Issue #27 requires Ascend to own `/projects/{projectId}/workbench/` for both HTTP and WebSocket traffic while preserving byte streaming, backpressure, finite failures, privacy, and exact shutdown. The API has no current upgrade owner or declared proxy dependency, and normal Fastify body parsing and reply serialization cannot preserve arbitrary upstream streams.

The accepted full-page presentation decision deferred routing and runtime integration. Any proxy boundary must keep that presentation, the four-field project model, and sole BL-010 ownership of runtime processes.

Repository-retained BL-003 browser events and the current real BL-011 Chromium observation both show one VS Code resource host label shaped as `vscode-remote+<encoded-authority>` before `.vscode-resource.vscode-cdn.net`. The implemented suffix-only proof regex rejects that real host because `+` is outside its allowed left-label alphabet, so the correction must follow the producer encoding rather than broaden to an arbitrary wildcard.

## Decision

Adopt one application-owned, in-process workbench reverse-proxy boundary. Fastify will own route matching, project lookup, and safe precommitment errors. The proxy boundary will own raw HTTP streams, upgrade handshakes, and active proxy sockets in memory.

Implement HTTP forwarding with Node core streams and WebSocket client/server bridging with a direct `ws` 8.x API dependency using no-server upgrade handling. Remove upstream `Content-Length` from every unencoded textual response before streamed authority rewriting, because replacement can change the byte count; preserve it only for byte-identical binary or encoded responses. Do not adopt a general proxy plugin: the upstream is runtime-dynamic, and the required header, cookie, redirect, commitment, and shutdown policies are product contracts rather than passthrough defaults.

Resolve every target from `ProjectLibrary.findById` and the immutable result of `ProjectRuntimeManager.start`. Never accept a client-supplied authority, port, path, or proxy target. Keep code-server loopback-only, disable its generic port-proxy routes for this stable-route scope.

Classify browser observations by ownership rather than treating every VS Code-controlled request as Ascend proxy traffic. Ascend-owned top-level navigation, workbench HTTP, and every WebSocket connection must use the Ascend origin and stable project prefix. Built-in Markdown Preview may load isolated webview resources only when the parsed URL uses HTTPS, has no credentials or any explicit port, and has exactly one left label matching `vscode-remote\+(?:[a-z0-9]|-[0-9a-f]{4})+` before the exact `.vscode-resource.vscode-cdn.net` suffix. No extra sublabel, suffix lookalike, path/query authority copy, WebSocket, internal authority, redirect target, or other external origin is included. Browser-generated `blob:` scripts are inventoried as non-network local resources only when the URL inherits the stable Ascend origin; this does not create another external-origin exception.

VS Code constructs this opaque label as `<scheme>+<encoded-authority>` and leaves ASCII alphanumerics unchanged, after which URL hostname canonicalization makes letters lowercase, while encoding every other authority character as a hyphen followed by four lowercase hexadecimal digits. The literal `+` therefore separates the fixed `vscode-remote` scheme from one encoded authority token; it does not widen the external-origin permission to arbitrary prefixes or plus-bearing hosts.

Perform authority and encoded-token comparisons only transiently. Public evidence must emit a bounded trusted, marketplace, or forbidden host class plus safe resource/path/query-key classes, never the raw hostname, encoded authority token, credentials, port, URL, or authority-bearing path/query value.

Disable extension-marketplace network access in the deterministic designated proof by launching code-server with `EXTENSIONS_GALLERY={}`. Code-server maps that non-empty environment value directly to an empty VS Code `extensionsGallery` product configuration, while Explorer, built-in Markdown Preview, and terminal remain the required scenario. Any Open VSX request fails the designated proof.

Interpret the issue count of three WebSocket connection attempts as three fresh workbench connection workflows. The observed VS Code remote protocol opens exactly one Management channel and one ExtensionHost channel in each workflow, for six network WebSocket connections total. Evidence must classify the initial `connectionType` control request, require three of each role, require `reconnection=false`, and fail unknown roles, extra sockets, external socket origins, or internal-port socket URLs.

Validation of this boundary must drive every finite failure through an actual stable-route request or upgrade and its controlled dependency, rather than a local throw or static table comparison. Redaction proof must use enabled, marker-bounded access and application logs and send WebSocket and integrated-terminal sentinels as real, distinct frames.

On application close, reject new proxy work and settle or abort proxy-owned operations before shutting down the runtime manager and persistence owners. The proxy does not own, persist, or terminate runtime processes.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| `@fastify/http-proxy` with WebSocket support | Fastify-native registration and mature proxy defaults | Its plugin contract is optimized for configured upstreams and generic rewrites, not a per-request runtime target and the required commitment-aware failure matrix | Required policy would still need a custom lower-level owner |
| `http-proxy` | Supports HTTP and WebSocket in one mature package | Event-driven defaults hide header and socket ownership and still require substantial custom cookie, redirect, failure, and shutdown logic | A general proxy layer adds more implicit behavior than it removes |
| Fastify parsed bodies and normal replies | Smallest dependency surface | Buffers or serializes arbitrary bytes, cannot preserve streaming, and does not own upgrades | Rejected by the binary, streaming, and WebSocket acceptance matrices |
| Browser navigation directly to the runtime port | No proxy implementation | Exposes internal authority, breaks the stable namespace, and bypasses Ascend ownership | Violates FR-018, NFR-007, and the issue acceptance criteria |
| Require every VS Code-controlled browser request to be same-origin | Superficially simple inventory | Breaks the isolated Markdown webview origin required by the selected workbench | The stable-route guarantee applies to Ascend-owned transport, not trusted VS Code webview isolation |
| Allow any subdomain below the webview CDN suffix | Simple suffix check | Admits arbitrary prefixes, extra labels, credentials, ports, and authority-bearing URL data | The retained BL-003 and current BL-011 observations support the narrower VS Code encoded-authority grammar |
| Permit Open VSX during the designated proof | Preserves default marketplace behavior | Adds unnecessary external traffic and nondeterministic proof dependence | The functional scenario requires no marketplace access and code-server supports an empty gallery configuration |
| Treat one workflow as one network WebSocket | Matches the prior planned count | Hides the Management and ExtensionHost channels actually opened by VS Code | Evidence must name observed protocol roles instead of forcing an incorrect socket count |

## Consequences

### Positive
- One explicit owner can enforce target resolution, finite failures, redaction, and cleanup across HTTP and WebSocket.
- Node streams and `ws` preserve the raw-byte and frame-oriented boundaries needed by the finite matrices.
- BL-010 remains the only process-ownership boundary.
- Browser evidence distinguishes Ascend-owned transport from the narrowly allowlisted VS Code Markdown webview origin.
- The designated proof has no extension-marketplace network dependency and inventories all six named WebSocket channels.

### Negative
- The API must maintain raw Node HTTP and WebSocket lifecycle code and test it beyond the normal Fastify reply lifecycle.
- A direct `ws` dependency and its types become part of the API owned supply chain.
- Shutdown ordering becomes an explicit application invariant.
- Proof instrumentation must classify VS Code connection roles and webview requests without retaining payloads or secrets.

### Neutral
- Public networking, authentication, TLS, and multi-host operation remain out of scope.
- Project Home and header UI remain BL-012 work.
- The accepted full-page presentation remains unchanged.
- Amended 2026-08-15: [ADR-260815-api-restart-runtime-reconciliation](./ADR-260815-api-restart-runtime-reconciliation.md) makes acquisition await its own project's reconciliation settlement before it resolves a target, and makes it refuse rather than launch while that project is pending or unresolved. The proxy remains a pure consumer of the manager's exact running snapshot, still accepts no client target, and gains exactly one additional bounded public failure row for the new reconciliation category. Adopted runtimes are reached through their unchanged stable routes.
- Amended 2026-08-15 (revision 2 of the BL-019 plan): acquisition is also the primary on-demand liveness correction for an adopted runtime. Because an adopted process has no automatic death observation, the delivered liveness and readiness re-checks that acquisition already performs on a running entry are what turn a stale `Running` into the delivered failure instead of routing to a dead identity. The proxy itself is unchanged: it still accepts no client target, performs no attribution of its own, and adds exactly one bounded public failure row.

## Related Issues

- [#27](https://github.com/jsburckhardt/ascend/issues/27)

## References

- [TypeScript Monorepo and Host Workbench Stack](./ADR-260808-typescript-monorepo.md)
- [Select the Full-Page Browser Workbench Presentation](./ADR-260810-full-page-browser-workbench-presentation.md)
- [Runtime Lifecycle and Error Handling](../core-components/CORE-COMPONENT-260808-runtime-lifecycle-error-handling.md)
- [Retained BL-003 browser evidence](../../work-items/9-bl-003-select-a-viable-browser-workbench-presentation/implementation/evidence/browser-events/)
