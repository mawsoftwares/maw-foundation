import { describe, it, expect } from 'vitest';
import {
  createDesignPipeline, createTheme, detectSpacingSystem, emptyNormalizedDesign, generateTheme, listReviewTokens,
  manualValue, mergeNormalizedDesign, shadowToCss, tokensToCssVars, UnsupportedDesignInputError,
  type DesignAdapter, type DesignInput, type NormalizedDesign, type Sourced,
} from '../index';

const exact = <T,>(value: T): Sourced<T> => ({ value, source: 'design', confidence: 1 });
const guess = <T,>(value: T, confidence = 0.7): Sourced<T> => ({ value, source: 'estimated', confidence });

function sample(): NormalizedDesign {
  return {
    ...emptyNormalizedDesign('test', 'figma'),
    colors: {
      light: {
        primary: exact('#0a7a5a'), onPrimary: exact('#ffffff'), background: exact('#f4f6f5'),
        surface: exact('#eef1f0'), card: exact('#ffffff'), text: exact('#111827'),
        error: exact('#b91c1c'), hover: exact('#e5ece9'), accent: exact('#f59e0b'),
      },
      dark: { background: exact('#0b1210') },
      gradients: { hero: exact('linear-gradient(90deg,#0a7a5a,#065f46)') },
      opacity: { disabled: exact('0.4') },
    },
    typography: {
      fontFamily: exact('Inter'),
      scale: {
        display: { size: exact('64px'), weight: exact('800'), textTransform: exact('uppercase') },
        'body-lg': { size: exact('18px'), lineHeight: guess('1.6') },
      },
    },
    spacing: {
      scale: { md: exact(12), 'gutter': exact(20) },
      semantic: { page: { desktop: exact('32px'), tablet: exact('24px'), mobile: exact('16px') }, card: { desktop: exact('20px') } },
    },
    radii: { md: exact(6), card: guess(14) },
    shadows: {
      md: exact([{ offsetX: 0, offsetY: 4, blur: 12, spread: 0, color: '#000000', opacity: 0.12 }]),
      modal: exact([{ offsetX: 0, offsetY: 20, blur: 40, spread: -8, color: 'rgba(0,0,0,0.3)' }]),
    },
    components: { 'button-primary': { height: exact('44px') }, 'button-primary-hover': { backgroundColor: exact('#086148') } },
    assets: { fonts: [{ family: 'Inter' }] },
    extras: { 'layout-container-max': exact('1200px') },
  };
}

describe('generateTheme', () => {
  const { overrides, provenance, warnings } = generateTheme(sample());

  it('maps colour roles onto the palette, keeping card/surface/background distinct', () => {
    expect(overrides.palette).toMatchObject({ brand: '#0a7a5a', brandContrast: '#ffffff', bgSubtle: '#f4f6f5', bg: '#ffffff', bgMuted: '#eef1f0', fg: '#111827', danger: '#b91c1c' });
    expect(overrides.paletteDark).toEqual({ bgSubtle: '#0b1210' });
  });

  it('routes roles without a palette slot to extras and state tokens', () => {
    expect(overrides.extraTokens).toMatchObject({
      'state-hover': '#e5ece9', 'color-accent': '#f59e0b', 'gradient-hero': 'linear-gradient(90deg,#0a7a5a,#065f46)',
      'state-disabled-opacity': '0.4', 'text-display-transform': 'uppercase', 'layout-container-max': '1200px',
      'space-gutter': '20px', 'radius-card': '14px', 'shadow-modal': '0px 20px 40px -8px rgba(0,0,0,0.3)',
    });
  });

  it('keeps a design-specific type scale, spacing, radius, shadow, component tokens', () => {
    expect(overrides.typography?.scale?.display).toEqual({ size: '64px', weight: '800' });
    expect(overrides.spacing).toEqual({ md: 12 });
    expect(overrides.radius).toEqual({ md: 6 });
    expect(overrides.shadows?.md).toContain('color-mix(in srgb, #000000 12%, transparent)');
    expect(overrides.components?.['button-primary']).toEqual({ height: '44px' });
  });

  it('emits per-device spacing as responsive tokens and single values as plain extras', () => {
    expect(overrides.responsive).toEqual({ 'space-page': { desktop: '32px', tablet: '24px', mobile: '16px' } });
    expect(overrides.extraTokens?.['space-card']).toBe('20px');
  });

  it('records provenance and surfaces estimated values for review', () => {
    expect(provenance['palette.brand']).toMatchObject({ source: 'design', confidence: 1 });
    expect(listReviewTokens(provenance).map((t) => t.path)).toEqual(['extraTokens.radius-card', 'typography.scale.body-lg.lineHeight']);
  });

  it('warns about fonts with no source', () => {
    expect(warnings.some((w) => w.includes('Inter'))).toBe(true);
  });

  it('produces overrides the existing theme engine accepts', () => {
    const vars = tokensToCssVars(false, createTheme(overrides));
    expect(vars['--maw-brand']).toBe('#0a7a5a');
    expect(vars['--maw-state-hover']).toBe('#e5ece9');
    expect(vars['--maw-comp-buttons-primary-hover-background']).toBe('#086148');
    expect(vars['--maw-space-page']).toBe('32px');
  });

  it('handles an empty design', () => {
    const out = generateTheme(emptyNormalizedDesign());
    expect(out.overrides.palette).toBeUndefined();
    expect(out.warnings).toEqual([]);
  });
});

describe('shadowToCss', () => {
  it('handles inset, multiple layers and none', () => {
    expect(shadowToCss([])).toBe('none');
    expect(shadowToCss([
      { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: '#000' },
      { offsetX: 0, offsetY: 0, blur: 0, spread: 1, color: '#fff', inset: true },
    ])).toBe('0px 1px 2px 0px #000, inset 0px 0px 0px 1px #fff');
  });
});

describe('design pipeline', () => {
  const adapter: DesignAdapter = {
    id: 'fake',
    canHandle: (i) => i.kind === 'css',
    analyze: async () => ({ ...emptyNormalizedDesign('fake', 'css'), meta: { adapter: 'fake', inputKind: 'css', name: 'Fake' } }),
  };

  it('routes to the adapter that can handle the input', async () => {
    const pipeline = createDesignPipeline([adapter]);
    expect((await pipeline.analyze({ kind: 'css', content: 'a{}' })).meta.name).toBe('Fake');
  });

  it('fails soft on unreadable input: the error carries a template for manual entry', async () => {
    const pipeline = createDesignPipeline([adapter]);
    const input: DesignInput = { kind: 'pdf', content: new Uint8Array([1]), name: 'spec.pdf' };
    const err = await pipeline.analyze(input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnsupportedDesignInputError);
    expect((err as UnsupportedDesignInputError).template.meta.inputKind).toBe('pdf');
    expect((err as Error).message).toContain('fake');
  });

  it('accepts hand-entered mappings and merges manual corrections over extracted values', async () => {
    const pipeline = createDesignPipeline();
    const manual = { colors: { light: { primary: manualValue('#123456') } } };
    const out = await pipeline.analyze({ kind: 'manual', content: JSON.stringify(manual) });
    expect(out.colors.light.primary).toMatchObject({ value: '#123456', source: 'manual', confidence: 1 });

    const merged = mergeNormalizedDesign(sample(), { colors: { light: { primary: manualValue('#000000') }, gradients: {} } });
    expect(merged.colors.light.primary?.value).toBe('#000000');
    expect(merged.colors.light.text?.value).toBe('#111827');
  });

  it('replaces an adapter registered twice under the same id', () => {
    const pipeline = createDesignPipeline([adapter]);
    pipeline.register({ ...adapter });
    expect(pipeline.adapterIds()).toEqual(['fake']);
  });
});

describe('detectSpacingSystem', () => {
  it('does not force an 8px system', () => {
    expect(detectSpacingSystem([8, 16, 24, 32, 48]).kind).toBe('8px');
    expect(detectSpacingSystem([4, 12, 20, 28]).kind).toBe('4px');
    expect(detectSpacingSystem([5, 10, 15, 25, 50])).toMatchObject({ kind: 'custom', base: 5 });
    expect(detectSpacingSystem([7, 13, 22, 31]).kind).toBe('mixed');
    expect(detectSpacingSystem([]).kind).toBe('custom');
  });
});
