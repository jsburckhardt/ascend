import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { REGISTRATION_FAILURE_CATEGORIES } from '../src/project-registration.js'
import {
  INVALID_REGISTRATION_REQUEST,
  PROJECT_REGISTRATION_BODY_LIMIT_BYTES,
  PROJECT_REGISTRATION_FAILED,
  REGISTRATION_REQUEST_TOO_LARGE,
} from '../src/routes/projects.js'
import { OPEN_PROJECT_CLEANUP_SCENARIOS } from './helpers/open-project-cleanup.js'
import { REPOSITORY_ROOT } from './project-database-test-helper.js'

async function text(relative: string): Promise<string> {
  return readFile(path.join(REPOSITORY_ROOT, relative), 'utf8')
}

describe('BL-008 documentation contract', () => {
  it('synchronizes API size, status, shape, safety, and configuration contracts', async () => {
    const root = await text('README.md')
    const application = await text('docs/README.md')
    const api = await text('apps/api/README.md')
    const combined = root + application + api
    for (const token of [
      PROJECT_REGISTRATION_BODY_LIMIT_BYTES.toLocaleString('en-US'),
      '4,097',
      INVALID_REGISTRATION_REQUEST,
      REGISTRATION_REQUEST_TOO_LARGE,
      PROJECT_REGISTRATION_FAILED,
      'application/json',
      'ASCEND_PROJECT_HOME',
      'ASCEND_PROJECT_ALLOWED_ROOTS',
      'created',
      'existing',
      '201',
      '200',
      '400',
      '403',
      '404',
      '413',
      '422',
      '500',
      'id',
      'name',
      'canonicalPath',
      'createdAt',
      'delegates exactly once',
      'raw platform error',
      'SQL',
      'secret',
    ])
      expect(combined).toContain(token)
    for (const category of REGISTRATION_FAILURE_CATEGORIES)
      expect(combined).toContain(category)
    for (const mediaType of [
      'application/json',
      'text/plain',
      'application/xml',
      'application/octet-stream',
    ])
      expect(api).toContain(mediaType)
    expect(api).toContain('zero registration delegation')
    expect(api).toContain('same safe 400 response')
  })

  it('synchronizes form, recovery, generation, scope, commands, and evidence', async () => {
    const files = await Promise.all(
      [
        'README.md',
        'docs/README.md',
        'apps/web/README.md',
        '.harness/engineering-harness.md',
        'justfile',
      ].map(text)
    )
    const combined = files.join(' ')
    for (const token of [
      'Host path',
      'absolute',
      '~/...',
      'aria-invalid',
      '10,000',
      '5,000',
      'Cancel',
      'pre-send',
      'Submission outcome unknown',
      'Retry same submission',
      'Refresh projects',
      'byte-equivalent',
      'one added ID',
      'Zero added IDs',
      'Multiple additions',
      'explicit reset',
      'monotonic',
      'stale',
      'inert',
      'createdAt ASC, id ASC',
      'scroll',
      'focus',
      'announce',
      'stable ID',
      'just verify-open-project',
      'just verify',
      'keyboard-only',
      'fixture integrity',
      'startup',
      'assertion',
      'timeout',
      'interrupted',
      'surviving-descendant',
      'test-results/bl-008/open-project/episode.json',
      'cleanup-matrix.json',
      'ownerCleanupPassed',
      'teardownClean',
      'gracefulStop',
      'exact-PID',
      'process-group',
      'database/sidecar',
      'workbench',
      'picker',
      'scan',
      'clone/import',
      'project close',
      'BL-010',
      'BL-012',
    ])
      expect(combined.toLowerCase()).toContain(token.toLowerCase())
    for (const scenario of OPEN_PROJECT_CLEANUP_SCENARIOS)
      expect(combined).toContain(scenario)
    expect(combined).toContain('ownerCleanupPassed: false')
    expect(combined).toContain('teardownClean: true')
    expect(combined).toContain('executed')
    expect(files[4]!.match(/^verify-open-project:/gmu)).toHaveLength(1)
    expect(files[3]).toContain('harness checks')
    expect(files[3]).toContain('non-persistent')
  })
})
