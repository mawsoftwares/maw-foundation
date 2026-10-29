import { describe, expect, it } from 'vitest';
import { createThemeRegistry, starterThemes } from '@mawsoftwares/theme';
import { APP_DEFAULT_THEME_ID, appBaseTheme } from './app-theme';

const registry = createThemeRegistry(starterThemes);

describe('appBaseTheme', () => {
  it('"Application default" shows the app\'s built-in MAW Console look', () => {
    const base = appBaseTheme(undefined, null, registry);
    expect(base?.palette?.brand).toBe(registry.resolveOverrides(APP_DEFAULT_THEME_ID).palette?.brand);
  });

  it('a theme the project chooses stands on its own, with nothing from the built-in look leaking in', () => {
    expect(appBaseTheme(undefined, 'deep-violet', registry)).toBeUndefined();
  });

  it('a shared theme from Theme Designer always wins', () => {
    const shared = { palette: { brand: '#123456' } };
    expect(appBaseTheme(shared, null, registry)).toBe(shared);
    expect(appBaseTheme(shared, 'deep-violet', registry)).toBe(shared);
  });

  it('falls back to no base when the built-in theme is not registered', () => {
    expect(appBaseTheme(undefined, null, createThemeRegistry([]))).toBeUndefined();
  });
});
