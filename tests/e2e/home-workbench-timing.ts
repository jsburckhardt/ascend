import type { ChildProcessWithoutNullStreams } from 'node:child_process'

export const HOME_WORKBENCH_STEP_BOUNDS_MS = {
  setup: 5_000,
  apiReadiness: 15_000,
  webReadiness: 10_000,
  runtimeReadiness: 30_000,
  workbenchReadiness: 30_000,
  terminalOperations: 15_000,
  threeEntries: 25_000,
  history: 25_000,
  deepLink: 35_000,
  evidence: 5_000,
  cleanup: 10_000,
} as const

export const HOME_WORKBENCH_MARGIN_MS = 15_000
export const HOME_WORKBENCH_OVERALL_MS =
  Object.values(HOME_WORKBENCH_STEP_BOUNDS_MS).reduce(
    (total, bound) => total + bound,
    0
  ) + HOME_WORKBENCH_MARGIN_MS

export type HomeWorkbenchStepName = keyof typeof HOME_WORKBENCH_STEP_BOUNDS_MS

export interface HomeWorkbenchStepTiming {
  readonly name: HomeWorkbenchStepName
  readonly boundMs: number
  readonly startMs: number
  readonly endMs: number
  readonly durationMs: number
  readonly outcome: 'passed' | 'failed' | 'timed-out'
}

const timeoutAfter = (milliseconds: number): Promise<never> =>
  new Promise((_, reject) => {
    const timer = setTimeout(
      () => reject(new Error('step-timeout')),
      milliseconds
    )
    timer.unref()
  })

export interface ProcessHttpReadiness {
  readonly logHintAtMs: number | null
  readonly listenerReadyAtMs: number
}

export interface ProcessHttpReadinessOptions {
  readonly url: string
  readonly label: string
  readonly timeoutMs: number
  readonly logHint: string
  readonly expectedStatus: number
  readonly expectedBody: string
  readonly ownsListener: () => Promise<boolean>
  readonly signal?: AbortSignal
  readonly pollIntervalMs?: number
}

export const waitForProcessHttpReady = async (
  child: ChildProcessWithoutNullStreams,
  options: ProcessHttpReadinessOptions
): Promise<ProcessHttpReadiness> =>
  new Promise((resolve, reject) => {
    const startedAtMs = Date.now()
    const deadlineMs = startedAtMs + options.timeoutMs
    const pollIntervalMs = options.pollIntervalMs ?? 25
    let logHintAtMs: number | null = null
    let settled = false
    let pollTimer: NodeJS.Timeout | undefined
    let requestController: AbortController | undefined

    const inspect = (value: Buffer): void => {
      if (
        logHintAtMs === null &&
        value.toString('utf8').includes(options.logHint)
      ) {
        logHintAtMs = Date.now()
      }
    }
    const message = (value: unknown): void => {
      if (
        logHintAtMs === null &&
        typeof value === 'object' &&
        value !== null &&
        'status' in value &&
        value.status === 'log-hint'
      ) {
        logHintAtMs = Date.now()
      }
    }
    const cleanup = (): void => {
      if (pollTimer !== undefined) clearTimeout(pollTimer)
      requestController?.abort()
      child.stdout.off('data', inspect)
      child.stderr.off('data', inspect)
      child.off('message', message)
      child.off('exit', exited)
      options.signal?.removeEventListener('abort', cancelled)
    }
    const settle = (complete: () => void): void => {
      if (settled) return
      settled = true
      cleanup()
      complete()
    }
    const exited = (): void =>
      settle(() =>
        reject(new Error(options.label + ' exited before HTTP readiness'))
      )
    const cancelled = (): void =>
      settle(() =>
        reject(new Error(options.label + ' readiness was cancelled'))
      )
    const schedule = (): void => {
      if (settled) return
      const remainingMs = deadlineMs - Date.now()
      if (remainingMs <= 0) {
        settle(() =>
          reject(new Error(options.label + ' HTTP readiness timed out'))
        )
        return
      }
      pollTimer = setTimeout(
        () => void probe(),
        Math.min(pollIntervalMs, remainingMs)
      )
    }
    const probe = async (): Promise<void> => {
      if (settled) return
      if (options.signal?.aborted) {
        cancelled()
        return
      }
      if (child.exitCode !== null || child.signalCode !== null) {
        exited()
        return
      }
      try {
        if (!(await options.ownsListener())) {
          schedule()
          return
        }
        const remainingMs = deadlineMs - Date.now()
        if (remainingMs <= 0) {
          schedule()
          return
        }
        requestController = new AbortController()
        const response = await fetch(options.url, {
          signal: AbortSignal.any([
            requestController.signal,
            AbortSignal.timeout(Math.min(1_000, remainingMs)),
          ]),
        })
        const body = await response.text()
        if (
          response.status === options.expectedStatus &&
          body.includes(options.expectedBody)
        ) {
          const listenerReadyAtMs = Date.now()
          settle(() => resolve({ logHintAtMs, listenerReadyAtMs }))
          return
        }
      } catch {
        // The exact owned listener may exist before its HTTP consequence is ready.
      } finally {
        requestController = undefined
      }
      schedule()
    }

    child.stdout.on('data', inspect)
    child.stderr.on('data', inspect)
    child.on('message', message)
    child.once('exit', exited)
    options.signal?.addEventListener('abort', cancelled, { once: true })
    if (options.signal?.aborted) cancelled()
    else void probe()
  })

export class HomeWorkbenchTiming {
  readonly startMs = Date.now()
  readonly steps: HomeWorkbenchStepTiming[] = []

  record(name: HomeWorkbenchStepName, startMs: number): void {
    const endMs = Date.now()
    const boundMs = HOME_WORKBENCH_STEP_BOUNDS_MS[name]
    const timedOut = endMs - startMs > boundMs
    this.steps.push({
      name,
      boundMs,
      startMs,
      endMs,
      durationMs: endMs - startMs,
      outcome: timedOut ? 'timed-out' : 'passed',
    })
    if (timedOut) {
      throw new Error(
        'Home/workbench step ' +
          name +
          ' exceeded its finite ' +
          String(boundMs) +
          ' ms bound'
      )
    }
  }

  async step<T>(
    name: HomeWorkbenchStepName,
    operation: () => Promise<T>
  ): Promise<T> {
    const startMs = Date.now()
    const declaredBoundMs = HOME_WORKBENCH_STEP_BOUNDS_MS[name]
    const cleanupReserve =
      name === 'cleanup' ? 0 : HOME_WORKBENCH_STEP_BOUNDS_MS.cleanup
    const overallRemainingMs = Math.max(
      1,
      HOME_WORKBENCH_OVERALL_MS - cleanupReserve - (startMs - this.startMs)
    )
    const appliedBoundMs = Math.min(declaredBoundMs, overallRemainingMs)
    try {
      const value =
        name === 'cleanup'
          ? await operation()
          : await Promise.race([operation(), timeoutAfter(appliedBoundMs)])
      const endMs = Date.now()
      if (name === 'cleanup' && endMs - startMs > appliedBoundMs) {
        throw new Error('step-timeout')
      }
      this.steps.push({
        name,
        boundMs: appliedBoundMs,
        startMs,
        endMs,
        durationMs: endMs - startMs,
        outcome: 'passed',
      })
      return value
    } catch (error) {
      const endMs = Date.now()
      const timedOut =
        error instanceof Error && error.message === 'step-timeout'
      this.steps.push({
        name,
        boundMs: appliedBoundMs,
        startMs,
        endMs,
        durationMs: endMs - startMs,
        outcome: timedOut ? 'timed-out' : 'failed',
      })
      if (timedOut) {
        throw new Error(
          'Home/workbench step ' +
            name +
            ' exceeded its finite ' +
            String(appliedBoundMs) +
            ' ms bound'
        )
      }
      throw error
    }
  }

  summary(): Record<string, unknown> {
    const endMs = Date.now()
    return {
      startMs: this.startMs,
      endMs,
      durationMs: endMs - this.startMs,
      marginMs: HOME_WORKBENCH_MARGIN_MS,
      maxStepDurationMs: this.steps.reduce(
        (maximum, step) => Math.max(maximum, step.durationMs),
        0
      ),
      steps: this.steps,
    }
  }
}
