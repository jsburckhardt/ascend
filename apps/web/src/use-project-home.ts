import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadProjects,
  orderProjects,
  PROJECT_LIST_TIMEOUT_MS,
  registerProject,
  REGISTRATION_FAILURE_MESSAGES,
  serializeRegistrationPath,
  type Project,
  type ProjectLoader,
  type RegistrationTransport,
} from './projects'

export type ProjectHomeMode =
  'editing' | 'ordinary-pending' | 'unknown' | 'recovery-pending' | 'ambiguous'

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
  readonly activeKind?: 'ordinary' | 'retry' | 'refresh'
  readonly inputFocusVersion: number
}

interface Owner {
  readonly generation: number
  readonly kind: 'list' | 'ordinary' | 'retry' | 'refresh'
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
}

export interface ProjectHomeDependencies {
  readonly load?: ProjectLoader
  readonly register?: RegistrationTransport
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

export function useProjectHome(
  dependencies: ProjectHomeDependencies = {}
): ProjectHomeController {
  const loader = dependencies.load ?? loadProjects
  const registration = dependencies.register ?? registerProject
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
    if (latest.current.mode !== 'editing' || owner.current !== undefined) return
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

  return {
    state,
    setInput,
    submit,
    cancel,
    retrySameSubmission,
    refreshProjects,
    resetRecovery,
    retryList,
  }
}
