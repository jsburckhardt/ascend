# Prototype 0 — code-server startup and resource measurements

> **What this is.** Real, captured measurements of the startup cost and idle
> resource footprint of **one** `code-server` editor session launched through
> Ascend's sanctioned seam (`PROJECT_PATH=<dir> ./harness edit`). It gives the
> upcoming Prototype 0 review (PRD §29 item 7) and the resource-usage risk
> analysis (PRD §25 **Risk 2**) concrete numbers for a single session before any
> multi-session / runtime-model strategy is chosen.
>
> **What this is not.** This is a **single-session Prototype-0 baseline**, not a
> multi-session load benchmark and not a representative production profile. The
> numbers are **environment-specific** (the dev container recorded in §2) and
> were captured once; treat them as an order-of-magnitude baseline, not a
> guarantee. (Same caveat posture as `project/issues/7/verify/summary.md`.)

Related issue: **#9** — Capture startup and resource measurements (parent
Prototype 0 feature #2). Governing decision: **ADR-0006**
([code-server launch and project-path safety](../../project/architecture/ADR/ADR-0006-code-server-launch-and-project-path-safety.md)).
This story introduces **no new ADR, no core-component, and no application source
change** — it consumes the launcher/verb already decided by ADR-0006 (issue #7)
and records observations.

---

## 1. Purpose & scope

- Records the **startup command + duration** (AC1), **memory + idle CPU** for one
  idle session (AC2), the **editor version + storage locations** (AC3), and the
  observed **restart / invalid-path / crash** behaviour (AC4) of a single
  `code-server` session.
- One **idle** session only. No concurrent sessions, no synthetic editing load,
  no browser-client interaction load. Browser/renderer memory is **out of scope**
  for this baseline (see §4 and PRD §25 Risk 2).
- Consumes the seam fixed by ADR-0006:
  `PROJECT_PATH=<dir> ./harness edit` → `npm run edit` →
  `sh scripts/launch-editor.sh` →
  `code-server "$PROJECT_PATH" --bind-addr 127.0.0.1:${EDITOR_PORT:-8080} --auth none`.
- References: PRD §14.2 (host process runtime), §18 (evidence dimensions),
  §25 Risk 2 (resource usage), §29 (Prototype 0 review); ADR-0006 (D4 config,
  D5 read-only fail-fast, D6 exec handoff / no supervision, D7 documented
  prerequisite / transient provisioning); ADR-0005 (the Ascend `node:http`
  server is a **separate** process — none of the numbers below include it);
  ADR-0004 (`mode: exec` handoff); ADR-0003 (`./harness` is the operating
  surface); ADR-0002 (dependency-light — no capture tooling added).
- Discoverability: linked from [`docs/README.md`](../README.md); the launch seam
  it measures is documented in the README
  [“Launch the editor (code-server)”](../../README.md#launch-the-editor-code-server)
  section, and the read-only / invalid-path behaviour is covered by the
  code-server-free suite under [`tests/launcher/`](../../tests/launcher/).

---

## 2. Measurement environment

| Dimension | Value |
|-----------|-------|
| Date/time of capture (UTC) | 2026-07-21, ~07:51–07:55Z |
| OS | Ubuntu 24.04.4 LTS |
| Kernel | `6.18.33.2-microsoft-standard-WSL2` (x86_64, WSL2 dev container) |
| CPU | 13th Gen Intel(R) Core(TM) i7-13800H |
| Logical CPUs (`nproc`) | 20 |
| Total RAM (`free -h`) | 31 GiB (≈16 GiB available at capture) |
| Node (`node --version`) | v22.17.1 |
| code-server (`code-server --version`) | `4.129.0 77baee7fe06f7031d45e6acf903c9b4b329e10c4 with Code 1.129.0` |
| User / `$HOME` | `vscode` / `/home/vscode` |

**How code-server was provided (transiently — never a repo dependency, ADR-0006
D7).** code-server is **not** bundled with Node/npm and is **absent** in this
dev container/CI (`command -v code-server` → none; the launcher exits **127**).
It was provisioned transiently, **outside the repo tree**, exactly as issue #7
did:

```bash
curl -fsSL https://code-server.dev/install.sh | sh -s -- --method standalone --prefix /tmp/cs
export PATH="/tmp/cs/bin:$PATH"   # only for the measurement shell
```

This installed the standalone **4.129.0** release into `/tmp/cs/`. It was **not**
added to `package.json` / `package-lock.json`, **not** committed, and was removed
after capture (§7). Nothing about the repository dependency set changed.

**Measured project.** A throwaway **populated** directory `/tmp/demo-proj-9`
containing `README.md` and `index.js` (also removed after capture).

**Capture tools (dependency-light, ADR-0002).** `date +%s.%N` (wall-clock start),
a `/dev/tcp` port poll and `curl … /healthz` (bind/HTTP readiness), `ps`, `ss`,
`top -b`, and `/proc/<pid>/stat` for RSS/CPU, and `sha256sum` for the read-only
snapshot. No profiling framework was introduced.

> All numbers below are a **Prototype-0 single-session baseline** for the
> environment above, captured once. They are not a benchmark.

---

## 3. Startup (AC1)

**Invocation (through the seam, non-default port `8129` to avoid clashes):**

```bash
PROJECT_PATH=/tmp/demo-proj-9 EDITOR_PORT=8129 ./harness edit
```

**Exact isolated startup command the launcher execs** — every code-server flag
lives only in `scripts/launch-editor.sh` (PRD §5.7), so the resolved argv is:

```
code-server /tmp/demo-proj-9 --bind-addr 127.0.0.1:8129 --auth none
```

Observed process argv (`ps`), showing the launcher’s single isolated invocation
(the standalone build execs its own bundled node):

```
/tmp/cs/lib/code-server-4.129.0/lib/node /tmp/cs/lib/code-server-4.129.0 \
  /tmp/demo-proj-9 --bind-addr 127.0.0.1:8129 --auth none
```

This matches `scripts/launch-editor.sh` line 61 with `EDITOR_PORT=8129`
substituted; no extra flags leaked in from the harness/npm layer. `./harness
edit --print` resolves to `npm run edit` and `./harness edit --json` emits the
`mode: exec` handoff descriptor (no verdict), as expected for an interactive
handoff verb.

**Measured startup duration** (method: timestamp before launch → poll until the
port binds / first `GET /healthz` succeeds):

| Marker | Duration from launch |
|--------|----------------------|
| Wall-clock: `./harness edit` invoked → TCP `127.0.0.1:8129` accepts | **0.647 s** |
| Wall-clock: `./harness edit` invoked → first `GET /healthz` → `200` | **0.670 s** |
| code-server internal init (its own banner, log-timestamp delta) — process start → `HTTP server listening` | **~0.030 s** |

The wall-clock figure (~0.65 s) is the user-visible “time to reachable editor
server” and includes the `npm` + `sh` wrapper spawn plus node startup; the ~30 ms
internal delta is code-server’s own initialisation once its node process is
running. Startup banner captured:

```
[2026-07-21T07:51:15.024Z] info  code-server 4.129.0 77baee7fe06f7031d45e6acf903c9b4b329e10c4
[2026-07-21T07:51:15.025Z] info  Using user-data-dir /home/vscode/.local/share/code-server
[2026-07-21T07:51:15.054Z] info  Using config file /home/vscode/.config/code-server/config.yaml
[2026-07-21T07:51:15.054Z] info  HTTP server listening on http://127.0.0.1:8129/
[2026-07-21T07:51:15.054Z] info    - Authentication is disabled
[2026-07-21T07:51:15.055Z] info  Session server listening on /home/vscode/.local/share/code-server/code-server-ipc.sock
```

---

## 4. Resource usage — one session, idle (AC2)

Measured with **no browser client connected** (server up and idle). The
code-server process tree from this launch was two node processes:

- `code-server` launcher/main node (`… code-server-4.129.0 /tmp/demo-proj-9 …`)
- `code-server` HTTP entry worker (`… code-server-4.129.0/out/node/entry`)

plus the thin `npm run edit` / `sh` wrapper chain that stays resident because the
handoff is `exec`-chained.

**Memory (RSS), idle:**

| Scope | RSS |
|-------|-----|
| code-server node process tree (the 2 code-server node processes) | **≈ 153 MiB** (156,624 KiB) |
| Full resident chain incl. `npm run edit` + `sh` wrappers | **≈ 218 MiB** (222,796 KiB) |

RSS was **stable** across five samples over ~20 s (no growth at idle).

**Idle CPU:** **~0.0 %.** `top -b` reported `0.0 %` for both code-server
processes, and a `/proc/<pid>/stat` `utime+stime` delta measured **0 ticks over
5 s** (`CLK_TCK=100`) → **0.00 %**. (`ps pcpu` shows a small lifetime-average
figure — ~1.2–1.8 % declining over time — because it amortises the one-off
startup burst over the process lifetime; the instantaneous idle value is ~0 %.)

**Host-process vs browser (PRD §25 Risk 2).** The numbers above are the
**host-side code-server process** footprint only. The **browser/renderer** memory
of the VS Code Workbench (which loads in the client) was **not** measured and is
**out of scope** for this single-session baseline — PRD §25 Risk 2 lists both
dimensions, and a browser-side profile is deferred to a later measurement story.
The Ascend `node:http` shell (ADR-0005) is a **separate process** and is **not**
included in any figure here.

---

## 5. Version & storage locations (AC3)

**Editor version** (`code-server --version`, observed on the measured host):

```
4.129.0 77baee7fe06f7031d45e6acf903c9b4b329e10c4 with Code 1.129.0
```

**Resolved storage locations** (verified by listing the directories that exist on
this host after launch — these are the **actual resolved** paths, confirmed
against code-server’s startup banner `Using user-data-dir …`, not assumed
documentation defaults):

| Kind | Resolved absolute path (this host) | Notes |
|------|-------------------------------------|-------|
| User-data dir (root) | `/home/vscode/.local/share/code-server` | From banner `Using user-data-dir …`; contains `Machine/`, `User/`, `extensions/`, `logs/`, `machineid`, `coder.json`, `code-server-ipc.sock`. |
| **Extension storage** | `/home/vscode/.local/share/code-server/extensions` | code-server’s default `--extensions-dir`. `extensions.json` = `[]` (no extensions installed for this baseline). |
| **Workspace-state / `User` dir** | `/home/vscode/.local/share/code-server/User` | Holds `History/`, `globalStorage/`; a `workspaceStorage/` subdir is created when a client actually opens a workspace (not present in this no-client baseline). |
| Config file | `/home/vscode/.config/code-server/config.yaml` | Present on host; the launcher’s `--auth none` / `--bind-addr` override its defaults. (Contents not reproduced here — the file holds a generated password.) |

The `machineid` (`/home/vscode/.local/share/code-server/machineid`) persisted
across restarts (§6), confirming the user-data dir is the durable state root.

---

## 6. Operational behaviour (AC4)

### 6.1 Restart

Stopping the session (`SIGTERM` to the code-server listener process) freed the
loopback port immediately. Relaunching with the **same** `EDITOR_PORT=8129`
**re-bound cleanly** — a **new** process (listener PID `879138` → `879423`),
`GET /healthz` → `200`. Because the user-data dir is fixed
(`/home/vscode/.local/share/code-server`), **workspace/session state persisted**
across the restart: the `User/` directory entries were **identical** before and
after, and `machineid` was unchanged. There is no automatic restart — the
operator relaunches via the same `./harness edit` command.

### 6.2 Invalid `PROJECT_PATH` (read-only, fail-fast, non-zero — ADR-0006 D5)

Every invalid case failed **before any code-server launch attempt**, printing a
clear stderr message and exiting **non-zero**, and **never** mutating/creating
the target (cross-referenced by the code-server-free suite
[`tests/launcher/`](../../tests/launcher/) TEST-L1..L4/L6 and the README
[invalid-path table](../../README.md#launch-the-editor-code-server)):

| Case | Observed stderr (first line) | Exit |
|------|------------------------------|------|
| `PROJECT_PATH` unset | `launch-editor: PROJECT_PATH is not set or is empty.` | `1` |
| `PROJECT_PATH` empty | `launch-editor: PROJECT_PATH is not set or is empty.` | `1` |
| `PROJECT_PATH` does not exist (`/tmp/does-not-exist-9`) | `launch-editor: PROJECT_PATH does not exist: /tmp/does-not-exist-9` | `1` |
| `PROJECT_PATH` is a file (`…/README.md`) | `launch-editor: PROJECT_PATH is not a directory: …/README.md` | `1` |
| `code-server` absent on `PATH` | `launch-editor: code-server not found on PATH.` | `127` |

The nonexistent path was confirmed **not created** (the launcher issues no
`mkdir`). After all launches/stops the measured project directory
`/tmp/demo-proj-9` was **byte-for-byte identical** (recursive `sha256sum` before
vs after matched) — the ADR-0006 D5 read-only guarantee held.

### 6.3 Editor crash (`kill -9`, no supervision — ADR-0006 D6)

`kill -9` on the running code-server main node process caused the whole handoff
chain to exit: the loopback port `8129` was **freed** (no listener), **all**
code-server processes were gone, and the `npm`/`sh` wrapper chain exited too —
the run log ended with `Killed`. **No supervision or restart occurred** (ADR-0006
D6): the `mode: exec` handoff simply propagates the exit; recovery is a manual
relaunch. This matches the design — the launcher adds no process supervision,
restart, or health probing (deferred scope).

---

## 7. Caveats & follow-ups

- **Not representative / single-shot.** These are one-session, single-capture
  numbers for the specific dev container in §2. RSS, idle CPU, and startup time
  will vary with host, disk, extensions installed, and whether a browser client
  is connected. Do not extrapolate to N concurrent sessions.
- **Browser memory unmeasured.** Only the host-side code-server process footprint
  was measured; the VS Code Workbench renderer (browser) memory — the other half
  of PRD §25 Risk 2 — is deferred to a dedicated measurement story.
- **No readiness diagnostic in the harness.** `./harness doctor` proves only
  Node/toolchain health and is **silent** on code-server; the launcher exits 127
  when code-server is absent. Measuring therefore required a **transiently
  provisioned** code-server. A future `doctor` code-server-readiness diagnostic
  (degraded, never fail) is **deferred** per ADR-0006 D7.
- **No capture/measure verb.** There is no harness verb that captures runtime
  resource metrics; the numbers here were gathered manually with standard tools
  (§2). Adding a capture verb is a possible future, non-blocking follow-up.
- **Feeds the Prototype 0 review** (PRD §29 item 7) and the Risk 2 analysis. A
  multi-session / runtime-model strategy is out of scope for #9 and should be
  chosen in that review using this baseline plus a browser-side profile.
