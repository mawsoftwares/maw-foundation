import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, it, expect } from 'vitest';
import {
  createTheme, createThemeRegistry, designToTheme, diffThemeOverrides, exportThemeBundle, exportThemeCss, exportThemeJson,
  exportThemeTs, extendTheme, googleFontUrl, parseThemeJson, stripProvenance, themeToCssText, tokensToCssVars, toTsLiteral,
  ThemeFileError, type ThemeOverrides,
} from '../index';

const REAL = readFileSync(resolve(process.cwd(), 'apps/sample-web/public/design.md'), 'utf8');

const SAMPLE: ThemeOverrides = {
  palette: { brand: '#0a7a5a', brandContrast: '#ffffff', fg: "it's #111" },
  paletteDark: { bgSubtle: '#0b1210' },
  radius: { md: 6 },
  typography: { fontFamily: 'Inter', scale: { h1: { size: '40px', weight: '700' }, 'body-lg': { size: '18px' } } },
  components: { 'button-primary': { height: '44px' }, 'button-primary-hover': { backgroundColor: '#086148' } },
  extraTokens: { 'layout-container-max': '1200px', '4xl': '64px' },
  extraTokensDark: { 'state-hover': '#1f2a26' },
  responsive: { 'space-page': { desktop: '32px', tablet: '24px', mobile: '16px' } },
  provenance: { 'palette.brand': { source: 'design', confidence: 1 }, 'radius.md': { source: 'estimated', confidence: 0.7 } },
};

/** Compile a generated theme.ts and run it, the way a bundler would. */
function runTs(source: string): Record<string, unknown> {
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports: Record<string, unknown> = {};
  new Function('exports', 'require', outputText)(exports, () => ({}));
  return exports;
}

describe('theme.json', () => {
  it('round-trips, including provenance, and is stable', () => {
    const json = exportThemeJson(SAMPLE, { name: 'Client A', extends: 'default' });
    const file = parseThemeJson(json);
    expect(file).toMatchObject({ format: 'maw-theme', version: 1, name: 'Client A', extends: 'default' });
    expect(file.overrides).toEqual(SAMPLE);
    expect(exportThemeJson(file.overrides, { name: 'Client A', extends: 'default' })).toBe(json);
  });

  it('can omit provenance', () => {
    expect(parseThemeJson(exportThemeJson(SAMPLE, { includeProvenance: false })).overrides.provenance).toBeUndefined();
    expect(stripProvenance(SAMPLE).palette).toEqual(SAMPLE.palette);
  });

  it('rejects bad files with a clear message', () => {
    const bad = (text: string): string => { try { parseThemeJson(text); return 'accepted'; } catch (e) { expect(e).toBeInstanceOf(ThemeFileError); return (e as Error).message; } };
    expect(bad('{nope')).toBe('Not valid JSON');
    expect(bad('{"format":"other"}')).toContain('Not a maw-theme');
    expect(bad('{"format":"maw-theme","version":9,"overrides":{}}')).toContain('Unsupported theme file version 9');
    expect(bad('{"format":"maw-theme","version":1,"overrides":{"bogus":{}}}')).toContain('Unknown theme section "bogus"');
    expect(bad('{"format":"maw-theme","version":1,"overrides":{"palette":{"brand":5}}}')).toContain('palette.brand must be a string');
    expect(bad('{"format":"maw-theme","version":1,"overrides":{"radius":{"md":"4px"}}}')).toContain('radius.md must be a number');
    expect(bad('{"format":"maw-theme","version":1,"overrides":{"components":{"b":{"h":4}}}}')).toContain('components.b must be an object of strings');
  });
});

describe('theme.ts', () => {
  it('is valid TypeScript that evaluates to the same theme', () => {
    const source = exportThemeTs(SAMPLE);
    expect(source).toContain("import type { ThemeOverrides } from '@mawsoftwares/theme';");
    const { theme } = runTs(source);
    expect(theme).toEqual(stripProvenance(SAMPLE));
  });

  it('escapes quotes, quotes odd keys, sorts keys, and is deterministic', () => {
    const source = exportThemeTs(SAMPLE);
    expect(source).toContain("fg: 'it\\'s #111'");
    expect(source).toContain("'4xl': '64px'");
    expect(source.indexOf('brand:')).toBeLessThan(source.indexOf('fg:'));
    expect(exportThemeTs({ ...SAMPLE })).toBe(source);
    expect(toTsLiteral({ a: undefined, b: [1, 'x'], c: {} })).toBe("{\n  b: [\n    1,\n    'x',\n  ],\n  c: {},\n}");
  });

  it('exports a registry definition when given an id, and it resolves through the registry', () => {
    const source = exportThemeTs(SAMPLE, { id: 'client-a', extends: 'default' });
    expect(source).toContain("import type { ThemeDefinition, ThemeOverrides } from '@mawsoftwares/theme';");
    const { definition } = runTs(source) as { definition: { id: string; extends: string; overrides: ThemeOverrides } };
    expect(definition).toMatchObject({ id: 'client-a', extends: 'default' });
    const registry = createThemeRegistry([{ id: 'default', overrides: {} }, definition]);
    expect(registry.resolve('client-a').light.brand).toBe('#0a7a5a');
  });
});

describe('theme.css', () => {
  const css = exportThemeCss(SAMPLE);

  it('has light, dark, responsive and font rules, matching what the runtime applies', () => {
    expect(css.startsWith('/* Generated by @mawsoftwares/theme')).toBe(true);
    expect(css).toContain("@import url('https://fonts.googleapis.com/css2?family=Inter");
    expect(css).toContain('--maw-brand: #0a7a5a;');
    expect(css).toContain(":root[data-theme='dark'] {");
    expect(css).toContain('@media (max-width:767px){:root{--maw-space-page:16px;}}');
    // dark-only token wins in the dark block
    const dark = css.slice(css.indexOf(":root[data-theme='dark']"));
    expect(dark).toContain('--maw-state-hover: #1f2a26;');
  });

  it('includes the component state rules a design defines', () => {
    const withState = exportThemeCss(SAMPLE);
    expect(withState).toContain('/* Component states */');
    expect(withState).toContain('.maw-btn--primary:hover:not(:disabled){background:var(--maw-comp-buttons-primary-hover-background) !important;}');
    expect(exportThemeCss({ palette: { brand: '#123456' } })).not.toContain('Component states');
  });

  it('every variable the runtime would set is in the file', () => {
    const theme = createTheme(SAMPLE);
    for (const dark of [false, true]) {
      const block = dark ? css.slice(css.indexOf(":root[data-theme='dark']")) : css.slice(0, css.indexOf(":root[data-theme='dark']"));
      for (const [name, value] of Object.entries(tokensToCssVars(dark, theme))) {
        if (name === '--maw-space-page') continue; // emitted per device below
        expect(block, `${dark ? 'dark' : 'light'} ${name}`).toContain(`${name}: ${value};`);
      }
    }
    expect(themeToCssText(theme)).not.toContain('--maw-space-page: ');
  });

  it('knows which fonts it can import', () => {
    expect(googleFontUrl("'Poppins', sans-serif")).toContain('family=Poppins');
    expect(googleFontUrl('Acme Sans')).toBeUndefined();
    expect(exportThemeCss({ typography: { fontFamily: 'Acme Sans' } })).not.toContain('@import');
  });
});

describe('diffThemeOverrides', () => {
  const base: ThemeOverrides = { palette: { brand: '#111111', danger: '#aa0000' }, radius: { md: 4 }, components: { 'button-primary': { height: '40px', padding: '12px' } } };

  it('keeps only what differs, and extendTheme(base, diff) resolves to the original', () => {
    const next = extendTheme(base, { palette: { brand: '#0a7a5a' }, components: { 'button-primary': { height: '44px' } }, extraTokens: { x: '1px' } });
    const diff = diffThemeOverrides(base, next);
    expect(diff).toEqual({ palette: { brand: '#0a7a5a' }, components: { 'button-primary': { height: '44px' } }, extraTokens: { x: '1px' } });
    expect(extendTheme(base, diff)).toEqual(next);
  });

  it('is empty when nothing changed, and keeps provenance only for tokens that remain', () => {
    expect(diffThemeOverrides(base, base)).toEqual({});
    const diff = diffThemeOverrides(base, {
      ...base, palette: { ...base.palette, brand: '#0a7a5a' },
      provenance: { 'palette.brand': { source: 'design', confidence: 1 }, 'palette.danger': { source: 'design', confidence: 1 } },
    });
    expect(diff.provenance).toEqual({ 'palette.brand': { source: 'design', confidence: 1 } });
  });
});

describe('bundle from a real design', () => {
  it('turns design.md into all three files that agree with each other', async () => {
    const result = await designToTheme({ kind: 'design-md', content: REAL });
    const bundle = exportThemeBundle(result.overrides, { name: 'Evreghen', id: 'evreghen', extends: 'default' });
    const fromJson = parseThemeJson(bundle['theme.json']).overrides;
    const fromTs = runTs(bundle['theme.ts']).theme as ThemeOverrides;
    expect(fromJson).toEqual(JSON.parse(JSON.stringify(result.overrides)));
    expect(fromTs).toEqual(stripProvenance(JSON.parse(JSON.stringify(result.overrides))));
    expect(tokensToCssVars(false, createTheme(fromTs))).toEqual(tokensToCssVars(false, createTheme(result.overrides)));
    expect(bundle['theme.css']).toContain('--maw-brand: #fe6e00;');
  });
});
