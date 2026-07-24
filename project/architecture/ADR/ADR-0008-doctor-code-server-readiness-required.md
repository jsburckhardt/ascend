# ADR-0008: code-server readiness is a required `doctor` check that fails when absent

## Status

Accepted

> Supersedes DECISION-LOG #28 ("Include `doctor` in the verify aggregate; it may
> degrade but never fail it") for the code-server case, and supersedes the
> ADR-0006 §7 / Decision #71 "documented-but-absent prerequisite" stance that kept
> `doctor` silent on editor-provider readiness.

## Context

Improvement **C** of the issue #26 friction retrospect is the single most
recurring gap in the log: **five** records (#23, #27, #28, #30, #33) note that
`./harness doctor` proves only Node/toolchain health and is **silent on
code-server (editor-provider) readiness** — `command -v code-server` is empty in
this worktree and CI, and every prototype that needed the editor had to
transiently provision code-server and verify manually.

ADR-0006 (issue #7) deliberately treated code-server as a **documented
prerequisite** that is legitimately absent in dev/CI, deferred a `doctor`
code-server diagnostic to a later story, and — where it was considered — proposed
it as *"degraded, never fail"*. DECISION-LOG #28 codified that `doctor`
participates in the `verify` aggregate but may only move it toward `degraded`,
never `fail`, because `doctor` emitted only `pass`/`degraded`.

On 2026-07-22 the maintainer changed this posture: **code-server is a required
dependency for a stable Ascend environment**, not an optional prerequisite. A
missing code-server is therefore a real, blocking defect of the environment, and
the harness must say so honestly. This materially changes scope — it supersedes
prior decisions and requires code-server to actually be provisioned so `verify`
can pass — so it is recorded as its own ADR (sibling of ADR-0007, which covers
the friction attribution and retrospect).

Empirical grounding (this checkout): `command -v code-server` → none;
`.devcontainer/devcontainer.json` declares no editor feature; there is **no
`.github/workflows/` (no GitHub Actions CI)** — the only verification gate is
`.github/soft-factory/verification.yml`, which runs `./harness verify` **in the
devcontainer**. So "provision in CI" means "ensure the devcontainer has
code-server"; there is no separate workflow file to edit.

## Decision

1. **`doctor` probes code-server, and absence is `fail` (locked decision 3).**
   Extend the existing `doctor` verb (`compute_doctor`) with a code-server
   readiness check: probe presence via `command -v code-server`. When code-server
   is **present**, the check contributes `pass`; when it is **absent**, `doctor`
   returns **`fail`** (exit non-zero), **not** `degraded`. This is a deliberate
   departure from the Node/`node_modules` checks (which remain `degraded`, per
   ADR-0005/Decision #61): code-server is a *required* dependency, so its absence
   is a failure, not a partial capability. `doctor` still records friction (R4)
   for the gap it reports.

2. **The `verify` aggregate fails when code-server is absent.** Because `doctor`
   is a member of `verify.aggregate` (CORE-COMPONENT-0003 R6), a failing `doctor`
   makes `./harness verify` return **`fail` (exit non-zero)** by the existing
   fixed aggregate rule (any member `fail` ⇒ `fail`) with **no aggregate-logic
   change**. This is the intended effect: the single verification gate goes red
   until the required environment genuinely exists.

3. **Provision code-server in the devcontainer (locked decision 4).** Because C
   makes `verify` fail until code-server exists, #26 also **provisions
   code-server** by adding it to `.devcontainer/devcontainer.json` (a devcontainer
   **feature** or an install step via the existing `postCreateCommand` hook), so
   the required environment is real and `verify` can pass. A durable devcontainer
   install replaces ADR-0006/#9's transient `/tmp` installer for the day-to-day
   environment.

4. **Testability without a real code-server.** The check is proven with the
   `tests/launcher/` PATH-stub pattern: a stub `code-server` on `PATH` (or a
   testability seam such as a `HARNESS_CODE_SERVER` override naming the probe
   target) makes **present ⇒ `pass`** and **absent ⇒ `fail`** deterministic
   without installing or running the real binary. The regression suite must
   control the probe target so the "absent" case stays deterministic *even after
   code-server is provisioned in the devcontainer* (i.e. it must not depend on the
   ambient PATH once provisioning lands).

5. **Supersession recorded.** This ADR **supersedes**:
   - **DECISION-LOG #28** — `doctor` may now `fail` the `verify` aggregate (for the
     code-server check); it is no longer degrade-only.
   - **ADR-0006 §7 / DECISION-LOG #71** — code-server is no longer a
     "documented-but-absent prerequisite" verified only by manual demonstration; it
     is a required dependency probed by `doctor` and provisioned in the
     devcontainer. ADR-0006's launcher seam, argument isolation, and read-only
     project-path safety decisions are otherwise unaffected.
   The Node/`node_modules` `degraded` behavior (Decision #61) is unchanged: only
   the code-server check is fail-when-absent.

6. **`verification.yml` comment accuracy (bounded).** `.github/soft-factory/
   verification.yml`'s header comment ("degraded/unknown non-blocking") becomes
   partly outdated once `verify` can `fail` on missing code-server. #26 updates
   **only that comment for accuracy** and does not otherwise touch the file; the
   file's removal is a **separate issue (#27)**. If #27 lands first (removing the
   file), #26's comment edit is dropped — the two issues must be sequenced /
   reconciled at implementation time.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Report missing code-server as `degraded` (never fail), per ADR-0006 D7 | Keeps `verify` green with no provisioning; smallest change | Does not enforce the "required stable environment"; the recurring gap stays unproven and non-blocking | Maintainer decision 3: code-server is a required dependency, so absence must fail |
| Keep code-server a documented prerequisite (no `doctor` probe) | Zero harness change | The 5×-recurring gap stays; readiness is never proven by any verb | Contradicts the maintainer's required-dependency posture; leaves the retrospect's top recurring gap open |
| Add a separate `readiness`/`editor` verb instead of extending `doctor` | Isolates the check | New verb (out of #26's "no new verbs" scope); `doctor` is already the environment-health verb | Reuse the existing `doctor` env-health surface; no new verb |
| Provision code-server via transient `/tmp` install at launch (ADR-0006/#9) | Already proven | Not durable; rebuilds per run; network-dependent; `verify` still red between installs | A durable devcontainer install is the stable environment the maintainer requires |
| Fold C into ADR-0007 | One document | Mixes a distinct supersession decision with friction attribution; muddies the decision log | A small sibling ADR keeps the supersession explicit and self-contained |

## Consequences

### Positive
- The most recurring friction gap (5× records) is closed: `doctor` now proves
  editor-provider readiness, so records #23/#27/#28/#30/#33 become delete-on-fix.
- `./harness verify` honestly fails when the required environment is incomplete,
  making code-server a first-class, enforced dependency.
- The check is deterministically testable with the existing PATH-stub pattern,
  with no real code-server needed in CI.

### Negative
- `./harness verify` goes **red everywhere until code-server is provisioned** —
  the devcontainer change is a hard dependency of shipping C, and any environment
  without it (e.g. a bare checkout) will fail `verify`.
- `doctor` can now `fail`, so consumers that assumed `doctor` never fails (per the
  old #28) must be re-checked; the aggregate truth table now includes a
  doctor-driven `fail`.

### Neutral
- No `verify` aggregate logic changes; the fixed rule (any `fail` ⇒ `fail`) yields
  the new behavior from data.
- `verification.yml`'s comment is updated for accuracy only; its removal is #27.

## Related Issues

- [#26](https://github.com/jsburckhardt/ascend/issues/26) — friction retrospect + improvement C (this ADR)
- [#27](https://github.com/jsburckhardt/ascend/issues/27) — Remove the redundant `verification.yml` layer (separate issue; sequence with C's comment edit)
- [#7](https://github.com/jsburckhardt/ascend/issues/7) — code-server launcher (ADR-0006, superseded in part)

## References

- ADR-0006 — code-server editor-provider launch, argument isolation, and read-only project-path safety (§7 documented-prerequisite stance superseded in part)
- ADR-0005 — Application-serve runtime (`doctor` Node minor-floor `degraded` precedent, Decision #61)
- ADR-0003 / CORE-COMPONENT-0003 — Harness contract, `verify` aggregate rule (R6), friction rule (R4), Node-range checks (R15); amended by #26 for the code-server fail-when-absent rule
- DECISION-LOG #28 (superseded), #71 (superseded in part)
- `project/issues/26/research/00-research.md` — research brief (improvement C; provisioning obligation; supersession flags)
