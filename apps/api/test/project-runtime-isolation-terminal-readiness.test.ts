import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('BL-013 Chromium terminal readiness regression', () => {
  it('requires one visible readiness consequence before each proof command', async () => {
    const source = await readFile(
      new URL(
        '../../../tests/e2e/project-runtime-isolation.spec.ts',
        import.meta.url
      ),
      'utf8'
    )
    const readinessFormat = source.indexOf("'printf BL013_READY_%s '")
    const proofDispatch = source.indexOf('page.keyboard.insertText(command)')
    const readinessConsequence = source.indexOf(
      "includes('BL013_' + readinessMarker)"
    )
    const proofConsequence = source.indexOf(
      "includes('BL013_DONE=' + executionMarker)"
    )
    expect(readinessFormat).toBeGreaterThan(0)
    expect(proofDispatch).toBeGreaterThan(readinessFormat)
    expect(readinessConsequence).toBeGreaterThan(proofDispatch)
    expect(proofConsequence).toBeGreaterThan(readinessConsequence)
    expect(
      source.match(/page\.keyboard\.insertText\(command\)/gu)
    ).toHaveLength(1)
    expect(source).toContain('const operationMs = 30_000')
    expect(source).toContain('tests/e2e/fixtures/bl014-terminal-proof.mjs')
    expect(source).toContain('.replace(/\\s/gu, \x27\x27)')
    expect(source).toContain('executionMarker +\n    \x27 BL013\x27')
    expect(source).not.toMatch(/for \(let attempt|retries: [1-9]/u)
  })
})
