// Vitest configuration for backend tests
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Use a dedicated test database to avoid corrupting dev data
    setupFiles: ['./tests/setup.ts'],
    // Run tests sequentially to avoid SQLite write lock conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
