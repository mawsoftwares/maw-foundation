import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { classicAdminPreset, enterpriseDashboardPreset, listingWorkspacePreset, splitWorkspacePreset, createMemoryProjectUiStore } from '@mawsoftwares/layout';
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
