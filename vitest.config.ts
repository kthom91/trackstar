import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.ts', 'apps/**/*.{test,spec}.ts'],
  },
  resolve: {
    alias: {
      '@trackstar/data': path.resolve(__dirname, './packages/data/src/index.ts'),
      '@trackstar/pds': path.resolve(__dirname, './packages/pds/src/index.ts'),
      '@trackstar/integrations': path.resolve(__dirname, './packages/integrations/src/index.ts'),
      '@trackstar/theme': path.resolve(__dirname, './packages/theme/src/index.ts'),
    },
  },
});
