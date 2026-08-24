import { describe, it, expect } from 'vitest';
import { brandConfigToThemeOverrides, createTheme } from '../index';

describe('brandConfigToThemeOverrides', () => {
  it('maps primary color to brand token', () => {
    const overrides = brandConfigToThemeOverrides({
      colors: { primary: '#1565C0' },
    });
    expect(overrides.palette?.brand).toBe('#1565C0');
    expect(overrides.palette?.borderFocus).toBe('#1565C0');
  });

  it('maps secondary to brandLight', () => {
    const overrides = brandConfigToThemeOverrides({
      colors: { primary: '#000', secondary: '#42A5F5' },
    });
    expect(overrides.palette?.brandLight).toBe('#42A5F5');
  });

  it('maps error to danger', () => {
    const overrides = brandConfigToThemeOverrides({
      colors: { primary: '#000', error: '#FF0000' },
    });
    expect(overrides.palette?.danger).toBe('#FF0000');
  });

  it('maps background and surface', () => {
    const overrides = brandConfigToThemeOverrides({
      colors: { primary: '#000', background: '#FAFAFA', surface: '#F0F0F0' },
    });
    expect(overrides.palette?.bg).toBe('#FAFAFA');
    expect(overrides.palette?.bgMuted).toBe('#F0F0F0');
  });

  it('includes font family in branding', () => {
    const overrides = brandConfigToThemeOverrides({
      colors: { primary: '#000' },
      typography: { fontFamily: 'Inter' },
    });
    expect(overrides.branding?.fontFamily).toBe('Inter');
  });

  it('includes border radius in branding', () => {
    const overrides = brandConfigToThemeOverrides({
      colors: { primary: '#000' },
      theme: { radius: 12 },
    });
    expect(overrides.branding?.borderRadius).toBe(12);
  });

  it('produces a valid theme when passed to createTheme', () => {
    const overrides = brandConfigToThemeOverrides({
      colors: { primary: '#2E7D32', secondary: '#66BB6A' },
      typography: { fontFamily: 'Poppins' },
      theme: { radius: 4 },
    });
    const theme = createTheme(overrides);
    expect(theme.light.brand).toBe('#2E7D32');
    expect(theme.light.brandLight).toBe('#66BB6A');
    expect(theme.typography.fontFamily).toContain('Poppins');
    expect(theme.radius.md).toBe(4);
  });

  it('two different brand configs produce different themes', () => {
    const themeA = createTheme(brandConfigToThemeOverrides({
      colors: { primary: '#1565C0' },
    }));
    const themeB = createTheme(brandConfigToThemeOverrides({
      colors: { primary: '#2E7D32' },
    }));
    expect(themeA.light.brand).not.toBe(themeB.light.brand);
  });
});
