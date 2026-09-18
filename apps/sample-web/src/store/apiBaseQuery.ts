import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { ApiError } from '@mawsoftwares/api-client';
import { client } from '../api';

// A thin RTK Query `baseQuery` over the app's existing `ApiClient` (the same
// `client` singleton every non-RTK feature already uses), instead of RTK
// Query's own `fetchBaseQuery`. This keeps auth (token attach/refresh),
// base URL, and error envelope handling in one place — `client` — rather
// than duplicating that logic inside the Redux layer.
export interface ApiBaseQueryArgs {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export interface ApiBaseQueryError {
  status: number;
  message: string;
  body?: unknown;
}

export const apiBaseQuery: BaseQueryFn<ApiBaseQueryArgs, unknown, ApiBaseQueryError> = async ({ url, method, body }) => {
  try {
    const data = await client.request<unknown>(url, {
      method: method ?? 'GET',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { data };
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: { status: err.status, message: err.message, body: err.body } };
    }
    return { error: { status: 0, message: (err as Error).message } };
  }
};
