import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CLOSE_FAILURE_MESSAGES,
  closeProject,
  loadProjects,
  orderProjects,
  PROJECT_LIST_TIMEOUT_MS,
  registerProject,
  REGISTRATION_FAILURE_MESSAGES,
  serializeRegistrationPath,
  type CloseTransport,
  type Project,
  type ProjectLoader,
  type RegistrationTransport,
} from './projects'
import {
  restartRuntime,
  RUNTIME_RESTART_NOTICES,
  type RuntimeRestartErrorCategory,
  type RuntimeRestartTransport,
} from './runtime-restart'
import {
  RUNTIME_STOP_NOTICES,
  stopRuntime,
  type RuntimeStopErrorCategory,
  type RuntimeStopSuccessOutcome,
  type RuntimeStopTransport,
} from './runtime-stop'

export type ProjectHomeMode =
  'editing' | 'ordinary-pending' | 'unknown' | 'recovery-pending' | 'ambiguous'

export interface ProjectCloseState {
  readonly id: string
  readonly name: string
  readonly originalIndex: number
  readonly phase: 'confirming' | 'pending' | 'retry' | 'unknown' | 'refreshing'
  readonly transmitted: boolean
  readonly message?: string
}

export interface ProjectStopState {
  readonly id: string
  readonly phase: 'pending' | 'retry' | 'unknown'
  readonly outcome?: RuntimeStopSuccessOutcome
  readonly category?: RuntimeStopErrorCategory
}

export interface ProjectRestartState {
  readonly id: string
  readonly phase: 'pending' | 'retry' | 'unknown'
  readonly category?: RuntimeRestartErrorCategory
}

export interface ProjectHomeState {
  readonly listStatus: 'loading' | 'failure' | 'success'
  readonly projects: readonly Project[]
  readonly mode: ProjectHomeMode
  readonly input: string
  readonly lockedPayload?: string
  readonly snapshotIds: ReadonlySet<string>
  readonly validation?: string
  readonly announcement: string
  readonly focusProjectId?: string
  readonly focusVersion: number
  readonly activeKind?: 'ordinary' | 'retry' | 'refresh' | 'close-refresh'
  readonly inputFocusVersion: number
  readonly closes: ReadonlyMap<string, ProjectCloseState>
  readonly closeDialogId?: string
  readonly closeSettlementVersion: number
  readonly stop?: ProjectStopState
  readonly stopSettlementVersion: number
  readonly restarts: ReadonlyMap<string, ProjectRestartState>
  readonly restartSettlementVersion: number
  readonly focusTarget?:
    | 'open'
    | 'close'
    | 'close-status'
    | 'close-retry'
    | 'close-refresh'
    | 'stop'
    | 'restart'
    | 'heading'
}

interface Owner {
  readonly generation: number
  readonly kind: 'list' | 'ordinary' | 'retry' | 'refresh' | 'close-refresh'
  readonly controller: AbortController
  /** The close settlement count observed when this owner was created. A
   * response stamped behind the current count has been superseded by a close
   * that settled outside this lane, so it is discarded and re-issued. */
  readonly closeSettlementVersionAtIssue: number
  readonly replay: () => void
  timer?: ReturnType<typeof setTimeout>
  active: boolean
}

interface RestartOwner {
  readonly projectId: string
  readonly generation: number
  readonly controller: AbortController
  active: boolean
}

interface StopOwner {
  readonly projectId: string
  readonly generation: number
  readonly controller: AbortController
  active: boolean
}

interface CloseOwner {
  readonly projectId: string
  readonly generation: number
  readonly controller: AbortController
  active: boolean
}

export type ProjectHomeAction =
  'open' | 'close' | 'retry-close' | 'refresh-close' | 'stop' | 'restart'

export interface ProjectHomeController {
  readonly state: ProjectHomeState
  setInput(value: string): void
  submit(): void
  cancel(): void
  retrySameSubmission(): void
  refreshProjects(): void
  resetRecovery(): void
  retryList(): void
  admits(action: ProjectHomeAction, projectId: string): boolean
  openClose(id: string): void
  cancelClose(): void
  confirmClose(): void
  retryClose(projectId: string): void
  refreshClose(projectId: string): void
  stop(projectId: string): void
  restart(projectId: string): void
}

export interface ProjectHomeDependencies {
  readonly load?: ProjectLoader
  readonly register?: RegistrationTransport
  readonly close?: CloseTransport
  readonly stop?: RuntimeStopTransport
  readonly restart?: RuntimeRestartTransport
  readonly listTimeoutMs?: number
}

const initialState: ProjectHomeState = {
  listStatus: 'loading',
  projects: [],
  mode: 'editing',
  input: '',
  snapshotIds: new Set(),
  announcement: '',
  focusVersion: 0,
  inputFocusVersion: 0,
  closes: new Map(),
  closeSettlementVersion: 0,
  stopSettlementVersion: 0,
  restarts: new Map(),
  restartSettlementVersion: 0,
}

function upsert(projects: readonly Project[], project: Project): Project[] {
  return orderProjects([
    ...projects.filter(({ id }) => id !== project.id),
    project,
  ])
}

function withClose(
  closes: ReadonlyMap<string, ProjectCloseState>,
  projectId: string,
  next: ProjectCloseState | undefined
): ReadonlyMap<string, ProjectCloseState> {
  const map = new Map(closes)
  if (next === undefined) map.delete(projectId)
  else map.set(projectId, next)
  return map
}

function dismissDialog(
  state: ProjectHomeState,
  projectId: string
): string | undefined {
  return state.closeDialogId === projectId ? undefined : state.closeDialogId
}

function applyCloseSuccess(
  state: ProjectHomeState,
  close: ProjectCloseState,
  settlementVersion: number,
  authoritativeProjects?: readonly Project[]
): ProjectHomeState {
  const projects = (authoritativeProjects ?? state.projects).filter(
    ({ id }) => id !== close.id
  )
  const next =
    projects[close.originalIndex] ?? projects[close.originalIndex - 1]
  return {
    ...state,
    projects,
    closes: withClose(state.closes, close.id, undefined),
    closeDialogId: dismissDialog(state, close.id),
    closeSettlementVersion: settlementVersion,
    announcement: close.name + ': Project closed.',
    focusProjectId: next?.id,
    focusTarget: next === undefined ? 'heading' : 'close',
    focusVersion: state.focusVersion + 1,
  }
}

export function useProjectHome(
  dependencies: ProjectHomeDependencies = {}
): ProjectHomeController {
  const loader = dependencies.load ?? loadProjects
  const registration = dependencies.register ?? registerProject
  const closeTransport = dependencies.close ?? closeProject
  const stopTransport = dependencies.stop ?? stopRuntime
  const restartTransport = dependencies.restart ?? restartRuntime
  const listTimeoutMs = dependencies.listTimeoutMs ?? PROJECT_LIST_TIMEOUT_MS
  const [state, setState] = useState<ProjectHomeState>(initialState)
  const latest = useRef(state)
  latest.current = state
  const mounted = useRef(false)
  const generation = useRef(0)
  const owner = useRef<Owner | undefined>(undefined)
  const restartGeneration = useRef(0)
  const restartOwners = useRef(new Map<string, RestartOwner>())
  const stopGeneration = useRef(0)
  const stopOwner = useRef<StopOwner | undefined>(undefined)
  const closeGeneration = useRef(0)
  const closeOwners = useRef(new Map<string, CloseOwner>())
  /** Settled successful closes on this page. Held in a ref so the global lane
   * can stamp and compare it synchronously, and so a re-run state updater
   * cannot advance it twice. */
  const closeSettlements = useRef(0)
  /** Client mirror of the manager's retirement set. A project ID is minted once
   * at registration and never reissued, so a tombstone can never hide a
   * legitimately re-registered project. */
  const closedProjectIds = useRef(new Set<string>())
  const runListRef = useRef<(recovery: boolean) => void>(() => undefined)
  const beginRegistrationRef = useRef<
    (kind: 'ordinary' | 'retry', payload: string) => void
  >(() => undefined)
  const runCloseRefreshRef = useRef<(projectId: string) => void>(
    () => undefined
  )

  const survivors = useCallback(
    (projects: readonly Project[]): Project[] =>
      orderProjects(
        projects.filter(({ id }) => !closedProjectIds.current.has(id))
      ),
    []
  )

  const invalidate = useCallback(() => {
    const current = owner.current
    if (current !== undefined) {
      current.active = false
      if (current.timer !== undefined) clearTimeout(current.timer)
      current.controller.abort()
    }
    owner.current = undefined
    generation.current += 1
  }, [])

  const owns = useCallback(
    (candidate: Owner): boolean =>
      mounted.current &&
      candidate.active &&
      owner.current === candidate &&
      generation.current === candidate.generation,
    []
  )

  const finish = useCallback((candidate: Owner) => {
    candidate.active = false
    if (candidate.timer !== undefined) clearTimeout(candidate.timer)
    if (owner.current === candidate) owner.current = undefined
  }, [])

  /** A global-lane response that a close settlement superseded is discarded
   * without touching `state.projects`; its owner finishes, the generation
   * advances, and exactly one replacement of the same kind is issued. The chain
   * is finite because each replacement is stamped at a strictly greater
   * settlement version. */
  const superseded = useCallback(
    (candidate: Owner): boolean => {
      if (closeSettlements.current <= candidate.closeSettlementVersionAtIssue)
        return false
      finish(candidate)
      generation.current += 1
      candidate.replay()
      return true
    },
    [finish]
  )

  const ownsClose = useCallback(
    (projectId: string, candidate: CloseOwner): boolean =>
      mounted.current &&
      candidate.active &&
      closeOwners.current.get(projectId) === candidate,
    []
  )

  const runList = useCallback(
    (recovery: boolean) => {
      if (owner.current !== undefined) return
      invalidate()
      const controller = new AbortController()
      const current: Owner = {
        generation: generation.current,
        kind: recovery ? 'refresh' : 'list',
        controller,
        closeSettlementVersionAtIssue: closeSettlements.current,
        replay: () => runListRef.current(recovery),
        active: true,
      }
      owner.current = current
      if (recovery) {
        setState((value) => ({
          ...value,
          mode: 'recovery-pending',
          activeKind: 'refresh',
          announcement: 'Refreshing projects…',
        }))
      } else {
        setState((value) => ({
          ...value,
          listStatus: 'loading',
          announcement: 'Loading registered projects…',
        }))
      }
      current.timer = setTimeout(() => {
        if (!owns(current)) return
        finish(current)
        controller.abort()
        generation.current += 1
        setState((value) =>
          recovery
            ? {
                ...value,
                mode: 'unknown',
                activeKind: undefined,
                announcement: 'Refresh failed. Submission outcome unknown.',
              }
            : {
                ...value,
                listStatus: 'failure',
                announcement: 'Projects could not be loaded.',
              }
        )
      }, listTimeoutMs)
      void loader(controller.signal).then(
        (projects) => {
          if (!owns(current)) return
          if (superseded(current)) return
          finish(current)
          generation.current += 1
          const authoritative = survivors(projects)
          if (!recovery) {
            setState((value) => ({
              ...value,
              listStatus: 'success',
              projects: authoritative,
              announcement: '',
            }))
            return
          }
          setState((value) => {
            const added = authoritative.filter(
              ({ id }) => !value.snapshotIds.has(id)
            )
            if (added.length === 1) {
              return {
                ...value,
                projects: authoritative,
                mode: 'editing',
                lockedPayload: undefined,
                activeKind: undefined,
                announcement: 'Project reconciled.',
                focusProjectId: added[0]!.id,
                focusTarget: 'open',
                focusVersion: value.focusVersion + 1,
              }
            }
            if (added.length === 0) {
              return {
                ...value,
                projects: authoritative,
                mode: 'editing',
                lockedPayload: undefined,
                activeKind: undefined,
                announcement: 'No new project was observed.',
                inputFocusVersion: value.inputFocusVersion + 1,
              }
            }
            return {
              ...value,
              projects: authoritative,
              mode: 'ambiguous',
              activeKind: undefined,
              announcement:
                'Multiple new projects were observed; reconciliation is ambiguous.',
            }
          })
        },
        () => {
          if (!owns(current)) return
          finish(current)
          generation.current += 1
          setState((value) =>
            recovery
              ? {
                  ...value,
                  mode: 'unknown',
                  activeKind: undefined,
                  announcement: 'Refresh failed. Submission outcome unknown.',
                }
              : {
                  ...value,
                  listStatus: 'failure',
                  announcement: 'Projects could not be loaded.',
                }
          )
        }
      )
    },
    [finish, invalidate, listTimeoutMs, loader, owns, superseded, survivors]
  )
  runListRef.current = runList

  useEffect(() => {
    mounted.current = true
    runList(false)
    return () => {
      mounted.current = false
      invalidate()
      for (const restartOwner of restartOwners.current.values()) {
        restartOwner.active = false
        restartOwner.controller.abort()
      }
      restartOwners.current.clear()
      for (const closeOwner of closeOwners.current.values()) {
        closeOwner.active = false
        closeOwner.controller.abort()
      }
      closeOwners.current.clear()
      const pendingStop = stopOwner.current
      if (pendingStop !== undefined) {
        pendingStop.active = false
        pendingStop.controller.abort()
        stopOwner.current = undefined
      }
    }
  }, [invalidate, runList])

  const setInput = useCallback((input: string) => {
    if (
      latest.current.mode !== 'editing' ||
      latest.current.closeDialogId !== undefined ||
      owner.current !== undefined
    )
      return
    setState((value) => ({ ...value, input, validation: undefined }))
  }, [])

  const beginRegistration = useCallback(
    (kind: 'ordinary' | 'retry', payload: string) => {
      if (owner.current !== undefined) return
      invalidate()
      const controller = new AbortController()
      const current: Owner = {
        generation: generation.current,
        kind,
        controller,
        closeSettlementVersionAtIssue: closeSettlements.current,
        replay: () => beginRegistrationRef.current(kind, payload),
        active: true,
      }
      owner.current = current
      setState((value) => ({
        ...value,
        mode: kind === 'ordinary' ? 'ordinary-pending' : 'recovery-pending',
        activeKind: kind,
        lockedPayload: payload,
        snapshotIds:
          kind === 'ordinary'
            ? new Set(value.projects.map(({ id }) => id))
            : value.snapshotIds,
        validation: undefined,
        announcement:
          kind === 'ordinary'
            ? 'Opening project…'
            : 'Retrying the same submission…',
      }))
      void registration(payload, controller.signal).then((result) => {
        if (!owns(current)) return
        if (superseded(current)) return
        finish(current)
        generation.current += 1
        setState((value) => {
          if (result.kind === 'success') {
            return {
              ...value,
              projects: survivors(upsert(value.projects, result.project)),
              mode: 'editing',
              activeKind: undefined,
              lockedPayload: undefined,
              validation: undefined,
              announcement:
                result.disposition === 'created'
                  ? 'Project created.'
                  : 'Project already registered.',
              focusProjectId: result.project.id,
              focusTarget: 'open',
              focusVersion: value.focusVersion + 1,
            }
          }
          if (result.kind === 'failure') {
            if (kind === 'retry') {
              return {
                ...value,
                mode: 'unknown',
                activeKind: undefined,
                announcement:
                  REGISTRATION_FAILURE_MESSAGES[result.category] +
                  ' Submission outcome remains unknown.',
              }
            }
            return {
              ...value,
              mode: 'editing',
              activeKind: undefined,
              lockedPayload: undefined,
              validation: REGISTRATION_FAILURE_MESSAGES[result.category],
              announcement: REGISTRATION_FAILURE_MESSAGES[result.category],
              inputFocusVersion: value.inputFocusVersion + 1,
            }
          }
          if (result.kind === 'not_transmitted') {
            return kind === 'retry'
              ? {
                  ...value,
                  mode: 'unknown',
                  activeKind: undefined,
                  announcement:
                    'No request was sent. Submission outcome remains unknown.',
                }
              : {
                  ...value,
                  mode: 'editing',
                  activeKind: undefined,
                  lockedPayload: undefined,
                  announcement: 'No request was sent. You can try again.',
                }
          }
          return {
            ...value,
            mode: 'unknown',
            activeKind: undefined,
            announcement: 'Submission outcome unknown.',
          }
        })
      })
    },
    [finish, invalidate, owns, registration, superseded, survivors]
  )
  beginRegistrationRef.current = beginRegistration

  const submit = useCallback(() => {
    const value = latest.current
    if (
      value.listStatus !== 'success' ||
      value.mode !== 'editing' ||
      value.closeDialogId !== undefined ||
      owner.current !== undefined
    )
      return
    if (value.input.trim().length === 0) {
      setState((current) => ({
        ...current,
        validation: REGISTRATION_FAILURE_MESSAGES.path_required,
        announcement: REGISTRATION_FAILURE_MESSAGES.path_required,
        inputFocusVersion: current.inputFocusVersion + 1,
      }))
      return
    }
    beginRegistration('ordinary', serializeRegistrationPath(value.input))
  }, [beginRegistration])

  const cancel = useCallback(() => {
    if (
      owner.current === undefined ||
      !['ordinary', 'retry', 'refresh'].includes(owner.current.kind)
    )
      return
    const kind = owner.current.kind
    invalidate()
    setState((current) =>
      kind === 'ordinary'
        ? {
            ...current,
            mode: 'editing',
            activeKind: undefined,
            lockedPayload: undefined,
            announcement: 'Submission cancelled.',
          }
        : {
            ...current,
            mode: 'unknown',
            activeKind: undefined,
            announcement:
              kind === 'retry'
                ? 'Retry cancelled. Submission outcome unknown.'
                : 'Refresh cancelled. Submission outcome unknown.',
          }
    )
  }, [invalidate])

  const retrySameSubmission = useCallback(() => {
    const value = latest.current
    if (
      value.mode !== 'unknown' ||
      value.lockedPayload === undefined ||
      owner.current !== undefined
    )
      return
    beginRegistration('retry', value.lockedPayload)
  }, [beginRegistration])

  const refreshProjects = useCallback(() => {
    if (latest.current.mode !== 'unknown' || owner.current !== undefined) return
    runList(true)
  }, [runList])

  const resetRecovery = useCallback(() => {
    if (latest.current.mode !== 'ambiguous') return
    invalidate()
    setState((value) => ({
      ...value,
      mode: 'editing',
      lockedPayload: undefined,
      activeKind: undefined,
      announcement: 'Recovery reset. You can make a new submission.',
      inputFocusVersion: value.inputFocusVersion + 1,
    }))
  }, [invalidate])

  const retryList = useCallback(() => {
    if (latest.current.listStatus !== 'failure') return
    runList(false)
  }, [runList])

  const openClose = useCallback((id: string) => {
    const value = latest.current
    if (
      value.listStatus !== 'success' ||
      value.mode !== 'editing' ||
      value.closeDialogId !== undefined ||
      value.closes.get(id) !== undefined ||
      closeOwners.current.has(id) ||
      restartOwners.current.has(id) ||
      value.stop?.id === id ||
      owner.current !== undefined
    )
      return
    const originalIndex = value.projects.findIndex(
      (project) => project.id === id
    )
    const project = value.projects[originalIndex]
    if (project === undefined) return
    setState((current) => ({
      ...current,
      closes: withClose(current.closes, project.id, {
        id: project.id,
        name: project.name,
        originalIndex,
        phase: 'confirming',
        transmitted: false,
      }),
      closeDialogId: project.id,
      announcement: '',
    }))
  }, [])

  const cancelClose = useCallback(() => {
    const value = latest.current
    const projectId = value.closeDialogId
    if (projectId === undefined) return
    const close = value.closes.get(projectId)
    if (
      close === undefined ||
      (close.phase !== 'confirming' &&
        !(close.phase === 'pending' && !close.transmitted))
    )
      return
    const pending = closeOwners.current.get(projectId)
    if (pending !== undefined) {
      pending.active = false
      closeOwners.current.delete(projectId)
      pending.controller.abort()
    }
    setState((current) => ({
      ...current,
      closes: withClose(current.closes, projectId, undefined),
      closeDialogId: undefined,
      announcement: close.name + ': Close cancelled.',
      focusProjectId: projectId,
      focusTarget: 'close',
      focusVersion: current.focusVersion + 1,
    }))
  }, [])

  const beginClose = useCallback(
    (projectId: string, kind: 'close' | 'close-retry') => {
      const value = latest.current
      const close = value.closes.get(projectId)
      if (close === undefined) return
      // Owner layer: one transmission per project at a time.
      if (closeOwners.current.has(projectId)) return
      if (kind === 'close') {
        if (value.closeDialogId !== projectId) return
        if (close.phase !== 'confirming') return
        // Transmitted layer: one send per record.
        if (close.transmitted) return
      } else if (close.phase !== 'retry') return
      const controller = new AbortController()
      const current: CloseOwner = {
        projectId,
        generation: ++closeGeneration.current,
        controller,
        active: true,
      }
      closeOwners.current.set(projectId, current)
      setState((state) => {
        const record = state.closes.get(projectId)
        if (record === undefined) return state
        return {
          ...state,
          closes: withClose(state.closes, projectId, {
            ...record,
            phase: 'pending',
            transmitted: false,
            message: undefined,
          }),
          announcement: record.name + ': Preparing to close project…',
        }
      })
      void closeTransport(projectId, controller.signal, () => {
        if (!ownsClose(projectId, current)) return
        setState((state) => {
          const record = state.closes.get(projectId)
          if (record === undefined || record.transmitted) return state
          return {
            ...state,
            closes: withClose(state.closes, projectId, {
              ...record,
              transmitted: true,
            }),
            closeDialogId: dismissDialog(state, projectId),
            announcement: record.name + ': Close request sent.',
            focusProjectId: projectId,
            focusTarget: 'close-status',
            focusVersion: state.focusVersion + 1,
          }
        })
      }).then((result) => {
        if (!ownsClose(projectId, current)) return
        current.active = false
        closeOwners.current.delete(projectId)
        const settled = result.kind === 'success' && result.id === projectId
        let settlementVersion = closeSettlements.current
        if (settled) {
          closedProjectIds.current.add(projectId)
          closeSettlements.current += 1
          settlementVersion = closeSettlements.current
        }
        setState((state) => {
          const record = state.closes.get(projectId)
          if (record === undefined) return state
          const focus = {
            focusProjectId: projectId,
            focusVersion: state.focusVersion + 1,
          }
          if (settled) {
            return applyCloseSuccess(state, record, settlementVersion)
          }
          const dismissed = {
            ...state,
            closeDialogId: dismissDialog(state, projectId),
          }
          if (result.kind === 'success') {
            return {
              ...dismissed,
              ...focus,
              closes: withClose(state.closes, projectId, {
                ...record,
                phase: 'unknown',
                transmitted: true,
                message: 'Close result unknown. Refresh projects.',
              }),
              focusTarget: 'close-refresh',
              announcement:
                record.name +
                ': Close outcome unknown. Refresh projects to determine the result.',
            }
          }
          if (result.kind === 'failure') {
            const requiresRefresh = result.category === 'project_not_found'
            return {
              ...dismissed,
              ...focus,
              closes: withClose(state.closes, projectId, {
                ...record,
                phase: requiresRefresh ? 'unknown' : 'retry',
                transmitted: true,
                message: CLOSE_FAILURE_MESSAGES[result.category],
              }),
              focusTarget: requiresRefresh ? 'close-refresh' : 'close-retry',
              announcement:
                record.name + ': ' + CLOSE_FAILURE_MESSAGES[result.category],
            }
          }
          if (result.kind === 'not_transmitted') {
            return {
              ...dismissed,
              ...focus,
              closes: withClose(state.closes, projectId, {
                ...record,
                phase: 'retry',
                transmitted: false,
                message: 'No close request was sent. Retry this project.',
              }),
              focusTarget: 'close-retry',
              announcement:
                record.name +
                ': No close request was sent. Retry this project.',
            }
          }
          return {
            ...dismissed,
            ...focus,
            closes: withClose(state.closes, projectId, {
              ...record,
              phase: 'unknown',
              transmitted: true,
              message: 'Close result unknown. Refresh projects.',
            }),
            focusTarget: 'close-refresh',
            announcement:
              record.name +
              ': Close outcome unknown. Refresh projects to determine the result.',
          }
        })
      })
    },
    [closeTransport, ownsClose]
  )

  const confirmClose = useCallback(() => {
    const projectId = latest.current.closeDialogId
    if (projectId === undefined) return
    beginClose(projectId, 'close')
  }, [beginClose])

  const retryClose = useCallback(
    (projectId: string) => beginClose(projectId, 'close-retry'),
    [beginClose]
  )

  const runCloseRefresh = useCallback(
    (projectId: string) => {
      const record = latest.current.closes.get(projectId)
      if (
        record === undefined ||
        (record.phase !== 'unknown' && record.phase !== 'refreshing') ||
        closeOwners.current.has(projectId) ||
        owner.current !== undefined
      )
        return
      invalidate()
      const controller = new AbortController()
      const current: Owner = {
        generation: generation.current,
        kind: 'close-refresh',
        controller,
        closeSettlementVersionAtIssue: closeSettlements.current,
        replay: () => runCloseRefreshRef.current(projectId),
        active: true,
      }
      owner.current = current
      setState((value) => {
        const pending = value.closes.get(projectId)
        if (pending === undefined) return value
        return {
          ...value,
          activeKind: 'close-refresh',
          closes: withClose(value.closes, projectId, {
            ...pending,
            phase: 'refreshing',
            transmitted: true,
          }),
          announcement:
            pending.name +
            ': Refreshing projects to determine the close result…',
        }
      })
      const failed = (): void => {
        if (!owns(current)) return
        finish(current)
        generation.current += 1
        setState((value) => {
          const pending = value.closes.get(projectId)
          if (pending === undefined) return value
          return {
            ...value,
            activeKind: undefined,
            closes: withClose(value.closes, projectId, {
              ...pending,
              phase: 'unknown',
              transmitted: true,
              message: 'Close result is still unknown. Refresh projects again.',
            }),
            focusProjectId: projectId,
            focusTarget: 'close-refresh',
            focusVersion: value.focusVersion + 1,
            announcement:
              pending.name +
              ': Close result is still unknown. Refresh projects again.',
          }
        })
      }
      current.timer = setTimeout(() => {
        if (!owns(current)) return
        controller.abort()
        failed()
      }, listTimeoutMs)
      void loader(controller.signal).then((loaded) => {
        if (!owns(current)) return
        if (superseded(current)) return
        const authoritative = survivors(loaded)
        const ids = new Set(authoritative.map(({ id }) => id))
        if (ids.size !== authoritative.length) {
          failed()
          return
        }
        finish(current)
        generation.current += 1
        const absent = !ids.has(projectId)
        let settlementVersion = closeSettlements.current
        if (absent) {
          closedProjectIds.current.add(projectId)
          closeSettlements.current += 1
          settlementVersion = closeSettlements.current
        }
        setState((value) => {
          const pending = value.closes.get(projectId)
          if (pending === undefined) return value
          if (absent) {
            return applyCloseSuccess(
              { ...value, activeKind: undefined },
              pending,
              settlementVersion,
              authoritative
            )
          }
          return {
            ...value,
            projects: authoritative,
            activeKind: undefined,
            closes: withClose(value.closes, projectId, {
              ...pending,
              phase: 'retry',
              transmitted: true,
              message: 'The project remains registered. Retry this project.',
            }),
            focusProjectId: projectId,
            focusTarget: 'close-retry',
            focusVersion: value.focusVersion + 1,
            announcement:
              pending.name +
              ': The project remains registered. Retry this project.',
          }
        })
      }, failed)
    },
    [finish, invalidate, listTimeoutMs, loader, owns, superseded, survivors]
  )
  runCloseRefreshRef.current = runCloseRefresh

  const refreshClose = useCallback(
    (projectId: string) => {
      if (latest.current.closes.get(projectId)?.phase !== 'unknown') return
      if (closeOwners.current.has(projectId)) return
      if (owner.current !== undefined) return
      runCloseRefresh(projectId)
    },
    [runCloseRefresh]
  )

  const stop = useCallback(
    (projectId: string) => {
      const value = latest.current
      const retrying =
        value.stop?.id === projectId && value.stop.phase === 'retry'
      if (
        value.listStatus !== 'success' ||
        value.mode !== 'editing' ||
        value.closes.has(projectId) ||
        closeOwners.current.has(projectId) ||
        restartOwners.current.has(projectId) ||
        stopOwner.current !== undefined ||
        (value.stop !== undefined && !retrying)
      ) {
        return
      }
      const project = value.projects.find(({ id }) => id === projectId)
      if (project === undefined) return
      const controller = new AbortController()
      const current: StopOwner = {
        projectId,
        generation: ++stopGeneration.current,
        controller,
        active: true,
      }
      stopOwner.current = current
      const ownsStop = (): boolean =>
        mounted.current && current.active && stopOwner.current === current
      setState((currentState) => ({
        ...currentState,
        stop: { id: projectId, phase: 'pending' },
        announcement: `${project.name}: Stopping workbench.`,
      }))
      void stopTransport(projectId, controller.signal).then((result) => {
        if (!ownsStop()) return
        current.active = false
        stopOwner.current = undefined
        setState((currentState) => {
          if (currentState.stop?.id !== projectId) return currentState
          const focus = {
            focusProjectId: projectId,
            focusTarget: 'stop' as const,
            focusVersion: currentState.focusVersion + 1,
          }
          if (result.kind === 'success' && result.id === projectId) {
            return {
              ...currentState,
              ...focus,
              stop: undefined,
              stopSettlementVersion: currentState.stopSettlementVersion + 1,
              announcement:
                result.outcome === 'stopped'
                  ? `${project.name}: Workbench stopped. The project remains registered.`
                  : `${project.name}: Workbench was already stopped.`,
            }
          }
          if (result.kind === 'failure') {
            return {
              ...currentState,
              ...focus,
              stop: {
                id: projectId,
                phase: 'retry',
                category: result.category,
              },
              announcement: RUNTIME_STOP_NOTICES[result.category],
            }
          }
          return {
            ...currentState,
            ...focus,
            stop: { id: projectId, phase: 'unknown' },
            announcement: `${project.name}: Stop outcome unknown. Refresh runtime state.`,
          }
        })
      })
    },
    [stopTransport]
  )

  const restart = useCallback(
    (projectId: string) => {
      const value = latest.current
      const restartState = value.restarts.get(projectId)
      const retrying = restartState?.phase === 'retry'
      if (
        value.listStatus !== 'success' ||
        value.mode !== 'editing' ||
        value.closes.has(projectId) ||
        closeOwners.current.has(projectId) ||
        value.stop?.id === projectId ||
        restartOwners.current.has(projectId) ||
        (restartState !== undefined && !retrying)
      ) {
        return
      }
      const project = value.projects.find(({ id }) => id === projectId)
      if (project === undefined) return
      const controller = new AbortController()
      const current: RestartOwner = {
        projectId,
        generation: ++restartGeneration.current,
        controller,
        active: true,
      }
      restartOwners.current.set(projectId, current)
      const ownsRestart = (): boolean =>
        mounted.current &&
        current.active &&
        restartOwners.current.get(projectId) === current
      setState((currentState) => {
        const restarts = new Map(currentState.restarts)
        restarts.set(projectId, { id: projectId, phase: 'pending' })
        return {
          ...currentState,
          restarts,
          announcement: `${project.name}: Restarting workbench.`,
        }
      })
      void restartTransport(projectId, controller.signal).then((result) => {
        if (!ownsRestart()) return
        current.active = false
        restartOwners.current.delete(projectId)
        setState((currentState) => {
          const restarts = new Map(currentState.restarts)
          const focus = {
            focusProjectId: projectId,
            focusTarget: 'restart' as const,
            focusVersion: currentState.focusVersion + 1,
          }
          if (result.kind === 'success' && result.id === projectId) {
            restarts.delete(projectId)
            return {
              ...currentState,
              ...focus,
              restarts,
              restartSettlementVersion:
                currentState.restartSettlementVersion + 1,
              announcement: `${project.name}: Workbench restarted.`,
            }
          }
          if (result.kind === 'failure') {
            restarts.set(projectId, {
              id: projectId,
              phase: 'retry',
              category: result.category,
            })
            return {
              ...currentState,
              ...focus,
              restarts,
              announcement: RUNTIME_RESTART_NOTICES[result.category],
            }
          }
          restarts.set(projectId, { id: projectId, phase: 'unknown' })
          return {
            ...currentState,
            ...focus,
            restarts,
            announcement: `${project.name}: Restart outcome unknown. Refresh runtime state.`,
          }
        })
      })
    },
    [restartTransport]
  )

  /** The single admission authority. Rendering derives every `disabled` value
   * from it, so a rendered control is enabled exactly when its activation
   * would be admitted. */
  const admits = (action: ProjectHomeAction, projectId: string): boolean => {
    if (state.listStatus !== 'success' || state.mode !== 'editing') return false
    if (!state.projects.some(({ id }) => id === projectId)) return false
    const close = state.closes.get(projectId)
    const closing = close !== undefined || closeOwners.current.has(projectId)
    switch (action) {
      case 'open':
        return !closing && state.restarts.get(projectId)?.phase !== 'pending'
      case 'close':
        return (
          state.closeDialogId === undefined &&
          !closing &&
          !restartOwners.current.has(projectId) &&
          state.stop?.id !== projectId &&
          owner.current === undefined
        )
      case 'retry-close':
        return close?.phase === 'retry' && !closeOwners.current.has(projectId)
      case 'refresh-close':
        return (
          close?.phase === 'unknown' &&
          !closeOwners.current.has(projectId) &&
          owner.current === undefined
        )
      case 'stop':
        return (
          !closing &&
          !restartOwners.current.has(projectId) &&
          stopOwner.current === undefined &&
          (state.stop === undefined ||
            (state.stop.id === projectId && state.stop.phase === 'retry'))
        )
      case 'restart':
        return (
          !closing &&
          state.stop?.id !== projectId &&
          !restartOwners.current.has(projectId) &&
          (state.restarts.get(projectId) === undefined ||
            state.restarts.get(projectId)?.phase === 'retry')
        )
    }
  }

  return {
    state,
    setInput,
    submit,
    cancel,
    retrySameSubmission,
    refreshProjects,
    resetRecovery,
    retryList,
    admits,
    openClose,
    cancelClose,
    confirmClose,
    retryClose,
    refreshClose,
    stop,
    restart,
  }
}
