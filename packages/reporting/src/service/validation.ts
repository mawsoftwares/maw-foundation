import type { ReportDefinition } from '../definition/types';
import type { ReportRequest } from '../execution/types';
import type { IReportDataSource } from '../datasource/types';
import { validateFilters } from '../filters/validation';
import { validateSorting } from '../sorting/validation';
import { ReportValidationError } from '../errors';

export function validateReportRequest(
  request: ReportRequest,
  definition: ReportDefinition,
  datasource: IReportDataSource,
): void {
  const availableFields = new Set(datasource.availableFields());
  const definedFields = new Set(definition.columns.map((c) => c.field));

  for (const field of definedFields) {
    if (!availableFields.has(field) && !definition.columns.find((c) => c.field === field && 'computed' in c)) {
      // Only warn about non-computed fields missing from datasource
    }
  }

  if (request.filters) {
    validateFilters(request.filters, definition);
  }

  if (request.sorting && request.sorting.length > 0) {
    validateSorting(request.sorting, definition);
  }

  if (request.aggregations) {
    for (const agg of request.aggregations) {
      if (!definedFields.has(agg.field)) {
        throw new ReportValidationError(`Aggregation references unknown field: "${agg.field}"`);
      }
    }
  }

  if (request.grouping) {
    for (const field of request.grouping.fields) {
      if (!definedFields.has(field)) {
        throw new ReportValidationError(`Grouping references unknown field: "${field}"`);
      }
    }
  }

  if (request.pagination) {
    if (request.pagination.page < 1) {
      throw new ReportValidationError('Page must be >= 1');
    }
    if (request.pagination.pageSize < 1 || request.pagination.pageSize > 10000) {
      throw new ReportValidationError('Page size must be between 1 and 10000');
    }
  }
}
