import type { LayoutPreset } from '../types';

/** Today's MAW shell: docked left sidebar, sticky header with breadcrumbs, scrolling content, footer. */
export const classicAdminPreset: LayoutPreset = {
  id: 'classic-admin',
  label: 'Classic Admin',
  description: 'Docked left sidebar, sticky top header and a contained content area. The default MAW shell.',
  suggestedThemeId: 'maw-console',
  settings: {
    density: 'comfortable',
    sidebar: {
      enabled: true,
      position: 'left',
      variant: 'docked',
      width: 'md',
      collapsible: true,
      defaultCollapsed: false,
      labels: 'beside',
      expandOnHover: false,
      top: ['brand'],
      bottom: ['user-menu'],
    },
    header: { enabled: true, variant: 'default', sticky: true, start: ['breadcrumbs'], end: ['actions'] },
    rightPanel: { enabled: false, width: 'md', collapsible: true, defaultOpen: false },
    footer: { enabled: true },
    content: { width: 'contained' },
    responsive: { sidebarCollapseBelow: 'md', rightPanelHideBelow: 'lg', mobileNavigation: 'drawer' },
    shape: { frame: 'full-bleed', corners: 'soft', nav: 'rounded', indicator: 'fill' },
    motion: { sidebar: 'smooth', items: 'slide', page: 'none', nav: 'none' },
  },
};
