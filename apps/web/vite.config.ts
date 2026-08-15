import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const apiTarget = process.env.ASCEND_E2E_API_TARGET ?? 'http://127.0.0.1:3000'
const configuredFrontDoorToken = process.env.ASCEND_FRONT_DOOR_TOKEN
if (
  configuredFrontDoorToken !== undefined &&
  (configuredFrontDoorToken.length < 16 ||
    configuredFrontDoorToken.length > 256)
)
  throw new Error(
    'ASCEND_FRONT_DOOR_TOKEN must contain between 16 and 256 characters when configured'
  )
const frontDoorToken =
  configuredFrontDoorToken ?? 'ascend-development-front-door-v1'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    hmr: process.env.ASCEND_E2E_DISABLE_HMR === '1' ? false : undefined,
    proxy: {
      '/api': { target: apiTarget },
      '/projects': {
        target: apiTarget,
        ws: true,
        configure(proxy) {
          const mark = (
            proxyRequest: { setHeader(name: string, value: string): void },
            request: { headers: { host?: string } }
          ): void => {
            proxyRequest.setHeader(
              'x-ascend-front-door-authority',
              request.headers.host ?? '127.0.0.1'
            )
            proxyRequest.setHeader('x-ascend-front-door-token', frontDoorToken)
          }
          proxy.on('proxyReq', mark)
          proxy.on('proxyReqWs', mark)
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    maxWorkers: 4,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
