# Task Breakdown: BL-002: Prove host-native terminal parity

## Task T-1: Extend the BL-001 parity and environment contract

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** None
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- **Related ADRs:** ADR-260808-typescript-monorepo, ADR-260808-governed-engineering-harness
- **Related Core-Components:** CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-development-standards

### Description
Extend the existing `apps/api/src/workbench-proof-*` suite rather than create another proof stack. Define one ordered command contract containing `hostname`, `id -un`, `pwd -P`, and exactly the six AC-4 tool argument arrays. Define only `PATH` as the environment comparison allowlist. Define fixed executable-resolution records, 5,000 ms per-command and 90,000 ms whole-episode bounds, raw and normalized result types, and context-specific error codes.

Implement one shared normalization that changes only `CRLF` and lone `CR` to `LF`. It must preserve leading/trailing whitespace, stream separation, ordering, control bytes, URLs, and version text. Define `PATH` classifications as `equal`; `allowed difference` only when the fixed executable canonical resolutions remain identical; or `unexplained failure-causing difference` otherwise. Do not retain any non-allowlisted environment value.

### Acceptance Criteria
- The ordered fixed list exactly preserves all six AC-4 command texts and contains no additional tool command. (AC-4)
- Identity and path probes support same-episode hostname/user/canonical-path comparisons. (AC-2, AC-3)
- Shared constants expose the documented 5,000 ms command and 90,000 ms episode bounds. (AC-1, AC-4, AC-7)
- Direct and integrated streams use the same line-ending-only normalization. (AC-5)
- The environment evidence schema accepts only `PATH` and the three AC-6 classifications. (AC-6)
- Errors distinguish missing preflight executables, nonzero direct/integrated commands, and direct/integrated command timeouts. (AC-7)

### Test Coverage
- Add contract tests for exact list membership/order and argument arrays.
- Table-test line-ending normalization and preservation of whitespace, ANSI/control bytes, URLs, and separate stdout/stderr.
- Test the `PATH` schema/classifier for equal, permitted resolution-equivalent difference, and failure-causing resolution difference; reject extra environment keys.
- Test constants and diagnostic schema fields.

### Expected Evidence
- Focused Vitest output naming the new contract tests and exit 0.
- Source references to the shared command list, allowlist, normalization, bounds, and typed diagnostics.
- Assertions showing no non-allowlisted environment field can enter the evidence shape.

## Task T-2: Add bounded command execution and safe evidence capture

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-1
- **Acceptance Criteria:** AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging

### Description
Add a small parity executor inside the BL-001 proof boundary. Spawn commands by executable and argument arrays from the canonical fixture, capture stdout and stderr separately, record exit/timeout and PID/start identity, and kill only the exact timed-out command group. Reuse the same executor for direct and integrated contexts so normalization and result semantics cannot drift.

Before starting code-server or Chromium, resolve all six fixed-list executables against the direct deterministic `PATH`; fail nonzero with the missing executable name. Capture direct raw results. Let the integrated terminal invoke the same executor in integrated mode and write its raw result atomically. Store current-run generated artifacts at `test-results/bl-001/terminal-parity/direct.raw.json`, `integrated.raw.json`, and `episode.json`, with references from the episode. Never emit command output through runtime lifecycle logs.

### Acceptance Criteria
- Every direct and integrated command runs with the canonical fixture as inherited/current working directory and the exact argument array. (AC-3, AC-4)
- Each result records context, command, finite timeout, exit, separate raw stdout/stderr, normalized stdout/stderr, and process identity. (AC-4, AC-5, AC-9)
- Hostname and user are compared in one episode; both user values must be `vscode`. (AC-2)
- Evidence retains only `PATH`, fixed executable resolutions, and its classification; failure-causing differences fail the episode. (AC-6)
- Missing preflight, nonzero, and timeout diagnostics name executable/command and context as applicable. (AC-7)
- Timed-out children are terminated by exact identity/group and audited absent. (AC-8)
- Raw evidence writes are bounded and atomic, and the episode references both raw files. (AC-5, AC-9)

### Test Coverage
- Use temporary fake executables to test stdout/stderr/exit capture, exact cwd and argv, line endings, and resolution records in both contexts.
- Test missing executable before any browser-start callback is called.
- Test direct and integrated nonzero and timeout diagnostics independently.
- Test exact timed-out child absence and unrelated control-process survival.
- Test atomic artifact shape, raw references, environment key restriction, and write-failure propagation.

### Expected Evidence
- Focused Vitest output for executor, failure, artifact, and cleanup cases.
- Generated direct/integrated raw JSON showing separate streams and canonical cwd.
- Process audit proving timed-out fake children absent and unrelated control process alive.

## Task T-3: Extend the passing BL-001 Chromium scenario

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-2
- **Acceptance Criteria:** AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-8, AC-9
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-filesystem-path-safety, CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-structured-runtime-logging, CORE-COMPONENT-260808-development-standards

### Description
Extend `tests/e2e/workbench-proof.spec.ts` so the existing real BL-001 lifecycle also proves terminal parity. Preserve its fixture snapshots, Explorer check, Markdown Preview check, process/listener attribution, handle, and exact stop. Do not launch a second workbench.

Use the Playwright browser fixture to create and own one explicit browser context and page. Open exactly one integrated terminal through bounded keyboard/UI actions. Invoke the shared integrated-mode executor from that terminal without interpolating the fixture path, wait for one bounded completion marker, then read the integrated raw artifact. Compare hostname, `id -un`, `pwd -P`, exact tool results, executable resolutions, and `PATH` classification. Record Ubuntu, runtime hostname, user, shell fact from the configured account, tool versions/results, code-server version, all bounds, cleanup, and disposition.

The `finally` path must first cancel/terminate unfinished tracked command children, close the explicit browser context, stop the exact BL-001 handle/process group, and audit command identities, handle PID/start identity, and listener absence. Cleanup must be attempted and recorded even when comparison or artifact writing fails.

### Acceptance Criteria
- One existing BL-001 workbench starts against the canonical fixture, and one Chromium context opens exactly one integrated terminal within the 90,000 ms episode. (AC-1)
- Same-episode hostname/user values match and both users equal `vscode`. (AC-2)
- Integrated `pwd -P` equals the canonical path returned by BL-001 launch. (AC-3)
- All six direct/integrated exit and normalized stream pairs match from the fixture. (AC-4)
- Episode references both untouched raw artifacts and records line-ending-only normalized values. (AC-5)
- `PATH` receives exactly one valid classification and unexplained resolution differences fail. (AC-6)
- Browser context, terminal commands, exact runtime PID, and listener are absent after every started path. (AC-8)
- Episode contains the complete AC-9 host, command, timeout, output, version, cleanup, and disposition fields. (AC-9)

### Test Coverage
- Run the passing real designated-host Chromium parity scenario through the paved command.
- Assert one terminal creation action and one completion marker.
- Assert all parity comparisons, evidence schema fields, existing Explorer/Markdown observations, fixture integrity, and injection-sentinel absence.
- Assert explicit browser-context close and post-cleanup process/listener/command absence in `finally`.

### Expected Evidence
- `just proof-terminal-parity` exit 0 on Ubuntu 24.04 as `vscode`.
- `test-results/bl-001/terminal-parity/episode.json` with passed disposition and raw references.
- Existing BL-001 episode fields plus terminal parity and exact cleanup observations.
- Failure-only Playwright trace/screenshot if browser interaction fails.

## Task T-4: Prove named failures and bounded cleanup

- **Status:** Complete
- **Complexity:** High
- **Dependencies:** T-2, T-3
- **Acceptance Criteria:** AC-1, AC-7, AC-8
- **Related ADRs:** ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260808-runtime-lifecycle-error-handling, CORE-COMPONENT-260808-host-process-environment, CORE-COMPONENT-260808-filesystem-path-safety

### Description
Add deterministic tests around the same executor and episode cleanup coordinator, not a second runtime harness. Cover a missing fixed executable before browser creation; an existing command returning nonzero in direct and integrated contexts; per-command timeout in both contexts; overall episode timeout; artifact-write failure; and a failure after browser/workbench creation.

Every diagnostic must be typed and include only safe command/context/timeout/exit facts. The missing case must prove no browser context or BL-001 handle started. Every post-start case must prove browser context closure, exact handle stop, PID/listener absence, tracked command absence, and unrelated-process survival. Cleanup failures must remain visible and must not be converted into success.

### Acceptance Criteria
- The 90,000 ms episode timeout is executable and causes a nonzero result. (AC-1)
- Missing fixed executable names the executable, exits nonzero before browser startup, and records that no handle/context existed. (AC-7)
- Direct and integrated nonzero diagnostics name the exact command and context. (AC-7)
- Direct and integrated timeout diagnostics name command, context, and 5,000 ms bound. (AC-7)
- All started failure paths close browser context, stop/audit the exact runtime, and leave no tracked command alive; no broad kill is used. (AC-8)

### Test Coverage
- Table-test missing, nonzero, and timeout cases with spies proving operation order.
- Exercise overall timeout with a deliberately blocked fake operation under a shortened injected test bound.
- Exercise artifact and post-browser failures through the cleanup coordinator.
- Verify exact PID/start-time and listener audits, browser-close calls, command absence, and unrelated control survival.

### Expected Evidence
- Focused test table output with every named failure passing.
- Captured nonzero diagnostics containing executable/command/context/timeout facts.
- Cleanup assertions for success and every started named-failure path.

### Verify correction evidence

- The real Chromium timeout scenario runs an in-progress integrated-terminal fixture under a 20,000 ms injected episode bound, hands its exact PID/start identity to the shared cleanup coordinator, while the production integrated helper publishes its launcher group and every started child identity, and proves the command group is absent after cancellation. (AC-1, AC-8)
- The same coordinator closes the owned browser context, stops the exact BL-001 process group, and records separate workbench-PID and listener absence results; just proof-terminal-parity passes both timeout-cleanup and parity scenarios. (AC-8)

## Task T-5: Expose, document, retain, and validate the sensor

- **Status:** Complete
- **Complexity:** Medium
- **Dependencies:** T-1, T-2, T-3, T-4
- **Acceptance Criteria:** AC-1, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11
- **Related ADRs:** ADR-260808-governed-engineering-harness, ADR-260808-typescript-monorepo
- **Related Core-Components:** CORE-COMPONENT-260806-project-command-interface, CORE-COMPONENT-260808-development-standards, CORE-COMPONENT-260808-engineering-harness-delivery-contract, CORE-COMPONENT-260806-rpiv-stage-contract

### Description
Add `just proof-terminal-parity` as the exact paved target-host command, delegating to the extended BL-001 Playwright sensor. Keep the same sensor in `just verify`; do not duplicate command bodies in harness configuration. Update `README.md`, `apps/api/README.md`, `docs/README.md`, `docs/workbench-proof.md`, and `.harness/engineering-harness.md` so discovery surfaces agree on prerequisites, fixed list, `PATH` policy, line-ending-only normalization, 5,000/90,000 ms bounds, diagnostics, raw/episode locations, and cleanup.

After target-host execution, write `implementation/00-implementation.md` with AC-1 through AC-11 mappings, exact commands/exits, normalized outputs, references to direct/integrated raw artifacts, Ubuntu/runtime hostname/user/shell/tool/code-server observations, cleanup outcome, overall disposition, and documentation evidence. Add a harness-change record only if the canonical gate capability description changes. Do not add or edit architecture artifacts.

### Acceptance Criteria
- `just proof-terminal-parity` runs the one extended BL-001 episode and returns its timeout/failure status. (AC-1)
- Documentation precisely states raw references, normalization, `PATH` allowed difference, diagnostics, and cleanup. (AC-5, AC-6, AC-7, AC-8, AC-10)
- The retained implementation record maps every AC to command, result, artifacts, and observed evidence without non-allowlisted environment values. (AC-9)
- Root/API/docs/harness discovery remains consistent, with a bounded no-impact rationale for API/schema/migration/deployment surfaces. (AC-10)
- Focused tests, paved target-host proof, and full `just verify` all exit 0. (AC-11)

### Test Coverage
- Run `just verify-focused` for all added/changed proof unit and integration tests.
- Run `just proof-terminal-parity` on the designated host and inspect its machine episode/raw references.
- Validate documentation strings for exact fixed commands, bounds, normalization, allowlist, and paved command where practical.
- Run `just verify` independently after the paved proof and confirm the extended sensor executes once in the canonical gate.

### Expected Evidence
- Focused, paved, and full command transcripts with exits and test counts.
- Retained `project/work-items/7-bl-002-prove-host-native-terminal-parity/implementation/00-implementation.md`.
- Updated runbook/discovery files and, only if warranted, one harness-change record.
- Final episode proving passed disposition and exact cleanup; `just verify` exit 0.

### Verifier documentation correction evidence

- Harness governance and the BL-002 harness-change record now name both real scenarios and governance links the retained BL-002 implementation evidence. (AC-9, AC-10)
- Root, API, documentation-index, action-plan, task, and test-plan wording distinguishes the forced timeout-cleanup scenario from the passing terminal-parity scenario. (AC-10)
- `just format-check` and `just verify-focused` passed; `just verify` passed 34 API tests, 1 web test, builds, and all 3 Chromium tests, including both real workbench scenarios. (AC-11)

## Dependency Order

`T-1 → T-2 → T-3 → T-4 → T-5`

## Scope Exclusions
- BL-003 presentation choice/comparison.
- BL-010 stable Ascend routing and workbench UI.
- BL-014 concurrent runtimes.
- BL-017+ persistence, recovery, production lifecycle, and later hardening.
- Tool installation, alternate hosts, exhaustive environment equality, broad security testing, and session persistence.
