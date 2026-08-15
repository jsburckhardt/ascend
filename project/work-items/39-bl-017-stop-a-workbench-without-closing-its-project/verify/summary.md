# Verify Report: BL-017 Stop a Workbench Without Closing Its Project

## Verified delivery
- **Issue:** [#39](https://github.com/jsburckhardt/ascend/issues/39) - BL-017: Stop a workbench without closing its project
- **Branch:** `feat/39-stop-workbench-without-closing-project`
- **Original implementation commit:** `3038ee91aa53db66ee16d37a7a887e1dd97f3787`
- **Documentation correction commit:** `5778360447c6bf416a07b173985ec4361bfdc6b1`
- **Exact branch SHA verified:** `5778360447c6bf416a07b173985ec4361bfdc6b1`
- **Merge base:** `ce3bb43695cacbb546e8fa2f8995cd854dafbd9e`
- **Pull request:** [#40](https://github.com/jsburckhardt/ascend/pull/40)

## Evidence integrity
- Action-plan SHA-256: `9ef68b5ae7f45a7d2e3bcebabf8168a5591ecd2f832f969593547c8b2f2bace0`
- Retained matrix SHA-256: `c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3`
- The retained and disposable matrices were byte-identical by `cmp`; no `test-results/bl-017` file is tracked.
- The full root `just verify` gate passed at the verified SHA, including the BL-017 acceptance gate, designated stop episode, and independent residual audit.

## Documentation correction verdict
**Passed.** `README.md` and `apps/api/src/routes/README.md` assign registration and fixture retention plus recorded ownership evidence to `just proof-runtime-stop`; they limit `just proof-runtime-stop-residual-audit` to rechecking exact root/member identities, owned process group, and loopback listener, and explicitly exclude registration and fixtures.
README/user usage, API reference, browser/accessibility, runtime/operations, routing, session switching, configuration, migration, architecture, and deployment documentation match the committed behavior and preserve the documented no-impact rationale where applicable.

## Scope and architecture verdict
**Passed.** The full branch diff remains within Issue #39 and follows the selected-stop and termination-sequencer ADRs, the public-state amendment, and the runtime lifecycle, structured logging, and filesystem-safety core-components. The correction affects only proof-responsibility documentation and its contract test; it changes no product behavior, architecture, retained evidence, or accepted plan.

## Acceptance decisions
| AC | Verdict | Concrete evidence |
|----|---------|-------------------|
| AC-1 | Passed | Selected-stop matrix rows require the audit triple; the designated episode observed one root identity, two member identities, one group, and one listener absent. |
| AC-2 | Passed | Sequencer/matrix rows cover graceful and escalated release, trusted deadline, unconfirmed failure, and no false `Stopped`. |
| AC-3 | Passed | Retention rows preserve one registration and all four persisted fields with post-stop `Stopped` projection. |
| AC-4 | Passed | One confirmed stop followed by three bounded `already-stopped` results changes no identity, restart, metadata, or fixture. |
| AC-5 | Passed | Two-ready-runtime evidence preserves peer identity/state/readiness, control process/listener, registrations, and fixture manifests. |
| AC-6 | Passed | The fixed 31-row matrix validates bounds, inventories, cleanup, mutation rejection, byte-stable evidence, and zero residuals. |

## GitHub and repository state
- Issue #39 remains open with six original acceptance checkboxes checked and both markers preserved.
- PR #40 was created without merge.
- The verified tree was clean before publication; this summary is the only verifier-authored repository change.

## Verification observations
- `harness observe` captured DL-020, DL-021, DL-022, DL-023, and DL-024 for verification-environment/tooling friction.
- The coordinator recorded that its host lifecycle call was unavailable; no lifecycle envelope was fabricated, and Verify invoked no lifecycle hook.
