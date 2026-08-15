import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  PROJECT_RUNTIME_STATE_FAILED,
  PROJECT_RUNTIME_STATE_FAILED_EVENT,
} from '../src/routes/project-runtime-state.js'
import { REPOSITORY_ROOT } from './project-database-test-helper.js'

const documentationPaths = [
  'README.md',
  'docs/README.md',
  'docs/project-runtime.md',
  'docs/stable-workbench-routing.md',
  'apps/api/src/routes/README.md',
] as const
const evidencePath =
  'project/work-items/37-bl-016-report-accurate-runtime-state-and-health/implementation/evidence/runtime-state-matrix.json'

const text = (relative: string): Promise<string> =>
  readFile(path.join(REPOSITORY_ROOT, relative), 'utf8')

describe('BL-016 application documentation contract', () => {
  it('documents projection, transitions, Home reconciliation, and disclosure', async () => {
    const documents = await Promise.all(documentationPaths.map(text))
    const combined = documents.join('\n')

    for (const phrase of [
      'Stopped',
      'Starting',
      'Running',
      'Failed',
      'reportPublicStates',
      'synchronous',
      'one ordered entry-map pass',
      'Retained-failure precedence',
      'running -> failed',
      'False liveness',
      'failed completed health observation',
      'post-readiness process exit',
      'one category',
      'one cleanup',
      'one `runtime.health.changed`',
      'Project Home',
      'authoritative list revision',
      'exact ordered project-ID set',
      'whole list explicitly unavailable',
      'No partial state',
      'client-owned category text',
      'no polling',
      'Stop',
      'Restart',
    ]) {
      expect(combined).toContain(phrase)
    }
  })

  it('documents exact endpoint envelopes, ordering, and unchanged project payload', async () => {
    const documents = await Promise.all(documentationPaths.map(text))
    const combined = documents.join('\n')
    for (const phrase of [
      'GET /api/projects/runtime',
      'createdAt ASC, id ASC',
      'failureCategory',
      PROJECT_RUNTIME_STATE_FAILED,
      PROJECT_RUNTIME_STATE_FAILED_EVENT,
      '500',
      'partial',
      'four-field',
      'id',
      'name',
      'canonicalPath',
      'createdAt',
    ]) {
      expect(combined).toContain(phrase)
    }
  })

  it('documents commands, retained evidence, event rename, and no-impact categories', async () => {
    const [justfile, ...documents] = await Promise.all([
      text('justfile'),
      ...documentationPaths.map(text),
    ])
    const combined = documents.join('\n')
    for (const phrase of [
      'just verify-runtime-state',
      'just verify-project-runtime',
      'just verify-project-runtime-isolation',
      'just verify-home-workbench',
      evidencePath,
      'runtime.health.changed',
      '70-record',
      'no environment variable',
      'no SQLite/data/schema/API-payload migration',
      'no deployment-topology change',
      'no daemon or manual operational procedure',
    ]) {
      expect(combined).toContain(phrase)
    }
    expect(combined).not.toContain('runtime.exited')
    expect(justfile.match(/^verify-runtime-state:/gmu)).toHaveLength(1)
    expect(justfile.match(/^    just verify-runtime-state$/gmu)).toHaveLength(1)
    await expect(
      access(path.join(REPOSITORY_ROOT, evidencePath))
    ).resolves.toBe(undefined)
  })
})
