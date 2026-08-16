# API restart runtime reconciliation

Ascend performs one required, bounded reconciliation pass when a replacement API process starts. It lists registered projects once and installs a private `reconciling` entry for each before routes are registered. Public state remains the four-value vocabulary `Stopped`, `Starting`, `Running`, and `Failed`; `reconciling` projects report `Starting`. Settlement is exactly `adopted`, `absent`, or `unresolved`. Adopted projects report `Running`, positively absent projects report `Stopped`, and unresolved projects retain `Failed/reconcile-unconfirmed`.

## Attribution and ownership

Ascend adopts only a workbench launched from this host's configured code-server installation. The observed command prefix must be the installation's bundled interpreter followed by its installation root, and the complete delivered argument vector, canonical project path, owner token, port, same non-root UID, process-group leadership, readiness, and stable identity must all agree. The declared loopback listener must be owned unambiguously by exactly one conforming leader or forked member of that workbench's exact process group. A foreign installation, outside-group listener, incomplete observation, ambiguity, or mismatch is unresolved; Ascend neither guesses nor signals it.

The group enumeration must complete and contain the workbench leader before any listener ownership is accepted. Readiness pacing uses the same trusted monotonic scheduling boundary as reconciliation deadlines; each gap is bounded by the remaining readiness window and is cancelled when observation is aborted.

Browser-visible surfaces, HTTP bodies, and lifecycle events expose only an opaque project token, the four public states, and bounded public categories; they never expose an internal refusal reason. Trusted in-process inspection and retained validation evidence, explicitly including the committed matrix and designated episode, may record bounded outcome, absence-proof, and refusal-reason enum names together with opaque tokens, counts, and elapsed measurements. Raw canonical paths, argument vectors, executable or installation paths, process identifiers or start times, ports or loopback authorities, socket inodes, environment values, credentials, terminal or source content, stacks, and raw errors appear in neither public surfaces nor committed evidence. Public acquisition exposes only the fixed 503 `workbench_reconcile_unconfirmed` failure, and Stop or Restart exposes only bounded route categories.

## Bounds and admission

The issue ceiling is 15,000 ms measured from the replacement API process start to the first settled runtime-state response: 3,000 ms startup headroom + 11,000 ms internal reconciliation + 1,000 ms response allowance. The internal budget is 2,000 ms discovery + 1,000 ms attribution + 7,000 ms readiness + 1,000 ms settlement. A zero-project startup control is 4,000 ms. Ordinary acquisition is 60,000 ms; acquisition across a pending reconciliation that proves absence is 71,000 ms. Stop remains 5,000 ms and ordinary Restart remains 66,000 ms.

| Operation | Pending reconciliation | Unresolved reconciliation |
|---|---|---|
| Open/acquire | waits for that project's settlement, then reuses an adopted runtime or launches only after proven absence | refuses before registration, port acquisition, or launch |
| Stop | 409 `runtime_reconcile_in_progress` | 409 `runtime_reconcile_unresolved` |
| Restart | 409 `runtime_reconcile_in_progress` | 409 `runtime_reconcile_unresolved` |
| shutdown | aborts observation without claiming absence or signalling an unadopted candidate | performs no recovery launch |

An unresolved project remains blocked for that API process. Resolve the host ambiguity outside Ascend, then restart the API so a fresh pass observes current evidence. There is no per-request retry loop.

## Adopted runtime liveness

This release adds no background monitor, poller, or watcher for adopted survivors. If an adopted workbench later dies, runtime reporting can remain `Running` until the next Open, Stop, or Restart observes it. Open corrects the entry to a retained failure; Stop or Restart uses the delivered exact-identity audit and sequencer. PID/start-time reuse is revalidated before any signal, so a recycled identity is never signalled. This on-demand behavior is intentional; automatic monitoring and recovery remain BL-021 and BL-022 work.

## Runtime data, evidence, and cleanup

Each launched workbench writes stderr directly to a mode-0600 `runtime-stderr.log` inside its ephemeral runtime-data directory. The child owns the file descriptor, so API death does not close its diagnostic sink. The directory is removed when the exact runtime is released. Recovery requires the same OS user, the same `TMPDIR`, and the same configured code-server installation; there is no persisted runtime handle, schema field, payload field, feature flag, or environment option.

The deterministic 66-row matrix is committed under the BL-019 work item. A row uses `residualCount: 0` only for a completed positive absence proof; adoption, uncertainty, and unsettled work use `null`. Matrix rows create no host resources and carry no teardown field. The designated live episode first records survivors with `teardown: null`, then tears down exact validation-owned identities, independently re-probes API processes, workbench processes, attributable descendants, listeners, active requests, and disposable fixtures, and atomically finalizes one of `proven-clear`, `unproven`, or `residual-present`. The out-of-process audit recomputes all six classes and does not trust assigned zeros.

Every matrix row is produced by executing createProjectRuntimeManager, beginReconciliation, the declared acquisition or lifecycle admission, the real route handler when applicable, and reportPublicStates. Its seven-member execution witness records manager instances, the injected primitive-call ledger, project-keyed readiness probes, public projections, event-sink writes, and observed sources; expected output vocabulary is not stored in the fixture generator.

Every claimed API generation in the live proof is the repository's compiled apps/api/dist/server.js, with OS-observed process identity and argv, listener ownership, real loopback HTTP responses, and a disposable SQLite database record. Marker-bearing foreign-launcher controls run as sole candidates in a separate control subepisode and are independently cleared before the survivor proof. This isolation is required because placing an impersonating marker beside a genuine survivor would create two candidates and prove only ambiguity. The only coexisting control carries neither project marker and witnesses the outside-process-group listener ceiling without affecting candidacy.

Run:

```text
just verify-runtime-reconcile
just proof-runtime-reconcile
just proof-runtime-reconcile-residual-audit
```

BL-020 running/failed Close, BL-021 automatic lifecycle policy, and BL-022 durable or distributed runtime recovery are not implemented here. Deployment topology is unchanged.
