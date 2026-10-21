import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addModuleCode, removeModuleCode, listScaffolded, scaffoldRoot, scaffoldTargets } from '../module-scaffold';

const input = { key: 'item-master', label: 'Item Master', path: '/accounts-inventory/item-master', icon: 'package', sortOrder: 48 };

describe('module scaffold', () => {
  let root: string;
  const real = scaffoldTargets(scaffoldRoot());
  const tmp = () => scaffoldTargets(root);

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'scaffold-'));
    for (const f of [real.serverIndex, real.appTsx]) {
      const dest = f.replace(scaffoldRoot(), root);
      mkdirSync(join(dest, '..'), { recursive: true });
      cpSync(f, dest);
    }
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('adds code to every checklist location', () => {
    const r = addModuleCode(root, input);
    expect(r.permissions.map((p) => p.code)).toEqual(['Read_Item_Master', 'Create_Item_Master', 'Update_Item_Master', 'Delete_Item_Master']);
    expect(existsSync(join(tmp().serverModuleDir('item-master'), 'permissions.ts'))).toBe(true);
    expect(existsSync(tmp().webView('item-master'))).toBe(true);
    expect(readFileSync(tmp().serverIndex, 'utf8')).toContain('itemMasterModule,');
    const app = readFileSync(tmp().appTsx, 'utf8');
    for (const needle of ["ItemMasterView } from './features/item-master'", "'item-master': 'Read_Item_Master'", "case 'item-master'", "'module.item-master': true"]) {
      expect(app).toContain(needle);
    }
    expect(listScaffolded(root)).toEqual(['item-master']);
  });

  it('removes exactly what it added', () => {
    const before = [readFileSync(tmp().serverIndex, 'utf8'), readFileSync(tmp().appTsx, 'utf8')];
    addModuleCode(root, input);
    expect(removeModuleCode(root, 'item-master')).toBe(true);
    expect([readFileSync(tmp().serverIndex, 'utf8'), readFileSync(tmp().appTsx, 'utf8')]).toEqual(before);
    expect(existsSync(tmp().serverModuleDir('item-master'))).toBe(false);
    expect(existsSync(tmp().webView('item-master'))).toBe(false);
  });

  it('refuses hand-written modules and bad keys', () => {
    expect(removeModuleCode(root, 'customers')).toBe(false);
    expect(() => addModuleCode(root, { ...input, key: '../evil' })).toThrow();
    addModuleCode(root, input);
    expect(() => addModuleCode(root, input)).toThrow(/already has code/);
  });
});
