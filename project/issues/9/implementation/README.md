# Implementation Notes — Issue #9

**Story:** Capture startup and resource measurements (Prototype 0). A
**measurement + documentation** story — **no ADRs/core-components created, no
application source changed**. Deliverable: a Prototype-0 evidence document with
**real captured** measurements.

## Deliverable

- **`docs/prototype-0/startup-and-resource-measurements.md`** (new) — §1 Purpose
  & scope, §2 Environment, §3 Startup (AC1), §4 Resource usage (AC2), §5 Version
  & storage (AC3), §6 Operational behaviour (AC4), §7 Caveats & follow-ups.
- Linked from **`docs/README.md`** (new "Prototype 0 evidence" entry) — T3.

## Measurement method (that worked)

code-server is a **documented prerequisite** and is **absent** here
(`command -v code-server` → none; `./harness edit` exits **127**). It was
provisioned **transiently, outside the repo tree** (ADR-0006 D7), exactly as
issue #7 did:

```bash
curl -fsSL https://code-server.dev/install.sh | sh -s -- --method standalone --prefix /tmp/cs
export PATH="/tmp/cs/bin:$PATH"   # measurement shell only
```

→ standalone **code-server 4.129.0** at `/tmp/cs`. Measured **one idle session**
through the sanctioned seam against a throwaway populated dir `/tmp/demo-proj-9`:

```bash
PROJECT_PATH=/tmp/demo-proj-9 EDITOR_PORT=8129 ./harness edit
```

code-server was **never** added to `package.json`/`package-lock.json`, never
committed, and was **removed after capture** along with `/tmp/demo-proj-9` and
`~/.cache/code-server`. Capture tools: `date +%s.%N`, `/dev/tcp` poll + `curl
/healthz`, `ps`/`ss`/`top -b`/`/proc/<pid>/stat`, `sha256sum`.

## Environment

Ubuntu 24.04.4 LTS · kernel `6.18.…-microsoft-standard-WSL2` x86_64 (WSL2 dev
container) · i7-13800H · 20 logical CPUs · 31 GiB RAM · Node **v22.17.1** ·
code-server **4.129.0 … with Code 1.129.0** · captured 2026-07-21 ~07:51–07:55Z.

## Key captured numbers (raw evidence)

- **AC1 — Startup.** Isolated argv: `code-server /tmp/demo-proj-9 --bind-addr
  127.0.0.1:8129 --auth none`. Wall-clock launch→TCP bind **0.647 s**;
  launch→first `GET /healthz` `200` **0.670 s**; code-server internal init
  (banner delta) **~0.030 s**.
- **AC2 — Resource (idle, no browser client).** code-server node process tree
  RSS **≈153 MiB** (156,624 KiB), stable over 5 samples / ~20 s; full resident
  chain incl. `npm`/`sh` wrappers **≈218 MiB**. Idle CPU **~0.0 %** (`top` 0.0 %;
  `/proc` utime+stime delta **0 ticks over 5 s**). Browser/renderer memory **out
  of scope** (PRD §25 Risk 2); Ascend `node:http` server is a separate process,
  not included.
- **AC3 — Version & storage.** Version `4.129.0 77baee7… with Code 1.129.0`.
  Extension storage `/home/vscode/.local/share/code-server/extensions`
  (`extensions.json` = `[]`). Workspace-state / `User` dir
  `/home/vscode/.local/share/code-server/User` (`History/`, `globalStorage/`;
  `workspaceStorage/` created when a client opens a workspace). User-data root
  `/home/vscode/.local/share/code-server`; config
  `/home/vscode/.config/code-server/config.yaml`. Paths verified by listing what
  exists on host + startup banner (not doc defaults).
- **AC4 — Operational.**
  - *Restart:* `SIGTERM` frees port; relaunch on same `EDITOR_PORT=8129`
    re-binds cleanly (new listener PID 879138→879423), `healthz` 200; `User/`
    entries + `machineid` **persist** (durable user-data dir).
  - *Invalid path:* unset/empty → exit **1** (`PROJECT_PATH is not set…`);
    nonexistent → exit **1** (`…does not exist…`, **not** created); file → exit
    **1** (`…is not a directory…`); code-server absent → exit **127**. Project
    dir **byte-identical** (recursive SHA-256) before/after — read-only guarantee
    (ADR-0006 D5) held. Cross-referenced by `tests/launcher/` TEST-L1..L4/L6 +
    README invalid-path table.
  - *Crash:* `kill -9` code-server main node → port **freed**, all code-server +
    wrapper procs exit (log `Killed`), **no supervision/restart** (ADR-0006 D6);
    recovery is a manual relaunch.

## Verification (test plan VC1–VC8)

| Check | Result |
|-------|--------|
| VC1 AC1 startup command + duration | ✅ §3 records isolated argv + measured 0.647 s / 0.670 s |
| VC2 AC2 memory + idle CPU | ✅ §4 ≈153 MiB / ~0.0 %, host-vs-browser noted |
| VC3 AC3 version + storage paths | ✅ §5 version + two resolved paths (observed on host) |
| VC4 AC4 restart / invalid-path / crash | ✅ §6 all three as concrete observations |
| VC5 Environment recorded | ✅ §2 host/CPU/RAM/OS/Node/code-server + transient provisioning + Prototype-0 baseline label |
| VC6 Discoverable / links resolve | ✅ linked from `docs/README.md`; all relative links verified to resolve |
| VC7 `./harness verify` degraded / exit 0 | ✅ `typecheck=pass`, `test=pass`, `doctor=pass`, `lint`/`build` `unknown` → **degraded, exit 0** |
| VC8 No application source added | ✅ `git diff --name-only` limited to `docs/`, `project/issues/9/`, `.harness/friction.jsonl` |

`./harness verify` verdict: **degraded (exit 0)** — the accepted Prototype-0
posture. `npm install` was run so `tsc --noEmit` could execute; the proxy-induced
`package-lock.json` change was **reverted** (`git checkout -- package-lock.json`),
matching issue #7's caveat — no lockfile change is committed.

## Friction (T5, append-only)

Two resolution entries appended via `./harness friction add` (verbs `edit` and
`doctor`) recording that #9 resolved the research inferences: measurement
required a transiently-provisioned code-server because no harness verb proves
editor-provider readiness / captures resource metrics, and the PRD §18 evidence
dimensions + `docs/` deliverable path were inferred, not proved. (A prior #9
research-stage entry at 07:40Z is retained; no prior lines edited.)

## Change set / no-source-change confirmation

Changed paths only: `docs/prototype-0/startup-and-resource-measurements.md`
(new), `docs/README.md` (link), `.harness/friction.jsonl` (append-only),
`project/issues/9/` (RPIV artifacts). **Untouched:** `src/`, `scripts/`,
`harness`, `.harness/contract.yml`, `package.json`, `package-lock.json`
(confirmed via `git diff --name-only`). code-server was never added as a
dependency; all transient artifacts (`/tmp/cs`, `/tmp/demo-proj-9`,
`~/.cache/code-server`) were removed.
