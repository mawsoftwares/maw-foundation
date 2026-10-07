import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isKnownIcon } from './Icon';

// Icon names the sample app's nav is seeded with (sample-server seed + sample-web static items). An unknown name
// renders as raw text in the sidebar, so every one of them needs a glyph.
describe('Icon', () => {
  it('has a glyph for every icon name seeded in the sample app', () => {
    const seed = readFileSync(resolve(__dirname, '../../../../apps/sample-server/src/db/seed.ts'), 'utf8');
    const names = new Set([...seed.matchAll(/icon: '([a-z0-9-]+)'/g)].map((m) => m[1] as string));
    expect(names.size).toBeGreaterThan(10);
    const unknown = [...names].filter((n) => !isKnownIcon(n));
    expect(unknown).toEqual([]);
  });

  it('still reports truly unknown names as unknown', () => {
    expect(isKnownIcon('definitely-not-an-icon')).toBe(false);
  });
});
