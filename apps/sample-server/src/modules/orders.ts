import type { ModuleDefinition } from '@maw/rbac-core';

export const ordersModule: ModuleDefinition = {
  key: 'orders',
  name: 'Orders',
  routePrefix: '/api/orders',
  audience: 'shared',
  permissions: [
    { code: 'Read_Orders', name: 'Read Orders', description: 'View orders' },
    { code: 'Create_Orders', name: 'Create Orders', description: 'Place new orders' },
    { code: 'Update_Orders', name: 'Update Orders', description: 'Edit existing orders' },
    { code: 'Delete_Orders', name: 'Delete Orders', description: 'Cancel orders' },
  ],
  featureSync: {
    code: 'orders',
    name: 'Order Management',
    groupCode: 'operations',
    routePath: '/orders',
    icon: 'shopping-cart',
    sortOrder: 3,
  },
};
