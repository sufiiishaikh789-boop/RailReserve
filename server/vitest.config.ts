// Vitest configuration — Railway Reservation System v3.0, Team 11
//
// VITEST + node:sqlite FIX:
// Vite 5 cannot resolve 'node:sqlite' (or 'sqlite' after prefix stripping)
// because it expects a file path, not a Node.js built-in identifier.
//
// Solution: alias 'sqlite' (the stripped form Vite resolves to) to a CJS proxy
// file that re-exports the real node:sqlite module. The proxy is a plain .cjs
// file — Vite doesn't try to transform it; Node loads it directly.
import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // When Vite strips 'node:sqlite' → 'sqlite', redirect to our CJS proxy
      'sqlite': path.resolve(__dirname, 'tests/node-sqlite-proxy.cjs'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Run sequentially — SQLite write locks cannot be shared across workers
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
