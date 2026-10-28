import { setUIKit } from '@mawsoftwares/ui-contract';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { classicAdminPreset, defaultLayoutRegistry, enterpriseDashboardPreset, listingWorkspacePreset, splitWorkspacePreset, createMemoryProjectUiStore } from '@mawsoftwares/layout';
import { createThemeRegistry, starterThemes } from '@mawsoftwares/theme';
import { ThemeGallery } from './ThemeGallery';
import { HeroBanner, ProfileCard } from '../showcase';
import { LayoutStudio } from './LayoutStudio';
import { ShellPreview } from './ShellPreview';

const preview = (preset = classicAdminPreset, viewport: 'desktop' | 'tablet' | 'mobile' = 'desktop', extra: { scale?: number; cssVars?: Record<string, string> } = {}): string =>
  renderToStaticMarkup(createElement(ShellPreview, { presetId: preset.id, label: preset.label, settings: preset.settings, viewport, ...extra }));

describe('ShellPreview (the real shell)', () => {
  it('is an inert image with a text alternative describing the layout at that viewport', () => {
    const html = preview(enterpriseDashboardPreset, 'mobile');
    expect(html).toContain('role="img"');
    expect(html).toContain('inert');
    expect(html).toContain('Mobile preview: navigation in a menu drawer');
  });

  it('renders the real app chrome with sample content: navigation, header, page content, landmarks', () => {
    const html = preview(classicAdminPreset);
    for (const t of ['Total orders', 'Orders (12 months)', 'Welcome back', 'Recent activity']) expect(html, t).toContain(t);
    expect(html).toContain('<main');
  });

  it('evaluates responsive rules at the preview width, not the window: mobile gets the menu button and no footer', () => {
    const mobile = preview(enterpriseDashboardPreset, 'mobile');
    expect(mobile).toContain('aria-label="Menu"');
    expect(mobile).not.toContain('Powered by');
    expect(preview(enterpriseDashboardPreset, 'desktop')).not.toContain('aria-label="Menu"');
  });

  it('lays the header components of each group out in a row, whatever each one renders', () => {
    const html = preview(enterpriseDashboardPreset, 'desktop');
    expect(html).toContain('display:flex;align-items:center;gap:var(--maw-space-sm);min-width:0');
    expect(html).toContain('aria-label="Notifications"');
  });

  it('applies layout shape: inset frame shows the card, pill navigation sets the item radius', () => {
    const inset = preview(splitWorkspacePreset);
    expect(inset).toContain('--maw-shell-radius:24px');
    expect(inset).toContain('--maw-comp-nav-item-border-radius:9999px');
    const full = preview(classicAdminPreset);
    expect(full).not.toContain('--maw-comp-nav-item-border-radius:9999px');
  });

  it('keeps theme variables inside the frame and honours the thumbnail scale', () => {
    const html = preview(classicAdminPreset, 'desktop', { cssVars: { '--maw-brand': '#123456' }, scale: 0.25 });
    expect(html).toContain('--maw-brand:#123456');
    expect(html).toContain('transform:scale(0.25)');
  });

  it('shows the bottom tab bar on mobile for layouts that ask for it', () => {
    expect(preview(listingWorkspacePreset, 'mobile')).toContain('aria-label="Primary"');
    expect(preview(classicAdminPreset, 'mobile')).not.toContain('aria-label="Primary"');
  });
});

describe('LayoutStudio (initial render)', () => {
  const store = createMemoryProjectUiStore();
  const render = (can: (p: string) => boolean): string => renderToStaticMarkup(createElement(LayoutStudio, { store, can }));

  it('shows every preset in the gallery and the three viewport buttons', () => {
    const html = render(() => true);
    for (const label of ['Classic Admin', 'Floating Sidebar', 'Enterprise Dashboard', 'Desktop', 'Tablet', 'Mobile']) expect(html).toContain(label);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Nothing here changes the live application until you publish');
  });

  it('offers "Preview in the app" only when the host can show it, and to read-only viewers too (it changes nothing)', () => {
    const withPreview = (can: (p: string) => boolean): string => renderToStaticMarkup(createElement(LayoutStudio, { store, can, onPreview: () => undefined }));
    expect(render(() => true)).not.toContain('Preview in the app');
    expect(withPreview(() => true)).toContain('Preview in the app');
    expect(withPreview((p) => p === 'Read_Layout')).toMatch(/<button(?![^>]*disabled)[^>]*>Preview in the app/);
  });

  it('is read-only without Update_Layout and says why', () => {
    const html = render((p) => p === 'Read_Layout');
    expect(html).toContain('requires Update_Layout');
    const gallery = html.slice(html.indexOf('aria-label="Layout presets"'), html.indexOf('customisation'));
    const presetButtons = gallery.match(/<button[^>]*aria-pressed="(?:true|false)"[^>]*>/g) ?? [];
    expect(presetButtons.length).toBeGreaterThanOrEqual(3);
    for (const b of presetButtons) expect(b).toContain('disabled');
    // Viewing is still allowed: the preview toggles stay enabled.
    expect(html).toMatch(/<button[^>]*aria-pressed="false"(?![^>]*disabled)[^>]*>/);
  });

  it('does not offer the read-only notice to editors', () => {
    expect(render(() => true)).not.toContain('requires Update_Layout');
  });
});

describe('kit notice', () => {
  const store = createMemoryProjectUiStore();
  const html = (): string => renderToStaticMarkup(createElement(LayoutStudio, { store, can: () => true }));

  it('warns when the active UI kit has no shell of its own, and stays quiet when it has', () => {
    setUIKit({});
    expect(html()).toContain('using the default UI kit');
    setUIKit({ AppShellView: () => null });
    expect(html()).not.toContain('using the default UI kit');
    setUIKit({});
  });
});

describe('suggested themes', () => {
  it('every preset that suggests a theme names a starter theme that exists, and the suggestions differ so the gallery looks varied', () => {
    const known = new Set(starterThemes.map((t) => t.id));
    const suggested = defaultLayoutRegistry.listPresets().flatMap((p) => (p.suggestedThemeId === undefined ? [] : [p.suggestedThemeId]));
    expect(suggested.length).toBeGreaterThanOrEqual(6);
    for (const id of suggested) expect(known.has(id), id).toBe(true);
    expect(new Set(suggested).size).toBeGreaterThanOrEqual(6);
  });
});

describe('ThemeGallery (direct theme selection)', () => {
  const themes = createThemeRegistry(starterThemes);
  const selection = { themeId: null, colorMode: 'light', typography: 'default', spacing: 'default' } as const;
  const html = (value: string | null, extra: { disabled?: boolean; compact?: boolean } = {}): string =>
    renderToStaticMarkup(createElement(ThemeGallery, { themes, value, onSelect: () => undefined, selection, prefersDark: false, ...extra }));

  it('shows the application default and one named card per theme, each as a radio', () => {
    const out = html(null);
    expect(out).toContain('role="radiogroup"');
    expect((out.match(/role="radio"/g) ?? []).length).toBe(starterThemes.length + 1);
    for (const t of starterThemes) expect(out, t.id).toContain(t.label!);
    expect(out).toContain('Application default');
  });

  it('marks only the chosen theme, and each card is drawn with that theme\'s own colours', () => {
    const out = html('aurora');
    expect((out.match(/aria-checked="true"/g) ?? []).length).toBe(1);
    expect(out).toMatch(/Aurora ✓/);
    expect(out).toContain('--maw-shell-bg:#14163a'); // the Aurora sidebar colour, scoped to its card
  });

  it('can be disabled (read-only viewers) and compact (no descriptions)', () => {
    expect(html(null, { disabled: true })).toMatch(/<button[^>]*role="radio"[^>]*disabled/);
    expect(html(null, { compact: true })).not.toContain(starterThemes[0]!.description!);
  });
});

describe('HeroBanner and ProfileCard (reference-style widgets)', () => {
  it('hero banner shows greeting, subtitle, action and decorative art that assistive technology skips', () => {
    const html = renderToStaticMarkup(createElement(HeroBanner, { title: 'Welcome back', subtitle: 'Have a nice day', action: 'GO', art: 'ART' }));
    for (const t of ['Welcome back', 'Have a nice day', 'GO', 'ART']) expect(html, t).toContain(t);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('linear-gradient');
    expect(renderToStaticMarkup(createElement(HeroBanner, { title: 'T', tone: 'soft' }))).not.toContain('linear-gradient');
  });

  it('profile card shows name, role, stats and a labelled progress bar', () => {
    const html = renderToStaticMarkup(createElement(ProfileCard, { name: 'Dr K', role: 'Surgeon', stats: [{ label: 'Patients', value: '3,567' }], progress: { label: 'Limit', value: 112, max: 200 } }));
    for (const t of ['Dr K', 'Surgeon', 'Patients', '3,567', 'Limit', '112 / 200']) expect(html, t).toContain(t);
  });
});
