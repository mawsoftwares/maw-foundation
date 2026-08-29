/**
 * CRUD Module Template — Application DTOs
 *
 * REPLACE: Rename `Entity` to your domain noun, add/remove fields to match
 * your domain entity and validation requirements.
 */

// ── Create ─────────────────────────────────────────────────────────────────

export interface CreateEntityDto {
  tenantId: string;
  name: string;
  description?: string;
}

export const CreateEntitySchema = {
  name: { required: true, minLength: 1, maxLength: 255 },
} as const;

// ── Update ─────────────────────────────────────────────────────────────────

export interface UpdateEntityDto {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

// ── Response ───────────────────────────────────────────────────────────────

export interface EntityResponseDto {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

// ── List / Filter ──────────────────────────────────────────────────────────

export interface ListEntitiesQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  createdFrom?: string;
  createdTo?: string;
}

export interface ListEntitiesResponseDto {
  items: EntityResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}
