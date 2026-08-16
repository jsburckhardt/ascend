# BL-019 implementation record

## Stage boundary

- Issue: GitHub Issue 43, BL-019: Reconcile workbench runtimes after API restart.
- Scope type: issue.
- Branch: feat/43-reconcile-workbench-runtimes-after-api-restart.
- Implement started from base 4e2b48b8a54204d68617b40e2dd6de302676f550 and recovered the preserved partial working tree rather than restarting it.
- Revision 4 was committed as 61d3acf22a14be55ed9f7ae386739fd9366ece23. Independent Verify returned that implementation for the bounded revision-5 correction recorded below; the revision-4 commit was preserved and not amended.
- Verify's correction finding was threefold: completed group enumeration could omit the leader, reconciliation pacing used a fallible sleep boundary, and the runbook incorrectly prohibited bounded refusal enums from committed validation evidence.
- This record is Implement-stage evidence only. Verify retains final acceptance, GitHub issue updates, push, and pull-request ownership.

## Authoritative inputs

The accepted revision-5 artifacts were checked byte-for-byte before implementation or task-status updates:

| Artifact | Accepted SHA-256 |
|---|---|
| plan/01-action-plan.md | 38ac021ee4fb6530b2f3527c549b609f4a2b0f20104db575c3cf6349af225e2f |
| plan/02-task-breakdown.md | 024b38340eefeba65859a87f7b2b8ba5fa55ec79c5fbc2c2ad0d5ae661e9c372 |
| plan/03-test-plan.md | 6c1fe0accb5014024e5c417d038b91eb718251bae68a0c6cbaaddf772ee92e59 |
| ADR-260815-api-restart-runtime-reconciliation.md | 8ddeade22880cf139405e62ed8fd3b5211a4bc9d11110a5282f5366e4bde9169 |
| CORE-COMPONENT-260815-host-runtime-attribution-evidence.md | dea5170f922baec4dc716cb66a273291fac333026295e0fb54bc9a9d75e6c1b7 |
| DECISION-LOG.md | 403c87ee2a4ff9d7ee8010eabb2f4292e23db08d718d3e28158ad185499ab9f7 |

The action plan, test plan, ADR, core component, and decision log retained those hashes after implementation. The task breakdown changed only its six reopened statuses to Completed and finished at SHA-256 d426109004c7219ca2e12abea97e8955b598632ed373b7e1106a112a3de3e20d.

Revision 5 appended Decisions 295-301 without renumbering prior decisions: completed process-group enumeration must contain the candidate leader; the attribution boundary owns that identifier; membership precedes listener and descriptor observation; reconciliation gaps use the trusted monotonic scheduler; gaps are bounded and cancellable; bounded refusal enums are permitted in trusted retained evidence; raw host values remain prohibited from public and committed evidence.

## Completed tasks

T-1 through T-15 are complete in declared dependency order. The task breakdown records each as Completed.


Independent Verify reopened only T-2, T-3, T-9, T-10, T-14, and T-15. They were corrected in that order:

- T-2: completed process-group scans now require strict numeric membership of the candidate leader before any listener, identity, argv, descriptor, or readiness observation.
- T-3: reconciliation readiness gaps now use the trusted deadline scheduler with monotonic clamping, abort cancellation, non-rejection, and inert late callbacks; the launched-runtime and selected-Stop sleep paths remain unchanged.
- T-9 and T-10: the two source guards and M-9 controls were extended, S-17 executes the complete-but-leader-missing branch, all 66 rows re-executed with a reconciliation-failing sleep control, and the matrix was regenerated from production paths.
- T-14: the runbook now distinguishes public disclosure from trusted retained evidence and documents leader membership and trusted cancellable readiness pacing behavior.
- T-15: focused, deterministic, designated real-host, residual, formatting, hash, and canonical gates completed from root justfile recipes.

All unreopened revision-4 work remains as previously recorded:
- T-1 through T-4: delivered the private reconciliation contract, exact host attribution, one-shot manager settlement, and acquisition/Stop/Restart admission.
- T-5 through T-8: made startup reconciliation required before route registration, published safe route categories, mirrored closed web vocabularies, and migrated all typed manager doubles.
- T-9 and T-10: delivered the revision-4 evidence contract and an execution-produced 66-scenario matrix with project-keyed readiness attribution.
- T-11 and T-12: delivered the compiled-API P0-P13 episode, isolated candidate-bearing controls, marker-free outside-group control, and independent residual audit.
- T-13 through T-15: wired root recipes, maintained affected application documentation, preserved prior evidence, and completed the canonical gate.

## Acceptance evidence

| AC | Concrete implementation evidence |
|---|---|
| AC-1 | Matrix S-03, S-04, S-05, S-28, and S-48 adopt without launch or signal. Completed group enumeration must contain the leader before listener observation, and readiness gaps use the bounded trusted scheduler rather than process sleep. The compiled replacement APIs preserve both survivor identities inside 15,000 ms. |
| AC-2 | Matrix S-32, S-36, and S-37 and the P5 episode route requests return through each unchanged stable route to the same attributed listener. The committed matrix privacy scan has zero matches. |
| AC-3 | Reconciliation remains private while reportPublicStates exposes only Stopped, Starting, Running, and Failed. Startup installs entries before route registration, and all required manager doubles typecheck. |
| AC-4 | Matrix S-43, S-45, and S-60 preserve delivered Stop behavior. P8 completes within 5,000 ms, leaves registration intact, and leaves the peer unchanged. |
| AC-5 | Matrix S-44 and S-61 preserve release-before-replacement Restart behavior. P9 completes within 66,000 ms with a new identity and unchanged stable route. |
| AC-6 | Matrix S-27 and S-56 plus compiled generations 1 through 3 prove repeated replacement API starts adopt unchanged survivors without duplicate ownership or listener accumulation. |
| AC-7 | Matrix S-63 through S-66 and the designated registration and fixture-manifest records prove registration rows and fixture bytes remain unchanged. |
| AC-8 | Reconciliation emits only the four reconciliation events and emits no lifecycle event for refusal. Public surfaces expose no refusal reason; trusted retained evidence may carry bounded refusal enums, while raw path, identity, argv, listener, process, network, environment, terminal, stack, and error values remain absent from public and committed evidence. |
| AC-9 | S-01 and the real zero-project startup generation create and signal nothing inside 4,000 ms. S-34 uses the 71,000 ms absent-boundary acquisition; S-38 uses ordinary 60,000 ms acquisition. |
| AC-10 | S-07 through S-26 and the isolated C-1/C-3 episode settle uncertainty as Failed/reconcile-unconfirmed, block acquisition with safe 503, and perform zero launch or signal. S-17 now executes a complete group enumeration that omits the leader and records zero listener, descriptor, and readiness observations. |
| AC-11 | Adopted handles use on-demand identity-safe liveness correction only. No timer, monitor, watcher, subscription, background poller, or adopted exit task was added. |
| AC-12 | S-08 through S-22 exercise every refusal class and S-62 proves recycled-identity zero-signal behavior. V-2 and V-6 separately prove incomplete, complete-empty, and complete-missing-leader group scans all refuse before listener/readiness, launch, or signal. Real-host controls remain unsignalled before exact cleanup. |
| AC-13 | S-33 and S-35 contain eight healthy or inconclusive acquisitions under the 60,000 ms bound. No absent-boundary launch is assigned to AC-13. |
| AC-14 | S-39 through S-42, S-46, and S-47 and the compiled control API return the fixed 409 pending/unresolved Stop and Restart categories with zero lifecycle event. |
| AC-15 | S-49 through S-52 and manager tests prove late scan, identity, group, listener, readiness, audit, and exit observations cannot overwrite a settled or replaced generation. |
| AC-16 | S-04, S-45, S-47, and S-57 prove per-project independence. The live two-project episode keeps disjoint identities, listeners, lifecycle actions, and cleanup. |
| AC-17 | S-53 through S-55 prove shutdown aborts observation, claims no absence, signals no unadopted candidate, emits no terminal event for interrupted work, and permits a clean later pass. |
| AC-18 | The regenerated committed artifact contains 66 catalog-ordered execution-produced rows. Every row carries the seven-member execution witness, declared bound, within-bound elapsed class, and exact project-keyed readiness map; S-21 and S-50 record all trusted-scheduler readiness observations. |
| AC-19 | P10 records teardown null while resources are live; P11 tears down exact owned identities; P12 independently probes six classes; P13 atomically finalizes proven-clear. The independent audit recomputes six completed integer zeros and agrees with the episode. |
| AC-20 | The API-restart reconciliation runbook states the corrected two-tier disclosure boundary, completed-enumeration leader membership, and trusted monotonic cancellable pacing. Existing README, API, routing, usage, configuration, migration, and deployment contracts remain accurate because no public behavior, schema, configuration, or topology changed. |
| AC-21 | The revision-5 canonical just verify completed successfully, including format, lint, typecheck, all prior runtime, routing, navigation, isolation, continuity, state, performance, Stop, Restart, browser, designated proof, and residual-audit gates. |
| AC-22 | All evidence was produced by repository-local root recipes and disposable local fixtures with no hosted service, production access, unavailable credential, unsupported hardware, destructive production action, indefinite observation, or manual judgment. |

## Evidence artifacts

- BL-019 revision-5 retained matrix SHA-256: 5df04aa72e5d4306685255511747838f96e0b9da9c319dd7668cb769282eea4b.
- Matrix: 66 execution-produced rows, 13 declared bounds, 20 source guards, 12 mutation classes, seven-member execution witnesses, exact per-project readiness keys, and zero privacy matches.
- S-17 is the complete-but-leader-missing input and records group-scan-incomplete with zero listener, descriptor, and readiness calls. S-21 and S-50 now record 140 scheduler-paced health observations rather than the prior synthetic single observation.
- V-7 injects failing process sleep, proves one-gap clock advancement and remaining-window clamping, aborts mid-gap, observes cancellation without rejection, and delivers a late cancelled callback without state or probe mutation.
- V-15 rejects missing or reordered membership, reconciliation process sleep, raw timers, a non-scheduler delay helper, and illegal listener attribution on group-scan-incomplete while retaining 20 guards and 12 mutation classes.
- Disposable episode: 18 ordered phases, seven real compiled API generations, three controls, teardown proven-clear.
- Independent residual audit: apiProcesses 0; workbenchProcesses 0; attributableDescendants 0; listeners 0; activeRequests 0; disposableFixtures 0; agreement true; generationAuthenticity true; controlSurvival true; controlSoleCandidacy true; controlClearance true.
- Preserved BL-017 SHA-256: c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3.
- Preserved BL-018 SHA-256: fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880.

## Validation results

| Command | Result |
|---|---|
| just verify-focused apps/api/test/runtime-reconcile-attribution.test.ts apps/api/test/runtime-reconcile-manager.test.ts apps/api/test/runtime-reconcile-evidence.test.ts apps/api/test/runtime-reconcile-matrix.test.ts apps/api/test/runtime-reconcile-documentation.test.ts --reporter=verbose | PASS: 5 files, 33 tests covering V-2, V-6, V-7, V-15, V-16, and V-19. |
| BL019_UPDATE=1 just verify-focused apps/api/test/runtime-reconcile-evidence.test.ts apps/api/test/runtime-reconcile-matrix.test.ts --reporter=dot | PASS: 2 files, 9 tests; all 66 rows re-executed and the committed matrix regenerated byte-identically. |
| just verify-runtime-reconcile | PASS: 10 files, 49 tests. |
| just proof-runtime-reconcile | PASS: 2 files, 4 tests; real host bridge and compiled P0-P13 episode. |
| just proof-runtime-reconcile-residual-audit | PASS: status ok; all six residual classes completed at zero; agreement, generation authenticity, control survival, sole candidacy, and clearance true. |
| just format-check | PASS: every tracked formatted file matched Prettier. |
| git diff --check | PASS. |
| just verify | PASS: revision-5 canonical run, including format, lint, typecheck, full test coverage, builds, all issue gates, browser proofs, designated proofs, and residual audits. |

Focused correction work exposed three implementation-test interactions and fixed each at its source: helper-specific source-guard corruption had initially targeted the earlier scheduler call, the selected-Stop preservation assertion was formatting-sensitive, and an unconditional failing-sleep fixture interfered with the intentionally preserved selected-Stop delay. The final fixture fails sleep during reconciliation while retaining the delivered action path. No assertion, retry, vocabulary, or bound was relaxed.

## Documentation disposition

- README, API, routing, and usage: no revision-5 change was required because public states, response fields, categories, workflows, and supported interfaces did not change.
- API-restart runbook: corrected the two-tier disclosure boundary and added behavior-level leader-membership and trusted cancellable pacing statements without raw host values or implementation helper names.
- Configuration: no revision-5 environment option, feature flag, default, or operating constraint changed.
- Migration: no migration note is required because no persisted runtime state, database schema, payload schema, or breaking configuration changed.
- Architecture: implementation follows the amended ADR, core component, and Decisions 295-301. No architecture contract divergence occurred and no Plan return was required.
- Operations and deployment: existing startup, recovery, evidence, cleanup, and deployment procedures remain unchanged beyond the corrected runbook wording. Deployment topology is unchanged.

## Harness evidence

Real Implement-stage observations retained in the harness buffer include DL-055, DL-056, DL-057, INS-020, DL-058, INS-021, COORD-002, DL-059, DL-060, INS-022, DL-061, and DL-062. They cover revision-4 patch recovery, matrix execution diagnosis, source-guard overlap, host proof correction, formatting, legacy guard interaction, and transient canonical host/browser proof failures.

Revision-5 observations DL-065, CONF-008, and DL-066 record the source-guard negative-control diagnosis, selected-Stop assertion correction, and matrix M-11 diagnosis. Each was captured through the real harness executable with an accepted kind.

Coordinator correction post-coding and pre-coding lifecycle attempts remained unavailable because this host rejects argument-bearing skill names. No lifecycle hook was fabricated or invoked by this worker. Implement-stage friction was captured only through real harness observe calls with accepted kinds.

## Handoff

The correction is complete on parent 61d3acf22a14be55ed9f7ae386739fd9366ece23 and is handed off in a new `fix(runtime): enforce reconciliation attribution bounds` commit; its exact SHA is reported outside this self-containing commit record. The working-tree and post-commit canonical proofs belong to the Implement handoff. Final acceptance remains owned by Verify. This stage did not update Issue 43, push, create a pull request, merge, or claim final acceptance.
