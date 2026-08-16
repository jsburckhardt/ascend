import { describe, expect, it, vi } from 'vitest'
import {
  defaultRuntimeAttributionPrimitives,
  resolveGroupListenerOwner,
  type InstalledRuntimeIdentity,
  type RuntimeAttributionPrimitives,
  type RuntimeProcessIdentity,
} from '../src/project-runtime-process.js'

const installed: InstalledRuntimeIdentity = Object.freeze({
  launcherRealPath: '/opt/code-server/bin/code-server',
  installationRoot: '/opt/code-server',
  interpreterPath: '/opt/code-server/lib/node',
  launcherArgvPrefix: Object.freeze([
    '/opt/code-server/lib/node',
    '/opt/code-server',
  ]),
})

function identity(pid: number): RuntimeProcessIdentity {
  return Object.freeze({
    pid,
    processGroupId: 100,
    uid: process.getuid?.() ?? 1_000,
    startTime: String(pid * 10),
  })
}

function primitives(
  input: {
    readonly complete?: boolean
    readonly group?: readonly number[]
    readonly holders?: readonly number[]
  } = {}
): RuntimeAttributionPrimitives {
  const group = input.group ?? [100, 101]
  const holders = input.holders ?? [101]
  return {
    resolveInstalledRuntimeIdentity: vi.fn(async () => installed),
    listRuntimeCandidatePids: vi.fn(async () => ({
      pids: group,
      complete: true,
    })),
    readProcessIdentity: vi.fn(async (pid) => identity(pid)),
    readProcessCommandLine: vi.fn(async (pid) =>
      pid === 100
        ? [installed.interpreterPath, installed.installationRoot]
        : [
            installed.interpreterPath,
            installed.installationRoot + '/out/node/entry.js',
          ]
    ),
    readProcessGroupMemberPids: vi.fn(async () => ({
      pids: group,
      complete: input.complete ?? true,
    })),
    readLoopbackListenerInode: vi.fn(async () => '8080'),
    readProcessSocketInodes: vi.fn(async (pid) =>
      holders.includes(pid) ? ['8080'] : []
    ),
  }
}

describe('runtime reconciliation attribution', () => {
  it('keeps exactly seven injectable attribution primitives', () => {
    expect(Object.keys(defaultRuntimeAttributionPrimitives).sort()).toEqual(
      [
        'listRuntimeCandidatePids',
        'readLoopbackListenerInode',
        'readProcessCommandLine',
        'readProcessGroupMemberPids',
        'readProcessIdentity',
        'readProcessSocketInodes',
        'resolveInstalledRuntimeIdentity',
      ].sort()
    )
  })

  it('attributes a loopback listener to one conforming forked group member', async () => {
    const result = await resolveGroupListenerOwner({
      processGroupId: 100,
      port: 8080,
      installedRuntime: installed,
      signal: new AbortController().signal,
      primitives: primitives(),
    })

    expect(result.refusalReason).toBeNull()
    expect(result.owner?.identity.pid).toBe(101)
  })

  it.each([
    ['incomplete group scan', primitives({ complete: false })],
    ['complete empty group scan', primitives({ group: [] })],
    ['complete group scan missing its leader', primitives({ group: [101] })],
  ])('refuses %s before listener observation', async (_label, injected) => {
    const result = await resolveGroupListenerOwner({
      processGroupId: 100,
      port: 8080,
      installedRuntime: installed,
      signal: new AbortController().signal,
      primitives: injected,
    })

    expect(result).toEqual({
      owner: null,
      refusalReason: 'group-scan-incomplete',
    })
    expect(injected.readLoopbackListenerInode).not.toHaveBeenCalled()
    expect(injected.readProcessIdentity).not.toHaveBeenCalled()
    expect(injected.readProcessCommandLine).not.toHaveBeenCalled()
    expect(injected.readProcessSocketInodes).not.toHaveBeenCalled()
  })

  it.each([
    [
      'no holder in the exact group',
      primitives({ holders: [] }),
      'listener-not-owned',
    ],
    [
      'ambiguous group holders',
      primitives({ holders: [100, 101] }),
      'listener-not-owned',
    ],
  ])('refuses %s', async (_label, injected, refusalReason) => {
    const result = await resolveGroupListenerOwner({
      processGroupId: 100,
      port: 8080,
      installedRuntime: installed,
      signal: new AbortController().signal,
      primitives: injected,
    })

    expect(result).toEqual({ owner: null, refusalReason })
  })
})
