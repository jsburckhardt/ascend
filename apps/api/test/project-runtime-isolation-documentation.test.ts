import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const root = new URL('../../../', import.meta.url)
const read = (relative: string) => readFile(new URL(relative, root), 'utf8')

describe('BL-013 application documentation contract', () => {
  it('documents ownership, concurrency, failures, evidence, cleanup, and scope', async () => {
    const [readme, runtime, routing, api, harness] = await Promise.all([
      read('README.md'),
      read('docs/project-runtime.md'),
      read('docs/stable-workbench-routing.md'),
      read('apps/api/src/routes/README.md'),
      read('.harness/engineering-harness.md'),
    ])
    const complete = [readme, runtime, routing, api, harness].join('\n')
    for (const phrase of [
      'stable project ID',
      '24 calls',
      'healthy reuse',
      'Early exit',
      'readiness',
      'health',
      'proxy failure',
      'explicit replacement',
      'opaque project token',
      'three disposable Git repositories',
      'repository-only test authority',
      'per-project/global cleanup',
      'just verify-project-runtime-isolation',
      'just proof-project-runtime-isolation-residual-audit',
      'BL-014',
      'BL-015',
      'no public Stop',
      'ownsSnapshot',
      'schema-version-2',
      '12 independently executed scenarios',
      'request/upgrade IDs',
      'assigned zeros',
      'Management and one ExtensionHost',
      'initial/replacement',
    ])
      expect(complete).toContain(phrase)
    expect(readme).toContain(
      'no hosted service, credential, network dependency, or manual judgment'
    )
    expect(routing).toContain('24 rows')
    expect(runtime).toContain('all ten resource classes at zero')
    expect(api).toContain('adds no schema, migration')
    expect(harness).toContain(
      'no-retry three-Git-fixture Chromium A/B/C replacement episode'
    )
  })
})
