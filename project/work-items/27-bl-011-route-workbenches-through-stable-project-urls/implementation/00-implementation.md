# Implementation Notes: Issue #27

## Completed Tasks

- T-1: Encoded the stable proxy contract and direct `ws` ownership.
- T-2: Integrated stable HTTP and upgrade routes with application lifecycle ownership.
- T-3: Implemented streaming HTTP forwarding, rewrites, backpressure, faults, and abort propagation.
- T-4: Implemented bounded WebSocket bridging, frames, controls, close propagation, and reconnect reuse.
- T-5: Added executable fake-upstream, concurrency, security, failure, and shutdown matrices.
- T-6: Added the real three-navigation Chromium workflow and terminal proof.
- T-7: Added restricted evidence and independent residual auditing.
- T-8: Added paved commands, architecture records, and application documentation.

## Acceptance Evidence

- **AC-1:** `workbench.ts`, `workbench-proxy-manager.ts`, and route tests prove base/descendant stable-prefix forwarding through persisted lookup and one loopback-only BL-010 snapshot.
- **AC-2:** `workbench-route.spec.ts` proves base, nested, WebSocket, Explorer, and Preview traffic stays same-origin under the stable prefix while preserving full-page presentation.
- **AC-3:** `workbench-proxy-http.test.ts` passes the nested GET, bodyless HEAD, deterministic 257 KiB POST digest, and byte-range matrix with exact status and metadata.
- **AC-4:** Contract and real-socket HTTP tests prove root-relative and same-upstream redirect rewrites, external redirect rejection, cookie Path scoping, Domain removal, and attribute preservation.
- **AC-5:** Contract tests and transport fixtures prove hop-by-hop and connection-token filtering in both directions with only required upgrade semantics retained.
- **AC-6:** The HTTP stream test passes 32 ordered 16 KiB chunks with digest equality, delayed consumption, a chunk-5 abort barrier, upstream closure, and runtime survival.
- **AC-7:** `workbench-proxy-websocket.test.ts` passes text, 64 KiB binary digest, ping/pong, clean and abnormal close, timeout, refusal, pending-handshake cancel, 16 by 32 KiB ordered backpressure, and two reconnect cases with peer cleanup.
- **AC-8:** `workbench-route-acceptance.test.ts` releases four HTTP requests and four upgrades together and observes one launch/readiness sequence and one PID/start/port identity.
- **AC-9:** `WORKBENCH_FAILURE_TABLE` has 23 non-overlapping rows, excludes duplicate runtime manager shutdown, and the acceptance coordinator executes every exact status/code/message row with redaction checks. The HTTP matrix additionally executes lookup, persistence, runtime, invariant, connect, reset, and timeout paths.
- **AC-10:** Route tests return exact `400` outcomes for all five malformed vectors and exact `404` for a valid unknown ID; contract and HTTP tests strip hostile Host, forwarding, and proxy-target inputs.
- **AC-11:** Safe-event contracts expose a fixed field set; bounded acceptance and browser evidence report zero literal/encoded sentinel disclosure and stable URLs are the only approved project-token location.
- **AC-12:** Acceptance, HTTP, and WebSocket tests prove finite precommit shutdown, committed closure, pending handshake cancellation, client abort isolation, and memoized proxy shutdown.
- **AC-13:** The designated Chromium test passes exactly three fresh navigation workflows with zero retries, one reused runtime identity, Explorer and Preview sentinels, terminal hostname/user/pwd parity, and the predeclared 256 KiB digest.
- **AC-14:** Fixture and browser cleanup complete; final residual audit reports `status: ok`, one restricted evidence file, two audited identities, absent processes/listeners, and zero public authority matches.
- **AC-15:** `workbench-route-evidence.ts` atomically maintains the sole ignored `test-results/bl-011/workbench-route-evidence.json` at mode `0600`; Git and public-document scans pass.
- **AC-16:** The dedicated runbook, README files, runtime guide, ADR, core-component contract, and decision log document behavior, failures, bounds, security, cleanup, commands, and exclusions.
- **AC-17:** Root focused, stable-route, and full verification recipes exit zero and end the stable-route gate with the Chromium proof and independent clean residual audit.

## Documentation Evidence

- `README.md`, `apps/api/README.md`, and `docs/README.md`: stable-route capability and paved command discovery.
- `docs/stable-workbench-routing.md`: behavior, complete failure table, finite bounds, security/disclosure, validation, operations, cleanup, migration, and scope exclusions.
- `docs/project-runtime.md`: BL-010 proxy integration, reuse, and shutdown ordering.
- `ADR-260812-in-process-workbench-reverse-proxy.md`, `CORE-COMPONENT-260812-stable-workbench-proxy.md`, and `ADR/DECISION-LOG.md`: accepted architecture and component boundaries.
- API behavior documentation changed in `apps/api/README.md`; no OpenAPI artifact exists for this raw proxy route. No configuration option or default was added. No data/configuration migration is required. Runtime/deployment procedure impact is documented in the stable-routing runbook.

## Validation Evidence

- `just verify-focused`: passed, 74 files passed and 1 skipped; 512 tests passed and 2 skipped.
- `just verify-workbench-route`: passed, 7 files and 28 tests; designated Chromium passed; residual audit `status: ok`.
- `just verify`: passed formatting, lint, type checking, package tests and coverage, builds, repository contracts, designated proofs, Playwright, stable-route matrices, Chromium, and residual audit. API branch coverage was 80.01 percent.

These notes record implementation evidence only. Final acceptance remains owned by Verify.
