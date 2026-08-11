import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  OPENING_POLICY_CONFIGURED_HOME_FIELD,
  OPENING_POLICY_FAILURE_CATEGORY,
  REGISTRATION_FAILURE_CATEGORIES,
  REGISTRATION_PATH_FIELD,
} from '../src/project-registration.js'
import { REPOSITORY_ROOT } from './project-database-test-helper.js'
import { PERMISSION_CAPABILITY_PATH } from './project-registration-fixture-helper.js'

async function repositoryText(relativePath: string) {
  return readFile(path.join(REPOSITORY_ROOT, relativePath), 'utf8')
}

describe('BL-006 registration documentation contract', () => {
  it('synchronizes executable categories, fields, syntax, policy, and persistence behavior', async () => {
    const application = await repositoryText('docs/README.md')
    const api = await repositoryText('apps/api/README.md')
    const combined = application + '\n' + api

    for (const category of REGISTRATION_FAILURE_CATEGORIES) {
      expect(application).toContain(category)
      expect(api).toContain(category)
    }
    for (const token of [
      OPENING_POLICY_FAILURE_CATEGORY,
      OPENING_POLICY_CONFIGURED_HOME_FIELD,
      'allowed_roots[n]',
      'field: ' + REGISTRATION_PATH_FIELD,
      'absolute',
      '~/...',
      'whitespace',
      'canonical',
      'prefix sibling',
      'symlink',
      'exactly eight concurrent',
      'close/reopen',
      'deny-all',
    ]) {
      expect(combined).toContain(token)
    }
    for (const field of ['id', 'name', 'canonicalPath', 'createdAt']) {
      expect(api).toContain(field)
    }
    for (const exclusion of [
      'scanning',
      'clone/import',
      'Git',
      'native pickers',
      'POST',
      'project close',
      'workbench launch',
      'BL-008',
    ]) {
      expect(combined.toLowerCase()).toContain(exclusion.toLowerCase())
    }
  })

  it('synchronizes finite validation, capability evidence, cleanup, and harness ownership', async () => {
    const justfile = await repositoryText('justfile')
    const harness = await repositoryText('.harness/engineering-harness.md')
    const application = await repositoryText('docs/README.md')
    const api = await repositoryText('apps/api/README.md')
    const relativeArtifact = path.relative(
      REPOSITORY_ROOT,
      PERMISSION_CAPABILITY_PATH
    )

    expect(justfile.match(/^verify-project-registration:/gm)).toHaveLength(1)
    expect(justfile).toMatch(/verify:[\s\S]*just verify-project-registration/)
    for (const group of [
      'configuration',
      'registration',
      'persistence',
      'non-mutation',
      'fixture-cleanup',
      'documentation',
      'permission-capability',
    ]) {
      expect(justfile).toContain('BL-006 ' + group)
    }
    expect(harness).toContain(
      'harness checks still delegates only to just verify'
    )
    expect(harness).toContain('just verify-project-registration')
    expect(harness).toContain(relativeArtifact)
    expect(application).toContain(relativeArtifact)
    expect(api).toContain(relativeArtifact)
    for (const token of [
      'proved',
      'skipped',
      'controlled denial',
      'restore',
      'remove only',
    ]) {
      expect((harness + application + api).toLowerCase()).toContain(token)
    }
  })
})
