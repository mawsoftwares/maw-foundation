import { describe, it, expect } from 'vitest';
import { resolveModuleSelection } from '@mawsoftwares/server-express';
import { registry } from '../modules/index';
import { builtinModules } from '../modules/pluggable';

describe('builtinModules', () => {
  it('exposes every registered module with a semver version', () => {
    const modules = builtinModules();
    expect(modules.map((m) => m.definition.key).sort()).toEqual(registry.getAll().map((m) => m.key).sort());
    for (const m of modules) expect(m.definition.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('accepts every built-in key in DISABLED_MODULES and rejects typos', () => {
    const modules = builtinModules();
    const first = modules[0]?.definition.key ?? '';
    expect(resolveModuleSelection(modules, [first]).enabled?.has(first)).toBe(false);
    expect(() => resolveModuleSelection(modules, ['no-such-module'])).toThrow(/unknown module/);
  });
});
