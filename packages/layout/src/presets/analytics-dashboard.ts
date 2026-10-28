import type { LayoutPreset } from '../types';

/** Metrics-first shell: icon rail, quiet header, contained content and an activity/summary panel on the right. */
export const analyticsDashboardPreset: LayoutPreset = {
  id: 'analytics-dashboard',
  label: 'Analytics Dashboard',
  description: 'Icon rail, quiet header and a right-hand summary panel around contained dashboard content.',
  suggestedThemeId: 'medical-blue',
  settings: {
    density: 'comfortable',
    sidebar: { enabled: true, position: 'left', variant: 'rail', width: 'sm', collapsible: false, defaultCollapsed: true, labels: 'beside', expandOnHover: true, top: ['brand'], bottom: ['user-menu'] },
    header: { enabled: true, variant: 'minimal', sticky: false, start: ['page-title'], end: ['search', 'notifications', 'actions'] },
    rightPanel: { enabled: true, width: 'md', collapsible: true, defaultOpen: true },
    footer: { enabled: false },
    content: { width: 'contained' },
    responsive: { sidebarCollapseBelow: 'md', rightPanelHideBelow: 'xl', mobileNavigation: 'drawer' },
    shape: { frame: 'inset', corners: 'round', nav: 'pill', indicator: 'fill' },
    motion: { sidebar: 'spring', items: 'lift', page: 'fade', nav: 'stagger' },
  },
};
