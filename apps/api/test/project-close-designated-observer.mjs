/**
 * BL-020 independent post-teardown observer.
 *
 * A separate process from the one that executed a designated episode. It is
 * given identities, ports, owner tokens, and paths on standard input and
 * re-reads the operating system for each of them, so the artifact's absence
 * claims rest on an observation the executing process did not make.
 */
import { createConnection } from 'node:net'
import { stat } from 'node:fs/promises'
import {
  defaultRuntimeAttributionPrimitives,
  loopbackListenerIsAbsent,
  readProcessStartTime,
} from '../dist/project-runtime-process.js'

const readRequest = async () => {
  let text = ''
  process.stdin.setEncoding('utf8')
  for await (const chunk of process.stdin) text += chunk
  return JSON.parse(text)
}

const connectable = (port) =>
  new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    const settle = (value) => {
      socket.destroy()
      resolve(value)
    }
    socket.once('connect', () => settle(true))
    socket.once('error', () => settle(false))
    socket.setTimeout(1000, () => settle(false))
  })

const exists = async (target) => {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

const request = await readRequest()

const liveOf = async (targets) => {
  let live = 0
  for (const target of targets)
    if ((await readProcessStartTime(target.pid)) === target.processStartTime)
      live += 1
  return live
}

const attributableDescendants = async () => {
  const controller = new AbortController()
  const scan =
    await defaultRuntimeAttributionPrimitives.listRuntimeCandidatePids(
      controller.signal
    )
  let attributable = 0
  for (const pid of scan.pids) {
    const argv =
      await defaultRuntimeAttributionPrimitives.readProcessCommandLine(
        pid,
        controller.signal
      )
    if (argv === null) continue
    const rendered = argv.join(' ')
    const matched =
      request.ownerTokens.some((token) => rendered.includes(token)) ||
      request.projectPaths.some((projectPath) => rendered.includes(projectPath))
    if (matched) attributable += 1
  }
  return attributable
}

let boundListeners = 0
for (const port of request.listenerPorts)
  if (!(await loopbackListenerIsAbsent(port))) boundListeners += 1

let reachable = 0
for (const port of request.listenerPorts)
  if (await connectable(port)) reachable += 1

let survivingFixtures = 0
for (const target of request.disposablePaths)
  if (await exists(target)) survivingFixtures += 1

const probe = (residual) => ({ probeCompleted: true, residual })

process.stdout.write(
  JSON.stringify({
    observedBy: 'apps/api/test/project-close-designated-observer.mjs',
    classes: {
      apiProcesses: probe(await liveOf(request.apiProcesses)),
      workbenchProcesses: probe(await liveOf(request.workbenchProcesses)),
      attributableDescendants: probe(await attributableDescendants()),
      listeners: probe(boundListeners),
      activeRequests: probe(reachable),
      disposableFixtures: probe(survivingFixtures),
    },
  })
)
