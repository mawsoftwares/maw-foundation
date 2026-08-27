import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

export const ordersModule: ModuleDefinition = {
  key: 'orders',
  name: 'Orders',
  description: 'Order lifecycle management',
  level: 'platform',
  routePrefix: '/api/orders',
  audience: 'shared',
  dependencies: [
    { moduleKey: 'billing', optional: true },
  ],
  menus: [
    { label: 'Orders', path: '/orders', icon: 'shopping-cart', group: 'operations', sortOrder: 3 },
  ],
  events: [
    { name: 'order:created', description: 'Fired when a new order is placed' },
    { name: 'order:updated', description: 'Fired when an order is modified' },
    { name: 'order:cancelled', description: 'Fired when an order is cancelled' },
  ],
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
