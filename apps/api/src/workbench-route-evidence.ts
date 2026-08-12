import {
  chmod,
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { REPOSITORY_ROOT } from './workbench-proof-contract.js'
import { validateRestrictedEvidence } from './workbench-proxy-contract.js'

export const WORKBENCH_ROUTE_EVIDENCE_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/bl-011'
)
const WORKBENCH_ROUTE_EVIDENCE_LOCK = path.join(
  WORKBENCH_ROUTE_EVIDENCE_ROOT,
  '.writer-lock'
)
export const WORKBENCH_ROUTE_EVIDENCE_FILE = path.join(
  WORKBENCH_ROUTE_EVIDENCE_ROOT,
  'workbench-route-evidence.json'
)

export interface WorkbenchRouteEvidence {
  schemaVersion: 1
  projectToken?: string
  stableRoute?: string
  matrices: unknown[]
  browser?: unknown
  redaction?: unknown
  cleanup: Record<string, unknown>
  residualAudit: Record<string, unknown>
  [key: string]: unknown
}

const emptyEvidence = (): WorkbenchRouteEvidence => ({
  schemaVersion: 1,
  matrices: [],
  cleanup: {},
  residualAudit: {},
})

export async function readWorkbenchRouteEvidence(): Promise<WorkbenchRouteEvidence> {
  try {
    const value: unknown = JSON.parse(
      await readFile(WORKBENCH_ROUTE_EVIDENCE_FILE, 'utf8')
    )
    if (!validateRestrictedEvidence(value))
      throw new Error('Restricted workbench evidence is malformed')
    return value as WorkbenchRouteEvidence
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return emptyEvidence()
    throw error
  }
}

export async function mergeWorkbenchRouteEvidence(
  update: Partial<WorkbenchRouteEvidence>
): Promise<WorkbenchRouteEvidence> {
  await mkdir(WORKBENCH_ROUTE_EVIDENCE_ROOT, { recursive: true, mode: 0o700 })
  const lockDeadline = Date.now() + 5_000
  for (;;) {
    try {
      await mkdir(WORKBENCH_ROUTE_EVIDENCE_LOCK, { mode: 0o700 })
      break
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== 'EEXIST' ||
        Date.now() >= lockDeadline
      )
        throw error
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
  }
  try {
    try {
      const metadata = await lstat(WORKBENCH_ROUTE_EVIDENCE_FILE)
      if (metadata.isSymbolicLink() || !metadata.isFile())
        throw new Error('Restricted evidence path must be a regular file')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    const current = await readWorkbenchRouteEvidence()
    const updatedMatrices = update.matrices ?? []
    const updatedIds = new Set(
      updatedMatrices.map((entry) =>
        typeof entry === 'object' && entry !== null && 'id' in entry
          ? String(entry.id)
          : JSON.stringify(entry)
      )
    )
    const matrices =
      update.matrices === undefined
        ? current.matrices
        : [
            ...current.matrices.filter(
              (entry) =>
                !updatedIds.has(
                  typeof entry === 'object' && entry !== null && 'id' in entry
                    ? String(entry.id)
                    : JSON.stringify(entry)
                )
            ),
            ...updatedMatrices,
          ]
    const next: WorkbenchRouteEvidence = {
      ...current,
      ...update,
      schemaVersion: 1,
      matrices,
      cleanup: { ...current.cleanup, ...update.cleanup },
      residualAudit: { ...current.residualAudit, ...update.residualAudit },
    }
    if (!validateRestrictedEvidence(next))
      throw new Error('Restricted workbench evidence update is malformed')
    const temporary = WORKBENCH_ROUTE_EVIDENCE_FILE + `.tmp-${process.pid}`
    try {
      await writeFile(temporary, JSON.stringify(next, null, 2) + '\n', {
        mode: 0o600,
        flag: 'wx',
      })
      await chmod(temporary, 0o600)
      await rename(temporary, WORKBENCH_ROUTE_EVIDENCE_FILE)
      await chmod(WORKBENCH_ROUTE_EVIDENCE_FILE, 0o600)
    } finally {
      await rm(temporary, { force: true })
    }
    return next
  } finally {
    await rm(WORKBENCH_ROUTE_EVIDENCE_LOCK, { recursive: true, force: true })
  }
}
