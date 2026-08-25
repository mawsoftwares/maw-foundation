import { FilterOperator } from '@maw/sdk';
import type { FilterCondition, FilterGroup } from './types';

export class FilterBuilder {
  static and(...conditions: readonly (FilterCondition | FilterGroup)[]): FilterGroup {
    return { logic: 'AND', conditions };
  }

  static or(...conditions: readonly (FilterCondition | FilterGroup)[]): FilterGroup {
    return { logic: 'OR', conditions };
  }

  static eq(field: string, value: unknown): FilterCondition {
    return { field, operator: FilterOperator.EQUALS, value };
  }

  static neq(field: string, value: unknown): FilterCondition {
    return { field, operator: FilterOperator.NOT_EQUALS, value };
  }

  static contains(field: string, value: string): FilterCondition {
    return { field, operator: FilterOperator.CONTAINS, value };
  }

  static startsWith(field: string, value: string): FilterCondition {
    return { field, operator: FilterOperator.STARTS_WITH, value };
  }

  static endsWith(field: string, value: string): FilterCondition {
    return { field, operator: FilterOperator.ENDS_WITH, value };
  }

  static gt(field: string, value: unknown): FilterCondition {
    return { field, operator: FilterOperator.GREATER_THAN, value };
  }

  static gte(field: string, value: unknown): FilterCondition {
    return { field, operator: FilterOperator.GREATER_THAN_OR_EQUAL, value };
  }

  static lt(field: string, value: unknown): FilterCondition {
    return { field, operator: FilterOperator.LESS_THAN, value };
  }

  static lte(field: string, value: unknown): FilterCondition {
    return { field, operator: FilterOperator.LESS_THAN_OR_EQUAL, value };
  }

  static between(field: string, min: unknown, max: unknown): FilterCondition {
    return { field, operator: FilterOperator.BETWEEN, value: [min, max] };
  }

  static inValues(field: string, values: readonly unknown[]): FilterCondition {
    return { field, operator: FilterOperator.IN, value: [...values] };
  }

  static notIn(field: string, values: readonly unknown[]): FilterCondition {
    return { field, operator: FilterOperator.NOT_IN, value: [...values] };
  }

  static isEmpty(field: string): FilterCondition {
    return { field, operator: FilterOperator.IS_EMPTY, value: null };
  }

  static isNotEmpty(field: string): FilterCondition {
    return { field, operator: FilterOperator.IS_NOT_EMPTY, value: null };
  }
}
