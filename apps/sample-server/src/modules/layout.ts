import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

// Layout Studio: registers the permissions that gate viewing, editing (draft) and publishing the application
// layout. Routes and persistence arrive with the project-integration phase; this module only declares the
// permissions so roles can be assigned them now. Same pattern as the theme module.
export const layoutModule: ModuleDefinition = {
  key: 'layout',
  name: 'Layout Studio',
  routePrefix: '/api/v1/layout',
  audience: 'admin',
  permissions: [
    { code: 'Read_Layout', name: 'Read Layout', description: 'Open Layout Studio and view draft layouts and history' },
    { code: 'Update_Layout', name: 'Update Layout', description: 'Edit and save the draft layout (does not change what users see)' },
    { code: 'Publish_Layout', name: 'Publish Layout', description: 'Publish a draft as the live layout and roll back to earlier versions' },
  ],
  featureSync: {
    code: 'layout',
    name: 'Layout Studio',
    groupCode: 'settings',
    routePath: '/admin/layout',
    icon: 'layout',
    sortOrder: 13,
    description: 'Choose and publish the application layout',
  },
};
