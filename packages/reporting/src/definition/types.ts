import type { ExportFormatValue } from '@mawsoftwares/import-export';
import type { ColumnTypeValue, AggregationTypeValue, DateRangePresetValue } from '../types';
import type { FilterGroup } from '../filters/types';
import type { SortField } from '../sorting/types';

export interface ReportColumnDefinition {
  readonly field: string;
  readonly label: string;
  readonly type: ColumnTypeValue;
  readonly visible?: boolean;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly aggregatable?: boolean;
  readonly format?: string;
  readonly width?: number;
  readonly enumValues?: readonly string[];
}

export interface ComputedColumnExpression {
  readonly op: 'add' | 'subtract' | 'multiply' | 'divide' | 'modulo';
  readonly left: string | ComputedColumnExpression;
  readonly right: string | ComputedColumnExpression;
}

export interface ComputedColumnDefinition extends Omit<ReportColumnDefinition, 'field'> {
  readonly field: string;
  readonly computed: true;
  readonly expression: ComputedColumnExpression;
  readonly dependsOn: readonly string[];
}

export interface AggregationDefinition {
  readonly field: string;
  readonly type: AggregationTypeValue;
  readonly label?: string;
}

export interface ReportDefinition {
  readonly name: string;
  readonly description?: string;
  readonly columns: readonly (ReportColumnDefinition | ComputedColumnDefinition)[];
  readonly dateField?: string;
  readonly defaultDateRange?: DateRangePresetValue;
  readonly defaultSort?: readonly SortField[];
  readonly defaultFilters?: FilterGroup;
  readonly availableAggregations?: readonly AggregationDefinition[];
  readonly summaryAggregations?: readonly AggregationDefinition[];
  readonly permission?: string;
  readonly exportFormats?: readonly ExportFormatValue[];
  readonly maxPreviewRows?: number;
  readonly maxExportRows?: number;
  readonly chunkSize?: number;
}

export function isComputedColumn(
  col: ReportColumnDefinition | ComputedColumnDefinition,
): col is ComputedColumnDefinition {
  return 'computed' in col && col.computed === true;
}
