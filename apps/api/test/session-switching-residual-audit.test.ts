import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  BL014_FIXTURES,
  BL014_RESOURCE_CLASSES,
} from '../src/session-switching-contract.js'

describe('BL-014 residual audit contract', () => {
  it('derives project partitions and inventories every declared resource class', async () => {
    expect(new Set(BL014_RESOURCE_CLASSES).size).toBe(
      BL014_RESOURCE_CLASSES.length
    )
    const measured = BL014_FIXTURES.map((project) => ({
      projectToken: project.id,
      observationId: crypto.randomUUID(),
      measured: true,
      resourceClasses: [...BL014_RESOURCE_CLASSES],
      residuals: 0,
    }))
    expect(measured).toHaveLength(BL014_FIXTURES.length)
    expect(
      measured.every(
        (row) =>
          row.measured &&
          row.resourceClasses.length === BL014_RESOURCE_CLASSES.length
      )
    ).toBe(true)
    const source = await readFile(
      new URL(
        '../src/cli/session-switching-residual-audit.ts',
        import.meta.url
      ),
      'utf8'
    )
    expect(source).not.toContain("['A', 'B', 'C']")
    expect(source).toContain('publicArtifact.projects')
    expect(source).toContain('artifactManifest.entries')
    expect(source).toContain("path.join(resultRoot, 'a-counter.log')")
    expect(source).toContain("path.join(resultRoot, 'a-counter-identity.json')")
    expect(source).toContain('validateSessionSwitchingResidualDeclarations')
    expect(source).not.toContain('counterOutput: string')
  })
})
