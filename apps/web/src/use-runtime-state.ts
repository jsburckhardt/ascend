import { useCallback, useEffect, useState } from 'react'

import {
  RUNTIME_STATE_TIMEOUT_MS,
  loadRuntimeStates,
  reconcileRuntimeReports,
  type RuntimeReport,
  type RuntimeStateLoader,
} from './runtime-state'

export interface ProjectListRevision {
  readonly id: number
  readonly projectIds: readonly string[]
}

export type RuntimeStateView =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'success'
      readonly reports: readonly RuntimeReport[]
    }
  | {
      readonly kind: 'failure'
      readonly reason: 'transport' | 'timeout' | 'mismatch'
      readonly mismatchReason?: 'missing' | 'extra' | 'duplicate' | 'order'
    }

interface RuntimeStateOptions {
  readonly loader?: RuntimeStateLoader
  readonly timeoutMs?: number
}

export interface RuntimeStateController {
  readonly view: RuntimeStateView
  readonly retry: () => void
  readonly refresh: () => void
}

const IDLE_VIEW = Object.freeze({ kind: 'idle' } satisfies RuntimeStateView)
const LOADING_VIEW = Object.freeze({
  kind: 'loading',
} satisfies RuntimeStateView)

export function useRuntimeState(
  revision: ProjectListRevision | undefined,
  options: RuntimeStateOptions = {}
): RuntimeStateController {
  const loader = options.loader ?? loadRuntimeStates
  const timeoutMs = options.timeoutMs ?? RUNTIME_STATE_TIMEOUT_MS
  const [requestId, setRequestId] = useState(0)
  const [view, setView] = useState<RuntimeStateView>(IDLE_VIEW)
  const requestAgain = useCallback(() => setRequestId((id) => id + 1), [])
  const revisionId = revision?.id

  useEffect(() => {
    if (revision === undefined) {
      setView(IDLE_VIEW)
      return undefined
    }

    let settled = false
    const controller = new AbortController()
    setView(LOADING_VIEW)
    const timeout = window.setTimeout(() => {
      if (settled) return
      settled = true
      controller.abort()
      setView(Object.freeze({ kind: 'failure', reason: 'timeout' }))
    }, timeoutMs)

    void loader(controller.signal).then(
      (reports) => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        const reconciliation = reconcileRuntimeReports(
          reports,
          revision.projectIds
        )
        if (reconciliation.kind === 'mismatch') {
          setView(
            Object.freeze({
              kind: 'failure',
              reason: 'mismatch',
              mismatchReason: reconciliation.reason,
            })
          )
          return
        }
        setView(
          Object.freeze({
            kind: 'success',
            reports: reconciliation.reports,
          })
        )
      },
      () => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        setView(Object.freeze({ kind: 'failure', reason: 'transport' }))
      }
    )

    return () => {
      settled = true
      window.clearTimeout(timeout)
      controller.abort()
    }
    // The revision ID, not transient object identity, owns request issuance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loader, requestId, revisionId, timeoutMs])

  return { view, retry: requestAgain, refresh: requestAgain }
}
