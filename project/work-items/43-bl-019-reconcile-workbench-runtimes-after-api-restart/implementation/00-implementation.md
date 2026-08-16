# BL-019 implementation record

## Stage boundary

- Issue: GitHub Issue 43, BL-019: Reconcile workbench runtimes after API restart.
- Scope type: issue.
- Branch: feat/43-reconcile-workbench-runtimes-after-api-restart.
- Implement started from base 4e2b48b8a54204d68617b40e2dd6de302676f550 and recovered the preserved partial working tree rather than restarting it.
- This record is Implement-stage evidence only. Verify retains final acceptance, GitHub issue updates, push, and pull-request ownership.

## Authoritative inputs

The accepted revision-4 artifacts were checked before task-status updates:

| Artifact | Accepted SHA-256 |
|---|---|
| plan/01-action-plan.md | 0532342f7d1a3498f1ec1bf1d4af6f8f26fabb59730056c9b1c0e48d3cfa93e0 |
| plan/02-task-breakdown.md | b67cfb9a05c7e92665f69196b1ea4ee06a6d4cc5d558b412ac81f885fb6f81f1 |
| plan/03-test-plan.md | 98c281fdcc376683001be1c42b21b133b7e6b543c8b2a19da7caecbda4f0621c |
| CORE-COMPONENT-260815-host-runtime-attribution-evidence.md | d2d63629e2e0e3f87b3c73db03ef5868f11dee6210272bb1204f90a009e7fbfb |
| DECISION-LOG.md | 0f2d7536c060d7350b9291a08f20b66a23c9291e7ea92d4d0b472c29379fa866 |

Additional implementation-state hashes:

- ADR-260815-api-restart-runtime-reconciliation.md: d96864fc8465fa1cb54590a37d716259d847b02b524afbfc9c709b67de1fad00.
- Task breakdown after marking T-1 through T-15 complete: fdc00466fce322ee989e885f3131f354545d695dbc70dcaf1589d70fce7c674f.

## Completed tasks

T-1 through T-15 are complete in declared dependency order. The task breakdown records each as Completed.

- T-1 through T-4: delivered the private reconciliation contract, exact host attribution, one-shot manager settlement, and acquisition/Stop/Restart admission.
- T-5 through T-8: made startup reconciliation required before route registration, published safe route categories, mirrored closed web vocabularies, and migrated all typed manager doubles.
- T-9 and T-10: delivered the revision-4 evidence contract and an execution-produced 66-scenario matrix with project-keyed readiness attribution.
- T-11 and T-12: delivered the compiled-API P0-P13 episode, isolated candidate-bearing controls, marker-free outside-group control, and independent residual audit.
- T-13 through T-15: wired root recipes, maintained affected application documentation, preserved prior evidence, and completed the canonical gate.

## Acceptance evidence

| AC | Concrete implementation evidence |
|---|---|
| AC-1 | Matrix S-03, S-04, S-05, S-28, and S-48 adopt without launch or signal. The live host proof derives the actual launcher prefix, attributes a forked group listener, and the compiled replacement APIs preserve both survivor identities inside 15,000 ms. |
| AC-2 | Matrix S-32, S-36, and S-37 and the P5 episode route requests return through each unchanged stable route to the same attributed listener. The committed matrix privacy scan has zero matches. |
| AC-3 | Reconciliation remains private while reportPublicStates exposes only Stopped, Starting, Running, and Failed. Startup installs entries before route registration, and all required manager doubles typecheck. |
| AC-4 | Matrix S-43, S-45, and S-60 preserve delivered Stop behavior. P8 completes within 5,000 ms, leaves registration intact, and leaves the peer unchanged. |
| AC-5 | Matrix S-44 and S-61 preserve release-before-replacement Restart behavior. P9 completes within 66,000 ms with a new identity and unchanged stable route. |
| AC-6 | Matrix S-27 and S-56 plus compiled generations 1 through 3 prove repeated replacement API starts adopt unchanged survivors without duplicate ownership or listener accumulation. |
| AC-7 | Matrix S-63 through S-66 and the designated registration and fixture-manifest records prove registration rows and fixture bytes remain unchanged. |
| AC-8 | Reconciliation emits only the four reconciliation events, emits no lifecycle event for refusal, and trusted path, identity, argv, listener, and refusal details remain absent from public payloads and committed evidence. |
| AC-9 | S-01 and the real zero-project startup generation create and signal nothing inside 4,000 ms. S-34 uses the 71,000 ms absent-boundary acquisition; S-38 uses ordinary 60,000 ms acquisition. |
| AC-10 | S-07 through S-26 and the isolated C-1/C-3 episode settle uncertainty as Failed/reconcile-unconfirmed, block acquisition with safe 503, and perform zero launch or signal. |
| AC-11 | Adopted handles use on-demand identity-safe liveness correction only. No timer, monitor, watcher, subscription, background poller, or adopted exit task was added. |
| AC-12 | S-08 through S-22 exercise every refusal class and S-62 proves recycled-identity zero-signal behavior. Real-host controls prove foreign-root launcher-prefix-mismatch and outside-group listener-not-owned; all survive unsignalled before exact cleanup. |
| AC-13 | S-33 and S-35 contain eight healthy or inconclusive acquisitions under the 60,000 ms bound. No absent-boundary launch is assigned to AC-13. |
| AC-14 | S-39 through S-42, S-46, and S-47 and the compiled control API return the fixed 409 pending/unresolved Stop and Restart categories with zero lifecycle event. |
| AC-15 | S-49 through S-52 and manager tests prove late scan, identity, group, listener, readiness, audit, and exit observations cannot overwrite a settled or replaced generation. |
| AC-16 | S-04, S-45, S-47, and S-57 prove per-project independence. The live two-project episode keeps disjoint identities, listeners, lifecycle actions, and cleanup. |
| AC-17 | S-53 through S-55 prove shutdown aborts observation, claims no absence, signals no unadopted candidate, emits no terminal event for interrupted work, and permits a clean later pass. |
| AC-18 | The committed artifact contains 66 catalog-ordered execution-produced rows. Every row carries the seven-member execution witness, declared bound, within-bound elapsed class, and exact project-keyed readiness map. |
| AC-19 | P10 records teardown null while resources are live; P11 tears down exact owned identities; P12 independently probes six classes; P13 atomically finalizes proven-clear. The independent audit recomputes six completed integer zeros and agrees with the episode. |
| AC-20 | README, API README, route README, documentation indexes, project runtime, session switching, stable routing, and the new API-restart reconciliation runbook document behavior, bounds, ownership limits, executable evidence, cleanup, and BL-020 through BL-022 exclusions. |
| AC-21 | The final canonical just verify completed successfully, including all prior runtime, routing, navigation, isolation, continuity, state, performance, Stop, Restart, browser, proof, and residual-audit gates. |
| AC-22 | All evidence was produced by repository-local root recipes and disposable local fixtures with no hosted service, production access, unavailable credential, unsupported hardware, destructive production action, indefinite observation, or manual judgment. |

## Evidence artifacts

- BL-019 retained matrix SHA-256: 1be876c804843f42f694f390c580416dc3fab3a1f3ddde6777e5f32812c0eeb6.
- Matrix: 66 execution-produced rows, 13 declared bounds, 20 source guards, 12 mutation classes, seven-member execution witnesses, exact per-project readiness keys, and zero privacy matches.
- Disposable episode: 18 ordered phases, seven real compiled API generations, three controls, teardown proven-clear.
- Independent residual audit: apiProcesses 0; workbenchProcesses 0; attributableDescendants 0; listeners 0; activeRequests 0; disposableFixtures 0; agreement true; generationAuthenticity true; controlSurvival true; controlSoleCandidacy true; controlClearance true.
- Preserved BL-017 SHA-256: c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3.
- Preserved BL-018 SHA-256: fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880.

## Validation results

| Command | Result |
|---|---|
| BL019_UPDATE=1 just verify-focused apps/api/test/runtime-reconcile-evidence.test.ts apps/api/test/runtime-reconcile-matrix.test.ts --reporter=verbose | PASS: 2 files, 7 tests; committed matrix regenerated byte-identically. |
| just type-check | PASS for apps/api and apps/web. |
| BL019_DESIGNATED=1 just verify-focused apps/api/test/runtime-reconcile-host-conformance.test.ts --reporter=verbose | PASS: 3 real-host tests. |
| just verify-runtime-reconcile | PASS: 10 files, 39 tests. |
| just proof-runtime-reconcile | PASS: 2 files, 4 tests; real host bridge and compiled P0-P13 episode. |
| just proof-runtime-reconcile-residual-audit | PASS: status ok, six completed zero probes, agreement and authenticity true. |
| just verify-focused apps/api/test/runtime-stop-evidence.test.ts --reporter=verbose | PASS: 5 tests after narrowing the legacy clock guard to its declaration. |
| just verify-session-switching | PASS: 8 deterministic tests, one Chromium proof, and status-ok residual audit. |
| just verify | PASS: canonical final run, including format, lint, typecheck, full test coverage, builds, all issue gates, browser proofs, designated proofs, and residual audits. |
| git diff --check | PASS. |

The first canonical attempt identified two unformatted fixture modules. A later attempt exposed and repaired the BL-017 source guard's over-broad clock window. Two unchanged host/browser proofs each failed once and passed their exact isolated root recipes before the successful canonical run; no assertion, retry count, or bound was relaxed.

## Documentation disposition

- README and usage: updated root and API README behavior and recovery boundaries.
- API and routing: updated the route README, stable routing guide, safe 503 failure, and Stop/Restart 409 categories. No response field or public state was added.
- Configuration: documented same-user, same-TMPDIR, and same-installation operating constraints. No environment option, feature flag, or default was added.
- Migration: no migration note is required because no persisted runtime state, database schema, payload schema, or breaking configuration changed.
- Architecture: implementation follows the new ADR and core component plus the amended runtime, proxy, process, logging, and filesystem records. No architecture contract divergence occurred.
- Operations and deployment: the new runbook documents bounded startup, operator recovery, evidence, and cleanup. Deployment topology is unchanged.

## Harness evidence

Real Implement-stage observations retained in the harness buffer include DL-055, DL-056, DL-057, INS-020, DL-058, INS-021, COORD-002, DL-059, DL-060, INS-022, DL-061, and DL-062. They cover revision-4 patch recovery, matrix execution diagnosis, source-guard overlap, host proof correction, formatting, legacy guard interaction, and transient canonical host/browser proof failures.

Coordinator lifecycle hook calls with arguments remained unavailable because this host rejects argument-bearing skill names. No lifecycle hook was fabricated or invoked by this worker. Implement-stage friction was captured only through real harness observe calls with accepted kinds.

## Handoff

Implementation is complete, locally validated, and ready to commit. Final acceptance remains owned by Verify. This stage did not update Issue 43, push, create a pull request, merge, or claim final acceptance.
