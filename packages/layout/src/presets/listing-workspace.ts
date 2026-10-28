import type { LayoutPreset } from '../types';

/** Browse/search shell: docked sidebar, search-first header, contained card/table content; bottom tab bar on phones. */
export const listingWorkspacePreset: LayoutPreset = {
  id: 'listing-workspace',
  label: 'Listing Workspace',
  description: 'Docked sidebar and a search-first header around contained listings; a bottom tab bar on phones.',
  suggestedThemeId: 'violet-studio',
  settings: {
    density: 'comfortable',
    sidebar: { enabled: true, position: 'left', variant: 'docked', width: 'md', collapsible: true, defaultCollapsed: false, labels: 'beside', expandOnHover: false, top: ['brand'], bottom: ['user-menu'] },
    header: { enabled: true, variant: 'prominent', sticky: true, start: ['search'], end: ['theme-toggle', 'notifications', 'actions'] },
    rightPanel: { enabled: false, width: 'md', collapsible: true, defaultOpen: false },
    footer: { enabled: true },
    content: { width: 'contained' },
    responsive: { sidebarCollapseBelow: 'md', rightPanelHideBelow: 'lg', mobileNavigation: 'bottom-bar' },
    shape: { frame: 'inset', corners: 'soft', nav: 'pill', indicator: 'dot' },
    motion: { sidebar: 'spring', items: 'scale', page: 'rise', nav: 'stagger' },
  },
};
