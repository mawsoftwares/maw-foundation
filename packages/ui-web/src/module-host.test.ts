import { describe, it, expect } from 'vitest';
import {
  assertConsistent, assertStateConsistent, disabledModuleKeys, hiddenNavKeys, moduleOfPage, modulePermissions,
  type FrontendModule,
} from './module-host';

const mod = (key: string, pages: string[], permission?: string): FrontendModule => ({
  key,
  version: '1.0.0',
  nav: pages.map((p, i) => ({ key: p, label: p, icon: 'circle', path: `/${p}`, sortOrder: i })),
  pagePermissions: permission === undefined ? {} : Object.fromEntries(pages.map((p) => [p, permission])),
  pages: Object.fromEntries(pages.map((p) => [p, () => null])),
});

describe('frontend module registry', () => {
  it('treats only modules reported as disabled as disabled (unknown or missing status stays active)', () => {
    const disabled = disabledModuleKeys([{ key: 'a', status: 'disabled' }, { key: 'b', status: 'enabled' }, { key: 'c' }, { key: 'd', status: 5 }]);
    expect([...disabled]).toEqual(['a']);
  });

  it('hides exactly the nav keys of disabled modules', () => {
    const modules = [mod('a', ['a1', 'a2']), mod('b', ['b1'])];
    expect([...hiddenNavKeys(modules, new Set(['a']))]).toEqual(['a1', 'a2']);
    const pageOnly: FrontendModule = { ...mod('c', ['c1']), nav: [] };
    expect([...hiddenNavKeys([pageOnly], new Set(['c']))]).toEqual(['c1']);
    expect([...hiddenNavKeys(modules, new Set())]).toEqual([]);
  });

  it('finds the owner of a page and merges permissions', () => {
    const modules = [mod('a', ['a1'], 'Read_A'), mod('b', ['b1'], 'Read_B')];
    expect(moduleOfPage(modules, 'b1')?.key).toBe('b');
    expect(moduleOfPage(modules, 'toString')).toBeUndefined();
    expect(modulePermissions(modules)).toEqual({ a1: 'Read_A', b1: 'Read_B' });
  });

  it('rejects duplicate modules and pages claimed twice', () => {
    expect(() => assertConsistent([mod('a', ['x']), mod('a', ['y'])])).toThrow(/Duplicate frontend module/);
    expect(() => assertConsistent([mod('a', ['x']), mod('b', ['x'])])).toThrow(/declared by both/);
    expect(() => assertConsistent([mod('a', ['x']), mod('b', ['y'])])).not.toThrow();
  });

  it('rejects a redux state key registered twice, including against reserved host keys', () => {
    const state = (...keys: string[]) => ({ reducers: Object.fromEntries(keys.map((k) => [k, (x: unknown = null) => x])), middleware: [] });
    expect(() => assertStateConsistent([state('a'), state('b')])).not.toThrow();
    expect(() => assertStateConsistent([state('a'), state('a')])).toThrow(/more than once/);
    expect(() => assertStateConsistent([state('usersApi')], ['usersApi'])).toThrow(/more than once/);
  });
});
