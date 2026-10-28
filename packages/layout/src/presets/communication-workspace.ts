import type { LayoutPreset } from '../types';

/** Chat/inbox shell: icon rail, prominent header with search, full-width panes and a profile/details panel. */
export const communicationWorkspacePreset: LayoutPreset = {
  id: 'communication-workspace',
  label: 'Communication Workspace',
  description: 'Icon rail, search header and full-width panes with a details panel — for chat and inbox apps.',
  suggestedThemeId: 'violet-studio',
  settings: {
    density: 'compact',
    sidebar: { enabled: true, position: 'left', variant: 'rail', width: 'sm', collapsible: false, defaultCollapsed: true, labels: 'below', expandOnHover: false, top: ['brand'], bottom: ['user-menu'] },
    header: { enabled: true, variant: 'prominent', sticky: true, start: ['search'], end: ['notifications', 'actions'] },
    rightPanel: { enabled: true, width: 'md', collapsible: true, defaultOpen: true },
    footer: { enabled: false },
    content: { width: 'full' },
    responsive: { sidebarCollapseBelow: 'md', rightPanelHideBelow: 'xl', mobileNavigation: 'drawer' },
    shape: { frame: 'inset', corners: 'round', nav: 'rounded', indicator: 'fill' },
    motion: { sidebar: 'spring', items: 'lift', page: 'fade' },
  },
};
