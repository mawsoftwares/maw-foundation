import { UsersManager, type IUserApiService } from '@maw/ui-users';
import { client } from '../../api';

const userApiAdapter: IUserApiService = {
  list: async (params) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.pageSize) q.set('limit', params.pageSize.toString());
    if (params.filter) q.set('search', params.filter);
    
    // We assume client.request returns the data payload from our standardized backend response
    const res = await client.request<{ data: { items: any[], total: number, page: number, pageSize: number } }>(`/api/v1/users?${q.toString()}`);
    const data = res.data;
    
    return {
      data: data.items,
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
    };
  },
  get: async (id) => {
    const res = await client.request<{ data: any }>(`/api/v1/users/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await client.request<{ data: any }>('/api/v1/users', { method: 'POST', body: JSON.stringify(data) });
    return res.data;
  },
  update: async (id, data) => {
    const res = await client.request<{ data: any }>(`/api/v1/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    return res.data;
  },
  delete: async (id) => {
    await client.request(`/api/v1/users/${id}`, { method: 'DELETE' });
  },
  activate: async (id) => {
    const res = await client.request<{ data: any }>(`/api/v1/users/${id}/activate`, { method: 'POST' });
    return res.data;
  },
  deactivate: async (id) => {
    const res = await client.request<{ data: any }>(`/api/v1/users/${id}/deactivate`, { method: 'POST' });
    return res.data;
  },
};

export function UsersView() {
  return (
    <UsersManager api={userApiAdapter} />
  );
}
