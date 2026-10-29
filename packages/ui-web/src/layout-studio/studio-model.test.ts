import { describe, expect, it, vi } from 'vitest';
import { classicAdminPreset, enterpriseDashboardPreset, floatingSidebarPreset, listingWorkspacePreset, splitWorkspacePreset, DEFAULT_THEME_SELECTION, TYPOGRAPHY_PRESETS } from '@mawsoftwares/layout';
import { createThemeRegistry, createTheme, tokensToCssVars } from '@mawsoftwares/theme';
import { describePreview, previewState } from './viewport';
import { composeProjectTheme, previewCssVars, themeSelectionToOverrides } from './theme-selection';

describe('previewState', () => {
  it('classic admin: docked sidebar and footer on desktop, drawer and no footer on mobile', () => {
    const d = previewState(classicAdminPreset.settings, 1280);
    expect(d).toMatchObject({ isMobile: false, sidebar: 'docked', footer: true, rightPanel: false, header: true });
    const m = previewState(classicAdminPreset.settings, 390);
    expect(m).toMatchObject({ isMobile: true, sidebar: 'drawer', footer: false, header: true });
  });

  it('uses each layout\'s own breakpoints: enterprise collapses below lg and shows the panel from xl', () => {
    const s = enterpriseDashboardPreset.settings;
    expect(previewState(s, 820).sidebar).toBe('drawer');
    expect(previewState(s, 1100)).toMatchObject({ sidebar: 'docked', rightPanel: false });
    expect(previewState(s, 1280).rightPanel).toBe(true);
    expect(previewState(classicAdminPreset.settings, 820).sidebar).toBe('docked');
  });

  it('floating variant, disabled sidebar and header', () => {
    expect(previewState(floatingSidebarPreset.settings, 1280).sidebar).toBe('floating');
    const noSide = { ...classicAdminPreset.settings, sidebar: { ...classicAdminPreset.settings.sidebar, enabled: false } };
    expect(previewState(noSide, 1280).sidebar).toBe('none');
    const noHeader = { ...classicAdminPreset.settings, header: { ...classicAdminPreset.settings.header, enabled: false } };
    expect(previewState(noHeader, 1280).header).toBe(false);
    expect(previewState(noHeader, 390).header).toBe(true);
  });

  it('bottom bar only on mobile, and only when the layout asks for it', () => {
    expect(previewState(listingWorkspacePreset.settings, 390)).toMatchObject({ bottomBar: true, sidebar: 'drawer' });
    expect(previewState(listingWorkspacePreset.settings, 1280).bottomBar).toBe(false);
    expect(previewState(classicAdminPreset.settings, 390).bottomBar).toBe(false);
    expect(describePreview(previewState(listingWorkspacePreset.settings, 390))).toContain('bottom bar');
  });

  it('rail layouts render as a rail on desktop', () => {
    expect(previewState(splitWorkspacePreset.settings, 1280).sidebar).toBe('rail');
  });

  it('describes the layout in words', () => {
    expect(describePreview(previewState(enterpriseDashboardPreset.settings, 1280))).toBe(
      'docked sidebar on the left, prominent header, right panel, footer, full width content, compact density',
    );
    expect(describePreview(previewState(classicAdminPreset.settings, 390))).toContain('navigation in a menu drawer');
  });
});

describe('themeSelectionToOverrides', () => {
  const registry = createThemeRegistry([{ id: 'brand', overrides: { branding: { primaryColor: '#ff0000' } } }]);

  it('leaves everything untouched for the default selection', () => {
    expect(themeSelectionToOverrides(DEFAULT_THEME_SELECTION, registry)).toBeUndefined();
  });

  it('returns the registry theme alone when presets are default; ignores unknown ids', () => {
    expect(themeSelectionToOverrides({ ...DEFAULT_THEME_SELECTION, themeId: 'brand' }, registry)).toEqual(registry.resolveOverrides('brand'));
    expect(themeSelectionToOverrides({ ...DEFAULT_THEME_SELECTION, themeId: 'gone' }, registry)).toBeUndefined();
  });

  it('scales spacing and type over the chosen theme, keeping its brand', () => {
    const o = themeSelectionToOverrides({ ...DEFAULT_THEME_SELECTION, themeId: 'brand', spacing: 'spacious', typography: 'compact' }, registry)!;
    expect(o.branding?.primaryColor).toBe('#ff0000');
    const base = createTheme();
    expect(o.spacing?.['md']).toBe(Math.round(base.spacing.md * 1.25));
    expect(o.extraTokens?.['text-md']).toBe(`${Math.round(base.typography.size.md * 0.92 * 10) / 10}px`);
  });

  it('is reflected in the emitted CSS variables used by the scoped preview', () => {
    const vars = previewCssVars({ ...DEFAULT_THEME_SELECTION, spacing: 'compact', typography: 'comfortable' }, registry, false);
    expect(vars['--maw-space-md']).toBe(`${Math.round(createTheme().spacing.md * 0.8)}px`);
    expect(vars['--maw-text-md']).toBe(`${Math.round(createTheme().typography.size.md * 1.08 * 10) / 10}px`);
  });

  it('picks dark tokens for dark mode, and for system when the OS prefers dark', () => {
    const light = tokensToCssVars(false)['--maw-bg'];
    const dark = tokensToCssVars(true)['--maw-bg'];
    expect(previewCssVars({ ...DEFAULT_THEME_SELECTION, colorMode: 'dark' }, undefined, false)['--maw-bg']).toBe(dark);
    expect(previewCssVars({ ...DEFAULT_THEME_SELECTION, colorMode: 'system' }, undefined, true)['--maw-bg']).toBe(dark);
    expect(previewCssVars({ ...DEFAULT_THEME_SELECTION, colorMode: 'system' }, undefined, false)['--maw-bg']).toBe(light);
  });
});

describe('composeProjectTheme', () => {
  const registry = createThemeRegistry([{ id: 'brand', overrides: { branding: { primaryColor: '#ff0000' } } }]);
  const shared = { branding: { primaryColor: '#00ff00', fontFamily: 'Georgia' } };

  it('applies nothing when nothing is configured', () => {
    expect(composeProjectTheme(undefined, undefined, registry)).toBeUndefined();
    expect(composeProjectTheme(undefined, DEFAULT_THEME_SELECTION, registry)).toBeUndefined();
  });

  it('keeps the tenant\'s shared theme when the project selects nothing', () => {
    expect(composeProjectTheme(shared, DEFAULT_THEME_SELECTION, registry)).toBe(shared);
    expect(composeProjectTheme(shared, undefined, registry)).toBe(shared);
  });

  it('layers the project selection over the shared theme, keeping shared tokens it does not touch', () => {
    const o = composeProjectTheme(shared, { ...DEFAULT_THEME_SELECTION, themeId: 'brand' }, registry)!;
    expect(o.branding?.primaryColor).toBe('#ff0000');
    expect(o.branding?.fontFamily).toBe('Georgia');
  });

  it('uses the selection alone when there is no shared theme', () => {
    expect(composeProjectTheme(undefined, { ...DEFAULT_THEME_SELECTION, themeId: 'brand' }, registry)).toEqual(registry.resolveOverrides('brand'));
  });
});

describe('custom colours', () => {
  const light = (colors: NonNullable<(typeof DEFAULT_THEME_SELECTION)['colors']>): Record<string, string> => previewCssVars({ ...DEFAULT_THEME_SELECTION, colorMode: 'light', colors }, undefined, false);

  it('brand colour sets the brand with a readable text colour on it', () => {
    expect(light({ brand: '#ffe14d' })['--maw-brand']).toBe('#ffe14d');
    expect(light({ brand: '#ffe14d' })['--maw-brandContrast']).toBe('#0f172a');
    expect(light({ brand: '#1a2b6d' })['--maw-brandContrast']).toBe('#ffffff');
  });

  it('sidebar colour sets the sidebar and flips its text for light backgrounds', () => {
    const dark = light({ sidebar: '#101040' });
    expect(dark['--maw-shell-bg']).toBe('#101040');
    expect(dark['--maw-shell-fg']).toBe('#ffffff');
    expect(light({ sidebar: '#f4f4f8' })['--maw-shell-fg']).toBe('#0f172a');
  });

  it('page colour sets the canvas, and colours layer over the chosen theme and the typography presets', () => {
    expect(light({ page: '#fafafa' })['--maw-canvas']).toBe('#fafafa');
    const scaled = themeSelectionToOverrides({ ...DEFAULT_THEME_SELECTION, spacing: 'compact', colors: { brand: '#336699' } });
    expect(scaled?.palette?.brand).toBe('#336699');
    expect(scaled?.spacing).toBeDefined();
  });

  it('no colours chosen leaves the theme untouched', () => {
    expect(themeSelectionToOverrides({ ...DEFAULT_THEME_SELECTION, colors: {} })).toBeUndefined();
  });
});

describe('preview isolation from the running app\'s theme', () => {
  it('resets shell and component variables the app set on the page root but the preview theme does not define', () => {
    const names = ['--maw-comp-nav-item-text-color', '--maw-shell-test-only', '--maw-brand'];
    vi.stubGlobal('document', { documentElement: { style: { length: names.length, item: (i: number) => names[i] } } });
    try {
      const vars = previewCssVars({ ...DEFAULT_THEME_SELECTION, colorMode: 'light' }, undefined, false);
      expect(vars['--maw-comp-nav-item-text-color']).toBe('initial');
      expect(vars['--maw-shell-test-only']).toBe('initial');
      expect(vars['--maw-shell-bg']).toBe('#ffffff'); // the preview theme's own value is kept
      expect(vars['--maw-brand']).not.toBe('initial'); // only shell and component variables are reset
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('preview over the app\'s shared theme', () => {
  const shared = { palette: { brand: '#0b5ed7' }, shell: { bg: '#e8f0fb', fg: '#14253d' } };

  it('with no theme chosen, shows the shared theme (what the app shows), not the built-in default', () => {
    const vars = previewCssVars({ ...DEFAULT_THEME_SELECTION, colorMode: 'light' }, undefined, false, shared);
    expect(vars['--maw-brand']).toBe('#0b5ed7');
    expect(vars['--maw-shell-bg']).toBe('#e8f0fb');
  });

  it('a chosen theme is layered over it, and a custom colour over that', () => {
    const registry = createThemeRegistry([{ id: 'plum', overrides: { palette: { brand: '#7a1f5c' } } }]);
    expect(previewCssVars({ ...DEFAULT_THEME_SELECTION, themeId: 'plum', colorMode: 'light' }, registry, false, shared)['--maw-brand']).toBe('#7a1f5c');
    expect(previewCssVars({ ...DEFAULT_THEME_SELECTION, themeId: 'plum', colorMode: 'light', colors: { brand: '#112233' } }, registry, false, shared)['--maw-brand']).toBe('#112233');
  });
});

describe('font size (whole app)', () => {
  const base = (typography: 'small' | 'default' | 'xlarge'): Record<string, string> => previewCssVars({ ...DEFAULT_THEME_SELECTION, colorMode: 'light', typography }, undefined, false);

  it('scales px text tokens and the root font scale together, in six steps', () => {
    expect(TYPOGRAPHY_PRESETS).toEqual(['small', 'compact', 'default', 'comfortable', 'large', 'xlarge']);
    const small = base('small');
    const big = base('xlarge');
    const normal = base('default');
    expect(parseFloat(big['--maw-text-md']!)).toBeGreaterThan(parseFloat(normal['--maw-text-md']!));
    expect(parseFloat(small['--maw-text-md']!)).toBeLessThan(parseFloat(normal['--maw-text-md']!));
    expect(big['--maw-font-scale']).toBe('1.3');
    expect(small['--maw-font-scale']).toBe('0.85');
    expect(normal['--maw-font-scale']).toBeUndefined();
  });
});
