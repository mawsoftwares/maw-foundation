import type { FilterOperatorValue } from '@mawsoftwares/sdk';

export interface FilterCondition {
  readonly field: string;
  readonly operator: FilterOperatorValue;
  readonly value: unknown;
}

export type FilterLogic = 'AND' | 'OR';

export interface FilterGroup {
  readonly logic: FilterLogic;
  readonly conditions: readonly (FilterCondition | FilterGroup)[];
}

export function isFilterGroup(item: FilterCondition | FilterGroup): item is FilterGroup {
  return 'logic' in item && 'conditions' in item;
}
