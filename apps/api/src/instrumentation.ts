import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { NodeSDK } from '@opentelemetry/sdk-node'

export const telemetry = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
})

telemetry.start()

export async function stopTelemetry() {
  await telemetry.shutdown()
}
