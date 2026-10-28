import type { LayoutPreset } from '../types';

/** Dark icon rail and a full-bleed workspace: picker/launcher style apps. Header kept minimal so app actions stay reachable. */
export const splitWorkspacePreset: LayoutPreset = {
  id: 'split-workspace',
  label: 'Split Workspace',
  description: 'A slim icon rail beside a full-bleed workspace, with only a minimal header.',
  suggestedThemeId: 'midnight-rose',
  settings: {
    density: 'comfortable',
    sidebar: { enabled: true, position: 'left', variant: 'rail', width: 'sm', collapsible: false, defaultCollapsed: true, labels: 'beside', expandOnHover: true, top: ['brand'], bottom: ['user-menu'] },
    header: { enabled: true, variant: 'minimal', sticky: false, start: [], end: ['actions'] },
    rightPanel: { enabled: false, width: 'md', collapsible: true, defaultOpen: false },
    footer: { enabled: false },
    content: { width: 'full' },
    responsive: { sidebarCollapseBelow: 'md', rightPanelHideBelow: 'lg', mobileNavigation: 'drawer' },
    shape: { frame: 'inset', corners: 'round', nav: 'pill', indicator: 'fill' },
    motion: { sidebar: 'smooth', items: 'lift', page: 'rise' },
  },
};
