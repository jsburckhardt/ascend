# Verify Summary — #9

## Feature Overview

**Issue:** #9 — Capture startup and resource measurements

Issue #9 delivers the Prototype-0 evidence baseline: a single, real capture of the
startup cost and idle resource footprint of **one** `code-server` editor session
launched through Ascend's sanctioned seam (`PROJECT_PATH=<dir> ./harness edit`). The
deliverable is `docs/prototype-0/startup-and-resource-measurements.md`, whose sections
§3–§6 map one-to-one to the four acceptance criteria (startup command + duration; idle
memory + CPU; version + storage locations; restart / invalid-path / crash behaviour),
with a measurement-environment section (§2) and a caveats/follow-ups section (§7). It is
linked from `docs/README.md`, and two append-only T5 friction-resolution entries were
added to `.harness/friction.jsonl`. This is a documentation/measurement story governed by
ADR-0006 — it consumes the launcher/`edit` verb already decided in issue #7 and introduces
**no new ADR, no core-component, and no application-source, test, script, or harness
change**. All four acceptance criteria are met with concrete recorded values.

## Branch & PR

| Field | Value |
|-------|-------|
| Branch | `docs/9-startup-resource-measurements` |
| PR | [docs: capture Prototype-0 startup and resource measurements (#9)](https://github.com/jsburckhardt/ascend/pull/22) |

## Commits

All commits are Conventional-Commits, carry the `Co-authored-by: Copilot` and
`Copilot-Session` trailers, are SSH-signed, and report **Verified** on GitHub
(`verification.verified = true`, `reason = valid`).

| Hash | Message | Signature |
|------|---------|-----------|
| `98325d0` | docs(issue-9): capture Prototype-0 startup and resource measurements | SSH-signed · Verified |

The verify summary itself is recorded in a further signed `docs(issue-9): add verify
summary for #9` commit (also SSH-signed / Verified).

## Acceptance Criteria

| Status | Criterion | Evidence |
|--------|-----------|----------|
| ✅ passed | AC1 — Startup command and startup duration are documented | §3 of the evidence doc: seam invocation `PROJECT_PATH=/tmp/demo-proj-9 EDITOR_PORT=8129 ./harness edit`, resolved isolated argv `code-server /tmp/demo-proj-9 --bind-addr 127.0.0.1:8129 --auth none`, and measured durations — **0.647 s** to TCP bind, **0.670 s** to first `GET /healthz → 200`, **~0.030 s** code-server internal init — with the captured startup banner. |
| ✅ passed | AC2 — Memory use and idle CPU for one session are documented | §4: idle RSS **≈153 MiB** (code-server node tree) / **≈218 MiB** (full resident chain incl. `npm`/`sh` wrappers), stable across 5 samples; idle CPU **~0.0 %** via `top -b` and a `/proc/<pid>/stat` 0-tick delta over 5 s; browser/renderer memory explicitly scoped out (PRD §25 Risk 2). |
| ✅ passed | AC3 — Editor version, extension storage location, and workspace-state location are recorded | §5: version `4.129.0 … with Code 1.129.0`; extension storage `/home/vscode/.local/share/code-server/extensions`; workspace-state/`User` dir `/home/vscode/.local/share/code-server/User`; user-data root confirmed against the startup banner (`Using user-data-dir …`), not assumed defaults. |
| ✅ passed | AC4 — Behaviour after restart, with an invalid path, and on editor crash is documented | §6: restart re-binds the same port cleanly with persisted user-data/`machineid` state; a five-row invalid-`PROJECT_PATH` table (read-only, fail-fast, non-zero exits, target never created) cross-referenced to `tests/launcher/`; `kill -9` frees the port with **no supervision/restart** (ADR-0006 D6). |

All four acceptance criteria are met; none failed or remains not-verifiable. The issue #9
checkboxes for all four criteria are checked.

## ADRs & Core-Components

No new ADR or core-component is introduced by this story. Referenced (consumed, not
modified):

| ID | Title |
|----|-------|
| ADR-0006 | code-server launch and project-path safety (governing decision) |
| ADR-0005 | Application-serve runtime (Ascend `node:http` server is a separate process — excluded from all figures) |
| ADR-0004 | Interactive/handoff verbs (`mode: exec`) — the measured `edit` handoff |
| ADR-0003 | `./harness` as the single operating surface |
| ADR-0002 | Dependency-light architecture (no capture tooling added) |

## Verification Results

| Category | Command | Status |
|----------|---------|--------|
| Aggregate gate | `./harness verify` | degraded — non-blocking, exit 0 (typecheck=pass, test=pass, lint/build=unknown, doctor=pass) |
| Harness status | `./harness status` | pass |
| Harness health | `./harness doctor` | pass (node v22.17.1 ≥ 22.6.0, node_modules present) |
| Harness regression | `sh tests/harness/run.sh` | pass — PASS=43 FAIL=0 SKIP=0 |

The `.github/soft-factory/verification.yml` gate routes through `./harness verify`; a
`degraded` verdict with exit 0 is the accepted, non-blocking Prototype-0 posture per the
harness exit-code contract (same posture as issues #6 and #7). No application source,
tests, scripts, or harness were modified.

## Environment Caveats

- **Transient code-server 4.129.0.** `code-server` is a documented prerequisite, not a
  repository dependency (ADR-0006 D7), and is absent in this dev container/CI
  (`launch-editor.sh` exits 127 when it is missing). To capture the measurements it was
  provisioned transiently outside the repo tree (standalone installer into `/tmp/cs`),
  exactly as issue #7's live demo did, and removed after capture. Nothing about the repo
  dependency set changed.
- **`package-lock.json` left unchanged (proxy/`npm ci` caveat).** The working npm registry
  here is the Microsoft proxy; `npm install` succeeds through it but a local install would
  rewrite the lock with environment-specific proxy URLs plus pre-existing `@types/node`
  drift inherited from issue #6. Because #9 changed no dependencies and committing
  proxy-specific URLs would degrade the lock for other environments, the lock was kept at
  its committed state (same caveat as issue #7). `node_modules` is pre-installed and
  gitignored, so the gate runs against it directly.
- **Single-shot, single-session baseline.** The recorded numbers are one capture for the
  specific dev container in §2 and are not a benchmark; multi-session profiling and
  browser/renderer memory are deferred to later stories feeding the Prototype-0 review.

## Generated At

2026-07-21T08:07:00Z
