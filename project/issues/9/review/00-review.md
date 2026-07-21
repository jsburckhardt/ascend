# Code Review: Capture startup and resource measurements

## Summary
- **Issue:** #9
- **Title:** Capture startup and resource measurements
- **Base Branch:** main
- **Feature Branch:** docs/9-startup-resource-measurements (PR #22)
- **Reviewer Model:** GPT-5.6 Sol
- **Verdict:** APPROVE
- **Blocking Findings:** 0

## Repository Understanding

Ascend is a dependency-light engineering harness governed by an RPIV pipeline
(Research → Plan → Implement → Verify) with decisions captured as ADRs. The
harness (`./harness`) is the single operating surface (ADR-0003), and
interactive/long-running work is handed off via `mode: exec` verbs (ADR-0004,
ADR-0005). ADR-0006 establishes the `edit` verb and `scripts/launch-editor.sh`:
code-server is a **documented prerequisite** (not a repo dependency, D7); the
launcher performs **read-only, fail-fast** project-path validation (D5) and
hands off via `exec` with **no supervision/restart** (D6). Issue #9 is a
measurement + documentation story feeding the Prototype-0 review (PRD §29) and
the resource-usage risk analysis (PRD §25 Risk 2). No ADRs, core-components, or
application source are expected to change.

## Scope of Change

Changeset (`git diff --name-only origin/main...HEAD`) is limited to:

- `docs/prototype-0/startup-and-resource-measurements.md` (new primary deliverable)
- `docs/README.md` (discoverability link)
- `.harness/friction.jsonl` (append-only: 3 additions, 0 deletions — confirmed via `--numstat`)
- `project/issues/9/**` (RPIV pipeline artifacts: research, plan ×3, implementation README, verify summary)

No changes to `src/`, `scripts/launch-editor.sh`, `harness`, `.harness/contract.yml`,
`package.json`, or `package-lock.json`. code-server was **not** added as a
dependency or committed. Scope is fully within the story's `issue` scope_type.

## Acceptance Criteria Assessment
| Criterion | Status | Evidence |
|-----------|--------|----------|
| AC1 — Startup command and startup duration documented | Met | §3: seam invocation `PROJECT_PATH=/tmp/demo-proj-9 EDITOR_PORT=8129 ./harness edit`, resolved isolated argv `code-server /tmp/demo-proj-9 --bind-addr 127.0.0.1:8129 --auth none`, measured 0.647 s (TCP bind) / 0.670 s (first `GET /healthz` 200) / ~0.030 s internal init, plus captured startup banner. Method (timestamp → port/health poll) stated and reproducible. |
| AC2 — Memory use and idle CPU for one session documented | Met | §4: idle RSS ≈153 MiB (code-server node tree) / ≈218 MiB (full resident chain), stable across 5 samples over ~20 s; idle CPU ~0.0 % (`top -b` 0.0 %, `/proc/<pid>/stat` 0-tick delta over 5 s). Browser/renderer memory explicitly scoped out (PRD §25 Risk 2); Ascend `node:http` server excluded (ADR-0005). |
| AC3 — Editor version, extension storage, workspace-state location recorded | Met | §5: version `4.129.0 … with Code 1.129.0`; extension storage `/home/vscode/.local/share/code-server/extensions` (`extensions.json` = `[]`); workspace-state/`User` dir `/home/vscode/.local/share/code-server/User`. Paths confirmed against the startup banner `Using user-data-dir …`, not assumed defaults. |
| AC4 — Behaviour after restart, invalid path, and on editor crash documented | Met | §6: restart re-binds same port cleanly with persisted `User/` + `machineid`; five-row invalid-`PROJECT_PATH` table (exit 1 for unset/empty/nonexistent/file, 127 for absent code-server, target never created); `kill -9` frees the port with all processes gone and **no supervision** (ADR-0006 D6). |

All four acceptance criteria are backed by concrete, non-placeholder, mutually
consistent recorded values.

## Architecture Conformance

- **ADR-0006 D5 (read-only, fail-fast):** The five invalid-path stderr strings
  and exit codes in §6.2 match `scripts/launch-editor.sh` exactly
  (`PROJECT_PATH is not set or is empty.`→1; `does not exist:`→1;
  `is not a directory:`→1; `code-server not found on PATH.`→127). The
  byte-for-byte `sha256sum` before/after check corroborates the no-mutation
  guarantee.
- **ADR-0006 D6 (exec handoff / no supervision):** §6.3 correctly states that
  `kill -9` propagates the exit with no supervision or restart — accurately
  reflecting the design; no false claim of resilience.
- **ADR-0006 D7 (documented prerequisite / transient provisioning):**
  code-server was installed transiently into `/tmp/cs` outside the repo tree and
  removed after capture, mirroring issue #7; not added to the dependency set.
- **Isolated argv (PRD §5.7):** The resolved argv in §3 matches
  `scripts/launch-editor.sh` line 61 (`exec code-server "$PROJECT_PATH"
  --bind-addr "127.0.0.1:${EDITOR_PORT}" --auth none`) with `EDITOR_PORT=8129`
  substituted; no leaked flags.
- **ADR-0005:** The Ascend `node:http` server is correctly excluded from every
  figure.

## Test Coverage Assessment

This is a measurement/documentation story (issue "Tests: N/A"). No automated
tests are added, which is appropriate. The document cross-references the existing
code-server-free launcher suite (`tests/launcher/`, TEST-L1..L4/L6) for the
invalid-path guarantees rather than duplicating them. The verifier reports
`sh tests/harness/run.sh` PASS=43/FAIL=0 and `./harness verify` degraded (exit 0,
the accepted Prototype-0 posture). No test-plan gap.

## Findings
| ID | Severity | Location | Finding | Recommendation |
|----|----------|----------|---------|----------------|
| F1 | nit | `docs/prototype-0/startup-and-resource-measurements.md` §4 (lines 157–158) | The phrase "the `npm run edit` / `sh` wrapper chain that stays resident **because the handoff is `exec`-chained**" states the causation slightly imprecisely: the wrappers stay resident because `npm run` waits on its child (it does not `exec`); the `exec` in `launch-editor.sh` replaces only the `sh` process with code-server. The measured numbers (153 MiB two-process tree vs 218 MiB full chain) are correctly separated and honest, so this is purely an explanatory nuance. | Optionally reword to "…stays resident because `npm run` waits on its child rather than `exec`-ing" in a future doc pass; non-blocking. |

## Verdict Rationale

All four acceptance criteria are satisfied with concrete, recorded, internally
consistent evidence. The numbers, paths, versions, PIDs, and exit codes agree
across the evidence document, the implementation README, and the verify summary.
The invalid-path messages and resolved argv match the actual
`scripts/launch-editor.sh`, and the restart/crash sections correctly reflect
ADR-0006 D5/D6. The changeset stays strictly within the documentation/artifact
scope — no application source, launcher script, harness, or dependency manifests
were touched, and code-server was kept out of the repository. All linked targets
(`docs/README.md`, the ADR, `tests/launcher/`, the README launch anchor) resolve.
The single finding is a non-blocking nit. Verdict: **APPROVE**.

## Suggested Follow-ups

- Consider the deferred `./harness doctor` code-server-readiness diagnostic
  (degraded, never fail) noted in §7 and ADR-0006 D7, and a future
  browser/renderer memory profile to complete PRD §25 Risk 2 — both already
  correctly scoped out of #9.
