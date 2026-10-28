import {
  analyticsDashboardPreset,
  classicAdminPreset,
  communicationWorkspacePreset,
  enterpriseDashboardPreset,
  floatingSidebarPreset,
  listingWorkspacePreset,
  projectWorkspacePreset,
  splitWorkspacePreset,
} from './presets';
import { createLayoutRegistry } from './registry';

/** The shared registry with the built-in presets. Apps add their own via `registerPreset`; the core never changes. */
export const defaultLayoutRegistry = createLayoutRegistry({
  presets: [
    classicAdminPreset,
    floatingSidebarPreset,
    enterpriseDashboardPreset,
    splitWorkspacePreset,
    communicationWorkspacePreset,
    analyticsDashboardPreset,
    projectWorkspacePreset,
    listingWorkspacePreset,
  ],
});
