import { Pagination, type SortDirection } from '@mawsoftwares/sdk/config/constants';
import type { ListQueryParams } from './types';

export interface QueryParseOptions {
  readonly allowedSortFields?: readonly string[];
  readonly maxPageSize?: number;
  readonly defaultPageSize?: number;
}

export function parseListQuery(
  raw: Record<string, string | string[] | undefined>,
  options?: QueryParseOptions,
): ListQueryParams {
  const maxPageSize = options?.maxPageSize ?? Pagination.MAX_PAGE_SIZE;
  const defaultPageSize = options?.defaultPageSize ?? Pagination.DEFAULT_PAGE_SIZE;

  const rawPage = typeof raw.page === 'string' ? parseInt(raw.page, 10) : undefined;
  const page = rawPage !== undefined && !isNaN(rawPage) && rawPage >= 1
    ? rawPage
    : Pagination.DEFAULT_PAGE;

  const rawPageSize = typeof raw.pageSize === 'string' ? parseInt(raw.pageSize, 10) : undefined;
  const pageSize = rawPageSize !== undefined && !isNaN(rawPageSize) && rawPageSize >= 1
    ? Math.min(rawPageSize, maxPageSize)
    : defaultPageSize;

  const rawSortOrder = typeof raw.sortOrder === 'string' ? raw.sortOrder.toLowerCase() : undefined;
  const sortOrder: SortDirection | undefined =
    rawSortOrder === 'asc' || rawSortOrder === 'desc' ? rawSortOrder : undefined;

  const rawSortBy = typeof raw.sortBy === 'string' ? raw.sortBy.trim() : undefined;
  const sortBy = rawSortBy !== undefined && rawSortBy.length > 0
    ? (options?.allowedSortFields === undefined || options.allowedSortFields.includes(rawSortBy)
        ? rawSortBy
        : undefined)
    : undefined;

  const search = typeof raw.search === 'string' && raw.search.trim().length > 0
    ? raw.search.trim()
    : undefined;

  const fields = typeof raw.fields === 'string' && raw.fields.trim().length > 0
    ? raw.fields.trim()
    : undefined;

  return { page, pageSize, sortBy, sortOrder, search, fields };
}

export function parseFieldSelection(fields: string | undefined): string[] | undefined {
  if (fields === undefined || fields.trim().length === 0) return undefined;
  return fields.split(',').map((f) => f.trim()).filter((f) => f.length > 0);
}
