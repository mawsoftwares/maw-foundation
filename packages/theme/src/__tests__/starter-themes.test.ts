import { describe, expect, it } from 'vitest';
import { contrastRatio, createTheme, createThemeRegistry, parseColor, starterThemes, tokensToCssVars, type Rgba } from '../index';

const rgb = (c: string): Rgba => {
  const p = parseColor(c);
  if (p === undefined) throw new Error(`unparseable colour ${c}`);
  return p;
};
const ratio = (fg: string, bg: string): number => contrastRatio(rgb(fg), rgb(bg));
const AA = 4.5;

describe('starter themes', () => {
  const registry = createThemeRegistry(starterThemes);

  it('ships twelve themes with unique ids that all resolve', () => {
    expect(registry.ids()).toEqual(['medical-blue', 'violet-studio', 'midnight-rose', 'clean-light', 'aurora', 'slate-minimal', 'emerald-fresh', 'ocean-teal', 'sunset-coral', 'graphite', 'lavender-soft', 'royal-navy']);
    for (const id of registry.ids()) expect(() => registry.resolve(id)).not.toThrow();
  });

  it('every theme has a display name and a one-line description for pickers', () => {
    for (const def of starterThemes) {
      expect(def.label, def.id).toBeTruthy();
      expect((def.description ?? '').length, def.id).toBeGreaterThan(10);
      expect(registry.get(def.id)?.label).toBe(def.label);
    }
  });

  describe.each(starterThemes.map((t) => t.id))('%s', (id) => {
    const theme = registry.resolve(id);
    const light = tokensToCssVars(false, theme);
    const dark = tokensToCssVars(true, theme);

    it.each([['light', theme.light], ['dark', theme.dark]] as const)('%s palette: body, muted and brand text meet WCAG AA', (_mode, p) => {
      expect(ratio(p.fg, p.bg), 'fg on bg').toBeGreaterThanOrEqual(AA);
      expect(ratio(p.fg, p.bgSubtle), 'fg on canvas').toBeGreaterThanOrEqual(AA);
      expect(ratio(p.fgMuted, p.bg), 'fgMuted on bg').toBeGreaterThanOrEqual(AA);
      expect(ratio(p.fgMuted, p.bgSubtle), 'fgMuted on canvas').toBeGreaterThanOrEqual(AA);
      expect(ratio(p.brandContrast, p.brand), 'text on brand buttons').toBeGreaterThanOrEqual(AA);
      expect(ratio(p.brand, p.bg), 'brand links on bg').toBeGreaterThanOrEqual(3);
    });

    it('sidebar text, group labels and the active item are legible (light mode)', () => {
      const shellBg = light['--maw-shell-bg']!;
      if (shellBg.startsWith('rgba')) return;
      expect(ratio(light['--maw-shell-fg']!, shellBg), 'sidebar text').toBeGreaterThanOrEqual(AA);
      const muted = parseColor(light['--maw-shell-fg-muted']!);
      if (muted !== undefined) expect(contrastRatio(muted, rgb(shellBg), rgb(shellBg)), 'sidebar muted text').toBeGreaterThanOrEqual(AA);
      const idle = parseColor(light['--maw-comp-nav-item-text-color'] ?? '');
      if (idle !== undefined) expect(contrastRatio(idle, rgb(shellBg), rgb(shellBg)), 'idle nav item').toBeGreaterThanOrEqual(AA);
      const activeBg = light['--maw-comp-nav-item-active-background'];
      const activeFg = light['--maw-comp-nav-item-active-text-color'];
      if (activeBg !== undefined && activeFg !== undefined) expect(ratio(activeFg, activeBg), 'active item').toBeGreaterThanOrEqual(AA);
    });

    it('dark mode keeps a readable sidebar', () => {
      expect(ratio(dark['--maw-shell-fg']!, dark['--maw-shell-bg']!)).toBeGreaterThanOrEqual(AA);
    });
  });

  it('coloured-sidebar themes style the whole nav item, header and logo through tokens', () => {
    const vars = tokensToCssVars(false, registry.resolve('medical-blue'));
    expect(vars['--maw-shell-bg']).toBe('#2f5bd9');
    expect(vars['--maw-comp-nav-item-active-background']).toBe('#ffffff');
    expect(vars['--maw-comp-nav-item-hover-background']).toBe('rgba(255, 255, 255, 0.14)');
    expect(vars['--maw-comp-nav-item-hover-text-color']).toBe('#ffffff');
    expect(vars['--maw-shell-header-bg']).toBe('#ffffff');
    expect(vars['--maw-shell-logo']).toBe('#ffffff');
  });

  it('are layered over the defaults, so everything they do not set stays as designed', () => {
    const t = registry.resolve('clean-light');
    expect(t.typography.fontFamily).toBe(createTheme().typography.fontFamily);
    expect(t.radius.md).toBe(10);
  });
});
