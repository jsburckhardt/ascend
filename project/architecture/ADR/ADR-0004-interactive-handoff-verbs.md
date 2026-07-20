# ADR-0004: Interactive/handoff verbs in the engineering harness (`./harness dev`)

## Status

Accepted

## Context

Issue #5 acceptance criterion AC3 requires that the local development and
validation commands be **wrapped/invokable through the harness CLI**. Validation
is genuinely invokable (`./harness verify` wraps `npm run typecheck`). The
development command is not: `npm run dev` (`tsc --noEmit --watch`) exists as a
direct npm script, `./harness boot` stays `unknown` (`boot.maps_to: null`), and
the README tells users to run `npm run dev` directly. The local code review
(REVIEW CYCLE 1, finding **F-01**, high confidence) concluded that documentation
of a direct command is **not** invocation, so AC3 is unmet, and that the prior
TEST-30 codified the gap (asserting `boot` stays null) instead of closing it.

The harness's generic capability handler (`verb_capability`) runs a wrapped
command **to completion** — `( cd "$ROOT" && sh -c "$maps_to" ) >/dev/null 2>&1`
— and folds the exit code into a single run-once verdict. The durable regression
suite runs every verb to completion (TEST-20 asserts exactly one `Verdict:` line
per verb). A watch/serve command such as `npm run dev` never returns, so naively
mapping it into `verb_capability` (or into `boot`) would **hang** `./harness dev`
(or `./harness boot`) and hang TEST-20 forever, and would produce no meaningful
verdict on Ctrl-C.

The repo owner has decided (not to be re-litigated) to make the dev command
**genuinely invokable through the harness now, in issue #5**, via a minimal
process-handoff path, and to record the new interactive/handoff verb behavior in
the architecture. This decision is constrained by:

- **ADR-0002** — no speculative frameworks and no build pipeline beyond `tsc`;
  the harness must add no new dependency.
- **ADR-0003** — `./harness` is the single operating surface that wraps existing
  commands and never reimplements them; later stories wire verbs via
  `.harness/contract.yml` data.
- **CORE-COMPONENT-0003** — the stable harness contract (verdict model, exit-code
  contract, `--json` schema, evidence/friction conventions, **R8** data-driven
  wiring). A run-once verdict model does not fit a long-running interactive
  process, so a *new behavioral category* is required — this is a genuine
  cross-cutting change to the harness contract, hence an ADR plus a
  CORE-COMPONENT-0003 amendment (R17), not a data-only story edit.
- Issue **#6** owns `boot` for the real app-serve + health endpoint; the dev
  inner loop is a distinct concern and must not squat on `boot`.

## Decision

Introduce an **interactive/handoff verb category** in the engineering harness and
add one such verb, **`dev`**, to satisfy AC3 for the development command now.

1. **New verb `dev` (process handoff via `exec`).** `./harness dev` resolves its
   wrapped command from contract data and performs a POSIX **`exec`** process
   handoff (`cd "$ROOT" && exec sh -c "$maps_to"`), replacing the harness process
   with the wrapped command. Because the harness process is replaced, it never
   runs the command to completion, never blocks awaiting a verdict, and never
   hangs. The wrapped command's own exit code becomes the process exit code.

2. **Data-driven mapping (CORE-COMPONENT-0003 R8).** The command stays in data:
   `.harness/contract.yml` declares
   `dev: { maps_to: "npm run dev", mode: exec, json: true }`. The new
   contract attribute **`mode`** selects the behavioral category:
   `mode: exec` = interactive handoff; absent `mode` (or `mode: capability`) =
   the existing run-to-completion capability behavior (default), so **every
   existing verb is unchanged**.

3. **Verdict exemption.** A `mode: exec` verb hands off the process, so it emits
   **no** `pass`/`fail`/`degraded`/`unknown` verdict and writes **no** evidence.
   It is exempt from the single-verdict rule (R2), the verdict→exit-code mapping
   (R3, it propagates the exec'd command's exit code instead), and the evidence
   rule (R5). If its `maps_to` is `null`/`native`, it behaves like an unmapped
   capability verb (`unknown` + friction, exit 0) — the gap is still honest.

4. **Non-exec introspection for tooling and tests.** Because a handoff cannot
   also print a verdict, a handoff verb MUST offer a non-exec introspection form:
   `./harness dev --print` prints the resolved wrapped command and exits 0
   **without** exec; `./harness dev --json` prints a JSON descriptor
   (`verb`, `mode: "exec"`, `maps_to`, `interactive: true`; no `verdict` key) and
   exits 0 without exec. This lets the regression suite prove invocability with no
   hang.

5. **`help`/`orient`/`status` represent it honestly.** `help` lists `dev` and
   states it is an interactive handoff that execs `npm run dev` and emits no
   verdict; `orient` surfaces the resolved dev command; the automatic verb count
   includes `dev`.

6. **`boot` is untouched.** `boot.maps_to` stays `null` (verdict `unknown`) and
   remains owned by **issue #6** for the real app-serve + health endpoint. The dev
   inner loop and the app-serve boot are distinct concerns and use distinct verbs.

The reusable, enforceable contract for interactive/handoff verbs (the `mode: exec`
attribute, the verdict/exit-code/evidence exemption, the mandatory introspection
form, and the regression-suite exclusion from run-to-completion enumeration) is
specified as **CORE-COMPONENT-0003 R17** (amendment landed with this ADR).

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Map the dev watch into `boot.maps_to` in the current run-to-completion handler | Data-only; no harness code | Hangs `./harness boot` and TEST-20 forever; no verdict on Ctrl-C; squats on the verb #6 owns | Review F-01 explicitly forbids a naive foreground mapping; conflicts with #6's `boot` ownership |
| Keep `npm run dev` as a documented direct command only (status quo) | Zero change | Documentation is not invocation; `./harness boot` stays `unknown` | AC3 remains unmet (review F-01) |
| Overload `boot` with a new handoff mode now | One fewer verb | Conflates the dev inner loop with app-serve+health that #6 owns; forces #6 to rework `boot` semantics | Distinct concerns; avoids duplicated/rewound work |
| Background/detach the dev process + readiness probe, then emit a verdict | Fits the run-once verdict model | No meaningful readiness signal for a typecheck watch; more moving parts; process-lifecycle management is #6's app-serve concern | Heavier and speculative for a code-less baseline (ADR-0002 §28.7) |
| Add a process-manager or task-runner dependency (e.g. `concurrently`, `pm2`) | Rich lifecycle control | New runtime dependency; build/tooling growth | Violates ADR-0002 dependency-light / no speculative frameworks |

## Consequences

What becomes easier or harder as a result of this decision?

### Positive
- AC3 is genuinely met for the development command: `./harness dev` starts the
  dev environment through the harness CLI with no hang.
- The dev command is discoverable on the single operating surface (`help`,
  `orient`) instead of only in prose.
- The `mode: exec` handoff pattern is reusable — issue #6 can wrap an interactive
  shell/serve process the same way, or choose readiness-probe+detach, without
  re-deciding the model.
- Adds no dependency and stays dependency-light POSIX shell (ADR-0002/ADR-0003).

### Negative
- The harness now maintains a second verb behavioral category; the verdict model
  gains a documented exemption (R17) that reviewers and future authors must know.
- The regression suite must treat handoff verbs specially (introspection instead
  of run-to-completion), and `help`/`orient` text must stay truthful about the
  no-verdict behavior.

### Neutral
- `.harness/contract.yml` gains a `mode` attribute; its default (absent) preserves
  all existing verbs unchanged.
- `boot` remains deferred to #6; the friction log's boot entry is annotated
  (append-only) to note the interactive-process gap is now handled by `mode: exec`.

## Related Issues

- [#5](https://github.com/jsburckhardt/ascend/issues/5) — add local development and validation commands (this ADR resolves review finding F-01 for AC3)
- [#6](https://github.com/jsburckhardt/ascend/issues/6) — shell + health (owns the real `boot`; may reuse the `mode: exec` handoff pattern)

## References

- ADR-0002 — Ascend baseline technology stack and repository layout (dependency-light, no speculative frameworks)
- ADR-0003 — Adopt a repo-local engineering harness (`./harness`) as the operating surface
- CORE-COMPONENT-0003 — Engineering harness contract, verdicts, and evidence/friction conventions (amended with R17)
- `project/issues/5/review/00-review.md` — local code review, finding F-01
- `project/issues/5/research/00-research.md` — research brief (open questions on long-running dev vs. run-once verdict model)
