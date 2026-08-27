import { describe, it, expect } from 'vitest';
import { basePreset, unitPreset, integrationPreset, coveragePreset } from '../presets';
import { mergeTestConfig } from '../merge';

describe('presets', () => {
  it('basePreset returns expected shape', () => {
    const base = basePreset();
    expect(base.globals).toBe(true);
    expect(base.environment).toBe('node');
    expect(base.include).toBeDefined();
    expect(base.include!.length).toBeGreaterThan(0);
  });

  it('unitPreset excludes integration tests', () => {
    const unit = unitPreset();
    expect(unit.exclude).toContain('**/*.integration.test.{ts,tsx}');
    expect(unit.testTimeout).toBe(5_000);
  });

  it('integrationPreset includes only integration tests', () => {
    const int = integrationPreset();
    expect(int.include!.every((p) => p.includes('integration'))).toBe(true);
    expect(int.testTimeout).toBe(30_000);
  });

  it('coveragePreset returns v8 provider with defaults', () => {
    const cov = coveragePreset();
    expect(cov.provider).toBe('v8');
    expect(cov.thresholds.lines).toBe(80);
    expect(cov.thresholds.branches).toBe(75);
  });

  it('coveragePreset accepts custom thresholds', () => {
    const cov = coveragePreset({ lines: 90, functions: 85 });
    expect(cov.thresholds.lines).toBe(90);
    expect(cov.thresholds.functions).toBe(85);
    expect(cov.thresholds.branches).toBe(75);
  });
});

describe('mergeTestConfig', () => {
  it('merges include arrays', () => {
    const merged = mergeTestConfig(
      { include: ['a/**'] },
      { include: ['b/**'] },
    );
    expect(merged.include).toEqual(['a/**', 'b/**']);
  });

  it('later values win for scalars', () => {
    const merged = mergeTestConfig(
      { testTimeout: 1000 },
      { testTimeout: 5000 },
    );
    expect(merged.testTimeout).toBe(5000);
  });
});
