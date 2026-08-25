import type { ReportDefinition } from './types';
import { isComputedColumn } from './types';
import { ColumnType } from '../types';
import { ReportValidationError } from '../errors';

export function validateReportDefinition(definition: ReportDefinition): void {
  if (!definition.name || definition.name.trim().length === 0) {
    throw new ReportValidationError('Report definition must have a name');
  }

  if (!definition.columns || definition.columns.length === 0) {
    throw new ReportValidationError('Report definition must have at least one column');
  }

  const fieldNames = new Set<string>();
  const nonComputedFields = new Set<string>();

  for (const col of definition.columns) {
    if (fieldNames.has(col.field)) {
      throw new ReportValidationError(`Duplicate column field: "${col.field}"`);
    }
    fieldNames.add(col.field);

    if (!isComputedColumn(col)) {
      nonComputedFields.add(col.field);
    }
  }

  for (const col of definition.columns) {
    if (isComputedColumn(col)) {
      for (const dep of col.dependsOn) {
        if (!nonComputedFields.has(dep)) {
          throw new ReportValidationError(
            `Computed column "${col.field}" depends on unknown field "${dep}"`,
          );
        }
      }
    }

    if (col.aggregatable) {
      const numericTypes = [ColumnType.NUMBER, ColumnType.INTEGER, ColumnType.CURRENCY, ColumnType.PERCENTAGE];
      if (!numericTypes.includes(col.type as typeof numericTypes[number])) {
        throw new ReportValidationError(
          `Column "${col.field}" is marked aggregatable but type "${col.type}" is not numeric`,
        );
      }
    }
  }

  if (definition.dateField) {
    const dateCol = definition.columns.find((c) => c.field === definition.dateField);
    if (!dateCol) {
      throw new ReportValidationError(`dateField "${definition.dateField}" does not match any column`);
    }
    if (dateCol.type !== ColumnType.DATE && dateCol.type !== ColumnType.DATETIME) {
      throw new ReportValidationError(`dateField "${definition.dateField}" must be a date or datetime column`);
    }
  }

  if (definition.availableAggregations) {
    for (const agg of definition.availableAggregations) {
      if (!fieldNames.has(agg.field)) {
        throw new ReportValidationError(`Aggregation references unknown field: "${agg.field}"`);
      }
    }
  }

  if (definition.summaryAggregations) {
    for (const agg of definition.summaryAggregations) {
      if (!fieldNames.has(agg.field)) {
        throw new ReportValidationError(`Summary aggregation references unknown field: "${agg.field}"`);
      }
    }
  }
}
