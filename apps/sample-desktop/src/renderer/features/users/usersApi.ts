import { createApi } from '@reduxjs/toolkit/query/react';
import { apiBaseQuery } from '../../store/apiBaseQuery';
import type { UserResponseDto, CreateUserDto, UpdateUserDto } from '@mawsoftwares/users';

// Redux Toolkit (RTK Query) data layer for the Users module — the reference
// implementation the Module Generator's frontend templates follow. Each
// generated module gets its own `createApi` slice like this one instead of
// hand-rolled fetch/useState wiring.
export interface UsersListResult {
  items: UserResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UsersListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: apiBaseQuery,
  tagTypes: ['User'],
  endpoints: (build) => ({
    listUsers: build.query<UsersListResult, UsersListParams>({
      query: (params) => {
        const q = new URLSearchParams();
        if (params.page) q.set('page', String(params.page));
        if (params.pageSize) q.set('limit', String(params.pageSize));
        if (params.search) q.set('search', params.search);
        if (params.status) q.set('status', params.status);
        return { url: `/api/v1/users?${q.toString()}` };
      },
      transformResponse: (res: { data: UsersListResult }) => res.data,
      providesTags: (result) =>
        result
          ? [...result.items.map((u) => ({ type: 'User' as const, id: u.id })), { type: 'User' as const, id: 'LIST' }]
          : [{ type: 'User' as const, id: 'LIST' }],
    }),
    getUser: build.query<UserResponseDto, string>({
      query: (id) => ({ url: `/api/v1/users/${id}` }),
      transformResponse: (res: { data: UserResponseDto }) => res.data,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),
    createUser: build.mutation<UserResponseDto, CreateUserDto>({
      query: (body) => ({ url: '/api/v1/users', method: 'POST', body }),
      transformResponse: (res: { data: UserResponseDto }) => res.data,
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),
    updateUser: build.mutation<UserResponseDto, { id: string; data: UpdateUserDto }>({
      query: ({ id, data }) => ({ url: `/api/v1/users/${id}`, method: 'PATCH', body: data }),
      transformResponse: (res: { data: UserResponseDto }) => res.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'User', id }, { type: 'User', id: 'LIST' }],
    }),
    deleteUser: build.mutation<void, string>({
      query: (id) => ({ url: `/api/v1/users/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'User', id }, { type: 'User', id: 'LIST' }],
    }),
    activateUser: build.mutation<UserResponseDto, string>({
      query: (id) => ({ url: `/api/v1/users/${id}/activate`, method: 'POST' }),
      transformResponse: (res: { data: UserResponseDto }) => res.data,
      invalidatesTags: (_result, _error, id) => [{ type: 'User', id }, { type: 'User', id: 'LIST' }],
    }),
    deactivateUser: build.mutation<UserResponseDto, string>({
      query: (id) => ({ url: `/api/v1/users/${id}/deactivate`, method: 'POST' }),
      transformResponse: (res: { data: UserResponseDto }) => res.data,
      invalidatesTags: (_result, _error, id) => [{ type: 'User', id }, { type: 'User', id: 'LIST' }],
    }),
    listRoles: build.query<Array<{ code: string; name: string }>, void>({
      query: () => ({ url: '/api/v1/roles' }),
      transformResponse: (res: { data: Array<{ code: string; name: string }> }) => res.data,
    }),
  }),
});

export const {
  useListUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
  useListRolesQuery,
} = usersApi;
