# Verify Summary: BL-019 API-restart reconciliation

## Delivery

- **Issue:** [#43](https://github.com/jsburckhardt/ascend/issues/43) - `BL-019: Reconcile workbench runtimes after API restart`
- **Pull request:** [#44](https://github.com/jsburckhardt/ascend/pull/44) - `feat(runtime): reconcile workbenches after API restart`
- **Branch:** `feat/43-reconcile-workbench-runtimes-after-api-restart`
- **Base:** `main` at `4e2b48b8a54204d68617b40e2dd6de302676f550`
- **Verified implementation and correction SHA:** `ff1a1b2bccd68964f48ed72734a538e1f5594148`
- **Prior rejected implementation SHA:** `61d3acf22a14be55ed9f7ae386739fd9366ece23`
- **Disposition:** Accepted and shipped for review. This verification-summary commit is separate from the exact implementation SHA verified above.

## Exact Handoff, Architecture, and Scope

The branch, correction commit, clean worktree, base ancestry, two Conventional Commit messages, and required Co-authored-by trailers were verified before publication. The complete base-to-correction diff contains 82 files; the correction commit modifies 17 files. The diff is whitespace-clean, contains no BL-020, BL-021, or BL-022 product leakage, and follows `ADR-260815-api-restart-runtime-reconciliation` and `CORE-COMPONENT-260815-host-runtime-attribution-evidence`. Decisions 1 through 301 are contiguous; Decisions 295 through 301 govern the revision-5 corrections. No Plan return is required.

The root `justfile` exposes `verify-focused` and `verify`; canonical `verify` runs all prior gates before, in order, `verify-runtime-reconcile`, `proof-runtime-reconcile`, and `proof-runtime-reconcile-residual-audit`.

## Prior Blocker Re-adjudication

| Finding | Verdict | Evidence |
|---|---|---|
| Leader-missing group enumeration | Passed | `resolveGroupListenerOwner` refuses `group-scan-incomplete` for incomplete, empty, and forked-only member lists before listener, descriptor, identity, argv, or readiness work. Fresh V-2/V-6 controls, V-15/M-9, and S-17 prove zero downstream calls and project-keyed readiness zero. |
| Fallible readiness delay | Passed | `awaitTrustedReconciliationDelay` uses only `RuntimeDeadlineScheduler`, clamps to the remaining readiness window, handles pre/mid-gap abort, cancels listener and handle on every exit, never rejects, and makes late callbacks inert. Fresh V-7 injects failing sleep; V-15 rejects sleep, `setTimeout`, `setInterval`, and alternate delay helpers. Launched-runtime and selected-Stop sleeps remain unchanged. |
| Two-tier disclosure boundary | Passed | V-19 and `docs/api-restart-reconciliation.md` keep internal refusal reasons out of browser, HTTP, and event surfaces; bounded enum names may appear in trusted inspection and committed evidence; raw host values appear in neither public nor committed evidence. |

## Acceptance Decisions

| AC | Verdict | Independent evidence |
|---|---|---|
| AC-1 | Passed | Compiled-host episode and S-03/S-04/S-05/S-28/S-48 preserve ready survivors, identities, and listeners within 15,000 ms. |
| AC-2 | Passed | S-32/S-36/S-37 retain stable routes; privacy scans have zero identity or authority leaks. |
| AC-3 | Passed | Contract and S-02/S-03/S-06/S-20/S-22/S-29/S-58/S-59 prove the closed four-state projection. |
| AC-4 | Passed | S-43/S-45/S-60 and compiled Stop prove exact release within 5,000 ms and peer continuity. |
| AC-5 | Passed | S-44/S-61 and compiled Restart prove release-before-replacement within 66,000 ms. |
| AC-6 | Passed | S-27/S-56 and three replacement APIs preserve survivor identities without duplicate ownership. |
| AC-7 | Passed | S-63 through S-66 plus compiled registration and fixture manifests remain unchanged. |
| AC-8 | Passed | S-29/S-30/S-31/S-58/S-59, route contracts, and privacy scan retain only bounded values. |
| AC-9 | Passed | S-01/S-02/S-34/S-38 prove zero-project, positive-absence, and bounded acquisition paths. |
| AC-10 | Passed | S-07 through S-26 plus S-35/S-37/S-41/S-42 refuse before unsafe claim, route, signal, or launch. |
| AC-11 | Passed | S-23 through S-26 and manager controls prevent stale outcomes and add no adopted watcher. |
| AC-12 | Passed | S-08 through S-22 and S-62 cover 18 refusal classes, recycled identities, controls, and zero signals. |
| AC-13 | Passed | S-33 and S-35 prove eight healthy and unresolved acquisitions within 60,000 ms. |
| AC-14 | Passed | S-39 through S-42/S-46/S-47 and routes prove fixed 409 admission categories with no lifecycle action. |
| AC-15 | Passed | S-49 through S-52 reject delayed and reordered earlier-generation observations. |
| AC-16 | Passed | S-04/S-45/S-47/S-57 and live two-project proof preserve peer independence. |
| AC-17 | Passed | S-53 through S-55 prove safe shutdown interruption and later clean reconciliation. |
| AC-18 | Passed | Fresh 66-row regeneration has seven-member witnesses, project-keyed readiness maps, 13 bounds, and 20 source guards. |
| AC-19 | Passed | Fresh compiled proof validates seven API generations, 18 phases, P10-P13 atomic teardown, and independent six-class zero residual audit. |
| AC-20 | Passed | README, API, routing, runtime, recovery, privacy/evidence, validation, configuration/migration no-impact, and deployment documentation are accurate. |
| AC-21 | Passed | Fresh `just verify` completed all format, lint, type, build, runtime, route, browser, proof, and residual-audit gates. |
| AC-22 | Passed | Repository-local root recipes and disposable fixtures require no external service, credential, hardware, destructive action, indefinite wait, or manual judgment. |

## Evidence and Residuals

| Command or proof | Result |
|---|---|
| `just verify` | Passed. Reconciliation gate: 10 files, 49 tests; compiled host proof: 2 files, 4 tests; residual audit: six completed zero classes. |
| Focused correction suite | Passed: 5 files, 33 tests, including V-2, V-6, V-7, V-15, V-16, and V-19. |
| Matrix regeneration | Passed: 2 files, 9 tests; all 66 rows production-executed and committed byte-identically. |
| Independent residual audit | All six classes zero; agreement, control survival, sole candidacy, control clearance, and generation authenticity true. |

- 20 source guards, 12 mutation classes, 13 selected sources, 18 refusal reasons, 13 bounds, 18 phases, and 15 episode rejection reasons were independently verified.
- Candidate-bearing `C-1` and `C-3` are isolated and cleared before the survivor episode; coexisting `C-2` is marker-free. Matrix privacy evidence has zero matches.

## Preserved Hashes

| Artifact | SHA-256 |
|---|---|
| BL-019 matrix | `5df04aa72e5d4306685255511747838f96e0b9da9c319dd7668cb769282eea4b` |
| BL-017 matrix | `c96b1a060205ef91d9ca1ba96a491fd5343cf9a944a0fa39a2390909a4ffcfd3` |
| BL-018 matrix | `fa5e267aa25c32a35a4c05746bac123d66a0ebc7b5733012b87321c609c32880` |
| Action plan | `38ac021ee4fb6530b2f3527c549b609f4a2b0f20104db575c3cf6349af225e2f` |
| Task breakdown | `d426109004c7219ca2e12abea97e8955b598632ed373b7e1106a112a3de3e20d` |
| Test plan | `6c1fe0accb5014024e5c417d038b91eb718251bae68a0c6cbaaddf772ee92e59` |
| ADR | `8ddeade22880cf139405e62ed8fd3b5211a4bc9d11110a5282f5366e4bde9169` |
| Core component | `dea5170f922baec4dc716cb66a273291fac333026295e0fb54bc9a9d75e6c1b7` |

## Documentation, GitHub, and Lifecycle Disclosure

All affected application documentation is accurate across README, API, configuration, usage, migration/no-impact, architecture, operational recovery, routing, privacy/evidence, validation, and deployment topology. No public schema, configuration option, migration, or topology changed.

Issue #43 remains open with all 22 original acceptance checkboxes checked and its markers and wording preserved. PR #44 is open against `main` from the verified feature branch.

The coordinator post-coding lifecycle attempt remains unavailable because the host rejects argument-bearing skill names. No lifecycle result was fabricated and no worker lifecycle hook was invoked. Verify captured real `harness observe` records `DL-067`, `DL-068`, `DL-069`, and `DL-070` with accepted `difficulty` kind for the long canonical validation and summary-editing friction.
