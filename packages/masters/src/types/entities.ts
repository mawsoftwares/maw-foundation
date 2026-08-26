export const MasterStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type MasterStatusValue = (typeof MasterStatus)[keyof typeof MasterStatus];

export const FieldDataType = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  DATE: 'date',
  DATETIME: 'datetime',
  REFERENCE: 'reference',
  JSON: 'json',
} as const;

export type FieldDataTypeValue = (typeof FieldDataType)[keyof typeof FieldDataType];

export interface MasterConfig {
  readonly searchable?: boolean;
  readonly sortable?: boolean;
  readonly allowInactiveSelection?: boolean;
}

export interface FieldConfig {
  readonly placeholder?: string;
  readonly min?: number;
  readonly max?: number;
  readonly referenceMaster?: string;
  readonly helpText?: string;
  readonly inputType?: string;
}

export interface Master {
  readonly id: string;
  readonly tenantId: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: MasterStatusValue;
  readonly isSystem: boolean;
  readonly allowCustomValues: boolean;
  readonly config: MasterConfig | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string | null;
  readonly updatedBy: string | null;
  readonly deletedAt: string | null;
  readonly version: number;
}

export interface MasterField {
  readonly id: string;
  readonly masterId: string;
  readonly code: string;
  readonly name: string;
  readonly dataType: FieldDataTypeValue;
  readonly isRequired: boolean;
  readonly isUnique: boolean;
  readonly isSearchable: boolean;
  readonly isFilterable: boolean;
  readonly displayOrder: number;
  readonly defaultValue: string | null;
  readonly config: FieldConfig | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string | null;
  readonly updatedBy: string | null;
  readonly deletedAt: string | null;
}

export interface MasterValue {
  readonly id: string;
  readonly masterId: string;
  readonly code: string;
  readonly label: string;
  readonly value: string | null;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: string | null;
  readonly updatedBy: string | null;
  readonly deletedAt: string | null;
  readonly version: number;
}

export interface MasterOption {
  readonly value: string;
  readonly label: string;
  readonly sortOrder: number;
}
