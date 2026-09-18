import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

// Theme Designer: lets a superadmin apply a live color theme by selecting a
// design.md file (parsed client-side into a TenantBranding override — see
// @mawsoftwares/theme's parseDesignMarkdown). No dedicated API routes: the
// module exists purely to register the Manage_Theme permission that gates
// the page, the same pattern feature-flags uses.
export const themeModule: ModuleDefinition = {
  key: 'theme',
  name: 'Theme Designer',
  routePrefix: '/api/v1/theme',
  audience: 'admin',
  permissions: [
    { code: 'Manage_Theme', name: 'Manage Theme', description: 'Apply a live application color theme from a design.md file' },
  ],
  featureSync: {
    code: 'theme',
    name: 'Theme Designer',
    groupCode: 'settings',
    routePath: '/admin/theme',
    icon: 'palette',
    sortOrder: 12,
    description: 'Apply a custom color theme from a design.md file',
  },
};
