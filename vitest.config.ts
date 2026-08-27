import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Resolve @mawsoftwares/<pkg> and @mawsoftwares/<pkg>/<subpath> to package source — no build step. */
const pkgs = [
  // Core
  'sdk',
  'core',
  'config',
  'platform',
  'rbac-core',
  'auth-core',
  'users',
  'tenancy',
  'modules',
  'feature-flags',
  // Infrastructure
  'api',
  'database',
  'masters',
  // Adapters (in packages/)
  'server-express',
  'server-hono',
  // Client
  'api-client',
  // UI
  'theme',
  'ui-web',
  'ui-auth',
  'ui-native',
  // Placeholder packages
  'notifications',
  'audit',
  'files',
  'validation',
  'i18n',
  'workflow',
  'billing',
  'queue',
  'offline',
  'communication',
  'import-export',
  'reporting',
  'testing',
  'observability',
];

const alias = pkgs.flatMap((p) => [
  {
    find: new RegExp(`^@mawsoftwares/${p}$`),
    replacement: fileURLToPath(new URL(`./packages/${p}/src/index.ts`, import.meta.url)),
  },
  {
    find: new RegExp(`^@mawsoftwares/${p}/(.*)$`),
    replacement: fileURLToPath(new URL(`./packages/${p}/src/$1`, import.meta.url)),
  },
]);

// Add adapter aliases
const adapterPkgs = [
  { name: 'express', dir: 'adapters/express' },
  { name: 'hono', dir: 'adapters/hono' },
  { name: 'postgres', dir: 'adapters/postgres' },
];

for (const a of adapterPkgs) {
  alias.push(
    {
      find: new RegExp(`^@mawsoftwares/${a.name}$`),
      replacement: fileURLToPath(new URL(`./${a.dir}/src/index.ts`, import.meta.url)),
    },
    {
      find: new RegExp(`^@mawsoftwares/${a.name}/(.*)$`),
      replacement: fileURLToPath(new URL(`./${a.dir}/src/$1`, import.meta.url)),
    },
  );
}

export default defineConfig({
  resolve: { alias },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/*.test.{ts,tsx}',
      'adapters/**/*.test.{ts,tsx}',
      'apps/**/*.test.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['packages/*/src/**/*.ts', 'adapters/*/src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/index.ts',
        '**/__tests__/**',
        '**/testing/**',
      ],
    },
  },
});
