import { FilterOperator, type FilterOperatorValue } from '@maw/sdk';
import type { ReportDefinition, ReportColumnDefinition, ComputedColumnDefinition } from '../definition/types';
import { ColumnType, type ColumnTypeValue } from '../types';
import type { FilterGroup, FilterCondition } from './types';
import { isFilterGroup } from './types';
import { InvalidFilterError } from '../errors';

const STRING_OPERATORS: readonly FilterOperatorValue[] = [
  FilterOperator.EQUALS,
  FilterOperator.NOT_EQUALS,
  FilterOperator.CONTAINS,
  FilterOperator.NOT_CONTAINS,
  FilterOperator.STARTS_WITH,
  FilterOperator.ENDS_WITH,
  FilterOperator.IN,
  FilterOperator.NOT_IN,
  FilterOperator.IS_EMPTY,
  FilterOperator.IS_NOT_EMPTY,
];

const NUMERIC_OPERATORS: readonly FilterOperatorValue[] = [
  FilterOperator.EQUALS,
  FilterOperator.NOT_EQUALS,
  FilterOperator.GREATER_THAN,
  FilterOperator.GREATER_THAN_OR_EQUAL,
  FilterOperator.LESS_THAN,
  FilterOperator.LESS_THAN_OR_EQUAL,
  FilterOperator.BETWEEN,
  FilterOperator.IS_EMPTY,
  FilterOperator.IS_NOT_EMPTY,
];

const DATE_OPERATORS: readonly FilterOperatorValue[] = [
  FilterOperator.EQUALS,
  FilterOperator.GREATER_THAN,
  FilterOperator.GREATER_THAN_OR_EQUAL,
  FilterOperator.LESS_THAN,
  FilterOperator.LESS_THAN_OR_EQUAL,
  FilterOperator.BETWEEN,
  FilterOperator.IS_EMPTY,
  FilterOperator.IS_NOT_EMPTY,
];

const BOOLEAN_OPERATORS: readonly FilterOperatorValue[] = [
  FilterOperator.EQUALS,
];

const ENUM_OPERATORS: readonly FilterOperatorValue[] = [
  FilterOperator.EQUALS,
  FilterOperator.NOT_EQUALS,
  FilterOperator.IN,
  FilterOperator.NOT_IN,
  FilterOperator.IS_EMPTY,
  FilterOperator.IS_NOT_EMPTY,
];

export function operatorsForType(type: ColumnTypeValue): readonly FilterOperatorValue[] {
  switch (type) {
    case ColumnType.STRING:
      return STRING_OPERATORS;
    case ColumnType.NUMBER:
    case ColumnType.INTEGER:
    case ColumnType.CURRENCY:
    case ColumnType.PERCENTAGE:
      return NUMERIC_OPERATORS;
    case ColumnType.DATE:
    case ColumnType.DATETIME:
      return DATE_OPERATORS;
    case ColumnType.BOOLEAN:
      return BOOLEAN_OPERATORS;
    case ColumnType.ENUM:
      return ENUM_OPERATORS;
    default:
      return STRING_OPERATORS;
  }
}

export function validateFilters(
  filters: FilterGroup,
  definition: ReportDefinition,
): void {
  const columnMap = new Map<string, ReportColumnDefinition | ComputedColumnDefinition>();
  for (const col of definition.columns) {
    columnMap.set(col.field, col);
  }

  validateGroup(filters, columnMap);
}

function validateGroup(
  group: FilterGroup,
  columnMap: ReadonlyMap<string, ReportColumnDefinition | ComputedColumnDefinition>,
): void {
  if (group.logic !== 'AND' && group.logic !== 'OR') {
    throw new InvalidFilterError(`Invalid filter logic: ${group.logic as string}`);
  }

  for (const condition of group.conditions) {
    if (isFilterGroup(condition)) {
      validateGroup(condition, columnMap);
    } else {
      validateCondition(condition, columnMap);
    }
  }
}

function validateCondition(
  condition: FilterCondition,
  columnMap: ReadonlyMap<string, ReportColumnDefinition | ComputedColumnDefinition>,
): void {
  const col = columnMap.get(condition.field);
  if (!col) {
    throw new InvalidFilterError(`Unknown filter field: ${condition.field}`);
  }

  if (col.filterable === false) {
    throw new InvalidFilterError(`Field "${condition.field}" is not filterable`);
  }

  const allowed = operatorsForType(col.type);
  if (!allowed.includes(condition.operator)) {
    throw new InvalidFilterError(
      `Operator "${condition.operator}" is not valid for field "${condition.field}" (type: ${col.type})`,
    );
  }

  if (condition.operator === FilterOperator.BETWEEN) {
    if (!Array.isArray(condition.value) || condition.value.length !== 2) {
      throw new InvalidFilterError(`BETWEEN operator requires a [min, max] array for field "${condition.field}"`);
    }
  }

  if (condition.operator === FilterOperator.IN || condition.operator === FilterOperator.NOT_IN) {
    if (!Array.isArray(condition.value)) {
      throw new InvalidFilterError(`${condition.operator} operator requires an array for field "${condition.field}"`);
    }
  }
}
