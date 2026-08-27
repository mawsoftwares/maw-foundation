import type { ExportDefinition, ExportFieldDefinition, ExportFormatValue } from '@mawsoftwares/import-export';
import { formatMoney } from '@mawsoftwares/sdk';
import type { ReportDefinition } from '../definition/types';
import { isComputedColumn } from '../definition/types';
import { ColumnType } from '../types';
import type { FilterGroup } from '../filters/types';
import type { SortField } from '../sorting/types';

export function toExportDefinition(
  reportDef: ReportDefinition,
  format: ExportFormatValue,
  filters?: FilterGroup,
  sorting?: readonly SortField[],
): ExportDefinition {
  const fields: ExportFieldDefinition[] = reportDef.columns
    .filter((col) => col.visible !== false)
    .map((col) => {
      const field: ExportFieldDefinition = {
        name: col.field,
        label: col.label,
        transform: buildTransform(col.type, col.format),
        format: col.format,
      };
      return field;
    });

  return {
    name: `${reportDef.name}-export`,
    fields,
    format,
    filters: filters as unknown as Record<string, unknown>,
    sorting: sorting?.map((s) => ({ field: s.field, direction: s.direction })),
    chunkSize: reportDef.chunkSize ?? 1000,
    fileName: reportDef.name,
  };
}

function buildTransform(
  type: string,
  _format?: string,
): ((value: unknown) => unknown) | undefined {
  if (type === ColumnType.CURRENCY) {
    return (value: unknown) => {
      if (value === null || value === undefined) return '';
      return formatMoney(Number(value));
    };
  }

  if (type === ColumnType.BOOLEAN) {
    return (value: unknown) => (value ? 'Yes' : 'No');
  }

  return undefined;
}

export function getVisibleColumns(definition: ReportDefinition): string[] {
  return definition.columns
    .filter((col) => col.visible !== false && !isComputedColumn(col))
    .map((col) => col.field);
}
