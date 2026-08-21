import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Column types
// ---------------------------------------------------------------------------

export const ColumnType = {
  TEXT: 'text',
  NUMBER: 'number',
  CURRENCY: 'currency',
  DATE: 'date',
  DATETIME: 'datetime',
  BOOLEAN: 'boolean',
  STATUS: 'status',
  BADGE: 'badge',
  AVATAR: 'avatar',
  IMAGE: 'image',
  LINK: 'link',
  EMAIL: 'email',
  PHONE: 'phone',
  CUSTOM: 'custom',
} as const;

export type ColumnTypeValue = (typeof ColumnType)[keyof typeof ColumnType];

// ---------------------------------------------------------------------------
// Filter operators
// ---------------------------------------------------------------------------

export const FilterOperator = {
  EQUALS: 'eq',
  NOT_EQUALS: 'neq',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  STARTS_WITH: 'starts_with',
  ENDS_WITH: 'ends_with',
  GREATER_THAN: 'gt',
  GREATER_THAN_OR_EQUAL: 'gte',
  LESS_THAN: 'lt',
  LESS_THAN_OR_EQUAL: 'lte',
  IN: 'in',
  NOT_IN: 'not_in',
  BETWEEN: 'between',
  IS_EMPTY: 'is_empty',
  IS_NOT_EMPTY: 'is_not_empty',
} as const;

export type FilterOperatorValue = (typeof FilterOperator)[keyof typeof FilterOperator];

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export type DataGridSortDirection = 'asc' | 'desc';

export interface DataGridSortState {
  readonly field: string;
  readonly direction: DataGridSortDirection;
}

export interface DataGridSortConfig {
  readonly defaultSort?: DataGridSortState;
  readonly multiSort?: boolean;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface DataGridPaginationConfig {
  readonly defaultPageSize?: number;
  readonly pageSizeOptions?: readonly number[];
  readonly showPageSizeSelector?: boolean;
  readonly showTotalCount?: boolean;
  readonly showPageNumbers?: boolean;
}

export interface DataGridPaginationState {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export type FilterType = 'text' | 'number' | 'date' | 'daterange' | 'select' | 'multiselect' | 'boolean';

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

export interface DataGridFilterDef {
  readonly field: string;
  readonly label: string;
  readonly type: FilterType;
  readonly operators?: readonly FilterOperatorValue[];
  readonly options?: readonly FilterOption[];
  readonly defaultValue?: unknown;
  readonly placeholder?: string;
}

export interface ActiveFilter {
  readonly field: string;
  readonly operator: FilterOperatorValue;
  readonly value: unknown;
}

// ---------------------------------------------------------------------------
// Column definition
// ---------------------------------------------------------------------------

export type DataGridColumnAlign = 'left' | 'center' | 'right';

export interface DataGridColumn<T> {
  readonly id: string;
  readonly field?: keyof T & string;
  readonly header: string;
  readonly type?: ColumnTypeValue;
  readonly width?: string | number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly align?: DataGridColumnAlign;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly visible?: boolean;
  readonly pinned?: 'left' | 'right';
  readonly resizable?: boolean;
  readonly formatter?: (value: unknown, row: T) => string;
  readonly render?: (row: T, index: number) => ReactNode;
  readonly headerRender?: () => ReactNode;
  readonly exportFormatter?: (value: unknown, row: T) => string;
  readonly className?: string;
}

// ---------------------------------------------------------------------------
// Actions (row + bulk)
// ---------------------------------------------------------------------------

export interface DataGridAction<T> {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
  readonly variant?: 'default' | 'primary' | 'danger';
  readonly permission?: string;
  readonly disabled?: boolean | ((rows: readonly T[]) => boolean);
  readonly hidden?: boolean | ((rows: readonly T[]) => boolean);
  readonly confirm?: {
    readonly title: string;
    readonly message: string;
    readonly confirmLabel?: string;
    readonly variant?: 'primary' | 'danger';
  };
  readonly handler: (rows: readonly T[]) => void | Promise<void>;
}

export interface DataGridRowAction<T> {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
  readonly variant?: 'default' | 'primary' | 'danger';
  readonly permission?: string;
  readonly disabled?: boolean | ((row: T) => boolean);
  readonly hidden?: boolean | ((row: T) => boolean);
  readonly confirm?: {
    readonly title: string;
    readonly message: string;
    readonly confirmLabel?: string;
    readonly variant?: 'primary' | 'danger';
  };
  readonly handler: (row: T) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface DataGridSelectionConfig {
  readonly enabled?: boolean;
  readonly mode?: 'single' | 'multi';
  readonly selectAllMode?: 'page' | 'all';
  readonly preserveOnFilter?: boolean;
  readonly preserveOnSort?: boolean;
  readonly isRowSelectable?: (row: unknown) => boolean;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface DataGridSearchConfig {
  readonly enabled?: boolean;
  readonly placeholder?: string;
  readonly debounceMs?: number;
  readonly searchFields?: readonly string[];
  readonly minLength?: number;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ExportFormat = {
  CSV: 'csv',
  JSON: 'json',
} as const;

export type ExportFormatValue = (typeof ExportFormat)[keyof typeof ExportFormat];

export interface DataGridExportConfig {
  readonly enabled?: boolean;
  readonly formats?: readonly ExportFormatValue[];
  readonly filename?: string;
  readonly exportAll?: boolean;
  readonly permission?: string;
}

// ---------------------------------------------------------------------------
// Row expansion
// ---------------------------------------------------------------------------

export interface DataGridExpansionConfig<T> {
  readonly enabled?: boolean;
  readonly render: (row: T) => ReactNode;
  readonly allowMultiple?: boolean;
}

// ---------------------------------------------------------------------------
// Empty / Error / Loading states
// ---------------------------------------------------------------------------

export interface DataGridEmptyConfig {
  readonly icon?: ReactNode;
  readonly title?: string;
  readonly message?: string;
  readonly action?: ReactNode;
}

export interface DataGridErrorConfig {
  readonly title?: string;
  readonly message?: string;
  readonly retry?: () => void;
}

// ---------------------------------------------------------------------------
// Responsive
// ---------------------------------------------------------------------------

export interface DataGridResponsiveConfig {
  readonly breakpoint?: number;
  readonly mobileColumns?: readonly string[];
  readonly cardLayout?: boolean;
}

// ---------------------------------------------------------------------------
// DataSource — contract for data providers
// ---------------------------------------------------------------------------

export interface TableQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly filters?: readonly ActiveFilter[];
  readonly sort?: DataGridSortState;
}

export interface TableResult<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export type DataSourceMode = 'client' | 'server';

export interface IDataSource<T> {
  readonly mode: DataSourceMode;
  query(params: TableQuery): Promise<TableResult<T>>;
}

// ---------------------------------------------------------------------------
// Client-side data source (pass all data upfront)
// ---------------------------------------------------------------------------

export interface ClientDataSourceConfig<T> {
  readonly data: readonly T[];
  readonly searchFields?: readonly (keyof T & string)[];
}

// ---------------------------------------------------------------------------
// Server-side data source (fetch from API)
// ---------------------------------------------------------------------------

export interface ServerDataSourceConfig<T> {
  readonly fetchFn: (query: TableQuery) => Promise<TableResult<T>>;
  readonly refetchInterval?: number;
}

// ---------------------------------------------------------------------------
// Master schema — the single configuration object for a DataGrid
// ---------------------------------------------------------------------------

export interface DataGridSchema<T> {
  readonly keyField: keyof T & string;
  readonly columns: readonly DataGridColumn<T>[];

  readonly sort?: DataGridSortConfig;
  readonly pagination?: DataGridPaginationConfig;
  readonly filters?: readonly DataGridFilterDef[];
  readonly search?: DataGridSearchConfig;
  readonly selection?: DataGridSelectionConfig;
  readonly expansion?: DataGridExpansionConfig<T>;
  readonly export?: DataGridExportConfig;
  readonly responsive?: DataGridResponsiveConfig;

  readonly rowActions?: readonly DataGridRowAction<T>[];
  readonly bulkActions?: readonly DataGridAction<T>[];

  readonly empty?: DataGridEmptyConfig;
  readonly error?: DataGridErrorConfig;

  readonly stickyHeader?: boolean;
  readonly compact?: boolean;
  readonly striped?: boolean;
  readonly bordered?: boolean;
  readonly hoverable?: boolean;

  readonly onRowClick?: (row: T) => void;
  readonly getRowClassName?: (row: T, index: number) => string | undefined;
}
