import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_VERIFY_TIMEOUT_MS,
  VERIFY_TIMEOUT_ENV,
  resolveVerifyTimeoutMs,
  runChecks,
} from '../../.harness/extensions/checks/budget.js'
import {
  BOOT_CHECKS_OVERHEAD_MS,
  runBoot,
} from '../../.harness/extensions/boot/readiness.js'

type Envelope = {
  status: 'ok' | 'error'
  code?: string
  data?: Record<string, unknown>
  options?: Record<string, unknown>
}

const context = (
  result = { ok: true, code: 0, stdout: 'passed', stderr: '' }
) => {
  const exec = vi.fn().mockResolvedValue(result)
  return {
    exec,
    ok: (data: Record<string, unknown>): Envelope => ({ status: 'ok', data }),
    error: (
      code: string,
      _message: string,
      options: Record<string, unknown>
    ): Envelope => ({
      status: 'error',
      code,
      options,
    }),
  }
}

const clock = (start: number, end: number) => {
  const values = [start, end]
  return () => values.shift() ?? end
}

describe('harness checks verification budget', () => {
  it('uses a finite default greater than 120 seconds', () => {
    expect(DEFAULT_VERIFY_TIMEOUT_MS).toBe(600_000)
    expect(Number.isFinite(DEFAULT_VERIFY_TIMEOUT_MS)).toBe(true)
    expect(resolveVerifyTimeoutMs(undefined)).toBe(DEFAULT_VERIFY_TIMEOUT_MS)
  })

  it('delegates exactly to just verify and accepts a simulated 121 second run', async () => {
    const ctx = context()
    const envelope = (await runChecks(ctx, {
      now: clock(0, 121_000),
    })) as Envelope
    expect(ctx.exec).toHaveBeenCalledOnce()
    expect(ctx.exec).toHaveBeenCalledWith('just', ['verify'], {
      timeoutMs: 600_000,
    })
    expect(envelope).toMatchObject({
      status: 'ok',
      data: {
        command: 'just verify',
        timeout_ms: 600_000,
        elapsed_ms: 121_000,
      },
    })
  })

  it('gives boot the configured checks budget plus finite wrapper overhead', async () => {
    const ctx = context()
    const envelope = (await runBoot(ctx, {
      timeoutValue: '600000',
      now: clock(0, 121_000),
    })) as Envelope
    expect(BOOT_CHECKS_OVERHEAD_MS).toBe(10_000)
    expect(ctx.exec).toHaveBeenCalledWith('harness', ['checks', '--json'], {
      timeoutMs: 610_000,
    })
    expect(envelope).toMatchObject({
      status: 'ok',
      data: { readiness: 'ready', checks_timeout_ms: 610_000 },
    })
  })

  it('accepts a valid configured finite budget', async () => {
    const ctx = context()
    const envelope = (await runChecks(ctx, {
      timeoutValue: '900000',
      now: clock(5, 125_005),
    })) as Envelope
    expect(ctx.exec).toHaveBeenCalledWith('just', ['verify'], {
      timeoutMs: 900_000,
    })
    expect(envelope.status).toBe('ok')
  })

  it.each(['0', '120000', 'not-a-number', '3600001'])(
    'rejects invalid configured budget %s before execution',
    async (timeoutValue) => {
      const ctx = context()
      const envelope = (await runChecks(ctx, { timeoutValue })) as Envelope
      expect(ctx.exec).not.toHaveBeenCalled()
      expect(envelope).toMatchObject({
        status: 'error',
        code: 'E_INVALID_TIMEOUT',
      })
      expect(envelope.options?.details).toContain(VERIFY_TIMEOUT_ENV)
    }
  )

  it('rejects a simulated over-budget run without waiting', async () => {
    const ctx = context()
    const startedAt = performance.now()
    const envelope = (await runChecks(ctx, {
      timeoutValue: '600000',
      now: clock(0, 600_001),
    })) as Envelope
    expect(performance.now() - startedAt).toBeLessThan(100)
    expect(envelope).toMatchObject({
      status: 'error',
      code: 'E_WRAP_TIMEOUT',
      options: { timeout_ms: 600_000, elapsed_ms: 600_001 },
    })
  })

  it('keeps bounded labeled error tails and an actionable empty fallback', async () => {
    const lines = Array.from(
      { length: 30 },
      (_, index) => 'line-' + index
    ).join('\n')
    const failed = context({ ok: false, code: 2, stdout: lines, stderr: lines })
    const failure = (await runChecks(failed, { now: clock(0, 1) })) as Envelope
    const details = String(failure.options?.details)
    expect(details).toContain('stderr:\nline-10')
    expect(details).toContain('stdout:\nline-10')
    expect(details).not.toContain('line-9\n')

    const empty = context({ ok: false, code: 3, stdout: '', stderr: '' })
    const emptyFailure = (await runChecks(empty, {
      now: clock(0, 1),
    })) as Envelope
    expect(emptyFailure.options?.details).toBe(
      'just verify exited with code 3 without diagnostic output.'
    )
  })
})
