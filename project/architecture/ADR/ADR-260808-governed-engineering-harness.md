# ADR-260808-governed-engineering-harness: Governed Repository-Local Engineering Harness

## Status

Accepted

## Context

Ascend already owns project setup, operation, and verification through root justfile recipes, but RPIV agents also need one discoverable repository-local surface for readiness, machine-readable results, evidence, lifecycle observations, and continuous improvement. A second build or verification system would duplicate the command interface, while a live-service boot would introduce process ownership and cleanup behavior that the current scaffold does not yet implement. The adoption assessment must also remain an immutable statement of the pre-adoption repository rather than being rewritten as current capability changes.

## Decision

Adopt the tracked .harness/ tree as Ascend’s governed engineering-harness root. The harness wraps rather than replaces repository-owned commands: harness checks delegates to just verify, and harness boot composes checks into a non-persistent, test-backed readiness verdict until live-service lifecycle support exists.

Keep current governance, extensions, generated flow views, retrospectives, change records, and installation metadata in .harness/. Keep repository-local skill sources and their integrity lock under .agents/skills/ and skills-lock.json. Preserve the adoption-time harnessability report as an immutable baseline and describe current capability separately in governance and improvement records.

RPIV consumes the repository-local eng-harness-flow skill at delivery seams while retaining Research → Plan → Implement → Verify as the authoritative stage order.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Use only the root justfile | No additional tool surface | No standard envelopes, lifecycle observations, maturity record, or harness discovery | The justfile remains command ownership, but a governed adapter is needed for agent-facing evidence and lifecycle integration |
| Replace root recipes with harness-owned command bodies | One apparent interface | Duplicates or displaces the accepted project command contract | Harness commands must delegate to the root justfile instead of becoming another build system |
| Start persistent API and web services during boot | Proves bound-port readiness | Requires lifecycle ownership, cleanup, and live-service probes not yet implemented | Test-backed readiness is deterministic and honest for the current scaffold |
| Rewrite the baseline as capabilities improve | Keeps one current report | Erases adoption provenance and makes progress impossible to audit | Baseline evidence remains immutable while governance and change records represent current state |

## Consequences

### Positive
- Agents receive discoverable checks, readiness, observation, and evidence surfaces without duplicating project commands.
- Boot remains bounded and leaves no persistent development process.
- Adoption provenance and current capability cannot be confused.
- Harness improvements and RPIV lifecycle integration remain inspectable in the repository.

### Negative
- Contributors must maintain harness envelopes, generated views, locks, and governance alongside root recipes.
- Test-backed boot does not prove live bound-port API or web readiness.
- Repository-local skill and harness artifacts add a sizeable governed asset tree.

### Neutral
- Database lifecycle, CI equivalence, executable architecture checks, and live-service readiness remain explicit future gaps.
- The root justfile remains the canonical project command interface.

## Related Issues

- [#3](https://github.com/jsburckhardt/ascend/issues/3)

## References

- [Engineering harness governance](../../../.harness/engineering-harness.md)
- [Project Command Interface](../core-components/CORE-COMPONENT-260806-project-command-interface.md)
- [RPIV Stage Contract](../core-components/CORE-COMPONENT-260806-rpiv-stage-contract.md)
