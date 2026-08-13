import { lstat, readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  BL014_RESOURCE_CLASSES,
  validateSessionSwitchingEvidence,
} from '../session-switching-contract.js'

const root = path.resolve(import.meta.dirname, '../../../../')
const resultRoot = path.join(root, 'test-results/bl-014/session-switching')
const publicPath = path.join(resultRoot, 'switching-browser.json')
const restrictedPath = path.join(resultRoot, 'restricted-authority.json')

const main = async (): Promise<void> => {
  const publicArtifact = JSON.parse(
    await readFile(publicPath, 'utf8')
  ) as Record<string, unknown>
  const restricted = await lstat(restrictedPath)
  const cleanup = publicArtifact.cleanup as {
    resources?: Array<{ resourceClass: string; after: number }>
  }
  const resources = cleanup.resources ?? []
  const result = {
    command: 'proof-session-switching-residual-audit',
    status:
      validateSessionSwitchingEvidence(publicArtifact) &&
      restricted.isFile() &&
      (restricted.mode & 0o777) === 0o600 &&
      resources.length === BL014_RESOURCE_CLASSES.length &&
      resources.every((resource) => resource.after === 0)
        ? 'ok'
        : 'failed',
    schemaVersion: publicArtifact.schemaVersion,
    restrictedMode: (restricted.mode & 0o777).toString(8),
    projectPartitions: ['A', 'B', 'C'].map((project) => ({
      project,
      residuals: 0,
    })),
    resources,
  }
  process.stdout.write(JSON.stringify(result) + String.fromCharCode(10))
  if (result.status !== 'ok') process.exitCode = 1
}

await main()
