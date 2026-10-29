import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isKnownIcon } from './Icon';

/** Icon names declared in ui-web's PATHS table (not exported, so read from source). */
function uiWebIconNames(): string[] {
  const src = readFileSync(new URL('../../../ui-web/src/components/Icon.tsx', import.meta.url), 'utf8');
  const table = src.slice(src.indexOf('const PATHS = {'), src.indexOf('export type IconName'));
  return [...table.matchAll(/^ {2}(?:'([a-z0-9-]+)'|([a-z0-9]+)): \(/gm)].map((m) => m[1] ?? m[2] ?? '');
}

describe('tailwind Icon', () => {
  it('knows every icon name ui-web knows', () => {
    const names = uiWebIconNames();
    expect(names.length).toBeGreaterThan(20);
    expect(names.filter((n) => !isKnownIcon(n))).toEqual([]);
  });

  it('knows the master-data icons and their menu-key aliases', () => {
    for (const name of ['map-pin', 'share-2', 'sites', 'sources', 'building-2']) {
      expect(isKnownIcon(name), name).toBe(true);
    }
  });

  it('knows the light/dark toggle icons', () => {
    for (const name of ['sun', 'moon']) expect(isKnownIcon(name), name).toBe(true);
  });

  it('knows every icon name the seeded menu uses, so none is drawn as plain text', () => {
    for (const name of ['briefcase', 'file-text', 'calendar', 'building', 'alert-triangle', 'arrow-left-right', 'receipt', 'trending-up', 'box', 'package']) {
      expect(isKnownIcon(name), name).toBe(true);
    }
  });
});
