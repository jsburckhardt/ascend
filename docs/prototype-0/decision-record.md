# Prototype 0 — decision record

> **What this is.** The mandatory Prototype 0 **decision record** required by
> PRD §28.2 (and listed as PRD §29 Prototype 0 item 7). It consolidates the
> scattered per-issue evidence from the six preceding Prototype 0 stories
> (#3–#9) into one durable, discoverable artifact and records an **explicit
> continue / change / stop decision** with a next-step recommendation for
> Prototype 1. Per PRD §28.1, whether Prototype 1 is planned is gated on this
> record.
>
> **What this is not.** It makes **no new architectural decision** and creates
> **no new mechanism, seam, runtime, verb, ADR, or core-component**. Every
> Prototype 0 architecture decision already exists and is Accepted as
> **ADR-0002..ADR-0006** (plus CORE-COMPONENT-0002/0003) in
> [`DECISION-LOG.md`](../../project/architecture/ADR/DECISION-LOG.md); this
> record **recites and references** them. Issue #10 is a *review + synthesis*
> story — the issue itself states **"Tests: N/A — review and documentation
> story."**

- **Issue:** #10 — Review Prototype 0 evidence and record the decision
- **Parent feature:** #2 · **Umbrella epic:** #1
- **PRD anchors:** §28.1 (generate stories by prototype), §28.2 (every prototype
  requires a decision story), §29 (Prototype 0 item 7)

---

## 1. Header & context

**Prototype 0 objective** (PRD Prototype 0 §Objective): create the smallest
possible greenfield repository for testing Ascend concepts **without migrating
the original DevDeck implementation**.

Prototype 0 asked **four questions** (PRD Prototype 0 §Questions):

1. **Q1** — Can Ascend be developed independently (no DevDeck migration)?
2. **Q2** — Can `code-server` be launched reliably against an arbitrary local path?
3. **Q3** — What is the minimum environment required?
4. **Q4** — Does editing through `code-server` modify the existing project files
   directly and safely?

The evidence to answer these now exists across the shipped Prototype 0 stories
(#3–#9) but was scattered across per-issue artifacts. This record consolidates
it so the program can proceed to Prototype 1 (or change/stop) on an
evidence-based footing rather than by assumption (the issue's stated Risk:
"Proceeding without evidence-based justification").

---

## 2. Findings (AC1)

Per-question answers, each citing concrete evidence.

### Q1 — Ascend can be developed independently (no DevDeck migration) — **YES**

Issue **#3** bootstrapped Ascend as an independent greenfield Node.js +
TypeScript baseline: a minimal `package.json` + `tsconfig.json` manifest with
Node 22 pinned via `engines` (`>=22 <23`) and `.nvmrc`, a committed
`package-lock.json`, a tracked `src/` placeholder, and a README stating the
product boundary (Ascend orchestrates; VS Code / code-server provides the IDE).
`npm install` is the single documented setup entry point; `npm install` and
`npm run typecheck` both exit 0. No DevDeck code, config, or naming was migrated.

- Evidence: [`project/issues/3/verify/summary.md`](../../project/issues/3/verify/summary.md),
  `package.json`, `tsconfig.json`, `.nvmrc`, [`README.md`](../../README.md).
- Decision: **ADR-0002**.

### Q2 — `code-server` can be launched reliably against an arbitrary path — **YES**

Issue **#7** delivered Ascend's first editor-provider integration: a
dependency-light POSIX launcher (`scripts/launch-editor.sh`) that starts **one**
`code-server` process against a configured `PROJECT_PATH`, surfaced through the
harness as the `mode: exec` `edit` verb (`./harness edit` / `npm run edit`).
Every code-server-specific flag is isolated behind the single launcher seam
(PRD §5.7); the launcher binds loopback and hands off via `exec` so code-server's
exit code propagates with no added supervision. AC1–AC3 (browser reachable,
terminal, editor) were demonstrated live against a real code-server; the
path-safety criteria (AC4–AC5) are covered by a code-server-free automated suite.

- Evidence: [`project/issues/7/verify/summary.md`](../../project/issues/7/verify/summary.md),
  `scripts/launch-editor.sh`, [`tests/launcher/`](../../tests/launcher/).
- Decision: **ADR-0006**.

### Q3 — Minimum environment is small and dependency-light — **ESTABLISHED**

The minimum environment is **Node.js 22 LTS + npm** (ADR-0002) with a
dependency-free `node:http` application runtime (ADR-0005) and **code-server as
a documented external prerequisite** — never a repo dependency (ADR-0006 D7).
Issue **#6** delivered the minimal Ascend shell: `src/server.ts` serves
`GET /` (thin HTML shell), `GET /health` → `200 {"status":"ok"}`, and `404`
otherwise, running directly under `node --experimental-strip-types` (Node
≥22.6.0 floor) — no web framework and no build step. Issue **#5** wired the dev
inner loop (`./harness dev` → `npm run dev` = `tsc --noEmit --watch`) and the
validation command (`./harness verify` → `npm run typecheck`). Issue **#9**
captured the concrete single-session resource baseline (see §3).

- Evidence: [`project/issues/5/verify/summary.md`](../../project/issues/5/verify/summary.md),
  [`project/issues/6/verify/summary.md`](../../project/issues/6/verify/summary.md),
  `src/server.ts`, `src/main.ts`,
  [`startup-and-resource-measurements.md`](startup-and-resource-measurements.md).
- Decisions: **ADR-0005** (runtime), **ADR-0002** (stack), **ADR-0004** (dev handoff).

### Q4 — Editing through `code-server` modifies files in place and safely — **YES**

Issue **#8** confirmed that editing a file through the code-server launcher
modifies the original filesystem path **directly and safely**. AC1/AC2/AC4
mechanics are proven by code-server-free `node:test` cases (TEST-L9..L12, all
green), and the zero-mutation guarantee holds. The real user-edit round-trip
(AC1–AC3) was demonstrated **live on 2026-07-21** against a transiently
provisioned code-server 4.129.0: a real browser drove the running Workbench to
edit and save a file (marker landed on the original path, inode preserved), a
real integrated terminal ran in the project cwd, and before/after-stop snapshots
were byte-identical (recursive `lstat` + SHA-256). File mode `0644` and owner
`vscode:vscode` were preserved.

- Evidence: [`project/issues/8/verify/summary.md`](../../project/issues/8/verify/summary.md),
  [`project/issues/8/implementation/README.md`](../../project/issues/8/implementation/README.md),
  [`tests/launcher/`](../../tests/launcher/).
- Decision: **ADR-0006** (D5 read-only project-path safety).

---

## 3. Measurements (AC1)

The Prototype 0 **single-session baseline** captured in issue **#9**, copied
faithfully from
[`startup-and-resource-measurements.md`](startup-and-resource-measurements.md)
(the authoritative source; no figure below is overstated).

| Dimension | Value |
|-----------|-------|
| Startup — `./harness edit` invoked → TCP `127.0.0.1:8129` accepts | **0.647 s** (~0.65 s wall-clock) |
| Startup — invoked → first `GET /healthz` → `200` | **0.670 s** |
| code-server internal init (process start → `HTTP server listening`) | **~0.030 s** (~30 ms) |
| Memory — code-server node process tree, idle | **≈ 153 MiB** (156,624 KiB) |
| Memory — full resident chain incl. `npm run edit` + `sh` wrappers | **≈ 218 MiB** (222,796 KiB) |
| Idle CPU (instantaneous, `top -b` + `/proc/<pid>/stat` delta) | **~0.0 %** |
| code-server version | **`4.129.0`** (`77baee7…` with Code 1.129.0) |
| Resolved user-data / storage root | `/home/vscode/.local/share/code-server` (`extensions/`, `User/`, `logs/`, `machineid`) |
| Config file | `/home/vscode/.config/code-server/config.yaml` |

Operational behaviour (AC4 of #9): restart re-binds cleanly with workspace/session
state persisted (fixed user-data dir); an invalid `PROJECT_PATH` fails read-only
and fast, non-zero, without mutating/creating the target; `kill -9` frees the
port with all code-server processes gone and **no supervision or restart**
(ADR-0006 D6).

> **Caveat (carried over from the #9 baseline).** These are **single idle
> session, single-capture, environment-specific** numbers — a Prototype-0
> order-of-magnitude baseline, **not** a multi-session load benchmark and not a
> representative production profile. Browser/renderer memory (the other half of
> PRD §25 Risk 2) was **not** measured and is deferred. Do not extrapolate to N
> concurrent sessions.

---

## 4. Screenshots / demo notes (AC1)

No new screenshots are required (PRD §28.2 accepts "screenshots **or** demo
notes"); the live demonstrations were captured during the source stories.

- **#7 — live code-server launch (AC1–AC3).** `PROJECT_PATH=<dir> ./harness edit`
  launched a single code-server against the configured folder; a browser reached
  the running Workbench, the integrated terminal worked, and the file was
  editable. Captured evidence lives under
  [`project/issues/7/implementation/README.md`](../../project/issues/7/implementation/README.md).
- **#8 — live edit/save round-trip + integrated terminal (2026-07-21).** A real
  browser drove the Workbench to edit and save `AC1.txt`; Ctrl+S landed the
  marker on the original path (`/tmp/demo-proj8/AC1.txt`) with the inode
  preserved; a real integrated terminal ran in the project cwd; pre-stop vs
  post-stop recursive snapshots were byte-identical. Captured evidence lives
  under [`project/issues/8/implementation/README.md`](../../project/issues/8/implementation/README.md)
  (§4.6/§5/§6) and [`project/issues/8/verify/summary.md`](../../project/issues/8/verify/summary.md).

---

## 5. Problems encountered (AC2)

Drawn from the honest capability gaps recorded in
[`.harness/friction.jsonl`](../../.harness/friction.jsonl) across #7/#8/#9 and
the #9 measurements doc §7:

- **`./harness doctor` is silent on editor-provider readiness.** `doctor` proves
  only Node/toolchain health (and reports `degraded` when `node_modules` is
  missing); it says nothing about whether code-server is present or launchable.
- **code-server is absent in the devcontainer / CI.** `command -v code-server`
  finds nothing, so the launcher exits **127** (`code-server not found on
  PATH.`). Every launch/measurement therefore required a **transiently
  provisioned** code-server (standalone 4.129.0 into `/tmp/cs`, outside the repo
  tree, never added to `package.json`/`package-lock.json`) — consistent with
  ADR-0006 D7 treating code-server as a documented prerequisite.
- **No capture/measure verb.** There is no harness verb that captures runtime
  resource metrics; the #9 numbers were gathered manually with standard tools
  (`date`, `/dev/tcp` poll, `ps`, `ss`, `top -b`, `/proc/<pid>/stat`,
  `sha256sum`). A capture verb is a possible non-blocking future follow-up.
- **No prototype-review / decision verb.** No harness verb reviews prototype
  evidence or emits a continue/change/stop verdict, so this record's deliverable
  path and section structure were inferred from PRD §28.2/§29 and on-disk prior
  art (recorded as friction for #10; see §5 note and the friction log).

None of these is a blocker; all are honest, non-`fail` gaps consistent with the
accepted Prototype-0 `degraded` posture (CORE-COMPONENT-0003).

---

## 6. Assumptions disproved / confirmed (AC2)

- **Disproved — "code-server must be a repo dependency."** It need **not** be.
  code-server works as a **documented external prerequisite** provisioned
  transiently outside the repo tree (ADR-0006 D7, proven by #7/#8/#9); the repo
  dependency set never changed.
- **Confirmed — editing is in place, not import/copy.** Editing through
  code-server writes the **original** filesystem path directly (inode preserved,
  mode/owner preserved), with **zero mutation** on stop (#8). There is no
  import/copy/sync layer.
- **Confirmed — startup and idle cost are modest for one session.** ~0.65 s to a
  reachable editor, ≈153 MiB idle RSS for the code-server node tree, ~0 % idle
  CPU (#9) — acceptable for a single-session Prototype-0 baseline (with the §3
  caveat that this is not a multi-session or browser-side profile).
- **Confirmed — a dependency-free `node:http` shell is sufficient.** `GET /` +
  `GET /health` run under `node --experimental-strip-types` with no framework
  and no build step (#6, ADR-0005), validating the minimal-environment answer to
  Q3.

---

## 7. Architecture decisions (AC3)

Prototype 0's architecture decisions are already Accepted and registered in
[`project/architecture/ADR/DECISION-LOG.md`](../../project/architecture/ADR/DECISION-LOG.md)
(which derives the full decision list D1–D72). This record **recites** them; it
creates and amends **nothing** (the decision log's last decision remains #72).

| ID | Title | One-line summary |
|----|-------|------------------|
| [**ADR-0002**](../../project/architecture/ADR/ADR-0002-ascend-baseline-stack-and-layout.md) | Ascend baseline technology stack and repository layout | TypeScript + Node.js 22 LTS + npm; `src/` layout; `npm install` single setup entry; no frameworks; **no DevDeck migration**. *(Answers Q1 + Q3.)* |
| [**ADR-0003**](../../project/architecture/ADR/ADR-0003-repo-local-engineering-harness.md) | Adopt a repo-local engineering harness (`./harness`) as the operating surface | `./harness` is the single mandatory operating surface wrapping existing commands; one verdict per verb; evidence/friction conventions. |
| [**ADR-0004**](../../project/architecture/ADR/ADR-0004-interactive-handoff-verbs.md) | Interactive/handoff verbs in the engineering harness (`./harness dev`) | `mode: exec` handoff verbs hand off the process instead of returning a verdict (precedent reused by `boot` and `edit`). |
| [**ADR-0005**](../../project/architecture/ADR/ADR-0005-application-serve-runtime.md) | Ascend application-serve runtime (HTTP server, TS runtime execution, `boot`) | Dependency-free `node:http` server under `node --experimental-strip-types` (Node ≥22.6.0 floor); `GET /health` + shell; `boot` handoff; `node:test` runner. *(Answers Q3.)* |
| [**ADR-0006**](../../project/architecture/ADR/ADR-0006-code-server-launch-and-project-path-safety.md) | code-server editor-provider launch, argument isolation, and read-only project-path safety | One code-server child via a single launcher seam; `PROJECT_PATH` config; loopback bind; fail-fast read-only path validation; exit-code passthrough, no supervision; code-server a documented prerequisite. *(Answers Q2 + Q4.)* |

Governing core-components (also cited, not authored):

- **CORE-COMPONENT-0002** — Commit Standards (Conventional Commits, Co-authored-by).
- **CORE-COMPONENT-0003** — Engineering harness contract, verdicts, and
  evidence/friction conventions (the `degraded`/exit-0 baseline posture).

---

## 8. Next-step recommendation (AC4)

**Proceed to plan Prototype 1 — "Host One Project Inside Ascend"** (PRD §1515),
whose objective is to validate whether a browser-hosted VS Code instance can
provide the **primary** development experience inside an Ascend shell.

The Prototype 0 **exit criteria** (PRD Prototype 0 §Exit criteria) are all met:

- one local folder can be opened in `code-server` — **met** (#7);
- the terminal works — **met** (#7/#8 live demos);
- files can be edited — **met** (#8);
- changes appear directly in the original filesystem path — **met** (#8,
  in-place, inode preserved);
- stopping the editor does not affect project files — **met** (#8, byte-identical
  post-stop snapshots);
- initial resource measurements are documented — **met** (#9, §3 above).

Prototype 1 should build directly on the ADR-0006 launcher seam and carry forward
the two deferred, non-blocking measurement gaps as explicit Prototype 1 concerns:
a **browser/renderer memory profile** and a **multi-session** resource picture
(PRD §25 Risk 2), plus consideration of the editor presentation mode (PRD §29
Prototype 1 item 8).

---

## 9. Explicit decision (AC4)

> ## Decision: **CONTINUE**
>
> **Prototype 0 is a success — continue to Prototype 1.**

**Rationale (evidence-based, tying back to §2–§7).** All four Prototype 0
questions are answered affirmatively — Ascend is an independent greenfield
baseline (Q1/§2, ADR-0002), code-server launches reliably against a configured
path (Q2/§2, ADR-0006), the minimum environment is small and dependency-light
(Q3/§2, ADR-0005), and editing is in place and safe with a proven zero-mutation
guarantee (Q4/§2, #8). Every PRD Prototype 0 exit criterion is met (§8), and the
single-session resource baseline (§3) is modest. The problems encountered (§5)
are honest, non-blocking capability gaps (code-server is a documented external
prerequisite; no readiness/measure/review verb), and the assumptions that mattered
were confirmed or safely disproved (§6). The architecture decisions are recorded
and stable (§7). There is therefore an evidence-based justification to **continue**
to Prototype 1.

**Caveats attached to the decision.** The resource numbers are a single idle
session baseline (§3) — browser-side and multi-session profiles are **deferred to
Prototype 1**, not resolved here. `code-server` remains an external prerequisite
absent from the devcontainer/CI (§5); Prototype 1 should account for provisioning
it. These caveats qualify the "continue" call but do not undermine it.
