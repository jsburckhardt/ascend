import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { MVP_PERFORMANCE_EVIDENCE_ROOT } from '../mvp-performance-contract.js'
import {
  validateMvpEvidenceBundle,
  type MvpEvidenceBundle,
} from '../mvp-performance-validator.js'
const latest = async () => {
  const requested = process.argv[2]
  if (requested) return path.resolve(requested)
  const entries = (
    await readdir(MVP_PERFORMANCE_EVIDENCE_ROOT, { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, entry.name))
    .sort()
    .reverse()
  for (const entry of entries)
    try {
      await readFile(path.join(entry, 'summary.json'))
      return entry
    } catch {
      /* incomplete run */
    }
  throw new Error('mvp-performance-complete-evidence-unavailable')
}
const json = async (target: string) =>
  JSON.parse(await readFile(target, 'utf8')) as Record<string, unknown>
try {
  const root = await latest()
  const bundle: MvpEvidenceBundle = {
    plan: (await json(path.join(root, 'plan.json'))) as never,
    attempts: (
      (await json(path.join(root, 'attempts.json'))) as { attempts: never }
    ).attempts,
    continuity: (await json(path.join(root, 'continuity.json'))) as never,
    capacity: (await json(path.join(root, 'capacity.json'))) as never,
    summary: (await json(path.join(root, 'summary.json'))) as never,
    artifacts: (await json(path.join(root, 'browser-artifacts.json'))) as never,
    recomputation: await json(path.join(root, 'recomputation.json')),
    residual: (await json(path.join(root, 'residual-audit.json'))) as never,
  }
  const result = validateMvpEvidenceBundle(bundle)
  process.stdout.write(
    JSON.stringify({
      command: 'verify-mvp-performance',
      status: 'ok',
      runId: bundle.plan.runId,
      measurementHash: result.measurementHash,
    }) + '\n'
  )
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      command: 'verify-mvp-performance',
      status: 'invalid-evidence',
      classification:
        error && typeof error === 'object' && 'classification' in error
          ? String(error.classification)
          : 'validator-failed',
      error: error instanceof Error ? error.message : 'unknown',
    }) + '\n'
  )
  process.exitCode = 1
}
