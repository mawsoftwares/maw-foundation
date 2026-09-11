import { UsersManager, type IUserApiService } from '@mawsoftwares/ui-users';
import { client } from '../../api';
import { store } from '../../store';
import { usersApi } from './usersApi';

import type { ListParams } from '@mawsoftwares/ui-web';
import type { UserResponseDto, CreateUserDto, UpdateUserDto } from '@mawsoftwares/users';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';

// Same IUserApiService contract @mawsoftwares/ui-users' <UsersManager> expects,
// but backed by Redux Toolkit (RTK Query) underneath instead of ad hoc
// client.request() calls — dispatching each endpoint's `.initiate(...)` and
// unwrapping it gives RTK Query's caching/dedup/invalidation for free while
// keeping UsersManager itself untouched.
const userApiAdapter: IUserApiService = {
  list: async (params: ListParams) => {
    const result = await store.dispatch(
      usersApi.endpoints.listUsers.initiate({
        page: params.page,
        pageSize: params.pageSize,
        search: params.filter,
        status: params.filters?.status as string | undefined,
      }),
    ).unwrap();
    return { data: result.items, total: result.total, page: result.page, pageSize: result.pageSize };
  },
  get: async (id: string) => {
    return store.dispatch(usersApi.endpoints.getUser.initiate(id)).unwrap();
  },
  create: async (data: CreateUserDto) => {
    return store.dispatch(usersApi.endpoints.createUser.initiate(data)).unwrap();
  },
  update: async (id: string, data: UpdateUserDto) => {
    return store.dispatch(usersApi.endpoints.updateUser.initiate({ id, data })).unwrap();
  },
  delete: async (id: string) => {
    await store.dispatch(usersApi.endpoints.deleteUser.initiate(id)).unwrap();
  },
  activate: async (id: string) => {
    return store.dispatch(usersApi.endpoints.activateUser.initiate(id)).unwrap();
  },
  deactivate: async (id: string) => {
    return store.dispatch(usersApi.endpoints.deactivateUser.initiate(id)).unwrap();
  },
  listRoles: async () => {
    return store.dispatch(usersApi.endpoints.listRoles.initiate()).unwrap();
  },
  // File upload has no natural RTK Query shape (multipart + progress events)
  // and stays on the plain ApiClient, same as before.
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
