import type { SortDirection } from '@mawsoftwares/sdk/config/constants';
import type { MasterStatusValue, FieldDataTypeValue, MasterConfig, FieldConfig } from './entities';

export interface ListQueryParams {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: string;
  readonly sortOrder?: SortDirection;
  readonly search?: string;
}

export interface CreateMasterInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly isSystem?: boolean;
  readonly allowCustomValues?: boolean;
  readonly config?: MasterConfig;
}

export interface UpdateMasterInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly status?: MasterStatusValue;
  readonly allowCustomValues?: boolean;
  readonly config?: MasterConfig | null;
}

export interface CreateFieldInput {
  readonly code: string;
  readonly name: string;
  readonly dataType: FieldDataTypeValue;
  readonly isRequired?: boolean;
  readonly isUnique?: boolean;
  readonly isSearchable?: boolean;
  readonly isFilterable?: boolean;
  readonly displayOrder?: number;
  readonly defaultValue?: string;
  readonly config?: FieldConfig;
}

export interface UpdateFieldInput {
  readonly name?: string;
  readonly dataType?: FieldDataTypeValue;
  readonly isRequired?: boolean;
  readonly isUnique?: boolean;
  readonly isSearchable?: boolean;
  readonly isFilterable?: boolean;
  readonly displayOrder?: number;
  readonly defaultValue?: string | null;
  readonly config?: FieldConfig | null;
}

export interface CreateValueInput {
  readonly code: string;
  readonly label: string;
  readonly value?: string;
  readonly sortOrder?: number;
  readonly isActive?: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface UpdateValueInput {
  readonly label?: string;
  readonly value?: string | null;
  readonly sortOrder?: number;
  readonly isActive?: boolean;
  readonly metadata?: Record<string, unknown> | null;
}

export interface BulkCreateValuesInput {
  readonly values: readonly CreateValueInput[];
}

export interface ReorderValuesInput {
  readonly valueIds: readonly string[];
}

export interface MasterListQuery extends ListQueryParams {
  readonly status?: MasterStatusValue;
  readonly isSystem?: boolean;
}

export interface ValueListQuery extends ListQueryParams {
  readonly isActive?: boolean;
  readonly includeInactive?: boolean;
}

export interface OperationContext {
  readonly tenantId: string;
  readonly userId: string;
}
