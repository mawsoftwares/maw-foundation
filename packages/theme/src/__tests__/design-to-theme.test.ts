import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  analyzeDesign, createTheme, deriveComponentTokens, designToTheme, emptyNormalizedDesign, manualValue, normalizedToTheme,
  tokensToCssVars, UnsupportedDesignInputError, createThemeRegistry, parsePx,
  type NormalizedDesign, type Sourced,
} from '../index';

const exact = <T,>(value: T): Sourced<T> => ({ value, source: 'design', confidence: 1 });
const guess = <T,>(value: T): Sourced<T> => ({ value, source: 'estimated', confidence: 0.6 });

function design(overrides: Partial<NormalizedDesign> = {}): NormalizedDesign {
  return {
    ...emptyNormalizedDesign('test', 'figma'),
    colors: {
      light: {
        primary: exact('#0a7a5a'), onPrimary: exact('#fff'), background: exact('#f4f6f5'), card: exact('#fff'),
        text: exact('#111'), textMuted: exact('#666'), border: exact('#ddd'),
        success: exact('#16a34a'), warning: exact('#d97706'), error: exact('#b91c1c'), info: exact('#2563eb'),
        hover: exact('#e5ece9'),
      },
      dark: { hover: exact('#1f2a26'), background: exact('#0b1210') },
    },
    ...overrides,
  };
}

describe('analyzeDesign', () => {
  it('detects the spacing system from scale and semantic values without forcing 8px', () => {
    const d = design({
      spacing: {
        scale: { xs: exact(4), sm: exact(12), md: exact(20) },
        semantic: { page: { desktop: exact('28px'), mobile: exact('12px') } },
      },
    });
    const { analysis, design: out } = analyzeDesign(d);
    expect(analysis.spacingSystem).toMatchObject({ kind: '4px', base: 4 });
    expect(analysis.spacingSystemBasis).toBe('detected');
    expect(out.spacing.system?.kind).toBe('4px');
  });

  it('reports insufficient data instead of guessing, and respects a stated system', () => {
    expect(analyzeDesign(design()).analysis.spacingSystemBasis).toBe('insufficient');
    const given = design({ spacing: { scale: {}, system: { kind: '8px', base: 8 } } });
    expect(analyzeDesign(given).analysis).toMatchObject({ spacingSystemBasis: 'given', spacingSystem: { kind: '8px' } });
  });

  it('classifies radius style from the design values', () => {
    const style = (px: number, h?: string): string | undefined =>
      analyzeDesign(design({ radii: { md: exact(px) }, ...(h ? { sizing: { 'button-height': exact(h) } } : {}) })).analysis.radiusStyle;
    expect(style(0)).toBe('sharp');
    expect(style(3)).toBe('slightly-rounded');
    expect(style(10)).toBe('rounded');
    expect(style(999)).toBe('pill');
    expect(style(20, '40px')).toBe('pill');
    expect(analyzeDesign(design()).analysis.radiusStyle).toBeUndefined();
  });

  it('reports coverage, token sources and what needs review', () => {
    const d = design({ typography: { scale: { body: { size: guess('15px') } } } });
    const { analysis } = analyzeDesign(d);
    expect(analysis.coverage.missing).toEqual([]);
    expect(analysis.hasDarkMode).toBe(true);
    expect(analysis.sources.design).toBeGreaterThan(5);
    expect(analysis.sources.estimated).toBe(1);
    expect(analysis.review.map((r) => r.path)).toEqual(['typography.scale.body.size']);

    const sparse = analyzeDesign(design({ colors: { light: { primary: exact('#000') } } })).analysis;
    expect(sparse.coverage.missing).toContain('text');
    expect(sparse.hasDarkMode).toBe(false);
  });
});

describe('deriveComponentTokens', () => {
  const base = design({
    radii: { button: exact(8), card: guess(16), md: exact(6) },
    sizing: { 'control-height': exact('44px'), 'button-height': exact('48px') },
    typography: { scale: { button: { size: exact('14px'), weight: exact('600') }, label: { size: exact('12px') } } },
    shadows: { card: exact([{ offsetX: 0, offsetY: 2, blur: 8, spread: 0, color: '#000' }]), focus: exact('0 0 0 3px #0a7a5a') },
    spacing: { scale: {}, semantic: { card: { desktop: exact('24px') } } },
  });
  const out = deriveComponentTokens(base).components;

  it('fills component tokens from the design own shape, size, type and shadow values', () => {
    expect(out.button?.rounded).toMatchObject({ value: '8px', source: 'derived' });
    expect(out.card?.rounded).toMatchObject({ value: '16px', source: 'estimated', confidence: 0.6 });
    expect(out.button?.height?.value).toBe('48px'); // specific beats control-height
    expect(out.input?.height?.value).toBe('44px');
    expect(out.button?.typography?.value).toBe('button');
    expect(out['form-label']?.typography?.value).toBe('label');
    expect(out.card?.shadow?.value).toBe('var(--maw-shadow-card)');
    expect(out['input-focus']?.shadow?.value).toBe('var(--maw-shadow-focus)');
    expect(out.card?.padding?.value).toBe('var(--maw-space-card)');
  });

  it('never overrides a component value the design stated', () => {
    const stated = design({ ...base, components: { button: { rounded: exact('2px'), height: exact('36px') } } });
    const result = deriveComponentTokens(stated).components.button;
    expect(result?.rounded).toMatchObject({ value: '2px', source: 'design' });
    expect(result?.height?.value).toBe('36px');
    expect(result?.typography?.value).toBe('button');
  });

  it('does not invent interaction states', () => {
    expect(Object.keys(out).some((k) => /hover|active|disabled/.test(k) && k !== 'card-hover')).toBe(false);
  });
});

describe('dark-mode state tokens', () => {
  it('apply only in dark mode and win over the light value there', () => {
    const { overrides } = normalizedToTheme(design());
    const theme = createTheme(overrides);
    expect(tokensToCssVars(false, theme)['--maw-state-hover']).toBe('#e5ece9');
    expect(tokensToCssVars(true, theme)['--maw-state-hover']).toBe('#1f2a26');
  });
});

describe('normalizedToTheme / designToTheme', () => {
  it('applies manual corrections before analysis and marks them manual', () => {
    const result = normalizedToTheme(design(), { colors: { light: { primary: manualValue('#123456') } } });
    expect(result.overrides.palette?.brand).toBe('#123456');
    expect(result.provenance['palette.brand']).toMatchObject({ source: 'manual', confidence: 1 });
  });

  it('runs a real design.md end to end and produces a usable theme', async () => {
    const content = readFileSync(resolve(process.cwd(), 'apps/sample-web/public/design.md'), 'utf8');
    const result = await designToTheme({ kind: 'design-md', content, name: 'design.md' });
    const vars = tokensToCssVars(false, createTheme(result.overrides));
    expect(vars['--maw-brand']).toBe('#fe6e00');
    expect(result.analysis.coverage.present).toContain('primary');
    expect(result.design.meta.adapter).toBe('design-md');
    expect(result.overrides.provenance).toBe(result.provenance);
  });

  it('fails soft on unreadable input, then succeeds when the same design is entered manually', async () => {
    const err = await designToTheme({ kind: 'pdf', content: new Uint8Array([1]), name: 'spec.pdf' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnsupportedDesignInputError);
    const template = (err as UnsupportedDesignInputError).template;
    const manual = { ...template, colors: { light: { primary: manualValue('#0a7a5a') } } };
    const result = await designToTheme({ kind: 'manual', content: JSON.stringify(manual) });
    expect(result.overrides.palette?.brand).toBe('#0a7a5a');
  });

  it('feeds the theme registry: a generated client theme extends the base', async () => {
    const result = normalizedToTheme(design());
    const registry = createThemeRegistry([
      { id: 'default', overrides: { radius: { md: 4 } } },
      { id: 'client-a', extends: 'default', overrides: result.overrides },
    ]);
    const theme = registry.resolve('client-a');
    expect(theme.light.brand).toBe('#0a7a5a');
    expect(theme.radius.md).toBe(4);
  });
});

describe('parsePx', () => {
  it('reads px, bare numbers and rem; rejects the rest', () => {
    expect([parsePx('16px'), parsePx(12), parsePx('1.5rem'), parsePx('50%'), parsePx('calc(1px)')]).toEqual([16, 12, 24, undefined, undefined]);
  });
});
