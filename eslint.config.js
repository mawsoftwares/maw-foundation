// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * The dependency law — enforced, not merely documented.
 *
 *   apps → adapters + ui-* + api-client → auth-core + rbac-core → platform → sdk/core
 *
 * `sdk`/`core` imports nothing of ours; each tier may only import the tiers below it.
 * A `ui-web` that imports `server-express`, or an `sdk` that imports `platform`,
 * fails `pnpm lint` — that is what keeps the base reusable instead of rotting.
 *
 * Encoded with `no-restricted-imports` patterns per package glob (matches the
 * Restaurant OS eslint.config.js approach that seeded this repo).
 */

/** Build a restricted-imports rule that forbids the given @maw scopes. */
function forbid(scopes, why) {
  return {
    'no-restricted-imports': [
      'error',
      {
        patterns: scopes.map((s) => ({
          group: [`@mawsoftwares/${s}`, `@mawsoftwares/${s}/*`],
          message: why,
        })),
      },
    ],
  };
}

const ABOVE = {
  sdk: ['platform', 'database', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'theme', 'ui-web', 'ui-native', 'core', 'config', 'tenancy', 'modules', 'feature-flags', 'express', 'hono', 'postgres'],
  core: ['platform', 'database', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'theme', 'ui-web', 'ui-native', 'config', 'tenancy', 'modules', 'feature-flags', 'express', 'hono', 'postgres'],
  config: ['platform', 'database', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'theme', 'ui-web', 'ui-native', 'tenancy', 'modules', 'feature-flags', 'express', 'hono', 'postgres'],
  platform: ['rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native', 'express', 'hono', 'postgres'],
  database: ['platform', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native', 'express', 'hono'],
  masters: ['platform', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native', 'express', 'hono'],
  tenancy: ['platform', 'database', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'theme', 'ui-web', 'ui-native', 'modules', 'feature-flags', 'express', 'hono', 'postgres'],
  modules: ['platform', 'database', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'theme', 'ui-web', 'ui-native', 'tenancy', 'feature-flags', 'express', 'hono', 'postgres'],
  'feature-flags': ['platform', 'database', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'theme', 'ui-web', 'ui-native', 'tenancy', 'modules', 'express', 'hono', 'postgres'],
  'rbac-core': ['auth-core', 'server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native', 'platform', 'express', 'hono', 'postgres'],
  'auth-core': ['server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native', 'express', 'hono', 'postgres'],
  'server-express': ['server-hono', 'ui-web', 'ui-native', 'hono'],
  'server-hono': ['server-express', 'ui-web', 'ui-native', 'express'],
  'api-client': ['server-express', 'server-hono', 'ui-web', 'ui-native', 'express', 'hono', 'postgres'],
  theme: ['platform', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native', 'express', 'hono', 'postgres'],
  'ui-web': ['server-express', 'server-hono', 'ui-native', 'express', 'hono', 'postgres'],
  'ui-auth': ['server-express', 'server-hono', 'ui-native', 'express', 'hono', 'postgres'],
  'ui-native': ['server-express', 'server-hono', 'ui-web', 'express', 'hono', 'postgres'],
};

const layerConfigs = Object.entries(ABOVE).map(([pkg, forbidden]) => ({
  files: [`packages/${pkg}/src/**/*.{ts,tsx}`],
  ignores: [`packages/${pkg}/src/**/*.test.{ts,tsx}`],
  rules: forbid(
    forbidden,
    `Dependency law: @mawsoftwares/${pkg} may not import a tier above it. See eslint.config.js.`,
  ),
}));

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/*.config.{js,ts,mjs,cjs}',
      '**/templates/**',
      '**/notifications.tsx',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
    },
  },
  ...layerConfigs,
  {
    // Apps, tests, and adapters are exempt from the layering rule — apps compose everything;
    // tests may import across tiers to exercise them; adapters wrap packages.
    files: ['apps/**/*.{ts,tsx}', 'adapters/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
