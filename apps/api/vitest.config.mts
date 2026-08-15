import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    maxWorkers: 4,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['test/runtime-stop-fixtures.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
