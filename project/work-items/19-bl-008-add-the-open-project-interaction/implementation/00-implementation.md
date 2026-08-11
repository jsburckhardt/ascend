# Implementation Notes: Issue #19 Open Project Interaction

## Completed Tasks

- T-1: Added the BL-006-backed registration lifecycle and exact bounded POST contract.
- T-2: Added exact web codecs, serialization, transport classification, and finite request bounds.
- T-3: Added one monotonic Project Home request and stable-ID reconciliation controller.
- T-4: Added the accessible form, recovery controls, focus and scroll behavior, inert text, and deferred Open cards.
- T-5: Added the isolated keyboard-only Chromium episode, integrity checks, and owned cleanup evidence.
- T-6: Synchronized root, application, API, web, harness, and command documentation.
- T-7: Ran focused and complete root validation and independently audited generated residuals.

## Acceptance Evidence

- **AC-1:** `project-registration-route.test.ts` proves exact sole-string `path` bodies delegate once and responses take `name` from the BL-006 result.
- **AC-2:** The API status table tests created 201, existing 200, all six typed mappings, exact four-field projects, exact error fields, and unexpected safe 500.
- **AC-3:** API tests cover empty, malformed, scalar, array, missing, wrong-type, extra-key, non-JSON, exact 4,096-byte, and 4,097-byte bodies with zero invalid delegation.
- **AC-4:** `App.test.tsx` proves the semantic form, persistent Host path label, associated notation guidance, exact value, and correction workflow.
- **AC-5:** Component tables cover blank, whitespace, and every typed path failure with associated alert, `aria-invalid`, input focus, retained text, and unchanged cards.
- **AC-6:** Controller and component tests prove ID-only insert or replacement, `createdAt ASC, id ASC`, no duplicate, exact action scroll and focus, and created or existing announcement.
- **AC-7:** API sequential and browser symlink-equivalent submissions retain the same stable ID, one card, and one durable record.
- **AC-8:** Transport tests prove the 10,000 ms abort; controller and component tests prove one pending owner, active Cancel, repeat blocking, unmount abort, and inert late completion.
- **AC-9:** Controlled pre-send tests and ordinary cancellation preserve input and cards, restore editing, and invalidate late success.
- **AC-10:** Transport tables classify reset, rejection, truncated, unreadable, non-JSON, undocumented status, and invalid contract as unknown; component evidence shows exact visible locked payload and the two idle recovery actions.
- **AC-11:** Controller guards block input and ordinary submission during unknown or ambiguous recovery; transition tests exit only through successful retry, zero or one refresh, or reset after many.
- **AC-12:** Captured request bodies and UTF-8 bytes are identical on retry; successful stable-ID retry uses the same upsert and activation path.
- **AC-13:** Deferred retry cancellation returns to unchanged unknown state and a late created result changes no card or payload.
- **AC-14:** One-added-ID refresh tests replace authoritative cards, compare snapshot IDs, activate the only addition, and announce reconciliation.
- **AC-15:** Zero-added-ID tests retain authoritative cards, unlock preserved input, return to editing, and announce no new project.
- **AC-16:** Multiple-added-ID tests retain the complete authoritative list, select no identity, remain ambiguous and locked, and require Reset recovery.
- **AC-17:** Rejected refresh tests preserve cards and payload in unknown recovery; list transport keeps the existing 5,000 ms bound and invalid contracts reject without partial data.
- **AC-18:** Owner guards and call counts prove repeated submit, retry, or refresh cannot create overlap; busy regions and active registration or recovery Cancel are inspectable.
- **AC-19:** Monotonic owner checks cover cancellation, timeout, newer list or action, reset, and unmount; deferred stale success leaves cards, input, payload, announcement, and focus state unchanged.
- **AC-20:** API sentinel tests prove safe errors; component and Chromium tests render whitespace and script metacharacters as exact inert text with no script element.
- **AC-21:** Component and Chromium tests prove stable `data-project-id`, keyboard Open, unchanged URL, no request or workbench, and issue-neutral deferred announcement.
- **AC-22:** Focused API validation passed 19 route and integration tests covering mappings, delegation, rejection, persistence, identity, and sequential equivalence.
- **AC-23:** The API integration sends exactly eight concurrent equivalent POSTs, receives eight complete existing responses with one ID, and reopens one durable row.
- **AC-24:** Focused web validation passed 24 codec tests, 8 controller transition tests, and 15 accessible component tests; full web coverage remained above all configured 80 percent thresholds.
- **AC-25:** `project-home.spec.ts` passed one no-retry desktop Chromium episode using keyboard product interaction for created, equivalent existing, invalid correction, second success, exact card focus, no reload, and deferred Open.
- **AC-26:** Episode manifests were equal; `episode.json` and `cleanup-matrix.json` are all true for integrity and owned cleanup, and the independent post-run file and process audit was empty.
- **AC-27:** README, application, API, web, harness, and root command docs record exact contracts, recovery, accessibility, exclusions, validation, isolation, cleanup, and observed evidence; executable documentation tests passed.
- **AC-28:** `just verify-open-project`, final `just verify-focused`, and final `just verify` exited zero. The residual audit found no BL-008 database, sidecar, fixture, launcher, or Vite process.

## Documentation Evidence

- `README.md`: user-facing setup, configuration, POST, form, recovery, scope, commands, and observed result.
- `docs/README.md`: complete application, transport, reconciliation, accessibility, isolation, integrity, and operational cleanup behavior.
- `apps/api/README.md`: exact API, size, status, envelope, safe-error, opening-policy, lifecycle, and test contracts.
- `apps/web/README.md`: form, transport classification, card identity, recovery, stale ownership, and keyboard behavior.
- `.harness/engineering-harness.md`: named BL-008 signal and generated evidence paths while retaining non-persistent boot and `just verify` delegation.
- `justfile`: new `verify-open-project` focused gate; `verify` remains authoritative.
- Migration note: no schema, data, API upgrade, or configuration migration is required. New opening-policy variables default to the configured home; explicit empty allowed roots is deny-all.
- Architecture note: no ADR or core-component contract changed. Implementation remains within the accepted TypeScript, full-page deferral, path-safety, SQLite lifecycle, structured logging, command, harness, and RPIV boundaries.

## Validation Results

- Task T-1 focused: `just verify-focused` API matrix, 49 tests passed.
- Task T-2 focused: `just verify-focused` codec and transport matrix, 40 tests passed after correction.
- Task T-3 focused: `just verify-focused` controller and codec matrix, 32 tests passed after correction.
- Task T-4 focused: `just verify-focused` component and controller matrix, 23 tests passed.
- Task T-5 focused: `just verify-focused` app matrix, 42 tests passed; `just test-e2e`, 3 passed and 1 designated-only skipped.
- Task T-6 focused: `just verify-focused` documentation regression, 6 tests passed.
- Task T-7 focused: `just verify-open-project`, 68 Vitest tests and 1 Chromium test passed; final `just verify-focused`, 68 tests passed.
- Full: final `just verify` passed format, lint, strict typecheck, API 284 tests and web 63 tests above every configured 80 percent coverage threshold, BL-006 48-test gate, builds, Chromium 3 passed and 1 designated-only skipped, and capacity audit passed.

These notes provide implementation evidence for independent Verify review and do not claim final acceptance.
