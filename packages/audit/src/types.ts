/**
 * Audit trail types and store contract.
 *
 * Port/adapter pattern: code depends on IAuditStore, infrastructure provides
 * MemoryAuditStore (dev/test) or PgAuditStore (production).
 */

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

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

export type AuditInput = Omit<AuditEntry, 'id' | 'timestamp'>;

// ---------------------------------------------------------------------------
// Query filters
// ---------------------------------------------------------------------------

export interface AuditFilters {
  tenantId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Store contract (port)
// ---------------------------------------------------------------------------

export interface IAuditStore {
  record(entry: AuditInput): Promise<AuditEntry>;
  query(filters?: AuditFilters): Promise<AuditEntry[]>;
  count(filters?: AuditFilters): Promise<number>;
}
