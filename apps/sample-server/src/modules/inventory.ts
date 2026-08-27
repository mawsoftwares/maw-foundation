import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

export const inventoryModule: ModuleDefinition = {
  key: 'inventory',
  name: 'Inventory',
  routePrefix: '/api/inventory',
  audience: 'shared',
  permissions: [
    { code: 'Read_Inventory', name: 'Read Inventory', description: 'View stock levels' },
    { code: 'Update_Inventory', name: 'Update Inventory', description: 'Adjust stock' },
  ],
  featureSync: {
    code: 'inventory',
    name: 'Inventory Management',
    groupCode: 'operations',
    routePath: '/inventory',
    icon: 'package',
    sortOrder: 4,
  },
};
