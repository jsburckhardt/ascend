import { createServer } from 'node:net'
import { describe, expect, it, vi } from 'vitest'
import {
  RuntimeFailure,
  createProjectRuntimeConfig,
} from '../src/project-runtime-contract.js'
import {
  buildRuntimeArgv,
  defaultRuntimeProcessDependencies,
  fetchRuntimeHealthAdapter,
  loopbackListenerIsAbsent,
  launchReadyRuntime,
  nodeRuntimeProcessAdapter,
  type HealthAttempt,
  type OwnedRuntimeProcess,
  type RuntimeExit,
  type RuntimeProcessDependencies,
} from '../src/project-runtime-process.js'

function pending<T>(): Promise<T> {
  return new Promise<T>(() => undefined)
}

function owned(
  pid: number,
  exit: Promise<RuntimeExit> = pending()
): OwnedRuntimeProcess {
  return {
    pid,
    processStartTime: String(pid * 10),
    exit,
    terminate: vi.fn(async (_graceful, _force, port) => ({
      pid,
      processStartTime: String(pid * 10),
      port,
      outcome: 'graceful' as const,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })),
    audit: vi.fn(async (port) => ({
      pid,
      processStartTime: String(pid * 10),
      port,
      processAbsent: true,
      processGroupAbsent: true,
      listenerAbsent: true,
    })),
    isAlive: vi.fn(async () => true),
  }
}

function dependencies(input: {
  health?: () => Promise<HealthAttempt>
  exits?: RuntimeExit[]
  ports?: number[]
}) {
  let now = 0
  let spawn = 0
  const processes: OwnedRuntimeProcess[] = []
  const launch = vi.fn(async () => {
    const exit = input.exits?.[spawn]
    const process = owned(
      100 + spawn,
      exit === undefined ? pending() : Promise.resolve(exit)
    )
    spawn += 1
    processes.push(process)
    return process
  })
  const ports = [...(input.ports ?? [41001, 41002, 41003])]
  const value: RuntimeProcessDependencies = {
    process: { assertLaunchable: vi.fn(async () => undefined), launch },
    ports: { acquire: vi.fn(async () => ports.shift() ?? 41999) },
    health: {
      check:
        input.health ??
        vi.fn(() => {
          if (input.exits?.[spawn - 1] !== undefined) {
            return pending<HealthAttempt>()
          }
          return Promise.resolve({
            elapsedMs: 2,
            status: 200,
            bodyStatus: 'alive',
            timedOut: false,
          })
        }),
    },
    now: () => now,
    sleep: vi.fn(async (milliseconds, signal) => {
      if (signal.aborted) throw signal.reason
      now += milliseconds
    }),
  }
  return { value, launch, processes }
}

const config = createProjectRuntimeConfig({
  expectedUser: 'fixture-user',
  environment: { PATH: '/safe/bin' },
  readinessTimeoutMs: 15,
  healthAttemptTimeoutMs: 5,
  pollIntervalMs: 5,
  gracefulShutdownMs: 5,
  forceShutdownMs: 5,
})

describe('project runtime process boundary', () => {
  it('builds one safe loopback argv item for the exact canonical path', () => {
    const path = '/tmp/project; echo NEVER_EXECUTED'
    const argv = buildRuntimeArgv(path, 41234)
    expect(argv.at(-1)).toBe(path)
    expect(argv.filter((item) => item === path)).toHaveLength(1)
    expect(argv).toContain('127.0.0.1:41234')
    expect(argv.join(' ')).not.toContain('0.0.0.0')
  })

  it('accepts only the documented status and body and records timing', async () => {
    const fixture = dependencies({})
    const result = await launchReadyRuntime({
      config,
      canonicalPath: '/projects/safe',
      signal: new AbortController().signal,
      dependencies: fixture.value,
    })
    expect(result).toMatchObject({
      port: 41001,
      internalUrl: 'http://127.0.0.1:41001',
      readinessAttempts: [
        { elapsedMs: 2, status: 200, bodyStatus: 'alive', timedOut: false },
      ],
    })
    expect(fixture.launch).toHaveBeenCalledWith({
      config,
      canonicalPath: '/projects/safe',
      port: 41001,
    })
  })

  it('retries two controlled collisions and succeeds once', async () => {
    const fixture = dependencies({
      exits: [
        { code: 1, signal: null, addressInUse: true },
        { code: 1, signal: null, addressInUse: true },
      ],
    })
    const result = await launchReadyRuntime({
      config,
      canonicalPath: '/projects/safe',
      signal: new AbortController().signal,
      dependencies: fixture.value,
    })
    expect(result.port).toBe(41003)
    expect(fixture.launch).toHaveBeenCalledTimes(3)
    expect(fixture.processes[0]?.terminate).toHaveBeenCalledTimes(1)
    expect(fixture.processes[1]?.terminate).toHaveBeenCalledTimes(1)
  })

  it('exhausts three collisions without disturbing an unrelated listener', async () => {
    const listener = createServer()
    await new Promise<void>((resolve, reject) => {
      listener.once('error', reject)
      listener.listen(0, '127.0.0.1', resolve)
    })
    const address = listener.address()
    if (address === null || typeof address === 'string') throw new Error('port')
    const fixture = dependencies({
      ports: [address.port, address.port, address.port],
      exits: Array.from({ length: 3 }, () => ({
        code: 1,
        signal: null,
        addressInUse: true,
      })),
    })
    try {
      await expect(
        launchReadyRuntime({
          config,
          canonicalPath: '/projects/safe',
          signal: new AbortController().signal,
          dependencies: fixture.value,
        })
      ).rejects.toMatchObject({
        category: 'address-in-use-exhausted',
        diagnostics: { attemptCount: 3, port: address.port },
      })
      expect(listener.listening).toBe(true)
      expect(fixture.launch).toHaveBeenCalledTimes(3)
    } finally {
      await new Promise<void>((resolve, reject) =>
        listener.close((error) =>
          error === undefined ? resolve() : reject(error)
        )
      )
    }
  })

  it('tolerates a transient non-ready status before expected health', async () => {
    const health = vi
      .fn()
      .mockResolvedValueOnce({
        elapsedMs: 1,
        status: 503,
        bodyStatus: null,
        timedOut: false,
      })
      .mockResolvedValueOnce({
        elapsedMs: 1,
        status: 200,
        bodyStatus: 'alive',
        timedOut: false,
      })
    const fixture = dependencies({ health })
    const result = await launchReadyRuntime({
      config,
      canonicalPath: '/projects/safe',
      signal: new AbortController().signal,
      dependencies: fixture.value,
    })
    expect(result.readinessAttempts).toHaveLength(2)
    expect(health).toHaveBeenCalledTimes(2)
  })

  it.each([
    [401, 'alive', 'health-status-unexpected'],
    [200, 'not-alive', 'health-body-unexpected'],
  ] as const)(
    'classifies unexpected health %s/%s',
    async (status, bodyStatus, category) => {
      const fixture = dependencies({
        health: vi.fn(async () => ({
          elapsedMs: 1,
          status,
          bodyStatus,
          timedOut: false,
        })),
      })
      await expect(
        launchReadyRuntime({
          config,
          canonicalPath: '/projects/safe',
          signal: new AbortController().signal,
          dependencies: fixture.value,
        })
      ).rejects.toMatchObject({ category })
      expect(fixture.processes[0]?.terminate).toHaveBeenCalledTimes(1)
    }
  )

  it('enforces overall timeout after finite per-attempt verdicts', async () => {
    const fixture = dependencies({
      health: vi.fn(async () => ({
        elapsedMs: 5,
        status: null,
        bodyStatus: null,
        timedOut: true,
      })),
    })
    await expect(
      launchReadyRuntime({
        config,
        canonicalPath: '/projects/safe',
        signal: new AbortController().signal,
        dependencies: fixture.value,
      })
    ).rejects.toMatchObject({
      category: 'readiness-timeout',
      diagnostics: { timeoutMs: 15, attemptCount: 3 },
    })
  })

  it('preserves typed executable, spawn, early code, signal, and shutdown failures', async () => {
    for (const failure of [
      new RuntimeFailure('executable-missing'),
      new RuntimeFailure('spawn-error'),
    ]) {
      const fixture = dependencies({})
      fixture.value.process.assertLaunchable = vi.fn(async () => {
        throw failure
      })
      await expect(
        launchReadyRuntime({
          config,
          canonicalPath: '/projects/safe',
          signal: new AbortController().signal,
          dependencies: fixture.value,
        })
      ).rejects.toBe(failure)
    }

    for (const [exit, category] of [
      [{ code: 9, signal: null, addressInUse: false }, 'early-exit-code'],
      [
        { code: null, signal: 'SIGTERM', addressInUse: false },
        'early-exit-signal',
      ],
    ] as const) {
      const fixture = dependencies({ exits: [exit] })
      await expect(
        launchReadyRuntime({
          config,
          canonicalPath: '/projects/safe',
          signal: new AbortController().signal,
          dependencies: fixture.value,
        })
      ).rejects.toMatchObject({ category })
    }

    const shutdown = new AbortController()
    shutdown.abort()
    await expect(
      launchReadyRuntime({
        config,
        canonicalPath: '/projects/safe',
        signal: shutdown.signal,
        dependencies: dependencies({}).value,
      })
    ).rejects.toMatchObject({ category: 'manager-shutdown' })
  })

  it('classifies real node launch preconditions and early exit', async () => {
    const executablePath = new URL(
      'fixtures/fake-code-server.mjs',
      import.meta.url
    ).pathname
    await expect(
      nodeRuntimeProcessAdapter.assertLaunchable(
        createProjectRuntimeConfig({
          executablePath,
          expectedUser: 'not-the-current-user',
        })
      )
    ).rejects.toMatchObject({ category: 'spawn-error' })
    await expect(
      nodeRuntimeProcessAdapter.assertLaunchable(
        createProjectRuntimeConfig({
          executablePath: '/missing/bl-010-code-server',
          expectedUser: 'vscode',
        })
      )
    ).rejects.toMatchObject({ category: 'executable-missing' })
    await expect(
      launchReadyRuntime({
        config: createProjectRuntimeConfig({
          executablePath,
          expectedUser: 'vscode',
          environment: {
            PATH: '/usr/local/bin:/usr/bin:/bin',
            BL001_FAKE_MODE: 'early-exit',
          },
          readinessTimeoutMs: 5_000,
        }),
        canonicalPath: process.cwd(),
        signal: new AbortController().signal,
      })
    ).rejects.toMatchObject({
      category: 'early-exit-code',
      diagnostics: { exitCode: 23 },
    })
  })

  it('launches the repository fake through the real node process boundary', async () => {
    const runtimeConfig = createProjectRuntimeConfig({
      executablePath: new URL('fixtures/fake-code-server.mjs', import.meta.url)
        .pathname,
      expectedUser: 'vscode',
      environment: {
        PATH: '/usr/local/bin:/usr/bin:/bin',
        BL001_FAKE_MODE: 'project-runtime',
      },
      readinessTimeoutMs: 5_000,
    })
    const ready = await launchReadyRuntime({
      config: runtimeConfig,
      canonicalPath: process.cwd(),
      signal: new AbortController().signal,
    })
    try {
      expect(ready.internalUrl).toBe('http://127.0.0.1:' + String(ready.port))
      await expect(ready.process.isAlive()).resolves.toBe(true)
      await expect(
        fetchRuntimeHealthAdapter.check(
          ready.internalUrl + '/stall',
          5,
          new AbortController().signal
        )
      ).resolves.toMatchObject({ status: null, timedOut: true })
      const cancellation = new AbortController()
      const cancelledHealth = fetchRuntimeHealthAdapter.check(
        ready.internalUrl + '/stall',
        100,
        cancellation.signal
      )
      cancellation.abort()
      await expect(cancelledHealth).resolves.toMatchObject({
        status: null,
        timedOut: false,
      })
    } finally {
      await ready.process.terminate(500, 500, ready.port)
    }
    await expect(ready.process.isAlive()).resolves.toBe(false)
    await expect(loopbackListenerIsAbsent(ready.port)).resolves.toBe(true)
  })

  it('bounds default sleep completion and both cancellation paths', async () => {
    const alreadyCancelled = new AbortController()
    alreadyCancelled.abort(new Error('cancelled'))
    await expect(
      defaultRuntimeProcessDependencies.sleep(10, alreadyCancelled.signal)
    ).rejects.toThrow('cancelled')

    await expect(
      defaultRuntimeProcessDependencies.sleep(1, new AbortController().signal)
    ).resolves.toBeUndefined()

    const duringWait = new AbortController()
    const waiting = defaultRuntimeProcessDependencies.sleep(
      100,
      duringWait.signal
    )
    duringWait.abort(new Error('cancelled during wait'))
    await expect(waiting).rejects.toThrow('cancelled during wait')
  })

  it('covers real bounded health parsing and listener presence sensors', async () => {
    const sockets = new Set<import('node:net').Socket>()
    const listener = createServer((socket) => {
      sockets.add(socket)
      socket.once('close', () => sockets.delete(socket))
      socket.on('error', () => undefined)
      socket.end(
        [
          'HTTP/1.1 200 OK',
          'Content-Type: application/json',
          'Content-Length: 18',
          'Connection: close',
          '',
          '{"status":"alive"}',
        ].join(String.fromCharCode(13, 10))
      )
    })
    await new Promise<void>((resolve, reject) => {
      listener.once('error', reject)
      listener.listen(0, '127.0.0.1', resolve)
    })
    const address = listener.address()
    if (address === null || typeof address === 'string') throw new Error('port')
    expect(await loopbackListenerIsAbsent(address.port)).toBe(false)
    const verdict = await fetchRuntimeHealthAdapter.check(
      'http://127.0.0.1:' + String(address.port),
      1_000,
      new AbortController().signal
    )
    expect(verdict).toMatchObject({
      status: 200,
      bodyStatus: 'alive',
      timedOut: false,
    })
    const closed = new Promise<void>((resolve) =>
      listener.close(() => resolve())
    )
    for (const socket of sockets) socket.destroy()
    await closed
    expect(await loopbackListenerIsAbsent(address.port)).toBe(true)
  })
})
