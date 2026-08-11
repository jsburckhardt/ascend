import './instrumentation.js'
import { createApiServerController, startApiProcess } from './api-server.js'
import { stopTelemetry } from './instrumentation.js'

const controller = createApiServerController({ stopTelemetry })

function requestShutdown(): void {
  void controller.stop()
}

process.on('SIGINT', requestShutdown)
process.on('SIGTERM', requestShutdown)

void startApiProcess(controller).then((exitCode) => {
  if (exitCode !== 0) process.exitCode = exitCode
})
