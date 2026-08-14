import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import {
  chmod,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createApiServerController } from './api-server.js'
import { resolveFrontDoorToken } from './front-door-contract.js'
import {
  MVP_CAPACITY_COHORTS,
  MVP_PERFORMANCE_EVIDENCE_ROOT,
  MVP_PERFORMANCE_RESULT_ROOT,
  digestMvpPerformance,
} from './mvp-performance-contract.js'
import { atomicWriteMvpJson } from './mvp-performance-evidence.js'
import { createProjectLibrary } from './project-library.js'
import {
  createProjectRuntimeConfig,
  stableProjectRoute,
} from './project-runtime-contract.js'
import { createProjectRuntimeManager } from './project-runtime-manager.js'
import {
  loopbackListenerIsAbsent,
  readProcessStartTime,
} from './project-runtime-process.js'
import {
  CAPACITY_MEMBER_TIMEOUT_MS,
  CAPACITY_PROBE,
  CAPACITY_SAMPLE_OFFSETS_MS,
  CAPACITY_WORKLOAD_DURATION_MS,
  CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
  CAPACITY_WORKLOAD_TIMEOUT_MS,
  type CapacitySlot,
  type ScheduledSample,
  type WorkloadResult,
} from './workbench-capacity-contract.js'
import { readManagedListeners } from './workbench-proof-audit.js'
import {
  BL001_FIXTURE,
  CODE_SERVER_PATH,
  REPOSITORY_ROOT,
} from './workbench-proof-contract.js'
import { inspectCapacityProcessTree } from './workbench-proof-audit.js'
import { terminateExactProcessGroup } from './workbench-proof-runtime.js'
import {
  runResponsivenessProbe,
  sampleCapacityWindow,
  startCapacityWorkload,
  type WorkloadController,
} from './workbench-capacity-sampling.js'
import { createWorkbenchProxyManager } from './workbench-proxy-manager.js'

export interface IntegratedCapacityRecord {
  schemaVersion: 1
  runId: string
  planHash: string
  method: {
    integratedProduct: true
    probe: typeof CAPACITY_PROBE
    sampleOffsetsMs: typeof CAPACITY_SAMPLE_OFFSETS_MS
    workloadDurationMs: number
    workloadTimeoutMs: number
    workloadOutputLimitBytes: number
    runtimeMethodComparableToBl004: true
    baselineRunId: string
    baselineMeasurementMethod: string
  }
  cohorts: Array<{
    cohort: number
    attemptId: string
    retry: 0
    fixtureCopies: number
    fixtureManifestDigests: string[]
    slots: CapacitySlot[]
    samples: ScheduledSample[]
    workloads: WorkloadResult[]
    preProbePassed: boolean
    postProbePassed: boolean
    ready: number
    requiredSamplesComplete: boolean
    responsivenessPassed: boolean
    cleanupPassed: boolean
    residuals: number
    gate: 'met' | 'blocker' | 'finding'
    failures: string[]
  }>
  comparison: Array<{
    cohort: number | 'historical-1'
    field:
      | 'load1Average'
      | 'minimumAvailableMemoryKiB'
      | 'runtimeCpuAveragePercent'
      | 'runtimeRssAverageKiB'
    classification: 'comparable' | 'directional-only' | 'not-comparable'
    reason: string
    baseline: {
      runId: string
      method: string
      sourceFile: string
      sampleCount: number
      value: number
    }
    current: {
      runId: string
      method: string
      sourceFile: string
      sampleCount: number
      value: number
    } | null
    delta: number | null
  }>
  finalResidualAudit: {
    complete: boolean
    runtimeResiduals: number
    listenerResiduals: number
    webResiduals: number
    databaseResiduals: number
    fixtureResiduals: number
    total: number
  }
}
const disposablePort = async (): Promise<number> => {
  const server = (await import('node:net')).createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('port-unavailable')
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return address.port
}
const startWeb = async (apiPort: number) => {
  const webPort = await disposablePort()
  const child = spawn(
    process.execPath,
    [
      path.join(REPOSITORY_ROOT, 'tests/e2e/helpers/vite-process.mjs'),
      path.join(REPOSITORY_ROOT, 'apps/web/node_modules/vite/bin/vite.js'),
      '127.0.0.1',
      String(webPort),
    ],
    {
      cwd: path.join(REPOSITORY_ROOT, 'apps/web'),
      detached: true,
      env: {
        ...process.env,
        ASCEND_E2E_API_TARGET: 'http://127.0.0.1:' + apiPort,
        ASCEND_E2E_DISABLE_HMR: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    }
  )
  for (let attempt = 0; attempt < 300; attempt += 1) {
    try {
      if ((await fetch('http://127.0.0.1:' + webPort + '/')).status === 200)
        return { child: child as ChildProcessWithoutNullStreams, port: webPort }
    } catch {
      /* retry readiness */
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('capacity-web-readiness-timeout')
}
const stopWeb = async (child: ChildProcessWithoutNullStreams | undefined) => {
  if (child?.pid)
    await terminateExactProcessGroup(child.pid, 5_000).catch(() => undefined)
}
const missingSlot = (
  runId: string,
  cohort: number,
  slot: number,
  reason: string
): CapacitySlot => ({
  runId,
  cohort,
  slot,
  state: 'failed',
  reason,
  attemptStartedAt: new Date().toISOString(),
  attemptEndedAt: new Date().toISOString(),
  readinessTimeoutMs: CAPACITY_MEMBER_TIMEOUT_MS,
  runtimeRunId: null,
  pid: null,
  startTimeTicks: null,
  url: null,
  readinessStatus: null,
  listener: null,
  readinessAchieved: false,
  processIdentities: [],
  attributedListeners: [],
  unexpectedExit: false,
})
const manifest = async (root: string): Promise<string> => {
  const { readdir } = await import('node:fs/promises')
  const rows: string[] = []
  const walk = async (current: string) => {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name)
    )) {
      const absolute = path.join(current, entry.name),
        relative = path.relative(root, absolute)
      if (entry.isDirectory()) {
        rows.push('d:' + relative)
        await walk(absolute)
      } else
        rows.push(
          'f:' + relative + ':' + digestMvpPerformance(await readFile(absolute))
        )
    }
  }
  await walk(root)
  return digestMvpPerformance(rows)
}
const countDatabaseResiduals = async (database: string) => {
  let count = 0
  for (const candidate of [
    database,
    database + '-wal',
    database + '-shm',
    database + '-journal',
  ])
    try {
      await readFile(candidate)
      count += 1
    } catch {
      /* absent */
    }
  return count
}

const BL004_BASELINE_RUN_ID = '853037e6-5dab-43cf-bcf8-61f1e8bbdb18'
const BL004_BASELINE_ROOT = path.join(
  REPOSITORY_ROOT,
  'project/work-items/11-bl-004-establish-the-workbench-capacity-baseline/implementation/evidence',
  BL004_BASELINE_RUN_ID
)
const BL004_SAMPLE_SOURCE = path.join(BL004_BASELINE_ROOT, 'samples.json')
const BL004_RUN_SOURCE = path.join(BL004_BASELINE_ROOT, 'run.json')
type CapacityDeltaField =
  IntegratedCapacityRecord['comparison'][number]['field']
const roundedRaw = (value: number): number => Number(value.toFixed(6))
const capacityRawMetric = (
  samples: ScheduledSample[],
  field: CapacityDeltaField
): { sampleCount: number; value: number } => {
  const hosts = samples.flatMap((sample) => (sample.host ? [sample.host] : []))
  const trees = samples.flatMap((sample) =>
    sample.processTrees.flatMap((tree) => (tree.sample ? [tree.sample] : []))
  )
  const values =
    field === 'load1Average'
      ? hosts.map((host) => host.loadAverage[0]!)
      : field === 'minimumAvailableMemoryKiB'
        ? hosts.map((host) => host.availableMemoryKiB)
        : field === 'runtimeCpuAveragePercent'
          ? trees.map((tree) => tree.cpuPercent)
          : trees.map((tree) => tree.rssKiB)
  if (!values.length) throw new Error('capacity-delta-source-empty:' + field)
  const value =
    field === 'minimumAvailableMemoryKiB'
      ? Math.min(...values)
      : values.reduce((sum, item) => sum + item, 0) / values.length
  return { sampleCount: values.length, value: roundedRaw(value) }
}
const CAPACITY_DELTA_FIELDS: readonly CapacityDeltaField[] = [
  'load1Average',
  'minimumAvailableMemoryKiB',
  'runtimeCpuAveragePercent',
  'runtimeRssAverageKiB',
]
export const redactCapacityEvidence = <T>(value: T, runId: string): T =>
  JSON.parse(
    JSON.stringify(value, (key, entry) => {
      if (entry === null || entry === undefined) return entry
      if (key === 'port')
        return digestMvpPerformance({ runId, port: entry }).slice(0, 24)
      if (key === 'address') return 'loopback-redacted'
      if (key === 'cwd')
        return (
          'path-digest:' +
          digestMvpPerformance({ runId, path: entry }).slice(0, 24)
        )
      if (
        key === 'pid' ||
        key === 'rootPid' ||
        key === 'startTimeTicks' ||
        key === 'inode'
      )
        return (
          'identity-digest:' +
          digestMvpPerformance({ runId, identity: entry }).slice(0, 24)
        )
      if (key === 'memberPids')
        return (entry as unknown[]).map((identity) =>
          digestMvpPerformance({ runId, identity }).slice(0, 24)
        )
      return entry
    })
  ) as T

export const runIntegratedCapacitySection = async (
  runId: string,
  planHash: string,
  signal?: AbortSignal
): Promise<IntegratedCapacityRecord> => {
  const cohorts: IntegratedCapacityRecord['cohorts'] = []
  let runtimeResiduals = 0,
    listenerResiduals = 0,
    webResiduals = 0,
    databaseResiduals = 0,
    fixtureResiduals = 0
  for (const cohort of MVP_CAPACITY_COHORTS) {
    if (signal?.aborted) throw signal.reason
    await atomicWriteMvpJson(
      path.join(
        MVP_PERFORMANCE_EVIDENCE_ROOT,
        runId,
        'capacity-in-progress.json'
      ),
      { runId, planHash, cohort, attemptId: 'capacity-' + cohort }
    )
    const root = await mkdtemp(
      path.join(os.tmpdir(), 'ascend-bl015-capacity-' + cohort + '-')
    )
    const database = path.join(root, 'ascend.sqlite')
    const copies: string[] = []
    const digests: string[] = []
    let web: ChildProcessWithoutNullStreams | undefined
    let webIdentity: string | null = null
    const library = await createProjectLibrary(database)
    const failures: string[] = []
    const slots: CapacitySlot[] = []
    const samples: ScheduledSample[] = []
    const workloads: WorkloadResult[] = []
    const snapshots: Array<{
      pid: number
      processStartTime: string
      port: number
    }> = []
    const config = createProjectRuntimeConfig({
      executablePath: CODE_SERVER_PATH,
      expectedUser: os.userInfo().username,
    })
    const runtime = createProjectRuntimeManager({
      findProjectById: library.findById,
      config: createProjectRuntimeConfig({
        ...config,
        environment: { ...config.environment, EXTENSIONS_GALLERY: '{}' },
      }),
    })
    const controller = createApiServerController({
      port: 0,
      fastify: { logger: false },
      createProjectLibrary: async () => library,
      createProjectRuntimeManager: () => runtime,
      createWorkbenchProxyManager: (projectLibrary, projectRuntime) =>
        createWorkbenchProxyManager({
          projectLibrary,
          projectRuntime,
          frontDoorToken: resolveFrontDoorToken(),
        }),
      createProjectRegistration: async () => ({
        register: async () => ({
          disposition: 'existing',
          project: {
            id: 'unused',
            name: 'unused',
            canonicalPath: root,
            createdAt: 0,
          },
        }),
        close: () => undefined,
      }),
    })
    let preProbePassed = false,
      postProbePassed = false,
      cleanupPassed = false,
      residuals = 0
    const residualStart = {
      runtimeResiduals,
      listenerResiduals,
      webResiduals,
      databaseResiduals,
      fixtureResiduals,
    }
    try {
      for (let slot = 1; slot <= cohort; slot += 1) {
        const copy = path.join(root, 'fixture-' + slot)
        await cp(BL001_FIXTURE, copy, {
          recursive: true,
          preserveTimestamps: true,
        })
        copies.push(copy)
        digests.push(await manifest(copy))
        await library.create({
          id: 'bl015-capacity-' + cohort + '-' + slot,
          name: 'Capacity ' + cohort + '-' + slot,
          canonicalPath: copy,
          createdAt: slot,
        })
      }
      if (new Set(digests).size !== 1) failures.push('fixture-copy-drift')
      const app = await controller.start()
      const address = app.server.address()
      if (!address || typeof address === 'string')
        throw new Error('api-listener-unavailable')
      const apiPort = address.port
      const startedWeb = await startWeb(apiPort)
      web = startedWeb.child
      webIdentity = await readProcessStartTime(startedWeb.child.pid!)
      const origin = 'http://127.0.0.1:' + startedWeb.port
      preProbePassed = (await runResponsivenessProbe()).passed
      for (let slot = 1; slot <= cohort; slot += 1) {
        const id = 'bl015-capacity-' + cohort + '-' + slot
        const startedAt = new Date().toISOString()
        try {
          const response = await fetch(origin + stableProjectRoute(id), {
            headers: {
              accept: 'text/html',
              'x-ascend-workbench-document': '1',
            },
            signal: signal
              ? AbortSignal.any([
                  signal,
                  AbortSignal.timeout(CAPACITY_MEMBER_TIMEOUT_MS),
                ])
              : AbortSignal.timeout(CAPACITY_MEMBER_TIMEOUT_MS),
          })
          await response.arrayBuffer()
          const snapshot = runtime.inspect(id)
          if (
            !snapshot ||
            snapshot.state !== 'running' ||
            response.status !== 200 ||
            !snapshot.pid ||
            !snapshot.processStartTime ||
            !snapshot.port
          )
            throw new Error('integrated-readiness-failed')
          const tree = await inspectCapacityProcessTree(snapshot.pid)
          if (!tree.ok) throw new Error(tree.reason)
          const listeners = await readManagedListeners(
            tree.rows.map((row) => row.pid),
            { strict: true }
          )
          const listener = listeners.find((row) => row.port === snapshot.port)
          if (!listener) throw new Error('listener-attribution-failed')
          snapshots.push({
            pid: snapshot.pid,
            processStartTime: snapshot.processStartTime,
            port: snapshot.port,
          })
          slots.push({
            runId,
            cohort,
            slot,
            state: 'ready',
            reason: null,
            attemptStartedAt: startedAt,
            attemptEndedAt: new Date().toISOString(),
            readinessTimeoutMs: CAPACITY_MEMBER_TIMEOUT_MS,
            runtimeRunId: digestMvpPerformance({ runId, cohort, slot }),
            pid: snapshot.pid,
            startTimeTicks: snapshot.processStartTime,
            url: stableProjectRoute(id),
            readinessStatus: response.status,
            listener,
            readinessAchieved: true,
            processIdentities: tree.rows.map((row) => ({
              pid: row.pid,
              startTimeTicks: row.startTimeTicks,
            })),
            attributedListeners: listeners,
            unexpectedExit: false,
          })
        } catch (error) {
          const reason =
            error instanceof Error ? error.message : 'member-start-failed'
          failures.push('slot-' + slot + ':' + reason)
          slots.push(missingSlot(runId, cohort, slot, reason))
        }
      }
      if (signal?.aborted) throw signal.reason
      const stopReason = () => (signal?.aborted ? String(signal.reason) : null)
      const onProbeFailure = (reason: string) =>
        failures.push('probe:' + reason)
      try {
        const idle = await sampleCapacityWindow({
          runId,
          cohort,
          window: 'idle',
          slots,
          stopReason,
          onProbeFailure,
        })
        samples.push(...idle.samples)
      } catch (error) {
        failures.push(
          'idle-sampling:' +
            (error instanceof Error ? error.message : 'unknown')
        )
      }
      const controllers = new Map<number, WorkloadController>()
      for (const slot of slots.filter((row) => row.readinessAchieved))
        controllers.set(
          slot.slot,
          await startCapacityWorkload({
            runId,
            cohort,
            slot: slot.slot,
            cwd: copies[slot.slot - 1]!,
          })
        )
      try {
        const active = await sampleCapacityWindow({
          runId,
          cohort,
          window: 'active',
          slots,
          stopReason,
          onProbeFailure,
          workloadRunning: (slot, at) =>
            controllers.get(slot)?.isRunning(at) ?? false,
        })
        samples.push(...active.samples)
      } catch (error) {
        failures.push(
          'active-sampling:' +
            (error instanceof Error ? error.message : 'unknown')
        )
      }
      for (const [slot, workload] of controllers) {
        try {
          workloads.push(await workload.finish())
        } catch (error) {
          failures.push('workload-' + slot + ':' + String(error))
        }
      }
      postProbePassed = (await runResponsivenessProbe()).passed
    } catch (error) {
      failures.push(
        'cohort-controller:' +
          (error instanceof Error ? error.message : 'unknown')
      )
    } finally {
      try {
        await controller.stop()
      } catch (error) {
        failures.push('controller-cleanup:' + String(error))
      }
      await stopWeb(web)
      for (const snapshot of snapshots) {
        if (
          (await readProcessStartTime(snapshot.pid)) ===
          snapshot.processStartTime
        )
          runtimeResiduals += 1
        if (!(await loopbackListenerIsAbsent(snapshot.port)))
          listenerResiduals += 1
      }
      if (
        web?.pid &&
        webIdentity &&
        (await readProcessStartTime(web.pid)) === webIdentity
      )
        webResiduals += 1
      try {
        await library.close()
      } catch {
        /* best effort */
      }
      await rm(root, { recursive: true, force: true })
      databaseResiduals += await countDatabaseResiduals(database)
      try {
        await lstat(root)
        fixtureResiduals += 1
      } catch {
        /* absent */
      }
      residuals =
        runtimeResiduals -
        residualStart.runtimeResiduals +
        (listenerResiduals - residualStart.listenerResiduals) +
        (webResiduals - residualStart.webResiduals) +
        (databaseResiduals - residualStart.databaseResiduals) +
        (fixtureResiduals - residualStart.fixtureResiduals)
      cleanupPassed = residuals === 0
    }
    const ready = slots.filter((row) => row.state === 'ready').length
    const requiredSamplesComplete =
      samples.length === 10 &&
      samples.every(
        (sample) =>
          sample.host &&
          sample.processTrees.length === ready &&
          sample.processTrees.every((row) => row.sample)
      )
    const responsivenessPassed =
      preProbePassed &&
      postProbePassed &&
      samples.every((sample) => sample.host?.responsiveness.passed === true)
    const workloadsPassed = workloads.filter(
      (row) => row.status === 'passed'
    ).length
    const complete =
      ready === cohort &&
      workloadsPassed === cohort &&
      requiredSamplesComplete &&
      responsivenessPassed &&
      cleanupPassed &&
      failures.length === 0
    const cohortRecord: IntegratedCapacityRecord['cohorts'][number] = {
      cohort,
      attemptId: 'capacity-' + cohort,
      retry: 0,
      fixtureCopies: copies.length,
      fixtureManifestDigests: digests,
      slots,
      samples,
      workloads,
      preProbePassed,
      postProbePassed,
      ready,
      requiredSamplesComplete,
      responsivenessPassed,
      cleanupPassed,
      residuals,
      gate: cohort === 3 ? (complete ? 'met' : 'blocker') : 'finding',
      failures,
    }
    cohorts.push(cohortRecord)
    await atomicWriteMvpJson(
      path.join(
        MVP_PERFORMANCE_RESULT_ROOT,
        runId,
        'capacity-checkpoint-' + cohort + '-restricted.json'
      ),
      cohortRecord,
      0o600
    )
    await atomicWriteMvpJson(
      path.join(
        MVP_PERFORMANCE_EVIDENCE_ROOT,
        runId,
        'capacity-checkpoint-' + cohort + '.json'
      ),
      redactCapacityEvidence(cohortRecord, runId)
    )
    await atomicWriteMvpJson(
      path.join(
        MVP_PERFORMANCE_EVIDENCE_ROOT,
        runId,
        'capacity-in-progress.json'
      ),
      {
        runId,
        planHash,
        cohort,
        attemptId: cohortRecord.attemptId,
        status: 'complete',
      }
    )
    await atomicWriteMvpJson(
      path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId, 'capacity-partial.json'),
      redactCapacityEvidence(
        { schemaVersion: 1, runId, planHash, cohorts, interrupted: true },
        runId
      )
    )
  }
  const baselineRun = JSON.parse(await readFile(BL004_RUN_SOURCE, 'utf8')) as {
    runId: string
    measurementMethod: string
  }
  const baselineSamples = (
    JSON.parse(await readFile(BL004_SAMPLE_SOURCE, 'utf8')) as {
      runId: string
      samples: ScheduledSample[]
    }
  ).samples
  if (
    baselineRun.runId !== BL004_BASELINE_RUN_ID ||
    baselineSamples.some((sample) => sample.runId !== BL004_BASELINE_RUN_ID)
  )
    throw new Error('capacity-baseline-source-run-mismatch')
  const baselineSource = path.relative(REPOSITORY_ROOT, BL004_SAMPLE_SOURCE)
  const currentSource = path.relative(
    REPOSITORY_ROOT,
    path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId, 'capacity.json')
  )
  const comparison: IntegratedCapacityRecord['comparison'] = [
    ...CAPACITY_DELTA_FIELDS.map((field) => {
      const baseline = capacityRawMetric(
        baselineSamples.filter((sample) => sample.cohort === 1),
        field
      )
      return {
        cohort: 'historical-1' as const,
        field,
        classification: 'not-comparable' as const,
        reason: 'BL-015 has no fresh one-member cohort raw source',
        baseline: {
          runId: BL004_BASELINE_RUN_ID,
          method: baselineRun.measurementMethod,
          sourceFile: baselineSource,
          ...baseline,
        },
        current: null,
        delta: null,
      }
    }),
    ...MVP_CAPACITY_COHORTS.flatMap((cohort) =>
      CAPACITY_DELTA_FIELDS.map((field) => {
        const baseline = capacityRawMetric(
          baselineSamples.filter((sample) => sample.cohort === cohort),
          field
        )
        const current = capacityRawMetric(
          cohorts.find((row) => row.cohort === cohort)!.samples,
          field
        )
        const runtimeField = field.startsWith('runtime')
        return {
          cohort,
          field,
          classification: runtimeField
            ? ('comparable' as const)
            : ('directional-only' as const),
          reason: runtimeField
            ? 'identical BL-004 proc sampling field formula schedule units and runtime-tree scope'
            : 'same raw host field and schedule but BL-015 includes integrated API and web service load',
          baseline: {
            runId: BL004_BASELINE_RUN_ID,
            method: baselineRun.measurementMethod,
            sourceFile: baselineSource,
            ...baseline,
          },
          current: {
            runId,
            method: runtimeField
              ? baselineRun.measurementMethod
              : baselineRun.measurementMethod +
                '; integrated API and web services included in host totals',
            sourceFile: currentSource,
            ...current,
          },
          delta: roundedRaw(current.value - baseline.value),
        }
      })
    ),
  ]
  const finalResidualTotal =
    runtimeResiduals +
    listenerResiduals +
    webResiduals +
    databaseResiduals +
    fixtureResiduals
  const finalResidualAudit = {
    complete: finalResidualTotal === 0,
    runtimeResiduals,
    listenerResiduals,
    webResiduals,
    databaseResiduals,
    fixtureResiduals,
    total: finalResidualTotal,
  }
  const result: IntegratedCapacityRecord = {
    schemaVersion: 1,
    runId,
    planHash,
    method: {
      integratedProduct: true,
      probe: CAPACITY_PROBE,
      sampleOffsetsMs: CAPACITY_SAMPLE_OFFSETS_MS,
      workloadDurationMs: CAPACITY_WORKLOAD_DURATION_MS,
      workloadTimeoutMs: CAPACITY_WORKLOAD_TIMEOUT_MS,
      workloadOutputLimitBytes: CAPACITY_WORKLOAD_OUTPUT_LIMIT_BYTES,
      runtimeMethodComparableToBl004: true,
      baselineRunId: BL004_BASELINE_RUN_ID,
      baselineMeasurementMethod: baselineRun.measurementMethod,
    },
    cohorts,
    comparison,
    finalResidualAudit,
  }
  const restrictedRoot = path.join(MVP_PERFORMANCE_RESULT_ROOT, runId)
  await mkdir(restrictedRoot, { recursive: true })
  const restrictedPath = path.join(restrictedRoot, 'capacity-restricted.json')
  await writeFile(restrictedPath, JSON.stringify(result, null, 2) + '\n', {
    mode: 0o600,
  })
  await chmod(restrictedPath, 0o600)
  const safe = redactCapacityEvidence(result, runId)
  await atomicWriteMvpJson(
    path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId, 'capacity.json'),
    safe
  )
  return safe
}
