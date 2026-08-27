export interface CoverageThresholds {
  lines?: number;
  functions?: number;
  branches?: number;
  statements?: number;
}

export interface TestPreset {
  globals?: boolean;
  environment?: string;
  include?: string[];
  exclude?: string[];
  testTimeout?: number;
}

export function basePreset(): TestPreset {
  return {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/*.test.{ts,tsx}',
      'adapters/**/*.test.{ts,tsx}',
      'apps/**/*.test.{ts,tsx}',
    ],
  };
}

export function unitPreset(): TestPreset {
  return {
    ...basePreset(),
    exclude: ['**/*.integration.test.{ts,tsx}'],
    testTimeout: 5_000,
  };
}

export function integrationPreset(): TestPreset {
  return {
    ...basePreset(),
    include: [
      'packages/**/*.integration.test.{ts,tsx}',
      'adapters/**/*.integration.test.{ts,tsx}',
      'apps/**/*.integration.test.{ts,tsx}',
    ],
    testTimeout: 30_000,
  };
}

export function coveragePreset(thresholds?: CoverageThresholds) {
  const t = {
    lines: thresholds?.lines ?? 80,
    functions: thresholds?.functions ?? 80,
    branches: thresholds?.branches ?? 75,
    statements: thresholds?.statements ?? 80,
  };
  return {
    provider: 'v8' as const,
    reporter: ['text', 'html', 'json-summary'] as string[],
    include: ['packages/*/src/**/*.ts', 'adapters/*/src/**/*.ts'],
    exclude: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/index.ts',
      '**/__tests__/**',
      '**/testing/**',
    ],
    thresholds: t,
  };
}
