import { describe, expect, it, vi } from 'vitest'
import {
  runCapacityCli,
  type CapacityCliDependencies,
} from '../src/cli/proof-workbench-capacity.js'
import type { PrerequisiteCheck } from '../src/workbench-capacity-prerequisites.js'
import type { CoordinatedCapacity } from '../src/workbench-capacity-coordinator.js'

const runId = '00000000-0000-4000-8000-000000000011'
const fixture = { paths: ['sentinel'], sentinelHashes: { sentinel: 'hash' } }
const passedPrerequisites = (): PrerequisiteCheck => ({
  records: [],
  host: {} as NonNullable<PrerequisiteCheck['host']>,
  stopReason: null,
})
const io = () => {
  const stdout: string[] = []
  const stderr: string[] = []
  return {
    stdout,
    stderr,
    value: {
      stdout: (line: string) => stdout.push(line),
      stderr: (line: string) => stderr.push(line),
    },
  }
}
const coordinated = (exitReasons: string[] = []): CoordinatedCapacity => ({
  cohorts: [],
  samples: { version: 1, runId, samples: [] },
  workloads: { version: 1, runId, workloads: [] },
  safetyStopReason: null,
  threeMemberGate: {
    passed: exitReasons.length === 0,
    blockers: exitReasons,
  },
  exitReasons,
  finalCleanup: {
    complete: true,
    passed: true,
    processIdentitiesAbsent: true,
    listenersAbsent: true,
    workloadIdentitiesAbsent: true,
    details: [],
  },
})
const dependencies = (): Partial<CapacityCliDependencies> => ({
  runId: () => runId,
  acquireGuard: vi.fn(async () => undefined),
  releaseGuard: vi.fn(async () => undefined),
  prerequisites: async () => passedPrerequisites(),
  snapshot: async () => fixture,
  write: vi.fn(async () => '/evidence'),
})

describe('capacity command setup and overall deadline', () => {
  it('returns a prerequisite-specific result without fixture access or starts', async () => {
    const output = io()
    const snapshot = vi.fn(async () => fixture)
    const coordinate = vi.fn()
    const result = await runCapacityCli(output.value, {
      ...dependencies(),
      prerequisites: async () => ({
        records: [],
        host: null,
        stopReason: 'prerequisite-failed:code-server-4.131.0',
      }),
      snapshot,
      coordinate,
    })
    expect(result).toBe(2)
    expect(snapshot).not.toHaveBeenCalled()
    expect(coordinate).not.toHaveBeenCalled()
    expect(output.stderr.join('\n')).toContain(
      'workbench.capacity.prerequisite.failed'
    )
  })

  it('classifies a fixture preflight failure separately from host prerequisites', async () => {
    const output = io()
    const snapshot = vi.fn(async () => fixture)
    const coordinate = vi.fn()
    const result = await runCapacityCli(output.value, {
      ...dependencies(),
      prerequisites: async () => ({
        records: [],
        host: null,
        stopReason: 'prerequisite-failed:fixture-readable',
      }),
      snapshot,
      coordinate,
    })
    expect(result).toBe(3)
    expect(snapshot).not.toHaveBeenCalled()
    expect(coordinate).not.toHaveBeenCalled()
    expect(output.stderr.join('\n')).toContain(
      'workbench.capacity.fixture.failed'
    )
  })

  it('classifies fixture snapshot failure separately and starts no member', async () => {
    const output = io()
    const coordinate = vi.fn()
    const result = await runCapacityCli(output.value, {
      ...dependencies(),
      snapshot: async () => {
        throw new Error('controlled-fixture-failure')
      },
      coordinate,
    })
    expect(result).toBe(3)
    expect(coordinate).not.toHaveBeenCalled()
    expect(output.stderr.join('\n')).toContain(
      'workbench.capacity.fixture.failed'
    )
  })

  it('bounds the entire command and reports a strict deadline breach', async () => {
    const output = io()
    const releaseGuard = vi.fn(async () => undefined)
    const started = performance.now()
    const result = await runCapacityCli(output.value, {
      ...dependencies(),
      overallTimeoutMs: 25,
      releaseGuard,
      coordinate: async (_runId, signal) =>
        new Promise<CoordinatedCapacity>((resolve) => {
          signal.addEventListener(
            'abort',
            () => resolve(coordinated(['overall-timeout'])),
            { once: true }
          )
        }),
    })
    expect(performance.now() - started).toBeLessThan(250)
    expect(result).toBe(4)
    expect(releaseGuard).toHaveBeenCalledWith(runId)
    expect(output.stderr.join('\n')).toContain(
      'workbench.capacity.deadline.exceeded'
    )
    expect(output.stderr.join('\n')).toContain('overall-timeout')
  })

  it('retains a successful command result inside the shared deadline', async () => {
    const output = io()
    const write = vi.fn(async () => '/evidence')
    const result = await runCapacityCli(output.value, {
      ...dependencies(),
      coordinate: async () => coordinated(),
      write,
    })
    expect(result).toBe(0)
    expect(write).toHaveBeenCalledOnce()
    expect(output.stdout.some((line) => line.includes('passed'))).toBe(true)
    expect(output.stderr.some((line) => line.includes('completed'))).toBe(true)
  })

  it('keeps coordinated and final fixture failures nonzero', async () => {
    const failed = await runCapacityCli(io().value, {
      ...dependencies(),
      coordinate: async () => coordinated(['controlled-cohort-failure']),
    })
    expect(failed).toBe(1)

    let snapshots = 0
    const output = io()
    const fixtureFailure = await runCapacityCli(output.value, {
      ...dependencies(),
      coordinate: async () => coordinated(),
      snapshot: async () => {
        if (++snapshots === 2)
          throw new Error('controlled-final-fixture-failure')
        return fixture
      },
    })
    expect(fixtureFailure).toBe(3)
    expect(
      output.stderr.some((line) => line.includes('fixture-finalization-failed'))
    ).toBe(true)
  })

  it('classifies prerequisite execution and ownership failures', async () => {
    const prerequisiteOutput = io()
    const prerequisiteFailure = await runCapacityCli(prerequisiteOutput.value, {
      ...dependencies(),
      prerequisites: async () => {
        throw new Error('controlled-prerequisite-check-failure')
      },
    })
    expect(prerequisiteFailure).toBe(2)
    expect(
      prerequisiteOutput.stderr.some((line) =>
        line.includes('prerequisite-check-failed')
      )
    ).toBe(true)

    const ownershipOutput = io()
    const ownershipFailure = await runCapacityCli(ownershipOutput.value, {
      ...dependencies(),
      acquireGuard: async () => {
        throw new Error('capacity-active-run-conflict')
      },
    })
    expect(ownershipFailure).toBe(5)
    expect(
      ownershipOutput.stderr.some((line) => line.includes('isolation.failed'))
    ).toBe(true)
  })

  it('keeps evidence writer failure nonzero and releases ownership', async () => {
    const output = io()
    const releaseGuard = vi.fn(async () => undefined)
    const result = await runCapacityCli(output.value, {
      ...dependencies(),
      coordinate: async () => coordinated(),
      releaseGuard,
      write: async () => {
        throw new Error('controlled-evidence-write-failure')
      },
    })
    expect(result).toBe(1)
    expect(releaseGuard).toHaveBeenCalledWith(runId)
    expect(
      output.stderr.some((line) =>
        line.includes('controlled-evidence-write-failure')
      )
    ).toBe(true)
  })

  it('reports final fixture mutation and guard release failure', async () => {
    const output = io()
    let snapshots = 0
    const result = await runCapacityCli(output.value, {
      ...dependencies(),
      coordinate: async () => coordinated(),
      snapshot: async () =>
        ++snapshots === 1
          ? fixture
          : { paths: ['mutated'], sentinelHashes: { sentinel: 'changed' } },
      releaseGuard: async () => {
        throw new Error('controlled-release-failure')
      },
    })
    expect(result).toBe(1)
    expect(
      output.stderr.some((line) => line.includes('guard.release.failed'))
    ).toBe(true)
  })

  it('rejects an already-expired command before ownership is established', async () => {
    const output = io()
    const acquireGuard = vi.fn(async () => undefined)
    const releaseGuard = vi.fn(async () => undefined)
    const result = await runCapacityCli(output.value, {
      ...dependencies(),
      overallTimeoutMs: 0,
      acquireGuard,
      releaseGuard,
    })
    expect(result).toBe(4)
    expect(acquireGuard).not.toHaveBeenCalled()
    expect(releaseGuard).not.toHaveBeenCalled()
  })

  it('propagates a deadline reached during prerequisite execution', async () => {
    const output = io()
    const releaseGuard = vi.fn(async () => undefined)
    const result = await runCapacityCli(output.value, {
      ...dependencies(),
      overallTimeoutMs: 20,
      prerequisites: async (signal) =>
        new Promise<never>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          })
        }),
      releaseGuard,
    })
    expect(result).toBe(4)
    expect(releaseGuard).toHaveBeenCalledWith(runId)
    expect(
      output.stderr.some((line) => line.includes('deadline.exceeded'))
    ).toBe(true)
  })

  it('normalizes non-Error setup and evidence failures deterministically', async () => {
    const ownership = io()
    expect(
      await runCapacityCli(ownership.value, {
        ...dependencies(),
        acquireGuard: async () => Promise.reject('ownership-string'),
      })
    ).toBe(5)
    expect(ownership.stderr.some((line) => line.includes('unknown'))).toBe(true)

    const prerequisite = io()
    expect(
      await runCapacityCli(prerequisite.value, {
        ...dependencies(),
        prerequisites: async () => Promise.reject('prerequisite-string'),
      })
    ).toBe(2)
    expect(prerequisite.stderr.some((line) => line.includes('unknown'))).toBe(
      true
    )

    const fixtureOutput = io()
    expect(
      await runCapacityCli(fixtureOutput.value, {
        ...dependencies(),
        snapshot: async () => Promise.reject('fixture-string'),
      })
    ).toBe(3)
    expect(fixtureOutput.stderr.some((line) => line.includes('unknown'))).toBe(
      true
    )

    const evidenceOutput = io()
    expect(
      await runCapacityCli(evidenceOutput.value, {
        ...dependencies(),
        coordinate: async () => coordinated(),
        write: async () => Promise.reject('evidence-string'),
      })
    ).toBe(1)
    expect(evidenceOutput.stderr.some((line) => line.includes('unknown'))).toBe(
      true
    )
  })

  it('holds the guard through cooperative deadline cleanup and retained partial evidence', async () => {
    const output = io()
    const events: string[] = []
    let backgroundMutations = 0
    const write = vi.fn(async (run) => {
      events.push('write:' + run.overallDisposition)
      expect(run.exitReasons).toContain('overall-timeout')
      expect(run.finalCleanup.passed).toBe(true)
      return '/evidence'
    })
    const releaseGuard = vi.fn(async () => {
      events.push('release')
      expect(events).toContain('coordination-stopped')
      expect(events.some((event) => event.startsWith('write:'))).toBe(true)
    })
    const started = performance.now()
    const result = await runCapacityCli(output.value, {
      ...dependencies(),
      overallTimeoutMs: 20,
      releaseGuard,
      write,
      coordinate: async (_runId, signal) =>
        new Promise<CoordinatedCapacity>((resolve) => {
          signal.addEventListener(
            'abort',
            () => {
              events.push('abort')
              setTimeout(() => {
                backgroundMutations += 1
                events.push('coordination-stopped')
                resolve(coordinated(['overall-timeout']))
              }, 30)
            },
            { once: true }
          )
        }),
    })
    expect(result).toBe(4)
    expect(performance.now() - started).toBeGreaterThanOrEqual(45)
    expect(events).toEqual([
      'abort',
      'coordination-stopped',
      'write:failed',
      'release',
    ])
    expect(write).toHaveBeenCalledOnce()
    expect(releaseGuard).toHaveBeenCalledOnce()
    expect(backgroundMutations).toBe(1)
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(backgroundMutations).toBe(1)
    expect(output.stderr.join('\n')).toContain('partialEvidenceRetained')
  })
})
