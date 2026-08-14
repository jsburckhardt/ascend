import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { MVP_PERFORMANCE_EVIDENCE_ROOT } from '../mvp-performance-contract.js'
import {
  validateMvpArtifactFiles,
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
  const complete: Array<{ root: string; completedAt: string }> = []
  for (const entry of entries)
    try {
      const summary = JSON.parse(
        await readFile(path.join(entry, 'summary.json'), 'utf8')
      ) as { completedAt: string }
      complete.push({ root: entry, completedAt: summary.completedAt })
    } catch {
      /* incomplete run */
    }
  complete.sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  if (complete[0]) return complete[0].root
  throw new Error('mvp-performance-complete-evidence-unavailable')
}
const json = async (target: string) =>
  JSON.parse(await readFile(target, 'utf8')) as Record<string, unknown>
try {
  const root = await latest()
  const baselineRoot = path.join(
    MVP_PERFORMANCE_EVIDENCE_ROOT,
    '../../../11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence/853037e6-5dab-43cf-bcf8-61f1e8bbdb18'
  )
  const baselineRun = await json(path.join(baselineRoot, 'run.json'))
  const baselineSamples = await json(path.join(baselineRoot, 'samples.json'))
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
    hostVerification: (await json(
      path.join(root, 'host-verification.json')
    )) as never,
    sectionStatus: (await json(
      path.join(root, 'section-status.json')
    )) as never,
    runStatus: (await json(path.join(root, 'run-status.json'))) as never,
    recovery: (await json(path.join(root, 'attempt-recovery.json'))) as never,
    baseline: {
      runId: String(baselineRun.runId),
      measurementMethod: String(baselineRun.measurementMethod),
      samples: (baselineSamples as { samples: never[] }).samples,
    },
  }
  const result = validateMvpEvidenceBundle(bundle)
  const artifactScan = await validateMvpArtifactFiles(bundle, root)
  process.stdout.write(
    JSON.stringify({
      command: 'verify-mvp-performance',
      status: 'ok',
      runId: bundle.plan.runId,
      measurementHash: result.measurementHash,
      artifactScan,
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
