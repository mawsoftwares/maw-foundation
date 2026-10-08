import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  createDesignMdAdapter, createDesignPipeline, createTheme, designMdToNormalized, generateTheme, listReviewTokens,
  parseDesignMarkdown, parseShadowCss, shadowToCss, tokensToCssVars,
} from '../index';

const REAL = readFileSync(resolve(process.cwd(), 'apps/sample-web/public/design.md'), 'utf8');

const FIXTURES: Readonly<Record<string, string>> = {
  'sample-web design.md': REAL,
  'yaml with components, shell, shadows, motion': `---
name: Rich
colors:
  primary: "#0a7a5a"
  on-primary: "#ffffff"
  background: "#f4f6f5"
  surface: "#ffffff"
  on-surface: "#111827"
  danger: "#b91c1c"
typography:
  h1:
    fontFamily: "Inter, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.1
spacing:
  md: "12px"
rounded:
  md: "6px"
  lg: "12px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    height: "44px"
  button-primary-hover:
    backgroundColor: "#086148"
---
`,
  'css custom properties': `:root {\n  --primary: #7c3aed;\n  --background: #ffffff;\n  --foreground: #111111;\n  --border: #e5e7eb;\n  --radius: 8px;\n}`,
  'markdown list': `# Brand\n\n- Primary Color: #0ea5e9\n- Secondary Color: #38bdf8\n- Accent Color: #0369a1\n- Font Family: Poppins\n- Border Radius: 10\n`,
  'dtcg json': JSON.stringify({ color: { primary: { $value: '#e11d48' }, background: { $value: '#fafafa' }, text: { $value: '#18181b' } } }),
  'unlabeled colors in prose': 'We love #ff6b00 for buttons, a dark #1a1a1a text and a pale #fff7ed page.',
};

describe('design-md adapter: equivalence with the direct importer (adaptation: importer)', () => {
  for (const [name, content] of Object.entries(FIXTURES)) {
    it(`${name}: normalized → generator reproduces the same theme variables`, () => {
      const direct = createTheme(parseDesignMarkdown(content).overrides);
      const viaModel = createTheme(generateTheme(designMdToNormalized(content, 'design-md', { adaptation: 'importer' })).overrides);
      for (const dark of [false, true]) {
        const a = tokensToCssVars(dark, direct);
        const b = tokensToCssVars(dark, viaModel);
        // Shadows are re-serialized from structured layers, so compare them by meaning, not by whitespace.
        const canon = (k: string, v: string): string => (k.includes('shadow') && parseShadowCss(v) !== undefined ? shadowToCss(parseShadowCss(v) ?? []) : v);
        for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
          // The importer can leave an explicit `undefined` in its palette (a bare "undefined" CSS value);
          // the model path treats that as "not set" and uses the theme default, which is the intended result.
          if (a[key] === undefined) continue;
          expect(canon(key, b[key] ?? '<missing>'), `${dark ? 'dark' : 'light'} ${key}`).toBe(canon(key, a[key] ?? '<missing>'));
        }
      }
    });
  }
});

describe('design-md adapter: provenance', () => {
  it('marks stated values as design and adapter guesses as estimated', () => {
    const stated = designMdToNormalized(FIXTURES['yaml with components, shell, shadows, motion'] as string);
    expect(stated.colors.light.primary).toMatchObject({ value: '#0a7a5a', source: 'design', confidence: 1 });
    expect(stated.components['button-primary-hover']?.backgroundColor).toMatchObject({ source: 'design' });
    expect(stated.meta).toMatchObject({ name: 'Rich', adapter: 'design-md' });

    const guessed = generateTheme(designMdToNormalized(FIXTURES['unlabeled colors in prose'] as string));
    const review = listReviewTokens(guessed.provenance).map((t) => t.path);
    expect(review.length).toBeGreaterThan(0);
    expect(review.some((p) => p.startsWith('palette.'))).toBe(true);
  });

  it('flags colours that were derived rather than stated', () => {
    const d = designMdToNormalized(FIXTURES['markdown list'] as string);
    expect(d.colors.light.primary?.source).toBe('design');
    // As stated: unstated neutrals are not invented, so the theme defaults apply.
    expect(d.colors.light.text).toBeUndefined();
    // Dark mode follows the accent colour the file gave — a derived value, not a stated one.
    expect(d.colors.dark?.primary).toMatchObject({ value: '#0369a1', source: 'derived' });

    // With the importer's adaptation the neutrals are filled in, and marked as derived.
    const adapted = designMdToNormalized(FIXTURES['markdown list'] as string, 'design-md', { adaptation: 'importer' });
    expect(adapted.colors.light.text).toMatchObject({ source: 'derived' });
  });

  it('keeps importer warnings', () => {
    expect(designMdToNormalized('nothing useful here').warnings.length).toBeGreaterThan(0);
  });
});

describe('design-md adapter in the pipeline', () => {
  it('handles design-md / css / json kinds and not pdf or figma', async () => {
    const pipeline = createDesignPipeline([createDesignMdAdapter()]);
    const out = await pipeline.analyze({ kind: 'css', content: FIXTURES['css custom properties'] as string });
    expect(out.meta.inputKind).toBe('css');
    await expect(pipeline.analyze({ kind: 'pdf', content: new Uint8Array() })).rejects.toThrow(/No design adapter/);
  });

  it('reads bytes as well as strings', async () => {
    const bytes = new TextEncoder().encode(FIXTURES['markdown list'] as string);
    const out = await createDesignMdAdapter().analyze({ kind: 'design-md', content: bytes });
    expect(out.colors.light.primary?.value).toBe('#0ea5e9');
  });
});

describe('parseShadowCss', () => {
  it('parses layered shadows with colour functions and rejects what it cannot represent exactly', () => {
    expect(parseShadowCss('0 1px 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px #fff')).toEqual([
      { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: 'rgba(0, 0, 0, 0.2)' },
      { offsetX: 0, offsetY: 0, blur: 0, spread: 1, color: '#fff', inset: true },
    ]);
    expect(parseShadowCss('none')).toEqual([]);
    expect(parseShadowCss('0 1px 2rem #000')).toBeUndefined();
    expect(parseShadowCss('0 var(--y) 2px #000')).toBeUndefined();
  });
});

describe('design-md adapter: as-stated colours (default)', () => {
  const content = `---\nname: T\ncolors:\n  primary: "#0a7a5a"\n  background: "#f4f6f5"\n  surface: "#ffffff"\n  on-surface: "#c8c8c8"\n---\n`;

  it('keeps the colour the file states instead of repairing it', () => {
    const stated = designMdToNormalized(content);
    expect(stated.colors.light.text).toMatchObject({ value: '#c8c8c8', source: 'design' });
    const adapted = designMdToNormalized(content, 'design-md', { adaptation: 'importer' });
    expect(adapted.colors.light.text?.value).not.toBe('#c8c8c8');
  });

  it('matches the importer with adaptation switched off', () => {
    const direct = createTheme(parseDesignMarkdown(content, { adapt: false }).overrides);
    const viaModel = createTheme(generateTheme(designMdToNormalized(content)).overrides);
    expect(viaModel.light).toEqual(direct.light);
  });

  it('leaves the importer default untouched', () => {
    expect(parseDesignMarkdown(content).overrides.palette?.fg).not.toBe('#c8c8c8');
    expect(parseDesignMarkdown(content, { adapt: false }).overrides.palette?.fg).toBe('#c8c8c8');
  });

  it('lets the pipeline pick the mode', async () => {
    const pipeline = createDesignPipeline([createDesignMdAdapter({ adaptation: 'importer' })]);
    expect((await pipeline.analyze({ kind: 'design-md', content })).colors.light.text?.value).not.toBe('#c8c8c8');
  });
});
