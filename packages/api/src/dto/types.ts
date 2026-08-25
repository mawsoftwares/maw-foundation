import type { SortDirection } from '@maw/sdk/config/constants';

export interface ListQueryParams {
  readonly page?: number;
  readonly pageSize?: number;
  readonly sortBy?: string;
  readonly sortOrder?: SortDirection;
  readonly search?: string;
  readonly fields?: string;
}

export interface EntityResponse {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface IdParams {
  readonly id: string;
}
