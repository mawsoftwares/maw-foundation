import type { LayoutPreset } from '../types';

/** Task/project tooling: compact docked sidebar with sections, breadcrumbs and search up top, full-width boards and timelines. */
export const projectWorkspacePreset: LayoutPreset = {
  id: 'project-workspace',
  label: 'Project Workspace',
  description: 'Compact docked sidebar, breadcrumb header with search and full-width, dense content for boards and timelines.',
  settings: {
    density: 'compact',
    sidebar: { enabled: true, position: 'left', variant: 'docked', width: 'sm', collapsible: true, defaultCollapsed: false, top: ['brand'], bottom: ['user-menu'] },
    header: { enabled: true, variant: 'default', sticky: true, start: ['breadcrumbs'], end: ['search', 'notifications', 'actions'] },
    rightPanel: { enabled: false, width: 'md', collapsible: true, defaultOpen: false },
    footer: { enabled: false },
    content: { width: 'full' },
    responsive: { sidebarCollapseBelow: 'lg', rightPanelHideBelow: 'xl', mobileNavigation: 'drawer' },
    shape: { frame: 'full-bleed', corners: 'soft', nav: 'rounded' },
  },
};
