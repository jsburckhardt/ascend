# Implementation Notes: Issue 21

## Completed Tasks

- T-1: Added transactional stable-ID deletion, cause-free persistence errors, and a metadata-only `ProjectCloseService`.
- T-2: Added safe malformed-URL handling, shared-library construction, exact DELETE mappings, and mandatory Fastify `req.url` redaction.
- T-3: Added exact close codecs, original-ID encoding, bounded transport, malformed-ID validation, and pre/post-transmission classification.
- T-4: Extended the single Project Home owner with close, retry, authoritative reconciliation, timeout, focus intent, abort, and stale-generation suppression.
- T-5: Added one Close action per card and the modal, keyboard, focus, announcement, success, recovery, and bounded inert-text UI.
- T-6: Added executed rollback, exact eight-way HTTP concurrency, recursive before/after manifest, resource-close, and targeted-cleanup matrices.
- T-7: Extended the owned real Chromium flow with keyboard Cancel/Confirm and a separate controlled close-fault recovery episode.
- T-8: Synchronized root, application, API, web, harness, and command documentation with request-log redaction and executed scenario evidence.
- T-9: Ran repeated focused paths, the focused close gate, complete root validation, and the close-owned residual audit.

## Acceptance Evidence

- AC-1: `project-persistence.ts` uses one `DELETE ... WHERE id ... RETURNING` transaction. `project-close-service.test.ts` proves exact closed, unknown/repeated `project_not_found`, sibling preservation, restart absence, and real `AFTER DELETE` rollback.
- AC-2: `project-close.ts` receives only the metadata `closeProject` boundary. The executed non-mutation matrix source-checks the boundary and records equal recursive manifests for every required route outcome.
- AC-3: `project-close-route.test.ts` proves exact 200 `closed`, 400 `invalid_project_id`, 404 `project_not_found`, and 500 `project_close_failed` envelopes, one accepted delegation, malformed zero delegation, and no partial success.
- AC-4: `request-logging.ts` merges mandatory `req.url` redaction into enabled Fastify logger options while preserving configured redactions. Captured DELETE access logs contain `[request-url-redacted]` and safe `project.close.failed` fields but neither encoded nor decoded project-ID, SQL, path, stack, content, or secret sentinels; response headers/body and fixed UI messages are scanned separately.
- AC-5: `App.close.test.tsx` proves one semantic Close button per card and the exact modal name/body; real Chromium repeats the role/name/copy check.
- AC-6: Component and Chromium tests prove Tab and Shift+Tab wrapping, Escape and Cancel with zero DELETE requests, and activating-Close focus restoration.
- AC-7: Controller/component tests prove destructive explicit Confirm, one active request, pre-transmission Cancel, post-transmission Cancel removal, busy state, and live announcements.
- AC-8: Controller, component, and Chromium evidence proves stable-ID-only removal without navigation, success announcement, next/previous/heading focus, authoritative absence, and final-card empty state.
- AC-9: Client/controller/component matrices execute malformed validation, all three documented API errors, pre-transmission failure, and persistence failure. Cards remain and only the proven same-ID Retry or Refresh branch is exposed with fixed safe guidance.
- AC-10: The matrices execute close timeout/reset/body/status/contract ambiguity and authoritative present, absent, rejected, timed-out, duplicate, invalid, and non-JSON refresh paths without optimistic removal.
- AC-11: Controller tests prove original-ID retry, repeated action suppression, one owner, abort, an older completion resolving during a newer generation, reconciliation timeout, and unmount suppression.
- AC-12: `project-close-non-mutation.test.ts` combines exactly eight concurrent real HTTP DELETEs and a recursive manifest in one isolated scenario: one 200, seven 404, zero target rows, and equal content metadata. The route suite separately proves durable restart absence and safe observability.
- AC-13: Client/component tests render one-character and 4,096-character bounded project names/paths, metacharacters, whitespace, and long IDs exactly as inert text in cards and dialogs. No unsupported product name/path maximum was invented; the existing 4,096-byte registration-body boundary and byte-4,097 rejection remain covered, while empty and unencodable close IDs fail before transmission.
- AC-14: `manifest-matrix.json` contains executed `cancel`, `success`, `unknown`, `persistenceFailure`, `transportAmbiguity`, `retry`, `alreadyAbsent`, and `eightConcurrentDeletes` records. Every record stores complete before/after membership, bytes/link target, permissions, and nanosecond timestamps before cleanup.
- AC-15: Isolated service/API tests cover malformed input, success, absence, rollback, restart, closure, sidecar cleanup, redaction, and no-filesystem imports; the final scan found no BL-009 database/sidecar file or fixture allocation.
- AC-16: The focused client/controller/component matrix now contains 58 cases: 27 client, 15 controller, and 16 component. It executes exact codecs, known errors, timeout, invalid/non-JSON refresh, all reconciliation outcomes, stale generations, unmount, focus, and text bounds.
- AC-17: `project-home.spec.ts` runs a no-retry desktop Chromium keyboard registration, Cancel, Confirm, card/list removal, and unchanged fixture episode plus a separate one-shot persistence fault and same-ID Retry episode.
- AC-18: `episode.json` and `close-fault-episode.json` record `fixtureIntegrity` and `ownedCleanup` true. The five-case cleanup matrix records zero final group members, listeners, database files, fixtures, and descendants; independent close-owned filesystem scans were empty.
- AC-19: `README.md`, `docs/README.md`, API/web READMEs, `.harness/engineering-harness.md`, and `justfile` document the exact route, modal/focus/recovery, request-URL redaction, executed before/after manifests, bounded text fixtures, controlled faults, cleanup, commands, no migration/configuration change, and BL-020 deferral. The executable documentation contract cross-checks these additions.
- AC-20: `just verify-close-project` passed 76 Vitest and 3 Chromium cases. Repeated key paths passed 71 cases. Final `just verify` passed formatting, lint, strict typecheck, configured coverage, registration gate, builds, all Chromium tests, and capacity residual audit; close-owned residual scans were empty.

## Documentation Evidence

- `README.md`: Updated request-log redaction, executed manifest scenarios, bounded text evidence, commands, and BL-020 boundary.
- `docs/README.md`: Updated API/access-log behavior, all recovery paths, combined concurrency/integrity proof, limits, controlled fault, and cleanup.
- `apps/api/README.md`: Documented mandatory `req.url` redaction and the exact executed HTTP/non-mutation matrix.
- `apps/web/README.md`: Documented malformed-ID classification and one-character/4,096-character inert-text evidence without inventing a product maximum.
- `.harness/engineering-harness.md`: Updated the delegated close signal and complete per-scenario before/after evidence description while preserving non-persistent boot and `just verify` delegation.
- `justfile`: No correction was required; `verify-focused`, `verify-close-project`, and `verify` remain the authoritative command surfaces.
- Configuration and migration: No application option, default, schema, data migration, API wire shape, or deployment procedure changed.
- Architecture and operations: Existing ADR/core-component contracts remain unchanged because logger redaction, Fastify/React/SQLite behavior, metadata-only filesystem safety, and owned test cleanup stay within accepted boundaries. Operational evidence and cleanup instructions were updated in application and harness documentation.

## Focused Validation

- `just verify-focused apps/api/test/project-close-route.test.ts`: 12 passed, including captured access-log URL redaction.
- `just verify-focused apps/web/src/project-close-client.test.ts`: 27 passed after malformed, pre-send, documented-error, refresh-codec, timeout, and bounds additions.
- `just verify-focused apps/web/src/use-project-close.test.tsx`: 15 passed across definitive, timeout, reconciliation, stale-generation, and unmount branches.
- `just verify-focused apps/web/src/App.close.test.tsx`: 16 passed across keyboard, focus, fixed errors, invalid refresh, and one-character/bounded text.
- Combined corrected close unit/integration run: 73 passed; repeated key close paths after formatting: 71 passed.
- `just verify-close-project`: 76 Vitest passed and 3 real Chromium scenarios passed.

## Full Validation

- Command: `just verify`
- Result: Passed after correcting strict callback annotations found by the first two full-gate attempts.
- API: 53 files, 307 tests; coverage statements 88.54%, branches 80.28%, functions 86.00%, lines 89.50%.
- Web: 7 files, 139 tests; coverage statements 94.69%, branches 90.46%, functions 98.95%, lines 97.41%.
- Registration gate: 6 files, 48 tests; every named BL-006 signal passed.
- Build: API TypeScript and web production build passed.
- Browser: 5 passed, 1 designated comparison skipped; close success, close fault recovery, and cleanup matrix passed.
- Final audit: capacity retained-resource audit passed; browser cleanup evidence reports zero final owned resources; no close-owned database/sidecar file or fixture allocation remained.

Implementation corrections are complete for Verify review. Final acceptance remains owned by Verify.
