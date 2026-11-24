import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const apiSrc = resolve(repoRoot, 'apps/api/src');

const apiAlias = [{ find: /^@\//, replacement: `${apiSrc}/` }];

export default defineConfig({
  root: repoRoot,
  test: {
    clearMocks: true,
    restoreMocks: true,
    fileParallelism: false,
    projects: [
      {
        extends: true,
        resolve: {
          alias: apiAlias
        },
        test: {
          name: 'api-unit',
          environment: 'node',
          include: ['apps/api/tests/unit/**/*.test.ts']
        }
      },
      {
        extends: true,
        resolve: {
          alias: apiAlias
        },
        test: {
          name: 'api-integration',
          environment: 'node',
          include: ['apps/api/tests/integration/**/*.test.ts'],
          env: {
            APP_STAGE: 'test',
            NODE_ENV: 'test'
          },
          testTimeout: 20_000,
          hookTimeout: 20_000,
          fileParallelism: false,
          maxWorkers: 1
        }
      }
    ]
  }
});
