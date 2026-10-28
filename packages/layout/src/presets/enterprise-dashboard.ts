import type { LayoutPreset } from '../types';

/** Dense, full-width workspace: collapsible sidebar, prominent header with search, optional right panel. */
export const enterpriseDashboardPreset: LayoutPreset = {
  id: 'enterprise-dashboard',
  label: 'Enterprise Dashboard',
  description: 'Full-width, compact workspace with a prominent header, search and an optional right-hand panel.',
  suggestedThemeId: 'slate-minimal',
  settings: {
    density: 'compact',
    sidebar: {
      enabled: true,
      position: 'left',
      variant: 'docked',
      width: 'sm',
      collapsible: true,
      defaultCollapsed: false,
      labels: 'beside',
      expandOnHover: false,
      top: ['brand'],
      bottom: ['user-menu'],
    },
    header: {
      enabled: true,
      variant: 'prominent',
      sticky: true,
      start: ['search'],
      end: ['theme-toggle', 'notifications', 'actions'],
    },
    rightPanel: { enabled: true, width: 'md', collapsible: true, defaultOpen: true },
    footer: { enabled: true },
    content: { width: 'full' },
    responsive: { sidebarCollapseBelow: 'lg', rightPanelHideBelow: 'xl', mobileNavigation: 'drawer' },
    shape: { frame: 'full-bleed', corners: 'soft', nav: 'rounded', indicator: 'bar' },
    motion: { sidebar: 'smooth', items: 'slide', page: 'none' },
  },
};
