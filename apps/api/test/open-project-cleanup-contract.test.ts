import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BL008_CLEANUP_EVIDENCE_PATH,
  OPEN_PROJECT_CLEANUP_SCENARIOS,
  runOpenProjectCleanupMatrix,
} from './helpers/open-project-cleanup.js'
import { REPOSITORY_ROOT } from './project-database-test-helper.js'

describe('BL-008 executed cleanup evidence contract', () => {
  it('executes every failure owner and retains a detected cleanup failure for the surviving descendant', async () => {
    const matrix = await runOpenProjectCleanupMatrix()
    expect(matrix.executedScenarioCount).toBe(5)
    expect(Object.keys(matrix.scenarios).sort()).toEqual(
      [...OPEN_PROJECT_CLEANUP_SCENARIOS].sort()
    )
    for (const scenario of OPEN_PROJECT_CLEANUP_SCENARIOS) {
      const evidence = matrix.scenarios[scenario]
      expect(evidence.executed).toBe(true)
      expect(evidence.injectedFailureObserved).toBe(true)
      expect(evidence.processGroupsAbsent).toBe(true)
      expect(evidence.listenersAbsent).toBe(true)
      expect(evidence.databaseAndSidecarsAbsent).toBe(true)
      expect(evidence.fixturesAbsent).toBe(true)
      expect(evidence.processGroupMembersAfterCleanup).toBe(0)
      expect(evidence.listenersAfterCleanup).toBe(0)
      expect(evidence.databaseFilesAfterCleanup).toBe(0)
      expect(evidence.fixturesAfterCleanup).toBe(0)
      expect(evidence.survivingDescendantsAfterTeardown).toBe(0)
      expect(evidence.teardownClean).toBe(true)
    }
    expect(matrix.scenarios.interruptedGracefulShutdown.gracefulStop).toBe(
      false
    )
    expect(
      matrix.scenarios.interruptedGracefulShutdown.ownerCleanupPassed
    ).toBe(true)
    expect(matrix.scenarios.survivingDescendant).toMatchObject({
      gracefulStop: true,
      survivingDescendantDetected: true,
      survivingDescendantsBeforeTeardown: 1,
      ownerCleanupPassed: false,
      teardownClean: true,
    })
    const retained = JSON.parse(
      await readFile(BL008_CLEANUP_EVIDENCE_PATH, 'utf8')
    ) as unknown
    expect(retained).toEqual(matrix)
  })

  it('prevents literal all-true cleanup matrices', async () => {
    const browserSource = await readFile(
      path.join(REPOSITORY_ROOT, 'tests/e2e/project-home.spec.ts'),
      'utf8'
    )
    const ownerSource = await readFile(
      path.join(
        REPOSITORY_ROOT,
        'apps/api/test/helpers/open-project-cleanup.ts'
      ),
      'utf8'
    )
    for (const scenario of OPEN_PROJECT_CLEANUP_SCENARIOS) {
      expect(browserSource).not.toMatch(
        new RegExp(scenario + '[ ]*:[ ]*true', 'u')
      )
    }
    expect(ownerSource).toContain('await runScenario(scenario)')
    expect(ownerSource).toContain('descendantAliveBeforeTeardown')
    expect(ownerSource).toContain('ownerCleanupPassed')
  })
})
