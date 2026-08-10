import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { BL001_ROOT, REPOSITORY_ROOT } from '../src/workbench-proof-contract.js'
import {
  auditAttributedResources,
  inspectCapacityProcessTree,
  readManagedListeners,
} from '../src/workbench-proof-audit.js'
import {
  startWorkbenchProof,
  stopWorkbenchProof,
  type ProofHandle,
} from '../src/workbench-proof-runtime.js'

const roots: string[] = []
const handles: Array<{ handle: ProofHandle; root: string }> = []
afterEach(async () => {
  for (const active of handles.splice(0))
    await stopWorkbenchProof(active.handle, {
      runRoot: active.root,
      stopTimeoutMs: 500,
    }).catch(() => undefined)
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  )
})

describe('capacity process attribution', () => {
  it('returns strict CPU, RSS, start identity, and tree fields', async () => {
    const inspection = await inspectCapacityProcessTree(process.pid)
    expect(inspection.ok).toBe(true)
    if (!inspection.ok) return
    expect(inspection.rows[0]).toEqual(
      expect.objectContaining({
        pid: expect.any(Number),
        ppid: expect.any(Number),
        startTimeTicks: expect.any(String),
        cpuTicks: expect.any(Number),
        rssKiB: expect.any(Number),
      })
    )
    expect(inspection.rows.some(({ pid }) => pid === process.pid)).toBe(true)
  })

  it('audits only exact attributed identities and listener inodes', async () => {
    await mkdir(BL001_ROOT, { recursive: true })
    const root = await mkdtemp(path.join(BL001_ROOT, 'capacity-audit-'))
    roots.push(root)
    const started = await startWorkbenchProof({
      executablePath: path.join(
        REPOSITORY_ROOT,
        'apps/api/test/fixtures/fake-code-server.mjs'
      ),
      runRoot: root,
      startupTimeoutMs: 2_000,
      environmentOverrides: { BL001_FAKE_MODE: 'ready' },
    })
    handles.push({ handle: started.handle, root })
    const inspection = await inspectCapacityProcessTree(started.handle.pid)
    expect(inspection.ok).toBe(true)
    if (!inspection.ok) return
    const listeners = await readManagedListeners(
      inspection.rows.map(({ pid }) => pid)
    )
    const identities = inspection.rows.map(({ pid, startTimeTicks }) => ({
      pid,
      startTimeTicks,
    }))
    await expect(
      auditAttributedResources(identities, listeners)
    ).resolves.toEqual({
      processIdentitiesAbsent: false,
      listenersAbsent: false,
    })
    await stopWorkbenchProof(started.handle, { runRoot: root })
    handles.splice(0)
    await expect(
      auditAttributedResources(identities, listeners)
    ).resolves.toEqual({ processIdentitiesAbsent: true, listenersAbsent: true })
    await expect(
      auditAttributedResources(
        [{ pid: process.pid, startTimeTicks: 'unrelated' }],
        []
      )
    ).resolves.toEqual({ processIdentitiesAbsent: true, listenersAbsent: true })
  })

  it('retains an attributable inspection failure', async () => {
    await expect(inspectCapacityProcessTree(-1)).resolves.toEqual({
      ok: false,
      rootPid: -1,
      reason: 'root-process-absent',
    })
  })
})
