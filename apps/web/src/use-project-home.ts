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
  readonly activeKind?:
    'ordinary' | 'retry' | 'refresh' | 'close' | 'close-retry' | 'close-refresh'
  readonly inputFocusVersion: number
  readonly close?: ProjectCloseState
  readonly focusTarget?: 'open' | 'close' | 'heading'
}

interface Owner {
  readonly generation: number
  readonly kind:
    | 'list'
    | 'ordinary'
    | 'retry'
    | 'refresh'
    | 'close'
    | 'close-retry'
    | 'close-refresh'
  readonly controller: AbortController
  timer?: ReturnType<typeof setTimeout>
  active: boolean
}

export interface ProjectHomeController {
  readonly state: ProjectHomeState
  setInput(value: string): void
  submit(): void
  cancel(): void
  retrySameSubmission(): void
  refreshProjects(): void
  resetRecovery(): void
  retryList(): void
  openClose(id: string): void
  cancelClose(): void
  confirmClose(): void
  retryClose(): void
  refreshClose(): void
}

export interface ProjectHomeDependencies {
  readonly load?: ProjectLoader
  readonly register?: RegistrationTransport
  readonly close?: CloseTransport
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
}

function upsert(projects: readonly Project[], project: Project): Project[] {
  return orderProjects([
    ...projects.filter(({ id }) => id !== project.id),
    project,
  ])
}

function applyCloseSuccess(
  state: ProjectHomeState,
  authoritativeProjects?: readonly Project[]
): ProjectHomeState {
  const close = state.close
  if (close === undefined) return state
  const projects = (authoritativeProjects ?? state.projects).filter(
    ({ id }) => id !== close.id
  )
  const next =
    projects[close.originalIndex] ?? projects[close.originalIndex - 1]
  return {
    ...state,
    projects,
    close: undefined,
    activeKind: undefined,
    announcement: 'Project closed.',
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
  const listTimeoutMs = dependencies.listTimeoutMs ?? PROJECT_LIST_TIMEOUT_MS
  const [state, setState] = useState<ProjectHomeState>(initialState)
  const latest = useRef(state)
  latest.current = state
  const mounted = useRef(false)
  const generation = useRef(0)
  const owner = useRef<Owner | undefined>(undefined)

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

  const runList = useCallback(
    (recovery: boolean) => {
      if (owner.current !== undefined) return
      invalidate()
      const controller = new AbortController()
      const current: Owner = {
        generation: generation.current,
        kind: recovery ? 'refresh' : 'list',
        controller,
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
          finish(current)
          generation.current += 1
          const authoritative = orderProjects(projects)
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
    [finish, invalidate, listTimeoutMs, loader, owns]
  )

  useEffect(() => {
    mounted.current = true
    runList(false)
    return () => {
      mounted.current = false
      invalidate()
    }
  }, [invalidate, runList])

  const setInput = useCallback((input: string) => {
    if (
      latest.current.mode !== 'editing' ||
      latest.current.close !== undefined ||
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
        finish(current)
        generation.current += 1
        setState((value) => {
          if (result.kind === 'success') {
            return {
              ...value,
              projects: upsert(value.projects, result.project),
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
    [finish, invalidate, owns, registration]
  )

  const submit = useCallback(() => {
    const value = latest.current
    if (
      value.listStatus !== 'success' ||
      value.mode !== 'editing' ||
      value.close !== undefined ||
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
      value.close !== undefined ||
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
      close: {
        id: project.id,
        name: project.name,
        originalIndex,
        phase: 'confirming',
        transmitted: false,
      },
      announcement: '',
    }))
  }, [])

  const cancelClose = useCallback(() => {
    const close = latest.current.close
    if (
      close === undefined ||
      (close.phase !== 'confirming' &&
        !(close.phase === 'pending' && !close.transmitted))
    )
      return
    if (
      owner.current?.kind === 'close' ||
      owner.current?.kind === 'close-retry'
    ) {
      invalidate()
    }
    setState((value) => ({
      ...value,
      close: undefined,
      activeKind: undefined,
      announcement: 'Close cancelled.',
      focusProjectId: close.id,
      focusTarget: 'close',
      focusVersion: value.focusVersion + 1,
    }))
  }, [invalidate])

  const beginClose = useCallback(
    (kind: 'close' | 'close-retry') => {
      const close = latest.current.close
      if (
        close === undefined ||
        owner.current !== undefined ||
        (kind === 'close' && close.phase !== 'confirming') ||
        (kind === 'close-retry' && close.phase !== 'retry')
      )
        return
      invalidate()
      const controller = new AbortController()
      const current: Owner = {
        generation: generation.current,
        kind,
        controller,
        active: true,
      }
      owner.current = current
      setState((value) => ({
        ...value,
        close:
          value.close === undefined
            ? undefined
            : {
                ...value.close,
                phase: 'pending',
                transmitted: false,
                message: undefined,
              },
        activeKind: kind,
        announcement: 'Preparing to close project…',
      }))
      void closeTransport(close.id, controller.signal, () => {
        if (!owns(current)) return
        setState((value) => ({
          ...value,
          close:
            value.close === undefined
              ? undefined
              : { ...value.close, transmitted: true },
          announcement: 'Closing project…',
        }))
      }).then((result) => {
        if (!owns(current)) return
        finish(current)
        generation.current += 1
        setState((value) => {
          if (value.close === undefined) return value
          if (result.kind === 'success') {
            return result.id === value.close.id
              ? applyCloseSuccess(value)
              : {
                  ...value,
                  activeKind: undefined,
                  close: {
                    ...value.close,
                    phase: 'unknown',
                    transmitted: true,
                  },
                  announcement: 'Close result unknown. Refresh projects.',
                }
          }
          if (result.kind === 'failure') {
            const requiresRefresh = result.category === 'project_not_found'
            return {
              ...value,
              activeKind: undefined,
              close: {
                ...value.close,
                phase: requiresRefresh ? 'unknown' : 'retry',
                transmitted: true,
                message: CLOSE_FAILURE_MESSAGES[result.category],
              },
              announcement: CLOSE_FAILURE_MESSAGES[result.category],
            }
          }
          if (result.kind === 'not_transmitted') {
            return {
              ...value,
              activeKind: undefined,
              close: {
                ...value.close,
                phase: 'retry',
                transmitted: false,
                message: 'No close request was sent. Retry this project.',
              },
              announcement: 'No close request was sent. Retry this project.',
            }
          }
          return {
            ...value,
            activeKind: undefined,
            close: {
              ...value.close,
              phase: 'unknown',
              transmitted: true,
              message: 'Close result unknown. Refresh projects.',
            },
            announcement: 'Close result unknown. Refresh projects.',
          }
        })
      })
    },
    [closeTransport, finish, invalidate, owns]
  )

  const confirmClose = useCallback(() => beginClose('close'), [beginClose])
  const retryClose = useCallback(() => beginClose('close-retry'), [beginClose])

  const refreshClose = useCallback(() => {
    const close = latest.current.close
    if (
      close === undefined ||
      close.phase !== 'unknown' ||
      owner.current !== undefined
    )
      return
    invalidate()
    const controller = new AbortController()
    const current: Owner = {
      generation: generation.current,
      kind: 'close-refresh',
      controller,
      active: true,
    }
    owner.current = current
    setState((value) => ({
      ...value,
      activeKind: 'close-refresh',
      close:
        value.close === undefined
          ? undefined
          : { ...value.close, phase: 'refreshing', transmitted: true },
      announcement: 'Refreshing projects to determine the close result…',
    }))
    const failed = (): void => {
      if (!owns(current)) return
      finish(current)
      generation.current += 1
      setState((value) => ({
        ...value,
        activeKind: undefined,
        close:
          value.close === undefined
            ? undefined
            : {
                ...value.close,
                phase: 'unknown',
                transmitted: true,
                message:
                  'Close result is still unknown. Refresh projects again.',
              },
        announcement: 'Close result is still unknown. Refresh projects again.',
      }))
    }
    current.timer = setTimeout(() => {
      if (!owns(current)) return
      controller.abort()
      failed()
    }, listTimeoutMs)
    void loader(controller.signal).then((loaded) => {
      if (!owns(current)) return
      const authoritative = orderProjects(loaded)
      const ids = new Set(authoritative.map(({ id }) => id))
      if (ids.size !== authoritative.length) {
        failed()
        return
      }
      finish(current)
      generation.current += 1
      setState((value) => {
        if (value.close === undefined) return value
        if (!ids.has(value.close.id)) {
          return applyCloseSuccess(value, authoritative)
        }
        return {
          ...value,
          projects: authoritative,
          activeKind: undefined,
          close: {
            ...value.close,
            phase: 'retry',
            transmitted: true,
            message: 'The project remains registered. Retry this project.',
          },
          announcement: 'The project remains registered. Retry this project.',
        }
      })
    }, failed)
  }, [finish, invalidate, listTimeoutMs, loader, owns])

  return {
    state,
    setInput,
    submit,
    cancel,
    retrySameSubmission,
    refreshProjects,
    resetRecovery,
    retryList,
    openClose,
    cancelClose,
    confirmClose,
    retryClose,
    refreshClose,
  }
}
