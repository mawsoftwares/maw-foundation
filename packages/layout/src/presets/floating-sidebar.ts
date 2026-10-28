import type { LayoutPreset } from '../types';

/** Inset, card-style sidebar over a tinted canvas; minimal header; no footer chrome. */
export const floatingSidebarPreset: LayoutPreset = {
  id: 'floating-sidebar',
  label: 'Floating Sidebar',
  description: 'A rounded, inset sidebar floating over the canvas with a minimal header.',
  settings: {
    density: 'comfortable',
    sidebar: {
      enabled: true,
      position: 'left',
      variant: 'floating',
      width: 'md',
      collapsible: true,
      defaultCollapsed: false,
      top: ['brand'],
      bottom: ['user-menu'],
    },
    header: { enabled: true, variant: 'minimal', sticky: false, start: ['page-title'], end: ['search', 'notifications', 'actions'] },
    rightPanel: { enabled: false, width: 'md', collapsible: true, defaultOpen: false },
    footer: { enabled: false },
    content: { width: 'contained' },
    responsive: { sidebarCollapseBelow: 'md', rightPanelHideBelow: 'lg', mobileNavigation: 'drawer' },
    shape: { frame: 'full-bleed', corners: 'round', nav: 'rounded' },
  },
};
