import type { ReportDefinition } from '../definition/types';
import type { SortField } from './types';
import { InvalidSortError } from '../errors';

export function validateSorting(
  sorts: readonly SortField[],
  definition: ReportDefinition,
): void {
  const sortableFields = new Set<string>();
  for (const col of definition.columns) {
    if (col.sortable) {
      sortableFields.add(col.field);
    }
  }

  for (const sort of sorts) {
    if (!sortableFields.has(sort.field)) {
      throw new InvalidSortError(`Field "${sort.field}" is not sortable`);
    }
    if (sort.direction !== 'asc' && sort.direction !== 'desc') {
      throw new InvalidSortError(`Invalid sort direction: ${sort.direction as string}`);
    }
  }
}
