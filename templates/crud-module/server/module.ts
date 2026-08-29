import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

/**
 * CRUD Module Template — Module Definition
 *
 * REPLACE: `entities` → your module key; update routePrefix and permissions.
 * This object is registered in apps/my-server/src/modules/index.ts.
 */
export const entitiesModule: ModuleDefinition = {
  key: 'entities',
  name: 'Entities',
  description: 'Entity management',
  routePrefix: '/api/v1/entities',
  source: 'project',          // ← project-owned source module
  audience: 'shared',         // 'admin' | 'operator' | 'shared'
  permissions: [
    { code: 'Read_Entities',   name: 'Read Entities',   description: 'View entity list and details' },
    { code: 'Create_Entities', name: 'Create Entities', description: 'Create new entities' },
    { code: 'Update_Entities', name: 'Update Entities', description: 'Edit existing entities' },
    { code: 'Delete_Entities', name: 'Delete Entities', description: 'Remove entities' },
  ],
  featureSync: {
    code: 'entities',
    name: 'Entity Management',
    groupCode: 'main',
    routePath: '/entities',
    icon: 'box',
    sortOrder: 10,
  },
};
