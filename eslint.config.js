// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * The dependency law — enforced, not merely documented.
 *
 *   apps → ui-* + api-client + server-adapters → auth-core + rbac-core → platform → sdk
 *
 * `sdk` imports nothing of ours; each tier may only import the tiers below it.
 * A `ui-web` that imports `server-express`, or an `sdk` that imports `platform`,
 * fails `npm run lint` — that is what keeps the base reusable instead of rotting.
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
          group: [`@maw/${s}`, `@maw/${s}/*`],
          message: why,
        })),
      },
    ],
  };
}

const ABOVE = {
  sdk: ['platform', 'database', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'theme', 'ui-web', 'ui-native'],
  platform: ['rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native'],
  database: ['platform', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native'],
  masters: ['platform', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native'],
  'rbac-core': ['auth-core', 'server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native', 'platform'],
  'auth-core': ['server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native'],
  'server-express': ['server-hono', 'ui-web', 'ui-native'],
  'server-hono': ['server-express', 'ui-web', 'ui-native'],
  'api-client': ['server-express', 'server-hono', 'ui-web', 'ui-native'],
  theme: ['platform', 'rbac-core', 'auth-core', 'server-express', 'server-hono', 'api-client', 'ui-web', 'ui-native'],
  'ui-web': ['server-express', 'server-hono', 'ui-native'],
  'ui-native': ['server-express', 'server-hono', 'ui-web'],
};

const layerConfigs = Object.entries(ABOVE).map(([pkg, forbidden]) => ({
  files: [`packages/${pkg}/src/**/*.{ts,tsx}`],
  ignores: [`packages/${pkg}/src/**/*.test.{ts,tsx}`],
  rules: forbid(
    forbidden,
    `Dependency law: @maw/${pkg} may not import a tier above it. See eslint.config.js.`,
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
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  ...layerConfigs,
  {
    // Apps and tests are exempt from the layering rule — apps compose everything;
    // tests may import across tiers to exercise them.
    files: ['apps/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
