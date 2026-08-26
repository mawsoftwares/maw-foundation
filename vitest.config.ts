import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Resolve @maw/<pkg> and @maw/<pkg>/<subpath> to package source — no build step. */
const pkgs = [
  'sdk',
  'platform',
  'rbac-core',
  'auth-core',
  'api',
  'database',
  'server-express',
  'server-hono',
  'api-client',
  'theme',
  'ui-web',
  'ui-native',
];

const alias = pkgs.flatMap((p) => [
  {
    find: new RegExp(`^@maw/${p}$`),
    replacement: fileURLToPath(new URL(`./packages/${p}/src/index.ts`, import.meta.url)),
  },
  {
    find: new RegExp(`^@maw/${p}/(.*)$`),
    replacement: fileURLToPath(new URL(`./packages/${p}/src/$1`, import.meta.url)),
  },
]);

export default defineConfig({
  resolve: { alias },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.{ts,tsx}', 'apps/**/*.test.{ts,tsx}'],
  },
});
