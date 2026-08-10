# ADR-260810-full-page-browser-workbench-presentation: Select the full-page Browser Workbench Presentation

## Status

Accepted

## Context

BL-003 compared exactly two proof-only presentations on the authoritative Ubuntu 24.04 desktop Chromium host: code-server embedded in a minimal Ascend surface and top-level full-page code-server with a minimal Ascend header. Both candidates ran the same three fresh no-retry attempts, 1440 by 900 viewport, BL-001 fixture, code-server 4.131.0 configuration, browser observers, fixed Explorer/Preview/keyboard/clipboard scenario, BL-002 terminal parity, integrity checks, and exact cleanup.

The retained comparison is b1000003-0000-4000-8000-000000000009 at ../../work-items/9-bl-003-select-a-viable-browser-workbench-presentation/implementation/evidence/comparison.json. Embedded eligibility was true and full-page eligibility was true. Embedded retained 3 blocking and 30 non-blocking occurrences with median 12737 ms. Full-page retained 0 blocking and 36 non-blocking occurrences with median 13347 ms.

## Decision

Use full-page code-server with a minimal Ascend header as the browser workbench presentation for authoritative desktop Chromium workflows. The ordered selector chose it at the first strict tie-breaker: fewer blocking browser protocol violations (0 versus 3). Reject embedded for this decision.

This decision selects presentation only. Project Home, stable routing or proxy integration, runtime management, lifecycle UI, polished UI, and tablet acceptance remain outside BL-003. Tablet validation is a separate non-authoritative follow-up.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Embedded code-server in an Ascend surface | Keeps Ascend chrome continuously visible | Requires frame-policy handling | Rejected by retained evidence |
| Full-page code-server with a minimal Ascend header | Preserves top-level workbench behavior | Requires later product navigation and lifecycle integration | Selected by retained evidence |

## Consequences

### Positive
- Desktop presentation work can proceed from retained browser and parity evidence.
- code-server remains responsible for Explorer, Preview, terminal, and editing behavior.

### Negative
- Later work must design product routing, navigation, and lifecycle integration without changing this proof result.
- The selected candidate retained 36 non-blocking warning occurrences that remain visible evidence.

### Neutral
- Tablet behavior remains separate and non-authoritative.

## Related Issues

- [#9](https://github.com/jsburckhardt/ascend/issues/9)

## References

- [Retained BL-003 comparison](../../work-items/9-bl-003-select-a-viable-browser-workbench-presentation/implementation/evidence/comparison.json)
- [Workbench proof runbook](../../../docs/workbench-proof.md)
