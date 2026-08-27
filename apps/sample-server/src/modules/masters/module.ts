import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

export const mastersModule: ModuleDefinition = {
  key: 'masters',
  name: 'Master Data',
  routePrefix: '/api/v1/masters',
  audience: 'shared',
  permissions: [
    { code: 'Master_View', name: 'View Masters', description: 'View master data definitions and values' },
    { code: 'Master_Create', name: 'Create Masters', description: 'Create new master data definitions' },
    { code: 'Master_Edit', name: 'Edit Masters', description: 'Edit master data definitions' },
    { code: 'Master_Delete', name: 'Delete Masters', description: 'Delete master data definitions' },
    { code: 'Master_Manage_Fields', name: 'Manage Fields', description: 'Add/edit/remove fields on masters' },
    { code: 'Master_Manage_Values', name: 'Manage Values', description: 'Add/edit/remove values on masters' },
  ],
  featureSync: {
    code: 'masters',
    name: 'Master Data Management',
    groupCode: 'settings',
    routePath: '/masters',
    icon: 'database',
    sortOrder: 10,
  },
};
