# BL-020 implementation record

## Stage boundary

- Issue: GitHub Issue 45, BL-020: Close a running or failed project.
- Scope type: issue.
- Branch: feat/45-close-a-running-or-failed-project.
- Implement started from base 2f51f768c2fa8b80b2d8cb0347ee22196e9f9e13 and recovered the preserved partial working tree for T-1 through T-15 rather than restarting it.
- Plan revision 8 is authoritative. No plan design content was changed by Implement; the only Plan edit is the sixteen task statuses in `plan/02-task-breakdown.md`.
- This record is Implement-stage evidence only. Verify retains final acceptance, GitHub issue criteria updates, push, and pull-request ownership. The implementation commit SHA is reported in the Implement handoff rather than restated here, so this file carries no self-referential hash.

## Authoritative inputs

| Artifact | SHA-256 at handoff |
|---|---|
| research/00-research.md | 703d67330e7ab854f2fe6925f0b7de0672186a7ff34e9ffc432662b7797c7de2 |
| plan/01-action-plan.md | 0facad850ff7c5b7835674cd6b11a0ce6ec8f9f1b057f652e113a06ccbce2cb1 |
| plan/03-test-plan.md | b5baa6585438c40875c700bff8cb9f3b78cc319a87911ad13b7725fef37bd722 |
| plan/02-task-breakdown.md | 5c300c81c616ef4a522ee466703660e508863f262a1e0ce82b01055208bb7bba |
| ADR-260816-selected-project-close-control.md | 0be6c9c7edb55d3dc2487d9d9a76a2f26dcb2bf70936f9c613b585306c5a08d7 |
| CORE-COMPONENT-260816-managed-resource-release-ordering.md | 6f74e96966d7e66b672c7b395b5d5e9f78de12df011d5c08dcd8fdff4ca64c70 |
| DECISION-LOG.md | a9608bbe24c911f08c050838d31a475f8b1d6088f34b156e309c36a2c7e15eb1 |

The action plan, test plan, and research brief are byte-identical to the accepted revision-8 artifacts. `plan/02-task-breakdown.md` changed only its sixteen `Not Started` statuses to `Completed`, each after its own evidence existed.

## Architecture contracts implemented

Created:

- `ADR-260816-selected-project-close-control` - the manager-owned close authority, the exclusive claim, the nine-step admission order, the seven phases, the eight-clause re-observed confirmation, the cardinality freeze and cap, retirement, and the persistence, filesystem, and event boundaries.
- `CORE-COMPONENT-260816-managed-resource-release-ordering` - release-before-removal ordering, exclusivity, contender joining, cardinality, bounds, retirement, refused-acquisition versus late-work classification, the single volatile-state write authority, and the confirmation-to-removal seal.

Amended in place (six ADRs, six core components):

- `ADR-260812-in-process-workbench-reverse-proxy`, `ADR-260815-api-restart-runtime-reconciliation`, `ADR-260815-explicit-workbench-restart-control`, `ADR-260815-per-project-lifecycle-activation`, `ADR-260815-public-runtime-state-projection`, `ADR-260815-selected-runtime-stop-control`.
- `CORE-COMPONENT-260806-project-command-interface`, `CORE-COMPONENT-260808-filesystem-path-safety`, `CORE-COMPONENT-260808-runtime-lifecycle-error-handling`, `CORE-COMPONENT-260808-structured-runtime-logging`, `CORE-COMPONENT-260810-sqlite-persistence-lifecycle`, `CORE-COMPONENT-260812-stable-workbench-proxy`, `CORE-COMPONENT-260815-host-runtime-attribution-evidence`.

`DECISION-LOG.md` carries 421 decision records. Records 302 through 421 are this work item's, including the revision-7 range 402 through 414 and the revision-8 range 415 through 421. Records 1 through 301 are byte-unchanged. Every created and amended artifact is the source of at least one record, asserted mechanically by `V-1`.

No implementation decision was taken outside these artifacts, and no ADR or core-component contract was changed by Implement.

## Implementation by task

- **T-1** Runtime contract: close outcome and rejection vocabularies, the two failure categories, the three internal allowances (`closeDrainAllowanceMs`, `closeSettlementAllowanceMs`, `closeOwnershipSweepCap`), and the cardinality-aware bound functions.
- **T-2** Proxy per-project drain: `closeProject(projectId, signal)` bounded only by its caller, with the two published `WORKBENCH_FAILURE_TABLE` rows and handle-and-listener release on the single settlement path.
- **T-3** Manager close operation: exclusive claim, post-`await` claim rechecks, the nine-step admission order, the cardinality freeze and cap, the seven phases, the eight-clause re-observed confirmation, settlement, retirement, and every refusal.
- **T-4** Close service recomposition and application wiring: `createProjectCloseService` now composes library removal, manager release, and proxy drain and audit.
- **T-5** Route vocabulary: eleven published categories with their statuses, unchanged success body, and `project.closed` emitted exactly once for a completed close.
- **T-6** Web client mirrors of the close and runtime vocabularies and the raised 45,000 ms client bound.
- **T-7** Project Home per-project close lane with an exclusive pre-transmission dialog and a close settlement version.
- **T-8** Disabled-exactly-when-refused rendering and the settled-close runtime refresh.
- **T-9** Every typed manager, proxy, and close-service double migrated to the new members.
- **T-10** Evidence contract, catalog, 28 source guards, 18 mutation classes, and the validator.
- **T-11** The 75-scenario deterministic matrix executed and committed.
- **T-12** The seven designated real-host episodes executed against the compiled entry point.
- **T-13** The independent nine-class residual audit CLI and its artifact.
- **T-14** Filesystem non-mutation and peer-isolation proof extended to every close outcome, with `G-15`, `G-23`, and the eight negative controls.
- **T-15** All thirteen documentation categories maintained; every stale running-or-failed close deferral claim removed.
- **T-16** The three new `justfile` recipes, the extended acceptance gate, canonical `verify` wiring, prior-evidence digest preservation, and the canonical run.

### T-16 detail

`justfile` gains exactly three recipes and extends one:

- `verify-runtime-close` - the complete focused deterministic BL-020 suite set (contract, manager, service, route, evidence, matrix core, lifecycle, edge and web, mutations, matrix, non-mutation, residual audit, designated contract, documentation, and the four web suites), then the real-Chromium `tests/e2e/project-close.spec.ts` proof, then its own fixture and browser scaffolding prune. It requires no network access and no manual state.
- `proof-runtime-close` - two lines in the delivered `proof-runtime-reconcile` shape: `pnpm --filter @ascend/api build:ts`, then the `BL020_DESIGNATED=1` designated suite. It runs from a tree with no `apps/api/dist` and proves the rebuilt `apps/api/dist/server.js` rather than a stale binary.
- `proof-runtime-close-residual-audit` - the separate `tsx` CLI, executed after the designated proof, against the committed episode artifact and its observation sidecar.
- `verify-close-project` keeps its delivered name and gains the BL-020 manager, evidence, matrix, non-mutation, documentation, and web component suites.

Canonical `verify` calls the three new recipes in that order, immediately after `just proof-runtime-reconcile-residual-audit` and before `just verify-mvp-performance`. `verify-focused *args` and `verify` keep their delivered names and signatures. A mechanical scan over all 52 recipe names finds no word-order permutation of any other name, asserted by the command-interface contract tests in `apps/api/test/project-close-documentation.test.ts`.

## Acceptance evidence

| AC | Concrete implementation evidence |
|---|---|
| AC-1 | Matrix rows `S-1` - `S-8` and `S-71` carry the declared bound from each row's own cardinality pair, elapsed from `claimInstalledAt` with `elapsedOrigin: 'claim'`, all eight confirmation clauses true, the audit triple confirmed, five-count proxy audit zero re-observed at confirmation, registration absent afterwards, and thirteen residual classes zero. Designated episode `E-1` proves the same against the compiled host. |
| AC-2 | Rows `S-9` - `S-15`: positive-absence and confirmed-release successes; `release-unconfirmed` rows retain the registration, project `Failed` classified `close-release-unconfirmed`, and retain ownership. Designated episode `E-2` returns `500` with the registration still present. |
| AC-3 | Rows `S-16` - `S-19` and `S-75` plus the eleven-row terminal-case table: four durable fields byte-identical on every non-success, public state inside the four-value vocabulary, and `M-3` - `M-7`, `M-16`, `M-17` rejecting each inverse. `S-75` carries the complete over-cap witness (`frozen: 5`, `cap: 4`, `capExceeded: true`). |
| AC-4 | Rows `S-20` - `S-24`: zero `signal` and zero `terminate` calls, one `200` and seven `404` under eight concurrent deletes, the delivered already-absent outcome preserved. The delivered BL-009 suites remain green inside `verify-close-project`. |
| AC-5 | Rows `S-25` - `S-27`: a pre-close WebSocket frame exchange fails after close, the HTTP stream terminates, and a fresh stable-route navigation renders the route error with no `start` call. The browser proof and the redaction scan (zero matches) cover the public-surface half. |
| AC-6 | Rows `S-28` - `S-31` with non-empty before and after manifests identical in membership, content digests, non-dereferenced link-target digests, modes, and mtimes for selected and peer fixtures; guard `G-15` and mutation class `M-13` reject the inverse. |
| AC-7 | Rows `S-32` - `S-37`, `S-64`, `S-72`, `S-73` and the four-test Chromium proof: exclusive pre-transmission dialog dismissed at transmission, keyboard operation with contained focus and safe cancel, peer controls usable during a peer's pending close, duplicate activation excluded at both layers, disabled-exactly-when-refused for every card, five announcement classes, and five focus-recovery targets. |
| AC-8 | Rows `S-38` - `S-40`: six-surface agreement per settled outcome with exact emitted-event sets; guards `G-12`, `G-13`, `G-14` and mutation classes `M-8`, `M-9`, `M-14`. |
| AC-9 | Row `S-41`: eight concurrent requests, one `closed`, seven `already-absent`, exactly one `terminate`, exactly one `commitRemoval`, one `project.closed`, all inside `B-5`, fixtures unchanged. |
| AC-10 | Rows `S-42`, `S-43`, `S-69`, `S-70`: the two-arrival choreography with `drainInvocations`/`connectionAuditInvocations` witness pairs, the refused `running-reuse-await` acquisition classified `runtime-closing`, and the fail-closed re-drain; `M-15` and `M-18` reject the inverses. |
| AC-11 | Rows `S-44`, `S-45`: exactly one effective release of the exact generation in each ordering, agreeing settled outcomes, zero selected-generation residual, peer unchanged. |
| AC-12 | Rows `S-46`, `S-47`: no replacement generation, pending admission, quarantined identity, stale route target, or restart settlement after a successful close; the refused ordering keeps the registration with the condition observable. |
| AC-13 | Row `S-48` and designated episode `E-3`: a runtime adopted after a real API-process restart closes with the same exact release, removal, stable-route, peer-isolation, and bound outcomes. |
| AC-14 | Rows `S-49` - `S-52`: `reconcile-in-progress` and `reconcile-unresolved` with zero signals, zero terminations, zero adoption attempts, and the registration retained; later closes settle on the applicable path. |
| AC-15 | Rows `S-53` - `S-55`: every late settlement accounted in `lateCloseSettlements` and in `claim.lateWork` while claimed, installing nothing, emitting nothing, mutating nothing. |
| AC-16 | Rows `S-56` - `S-58`, `S-74` and designated episodes `E-4`, `E-5`, `E-6`: pre-confirmation interruption leaves a registration the next boot settles truthfully; post-removal interruption leaves an absent registration with a positively excluded candidate; `E-6` interrupts during release with a surviving attributable candidate and proves no false deletion, exact signal attribution, and a truthful replacement-boot reconciliation result. |
| AC-17 | Every row's peer and control block plus the designated peer records: peer identity, readiness, route, connections, four registration fields, and manifest digests unchanged, and the declared unrelated control process and listener unchanged; `M-12` rejects the inverse. |
| AC-18 | Rows `S-13` - `S-15`, `S-17`: no success on any release or removal failure; the `removal-failed` row keeps one registration, reports `Stopped`, performs zero signals after the failure, and documents the safe recovery; `preClaimSettlement`/`claimInstalledAt` pairing separated by `M-17`. |
| AC-19 | Rows `S-65`, `S-66` and the browser proof: an unclassifiable response stays indeterminate, the card is preserved, no automatic repeat is issued, and both authoritative observations are re-issued and cover both resolutions. |
| AC-20 | Rows `S-67`, `S-68` and designated episode `E-7`: one success then three repeats yield exactly one `200` and three `404 project_not_found`, zero runtime creations, zero post-success signals, exactly one `project.closed`, and the project still absent after a real API restart. |
| AC-21 | `just verify-runtime-close` executes the committed 75-row matrix with per-row pass or fail against bounds declared before the first action; the artifact publishes `scenarioCount: 75`, `guardCount: 28`, `mutationCount: 18`, `boundCount: 20`, `preClaimSettlementCount: 8`, and `generatedFrom: execution`. |
| AC-22 | The committed matrix and episode carry opaque tokens and bounded classifications only, with zero-or-null residual discipline; `just proof-runtime-close-residual-audit` reports nine classes zero from a separate process after capture. |
| AC-23 | Thirteen dispositioned documentation categories, asserted token by token across `README.md`, `docs/README.md`, `docs/project-runtime.md`, `docs/stable-workbench-routing.md`, `docs/api-restart-reconciliation.md`, `apps/api/README.md`, `apps/api/src/routes/README.md`, `apps/web/README.md`, and the `justfile` by `apps/api/test/project-close-documentation.test.ts`. |
| AC-24 | Canonical `just verify` completed successfully end to end in 15m57s with every BL-006 - BL-019 gate green, and the prior-evidence digest report shows exactly one regeneration, the declared BL-011 matrix. |
| AC-25 | Every BL-020 recipe uses repository-local commands, disposable local fixtures, the configured local `code-server`, real Chromium, loopback networking, and supported Linux host facilities only. No recipe requires network access, a credential, a hosted service, unsupported hardware, a destructive environment action, indefinite observation, or manual judgment. |

## Validation results

| Command | Result |
|---|---|
| `just verify-runtime-close` | Pass. 20 vitest files, 402 tests, plus the four-test Chromium `project-close.spec.ts` proof. 1m15s. |
| `just proof-runtime-close` (standalone, `apps/api/dist` removed first) | Pass. Rebuilt the compiled entry point and proved it; 13 generations all `compiled-entry-point` on `apps/api/dist/server.js`. 1m36s. |
| `just proof-runtime-close-residual-audit` (immediately after the proof) | Pass. `status: ok`, `clear: true`, nine classes zero, `finalizedAtomically: true`. |
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | Pass. Lint reports only pre-existing warnings; no new warning was introduced. |
| `just verify` (canonical, fresh run from the repository root) | Pass, exit 0, 15m57s. `pnpm test` reported 937 passed and 9 skipped for `@ascend/api` and 357 passed for `@ascend/web`; every delivered BL-006 - BL-019 gate and both MVP performance gates were green. |

A rebuild-freshness probe confirmed `proof-runtime-close` proves the current binary: an emitted source change produced a different `apps/api/dist/app.js` digest inside the episode record, and the probe was reverted and the tree rebuilt afterwards.

## Retained evidence artifacts

| Path | SHA-256 | Bytes |
|---|---|---|
| `project/work-items/45-bl-020-close-a-running-or-failed-project/implementation/evidence/close-matrix.json` | a6727d13de9366eea493f01ff49799cc872276e2acdcad7f4b96496b0dbe3532 | 521344 |
| `project/work-items/45-bl-020-close-a-running-or-failed-project/implementation/evidence/designated-episode.json` | 5c47b47f9579e634187e07b3fe6dc88a2d1a782b53bfde2553a10c7becc4e537 | 127785 |
| `project/work-items/45-bl-020-close-a-running-or-failed-project/implementation/evidence/residual-audit.json` | 312c70d1a808dd46e16915e2b151fa24053bcaf2bfe4dc49b0d4564f195cf96f | 1485 |

Each retained artifact is byte-identical to its disposable counterpart under `test-results/bl-020/`, verified by direct comparison after the canonical run. All three were finalized by staged write then rename with zero staged leftovers. All three are execution-produced: the matrix reports `generatedFrom: execution` with 75 rows (55 closed, 3 already-absent, 17 rejected, 65 zero-residual, 57 confirmed) and 18 mutation classes with zero survivors, and the episode reports seven episodes, thirteen generations, `allPassed: true`, and `redaction.matches: []` over 206 considered host values.

## Disposable artifacts and T-14 disposition

`test-results/bl-020/` is git-ignored and holds only disposable output: `close-matrix.json`, `designated-episode.json`, `residual-audit.json` (the byte-identical disposable copies), `designated-observations.json` (5367 bytes, the audit's identity sidecar), `browser-episode.json` (592 bytes), `close-component-matrix.json` (85855 bytes), and T-14's `close-non-mutation.json` (77438 bytes, SHA-256 d3e1f48c003e88b8...). T-14's artifact is deliberately disposable: the plan retains the matrix, the designated episode, and the residual audit only, and the non-mutation manifests are reproduced by `just verify-runtime-close` on demand. The `fixtures/` and `browser/` scaffolding roots are removed by the acceptance gate's own prune lines and were absent after the canonical run.

## Residual audit

`just proof-runtime-close-residual-audit` re-observed all nine declared classes from a separate CLI process after capture - `apiProcesses`, `workbenchProcesses`, `attributableDescendants`, `listeners`, `proxyConnections`, `timers`, `inFlightCloseOperations`, `databaseSidecars`, `disposableFixtures` - and reported `probeCompleted: true` with `residual: 0` for every one, `clear: true`, and no violations, against episode digest 5c47b47f9579e634187e07b3fe6dc88a2d1a782b53bfde2553a10c7becc4e537.

## Documentation

All thirteen categories were dispositioned and are current at handoff.

| Category | Surface | Disposition at handoff |
|---|---|---|
| README / overview | `README.md`, `docs/README.md` | Running and failed eligibility, bounded outcomes, the eleven route categories, non-destructive confirmation, registration and filesystem safety, evidence paths, cleanup, and canonical commands recorded. |
| API reference | `apps/api/README.md`, `apps/api/src/routes/README.md` | `DELETE /api/projects/{id}` with all eleven categories and statuses, the unchanged success body, `project.closed` cardinality, and the two new `409` categories on the stop and restart routes. |
| Configuration | `docs/project-runtime.md` | `closeDrainAllowanceMs`, `closeSettlementAllowanceMs`, and `closeOwnershipSweepCap` documented as internal validated settings with fixed defaults, explicitly not environment variables or deployment settings. |
| Usage / UI | `apps/web/README.md` | The exclusive pre-transmission Close dialog, keyboard operation, the per-project close lane, peer availability, the five announcement classes, duplicate-activation prevention, the five focus-recovery targets, the 45,000 ms client bound, unknown-outcome recovery, and the observable list-alignment behaviour. |
| Migration | `README.md`, `apps/api/README.md` | Explicit no-impact rationale recorded: the persisted record keeps the same four fields, no schema change, no migration, and no new persisted value, so there is nothing to migrate. |
| Architecture | `docs/project-runtime.md` | The close authority, the exclusive claim and its re-evaluation after every await, the nine-step admission order, the cardinality freeze and cap, the seven phases, the eight-clause confirmation, retirement, and the bound arithmetic. |
| Operational / recovery | `docs/project-runtime.md`, `docs/api-restart-reconciliation.md` | The documented safe recovery for `release-unconfirmed`, `removal-failed`, and `ownership-cardinality-exceeded`, the interruption guarantee, and the unchanged one-shot reconciliation boundary. |
| Routing | `docs/stable-workbench-routing.md` | The per-project drain, its two termination conditions, its caller-owned bound with no authority over time, its non-authoritative re-observation, the two published `503` rows, and post-close stable-route behaviour. |
| Privacy / evidence | `README.md`, `docs/README.md`, `apps/api/README.md` | Opaque tokens and bounded classifications in retained and committed evidence, protected raw values excluded everywhere, and the residual-audit responsibility. |
| Validation | `README.md`, `docs/README.md`, `justfile` | `just verify-close-project`, `just verify-runtime-close`, `just proof-runtime-close`, `just proof-runtime-close-residual-audit`, targeted `just verify-focused`, and `just verify`. |
| Deployment topology | `docs/api-restart-reconciliation.md`, `docs/mvp-performance.md` | Explicit no-impact rationale recorded: one local host, one API process, loopback-only runtimes; close introduces no new process, port, service, or host requirement. |
| Session switching | `docs/session-switching.md` | Explicit no-impact rationale recorded: close removes a project rather than switching among retained ones, so no continuity claim changes. |
| Workbench proof | `docs/workbench-proof.md` | The designated close episodes, their artifacts, and the residual audit's connection predicate. |

No surface retains a claim that running or failed close is deferred; the remaining BL-021 and BL-022 deferral references are untouched because those scopes are genuinely undelivered. The stale-claim detectors in `apps/api/test/runtime-stop-documentation.test.ts` remain non-matching.

## Cleanup, prerequisites, and redaction

Every BL-020 recipe removes exactly the resources it created and nothing it merely used: isolated databases with their `-wal`, `-shm`, and `-journal` sidecars, disposable fixture trees, launched runtimes and their user-data directories, control processes, and control listeners. The shared `apps/api/dist` build output is never removed by a BL-020 recipe and was present after the canonical run. `/tmp/ascend-runtime-data` held zero directories after the canonical run. Prerequisites are the repository's own toolchain, the configured local `code-server`, a real Chromium for the browser proofs, loopback networking, and a supported Linux host - the same prerequisites the delivered `proof-runtime-reconcile` and e2e recipes already require. Redaction scans across the committed matrix, the designated episode, the residual audit, and the documentation surfaces report zero protected-value matches.

## Prior evidence preservation

| Artifact | SHA-256 at base | SHA-256 at handoff |
|---|---|---|
| BL-017 `runtime-stop-matrix.json` | c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3 | c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3 |
| BL-018 `runtime-restart-matrix.json` | fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880 | fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880 |
| BL-019 `runtime-reconcile-matrix.json` | 5df04aa72e5d4306685255511747838f96e0b9da9c319dd7668cb769282eea4b | 5df04aa72e5d4306685255511747838f96e0b9da9c319dd7668cb769282eea4b |

The single declared regeneration occurred exactly as planned: the BL-011 workbench failure matrix at the git-ignored `test-results/bl-011/workbench-route-evidence.json` moved from the declared base `tableHash` 2273128ddfb69c81bbea8b8a09e55706291f433d8d776f09623d13567f633b15 to 2523a9a1a28c7db2cc2e68b0105d00534c16b5bdc3a5fe0dbc867226607e445c, because `WORKBENCH_FAILURE_TABLE` gained the two published drain rows. No other prior-lane artifact changed.

## Defects found and corrected during T-16

Three real defects were exposed by running the canonical gate rather than the focused suites alone, and all three were corrected inside Plan boundaries:

1. **Residual audit counted quiescent kernel TIME_WAIT tuples as live proxy connections.** Immediately after the designated proof, `/proc/net/tcp` held ~130 TIME_WAIT rows that decayed to zero within about 70 seconds, so `proof-runtime-close-residual-audit` failed with `residual-audit-nonzero:proxyConnections` whenever it ran directly after the proof - which is exactly how canonical `verify` runs it. `countConnections` now excludes only `LISTEN` and `TIME_WAIT`; a TIME_WAIT tuple is reached only after both endpoints completed the FIN exchange, so excluding it cannot mask a live or half-closed connection. A non-masking control test asserts a live ESTABLISHED connection still fails the audit while a quiesced tuple does not.
2. **The real-host e2e library double never forwarded `findById`.** BL-020 routes close through the manager, which resolves the persisted project first, so every close in `tests/e2e/project-home.spec.ts` returned `500 project_close_failed`. The double in `tests/e2e/project-home-api-launcher.ts` now delegates `findById`. The gap escaped static checking because `tests/e2e` is outside every package `tsconfig` include, so the structurally incomplete double type-checked clean.
3. **The designated proof orphaned eight workbench user-data directories per run.** Its frozen teardown order stops API generations before it terminates workbench groups, so the product's own exit-time directory removal could never run, and `/tmp/ascend-runtime-data` grew by eight directories per execution - which would deterministically fail the BL-013 global residual audit on any later canonical run. `terminateWorkbench` and `terminateAttributable` now remove the user-data directory each identity they kill owned, guarded to the product's own runtime-data root and derived from the product helper, and the designated suite asserts zero runtime-data residue created after its own watermark. The frozen four-action teardown vocabulary and the episode contract are unchanged.

## Known limitations

- Lifecycle hooks (`pre-flight`, `pre-coding`, `post-coding`, `post-flight`) are the coordinator's responsibility and were not invoked by Implement; only real `harness observe` calls were used for stage friction, and they succeeded.
- The BL-012 `verify-home-workbench` gate failed once mid-session under heavy machine load (a 5,000 ms visibility timeout and a 25,000 ms step bound) and passed both in isolation and in the final canonical run with no code change between them. It is recorded as load sensitivity, not a BL-020 regression: the only BL-020 edit to that spec adds two throwing double members.
- The coordinator's brief quoted the BL-018 preserved digest as `fa5e267a5dc288e6b856acff506eefad659ab49921f3f9b4e6da87da31e99167`. The committed artifact's digest is `fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880` at both the base commit and at handoff, and the repository constant `BL020_PRESERVED_EVIDENCE` agrees with the artifact, so the quoted value appears to be a transcription error rather than a change.

## Status

Implementation is complete and committed on `feat/45-close-a-running-or-failed-project`. There is no unresolved product failure and no unresolved verification failure: focused, standalone-proof, residual-audit, formatting, lint, typecheck, and canonical gates all completed successfully on the handoff tree. Final acceptance, GitHub issue criteria updates, push, and pull-request creation remain owned by Verify.
