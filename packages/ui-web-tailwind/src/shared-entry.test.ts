import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as kitExports from './index';
import { tailwindKit } from './kit';

/**
 * apps/shared/ui-kit/tailwind.ts is the build-time entry both sample apps alias `@mawsoftwares/ui-web` to. ES `export *` cannot be
 * overridden by a computed list, so the kit's components are listed by hand; this test fails when a component is added to the kit
 * but forgotten there (the app would silently keep ui-web's version for direct imports).
 */
const entryPath = fileURLToPath(new URL('../../../apps/shared/ui-kit/tailwind.ts', import.meta.url));
const entrySource = readFileSync(entryPath, 'utf8');

function listedNames(): string[] {
  const block = /export\s*\{([^}]*)\}\s*from\s*'@mawsoftwares\/ui-web-tailwind'/.exec(entrySource);
  expect(block, 'the entry must re-export the kit components from @mawsoftwares/ui-web-tailwind').not.toBeNull();
  return block![1]!
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n !== '');
}

describe('apps/shared/ui-kit/tailwind.ts', () => {
  it('re-exports every component of the Tailwind kit (and nothing else)', () => {
    expect([...listedNames()].sort()).toEqual(Object.keys(tailwindKit).sort());
  });

  it('only lists names the kit package really exports', () => {
    for (const name of listedNames()) expect(kitExports, name).toHaveProperty(name);
  });

  it('installs the kit with setUIKit', () => {
    expect(entrySource).toContain('setUIKit(tailwindKit)');
  });
});
