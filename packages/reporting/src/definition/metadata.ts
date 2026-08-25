import type { ExportFormatValue } from '@maw/import-export';
import type { FilterOperatorValue } from '@maw/sdk';
import { ExportFormat } from '@maw/import-export';
import type {
  ReportDefinition,
  ReportColumnDefinition,
  ComputedColumnDefinition,
} from './types';
import { isComputedColumn } from './types';
import { operatorsForType } from '../filters/validation';
import {
  type ColumnTypeValue,
  type AggregationTypeValue,
  type DateRangePresetValue,
  AggregationType,
  DateRangePreset,
  ColumnType,
} from '../types';

export interface FilterableFieldInfo {
  readonly field: string;
  readonly label: string;
  readonly type: ColumnTypeValue;
  readonly operators: readonly FilterOperatorValue[];
  readonly enumValues?: readonly string[];
}

export interface AggregatableFieldInfo {
  readonly field: string;
  readonly label: string;
  readonly allowedAggregations: readonly AggregationTypeValue[];
}

export interface ReportMetadata {
  readonly name: string;
  readonly description?: string;
  readonly columns: readonly (ReportColumnDefinition | ComputedColumnDefinition)[];
  readonly filterableFields: readonly FilterableFieldInfo[];
  readonly sortableFields: readonly string[];
  readonly aggregatableFields: readonly AggregatableFieldInfo[];
  readonly dateField?: string;
  readonly dateRangePresets: readonly DateRangePresetValue[];
  readonly exportFormats: readonly ExportFormatValue[];
}

const ALL_PRESETS: readonly DateRangePresetValue[] = Object.values(DateRangePreset);

const DEFAULT_EXPORT_FORMATS: readonly ExportFormatValue[] = [
  ExportFormat.CSV,
  ExportFormat.JSON,
];

const NUMERIC_AGGREGATIONS: readonly AggregationTypeValue[] = [
  AggregationType.COUNT,
  AggregationType.SUM,
  AggregationType.AVG,
  AggregationType.MIN,
  AggregationType.MAX,
];

export function extractMetadata(definition: ReportDefinition): ReportMetadata {
  const filterableFields: FilterableFieldInfo[] = [];
  const sortableFields: string[] = [];
  const aggregatableFields: AggregatableFieldInfo[] = [];

  for (const col of definition.columns) {
    if (col.filterable && !isComputedColumn(col)) {
      filterableFields.push({
        field: col.field,
        label: col.label,
        type: col.type,
        operators: operatorsForType(col.type),
        enumValues: col.enumValues,
      });
    }

    if (col.sortable) {
      sortableFields.push(col.field);
    }

    if (col.aggregatable) {
      const numericTypes = [ColumnType.NUMBER, ColumnType.INTEGER, ColumnType.CURRENCY, ColumnType.PERCENTAGE];
      const isNumeric = numericTypes.includes(col.type as typeof numericTypes[number]);
      aggregatableFields.push({
        field: col.field,
        label: col.label,
        allowedAggregations: isNumeric ? NUMERIC_AGGREGATIONS : [AggregationType.COUNT],
      });
    }
  }

  return {
    name: definition.name,
    description: definition.description,
    columns: definition.columns,
    filterableFields,
    sortableFields,
    aggregatableFields,
    dateField: definition.dateField,
    dateRangePresets: definition.dateField ? ALL_PRESETS : [],
    exportFormats: definition.exportFormats ?? DEFAULT_EXPORT_FORMATS,
  };
}
