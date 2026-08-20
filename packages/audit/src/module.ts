/**
 * Audit module definition — register this with the module registry to get
 * permissions, menus, and feature sync for audit logs.
 */

import type { BaseModuleDefinition } from '@maw/sdk';

export const auditModule: BaseModuleDefinition = {
  key: 'audit-logs',
  name: 'Audit Logs',
  description: 'Track who did what, when, and where across the system',
  level: 'foundation',
  menus: [
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'scroll-text', group: 'admin', sortOrder: 10 },
  ],
  events: [
    { name: 'audit:recorded', description: 'Fired after an audit entry is persisted' },
  ],
  migrations: [
    {
      version: '001',
      description: 'Create audit_logs table with tenant and user indexes',
      up: `CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id TEXT,
  details     JSONB,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user   ON audit_logs (tenant_id, user_id, created_at DESC);`,
    },
  ],
};
