export interface AuditEntry {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  timestamp: string;
}

const entries: AuditEntry[] = [];
let nextId = 1;

export function recordAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
  const record: AuditEntry = {
    ...entry,
    id: `audit-${nextId++}`,
    timestamp: new Date().toISOString(),
  };
  entries.push(record);
  return record;
}

export function queryAuditLogs(filters?: {
  tenantId?: string;
  userId?: string;
  resource?: string;
  limit?: number;
}): AuditEntry[] {
  let result = entries;
  if (filters?.tenantId) result = result.filter((e) => e.tenantId === filters.tenantId);
  if (filters?.userId) result = result.filter((e) => e.userId === filters.userId);
  if (filters?.resource) result = result.filter((e) => e.resource === filters.resource);
  result = result.slice().reverse();
  return result.slice(0, filters?.limit ?? 50);
}

export function getAllAuditLogs(): AuditEntry[] {
  return entries.slice().reverse();
}
