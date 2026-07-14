# Fleet Delivery Sketch — Prototype 0

Maintained by the `fleet-orchestrator` agent. Single source of orchestration truth.

- **Epic:** #1 Ascend orchestration
- **Feature:** #2 Prototype 0 — Baseline and Spike Repository
- **Base branch:** `main`
- **Worktrees:** `.trees/<issue>`
- **Dispatch:** `OTEL_RESOURCE_ATTRIBUTES="issue.id=<n>,project.name=ascend" copilot --yolo --agent rpiv -p "work on issue <n>"`

## States

`pending` → `ready` → `dispatched` → `finished` → `integrated` (or `failed`)

## Dependency graph

```text
#3 bootstrap ──▶ #4 harness ──▶ #5 dev/validation ──▶ #6 shell+health ──▶ #7 code-server ──┬─▶ #8 verify-fs ──┐
                                                                                            └─▶ #9 measure ────┴─▶ #10 decision
```

## Waves (sequential unless marked parallel)

| Wave | Issues | Mode | Depends on | Rationale |
|------|--------|------|------------|-----------|
| 1 | #3 | sequential | — | Repo scaffold; everything roots here |
| 2 | #4 | sequential | #3 | Harness wraps repo commands |
| 3 | #5 | sequential | #4 | Dev/validation commands wired into harness |
| 4 | #6 | sequential | #5 | Shell + health start via dev command |
| 5 | #7 | sequential | #6 | Launch code-server from the shell |
| 6 | #8, #9 | **parallel** | #7 | Both need a running code-server; independent concerns (edit-safety vs measurements) |
| 7 | #10 | sequential | #3–#9 | Decision story; gates Prototype 1 |

Parallelism is limited: Prototype 0 is a mostly-linear bring-up chain. The only safe parallel wave is #8 + #9 once code-server runs (#7).

## Status board

| Issue | Title | State | Branch | Worktree | Window |
|-------|-------|-------|--------|----------|--------|
| #3 | Bootstrap the Ascend repository | pending | — | — | — |
| #4 | Generate the engineering harness CLI (harness-cli-it) | pending | — | — | — |
| #5 | Add local development and validation commands | pending | — | — | — |
| #6 | Add a minimal health endpoint and application shell | pending | — | — | — |
| #7 | Launch one code-server against a configured path | pending | — | — | — |
| #8 | Verify direct filesystem editing | pending | — | — | — |
| #9 | Capture startup and resource measurements | pending | — | — | — |
| #10 | Review Prototype 0 evidence and record the decision | pending | — | — | — |

## Log

- _seed_: sketch created; all issues `pending`.
