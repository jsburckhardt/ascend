import { lstat, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import {
  MVP_PERFORMANCE_EVIDENCE_ROOT,
  MVP_PERFORMANCE_GUARD,
  MVP_PERFORMANCE_RESULT_ROOT,
} from '../mvp-performance-contract.js'
import {
  loopbackListenerIsAbsent,
  readProcessStartTime,
} from '../project-runtime-process.js'
const absent = async (target: string) =>
  lstat(target).then(
    () => false,
    () => true
  )
const latest = async () => {
  const entries = (
    await readdir(MVP_PERFORMANCE_EVIDENCE_ROOT, { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()
  for (const runId of entries)
    try {
      await readFile(
        path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId, 'summary.json')
      )
      return runId
    } catch {
      /* incomplete */
    }
  throw new Error('mvp-performance-complete-evidence-unavailable')
}
try {
  const runId = process.argv[2] ?? (await latest())
  const publicRoot = path.join(MVP_PERFORMANCE_EVIDENCE_ROOT, runId),
    restrictedRoot = path.join(MVP_PERFORMANCE_RESULT_ROOT, runId)
  const residual = JSON.parse(
    await readFile(path.join(publicRoot, 'residual-audit.json'), 'utf8')
  ) as { complete: boolean }
  const browser = JSON.parse(
    await readFile(
      path.join(restrictedRoot, 'restricted-authority.json'),
      'utf8'
    )
  ) as {
    api: { port: number }
    web: { pid: number; processStartTime: string; port: number }
    attempts: Array<{ pid: number; processStartTime: string; port: number }>
  }
  const capacity = JSON.parse(
    await readFile(
      path.join(restrictedRoot, 'capacity-restricted.json'),
      'utf8'
    )
  ) as {
    cohorts: Array<{
      slots: Array<{
        pid: number | null
        startTimeTicks: string | null
        listener: { port: number } | null
      }>
    }>
  }
  const continuityDir = path.join(restrictedRoot, 'continuity')
  const continuityFiles = (await readdir(continuityDir))
    .filter((name) => name.endsWith('-restricted.json'))
    .sort()
  const continuity = await Promise.all(
    continuityFiles.map(
      async (name) =>
        JSON.parse(await readFile(path.join(continuityDir, name), 'utf8')) as {
          identityObservations?: Array<{
            runtime?: { pid?: number; processStartTime?: string; port?: number }
          }>
        }
    )
  )
  const continuityIdentities = continuity.flatMap((value) =>
    (value.identityObservations ?? []).flatMap((row) =>
      row.runtime?.pid && row.runtime.processStartTime && row.runtime.port
        ? [
            {
              pid: row.runtime.pid,
              start: row.runtime.processStartTime,
              port: row.runtime.port,
            },
          ]
        : []
    )
  )
  const identities = [
    ...browser.attempts.map((row) => ({
      pid: row.pid,
      start: row.processStartTime,
      port: row.port,
    })),
    ...capacity.cohorts.flatMap((cohort) =>
      cohort.slots.flatMap((slot) =>
        slot.pid && slot.startTimeTicks && slot.listener
          ? [
              {
                pid: slot.pid,
                start: slot.startTimeTicks,
                port: slot.listener.port,
              },
            ]
          : []
      )
    ),
    ...continuityIdentities,
  ]
  const probes = await Promise.all(
    identities.map(async (row) => ({
      identityDigest: String(row.pid) + ':' + row.start,
      processAbsent: (await readProcessStartTime(row.pid)) !== row.start,
      listenerAbsent: await loopbackListenerIsAbsent(row.port),
    }))
  )
  const modes = await Promise.all(
    [
      path.join(restrictedRoot, 'restricted-authority.json'),
      path.join(restrictedRoot, 'capacity-restricted.json'),
      ...continuityFiles.map((name) => path.join(continuityDir, name)),
    ].map(async (target) => (await lstat(target)).mode & 0o777)
  )
  const host = {
    apiListenerAbsent: await loopbackListenerIsAbsent(browser.api.port),
    webProcessAbsent:
      (await readProcessStartTime(browser.web.pid)) !==
      browser.web.processStartTime,
    webListenerAbsent: await loopbackListenerIsAbsent(browser.web.port),
    guardAbsent: await absent(MVP_PERFORMANCE_GUARD),
  }
  const status =
    residual.complete &&
    probes.every((row) => row.processAbsent && row.listenerAbsent) &&
    modes.every((mode) => mode === 0o600) &&
    Object.values(host).every(Boolean)
      ? 'ok'
      : 'failed'
  process.stdout.write(
    JSON.stringify({
      command: 'proof-mvp-performance-residual-audit',
      status,
      runId,
      identities: probes.length,
      residual,
      modes: modes.map((mode) => mode.toString(8)),
      host,
    }) + '\n'
  )
  if (status !== 'ok') process.exitCode = 1
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      command: 'proof-mvp-performance-residual-audit',
      status: 'failed',
      error: error instanceof Error ? error.message : 'unknown',
    }) + '\n'
  )
  process.exitCode = 1
}
