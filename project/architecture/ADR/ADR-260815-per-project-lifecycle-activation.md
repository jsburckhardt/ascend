# ADR-260815-per-project-lifecycle-activation: Serialize Project Home Lifecycle Activation Per Project

## Status

Accepted

## Context

Issue #41 (BL-018) requires Project Home to offer Restart for a project reported `Running` or current-process retained `Failed`, to prevent duplicate activation *while that project's restart is pending*, to return focus to that project's lifecycle control when the action settles, and to keep **other projects and their applicable controls available during the selected restart**.

The delivered Project Home controller cannot satisfy the last requirement as built. `useProjectHome` owns exactly one `Owner` reference. Every asynchronous Home action — list load, ordinary registration, retry, refresh, close, close retry, close refresh, and stop — claims that single owner, and each new action calls `invalidate()`, which aborts the previous owner and bumps a global generation. The delivered Stop control is rendered `disabled` whenever *any* stop is pending, so during a stop every project's Stop control is unavailable. Applying that same shape to Restart would disable every project's Restart control during one project's restart, which is exactly what Issue #41 forbids.

Two weaker options were available and both are dishonest. Leaving other projects' Restart controls enabled while the single-owner guard silently drops their activations makes a control that looks available do nothing, which is a silent failure. Rendering them disabled contradicts the acceptance criterion.

The single-owner discipline exists for a real reason: it guarantees that at most one settlement can mutate Home state, so a late response can never overwrite newer state. Any second concurrency lane must reproduce that guarantee rather than abandon it. A restart is also long: its declared overall bound is materially longer than a registration or a close, so serializing all of Project Home behind one restart would be a visible regression for a multi-project library, which is the whole point of NFR-004 isolation.

The backend already isolates projects: `ProjectRuntimeManager` keys everything by stable project ID, and `ADR-260815-explicit-workbench-restart-control` gives a restart for project A no ability to change project B's entry, identity, listener, route, readiness, state, or events. The browser is the only surface that still couples unrelated projects.

## Decision

Give Restart its own per-project activation lane, keyed by stable project ID, and keep the delivered single-owner lane for every other Home action.

Serialize restart per project, not globally. The Home controller holds a restart-owner registry keyed by stable project ID. Admitting a restart for project P requires a successful project list, the ordinary editing mode, no open close dialog, no pending or in-flight restart already registered for P, and no pending stop for P. It does not require, claim, invalidate, or wait for the single Home owner, and it is not blocked by a pending restart for any other project. Concurrent restarts for distinct projects are therefore genuinely concurrent in the browser, exactly as they are in the manager.

Reproduce the ownership guarantee inside the new lane. Each admitted restart creates its own `AbortController` and its own owner record carrying a monotonic generation, and installs that record in the registry under P. A settlement applies only when the registry still holds that exact owner record for P and P is still present in the current project list; otherwise the settlement is discarded without mutating state, exactly as a superseded single-owner settlement is discarded today. A settled restart removes its own record. No restart settlement bumps the global Home generation, and no single-owner action aborts a restart owner, so a list refresh, a registration, or a close cannot silently cancel a restart the user is waiting on, and a restart cannot silently cancel them.

Keep every other project's controls available and every disabled state honest. Only the pending project's Restart control is rendered disabled, and it carries the pending state to assistive technology. Open, Close, and Stop controls are keyed on their own pending state and are unaffected by a pending restart, so during a restart of P the other cards' Open, Close, Stop, and Restart controls remain enabled and functional. A control is disabled only when activating it would be refused, so no rendered-enabled control is ever a silent no-op.

Render Restart eligibility from the authoritative projection only. A card offers Restart when the reconciled report for that project is `Running` or `Failed`. A card whose report is `Stopped` or `Starting`, and every card in a revision whose runtime projection is unavailable, offers no Restart control, because eligibility cannot be established without the authoritative state and the client never infers lifecycle state of its own. The control is an ordinary button, so keyboard activation, focus order, and focus-visible styling are inherited rather than reimplemented.

Expose all four outcomes accessibly and return focus deterministically. A pending restart marks that card busy and announces politely. A success announces the settled result, clears the pending record, and increments a restart settlement counter. A classified failure renders an alert-role notice with the client-owned bounded notice text for that category and a Retry restart action. An unclassifiable transport result renders an explicit unknown outcome. In all three settled cases focus returns to that project's Restart control, addressed by project ID, so focus never lands on an unrelated card or on the document body.

Refresh state exactly once per settled successful restart, and never automatically otherwise. A settled successful restart increments a restart settlement version that triggers exactly one additional read-only runtime-state request for the current authoritative list revision, extending the delivered on-demand refresh rule that already permits one extra request per Retry activation and one per settled successful stop. No timer, poll, stream, or client health probe is introduced. The unknown outcome performs no automatic request: it offers a manual read-only refresh of the current API process authoritative state, does not assume success, does not automatically retry Restart, and cannot create a second replacement. That client re-observation adds no backend reconciliation behaviour and does not claim BL-019.

Bound the restart transport above the manager bound, not below it. The delivered stop transport uses a 10,000 ms client bound because the manager's selected-stop bound is 5,000 ms, so a classified outcome always arrives first and an `unknown` result really does mean the response could not be classified. An explicit restart's honest overall bound is far larger — release plus a replacement allowance that covers every configured launch collision attempt plus a settlement allowance — so a client bound copied from Stop would abort while the manager was still legitimately working and would turn the ordinary slow-but-successful restart into the `unknown` outcome. That would make the accessible pending, success, and failure outcomes unreachable in exactly the cases users notice, and would make the `unknown` evidence meaningless. The restart transport bound MUST therefore exceed the manager's declared overall restart bound, and its relation to that bound MUST be stated wherever either is documented. The card stays busy, disabled, and politely announced for the whole operation, so a long wait is visible rather than silent, and a re-activation after any settlement is safe because a same-project restart request joins the in-flight manager operation instead of creating a second replacement.

Keep everything else unchanged. The registration, retry, refresh, close, close-retry, close-refresh, and stop actions keep the delivered single-owner discipline, the delivered global disable behaviour, and the delivered focus and announcement semantics. The workbench navigation shell still exposes no lifecycle control.

## Alternatives

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| Reuse the single Home owner for Restart, as Stop does | No new concurrency model; smallest diff | Disables every project's Restart control during one project's restart, and lets a list refresh or close abort a pending restart | Issue #41 requires other projects' controls to remain available during the selected restart |
| Keep the single owner but leave other Restart controls enabled and drop their activations | No new concurrency model; controls look available | A rendered-enabled control that silently does nothing is a silent failure and is not "available" | Availability must be real, not visual |
| Make every Home action per-project | Uniform model | Registration, list load, and recovery are not project-scoped, and reworking them is unrelated scope with real regression risk for delivered close and stop evidence | Only Restart needs the new lane in this issue |
| Queue a second restart for the same project instead of refusing it | No refused activation | Hides duplicate activation behind an invisible queue and can create a second replacement the user did not ask for | Issue #41 requires duplicate activation to be prevented while that project's restart is pending |
| Track pending restarts in a component-local state per card | Naturally per project | Splits lifecycle state across unmounting list items, loses settlement ownership when the list reorders, and cannot enforce the single-restart-per-project rule | Ownership must live in the controller that owns the project list |
| Poll runtime state while a restart is pending | Live progress | Introduces polling that the public projection decision explicitly excludes | Refresh stays on demand |
| Automatically refresh after an unknown outcome | Fewer clicks | Reads authoritative state the user did not ask for and blurs the line between "unknown" and "resolved" | The unknown outcome must stay explicit and user-driven |
| Reuse Stop's 10,000 ms transport bound for Restart | One shared client bound | Aborts far below the manager's honest restart bound, so an ordinary slow restart renders `unknown` while it is still succeeding and the classified outcomes become unreachable | The client bound must exceed the manager bound it is waiting on |

## Consequences

### Positive
- One project's restart never removes another project's lifecycle controls, matching the per-project isolation the runtime manager already guarantees.
- Duplicate activation is prevented exactly where Issue #41 requires it, and every disabled control corresponds to a genuinely refused activation.
- Settlement ownership is preserved: a superseded or orphaned restart settlement mutates nothing.
- Eligibility, outcomes, focus, and announcements are derived from the authoritative projection and the bounded transport result, never from client inference.
- The delivered registration, close, and stop interaction evidence is unaffected because their lane is unchanged.

### Negative
- Project Home now has two concurrency lanes, and every future lifecycle control must state which lane it joins.
- Home state grows a per-project restart map, a restart settlement version, and a restart focus target.
- Concurrent restarts across projects mean more than one long-running request may be in flight from one page, which the transport bounds rather than the controller.
- The restart transport bound is much larger than the delivered stop bound, so a genuinely unreachable API leaves a card pending for that whole period before the explicit unknown outcome is offered.

### Neutral
- No new dependency, timer, stream, or storage is introduced; the lane is plain controller state.
- The workbench navigation shell and the stable route are unchanged.
- Restart makes no claim about editor or terminal session state surviving replacement, and the browser surface says so rather than implying continuity.

### Revision

- **2026-08-15 (Plan revision 3, Issue #41, pre-implementation).** The rule that the restart transport bound must exceed the manager's declared overall restart bound is unchanged and is not superseded. What changed is the value it must exceed: `ADR-260815-explicit-workbench-restart-control` now declares two overall restart bounds, because a restart whose release phase must resolve a pending replacement admission is bounded by an additional quarantine reclamation allowance. The transport bound is therefore stated against the larger of the two — the caller-visible restart ceiling — and every document that states one value must state it against that ceiling. No lane, ownership, admission, focus, announcement, eligibility, or refresh decision in this ADR changes.

## Related Issues

- [#41](https://github.com/jsburckhardt/ascend/issues/41)

## References

- [Replace one selected workbench runtime through a manager-owned restart control](./ADR-260815-explicit-workbench-restart-control.md)
- [Report public runtime state through a read-only projection](./ADR-260815-public-runtime-state-projection.md)
- [Release one selected workbench runtime through a manager-owned stop control](./ADR-260815-selected-runtime-stop-control.md)
- [Separate browser navigation shell from workbench transport](./ADR-260812-browser-navigation-shell.md)
- [Select the full-page browser workbench presentation](./ADR-260810-full-page-browser-workbench-presentation.md)
