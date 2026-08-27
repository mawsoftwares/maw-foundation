import { UsersManager, type IUserApiService } from '@mawsoftwares/ui-users';
import { client } from '../../api';

import type { ListParams } from '@mawsoftwares/ui-web';
import type { UserResponseDto, CreateUserDto, UpdateUserDto } from '@mawsoftwares/users';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';

const userApiAdapter: IUserApiService = {
  list: async (params: ListParams) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page.toString());
    if (params.pageSize) q.set('limit', params.pageSize.toString());
    if (params.filter) q.set('search', params.filter);

    const res = await client.request<{ data: { items: UserResponseDto[]; total: number; page: number; pageSize: number } }>(`/api/v1/users?${q.toString()}`);
    const data = res.data;

    return {
      data: data.items,
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
    };
  },
  get: async (id: string) => {
    const res = await client.request<{ data: UserResponseDto }>(`/api/v1/users/${id}`);
    return res.data;
  },
  create: async (data: CreateUserDto) => {
    const res = await client.request<{ data: UserResponseDto }>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  update: async (id: string, data: UpdateUserDto) => {
    const res = await client.request<{ data: UserResponseDto }>(`/api/v1/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  delete: async (id: string) => {
    await client.request(`/api/v1/users/${id}`, { method: 'DELETE' });
  },
  activate: async (id: string) => {
    const res = await client.request<{ data: UserResponseDto }>(`/api/v1/users/${id}/activate`, { method: 'POST' });
    return res.data;
  },
  deactivate: async (id: string) => {
    const res = await client.request<{ data: UserResponseDto }>(`/api/v1/users/${id}/deactivate`, { method: 'POST' });
    return res.data;
  },
  listRoles: async () => {
    const res = await client.request<{ data: Array<{ code: string; name: string }> }>('/api/v1/roles');
    return res.data;
  },
  uploadAvatar: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('files', file);
    onProgress(10);
    const result = await client.upload<{ files: StoredFile[] }>('/files/upload', formData, {
      onProgress: (e) => onProgress(e.percent),
    });
    const uploaded = result.files[0];
    if (!uploaded) throw new Error('Upload returned no file');
    return uploaded;
  },
};

export function UsersView() {
  return <UsersManager api={userApiAdapter} formLayout="drawer" />;
}
