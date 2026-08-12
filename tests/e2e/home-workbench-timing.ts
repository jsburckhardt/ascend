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

export const waitForChildReady = async (
  child: ChildProcessWithoutNullStreams,
  timeoutMs: number,
  label: string
): Promise<void> =>
  new Promise((resolve, reject) => {
    const message = (value: unknown): void => {
      if (
        typeof value === 'object' &&
        value !== null &&
        'status' in value &&
        value.status === 'ready'
      ) {
        settle(resolve)
      }
    }
    const exited = (): void =>
      settle(() => reject(new Error(label + ' exited before readiness')))
    const timer = setTimeout(
      () => settle(() => reject(new Error(label + ' readiness timed out'))),
      timeoutMs
    )
    const settle = (complete: () => void): void => {
      clearTimeout(timer)
      child.off('message', message)
      child.off('exit', exited)
      complete()
    }
    child.on('message', message)
    child.once('exit', exited)
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
