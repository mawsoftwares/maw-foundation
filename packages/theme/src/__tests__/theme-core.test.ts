import { describe, it, expect } from 'vitest';
import {
  createTheme, createThemeRegistry, extendTheme, themeToCssText, tokensToCssVars,
  responsiveCss, resolveResponsive, deviceForWidth, listReviewTokens, tokenMeta, mergeThemeOverrides,
  defaultTheme,
} from '../index';

describe('extendTheme', () => {
  it('overrides only the tokens a layer sets and does not mutate inputs', () => {
    const base = { palette: { brand: '#111111', danger: '#aa0000' }, components: { 'button-primary': { height: '40px', padding: '12px' } } };
    const snapshot = JSON.stringify(base);
    const out = extendTheme(base, { palette: { brand: '#222222' }, components: { 'button-primary': { height: '44px' } } });
    expect(out.palette).toEqual({ brand: '#222222', danger: '#aa0000' });
    expect(out.components?.['button-primary']).toEqual({ height: '44px', padding: '12px' });
    expect(JSON.stringify(base)).toBe(snapshot);
  });

  it('merges type-scale steps individually (unlike the shallow mergeThemeOverrides)', () => {
    const base = { typography: { scale: { h1: { size: '32px', weight: '700' } } } };
    const layer = { typography: { scale: { h1: { size: '40px' } } } };
    expect(extendTheme(base, layer).typography?.scale?.h1).toEqual({ size: '40px', weight: '700' });
    expect(mergeThemeOverrides(base, layer)?.typography?.scale?.h1).toEqual({ size: '40px' });
  });

  it('skips undefined layers', () => {
    expect(extendTheme({ palette: { brand: '#123456' } }, undefined).palette?.brand).toBe('#123456');
  });
});

describe('theme registry', () => {
  const registry = createThemeRegistry([
    { id: 'default', overrides: { palette: { brand: '#111111' }, radius: { md: 4 } } },
    { id: 'client-a', extends: 'default', overrides: { palette: { brand: '#0a7a5a' } } },
    { id: 'client-b', extends: 'client-a', overrides: { radius: { md: 12 } } },
  ]);

  it('inherits through the chain, child wins', () => {
    const b = registry.resolve('client-b');
    expect(b.light.brand).toBe('#0a7a5a');
    expect(b.radius.md).toBe(12);
    expect(registry.resolve('default').radius.md).toBe(4);
  });

  it('rejects unknown parents and cycles', () => {
    expect(() => registry.resolve('nope')).toThrow(/Unknown theme/);
    const cyc = createThemeRegistry([
      { id: 'x', extends: 'y', overrides: {} },
      { id: 'y', extends: 'x', overrides: {} },
    ]);
    expect(() => cyc.resolve('x')).toThrow(/cycle/);
  });
});

describe('responsive tokens', () => {
  const tokens = {
    'space-page': { desktop: '32px', tablet: '24px', mobile: '16px' },
    'space-card': '20px',
    'text-hero-size': { desktop: '72px', mobile: '40px' },
  };
  const bp = { md: 768, lg: 1024 };

  it('resolves per device with fallback toward the base', () => {
    expect(resolveResponsive(tokens['text-hero-size'], 'tablet')).toBe('72px');
    expect(resolveResponsive(tokens['text-hero-size'], 'mobile')).toBe('40px');
    expect(resolveResponsive(tokens['space-card'], 'mobile')).toBe('20px');
    expect(deviceForWidth(500, bp)).toBe('mobile');
    expect(deviceForWidth(800, bp)).toBe('tablet');
    expect(deviceForWidth(1400, bp)).toBe('desktop');
  });

  it('emits base values plus tablet then mobile media queries', () => {
    const css = responsiveCss(tokens, bp);
    expect(css).toContain(':root{--maw-space-page:32px;--maw-space-card:20px;--maw-text-hero-size:72px;}');
    expect(css.indexOf('max-width:1023px')).toBeLessThan(css.indexOf('max-width:767px'));
    expect(css).toContain('@media (max-width:1023px){:root{--maw-space-page:24px;}}');
    expect(css).toContain('@media (max-width:767px){:root{--maw-space-page:16px;--maw-text-hero-size:40px;}}');
  });

  it('puts the desktop value in tokensToCssVars and keeps it out of themeToCssText :root blocks', () => {
    const theme = createTheme({ responsive: tokens });
    expect(tokensToCssVars(false, theme)['--maw-space-page']).toBe('32px');
    const css = themeToCssText(theme);
    expect(css.match(/--maw-space-page: /g)).toBeNull();
    expect(css).toContain('--maw-space-page:16px;');
  });
});

describe('state tokens + css export', () => {
  it('derives state tokens from the palette and lets extraTokens override them', () => {
    const base = tokensToCssVars(false, defaultTheme);
    expect(base['--maw-state-focus-ring']).toBe(defaultTheme.light.borderFocus);
    expect(base['--maw-state-disabled-opacity']).toBe('0.6');
    const custom = tokensToCssVars(false, createTheme({ extraTokens: { 'state-disabled-opacity': '0.4' } }));
    expect(custom['--maw-state-disabled-opacity']).toBe('0.4');
  });

  it('produces light and dark blocks', () => {
    const css = themeToCssText(defaultTheme);
    expect(css).toContain(':root {');
    expect(css).toContain(":root[data-theme='dark'] {");
  });
});

describe('provenance', () => {
  it('flags estimated and low-confidence tokens, lowest first', () => {
    const list = listReviewTokens({
      'palette.brand': tokenMeta('design'),
      'radius.md': tokenMeta('estimated', 0.72),
      'shadows.md': tokenMeta('estimated', 0.5),
      'spacing.md': tokenMeta('derived'),
    });
    expect(list.map((t) => t.path)).toEqual(['shadows.md', 'radius.md']);
  });
});
