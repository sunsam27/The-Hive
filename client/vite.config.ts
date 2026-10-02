/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    css: true,
    // worker_threads intermittently fails to spawn on this Windows/OneDrive
    // checkout, which silently skips a whole test file. Child-process forks
    // start reliably here, at the cost of a little more overhead.
    pool: 'forks',
    // Even the threads pool races when several workers spin up at once, which
    // surfaces as unrelated tests failing (e.g. "renders children"). The suite
    // is small, so a single worker costs little and is reliable.
    // Note: poolOptions was removed in Vitest 4; worker counts are top level.
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
    // The default 5s budget is not enough on a slow/OneDrive-backed machine:
    // a single file was taking 7-17s, so unrelated tests failed on timeout
    // rather than on anything to do with the code under test.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
