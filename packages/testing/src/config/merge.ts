import type { TestPreset } from './presets';

export function mergeTestConfig(...configs: Partial<TestPreset>[]): TestPreset {
  const result: TestPreset = {};
  for (const config of configs) {
    if (config.globals !== undefined) result.globals = config.globals;
    if (config.environment !== undefined) result.environment = config.environment;
    if (config.include) result.include = [...(result.include ?? []), ...config.include];
    if (config.exclude) result.exclude = [...(result.exclude ?? []), ...config.exclude];
    if (config.testTimeout !== undefined) result.testTimeout = config.testTimeout;
  }
  return result;
}
