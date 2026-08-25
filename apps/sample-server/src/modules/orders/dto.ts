import type { ListQueryParams, EntityResponse } from '@maw/api/dto/types';

export interface CreateOrderBody {
  readonly item: string;
  readonly qty: number;
}

export interface OrderResponse extends EntityResponse {
  readonly item: string;
  readonly qty: number;
  readonly status: string;
}

export interface OrderListQuery extends ListQueryParams {
  readonly status?: string;
}
