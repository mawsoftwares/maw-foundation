export interface BaseEntity {
  id: string;
}

export interface TimestampedEntity extends BaseEntity {
  createdAt: string;
  updatedAt: string;
}

export interface TenantScopedEntity extends BaseEntity {
  tenantId: string;
}

export interface SoftDeletableEntity extends BaseEntity {
  deletedAt: string | null;
}

export interface VersionedEntity extends BaseEntity {
  version: number;
}

export type AuditableEntity = TimestampedEntity & {
  createdBy?: string;
  updatedBy?: string;
};
