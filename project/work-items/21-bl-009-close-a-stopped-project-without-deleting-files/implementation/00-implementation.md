# Implementation Notes: Issue 21

## Completed Tasks

- T-1: Added transactional stable-ID deletion, cause-free persistence errors, and a metadata-only ProjectCloseService.
- T-2: Added safe malformed-URL handling, shared-library construction, and DELETE /api/projects/:id mappings.
- T-3: Added exact close codecs, original-ID encoding, bounded transport, and transmission classification.
- T-4: Extended the single Project Home owner with close, retry, authoritative reconciliation, focus intent, abort, and stale suppression.
- T-5: Added one Close action per card and the modal, keyboard, focus, announcement, success, and recovery UI.
- T-6: Added rollback, exact eight-way concurrency, recursive manifest, resource-close, and targeted-cleanup matrices.
- T-7: Extended the owned real Chromium flow with keyboard Cancel/Confirm and a separate controlled close-fault recovery episode.
- T-8: Synchronized root, application, API, web, harness, and command documentation and added verify-close-project.
- T-9: Ran the focused close gate and complete root validation, inspected retained evidence, and confirmed no disposable database or fixture allocation remained.

## Acceptance Evidence

- AC-1: apps/api/src/project-persistence.ts uses one transaction with DELETE, stable-ID WHERE, and RETURNING. project-close-service.test.ts proves exact closed, unknown/repeated project_not_found, sibling preservation, restart absence, and a real AFTER DELETE rollback.
- AC-2: apps/api/src/project-close.ts receives only closeProject metadata. project-close-non-mutation.test.ts source-checks that boundary and records equal recursive manifests for every required outcome.
- AC-3: project-close-route.test.ts proves exact 200 closed, 400 invalid_project_id, 404 project_not_found, and 500 project_close_failed envelopes, accepted delegation once, malformed zero delegation, and no partial success.
- AC-4: service and route sentinel tests scan cause, response, headers, and structured logs; client/component tests render fixed messages only. The controlled browser episode exposes no raw persistence detail.
- AC-5: App.close.test.tsx proves one semantic Close button per card and the exact modal name and body exported as CLOSE_DIALOG_BODY; the real Chromium flow repeats the role/name/copy check.
- AC-6: App.close.test.tsx and project-home.spec.ts prove Tab and Shift+Tab wrapping, Escape and Cancel with zero DELETE requests, and activating Close focus restoration.
- AC-7: use-project-close.test.tsx and App.close.test.tsx prove destructive explicit Confirm, one active request, pre-transmission Cancel, post-transmission Cancel removal, busy state, and live announcements.
- AC-8: Hook, component, and Chromium evidence prove stable-ID-only card removal without navigation, success announcement, next/previous/heading focus, authoritative absence, and final-card empty state.
- AC-9: Definitive invalid, not-transmitted, and project_close_failed branches preserve cards and expose same-ID Retry with fixed recovery guidance; project_not_found requires refresh.
- AC-10: Client, hook, and component matrices cover timeout/reset/invalid-contract unknown outcomes and authoritative present, absent, failed, timed-out, duplicate, and invalid refresh without optimistic removal.
- AC-11: Hook tests prove original-ID retry, repeated action suppression, one owner, generation invalidation, abort, stale completion no-diff, and unmount suppression.
- AC-12: project-close-route.test.ts sends exactly eight concurrent DELETE requests and proves one 200, seven 404, target absence, sibling preservation, durable restart absence, and safe errors. manifest-matrix.json records concurrentClosed 1 and concurrentNotFound 7.
- AC-13: Client URL tests and component/browser metacharacter fixtures prove whitespace and HTML/script values are preserved as opaque encoded IDs and inert React text. Existing finite project bounds remain unchanged.
- AC-14: test-results/bl-009/close-project/manifest-matrix.json records relative path, type, bytes, symlink target, mode, and nanosecond mtime equality for Cancel, success, unknown, absent, rollback, ambiguity, retry, and concurrency before cleanup.
- AC-15: Isolated persistence/service/API tests cover malformed input, success, absence, rollback, restart, closure, exact sidecar cleanup, redaction, and no-filesystem imports; all isolated files are removed after evidence capture.
- AC-16: project-close-client.test.ts, use-project-close.test.tsx, and App.close.test.tsx provide 47 focused client/controller/component cases across exact codecs, accessibility, focus, success, recovery, stale, unmount, and inert text.
- AC-17: project-home.spec.ts runs a no-retry desktop Chromium keyboard registration, Cancel, Confirm, card/list removal, and unchanged fixture episode plus a separate one-shot persistence fault and same-ID Retry episode.
- AC-18: episode.json and close-fault-episode.json record fixtureIntegrity and ownedCleanup true; independent post-run scans found no file below the owned database or fixture allocation directories.
- AC-19: README.md, docs/README.md, apps/api/README.md, apps/web/README.md, .harness/engineering-harness.md, and justfile document the exact route, modal copy, focus, recovery, non-mutation, faults, cleanup, commands, no migration/configuration change, and BL-020 deferral. project-close-documentation.test.ts cross-checks executable constants.
- AC-20: just verify-close-project passed 52 Vitest cases and 3 Chromium cases. just verify passed formatting, lint, strict typecheck, 306 API tests, 118 web tests, 48 registration-gate tests, builds, 5 passed/1 designated skipped Chromium tests, and the retained capacity audit with absent attributed resources.

## Documentation Evidence

- README.md: Added the user-facing stopped-project close workflow, DELETE outcomes, focus/recovery behavior, evidence, commands, and BL-020 boundary.
- docs/README.md: Added the complete application/API behavior, transaction and no-filesystem boundary, keyboard recovery, recursive manifest, controlled fault, cleanup, and exact wire examples.
- apps/api/README.md: Added DELETE/service/persistence/lifecycle/redaction/concurrency contracts and exact JSON examples.
- apps/web/README.md: Added modal copy, accessibility, fixed messages, stable-ID recovery, focus, and browser evidence.
- .harness/engineering-harness.md: Added the delegated close gate and evidence/resource ownership while preserving non-persistent boot and harness checks ownership.
- justfile: Added one verify-close-project recipe; verify remains authoritative and already executes the new unit and E2E suites through configured package commands.
- Configuration and migration: No application option, default, schema, or data migration changed; documentation explicitly records no migration or configuration change.
- Architecture and operations: Existing ADRs and core-component contracts were not changed because the implementation remains within the accepted Fastify/React/SQLite, metadata-only filesystem safety, structured logging, and owned test-harness boundaries. Operational cleanup and validation instructions were updated in application and harness documentation.

## Focused Validation

- T-1 just verify-focused: 15 tests passed.
- T-2 just verify-focused: DELETE/service regression set passed after safe autoload and SQLite serialization corrections.
- T-3 just verify-focused: 62 client/list/registration tests passed.
- T-4 just verify-focused: 25 controller tests passed.
- T-5 just verify-focused: 40 component/controller tests passed.
- T-6 just verify-focused: 50 isolated service/API/client/controller/component tests passed.
- T-7 just verify-focused: 18 browser-dependency tests passed; just verify-open-project passed 91 Vitest and 3 Chromium tests.
- T-8 just verify-focused: 9 documentation regressions passed; just verify-close-project passed 52 Vitest and 3 Chromium tests.
- T-9 targeted correction runs passed for strict transport, route, architecture sensor, concurrency, and coverage branches.

## Full Validation

- Command: just verify
- Result: Passed.
- API: 53 files, 306 tests; coverage statements 88.53%, branches 80.05%, functions 85.87%, lines 89.46%.
- Web: 7 files, 118 tests; coverage statements 92.45%, branches 88.65%, functions 96.87%, lines 95.69%.
- Registration gate: 6 files, 48 tests; all named BL-006 signals passed.
- Build: API TypeScript and web production build passed.
- Browser: 5 passed, 1 designated comparison skipped; close success, close fault recovery, and cleanup matrix passed.
- Final audit: workbench capacity retained-resource audit passed; owned close database and fixture directories contained no residual allocation.

Implementation evidence is complete for Verify review. Final acceptance remains owned by Verify.
