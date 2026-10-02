import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.ts'],
    // These suites mock knex and supertest, so they are sensitive to CPU
    // contention: running every file at once on this Windows/OneDrive machine
    // pushed some files past the default 5s budget and produced failures that
    // had nothing to do with the code. One file at a time is reliable.
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
