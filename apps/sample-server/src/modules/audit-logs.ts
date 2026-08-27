import type { ModuleDefinition } from '@mawsoftwares/rbac-core';

export const auditLogsModule: ModuleDefinition = {
  key: 'audit-logs',
  name: 'Audit Logs',
  routePrefix: '/api/audit-logs',
  audience: 'admin',
  permissions: [
    { code: 'Read_AuditLogs', name: 'Read Audit Logs', description: 'View audit trail' },
    { code: 'Export_AuditLogs', name: 'Export Audit Logs', description: 'Download audit data' },
  ],
  featureSync: {
    code: 'audit-logs',
    name: 'Audit Trail',
    groupCode: 'admin',
    routePath: '/admin/audit-logs',
    icon: 'scroll-text',
    sortOrder: 10,
    description: 'Track who did what, when, and where across the system',
  },
};
