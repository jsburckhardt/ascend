import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  checkPresentationPrerequisites,
  coordinatePresentationAttempts,
} from '../src/workbench-presentation-coordinator.js'
import { PRESENTATION_PREREQUISITES } from '../src/workbench-presentation-contract.js'
import { runFixedPresentationScenario } from '../src/workbench-presentation-scenario.js'
import {
  BL001_FIXTURE,
  snapshotFixture,
} from '../src/workbench-proof-contract.js'

describe('BL-003 bounded fault and safety validation', () => {
  it.each(PRESENTATION_PREREQUISITES)(
    'stops at ordered prerequisite failure %s with zero starts and no fabricated IDs',
    async (failedName) => {
      const visited: string[] = []
      const checked = await checkPresentationPrerequisites(async (name) => {
        visited.push(name)
        return {
          passed: name !== failedName,
          detail: name === failedName ? 'injected failure' : 'passed',
        }
      })
      expect(visited.at(-1)).toBe(failedName)
      expect(checked.stopReason).toBe('prerequisite failure:' + failedName)
      const runAttempt = vi.fn()
      const coordinated = await coordinatePresentationAttempts({
        prerequisiteStopReason: checked.stopReason,
        runAttempt,
      })
      expect(runAttempt).not.toHaveBeenCalled()
      expect(coordinated.records).toEqual([])
      expect(
        coordinated.slots.every((slot) => !slot.runId && !slot.recordReference)
      ).toBe(true)
    }
  )

  it.each(['assertion failure', 'transient error', 'timeout'])(
    'never retries a %s',
    async (message) => {
      const preview = vi.fn(async () => {
        throw new Error(message)
      })
      const never = vi.fn(async () => undefined)
      await expect(
        runFixedPresentationScenario({
          candidate: 'embedded',
          navigate: async () => 200,
          findExplorerSentinel: never,
          openMarkdownFixture: never,
          observeRenderedPreview: preview,
          keyboardFocusExplorer: never,
          keyboardEnterPreview: never,
          keyboardLeavePreview: never,
          openIntegratedTerminal: never,
          clipboardRoundTrip: async () => true,
          runTerminalParity: async () => ({
            identity: true,
            path: true,
            tools: true,
          }),
          workbenchWebSocketUsable: () => true,
          markInteractionStart: () => undefined,
          markTerminalCompletion: () => undefined,
        })
      ).rejects.toThrow(message)
      expect(preview).toHaveBeenCalledOnce()
    }
  )

  it('keeps the unique clipboard token memory-only and preserves fixture tree and sentinel bytes independently', async () => {
    const fixtureBefore = await snapshotFixture()
    let tokenSeenOnlyInMemory = ''
    const done = vi.fn(async () => undefined)
    const result = await runFixedPresentationScenario({
      candidate: 'full-page',
      navigate: async () => 200,
      findExplorerSentinel: done,
      openMarkdownFixture: done,
      observeRenderedPreview: done,
      keyboardFocusExplorer: done,
      keyboardEnterPreview: done,
      keyboardLeavePreview: done,
      openIntegratedTerminal: done,
      clipboardRoundTrip: async (token) => {
        tokenSeenOnlyInMemory = token
        return true
      },
      runTerminalParity: async () => ({
        identity: true,
        path: true,
        tools: true,
      }),
      workbenchWebSocketUsable: () => true,
      markInteractionStart: () => undefined,
      markTerminalCompletion: () => undefined,
    })
    const fixtureAfter = await snapshotFixture()
    expect(tokenSeenOnlyInMemory).toMatch(/^BL003_CLIPBOARD_/u)
    expect(JSON.stringify(result)).not.toContain(tokenSeenOnlyInMemory)
    const fixtureContents = await Promise.all(
      (await readdir(BL001_FIXTURE, { recursive: true, withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) =>
          readFile(path.join(entry.parentPath, entry.name), 'utf8')
        )
    )
    expect(fixtureContents.join('')).not.toContain(tokenSeenOnlyInMemory)
    expect(fixtureAfter.paths).toEqual(fixtureBefore.paths)
    expect(fixtureAfter.sentinelHashes).toEqual(fixtureBefore.sentinelHashes)
  })
})
