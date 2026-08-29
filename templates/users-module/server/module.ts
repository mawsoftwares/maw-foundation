import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

/**
 * Users Module Template — Module Definition
 *
 * Register this in apps/my-server/src/modules/index.ts:
 *   import { usersModule } from './users/module';
 *   registry.register(usersModule);
 */
export const usersModule: ModuleDefinition = {
  key: 'users',
  name: 'Users',
  description: 'User management',
  routePrefix: '/api/v1/users',
  source: 'project',        // ← project-owned source module
  audience: 'admin',
  permissions: [
    { code: 'Read_Users',   name: 'Read Users',   description: 'View user list and details' },
    { code: 'Create_Users', name: 'Create Users', description: 'Create new users' },
    { code: 'Update_Users', name: 'Update Users', description: 'Edit existing users' },
    { code: 'Delete_Users', name: 'Delete Users', description: 'Remove users' },
  ],
  featureSync: {
    code:      'users',
    name:      'User Management',
    groupCode: 'admin',
    routePath: '/users',
    icon:      'users',
    sortOrder: 1,
  },
};
