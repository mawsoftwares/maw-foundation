import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

export const billingModule: ModuleDefinition = {
  key: 'billing',
  name: 'Billing',
  routePrefix: '/api/billing',
  audience: 'operator',
  permissions: [
    { code: 'Read_Billing', name: 'Read Billing', description: 'View bills' },
    { code: 'Create_Billing', name: 'Create Billing', description: 'Create new bills' },
  ],
  featureSync: {
    code: 'billing',
    name: 'Billing & Payments',
    groupCode: 'finance',
    routePath: '/billing',
    icon: 'credit-card',
    sortOrder: 5,
  },
};
