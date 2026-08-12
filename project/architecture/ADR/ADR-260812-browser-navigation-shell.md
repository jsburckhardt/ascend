# ADR-260812-browser-navigation-shell: Separate Browser Navigation Shell from Workbench Transport

## Status

Accepted

## Context

Project Home is served by the React application while BL-011 assigns stable workbench HTTP and WebSocket transport to the Fastify API. Issue #29 must connect both surfaces on one browser origin, retain native history and refresh semantics, show the accepted full-page workbench with an Ascend Projects header, and render accessible errors at the unchanged stable URL.

Directly converting BL-011 proxy failures to HTML would contradict its exact JSON precommit failure contract and couple descendant transport to product navigation. An iframe would contradict the accepted full-page presentation. The repository also has no client router or existing History API owner.

## Decision

Use one same-origin browser front door for Project Home and stable workbench URLs. In development, Vite forwards `/projects/` HTTP and WebSocket traffic to Fastify in addition to `/api`; deployed routing must preserve the same public path ownership.

Treat an unmarked top-level request for the stable workbench base as an Ascend-owned browser navigation shell, separate from BL-011 upstream transport. The shell validates the route before lookup and acquires the upstream workbench document through the same stable URL using a server-recognized internal document marker that cannot select a project, path, authority, port, or target. The browser URL does not change. Marked document acquisition, descendant HTTP requests, and WebSocket upgrades retain the BL-011 proxy, failure, redaction, timeout, and cleanup contracts.

Authenticate development or deployment front-door authority metadata with one private ASCEND_FRONT_DOOR_TOKEN aligned between the proxy and API. Local unset configuration uses the shared development-only default; explicit values are bounded and invalid values fail startup. Once either trusted header appears, require the complete matching token/authority pair and refuse malformed, partial, or mismatched metadata before runtime resolution. Direct loopback API requests omit both headers. Redact the token and trusted headers from every public surface.

Use full-document browser navigation for Home Open and Projects so the browser owns normal history entries, refresh replacement, Back, and Forward. The shell owns one monotonic entry or Retry generation, aborts obsolete acquisition, ignores stale settlement, and converts safe transport failures or its bounded document timeout into an accessible Ascend error document at the unchanged URL. Retry replaces the current failed entry and starts exactly one newer shell generation; Projects navigates to `/` without a runtime lifecycle operation.

Inject the minimal keyboard-operable Ascend Projects header into only the acquired top-level full-page workbench document. Do not embed code-server and do not add runtime identity or lifecycle controls.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Convert every proxy failure to HTML | Small response change | Breaks the exact BL-011 JSON transport contract and descendant clients | Navigation presentation must remain separate from transport failures |
| Embed code-server in a React shell | Straightforward persistent product chrome | Reintroduces the presentation rejected by BL-003 | The accepted presentation is top-level full-page code-server |
| Navigate directly to the API origin | No Vite route forwarding | Splits browser history across origins and exposes a second user-facing authority | Home and workbench require one stable browser origin |
| Add a general client router and render the workbench in the SPA | Familiar route abstraction | Adds an unused dependency and still cannot safely host full-page code-server | Native document navigation supplies the required bounded history behavior |

## Consequences

### Positive
- Project Home, workbench, refresh, direct navigation, and recovery share one public origin and stable URL.
- BL-011 transport and exact JSON failures remain independently testable behind the navigation shell.
- Native browser history supplies the required three-entry workflow without a parallel routing framework.
- Stale document acquisition and recovery focus have one explicit generation owner.

### Negative
- The API and web development server must coordinate top-level shell, internal document acquisition, and same-origin forwarding.
- Top-level workbench HTML requires narrowly scoped header decoration that remains compatible with code-server security policy.
- Browser tests must distinguish shell navigation from marked transport and descendant traffic.

### Neutral
- BL-010 remains the sole runtime process owner and runtime identity remains memory-only.
- Multi-project coordination, lifecycle controls, authentication, TLS, and public networking remain deferred.

## Related Issues

- [#29](https://github.com/jsburckhardt/ascend/issues/29)

## References

- [Full-page workbench presentation](./ADR-260810-full-page-browser-workbench-presentation.md)
- [In-process stable workbench reverse proxy](./ADR-260812-in-process-workbench-reverse-proxy.md)
- [Stable workbench proxy boundary](../core-components/CORE-COMPONENT-260812-stable-workbench-proxy.md)
