import { execFile, spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { readProcessStartTime } from '../src/project-runtime-process.js'
import { terminateExactProcessGroup } from '../src/workbench-proof-runtime.js'

const CLI = path.resolve(
  import.meta.dirname,
  '../src/cli/runtime-restart-residual-audit.ts'
)
const CASE_ROOT = path.resolve('test-results/bl-018/residual-audit-cases')

interface RecordedIdentity {
  readonly pid: number
  readonly processStartTime: string
}

const spawnControl = async (): Promise<{
  identity: RecordedIdentity
  stop: () => Promise<void>
}> => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  const pid = child.pid
  if (pid === undefined) throw new Error('control identity unavailable')
  let startTime = await readProcessStartTime(pid)
  for (let attempt = 0; startTime === null && attempt < 50; attempt += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 10))
    startTime = await readProcessStartTime(pid)
  }
  if (startTime === null) throw new Error('control start time unavailable')
  return {
    identity: { pid, processStartTime: startTime },
    stop: async () => {
      await terminateExactProcessGroup(pid, 2000)
    },
  }
}

const freePort = async (): Promise<number> => {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string')
    throw new Error('port unavailable')
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return address.port
}

const runAudit = async (
  name: string,
  episode: unknown
): Promise<{
  code: number
  result: Record<string, unknown>
  stdout: string
}> => {
  const caseRoot = path.join(CASE_ROOT, name)
  await mkdir(caseRoot, { recursive: true })
  const episodePath = path.join(caseRoot, 'designated-episode.json')
  await writeFile(
    episodePath,
    JSON.stringify(episode, null, 2) + String.fromCharCode(10)
  )
  const run = await new Promise<{ code: number; stdout: string }>(
    (resolve, reject) => {
      execFile(
        'pnpm',
        ['exec', 'tsx', CLI, episodePath],
        { cwd: path.resolve(import.meta.dirname, '..') },
        (error, stdout) => {
          if (error === null) return resolve({ code: 0, stdout })
          const status = (error as { code?: unknown }).code
          if (typeof status === 'number')
            return resolve({ code: status, stdout })
          reject(error)
        }
      )
    }
  )
  const result = JSON.parse(
    await readFile(path.join(caseRoot, 'residual-audit.json'), 'utf8')
  ) as Record<string, unknown>
  return { ...run, result }
}

const cleanEpisode = async (): Promise<{
  episode: Record<string, unknown>
  release: () => Promise<void>
}> => {
  const priorRoot = await spawnControl()
  const priorMember = await spawnControl()
  const sequenceRoot = await spawnControl()
  await priorRoot.stop()
  await priorMember.stop()
  await sequenceRoot.stop()
  const priorPort = await freePort()
  const stalePort = await freePort()
  const sequencePort = await freePort()
  return {
    release: async () => {
      await priorRoot.stop()
      await priorMember.stop()
      await sequenceRoot.stop()
    },
    episode: {
      schemaVersion: 1,
      attributionCeiling: 'controlled artifact',
      proofSplit: 'controlled artifact',
      prior: {
        root: priorRoot.identity,
        members: [priorRoot.identity, priorMember.identity],
        processGroupId: priorRoot.identity.pid,
        listenerPort: priorPort,
      },
      sequence: [
        {
          root: sequenceRoot.identity,
          members: [sequenceRoot.identity],
          processGroupId: sequenceRoot.identity.pid,
          listenerPort: sequencePort,
        },
      ],
      staleConnections: [
        { transport: 'http', listenerPort: stalePort },
        { transport: 'websocket', listenerPort: stalePort },
      ],
      quarantinedIdentities: [],
      unresolvedAdmissions: [],
      priorOwnershipRecords: [{ key: 'opaque-prior-1', provableAbsent: true }],
      rows: [
        {
          scenario: 'designated-restart',
          residualCount: 0,
          teardownResidualCount: 0,
        },
      ],
    },
  }
}

describe('BL-018 runtime restart residual audit CLI', () => {
  afterAll(async () => {
    await rm(CASE_ROOT, { recursive: true, force: true })
  })

  it('reports zero residuals for all seven classes and exits zero', async () => {
    const { episode, release } = await cleanEpisode()
    try {
      const { code, result } = await runAudit('success', episode)
      expect(code).toBe(0)
      expect(result).toMatchObject({
        command: 'proof-runtime-restart-residual-audit',
        status: 'ok',
        residuals: {
          priorRootIdentities: 0,
          priorMemberIdentities: 0,
          priorProcessGroups: 0,
          priorListeners: 0,
          staleHttpConnections: 0,
          staleWebSocketConnections: 0,
          sequenceIdentities: 0,
        },
        unresolvedAdmissions: [],
        quarantinedIdentities: [],
        unprovableOwnershipRecords: [],
        unresolvedResiduals: [],
        claimedResidualTotal: 0,
        teardownResidualCount: 0,
      })
      expect(Object.keys(result.residuals as object)).toHaveLength(7)
      expect(result.proofSplit).toContain('separate process')
      expect(result.checked).toMatchObject({
        priorRootIdentities: 1,
        priorMemberIdentities: 2,
        priorProcessGroups: 1,
        priorListeners: 1,
        staleHttpConnections: 1,
        staleWebSocketConnections: 1,
        sequenceGenerations: 1,
      })
    } finally {
      await release()
    }
  }, 60000)

  it('exits non-zero when a recorded prior member identity is still present', async () => {
    const { episode, release } = await cleanEpisode()
    const survivor = await spawnControl()
    const prior = episode.prior as Record<string, unknown>
    episode.prior = {
      ...prior,
      members: [...(prior.members as RecordedIdentity[]), survivor.identity],
    }
    try {
      const { code, result } = await runAudit('member-residual', episode)
      expect(code).toBe(1)
      expect(result).toMatchObject({
        status: 'failed',
        residuals: { priorRootIdentities: 0, priorMemberIdentities: 1 },
      })
    } finally {
      await survivor.stop()
      await release()
    }
  }, 60000)

  it('exits non-zero when a sequence generation identity survives', async () => {
    const { episode, release } = await cleanEpisode()
    const survivor = await spawnControl()
    episode.sequence = [
      ...(episode.sequence as Record<string, unknown>[]),
      {
        root: survivor.identity,
        members: [],
        processGroupId: survivor.identity.pid,
        listenerPort: await freePort(),
      },
    ]
    try {
      const { code, result } = await runAudit('sequence-residual', episode)
      expect(code).toBe(1)
      expect(result).toMatchObject({
        status: 'failed',
        residuals: { sequenceIdentities: 2 },
      })
    } finally {
      await survivor.stop()
      await release()
    }
  }, 60000)

  it('reports an unconfirmed quarantined identity without converting it into a zero residual', async () => {
    const { episode, release } = await cleanEpisode()
    episode.quarantinedIdentities = [
      {
        key: 'opaque-quarantine-1',
        audit: {
          processAbsent: true,
          processGroupAbsent: true,
          listenerAbsent: false,
        },
      },
      {
        key: 'opaque-quarantine-2',
        audit: {
          processAbsent: true,
          processGroupAbsent: true,
          listenerAbsent: true,
        },
      },
    ]
    try {
      const { code, result } = await runAudit('quarantine', episode)
      expect(code).toBe(1)
      expect(result.status).toBe('failed')
      expect(result.quarantinedIdentities).toEqual([
        {
          key: 'opaque-quarantine-1',
          audit: {
            processAbsent: true,
            processGroupAbsent: true,
            listenerAbsent: false,
          },
        },
      ])
      // The unconfirmed identity is reported, never folded into the seven
      // zero-valued residual classes.
      expect(result.residuals).toMatchObject({
        priorRootIdentities: 0,
        sequenceIdentities: 0,
      })
    } finally {
      await release()
    }
  }, 60000)

  it('reports an unresolved admission honestly and exits non-zero', async () => {
    const { episode, release } = await cleanEpisode()
    episode.unresolvedAdmissions = [
      {
        projectToken: 'opaque-project-1',
        admissionId: 'opaque-admission-1',
        phase: 'launch-pending',
      },
    ]
    try {
      const { code, result } = await runAudit('unresolved-admission', episode)
      expect(code).toBe(1)
      expect(result.status).toBe('failed')
      expect(result.unresolvedAdmissions).toEqual([
        {
          projectToken: 'opaque-project-1',
          admissionId: 'opaque-admission-1',
          phase: 'launch-pending',
        },
      ])
      // The admission is reported verbatim with opaque values only; it is
      // never given an absence verdict or folded into a residual class.
      expect(
        Object.keys((result.unresolvedAdmissions as object[])[0]!)
      ).toEqual(['projectToken', 'admissionId', 'phase'])
      expect(Object.values(result.residuals as object)).toEqual([
        0, 0, 0, 0, 0, 0, 0,
      ])
    } finally {
      await release()
    }
  }, 60000)

  it('treats a null residualCount as unresolved rather than as a satisfied zero', async () => {
    const { episode, release } = await cleanEpisode()
    episode.rows = [
      {
        scenario: 'withheld-claim',
        residualCount: null,
        teardownResidualCount: 0,
      },
      {
        scenario: 'proven-claim',
        residualCount: 0,
        teardownResidualCount: 0,
      },
    ]
    try {
      const { code, result } = await runAudit('null-residual', episode)
      expect(code).toBe(1)
      expect(result.status).toBe('failed')
      expect(result.unresolvedResiduals).toEqual([
        { scenario: 'withheld-claim', residualCount: null },
      ])
      expect(result.claimedResidualTotal).toBe(0)
    } finally {
      await release()
    }
  }, 60000)

  it('reads teardownResidualCount separately and never as a manager absence claim', async () => {
    const { episode, release } = await cleanEpisode()
    episode.rows = [
      {
        scenario: 'withheld-claim',
        residualCount: null,
        teardownResidualCount: 0,
      },
    ]
    try {
      const { code, result } = await runAudit('teardown-separate', episode)
      expect(code).toBe(1)
      expect(result.teardownResidualCount).toBe(0)
      expect(result.unresolvedResiduals).toHaveLength(1)
      expect(result.status).toBe('failed')
    } finally {
      await release()
    }
  }, 60000)

  it('surfaces a prior ownership record it cannot prove absent', async () => {
    const { episode, release } = await cleanEpisode()
    episode.priorOwnershipRecords = [
      { key: 'opaque-prior-1', provableAbsent: true },
      { key: 'opaque-collision-1', provableAbsent: false },
    ]
    try {
      const { code, result } = await runAudit('unprovable-record', episode)
      expect(code).toBe(1)
      expect(result.status).toBe('failed')
      expect(result.unprovableOwnershipRecords).toEqual([
        { key: 'opaque-collision-1', provableAbsent: false },
      ])
    } finally {
      await release()
    }
  }, 60000)

  it('fails with an actionable category when the episode artifact is unusable', async () => {
    const caseRoot = path.join(CASE_ROOT, 'unusable')
    await mkdir(caseRoot, { recursive: true })
    const episodePath = path.join(caseRoot, 'designated-episode.json')
    await writeFile(episodePath, JSON.stringify({ schemaVersion: 2 }))
    const run = await new Promise<{ code: number; stdout: string }>(
      (resolve, reject) => {
        execFile(
          'pnpm',
          ['exec', 'tsx', CLI, episodePath],
          { cwd: path.resolve(import.meta.dirname, '..') },
          (error, stdout) => {
            if (error === null) return resolve({ code: 0, stdout })
            const status = (error as { code?: unknown }).code
            if (typeof status === 'number')
              return resolve({ code: status, stdout })
            reject(error)
          }
        )
      }
    )
    expect(run.code).toBe(1)
    expect(run.stdout).toContain('runtime-restart-episode-unavailable')
  }, 60000)
})
