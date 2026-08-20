import type { ModuleDefinition } from '@maw/rbac-core';

export const reportsModule: ModuleDefinition = {
  key: 'reports',
  name: 'Reports',
  routePrefix: '/api/reports',
  audience: 'admin',
  permissions: [
    { code: 'Read_Reports', name: 'Read Reports', description: 'View reports' },
    { code: 'Create_Reports', name: 'Create Reports', description: 'Generate new reports' },
  ],
  featureSync: {
    code: 'reports',
    name: 'Reports & Analytics',
    groupCode: 'analytics',
    routePath: '/reports',
    icon: 'bar-chart',
    sortOrder: 2,
  },
};
