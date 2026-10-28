import { describe, expect, it } from 'vitest';
import { classicAdminPreset, enterpriseDashboardPreset, floatingSidebarPreset, listingWorkspacePreset, projectWorkspacePreset, resolveLayout, splitWorkspacePreset } from '@mawsoftwares/layout';
import { composeSlot, layoutBreakpointPx, layoutMinWidthQuery, sidebarBehavior, toShellFrame } from './shell-frame';

describe('toShellFrame', () => {
  it('maps Classic Admin to the classic frame (docked, sticky, footer, no panel)', () => {
    const frame = toShellFrame(classicAdminPreset.settings, { rightPanel: 'panel', rightPanelFits: true });
    expect(frame).toMatchObject({
      sidebar: { position: 'left', variant: 'docked' },
      header: { enabled: true, variant: 'default', sticky: true },
      footer: true,
      contentWidth: 'contained',
    });
    expect(frame.rightPanel).toBeUndefined();
  });

  it('maps Floating Sidebar', () => {
    const frame = toShellFrame(floatingSidebarPreset.settings, { rightPanelFits: true });
    expect(frame.sidebar.variant).toBe('floating');
    expect(frame.header.variant).toBe('minimal');
    expect(frame.footer).toBe(false);
  });

  it('includes the right panel only when enabled, wide enough and supplied', () => {
    const s = enterpriseDashboardPreset.settings;
    expect(toShellFrame(s, { rightPanel: 'p', rightPanelFits: true }).rightPanel).toMatchObject({ content: 'p', label: 'Details', defaultOpen: true });
    expect(toShellFrame(s, { rightPanel: 'p', rightPanelFits: false }).rightPanel).toBeUndefined();
    expect(toShellFrame(s, { rightPanelFits: true }).rightPanel).toBeUndefined();
    expect(toShellFrame(s, { rightPanel: 'p', rightPanelLabel: 'Filters', rightPanelFits: true }).rightPanel?.label).toBe('Filters');
  });

  it('works from a resolved (fallback) layout too', () => {
    const resolved = resolveLayout({ version: 1, presetId: 'gone' });
    expect(toShellFrame(resolved.settings, { rightPanelFits: true }).sidebar.variant).toBe('docked');
  });
});

describe('composeSlot', () => {
  it('keeps order, skips ids with no renderer or empty renderers', () => {
    expect(composeSlot(['a', 'missing', 'b', 'empty', 'off'], { a: 'A', b: 'B', empty: null, off: false })).toEqual(['A', 'B']);
  });
});

describe('breakpoints', () => {
  it('uses the theme breakpoint widths', () => {
    expect(layoutBreakpointPx('md')).toBe(768);
    expect(layoutMinWidthQuery('lg')).toBe('(min-width: 1024px)');
  });
});

describe('sidebarBehavior', () => {
  it('classic admin: collapsible, 260px (the existing shell width), keeps the app brand and footer', () => {
    expect(sidebarBehavior(classicAdminPreset.settings)).toEqual({
      forceRail: false, collapsible: true, widthPx: 260, showBrand: true, showFooter: true, topExtras: [], bottomExtras: [],
    });
  });

  it('rail layouts are forced to the rail with no expand button', () => {
    expect(sidebarBehavior(splitWorkspacePreset.settings)).toMatchObject({ forceRail: true, collapsible: false });
  });

  it('width follows the setting; extra approved ids are passed through, brand/user-menu are not extras', () => {
    expect(sidebarBehavior(projectWorkspacePreset.settings).widthPx).toBe(200);
    const custom = { ...classicAdminPreset.settings, sidebar: { ...classicAdminPreset.settings.sidebar, top: ['brand', 'search'], bottom: ['theme-toggle'] } };
    expect(sidebarBehavior(custom)).toMatchObject({ showBrand: true, showFooter: false, topExtras: ['search'], bottomExtras: ['theme-toggle'] });
  });

  it('hides the app brand when `brand` is not listed', () => {
    const custom = { ...classicAdminPreset.settings, sidebar: { ...classicAdminPreset.settings.sidebar, top: [] } };
    expect(sidebarBehavior(custom).showBrand).toBe(false);
  });
});

describe('mobile navigation in the frame', () => {
  it('passes the bottom bar through only for `bottom-bar` layouts', () => {
    expect(toShellFrame(listingWorkspacePreset.settings, { mobileNav: 'NAV', rightPanelFits: true }).mobileNav).toBe('NAV');
    expect(toShellFrame(classicAdminPreset.settings, { mobileNav: 'NAV', rightPanelFits: true }).mobileNav).toBeUndefined();
  });
});
