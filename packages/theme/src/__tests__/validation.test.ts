import { describe, it, expect } from 'vitest';
import {
  applyAccessibilityFixes, checkAccessibility, compareRendered, contrastRatio, createTheme, emptyNormalizedDesign,
  expectationsFromDesign, isLoadableFont, normalizedToTheme, parseColor, suggestForeground, toHex, tokensToCssVars,
  validateTheme, resolveCssValue,
  type NormalizedDesign, type Sourced, type ThemeOverrides,
} from '../index';

const exact = <T,>(value: T): Sourced<T> => ({ value, source: 'design', confidence: 1 });
const guess = <T,>(value: T, c = 0.6): Sourced<T> => ({ value, source: 'estimated', confidence: c });
const rgb = (hex: string) => parseColor(hex)!;

describe('colour maths', () => {
  it('parses the literal formats and refuses what needs a browser', () => {
    expect(parseColor('#0af')).toEqual({ r: 0, g: 170, b: 255, a: 1 });
    expect(parseColor('#00000080')?.a).toBeCloseTo(0.5, 1);
    expect(parseColor('rgb(10 20 30 / 50%)')).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('color-mix(in srgb, red 50%, blue)')).toBeUndefined();
    expect(parseColor('var(--x)')).toBeUndefined();
  });

  it('matches known WCAG ratios', () => {
    expect(contrastRatio(rgb('#000000'), rgb('#ffffff'))).toBeCloseTo(21, 0);
    expect(contrastRatio(rgb('#777777'), rgb('#ffffff'))).toBeCloseTo(4.48, 1);
    expect(contrastRatio(rgb('#767676'), rgb('#ffffff'))).toBeGreaterThanOrEqual(4.5);
  });

  it('suggests the nearest passing colour', () => {
    const fixed = suggestForeground(rgb('#999999'), rgb('#ffffff'), 4.5)!;
    expect(contrastRatio(fixed, rgb('#ffffff'))).toBeGreaterThanOrEqual(4.5);
    expect(toHex(fixed)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('checkAccessibility', () => {
  const find = (o: ThemeOverrides, id: string) => checkAccessibility(createTheme(o)).findings.find((f) => f.id === id);

  it('flags low text contrast as an error below 3:1 and a warning between 3 and 4.5, with a fix suggestion', () => {
    const bad = find({ palette: { fg: '#cccccc' } }, 'a11y.contrast.light.fg-on-bg');
    expect(bad).toMatchObject({ severity: 'error', accessibility: true, area: 'accessibility' });
    expect(bad?.fix?.patch.palette?.fg).toMatch(/^#/);

    const mid = find({ palette: { fg: '#888888' } }, 'a11y.contrast.light.fg-on-bg');
    expect(mid?.severity).toBe('warning');
    expect(mid?.message).toContain('large text');
  });

  it('does not change anything it reports', () => {
    const overrides: ThemeOverrides = { palette: { fg: '#cccccc' } };
    const before = JSON.stringify(overrides);
    validateTheme({ overrides });
    expect(JSON.stringify(overrides)).toBe(before);
    expect(createTheme(overrides).light.fg).toBe('#cccccc');
  });

  it('checks component text on component background, light and dark', () => {
    const f = find({ components: { 'button-primary': { backgroundColor: '#ffff00', textColor: '#ffffff' } } }, 'a11y.contrast.light.component.buttons-primary');
    expect(f?.severity).toBe('error');
  });

  it('judges a transparent nav item against the shell it sits on, not the page', () => {
    const nav = { 'nav-item': { backgroundColor: 'transparent', textColor: '#ffffff' } };
    const onDarkShell = checkAccessibility(createTheme({ components: nav, shell: { bg: 'rgba(0, 0, 0, 0.7)', fg: '#fff' } })).findings;
    expect(onDarkShell.some((f) => f.id === 'a11y.contrast.light.component.nav-item')).toBe(false);
    const onLightShell = checkAccessibility(createTheme({ components: nav, shell: { bg: '#ffffff', fg: '#111' } })).findings;
    expect(onLightShell.some((f) => f.id === 'a11y.contrast.light.component.nav-item')).toBe(true);
  });

  it('checks focus ring, font sizes and touch targets', () => {
    const o: ThemeOverrides = {
      palette: { borderFocus: '#f5f5f5' },
      typography: { scale: { caption: { size: '10px' }, body: { size: '13px' } } },
      components: { 'button-primary': { height: '30px' }, input: { height: '20px' } },
    };
    const ids = checkAccessibility(createTheme(o)).findings.map((f) => f.id);
    expect(ids).toContain('a11y.focus.light.ring-on-bg');
    expect(ids).toContain('a11y.font-size.caption');
    expect(ids).toContain('a11y.font-size.body');
    expect(ids).toContain('a11y.target.buttons');
    expect(find(o, 'a11y.target.inputs')?.severity).toBe('error');
    expect(find(o, 'a11y.target.buttons')?.severity).toBe('warning');
  });

  it('flags near-invisible disabled controls', () => {
    const f = find({ extraTokens: { 'state-disabled-bg': '#eeeeee', 'state-disabled-fg': '#efefef', 'state-disabled-opacity': '0.2' } }, 'a11y.disabled.light.contrast');
    expect(f).toBeDefined();
    expect(find({ extraTokens: { 'state-disabled-opacity': '0.2' } }, 'a11y.disabled.opacity')).toBeDefined();
  });

  it('records what it could not evaluate instead of passing it', () => {
    const { skipped } = checkAccessibility(createTheme({ palette: { fg: 'oklch(0.2 0.1 200)' } }));
    expect(skipped.some((s) => s.includes('Body text'))).toBe(true);
  });

  it('resolves var() chains', () => {
    expect(resolveCssValue('var(--a, var(--b, #123456))', { '--b': '#abcdef' })).toBe('#abcdef');
    expect(resolveCssValue('var(--missing, #123456)', {})).toBe('#123456');
  });
});

describe('validateTheme', () => {
  it('reports a11y separately and lets a person explicitly accept a finding', () => {
    const overrides: ThemeOverrides = { palette: { fg: '#cccccc' } };
    const open = validateTheme({ overrides });
    const id = 'a11y.contrast.light.fg-on-bg';
    expect(open.accessibility.some((f) => f.id === id && f.overridden === undefined)).toBe(true);
    expect(open.areas.find((a) => a.area === 'accessibility')?.status).toBe('fail');

    const accepted = validateTheme({ overrides, accessibilityOverrides: [{ findingId: id, reason: 'Brand requires this grey; large type only' }] });
    const f = accepted.accessibility.find((x) => x.id === id);
    expect(f?.overridden?.reason).toContain('Brand requires');
    expect(accepted.summary.overridden).toBeGreaterThan(0);
    expect(accepted.summary.errors).toBe(open.summary.errors - 1);
  });

  it('applies a fix only when asked', () => {
    const overrides: ThemeOverrides = { palette: { fg: '#cccccc' } };
    const report = validateTheme({ overrides });
    const fixed = applyAccessibilityFixes(overrides, report, ['a11y.contrast.light.fg-on-bg']);
    expect(fixed.palette?.fg).not.toBe('#cccccc');
    expect(contrastRatio(rgb(fixed.palette!.fg!), rgb('#ffffff'))).toBeGreaterThanOrEqual(4.5);
    expect(applyAccessibilityFixes(overrides, report, [])).toBe(overrides);
  });

  it('one fix resolves a colour against every background it is checked on', () => {
    const overrides: ThemeOverrides = { palette: { fg: '#c8c8c8', bgSubtle: '#f4f6f5', bgMuted: '#eef1f0' } };
    const report = validateTheme({ overrides });
    const fixed = applyAccessibilityFixes(overrides, report, ['a11y.contrast.light.fg-on-bg']);
    const after = validateTheme({ overrides: fixed }).accessibility.map((f) => f.id);
    expect(after.filter((id) => id.startsWith('a11y.contrast.light.fg-on-'))).toEqual([]);
    // and it did not touch anything else
    expect(fixed.palette?.bgSubtle).toBe('#f4f6f5');
    expect(fixed.palette?.fgMuted).toBe(overrides.palette?.fgMuted);
  });

  it('says "defaults" for areas the design is silent on, not a match', () => {
    const r = validateTheme({ overrides: { palette: { brand: '#0a7a5a' } } });
    const status = (a: string) => r.areas.find((x) => x.area === a)?.status;
    expect(status('colors')).not.toBe('defaults');
    expect(status('radius')).toBe('defaults');
    expect(status('shadows')).toBe('defaults');
    expect(status('buttons')).toBe('defaults');
  });

  it('surfaces estimates from provenance in the right area', () => {
    const d: NormalizedDesign = {
      ...emptyNormalizedDesign('t', 'figma'),
      colors: { light: { primary: exact('#0a7a5a') } },
      shadows: { card: guess([{ offsetX: 0, offsetY: 2, blur: 8, spread: 0, color: '#000' }], 0.55) },
      radii: { md: guess(6, 0.7) },
    };
    const { overrides } = normalizedToTheme(d);
    const r = validateTheme({ overrides, design: d });
    expect(r.areas.find((a) => a.area === 'shadows')?.findings[0]?.message).toContain('estimate');
    expect(r.areas.find((a) => a.area === 'radius')?.status).toBe('review');
  });

  it('flags design/theme departures: missing roles, unavailable font, unmapped component, grid-less spacing', () => {
    const d: NormalizedDesign = {
      ...emptyNormalizedDesign('t', 'figma'),
      colors: { light: { primary: exact('#0a7a5a') } },
      typography: { fontFamily: exact('Acme Sans'), scale: { h1: {} } },
      spacing: { scale: { xs: exact(7), sm: exact(13), md: exact(22), lg: exact(31) }, semantic: { page: { desktop: exact('32px') } } },
      components: { gizmo: { backgroundColor: exact('#fff') }, button: { opacity: exact('0.5') } },
    };
    const { overrides } = normalizedToTheme(d);
    const ids = validateTheme({ overrides, design: d }).findings.map((f) => f.id);
    expect(ids).toContain('colors.missing.text');
    expect(ids).toContain('typography.font-unavailable');
    expect(ids).toContain('typography.no-size.h1');
    expect(ids).toContain('spacing.no-grid');
    expect(ids).toContain('components.unmapped.gizmo');
    expect(ids).toContain('components.prop.button.opacity');
    expect(ids).toContain('responsive.no-mobile.page');
  });

  it('does not report a font as unavailable when a source is provided or it is loadable', () => {
    expect(isLoadableFont("'Inter', sans-serif")).toBe(true);
    expect(isLoadableFont('Acme Sans')).toBe(false);
    const d: NormalizedDesign = {
      ...emptyNormalizedDesign('t', 'figma'),
      typography: { fontFamily: exact('Acme Sans'), scale: {} },
      assets: { fonts: [{ family: 'Acme Sans', url: 'https://x/acme.woff2' }] },
    };
    const { overrides } = normalizedToTheme(d);
    expect(validateTheme({ overrides, design: d }).findings.map((f) => f.id)).not.toContain('typography.font-unavailable');
  });
});

describe('rendered comparison', () => {
  const design: NormalizedDesign = {
    ...emptyNormalizedDesign('t', 'figma'),
    colors: { light: { primary: exact('#0a7a5a') } },
    typography: { scale: { button: { size: exact('15px'), weight: exact('600') } } },
    components: {
      'button-primary': { height: exact('44px'), backgroundColor: exact('#0a7a5a'), rounded: exact('8px') },
      button: { typography: exact('button') },
      card: { shadow: guess('0 2px 8px rgba(0,0,0,0.1)', 0.6) },
      gizmo: { height: exact('10px') },
    },
  };
  const vars = tokensToCssVars(false, createTheme(normalizedToTheme(design).overrides));
  const expectations = expectationsFromDesign(design, vars);

  it('builds expectations only for components the probes can render, resolving typography steps', () => {
    const keys = expectations.map((e) => `${e.probe}:${e.prop}`);
    expect(keys).toEqual(expect.arrayContaining(['button-primary:height', 'button-primary:background', 'button-primary:border-radius', 'button-primary:font-size', 'button-primary:font-weight', 'card:shadow']));
    expect(keys.some((k) => k.includes('gizmo'))).toBe(false);
  });

  it('reports only real differences ("Button height differs")', () => {
    const findings = compareRendered(expectations, {
      'button-primary': { height: '38px', 'background-color': 'rgb(10, 122, 90)', 'border-top-left-radius': '8px', 'font-size': '15px', 'font-weight': '600' },
      card: { 'box-shadow': 'rgba(0, 0, 0, 0.1) 0px 2px 8px 0px' },
    });
    expect(findings.map((f) => f.id)).toEqual(['render.button-primary.height']);
    expect(findings[0]?.message).toContain('design 44px, rendered 38px');
    expect(findings[0]?.area).toBe('buttons');
  });

  it('notes when the design value was only an estimate, and skips probes with no measurement', () => {
    const findings = compareRendered(expectations, { card: { 'box-shadow': 'none' } });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('estimate');
  });

  it('feeds validateTheme', () => {
    const { overrides } = normalizedToTheme(design);
    const r = validateTheme({ overrides, design, measurements: { 'button-primary': { height: '38px' } } });
    expect(r.areas.find((a) => a.area === 'buttons')?.findings.map((f) => f.id)).toContain('render.button-primary.height');
  });
});

describe('regressions', () => {
  it('validates a design.md whose importer output leaves palette roles unset (found in the browser)', async () => {
    const content = `---\nname: T\ncolors:\n  primary: "#0a7a5a"\n  on-primary: "#ffffff"\n  background: "#f4f6f5"\n  surface: "#ffffff"\n  on-surface: "#c8c8c8"\ntypography:\n  button:\n    fontFamily: "Acme Sans, sans-serif"\n    fontSize: "15px"\n    fontWeight: 600\ncomponents:\n  button-primary:\n    backgroundColor: "#0a7a5a"\n    height: "30px"\n  button-secondary:\n    height: "44px"\n---\n`;
    const { designToTheme } = await import('../index');
    const result = await designToTheme({ kind: 'design-md', content });
    const report = validateTheme({ overrides: result.overrides, design: result.design });
    expect(report.areas).toHaveLength(12);
    expect(report.accessibility.some((f) => f.id === 'a11y.contrast.light.fg-on-bg')).toBe(true);
    expect(report.findings.map((f) => f.id)).toContain('typography.font-unavailable');
    expect(parseColor(undefined as unknown as string)).toBeUndefined();
  });
});
