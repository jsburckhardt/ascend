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

### Revision — amended 2026-08-16

Amended by [ADR-260816-selected-project-close-control](./ADR-260816-selected-project-close-control.md) for Issue #45. **The restart lane, its registry, its generation discipline, its settlement rule, its eligibility rule, its focus and announcement rules, and its transport-bound rule are unchanged.** Three statements of this decision now also bind Close.

First, the sentence "the registration, retry, refresh, close, close-retry, close-refresh, and stop actions keep the delivered global disable behaviour" is narrowed for close only, and the delivered close dialog's lifetime is shortened so that the narrowing is actually deliverable. A modal dialog that traps focus makes every peer control unreachable for as long as it is open, so a pending close cannot both keep the delivered dialog open through settlement and leave peer controls usable. The close **confirmation** dialog therefore becomes exclusive and pre-transmission only: at most one is open at a time across the whole page, it is modal and focus-trapped, it exists only while nothing has been transmitted, and `Escape` and Cancel stay safe for its whole life because its life ends at transmission. At transmission the dialog is dismissed, focus moves deterministically to that card's own close status region, and the close continues as a per-card, per-project pending state carrying the visible pending text — the same shape this decision already gives a pending restart. Failure and unknown outcomes render as per-card regions with that card's own retry and refresh controls, never as a reopened modal.

A pending close is then scoped to its own project in every sense: while a close for project P is pending, the Open, Close, Stop, and Restart controls of every other project remain admitted by the controller and remain rendered enabled, another project's close may be opened, confirmed, and transmitted, and two closes may be in flight at once, each with its own transport, cancellation signal, generation, and settlement, neither touching the other's record, focus, or announcement. Only the confirmation dialog and the browser's list-bearing work are serialized — see the Plan revision 3 amendment below, which states how a list response that a close settlement supersedes is handled. A second confirmation or a second transmission for the **same** project is refused, and every close announcement is attributed to its project's display name so two concurrent settlements are never ambiguous. The delivered global owner lane keeps serializing registration, list, retry, and refresh work only; it no longer owns the close transport.

Second, this decision's rule that "a control is disabled only when activating it would be refused, so no rendered-enabled control is ever a silent no-op" is now enforced for the close, stop, and restart controls together rather than for restart alone. Any card whose control the controller would refuse renders that control disabled, and any card whose control renders enabled is genuinely admitted.

Third, the on-demand refresh rule is extended by exactly one case: a settled successful close increments a close settlement version that triggers exactly one additional read-only runtime-state request for the current authoritative list revision. No timer, poll, stream, or client health probe is introduced, and an unclassifiable close outcome still performs no automatic request — it preserves the selected card, stays explicitly unknown, and offers the manual refresh that resolves it against fresh authoritative project-list and runtime-state observations. The transport-bound rule of this decision applies unchanged to the close transport, whose bound must exceed the manager's largest declared close bound.

### Revision — amended 2026-08-16 (Plan revision 3)

Amended again by [ADR-260816-selected-project-close-control](./ADR-260816-selected-project-close-control.md) for Issue #45, after the independent re-review of that plan's revision 2. **The restart lane, the per-project admission model, the generation discipline, the eligibility rule, the focus and announcement rules, the on-demand refresh rule, and the transport-bound rule are unchanged.** One statement of the 2026-08-16 amendment is completed.

That amendment took the close transport out of the single global owner lane and said "only the confirmation dialog is serialized". Taking a settlement out of that lane also takes away the property that made the lane safe in the first place — with one owner and one generation, no response could ever be applied after newer state had superseded it — and the amendment did not say what replaces it. Without a rule, a project-list response issued before a close settled and resolving after it re-adds the card that close removed, and the one runtime-state read the settlement triggers is then aligned against a list the close already invalidated. Four rules complete the decision, and none of them serializes a per-project lifecycle control.

First, **lane membership is by kind, not by card**. Every list-bearing action — registration submit, list load, list retry, recovery refresh, and each card's refresh of an unknown close outcome — keeps the delivered single global owner lane, because each replaces the authoritative project list wholesale and two concurrent replacements have no defined winner. Every per-project lifecycle control — open, close, close retry, stop, and restart — takes no global owner and is admitted per card. The peer-usability requirement this decision exists to serve is about the second group, and the second group is exactly the group that never serializes.

Second, **a list-bearing action is never refused because a close is pending**, for that project or any other. The global lane keeps refusing only what it already refuses: a second list-bearing action while one is in flight. A card's refresh-close-result control is a list load wearing a per-card label, so it is admitted only while that lane is idle and, by this decision's own disabled-exactly-when-refused rule, renders disabled whenever it is not.

Third, **a superseded list response is discarded and re-issued, never applied**. Each global-lane owner records the close settlement version observed when it was created; on resolution the controller evaluates the delivered ownership check and also compares the current settlement version against that stamp, discarding the response without mutating the project list when it advanced, and issuing exactly one replacement request of the same kind. The chain is finite because each replacement is stamped at a strictly greater version and the version advances at most once per successful close.

Fourth, **a removed card can never be re-added under any ordering**. The controller keeps the set of identifiers whose close settled as removed or already absent, the client-side mirror of the boundary's retirement set, and filters every applied list response through it. This is sound because a stable project identifier is minted once at registration and never reissued, so re-registering the same directory yields a different identifier and the filter can hide nothing legitimate.

## Related Issues

- [#41](https://github.com/jsburckhardt/ascend/issues/41)
- [#45](https://github.com/jsburckhardt/ascend/issues/45)

## References

- [Replace one selected workbench runtime through a manager-owned restart control](./ADR-260815-explicit-workbench-restart-control.md)
- [Report public runtime state through a read-only projection](./ADR-260815-public-runtime-state-projection.md)
- [Release one selected workbench runtime through a manager-owned stop control](./ADR-260815-selected-runtime-stop-control.md)
- [Separate browser navigation shell from workbench transport](./ADR-260812-browser-navigation-shell.md)
- [Select the full-page browser workbench presentation](./ADR-260810-full-page-browser-workbench-presentation.md)
