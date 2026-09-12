import { describe, it, expect } from 'vitest';
import { parseDesignMarkdown, storedDesignToOverrides, createTheme, tokensToCssVars, normalizeDesignMarkdown } from '../index';

describe('parseDesignMarkdown', () => {
  it('parses recognized color/font/radius tokens', () => {
    const result = parseDesignMarkdown(`
# Design Tokens
- **Primary Color**: #4f46e5
- Secondary Color: #818cf8
- Accent Color: #4338ca
- Font Family: Inter
- Border Radius: 12px
`);
    expect(result.branding).toEqual({
      primaryColor: '#4f46e5',
      secondaryColor: '#818cf8',
      accentColor: '#4338ca',
      fontFamily: 'Inter',
      borderRadius: 12,
    });
    expect(result.warnings).toHaveLength(0);
    expect(result.recognized).toHaveLength(5);
  });

  it('accepts 3-digit hex colors', () => {
    const result = parseDesignMarkdown('- Primary Color: #4f6');
    expect(result.branding.primaryColor).toBe('#4f6');
  });

  it('warns and skips invalid color values', () => {
    const result = parseDesignMarkdown('- Primary Color: not-a-color');
    expect(result.branding.primaryColor).toBeUndefined();
    expect(result.warnings).toHaveLength(1);
  });

  it('warns and skips invalid border radius values', () => {
    const result = parseDesignMarkdown('- Border Radius: not-a-number');
    expect(result.branding.borderRadius).toBeUndefined();
    expect(result.warnings).toHaveLength(1);
  });

  it('ignores unrecognized keys and heading lines without failing', () => {
    const result = parseDesignMarkdown('# Heading\n- Some Unknown Field: value\n- Primary Color: #000000');
    expect(result.branding).toEqual({ primaryColor: '#000000' });
    expect(result.warnings).toHaveLength(0);
  });

  it('reports a warning when nothing is recognized', () => {
    const result = parseDesignMarkdown('Just some prose with no tokens.');
    expect(result.recognized).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });

  it('parses YAML frontmatter design-system tokens', () => {
    const result = parseDesignMarkdown(`---
name: Evreghen Command Center
colors:
  background: "#fcfaf7"
  on-background: "#423d38"
  surface: "#f3f4f6"
  surface-elevated: "#ffffff"
  on-surface-muted: "#797067"
  outline: "#e3e0dd"
  primary: "#fe6e00"
  primary-strong: "#ff6b00"
  primary-warm: "#ffb74d"
  primary-focus: "#f97015"
  on-primary: "#ffffff"
  shell-base: "#000000"
  on-shell: "#ffffff"
  shell-border: "#ffffff"
  success: "#00c758"
  danger: "#fb2c36"
  dark-background: "#413830"
  dark-surface: "#4a423a"
  dark-on-surface: "#fafaf9"
typography:
  body-md:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
  code-sm:
    fontFamily: "ui-monospace, Menlo, monospace"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
elevation:
  shell-blur: "12px"
  shell-opacity: "0.70"
  shell-border-opacity: "0.10"
components:
  shell-sidebar:
    backgroundColor: "rgba(0, 0, 0, 0.70)"
    textColor: "{colors.on-shell}"
  nav-item:
    textColor: "rgba(255, 255, 255, 0.70)"
---
`);
    expect(result.warnings).toHaveLength(0);
    expect(result.branding.primaryColor).toBe('#fe6e00');
    expect(result.branding.fontFamily).toBe('ui-sans-serif, system-ui, sans-serif');
    expect(result.branding.borderRadius).toBe(8);
    expect(result.overrides.palette?.brand).toBe('#fe6e00');
    expect(result.overrides.palette?.bgSubtle).toBe('#fcfaf7');
    expect(result.overrides.palette?.bg).toBe('#ffffff');
    expect(result.overrides.palette?.bgMuted).toBe('#f3f4f6');
    expect(result.overrides.palette?.fg).toBe('#423d38');
    expect(result.overrides.palette?.fgMuted).toBe('#797067');
    expect(result.overrides.palette?.border).toBe('#e3e0dd');
    expect(result.overrides.palette?.brandDark).toBe('#ff6b00');
    expect(result.overrides.palette?.brandLight).toBe('#ffb74d');
    expect(result.overrides.palette?.borderFocus).toBe('#f97015');
    expect(result.overrides.paletteDark?.bgSubtle).toBe('#413830');
    expect(result.overrides.paletteDark?.bg).toBe('#4a423a');
    expect(result.overrides.shell?.bg).toBe('rgba(0, 0, 0, 0.70)');
    expect(result.overrides.shell?.fg).toBe('#ffffff');
    expect(result.overrides.shell?.fgMuted).toBe('rgba(255, 255, 255, 0.70)');
    expect(result.overrides.shell?.blur).toBe('12px');
    expect(result.overrides.shell?.border).toBe('rgba(255, 255, 255, 0.1)');
    expect(result.overrides.typography?.monoFamily).toContain('ui-monospace');
    expect(result.recognized.length).toBeGreaterThan(5);
  });

  it('applies YAML overrides to CSS variables without quoting a font stack', () => {
    const parsed = parseDesignMarkdown(`---
colors:
  primary: "#fe6e00"
  background: "#fcfaf7"
  surface-elevated: "#ffffff"
typography:
  body-md:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
rounded:
  md: "8px"
components:
  shell-sidebar:
    backgroundColor: "rgba(0, 0, 0, 0.70)"
    textColor: "#ffffff"
---
`);
    const theme = createTheme(parsed.overrides);
    expect(theme.light.brand).toBe('#fe6e00');
    expect(theme.light.bgSubtle).toBe('#fcfaf7');
    expect(theme.typography.fontFamily).toBe('ui-sans-serif, system-ui, sans-serif');
    expect(theme.radius.md).toBe(8);
    const vars = tokensToCssVars(false, theme);
    expect(vars['--maw-brand']).toBe('#fe6e00');
    expect(vars['--maw-canvas']).toBe('#fcfaf7');
    expect(vars['--maw-shell-bg']).toBe('rgba(0, 0, 0, 0.70)');
    expect(vars['--maw-shell-fg']).toBe('#ffffff');
    expect(vars['--maw-font-family']).toBe('ui-sans-serif, system-ui, sans-serif');
  });

  it('parses the sample-web Evreghen design.md fixture', async () => {
    const { readFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const fixture = resolve(process.cwd(), 'apps/sample-web/public/design.md');
    const text = await readFile(fixture, 'utf8');
    const result = parseDesignMarkdown(text);
    expect(result.warnings).toEqual([]);
    expect(result.overrides.palette?.brand).toBe('#fe6e00');
    expect(result.overrides.palette?.bgSubtle).toBe('#fcfaf7');
    expect(result.overrides.shell?.bg).toBe('rgba(0, 0, 0, 0.70)');
    expect(result.overrides.shell?.fg).toBe('#ffffff');
    expect(result.branding.fontFamily).toContain('ui-sans-serif');
  });

  it('still maps a legacy TenantBranding blob from localStorage', () => {
    expect(storedDesignToOverrides({ primaryColor: '#123456' })).toEqual({
      branding: { primaryColor: '#123456' },
    });
    expect(storedDesignToOverrides({ palette: { brand: '#fe6e00' } })?.palette?.brand).toBe('#fe6e00');
    expect(storedDesignToOverrides('nope')).toBeNull();
  });

  it('reads unquoted hex colors from YAML', () => {
    const result = parseDesignMarkdown(`---
colors:
  primary: #2563eb
  background: #f8fafc
  text: #0f172a
---
`);
    expect(result.overrides.palette?.brand).toBe('#2563eb');
    expect(result.overrides.palette?.bgSubtle).toBe('#f8fafc');
    expect(result.overrides.palette?.fg).toBe('#0f172a');
  });

  it('reads tokens from a markdown fenced YAML block', () => {
    const result = parseDesignMarkdown(`# Brand
Some prose about the product.

\`\`\`yaml
colors:
  brand: "#7c3aed"
  canvas: "#faf5ff"
  surface-elevated: "#ffffff"
\`\`\`
`);
    expect(result.overrides.palette?.brand).toBe('#7c3aed');
    expect(result.overrides.palette?.bgSubtle).toBe('#faf5ff');
    expect(result.overrides.palette?.bg).toBe('#ffffff');
  });

  it('reads CSS custom properties', () => {
    const result = parseDesignMarkdown(`:root {
  --color-primary: #ea580c;
  --background: #fff7ed;
  --text: #7c2d12;
}
`);
    expect(result.overrides.palette?.brand).toBe('#ea580c');
    expect(result.overrides.palette?.bgSubtle).toBe('#fff7ed');
    expect(result.overrides.palette?.fg).toBe('#7c2d12');
  });

  it('converts a loose markdown list into canonical YAML and reapplies it', () => {
    const source = `- Primary Color: #4f46e5
- Font Family: Inter
- Border Radius: 12px
- Background: #f1f5f9
`;
    const normalized = normalizeDesignMarkdown(source);
    expect(normalized.converted).toBe(true);
    expect(normalized.canonical).toContain('colors:');
    expect(normalized.canonical).toContain('primary:');
    expect(normalized.overrides.palette?.brand).toBe('#4f46e5');
    expect(normalized.overrides.palette?.bgSubtle).toBe('#f1f5f9');
    expect(normalized.branding.fontFamily).toBe('Inter');
    expect(normalized.branding.borderRadius).toBe(12);
    const roundTrip = parseDesignMarkdown(normalized.canonical);
    expect(roundTrip.overrides.palette?.brand).toBe('#4f46e5');
    expect(roundTrip.overrides.palette?.bgSubtle).toBe('#f1f5f9');
  });

  it('leaves the original text unchanged when nothing can be extracted', () => {
    const source = 'This file has no theme tokens at all.';
    const normalized = normalizeDesignMarkdown(source);
    expect(normalized.converted).toBe(false);
    expect(normalized.canonical).toBe(source);
    expect(normalized.recognized).toHaveLength(0);
  });

  it('reads nested shadcn-style color scales', () => {
    const result = parseDesignMarkdown(`---
colors:
  primary:
    DEFAULT: "#0ea5e9"
    foreground: "#ffffff"
  background: "#f0f9ff"
  foreground: "#0c4a6e"
---
`);
    expect(result.overrides.palette?.brand).toBe('#0ea5e9');
    expect(result.overrides.palette?.brandContrast).toBe('#ffffff');
    expect(result.overrides.palette?.bgSubtle).toBe('#f0f9ff');
    expect(result.overrides.palette?.fg).toBe('#0c4a6e');
  });

  it('reads DTCG $value tokens and hsl()/oklch()', () => {
    const result = parseDesignMarkdown(`{
  "primary": { "$type": "color", "$value": "#16a34a" },
  "background": { "$value": "hsl(140 40% 96%)" },
  "text": { "$value": "oklch(0.25 0.02 150)" }
}`);
    expect(result.overrides.palette?.brand).toBe('#16a34a');
    expect(result.overrides.palette?.bgSubtle).toBe('hsl(140 40% 96%)');
    expect(result.overrides.palette?.fg).toBe('oklch(0.25 0.02 150)');
  });

  it('reads shadcn space-separated HSL CSS variables', () => {
    const result = parseDesignMarkdown(`:root {
  --primary: 222.2 47.4% 11.2%;
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
}`);
    expect(result.overrides.palette?.brand).toMatch(/^hsl\(/);
    expect(result.overrides.palette?.bgSubtle).toMatch(/^hsl\(/);
    expect(result.overrides.palette?.fg).toMatch(/^hsl\(/);
  });

  it('infers a palette from unlabeled hex colors in prose', () => {
    const result = parseDesignMarkdown(`
# Mood board
Accent splash #e11d48 on soft paper #fff1f2 with ink #881337.
Also a mid surface #fecdd3.
`);
    expect(result.overrides.palette?.brand).toBeDefined();
    expect(result.overrides.palette?.bgSubtle).toBeDefined();
    expect(result.overrides.palette?.fg).toBeDefined();
    expect(result.recognized.some((r) => r.field.startsWith('inferred.'))).toBe(true);
  });

  it('reads primary-500 style scale keys', () => {
    const result = parseDesignMarkdown(`---
palette:
  primary-500: "#7c3aed"
  primary-100: "#ede9fe"
  gray-900: "#111827"
---
`);
    expect(result.overrides.palette?.brand).toBe('#7c3aed');
    expect(result.overrides.palette?.fg).toBe('#111827');
  });

  it('keeps Flip7-style yellows on brand, not on page/card surfaces', () => {
    const result = normalizeDesignMarkdown(`---
colors:
  background: "#FFFFFF"
  on-surface: "#D45233"
  surface: "#FFD23F"
  surface-elevated: "#FFE47A"
  on-surface-muted: "#1E8C86"
  outline: "#FFE47A"
  primary: "#E6B800"
  primary-warm: "#FFD23F"
  primary-focus: "#E6B800"
---
`);
    const p = result.overrides.palette!;
    // Surfaces stay quiet
    expect(colorSat(p.bgSubtle!)).toBeLessThan(0.25);
    expect(relativeLum(p.bgSubtle!)).toBeGreaterThan(0.85);
    expect(p.bg!.toLowerCase()).toBe('#ffffff');
    expect(colorSat(p.bgMuted!)).toBeLessThan(0.3);
    expect(colorSat(p.border!)).toBeLessThan(0.25);
    // Accents stay loud
    expect(colorSat(p.brand!)).toBeGreaterThan(0.4);
    expect(p.brandLight?.toLowerCase()).toBe('#ffd23f');
    // Teal is not muted text
    expect(p.fgMuted!.toLowerCase()).not.toBe('#1e8c86');
    expect(p.info?.toLowerCase()).toBe('#1e8c86');
    expect(result.canonical).toContain('surface-elevated');
    expect(result.canonical.toLowerCase()).not.toMatch(/surface: "#ffd23f"/);
  });
});

function colorSat(c: string): number {
  const hex = c.replace('#', '');
  const full = hex.length === 3 ? [...hex].map((ch) => ch + ch).join('') : hex;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function relativeLum(c: string): number {
  const hex = c.replace('#', '');
  const full = hex.length === 3 ? [...hex].map((ch) => ch + ch).join('') : hex;
  const channel = (n: number) => {
    const s = n / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(Number.parseInt(full.slice(0, 2), 16))
    + 0.7152 * channel(Number.parseInt(full.slice(2, 4), 16))
    + 0.0722 * channel(Number.parseInt(full.slice(4, 6), 16));
}
