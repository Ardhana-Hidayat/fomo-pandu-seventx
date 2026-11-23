import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    pool: 'forks',
    forks: {
      singleFork: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
      'server-only': path.resolve(process.cwd(), './node_modules/server-only/empty.js'),
    },
  },
});
