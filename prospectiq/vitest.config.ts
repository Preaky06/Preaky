import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: process.env.LIVE ? ['tests/live/**/*.test.ts'] : ['tests/unit/**/*.test.ts'],
    env: { PGLITE_DIR: ':memory:' },
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
