import { describe, expect, it, vi } from 'vitest'
import {
  runTerminalParityEpisode,
  withTerminalEpisodeTimeout,
} from '../src/workbench-proof-terminal-episode.js'
import { preflightFixedExecutables } from '../src/workbench-proof-terminal.js'

interface FakeHandle {
  pid: number
}

const scenario = (run: (signal: AbortSignal) => Promise<void>) => {
  const order: string[] = []
  const context = {
    close: vi.fn(async () => {
      order.push('close')
    }),
  }
  const options = {
    timeoutMs: 25,
    preflight: vi.fn(async () => {
      order.push('preflight')
    }),
    startWorkbench: vi.fn(async (): Promise<FakeHandle> => {
      order.push('start')
      return { pid: 42 }
    }),
    openBrowser: vi.fn(async () => {
      order.push('open')
      return context
    }),
    run: vi.fn(
      async (
        _handle: FakeHandle,
        _context: typeof context,
        signal: AbortSignal
      ) => {
        order.push('run')
        await run(signal)
      }
    ),
    cancelTrackedCommands: vi.fn(async () => {
      order.push('cancel')
    }),
    stopWorkbench: vi.fn(async () => {
      order.push('stop')
    }),
    auditWorkbenchAbsent: vi.fn(async () => {
      order.push('audit')
      return true
    }),
  }
  return { context, options, order }
}

describe('BL-002 bounded episode cleanup coordinator', () => {
  it('names a missing fixed executable before workbench or browser startup', async () => {
    const startWorkbench = vi.fn(async () => ({ pid: 42 }))
    const openBrowser = vi.fn(async () => ({ close: async () => undefined }))
    await expect(
      runTerminalParityEpisode({
        preflight: async () => {
          await preflightFixedExecutables('')
        },
        startWorkbench,
        openBrowser,
        run: async () => undefined,
        cancelTrackedCommands: async () => undefined,
        stopWorkbench: async () => undefined,
        auditWorkbenchAbsent: async () => true,
      })
    ).rejects.toMatchObject({
      code: 'terminal-executable-missing',
      details: { executable: 'git' },
    })
    expect(startWorkbench).not.toHaveBeenCalled()
    expect(openBrowser).not.toHaveBeenCalled()
  })

  it('makes the overall timeout nonzero and cleans every owned resource in order', async () => {
    const { options, order } = scenario(
      (signal) =>
        new Promise((resolve) =>
          signal.addEventListener('abort', () => resolve(), { once: true })
        )
    )
    await expect(runTerminalParityEpisode(options)).rejects.toMatchObject({
      code: 'terminal-episode-timeout',
      details: { timeoutMs: 25 },
    })
    expect(order).toEqual([
      'preflight',
      'start',
      'open',
      'run',
      'cancel',
      'close',
      'stop',
      'audit',
    ])
  })

  it('cleans a browser-opened failure and keeps cleanup failures visible', async () => {
    const failed = scenario(async () => {
      throw new Error('artifact write failed')
    })
    await expect(runTerminalParityEpisode(failed.options)).rejects.toThrow(
      'artifact write failed'
    )
    expect(failed.order).toEqual([
      'preflight',
      'start',
      'open',
      'run',
      'cancel',
      'close',
      'stop',
      'audit',
    ])

    const cleanupFailed = scenario(async () => undefined)
    cleanupFailed.options.auditWorkbenchAbsent.mockResolvedValue(false)
    await expect(
      runTerminalParityEpisode(cleanupFailed.options)
    ).rejects.toThrow('Terminal parity cleanup failed')
  })

  it('uses the documented default deadline on a successful operation', async () => {
    await expect(
      withTerminalEpisodeTimeout(async () => undefined)
    ).resolves.toBeUndefined()
  })

  it.each(['cancel', 'close', 'stop', 'audit'] as const)(
    'keeps a %s cleanup failure visible',
    async (stage) => {
      const failed = scenario(async () => undefined)
      if (stage === 'cancel')
        failed.options.cancelTrackedCommands.mockRejectedValue('cancel failed')
      if (stage === 'close')
        failed.context.close.mockRejectedValue(new Error('close failed'))
      if (stage === 'stop')
        failed.options.stopWorkbench.mockRejectedValue(new Error('stop failed'))
      if (stage === 'audit')
        failed.options.auditWorkbenchAbsent.mockRejectedValue(
          new Error('audit failed')
        )
      await expect(runTerminalParityEpisode(failed.options)).rejects.toThrow(
        'Terminal parity cleanup failed'
      )
    }
  )

  it('aggregates operation and cleanup failures', async () => {
    const failed = scenario(async () => {
      throw new Error('operation failed')
    })
    failed.context.close.mockRejectedValue(new Error('close failed'))
    await expect(runTerminalParityEpisode(failed.options)).rejects.toThrow(
      'Terminal parity operation and cleanup failed'
    )
  })

  it('propagates a pre-browser start failure without cleanup ownership', async () => {
    const failed = scenario(async () => undefined)
    delete (failed.options as { timeoutMs?: number }).timeoutMs
    failed.options.startWorkbench.mockRejectedValue(new Error('start failed'))
    await expect(runTerminalParityEpisode(failed.options)).rejects.toThrow(
      'start failed'
    )
    expect(failed.context.close).not.toHaveBeenCalled()
    expect(failed.options.stopWorkbench).not.toHaveBeenCalled()
    expect(failed.options.cancelTrackedCommands).toHaveBeenCalledOnce()
  })
})
