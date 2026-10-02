import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const pkg = (name: string) => resolve(import.meta.dirname, `packages/${name}/src/index.ts`);

export default defineConfig({
  resolve: {
    alias: {
      '@progresscut/domain': pkg('domain'),
      '@progresscut/contracts': pkg('contracts'),
      '@progresscut/engine': pkg('engine'),
      '@progresscut/capture': pkg('capture'),
      '@progresscut/render': pkg('render'),
      '@progresscut/storage': pkg('storage'),
      '@progresscut/application': pkg('application'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['packages/*/tests/**/*.test.ts', 'apps/*/tests/**/*.test.ts'],
    benchmark: {
      include: ['benchmarks/**/*.bench.ts'],
    },
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**'],
      exclude: ['packages/*/src/index.ts'],
      thresholds: { branches: 80 },
    },
  },
});
