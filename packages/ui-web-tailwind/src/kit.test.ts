import { describe, expect, it } from 'vitest';
import { getDefaultKit } from '@mawsoftwares/ui-web/kit';
import { tailwindKit } from './kit';

describe('tailwindKit', () => {
  it('provides exactly the components the default ui-web kit provides', () => {
    expect(Object.keys(tailwindKit).sort()).toEqual(Object.keys(getDefaultKit()).sort());
  });

  it('exports only functions (components)', () => {
    for (const [name, component] of Object.entries(tailwindKit)) {
      expect(typeof component, name).toBe('function');
    }
  });
});
