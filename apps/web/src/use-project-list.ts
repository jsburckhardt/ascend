import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadProjects,
  PROJECT_LIST_TIMEOUT_MS,
  type Project,
  type ProjectLoader,
} from './projects'

export type ProjectListState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly projects: readonly Project[] }
  | { readonly status: 'failure' }

interface RequestOwner {
  readonly id: number
  readonly controller: AbortController
  timer: ReturnType<typeof setTimeout>
  active: boolean
}

export interface ProjectListController {
  readonly state: ProjectListState
  retry(): void
}

export function useProjectList(
  loader: ProjectLoader = loadProjects,
  timeoutMs = PROJECT_LIST_TIMEOUT_MS
): ProjectListController {
  const [state, setState] = useState<ProjectListState>({ status: 'loading' })
  const mounted = useRef(false)
  const nextRequestId = useRef(0)
  const owner = useRef<RequestOwner | undefined>(undefined)

  const retry = useCallback(() => {
    const previous = owner.current
    if (previous !== undefined) {
      previous.active = false
      clearTimeout(previous.timer)
      previous.controller.abort()
    }

    const requestId = ++nextRequestId.current
    const controller = new AbortController()
    const current: RequestOwner = {
      id: requestId,
      controller,
      active: true,
      timer: setTimeout(() => undefined, 0),
    }
    owner.current = current
    setState({ status: 'loading' })

    current.timer = setTimeout(() => {
      if (
        !mounted.current ||
        !current.active ||
        owner.current?.id !== requestId
      ) {
        return
      }
      current.active = false
      controller.abort()
      setState({ status: 'failure' })
    }, timeoutMs)

    void loader(controller.signal).then(
      (projects) => {
        if (
          !mounted.current ||
          !current.active ||
          owner.current?.id !== requestId
        ) {
          return
        }
        current.active = false
        clearTimeout(current.timer)
        setState({ status: 'success', projects })
      },
      () => {
        if (
          !mounted.current ||
          !current.active ||
          owner.current?.id !== requestId
        ) {
          return
        }
        current.active = false
        clearTimeout(current.timer)
        setState({ status: 'failure' })
      }
    )
  }, [loader, timeoutMs])

  useEffect(() => {
    mounted.current = true
    retry()
    return () => {
      mounted.current = false
      const current = owner.current
      if (current !== undefined) {
        current.active = false
        clearTimeout(current.timer)
        current.controller.abort()
      }
    }
  }, [retry])

  return { state, retry }
}
