import { describe, it, expect } from 'vitest';
import { parseDesignMarkdown, storedDesignToOverrides, createTheme, tokensToCssVars } from '../index';

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
});
