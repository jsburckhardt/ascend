import { TERMINAL_EPISODE_TIMEOUT_MS } from './workbench-proof-contract.js'
import { TerminalProofError } from './workbench-proof-terminal.js'

export interface ClosableBrowserContext {
  close: () => Promise<void>
}

export interface TerminalEpisodeOptions<
  Handle,
  Context extends ClosableBrowserContext,
> {
  timeoutMs?: number
  preflight: () => Promise<void>
  startWorkbench: () => Promise<Handle>
  openBrowser: (handle: Handle) => Promise<Context>
  run: (handle: Handle, context: Context, signal: AbortSignal) => Promise<void>
  cancelTrackedCommands: () => Promise<void>
  stopWorkbench: (handle: Handle) => Promise<void>
  auditWorkbenchAbsent: (handle: Handle) => Promise<boolean>
}

const appendCleanupError = (errors: unknown[], error: unknown): void => {
  errors.push(
    error instanceof Error ? error : new Error('Unknown cleanup failure')
  )
}

export const withTerminalEpisodeTimeout = async (
  operation: (signal: AbortSignal) => Promise<void>,
  timeoutMs = TERMINAL_EPISODE_TIMEOUT_MS
): Promise<void> => {
  const controller = new AbortController()
  let timer: NodeJS.Timeout | undefined
  try {
    await Promise.race([
      operation(controller.signal),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(
            new TerminalProofError(
              'terminal-episode-timeout',
              'Terminal parity episode exceeded its overall timeout',
              { timeoutMs }
            )
          )
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
    controller.abort()
  }
}

export const runTerminalParityEpisode = async <
  Handle,
  Context extends ClosableBrowserContext,
>(
  options: TerminalEpisodeOptions<Handle, Context>
): Promise<void> => {
  await options.preflight()
  const timeoutMs = options.timeoutMs ?? TERMINAL_EPISODE_TIMEOUT_MS
  let handle: Handle | null = null
  let context: Context | null = null
  let operationError: unknown = null
  const cleanupErrors: unknown[] = []

  try {
    await withTerminalEpisodeTimeout(async (signal) => {
      handle = await options.startWorkbench()
      context = await options.openBrowser(handle)
      await options.run(handle, context, signal)
    }, timeoutMs)
  } catch (error) {
    operationError = error
  } finally {
    try {
      await options.cancelTrackedCommands()
    } catch (error) {
      appendCleanupError(cleanupErrors, error)
    }
    const openedContext = context as Context | null
    if (openedContext) {
      try {
        await openedContext.close()
      } catch (error) {
        appendCleanupError(cleanupErrors, error)
      }
    }
    const startedHandle = handle as Handle | null
    if (startedHandle) {
      try {
        await options.stopWorkbench(startedHandle)
      } catch (error) {
        appendCleanupError(cleanupErrors, error)
      }
      try {
        if (!(await options.auditWorkbenchAbsent(startedHandle))) {
          appendCleanupError(
            cleanupErrors,
            new Error('Exact workbench PID or listener remains after cleanup')
          )
        }
      } catch (error) {
        appendCleanupError(cleanupErrors, error)
      }
    }
  }

  if (operationError && cleanupErrors.length > 0) {
    throw new AggregateError(
      [operationError, ...cleanupErrors],
      'Terminal parity operation and cleanup failed'
    )
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, 'Terminal parity cleanup failed')
  }
  if (operationError) throw operationError
}
