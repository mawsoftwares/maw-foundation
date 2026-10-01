import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { ApiError } from '@mawsoftwares/api-client';
import { client } from '../api';

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
