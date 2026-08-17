import '../../apps/api/src/instrumentation.js'
import { createApiServerController } from '../../apps/api/src/api-server.js'
import { stopTelemetry } from '../../apps/api/src/instrumentation.js'
import {
  createApplicationProjectLibrary,
  type ProjectLibrary,
} from '../../apps/api/src/project-library.js'

const faultOnce = process.argv.includes('--fault-once')
const delayList = process.argv.includes('--delay-list')
const closeFaultOnce = process.argv.includes('--close-fault-once')
let faultPending = faultOnce
let closeFaultPending = closeFaultOnce

async function createE2eLibrary(): Promise<ProjectLibrary> {
  const library = await createApplicationProjectLibrary()
  return {
    create: (input) => library.create(input),
    findById: (id) => library.findById(id),
    async list() {
      if (delayList) {
        await new Promise((resolve) => setTimeout(resolve, 150))
      }
      if (faultPending) {
        faultPending = false
        throw new Error('Controlled E2E project-list failure')
      }
      return library.list()
    },
    async closeProject(id) {
      if (closeFaultPending) {
        closeFaultPending = false
        throw new Error('Controlled E2E project-close failure')
      }
      return library.closeProject(id)
    },
    close: () => library.close(),
  }
}

const controller = createApiServerController({
  createProjectLibrary: createE2eLibrary,
  stopTelemetry,
})

function requestShutdown(): void {
  void controller.stop()
}

process.on('SIGINT', requestShutdown)
process.on('SIGTERM', requestShutdown)

void controller.start().catch(() => {
  process.exitCode = 1
})
