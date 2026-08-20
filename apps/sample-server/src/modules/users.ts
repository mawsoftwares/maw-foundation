import type { ModuleDefinition } from '@maw/rbac-core';

export const usersModule: ModuleDefinition = {
  key: 'users',
  name: 'Users',
  routePrefix: '/api/users',
  audience: 'admin',
  permissions: [
    { code: 'Read_Users', name: 'Read Users', description: 'View user list and details' },
    { code: 'Create_Users', name: 'Create Users', description: 'Create new users' },
    { code: 'Update_Users', name: 'Update Users', description: 'Edit existing users' },
    { code: 'Delete_Users', name: 'Delete Users', description: 'Remove users' },
  ],
  featureSync: {
    code: 'users',
    name: 'User Management',
    groupCode: 'admin',
    routePath: '/admin/users',
    icon: 'users',
    sortOrder: 1,
  },
};
