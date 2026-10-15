// apps/sample-server/src/modules/customers.ts
import type { ModuleDefinition } from '@mawsoftwares/rbac-core';
export const customersModule: ModuleDefinition = {
  key: 'customers',
  name: 'Customers',
  routePrefix: '/api/v1/customers',
  audience: 'admin',
  permissions: [
    { code: 'Read_Customers', name: 'Read Customers', description: 'View customers' },
    { code: 'Create_Customers', name: 'Create Customers', description: 'Create customers' },
    { code: 'Update_Customers', name: 'Update Customers', description: 'Edit customers' },
    { code: 'Delete_Customers', name: 'Delete Customers', description: 'Delete customers' },
  ],
};