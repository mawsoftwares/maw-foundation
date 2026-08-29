import type { AuditableEntity, TenantScopedEntity, SoftDeletableEntity } from '@mawsoftwares/database';

/**
 * CRUD Module Template — Domain Entity
 *
 * REPLACE: Rename `Entity` to your domain noun (e.g. `Order`, `Customer`, `Product`).
 * ADD/REMOVE: Add or remove fields to match your database schema.
 */
export interface Entity extends AuditableEntity, TenantScopedEntity, SoftDeletableEntity {
  // ── Required fields ──────────────────────────────────────────────────────
  name: string;

  // ── Optional fields — add project-specific fields here ───────────────────
  description?: string;
  status: EntityStatus;
}

export type EntityStatus = 'active' | 'inactive';
