/**
 * Shared constants — HTTP codes, pagination defaults, common statuses.
 * Import these instead of scattering magic numbers across apps.
 */

// ---------------------------------------------------------------------------
// HTTP status codes (commonly used subset)
// ---------------------------------------------------------------------------

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const Pagination = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    data: items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ---------------------------------------------------------------------------
// Common entity statuses
// ---------------------------------------------------------------------------

export const EntityStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
  PENDING: 'pending',
  SUSPENDED: 'suspended',
} as const;

export type EntityStatusValue = (typeof EntityStatus)[keyof typeof EntityStatus];

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  field: string;
  direction: SortDirection;
}

// ---------------------------------------------------------------------------
// Common limits
// ---------------------------------------------------------------------------

export const Limits = {
  MAX_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_EMAIL_LENGTH: 320,
  MAX_PHONE_LENGTH: 20,
  MAX_URL_LENGTH: 2048,
  MAX_FILE_SIZE_MB: 10,
  MAX_UPLOAD_FILES: 10,
} as const;

// ---------------------------------------------------------------------------
// Time constants (in milliseconds)
// ---------------------------------------------------------------------------

export const Duration = {
  SECOND: 1_000,
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
  WEEK: 604_800_000,
} as const;
