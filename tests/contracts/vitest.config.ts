import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/contracts/**/*.test.ts'],
    name: 'contracts',
    root: path.resolve(import.meta.dirname, '../..'),
  },
})
